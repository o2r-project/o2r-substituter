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

require("./setup")
const cookie_o2r = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';
const requestLoadingTimeout = 30000;
const requestReadingTimeout = 10000;
const uploadCompendium = require('./util').uploadCompendium;
const createSubstitutionPostRequest = require('./util').createSubstitutionPostRequest;

describe('List all substitutions including one substituion', function () {
    var substituted_id_list;
    var amount_substitutions;

    before(function (done) {
        this.timeout(30000);

        request(global.test_host + '/api/v1/substitution', (err, res, body) => {
            assert.ifError(err);
            let response = JSON.parse(body);
            if (Array.isArray(response.results)) {
                amount_substitutions = response.results.length;
            } else { amount_substitutions = 0; }
            done();
        });
    })

    beforeEach(function (done) {
        let req_base01 = uploadCompendium('./test/erc/base02', cookie_o2r); // or './test/erc/base01'
        let req_overlay01 = uploadCompendium('./test/erc/overlay02', cookie_o2r); // or './test/erc/overlay01'
        var base_id_list;
        var overlay_id_list;
        let base_file_list = "BerlinMit.csv";
        let overlay_file_list = "BerlinOhne.csv";

        this.timeout(30000);

        request(global.test_host + '/api/v1/substitution', (err, res, body) => {
            assert.ifError(err);
            let response = JSON.parse(body);
            if (Array.isArray(response.results)) {
                amount_substitutions = response.results.length;
            } else { amount_substitutions = 0; }

            // first upload
            request(req_base01, (err, res, body) => {
                assert.ifError(err);
                base_id_list = JSON.parse(body).id;

                // second upload
                request(req_overlay01, (err, res, body) => {
                    assert.ifError(err);
                    overlay_id_list = JSON.parse(body).id;

                    // substitution
                    let req_substitution = createSubstitutionPostRequest(base_id_list, overlay_id_list, base_file_list, overlay_file_list, cookie_o2r, cookie_o2r);
                    request(req_substitution, (err, res, body) => {
                        assert.ifError(err);
                        substituted_id_list = body.id;
                        done();
                    });
                });
            });
        });
        this.timeout(30000);
    });

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
                assert.equal(response.results.length, (amount_substitutions + 1));
                assert.include(response.results, substituted_id_list);
                done();
            });
        });
    });
});

describe('Simple substitution of data', function () {
    var base_id;
    var overlay_id;

    before(function (done) {
        let req_base01 = uploadCompendium('./test/erc/base01', cookie_o2r);
        let req_overlay01 = uploadCompendium('./test/erc/overlay01', cookie_o2r);
        this.timeout(40000);

        // first upload
        request(req_base01, (err, res, body) => {
            assert.ifError(err);
            base_id = JSON.parse(body).id;

            // second upload
            request(req_overlay01, (err, res, body) => {
                assert.ifError(err);
                overlay_id = JSON.parse(body).id;

                done();
            });
        });
        this.timeout(30000);
    });

    // use two compendia (uploaded before) to run substitution
    describe('POST /api/v1/substitution with two valid ERCs', () => {
        var substituted_id;
        var substituted_id_moreOverlays;
        let base_file = "BerlinMit.csv";
        let overlay_file = "BerlinOhne.csv";

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

        it('should respond with valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.isObject(body, 'returned JSON');
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id = body.id;
                    done();
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

        it('should respond with metadata for base and overlay filenames', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response.metadata.substitution, 'substitutionFiles');
                assert.equal(response.metadata.substitution.substitutionFiles.length, 1);
                assert.property(response.metadata.substitution.substitutionFiles[0], 'base');
                assert.property(response.metadata.substitution.substitutionFiles[0], 'overlay');
                assert.notProperty(response.metadata.substitution.substitutionFiles[0], 'filename');
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'base', base_file);
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'overlay', overlay_file);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with correct substitution file list with multiple overlays', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                req.json.substitutionFiles.push({ base: "Dockerfile", overlay: "erc.yml" });
                req.json.substitutionFiles.push({ base: "main.Rmd", overlay: "Dockerfile" });

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id_moreOverlays = body.id;

                    request(global.test_host_read + '/api/v1/compendium/' + substituted_id_moreOverlays, (err, res, body) => {
                        assert.ifError(err);
                        let response = JSON.parse(body);
                        assert.property(response.metadata.substitution, 'substitutionFiles');
                        assert.equal(response.metadata.substitution.substitutionFiles.length, 3);

                        done();
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

                let ERC_path = path.join(config.fs.compendium, response.id, "/data");
                let bind = " -v " + ERC_path + ":/erc"
                let bind01 = " -v " + path.join(ERC_path, "BerlinOhne.csv") + ":" + path.join("/erc", "BerlinMit.csv") + ":ro"
                let bind02 = " -v " + path.join(ERC_path, "overlay_erc.yml") + ":" + path.join("/erc", "Dockerfile") + ":ro"
                let bind03 = " -v " + path.join(ERC_path, "overlay_Dockerfile") + ":" + path.join("/erc", "main.Rmd") + ":ro"
                let ercCmd = "'" + config.docker.cmd + bind + bind01 + bind02 + bind03 + " " + config.docker.imageNamePrefix + response.id + "'";

                let yamlPath = path.join(config.fs.compendium, substituted_id_moreOverlays, "data", "erc.yml");
                let dockerCmd = config.docker.cmd;
                let doc = yaml.safeLoad(fse.readFileSync(yamlPath, 'utf8'));
                assert.equal(doc.execution.cmd, ercCmd);
                done();
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with existence of substituted ERC files', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                let basefile = config.fs.compendium + substituted_id + '/data/' + response.metadata.substitution.substitutionFiles[0].base;
                let overlayfile = config.fs.compendium + substituted_id + '/data/' + response.metadata.substitution.substitutionFiles[0].overlay;
                assert.equal(fse.existsSync(basefile), true, 'base file should exist in folder of substituted ERC');
                assert.equal(fse.existsSync(overlayfile), true, 'overlay file should exist in folder of substituted ERC');
                done();
            });
        }).timeout(requestReadingTimeout);

        // TODO: this is for testing inline code, if substitution was successfull with the right file
        it.skip('should respond with correct integer of mounted overlay dataset', (done) => {
            // should not be: base02 -> "mitBerlin": Gesamtbilanz = 55.1, Jahr = 2014
            // should be:  overlay02 -> "ohneBerlin": Gesamtbilanz = 1051.2, Jahr = 1990

            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                let rmdfile = config.fs.compendium + substituted_id + '/data/main.Rmd';
                // let mainhtml = config.fs.compendium + substituted_id + '/data/main.html';
                let mainhtml = config.fs.compendium + substituted_id + '/data/main.Rmd';

                let doc = fse.readFileSync(mainhtml, 'utf8');
                let string_ = '"' + 'This is the maximum of ' + "'" + 'Gesamtbilanz' + "'" + ': 1051.2' + '"';
                assert.include(doc, string_);
                done();
            });
        }) //.timeout(requestReadingTimeout); //TODO: till ".skip" Error: cannot read property of undefined
    });

    describe('POST /api/v1/substitution with an overlay filename that already exists as an base filename', () => {
        var substituted_id;
        let base_file = "main.Rmd";
        let overlay_file = "main.Rmd";
        let overlay_overlay_file = "overlay_" + overlay_file;

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

        it('should respond with valid JSON', (done) => {

            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.isObject(body, 'returned JSON');
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);

        it('should respond with valid ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.property(body, 'id');
                    assert.isString(body.id);
                    substituted_id = body.id;
                    done();
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
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'base', base_file);
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'overlay', overlay_file);
                assert.propertyVal(response.metadata.substitution.substitutionFiles[0], 'filename', overlay_overlay_file);
                done();
            });
        }).timeout(requestReadingTimeout);

        it('should respond with existence of substituted ERC files', (done) => {
            request(global.test_host_read + '/api/v1/compendium/' + substituted_id, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                let basefile = config.fs.compendium + substituted_id + '/data/' + response.metadata.substitution.substitutionFiles[0].base;
                let filename = config.fs.compendium + substituted_id + '/data/' + response.metadata.substitution.substitutionFiles[0].filename;
                assert.equal(fse.existsSync(basefile), true, 'base file should exist in folder of substituted ERC');
                assert.equal(fse.existsSync(filename), true, 'filename file ("overlay_" + overlay file) should exist in folder of substituted ERC');
                done();
            });
        }).timeout(requestReadingTimeout);
    });

    describe('POST /api/v1/substitution with invalid base ID', () => {
        let base_id = "12345";
        let base_file = "BerlinMit.csv";
        let overlay_file = "BerlinOhne.csv";

        it('should fail the substitution because of invalid base ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { err: 'base ID is invalid' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with missing base ID', () => {
        let base_file = "BerlinMit.csv";
        let overlay_file = "BerlinOhne.csv";

        it('should fail the substitution because of missing base ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);
                delete req.json.base;

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { err: 'base ID is invalid' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with invalid overlay ID', () => {
        let overlay_id = "12345";
        let base_file = "BerlinMit.csv";
        let overlay_file = "BerlinOhne.csv";

        it('should fail the substitution because of invalid overlay ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { err: 'overlay ID is invalid' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with missing overlay ID', () => {
        let overlay_id = "12345";
        let base_file = "BerlinMit.csv";
        let overlay_file = "BerlinOhne.csv";

        it('should fail the substitution because of missing overlay ID', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);
                delete req.json.overlay;

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { err: 'overlay ID is invalid' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with invalid base file', () => {
        let base_file = "doesNotExist.csv";
        let overlay_file = "BerlinOhne.csv";

        it('should fail the substitution because of invalid base file', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { err: 'base file does not exist' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with invalid overlay file', () => {
        let base_file = "BerlinMit.csv";
        let overlay_file = "doesNotExist.csv";

        it('should fail the substitution because of invalid overlay file', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { err: 'overlay file does not exist' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with empty substitution files', () => {
        let base_file = "BerlinMit.csv";
        let overlay_file = "BerlinOhne.csv";

        it('should fail the substitution because of empty substitution files', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);
                req.json.substitutionFiles = [];   // set Array of substitutionFiles empty

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { err: 'substitution files missing' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with no substitution files', () => {
        let base_file = "BerlinMit.csv";
        let overlay_file = "BerlinOhne.csv";

        it('should fail the substitution because of no substitution files', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);
                delete req.json.substitutionFiles;

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { err: 'substitution files missing' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with only base filename in substitution files', () => {
        let base_file = "BerlinMit.csv";
        let overlay_file = "BerlinOhne.csv";

        it('should fail the substitution because of no overlay file in substitution files', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);
                req.json.substitutionFiles = [{
                    base: "BerlinMit.csv"
                }];

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { err: 'substitution overlay file does not exist' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });

    describe('POST /api/v1/substitution with only overlay filename in substitution files', () => {
        let base_file = "BerlinMit.csv";
        let overlay_file = "BerlinOhne.csv";

        it('should fail the substitution because of no base file in substitution files', (done) => {
            request(global.test_host + '/api/v1/substitution', (err, res, body) => {
                let req = createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie_o2r, cookie_o2r);
                req.json.substitutionFiles = [{
                    overlay: "BerlinOhne.csv"
                }];

                request(req, (err, res, body) => {
                    assert.ifError(err);
                    assert.equal(res.statusCode, 400);
                    assert.include(body, { err: 'substitution base file does not exist' });
                    done();
                });
            });
        }).timeout(requestLoadingTimeout);
    });
});
