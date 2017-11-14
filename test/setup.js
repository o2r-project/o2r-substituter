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
const sleep = require('sleep');

// test parameters for local session authentication directly via fixed database entries
var orcid_o2r = '0000-0001-6021-1617';
var sessionId_o2r = 'C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo';

var env = process.env;
global.test_host = env.TEST_HOST || 'http://localhost:' + config.net.port;
global.test_host_read = env.TEST_HOST_READ || 'http://localhost:8080';
global.test_host_upload = env.TEST_HOST_UPLOAD || 'http://localhost:8088';
console.log('Testing endpoint at ' + global.test_host + ' using ' + global.test_host_read + ' for reading and ' + global.test_host_upload + ' for uploading');

var dbPath = 'localhost/' + config.mongo.database;
var db = mongojs(dbPath, ['users', 'sessions', 'compendia']);

before(function () {
 
    var o2ruser = {
        '_id': '57dc171b8760d15dc1864044',
        'orcid': orcid_o2r,
        'level': 100,
        'name': 'o2r-testuser'
    };
    db.users.save(o2ruser, function (err, doc) {
        if (err) throw err;
    });

    sleep.sleep(1);
    console.log('Global setup completed for database ' + dbPath);
});


after(function () {
    db.close();
});
