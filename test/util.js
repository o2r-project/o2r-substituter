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
const config = require('../config/config')
const path = require('path');

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

function getYamlCmd(metadata) {
    let substFiles = metadata.metadata.substitution.substitutionFiles;
    let baseBind = path.join(config.fs.compendium, metadata.id, '/data') + ":" + "/erc";
    let substitutedPath = path.join(config.fs.compendium, metadata.id, '/data');
    let cmdBinds = new Array();
    let cmdBaseBind = "-v " + baseBind;
    cmdBinds.push(cmdBaseBind);

    let ercCmd = config.docker.cmd + " " + cmdBaseBind;
    for (let i=0; i< substFiles.length; i++) {
        let bind = path.join(substitutedPath, substFiles[i].overlay) + ":" + path.join("/erc/", substFiles[i].base) + ":ro";
        if (!filenameNotExists(substFiles[i].filename) == true) {
            bind = path.join(substitutedPath, substFiles[i].filename) + ":" + path.join("/erc/", substFiles[i].base) + ":ro";
        }
        let cmdBind = "-v " + bind;
        cmdBinds.push(cmdBind);
        ercCmd = ercCmd + " " + cmdBind;
    }
    return "'" + ercCmd + " " + config.docker.imageNamePrefix + metadata.id + "'";
};

/**
 * function to check if filename exist
 * @param {object} filename - filename
 * @return {boolean} true, if filename does not exist, else false
 */
function filenameNotExists(filename) {
   if (filename == undefined || typeof(filename) != 'string' || filename == '') {
     return true;
   } else {
     return false;
   }
};


module.exports.uploadCompendium = uploadCompendium;
module.exports.createSubstitutionPostRequest = createSubstitutionPostRequest;
module.exports.getYamlCmd = getYamlCmd;
