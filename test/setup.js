/*
 * (C) Copyright 2017 o2r project
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

/* eslint-env mocha */
var mongojs = require('mongojs');
const config = require('../config/config');

// test parameters for local session authentication directly via fixed database entries
var orcid = '0000-0001-6021-1617';
var sessionId = 'C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo';

// parameters for upload of compendium
var loader_host = 'http://localhost:' + '8088';

var env = process.env;
global.test_host = env.TEST_HOST ||  'http://localhost:' + config.net.port;
console.log('Testing endpoint at ' + global.test_host);

before(function () {
    let dbpath = 'localhost/' + config.mongo.database;
    var db = mongojs(dbpath, ['users', 'sessions']);

    var session = {
        '_id': sessionId,
        'session': {
            'cookie': {
                'originalMaxAge': null,
                'expires': null,
                'secure': null,
                'httpOnly': true,
                'domain': null,
                'path': '/'
            },
            'passport': {
                'user': orcid
            }
        }
    }
    db.sessions.save(session, function (err, doc) {
        //console.log(doc);
        if (err) throw err;
    });
    var o2ruser = {
        '_id': '57dc171b8760d15dc1864044',
        'orcid': orcid,
        'level': 100,
        'name': 'o2r-testuser'
    };
    db.users.save(o2ruser, function (err, doc) {
        //console.log(doc);
        if (err) throw err;
    });

    console.log('Global setup completed for database ' + dbpath);
});
