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

const request = require('request');
const tmp = require('tmp');
const AdmZip = require('adm-zip');
const fs = require('fs');

function uploadCompendium(path, cookie) {
  var zip = new AdmZip();
  zip.addLocalFolder(path);
  var tmpfile = tmp.tmpNameSync() + '.zip';
  //var zipBuffer = zip.toBuffer(); could not make buffer work with multipart/form
  zip.writeZip(tmpfile);

  let formData = {
    'content_type': 'compendium_v1',
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
  j.setCookie(ck, global.test_host);

  let reqParams = {
    uri: global.test_host_upload + '/api/v1/compendium',
    method: 'POST',
    jar: j,
    formData: formData,
    timeout: 10000
  };

  return (reqParams);
};

function createSubstitutionPostRequest(base_id, overlay_id, base_file, overlay_file, cookie) {

  let substitutionObject = {
    base: base_id,
    overlay: overlay_id,
    substitutionFiles: [
      {
        base: base_file,
        overlay: overlay_file
      }
    ]
  }

  let j = request.jar();
  let ck = request.cookie('connect.sid=' + cookie);
  j.setCookie(ck, global.test_host);

  let reqParams = {
    uri: global.test_host + '/api/v1/substitution',
    method: 'POST',
    jar: j,
    json: substitutionObject,
    timeout: 10000
  };

  return (reqParams);
};


module.exports.uploadCompendium = uploadCompendium;
module.exports.createSubstitutionPostRequest = createSubstitutionPostRequest;
