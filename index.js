/*
 * (C) Copyright 2017 o2r project.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const config = require('./config/config');
config.version = require('./package.json').version;
const debug = require('debug')('substituter');
const mongoose = require('mongoose');
const backoff = require('backoff');

// check fs & create dirs if necessary
const fse = require('fs-extra');
fse.mkdirsSync(config.fs.base);
fse.mkdirsSync(config.fs.compendium);
// const fs = require('fs');
const yaml = require('js-yaml');
// const dirTree = require('directory-tree');

const dbURI = config.mongo.location + config.mongo.database;
mongoose.connect(dbURI);
mongoose.connection.on('error', (err) => {
  debug('Could not connect to MongoDB @ %s: %s', dbURI, err);
});

// Express modules and tools
const express = require('express');
const compression = require('compression');
const app = express();
const responseTime = require('response-time');
const bodyParser = require('body-parser');
const randomstring = require('randomstring');

var controllers = {};
controllers.substitute = require('./controllers/substitute');
controllers.substitutions = require('./controllers/substitutions');

// code which is executed on every request
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');    // allow CORS
    res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
    next();
});

app.use((req, res, next) => {
  debug(req.method + ' ' + req.path);
  next();
});
app.use(responseTime());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Passport & session modules for authenticating users.
const User = require('./lib/model/user');
const passport = require('passport');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

/*
 *  Authentication & Authorization
 *  This is be needed in every service that wants to check if a user is authenticated.
 */

// minimal serialize/deserialize to make authdetails cookie-compatible.
passport.serializeUser((user, cb) => {
  cb(null, user.orcid);
});
passport.deserializeUser((id, cb) => {
  debug("Deserialize for %s", id);
  User.findOne({ orcid: id }, (err, user) => {
    if (err) cb(err);
    cb(null, user);
  });
});


function initApp(callback) {
  debug('Initialize application');

  try {
    // configure express-session, stores reference to authdetails in cookie.
    // authdetails themselves are stored in MongoDBStore
    var mongoStore = new MongoDBStore({
      uri: config.mongo.location + config.mongo.database,
      collection: 'sessions'
    }, err => {
      if (err) {
        debug('Error starting MongoStore: %s', err);
      }
    });

    mongoStore.on('error', err => {
      debug('Error with MongoStore: %s', err);
    });

    app.use(session({
      secret: config.sessionsecret,
      resave: true,
      saveUninitialized: true,
      maxAge: 60 * 60 * 24 * 7, // cookies become invalid after one week
      store: mongoStore
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    /*
     * configure routes
     */
     var Compendium = require('./lib/model/compendium');

    app.post('/api/v1/substitution', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      // if (!req.isAuthenticated()) {
      //   res.status(401).send('{"error":"not authenticated"}');
      //   return;
      // }
      // if (req.user.level < config.user.level.substitute) {
      //   res.status(401).send('{"error":"not allowed"}');
      //   return;
      // }

      // new random id
      let newID = randomstring.generate(config.id_length);

      // TODO: user id
      // TODO: check if id exists
      // TODO: run analysis
      let passon = {
        user: "0000-0003-2287-369X",  // TODO: req.user.id
        id: newID,
        metadata: {
          substituted: true,
          substitution: req.body
        }
      };
      debug('[%s] Starting substitution of new compendium [base: "%s" - overlay: "%s"] ...', passon.id, passon.metadata.substitution.base, passon.metadata.substitution.overlay);
      return controllers.substitute.getMetadata(passon)    // get metadata
        .then(controllers.substitute.createFolder)         // create folder with id
        .then(controllers.substitute.copyBaseFiles)       // copy base files into folder
        .then(controllers.substitute.copyOverlayFiles)    // copy overlay files into folder
        .then(controllers.substitute.createDockerImage)   // TODO: later not necessary
        .then(controllers.substitute.startDockerContainer)  // run docker container with given image
        .then(controllers.substitute.writeYaml)             // write docker run cmd to erc.yml
        .then(controllers.substitute.saveToDB)             // save to DB
        .then((passon) => {
            debug('[%s] Finished substitution of new compendium.', passon.id);
            console.log(passon);
            res.status(200).send(passon);
        })
        .catch(err => {
            debug('[%s] - Error during substitution', passon.id, JSON.stringify(err));

            let status = 500;
            if (err.status) {
              status = err.status;
            }
            let msg = 'Internal error';
            if (err.msg) {
              msg = err.msg;
            }
            res.status(status).send(JSON.stringify({ err: msg }));
        });
    });

    // GET list of subtsitutions
    app.get('/api/v1/substitutions', controllers.substitutions.view);

    // GET list of related substitutions by filter "base" and/or "overlay"
    // app.get('/api/v1/substitutions/?base...&overlay=---');

    app.listen(config.net.port, () => {
      debug('substituter %s with API version %s waiting for requests on port %s',
        config.version,
        config.api_version,
        config.net.port);
    });
  } catch (err) {
    callback(err);
  }

  callback(null);
}

var dbBackoff = backoff.fibonacci({
  randomisationFactor: 0,
  initialDelay: config.mongo.inital_connection_initial_delay,
  maxDelay: config.mongo.inital_connection_max_delay
});

dbBackoff.failAfter(config.mongo.inital_connection_attempts);
dbBackoff.on('backoff', function (number, delay) {
  debug('Trying to connect to MongoDB (#%s) in %sms', number, delay);
});
dbBackoff.on('ready', function (number, delay) {
  debug('Connect to MongoDB (#%s)', number, delay);
  mongoose.createConnection(dbURI, (err) => {
    if (err) {
      debug('Error during connect: %s', err);
      mongoose.disconnect(() => {
        debug('Mongoose: Disconnected all connections.');
      });
      dbBackoff.backoff();
    } else {
      // delay app startup to when MongoDB is available
      debug('Initial connection open to %s: %s', dbURI, mongoose.connection.readyState);
      initApp((err) => {
        if (err) {
          debug('Error during init!\n%s', err);
          mongoose.disconnect(() => {
            debug('Mongoose: Disconnected all connections.');
          });
          dbBackoff.backoff();
        }
        debug('Started application.');
      });
    }
  });
});
dbBackoff.on('fail', function () {
  debug('Eventually giving up to connect to MongoDB');
  process.exit(1);
});

dbBackoff.backoff();
