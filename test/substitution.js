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
const assert = require('chai').assert;
const request = require('request');
const fs = require('fs');
const config = require('../config/config');

require("./setup")
const cookie_o2r = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';
const requestLoadingTimeout = 10000;
const createCompendiumPostRequest = require('./util').createCompendiumPostRequest;
const createSubstitutionPostRequest = require('./util').createSubstitutionPostRequest;

describe('List all substitutions', function () {
    describe('GET /api/v1/substitutions response with list of ERC ids', () => {
      it('should respond with HTTP 200 OK', (done) => {
          request(global.test_host + '/api/v1/substitutions', (err, res, body) => {
                  assert.ifError(err);
                  console.log("body");
                  console.log(body);
                  assert.equal(res.statusCode, 200);
                  done();
          });
      });
    });
});

describe('Simple substitution of data', function () {
    describe('POST /api/v1/substitution response with new ERC id', () => {
        var comp_1;
        var comp_2;

        before((done) => {
            let req = createCompendiumPostRequest('./test/erc/test_1', cookie_o2r);

            request(req, (err, res, body) => {
                assert.ifError(err);
                done();
            });

            let req2 = createCompendiumPostRequest('./test/erc/test_2', cookie_o2r);

            request(req2, (err, res, body) => {
                assert.ifError(err);
                done();
            });

            // TODO: use two compendia (uploaded before) to run substitution
        });

        it('should respond with HTTP 200 OK', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = {};

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    done();
                });
            });
        });

        it('should respond with valid JSON', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = {};

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.isObject(JSON.parse(body), 'returned JSON');
                    done();
                });
            });
        });

        it('should give a response including the id field', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = {};

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.isDefined(JSON.parse(body).id, 'returned id');
                    assert.property(JSON.parse(body), 'id');
                    done();
                });
            });
        });
    });


    describe('POST /api/v1/compendium with one invalid compendium ID', () => {
        it('should fail the substitution', (done) => {
            // TODO
        }).timeout(requestLoadingTimeout);
    });

});
