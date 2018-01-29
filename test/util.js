/*
 * (C) Copyright 2017 o2r project
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const request = require('request');
const tmp = require('tmp');
const AdmZip = require('adm-zip');
const fs = require('fs');
const config = require('../config/config')
const path = require('path');
const yaml = require('js-yaml');
const debug = require('debug')('test:util');

const cookie_o2r = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';

function uploadCompendium(path, cookie, type = 'compendium') {
  var zip = new AdmZip();
  zip.addLocalFolder(path);
  var tmpfile = tmp.tmpNameSync() + '.zip';
  zip.writeZip(tmpfile);

  let formData = {
    'content_type': type,
    'compendium': {
      value: fs.createReadStream(tmpfile),
      options: {
        filename: 'another.zip',
        contentType: 'application/zip'
      }
    }
  };
  let j = request.jar();
  let ck = request.cookie('connect.sid=' + cookie);
  j.setCookie(ck, global.test_host_upload);

  let reqParams = {
    uri: global.test_host_upload + '/api/v1/compendium',
    method: 'POST',
    jar: j,
    formData: formData,
    timeout: 60000
  };

  return (reqParams);
}

function createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, metadataHandling, cookie) {

  let substitutionObject = {
    base: base_id,
    overlay: overlay_id,
    substitutionFiles: [
      {
        base: base_file,
        overlay: overlay_file
      }
    ],
    metadataHandling: metadataHandling
  }

  let j = request.jar();
  let ck = request.cookie('connect.sid=' + cookie);
  j.setCookie(ck, global.test_host);

  let reqParams = {
    uri: global.test_host + '/api/v1/substitution',
    method: 'POST',
    jar: j,
    json: substitutionObject
  };

  return (reqParams);
};

// publish a candidate with a direct copy of the metadata
publishCandidate = function (compendium_id, cookie, done) {
  let j = request.jar();
  let ck = request.cookie('connect.sid=' + cookie);
  j.setCookie(ck, global.test_host);

  let getMetadata = {
    uri: global.test_host_read + '/api/v1/compendium/' + compendium_id,
    method: 'GET',
    jar: j
  };

  let updateMetadata = {
    uri: global.test_host_read + '/api/v1/compendium/' + compendium_id + '/metadata',
    method: 'PUT',
    jar: j,
    timeout: 60000
  };

  request(getMetadata, (err, res, body) => {
    if (err || body.error) {
      console.error('error publishing candidate: %s %s', err, JSON.stringify(body));
      done(err || body.error);
    } else {
      let response = JSON.parse(body);
      updateMetadata.json = { o2r: response.metadata.o2r };

      // hack some valid values into the configuration
      if(!updateMetadata.json.o2r.displayfile) {
        updateMetadata.json.o2r.displayfile = updateMetadata.json.o2r.mainfile;
      }

      request(updateMetadata, (err, res, body) => {
        if (err || body.error) {
          console.error('error publishing candidate: %s %s', err, JSON.stringify(body));
          done(err || body.error);
        } else {
          debug('Published candidate: %s', JSON.stringify(body).slice(0, 60));
          done();
        }
      });
    }
  });
}

startJob = function (compendium_id, done) {
  let j = request.jar();
  let ck = request.cookie('connect.sid=' + cookie_o2r);
  j.setCookie(ck, global.test_host_read);

  request({
    uri: global.test_host_read + '/api/v1/job',
    method: 'POST',
    jar: j,
    formData: {
      compendium_id: compendium_id
    },
    timeout: 10000
  }, (err, res, body) => {
    let response = JSON.parse(body);
    debug('Started job: %s', JSON.stringify(response));
    done(response.job_id);
  });
}

getErcYml = function (compendium_id, done) {
  getFile(compendium_id, 'erc.yml', (err, res, body) => {
    if (err) done(err);

    doc = yaml.safeLoad(body);
    debug('Loaded erc.yml:', JSON.stringify(doc).slice(0, 60));
    done(doc);
  });
}

getFile = function (compendium_id, filename, done) {
  request(global.test_host_read + '/api/v1/compendium/' + compendium_id, (err, res, body) => {
    if (err) done(err);

    response = JSON.parse(body);
    fileElement = response.files.children.filter(elem => {
      return (elem.name == filename);
    });
    fileUrl = global.test_host_files + fileElement[0].path
    debug('Requesting file %s', fileUrl);
    request(fileUrl, done);
  });
}

module.exports = {
  uploadCompendium: uploadCompendium,
  createSubstitutionPostRequest: createSubstitutionPostRequest,
  publishCandidate: publishCandidate,
  startJob: startJob,
  getErcYml: getErcYml,
  getFile: getFile
}
