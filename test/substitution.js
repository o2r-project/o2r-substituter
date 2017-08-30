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
const uploadCompendium = require('./util').uploadCompendium;
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

    var base_id;
    var overlay_id;
    var substituted_id;

    before((done) => {
        let req_base01 = uploadCompendium('./test/erc/base01', cookie_o2r);
        this.timeout(10000);

        request(req_base01, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;
            // done();
        });

        let req_overlay01 = uploadCompendium('./test/erc/overlay01', cookie_o2r);
        this.timeout(10000);

        request(req_overlay01, (err, res, body) => {
            assert.ifError(err);
            overlay_id = JSON.parse(body).id;
            // done();
        });

        // TODO: use two compendia (uploaded before) to run substitution

        let req_substitution = createSubstitutionPostRequest(base_id, overlay_id, cookie_o2r);
        this.timeout(requestLoadingTimeout);

        request(req_substitution, (err, res, body) => {
            assert.ifError(err);
            substituted_id = JSON.parse(body);
            console.log("substituted_id - req_substitution");
            console.log(substituted_id);
            done();
        });
    });

    describe('POST /api/v1/substitution response with new ERC id', () => {
        before((done) => {
            let base_file = "BerlinMit.csv";
            let overlay_file = "BerlinOhne.csv";
            done();
        });

        it('should respond with HTTP 200 OK', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid ID as String', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.isString(JSON.parse(body), 'returned String');
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

    });

    describe('POST /api/v1/compendium with invalid base ID', () => {
        before((done) => {
            let base_id = "12345";
            let base_file = "BerlinMit.csv";
            let overlay_file = "BerlinOhne.csv";
            done();
        });

        it('should fail the substitution because of invalid base ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, 'base ID is invalid');
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/compendium with invalid overlay ID', () => {
        before((done) => {
            let overlay_id = "12345";
            let base_file = "BerlinMit.csv";
            let overlay_file = "BerlinOhne.csv";
            done();
        });

        it('should fail the substitution because of invalid overlay ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, 'overlay ID is invalid');
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/compendium with invalid base file', () => {
        before((done) => {
            let base_file = "doesNotExist.csv";
            let overlay_file = "BerlinOhne.csv";
            done();
        });

        it('should fail the substitution because of invalid base file', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, 'base filepath is invalid');
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/compendium with invalid overlay file', () => {
        before((done) => {
            let base_file = "BerlinMit.csv";
            let overlay_file = "doesNotExist.csv";
            done();
        });

        it('should fail the substitution because of invalid overlay file', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, 'overlay filepath is invalid');
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

});
