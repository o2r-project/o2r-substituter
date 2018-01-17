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
const fse = require('fs-extra');
const config = require('../config/config');
const path = require('path');
const yaml = require('js-yaml');
const sleep = require('sleep');

require("./setup")
const cookie_o2r = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';
const requestLoadingTimeout = 30000;
const requestReadingTimeout = 10000;
const uploadCompendium = require('./util').uploadCompendium;
const createSubstitutionPostRequest = require('./util').createSubstitutionPostRequest;
const publishCandidate = require('./util').publishCandidate;

describe('Empty service without substitutions', function () {

    it('should respond with HTTP 200 OK and an empty response list', (done) => {
        request(global.test_host + '/api/v1/substitution', (err, res, body) => {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
            response = JSON.parse(body);
            assert.notProperty(response, 'error');
            assert.property(response, 'results');
            assert.lengthOf(response.results, 0);
            done();
        });
    });
});

// #########################################################################################################################

describe('List substitutions', function () {
    var substitution_id;

    before(function (done) {
        this.timeout(60000);

        let req_erc_base02 = uploadCompendium('./test/erc/base02', cookie_o2r);
        let req_erc_overlay02 = uploadCompendium('./test/erc/overlay02', cookie_o2r);
        var base_id;
        var overlay_id;
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        // first upload
        request(req_erc_base02, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;

            publishCandidate(base_id, cookie_o2r, (err) => {
                assert.ifError(err);

                // second upload
                request(req_erc_overlay02, (err, res, body) => {
                    assert.ifError(err);
                    overlay_id = JSON.parse(body).id;

                    publishCandidate(overlay_id, cookie_o2r, (err) => {
                        assert.ifError(err);

                        // substitution
                        let req_substitution = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);
                        request(req_substitution, (err, res, body) => {
                            assert.ifError(err);
                            substitution_id = body.id;
                            done();
                        });
                    });
                });
            });
        });
    })

    describe('GET /api/v1/substitution response with list of ERC ids', () => {
        it('should respond with HTTP 200 OK', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                done();
            });
        });

        it('should respond with valid JSON document without error and one substitution', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.isObject(response);
                assert.notProperty(response, 'error');
                assert.property(response, 'results');

                assert.isArray(response.results);
                assert.equal(response.results.length, 1);
                assert.include(response.results, substitution_id);
                done();
            });
        });
    });
});

// #########################################################################################################################

describe('Simple substitution of data with two ERCs', function () {
    var base_id;
    var overlay_id;

    before(function (done) {
        let req_erc_base02 = uploadCompendium('./test/erc/base02', cookie_o2r);
        let req_erc_overlay02 = uploadCompendium('./test/erc/overlay02', cookie_o2r);
        this.timeout(60000);

        // first upload
        request(req_erc_base02, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;

            publishCandidate(base_id, cookie_o2r, (err) => {
                assert.ifError(err);

                // second upload
                request(req_erc_overlay02, (err, res, body) => {
                    assert.ifError(err);
                    overlay_id = JSON.parse(body).id;

                    publishCandidate(overlay_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });
    });

    // use two compendia (uploaded before) to run substitution
    describe('POST /api/v1/substitution with two valid ERCs', () => {
        var substituted_id;
        var substituted_id_moreOverlays;
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should respond with HTTP 200 OK and valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid ID and allow publishing', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id = body.id;

                    publishCandidate(substituted_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with substituted metadata', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'metadata');
                assert.property(response.metadata, 'substituted');
                assert.propertyVal(response.metadata, 'substituted', true);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with metadata for base and overlay ID', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata, 'substitution');
                assert.property(response.metadata.substitution, 'base');
                assert.property(response.metadata.substitution, 'overlay');
                assert.propertyVal(response.metadata.substitution, 'base', base_id);
                assert.propertyVal(response.metadata.substitution, 'overlay', overlay_id);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with metadata for base and overlay filenames, and new filename at root directory', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 1);
                assert.property(response.metadata.substitution.substitutionFiles[0], 'base');
                assert.property(response.metadata.substitution.substitutionFiles[0], 'overlay');
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'filename', "BerlinOhne.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'base', "data/BerlinMit.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'overlay', "data/BerlinOhne.csv");
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with correct substitution file list with multiple overlays', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                req.json.substitutionFiles.push({ base: "data/Dockerfile", overlay: "data/erc.yml" });
                req.json.substitutionFiles.push({ base: "data/main.Rmd", overlay: "data/Dockerfile" });

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id_moreOverlays = body.id;

                    publishCandidate(substituted_id_moreOverlays, cookie_o2r, (err) => {
                        assert.ifError(err);
                        request(global.test_host_read + '/api/v1/compendium/' + substituted_id_moreOverlays, (err, res, body) => {
                            assert.ifError(err);
                            let response = JSON.parse(body);
                            assert.property(response.metadata.substitution, 'substitutionFiles');
                            assert.equal(response.metadata.substitution.substitutionFiles.length, 3);

                            done();
                        });
                    });
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with correct written erc.yml with multiple overlays', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id_moreOverlays, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 3);

                let yamlPath = path.join(config.fs.compendium, substituted_id_moreOverlays, "erc.yml");
                let dockerCmd = config.docker.cmd;
                let doc = yaml.safeLoad(fse.readFileSync(yamlPath, 'utf8'));
                assert.include(doc.execution.cmd, "BerlinOhne.csv:" + path.join("/erc", "BerlinMit.csv") + ":ro");  //alt: "data/..." in mount
                assert.include(doc.execution.cmd, "overlay_erc.yml:" + path.join("/erc", "Dockerfile") + ":ro");
                assert.include(doc.execution.cmd, "overlay_Dockerfile:" + path.join("/erc", "main.Rmd") + ":ro");
                done();
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with existence of substituted ERC files', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                let basefilePath = path.join(config.fs.compendium, substituted_id, "BerlinMit.csv"); //".../ERC_ID/BerlinMit.csv"
                let overlayfilePath = path.join(config.fs.compendium, substituted_id, response.metadata.substitution.substitutionFiles[0].filename); // ".../ERC_ID/BerlinOhne.csv"
                assert.equal(fse.existsSync(basefilePath), true, 'base file should exist in folder of substituted ERC');
                assert.equal(fse.existsSync(overlayfilePath), true, 'overlay file should exist in folder of substituted ERC');
                done();
            });
        }).timeout(requestReadingTimeout);

        // TODO: this is for testing inline code, if substitution was successful with the right file
        it.skip('should respond with correct integer of mounted overlay dataset', (done) => {
            // should not be: base02 -> "mitBerlin": Gesamtbilanz = 55.1, Jahr = 2014
            // should be:  overlay02 -> "ohneBerlin": Gesamtbilanz = 1051.2, Jahr = 1990

            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                let rmdfile = path.join(config.fs.compendium, substituted_id, '/data/main.Rmd');
                // let mainhtml = config.fs.compendium + substituted_id + '/data/main.html';
                let mainhtml = path.join(config.fs.compendium, substituted_id, '/data/main.Rmd');

                let doc = fse.readFileSync(mainhtml, 'utf8');
                let string_ = '"' + 'This is the maximum of ' + "'" + 'Gesamtbilanz' + "'" + ': 1051.2' + '"';
                assert.include(doc, string_);
                done();
            });
        }) //.timeout(requestReadingTimeout); //TODO: till ".skip" Error: cannot read property of undefined
    });

    describe('POST /api/v1/substitution with an overlay filename that already exists as an base filename', () => {
        var substituted_id;
        let base_file = "data/main.Rmd";
        let overlay_file = "data/main.Rmd";

        it('should respond with HTTP 200 OK', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.isObject(body, 'returned JSON');
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id = body.id;

                    publishCandidate(substituted_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with substituted metadata', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'metadata');
                assert.property(response.metadata, 'substituted');
                assert.propertyVal(response.metadata, 'substituted', true);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with metadata for base and overlay ID', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata, 'substitution');
                assert.property(response.metadata.substitution, 'base');
                assert.property(response.metadata.substitution, 'overlay');
                assert.propertyVal(response.metadata.substitution, 'base', base_id);
                assert.propertyVal(response.metadata.substitution, 'overlay', overlay_id);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with metadata for base, overlay and filename', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.property(response.metadata.substitution.substitutionFiles[0], 'base');
                assert.property(response.metadata.substitution.substitutionFiles[0], 'overlay');
                assert.property(response.metadata.substitution.substitutionFiles[0], 'filename');
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'base', "data/main.Rmd");  // alt: "data/..."
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'overlay', "data/main.Rmd");  // this is not touched, if "substitutionFiles[i].filename" exists
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'filename', "overlay_main.Rmd");  //alt: "data/..."
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with existence of substituted ERC files', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                let basefilePath = path.join(config.fs.compendium, substituted_id, "main.Rmd"); //".../ERC_ID/main.Rmd"
                let filenamePath = path.join(config.fs.compendium, substituted_id, response.metadata.substitution.substitutionFiles[0].filename); //".../ERC_ID/overlay_main.Rmd"
                assert.equal(fse.existsSync(basefilePath), true, 'base file should exist in folder of substituted ERC');
                assert.equal(fse.existsSync(filenamePath), true, 'filename file ("overlay_" + overlay file) should exist in folder of substituted ERC');
                done();
            });
        }).timeout(requestReadingTimeout);
    });

    describe('POST /api/v1/substitution with invalid base ID', () => {
        let base_id = "12345";
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail the substitution because of invalid base ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { error: 'base ID is invalid' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with missing base ID', () => {
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail the substitution because of missing base ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);
                delete req.json.base;

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { error: 'base ID is invalid' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with invalid overlay ID', () => {
        let overlay_id = "12345";
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail the substitution because of invalid overlay ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { error: 'overlay ID is invalid' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with missing overlay ID', () => {
        let overlay_id = "12345";
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail the substitution because of missing overlay ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);
                delete req.json.overlay;

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { error: 'overlay ID is invalid' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with invalid base file', () => {
        let base_file = "doesNotExist.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail the substitution because of invalid base file', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { error: 'base file does not exist' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with invalid overlay file', () => {
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "doesNotExist.csv";

        it('should fail the substitution because of invalid overlay file', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { error: 'overlay file does not exist' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with empty substitution files', () => {
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail the substitution because of empty substitution files', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);
                req.json.substitutionFiles = [];   // set Array of substitutionFiles empty

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { error: 'substitution files missing' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with no substitution files', () => {
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail the substitution because of no substitution files', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);
                delete req.json.substitutionFiles;

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { error: 'substitution files missing' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with only base filename in substitution files', () => {
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail the substitution because of no overlay file in substitution files', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);
                req.json.substitutionFiles = [{
                    base: "data/BerlinMit.csv"
                }];

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { error: 'substitution overlay file does not exist' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with only overlay filename in substitution files', () => {
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail the substitution because of no base file in substitution files', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);
                req.json.substitutionFiles = [{
                    overlay: "data/BerlinOhne.csv"
                }];

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { error: 'substitution base file does not exist' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });
});

// #########################################################################################################################

describe('Simple substitution of data with one ERC (as base) and one WORKSPACE (as overlay)', function () {
    var base_id;
    var overlay_id;

    before(function (done) {
        let req_erc_base02 = uploadCompendium('./test/erc/base02', cookie_o2r);
        let req_workspace_overlay01 = uploadCompendium('./test/workspace/overlay01', cookie_o2r, 'workspace');
        this.timeout(60000);

        // first upload
        request(req_erc_base02, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;

            publishCandidate(base_id, cookie_o2r, (err) => {
                assert.ifError(err);

                // second upload
                request(req_workspace_overlay01, (err, res, body) => {
                    assert.ifError(err);
                    overlay_id = JSON.parse(body).id;

                    publishCandidate(overlay_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });
    });

    describe('POST /api/v1/substitution with one valid ERC and one valid WORKSPACE', () => {
        var substituted_id;
        let base_file = "data/BerlinMit.csv";
        let overlay_file = "files/BerlinOhne.csv";

        it('should respond with HTTP 200 OK and valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    assert.isObject(body);
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid ID (and now publish it)', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id = body.id;

                    publishCandidate(substituted_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with substituted metadata', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'metadata');
                assert.property(response.metadata, 'substituted');
                assert.propertyVal(response.metadata, 'substituted', true);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with metadata for base and overlay ID', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata, 'substitution');
                assert.property(response.metadata.substitution, 'base');
                assert.property(response.metadata.substitution, 'overlay');
                assert.propertyVal(response.metadata.substitution, 'base', base_id);
                assert.propertyVal(response.metadata.substitution, 'overlay', overlay_id);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with metadata for base and overlay filenames, and new filename at root directory', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 1);
                assert.property(response.metadata.substitution.substitutionFiles[0], 'base');
                assert.property(response.metadata.substitution.substitutionFiles[0], 'overlay');
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'base', "data/BerlinMit.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'overlay', "files/BerlinOhne.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'filename', "BerlinOhne.csv");
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with correct written erc.yml one overlay', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 1);

                let yamlPath = path.join(config.fs.compendium, substituted_id, "erc.yml");
                let dockerCmd = config.docker.cmd;
                let doc = yaml.safeLoad(fse.readFileSync(yamlPath, 'utf8'));
                assert.include(doc.execution.cmd, "BerlinOhne.csv:" + path.join("/erc", "BerlinMit.csv") + ":ro");
                done();
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with existence of substituted ERC files', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                let basefilePath = path.join(config.fs.compendium, substituted_id, "BerlinMit.csv");
                let overlayFilePath = path.join(config.fs.compendium, substituted_id, response.metadata.substitution.substitutionFiles[0].filename);
                assert.equal(fse.existsSync(basefilePath), true, 'base file should exist in folder of substituted ERC');
                assert.equal(fse.existsSync(overlayFilePath), true, 'overlay file should exist in folder of substituted ERC');
                done();
            });
        }).timeout(requestReadingTimeout);
    });
});

// #########################################################################################################################

describe('Simple substitution of data with one WORKSPACE (as base) and one ERC (as overlay)', function () {
    var base_id;
    var overlay_id;

    before(function (done) {
        let req_workspace_base01 = uploadCompendium('./test/workspace/base01', cookie_o2r, 'workspace');
        let req_erc_overlay02 = uploadCompendium('./test/erc/overlay02', cookie_o2r);
        this.timeout(60000);

        // first upload
        request(req_workspace_base01, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;

            publishCandidate(base_id, cookie_o2r, (err) => {
                assert.ifError(err);

                // second upload
                request(req_erc_overlay02, (err, res, body) => {
                    assert.ifError(err);
                    overlay_id = JSON.parse(body).id;

                    publishCandidate(overlay_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });
    });

    describe('POST /api/v1/substitution with one valid WORKSPACE and one valid ERC', () => {
        var substituted_id;
        let base_file = "files/BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should respond with HTTP 200 OK and valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.isObject(body);
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id = body.id;

                    publishCandidate(substituted_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with substituted metadata', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'metadata');
                assert.property(response.metadata, 'substituted');
                assert.propertyVal(response.metadata, 'substituted', true);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with metadata for base and overlay ID', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata, 'substitution');
                assert.property(response.metadata.substitution, 'base');
                assert.property(response.metadata.substitution, 'overlay');
                assert.propertyVal(response.metadata.substitution, 'base', base_id);
                assert.propertyVal(response.metadata.substitution, 'overlay', overlay_id);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with metadata for base and overlay filenames, and new filename at root directory', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 1);
                assert.property(response.metadata.substitution.substitutionFiles[0], 'base');
                assert.property(response.metadata.substitution.substitutionFiles[0], 'overlay');
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'base', "files/BerlinMit.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'overlay', "data/BerlinOhne.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'filename', "overlay_overlay_BerlinOhne.csv");
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with correct written erc.yml one overlay', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 1);

                let yamlPath = path.join(config.fs.compendium, substituted_id, "erc.yml");
                let dockerCmd = config.docker.cmd;
                let doc = yaml.safeLoad(fse.readFileSync(yamlPath, 'utf8'));
                assert.include(doc.execution.cmd, "overlay_overlay_BerlinOhne.csv:" + path.join("/erc", "files/BerlinMit.csv") + ":ro");
                done();
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with existence of substituted ERC files', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                let basefilePath = path.join(config.fs.compendium, substituted_id, "files/BerlinMit.csv");
                let overlayfilePath = path.join(config.fs.compendium, substituted_id, response.metadata.substitution.substitutionFiles[0].filename);
                assert.equal(fse.existsSync(basefilePath), true, 'base file should exist in folder of substituted ERC');
                assert.equal(fse.existsSync(overlayfilePath), true, 'overlay file should exist in folder of substituted ERC');
                done();
            });
        }).timeout(requestReadingTimeout);
    });
});

// #########################################################################################################################

describe('Simple substitution of data with two WORKSPACEs', function () {
    var base_id;
    var overlay_id;

    before(function (done) {
        let req_workspace_base01 = uploadCompendium('./test/workspace/base01', cookie_o2r, 'workspace');
        let req_workspace_overlay03 = uploadCompendium('./test/workspace/overlay03', cookie_o2r, 'workspace');
        this.timeout(60000);

        // first upload
        request(req_workspace_base01, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;

            publishCandidate(base_id, cookie_o2r, (err) => {
                assert.ifError(err);

                // second upload
                request(req_workspace_overlay03, (err, res, body) => {
                    assert.ifError(err);
                    overlay_id = JSON.parse(body).id;

                    publishCandidate(overlay_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });
    });

    describe('POST /api/v1/substitution with one valid ERC and one valid WORKSPACE', () => {
        var substituted_id;
        var substituted_id_moreOverlays;
        let base_file = "files/BerlinMit.csv";
        let overlay_file = "BerlinOhne.csv";

        it('should respond with HTTP 200 OK and valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    assert.isObject(body);
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid ID and allow publishing', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id = body.id;

                    publishCandidate(substituted_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with substituted metadata', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'metadata');
                assert.property(response.metadata, 'substituted');
                assert.propertyVal(response.metadata, 'substituted', true);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with metadata for base and overlay ID', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata, 'substitution');
                assert.property(response.metadata.substitution, 'base');
                assert.property(response.metadata.substitution, 'overlay');
                assert.propertyVal(response.metadata.substitution, 'base', base_id);
                assert.propertyVal(response.metadata.substitution, 'overlay', overlay_id);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with metadata for base and overlay filenames, and new filename at root directory', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 1);
                assert.property(response.metadata.substitution.substitutionFiles[0], 'base');
                assert.property(response.metadata.substitution.substitutionFiles[0], 'overlay');
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'base', "files/BerlinMit.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'overlay', "BerlinOhne.csv");
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'filename', "overlay_overlay_BerlinOhne.csv");
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with correct written erc.yml one overlay', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 1);

                let yamlPath = path.join(config.fs.compendium, substituted_id, "erc.yml");
                let dockerCmd = config.docker.cmd;
                let doc = yaml.safeLoad(fse.readFileSync(yamlPath, 'utf8'));
                assert.include(doc.execution.cmd, "overlay_overlay_BerlinOhne.csv:" + path.join("/erc", "files/BerlinMit.csv") + ":ro");
                done();
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with existence of substituted ERC files', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                let basefilePath = path.join(config.fs.compendium, substituted_id, "files/BerlinMit.csv");
                let overlayfilePath = path.join(config.fs.compendium, substituted_id, response.metadata.substitution.substitutionFiles[0].filename);
                assert.equal(fse.existsSync(basefilePath), true, 'base file should exist in folder of substituted ERC');
                assert.equal(fse.existsSync(overlayfilePath), true, 'overlay file should exist in folder of substituted ERC');
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with correct substitution file list with multiple overlays', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                req.json.substitutionFiles.push({ base: "Dockerfile", overlay: "main.Rmd" });
                req.json.substitutionFiles.push({ base: "main.Rmd", overlay: "Dockerfile" });

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id_moreOverlays = body.id;

                    publishCandidate(substituted_id_moreOverlays, cookie_o2r, (err) => {
                        assert.ifError(err);
                        request(global.test_host_read + '/api/v1/compendium/' + substituted_id_moreOverlays, (err, res, body) => {
                            assert.ifError(err);
                            let response = JSON.parse(body);
                            assert.property(response.metadata.substitution, 'substitutionFiles');
                            assert.equal(response.metadata.substitution.substitutionFiles.length, 3);

                            done();
                        });
                    });
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with correct written erc.yml with multiple overlays', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id_moreOverlays, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 3);

                let yamlPath = path.join(config.fs.compendium, substituted_id_moreOverlays, "erc.yml");
                let dockerCmd = config.docker.cmd;
                let doc = yaml.safeLoad(fse.readFileSync(yamlPath, 'utf8'));
                assert.include(doc.execution.cmd, "BerlinOhne.csv:" + path.join("/erc", "files/BerlinMit.csv") + ":ro");
                assert.include(doc.execution.cmd, "overlay_main.Rmd:" + path.join("/erc", "Dockerfile") + ":ro");
                assert.include(doc.execution.cmd, "overlay_Dockerfile:" + path.join("/erc", "main.Rmd") + ":ro");
                done();
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with existence of substituted ERC files', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id_moreOverlays, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                let basefilePath = path.join(config.fs.compendium, substituted_id_moreOverlays, "main.Rmd");
                let overlayfilePath = path.join(config.fs.compendium, substituted_id_moreOverlays, "overlay_main.Rmd");
                assert.equal(fse.existsSync(basefilePath), true, 'basefile should exist in folder of substituted ERC');
                assert.equal(fse.existsSync(overlayfilePath), true, 'overlayfile should exist in folder of substituted ERC');
                done();
            });
        }).timeout(requestReadingTimeout);
    });
});

// #########################################################################################################################

describe('Simple substitution of data with one WORKSPACE (as base) and one ERC (as overlay), that should fail', function () {
    var base_id;
    var overlay_id;

    before(function (done) {
        let req_workspace_base02 = uploadCompendium('./test/workspace/base02', cookie_o2r, 'workspace');
        let req_erc_overlay02 = uploadCompendium('./test/erc/overlay02', cookie_o2r);
        this.timeout(60000);

        // first upload
        request(req_workspace_base02, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;

            publishCandidate(base_id, cookie_o2r, (err) => {
                assert.ifError(err);

                // second upload
                request(req_erc_overlay02, (err, res, body) => {
                    assert.ifError(err);
                    overlay_id = JSON.parse(body).id;

                    publishCandidate(overlay_id, cookie_o2r, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });
    });

    describe('POST /api/v1/substitution with one valid WORKSPACE and one valid ERC', () => {
        var substituted_id;
        let base_file = "BerlinMit.csv";
        let overlay_file = "data/BerlinOhne.csv";

        it('should fail with HTTP 400 and valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.isObject(body);
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should fail with error configuration is missing', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.include(body, { error: 'missing configuration file in base compendium, please execute a job for the base compendium first' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

    });
});
