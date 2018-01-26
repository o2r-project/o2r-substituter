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
const mongojs = require('mongojs');
const config = require('../config/config');
const debug = require('debug')('test:setup');

// test parameters for local session authentication directly via fixed database entries
var orcid_o2r = '0000-0001-6021-1617';

var env = process.env;
global.test_db = env.TEST_DB || 'localhost:27017/' + config.mongo.database;
global.test_host = env.TEST_HOST || 'http://localhost:' + config.net.port;
global.test_host_read = env.TEST_HOST_READ || 'http://localhost:8080';
global.test_host_files = env.TEST_HOST_FILES || 'http://localhost:8081';
global.test_host_upload = env.TEST_HOST_UPLOAD || 'http://localhost:8088';
debug('Testing endpoint at %s using %s for reading/execution and %s for uploading and %s for file access',
    global.test_host, global.test_host_read, global.test_host_upload, global.test_host_files);

var db = null;

before(function (done) {
    this.timeout(10000);

    debug('Connecting to DB at %s', global.test_db);
    db = mongojs(global.test_db, ['sessions', 'compendia', 'jobs']);

    db.compendia.drop(function (err, doc) {
        debug('Dropped compendia collection: %s | %s', err, doc);

        db.jobs.drop(function (err_jobs, doc_jobs) {
            debug('Dropped jobs collection: %s | %s', err_jobs, doc_jobs);

            var session_o2r = {
                '_id': 'C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo',
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
                        'user': orcid_o2r
                    }
                }
            }
            db.sessions.save(session_o2r, function (err, doc_session) {
                if (err) throw err;

                db.users.save({
                    '_id': '57dc171b8760d15dc1864044',
                    'orcid': orcid_o2r,
                    'level': 100,
                    'name': 'o2r-testuser'
                }, function (err, doc_user) {
                    if (err) throw err;

                    debug('Added session and test user: %s | %s', JSON.stringify(doc_session), JSON.stringify(doc_user));

                    debug('Global setup completed for database %s', global.test_db);
                    done();
                });

            });
        });
    });
});


after(function (done) {
    if (db) {
        db.close();
        debug('Database connection closed.');
    }
    done();
});
