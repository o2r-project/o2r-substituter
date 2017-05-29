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
const debug = require('debug')('subsituter');
const mongoose = require('mongoose');
const backoff = require('backoff');

// check fs & create dirs if necessary
const fse = require('fs-extra');
fse.mkdirsSync(config.fs.base);
fse.mkdirsSync(config.fs.compendium);
const fs = require('fs');
const dirTree = require('directory-tree');

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

// code which is executed on every request
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');    // allow CORS
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

    // get all compendia for list in authorView.html
    app.get('/api/v1/substitution/all', (req, res) => {
      // if (!req.isAuthenticated() || req.user.level < config.user.level.substitute) {
      //   res.status(401).send('{"error":"not authenticated or not allowed"}');
      //   return;
      // }
      console.log("GET - all erc");

      // TODO implement ...
      var answer = {};
      var filter = {};
      var limit = parseInt(req.query.limit || config.list_limit, 10);
      var start = parseInt(req.query.start || 1, 10) - 1;

      // add query element to filter (used in database search) and to the query (used for previous/next links)
      // eslint-disable-next-line no-eq-null, eqeqeq
      if (req.query.job_id != null) {
        filter.job_id = req.query.job_id;
      }
      // eslint-disable-next-line no-eq-null, eqeqeq
      if (req.query.user != null) {
        filter.user = req.query.user;
      }

      Compendium.find(filter).select('id').skip(start).limit(limit).exec((err, comps) => {
        if (err) {
          res.status(500).send(JSON.stringify({ error: 'query failed' }));
        } else {
          var count = comps.length;
          if (count <= 0) {
            res.status(404).send(JSON.stringify({ error: 'no compendium found' }));
          } else {

            answer.results = comps.map(comp => {
              return comp.id;
            });
            console.log(answer); // log compendia IDs
            res.status(200).send(JSON.stringify(answer));
          }
        }
      });
    });

    // get data path of two choosen erc's
    app.get('/api/v1/substitution/get/:xch1/:xch2', function (req, res) {
      res.setHeader('Content-Type', 'application/json');

      var id_erc1 = req.params.xch1;
      var id_erc2 = req.params.xch2;
      var answer = {
        erc1 : {
          id : id_erc1,
          files : []
        },
        erc2 : {
          id : id_erc2,
          files : []
        }
         };
      // datapath of first erc
      var folderPath1 = config.fs.compendium + id_erc1 + '/data';
      try {
        fs.accessSync(folderPath1); // throws if does not exist
        answer.erc1.files = dirTree(folderPath1);
      } catch (e) {
        res.status(500).send({ error: 'internal error: could not read compendium contents from storage', e });
        return;
      }
      // datapath of second erc
      var folderPath2 = config.fs.compendium + id_erc2 + '/data';
      try {
        fs.accessSync(folderPath2); // throws if does not exist
        answer.erc2.files = dirTree(folderPath2);
      } catch (e) {
        res.status(500).send({ error: 'internal error: could not read compendium contents from storage', e });
        return;
      }
      res.status(200).send(answer); //JSON.stringify(answer)
    });

    app.listen(config.net.port, () => {
      debug('substitution %s with API version %s waiting for requests on port %s',
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
