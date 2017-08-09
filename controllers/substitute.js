/*
 * (C) Copyright 2016 o2r project
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


const config = require('../config/config');
const debug = require('debug')('subsituter');
const path = require('path');
const exec = require('child_process').exec;
const errorMessageHelper = require('../lib/error-message');

// check fs & create dirs if necessary
const fse = require('fs-extra');
// fse.mkdirsSync(config.fs.base);
// fse.mkdirsSync(config.fs.incoming);
// fse.mkdirsSync(config.fs.compendium);

var Compendium = require('../lib/model/compendium');

/**
 * function to get metadata of base compenduim
 * @param {object} passon - new compendium id and data of origin compendia
 */
 function getMetadata (passon) {
    return new Promise((fulfill, reejct) => {
        debug('[%s] Requesting metadata of base compendium with id [%s] ...', passon.id, passon.metadata.substitution.base);
        Compendium.findOne({ id: passon.metadata.substitution.base}, function (err, res) {
            if (err) {
                debug('[%s] Error requesting metadata of base Compendium.'. passon.id);
                reject('Error requesting metadata of base compendium with id [%s].', passon.metadata.substitution.base);
            } else {
                debug('Response of metadata');
                passon.baseMetaData = res.metadata;
                fulfill(passon);
            }
        });
    })
 }

/**
 * function to create folder for new compendium
 * @param {object} passon - new compendium id and data of origin compendia
 */
function createFolder(passon) {
    return new Promise((fulfill, reject) => {
        var outputPath = path.join(config.fs.compendium, passon.id) + '/data';
        debug('[%s] Creating folder for new compendium ...', passon.id);
        try {
            fse.mkdirsSync(outputPath);
        } catch(err) {
            debug('[%s] Error creating directory for new compendium id: %s', passon.id, err);
            reject('Error creating directory for new compendium id: \n' + err);
        }
        debug('[%s] Created folder for new compendium in: \n%s\n', passon.id, outputPath);
        passon.substitutedPath = outputPath;
        var basePath = path.join(config.fs.compendium, passon.metadata.substitution.base) + '/data';
        var overlayPath = path.join(config.fs.compendium, passon.metadata.substitution.overlay) + '/data';
        passon.basePath = basePath;
        passon.overlayPath = overlayPath;
        fulfill(passon);
    });
}

/**
 * function to mount bsae files for new compendium
 * @param {object} passon - new compendium id and data of origin compendia
 */
function mountBaseFiles(passon) {
    debug('[%s] Mounting base files ...', passon.id);
        return new Promise((fulfill, reject) => {
        // try {
            let cmd = [
                config.mount.init,
                passon.basePath,
                passon.substitutedPath
            ].join(' ');

            debug('[%s] Running base mount with command \n"%s"\n', passon.id, cmd);
            exec(cmd, (error, stdout, stderr) => {
                if (error || stderr) {
                    debug('[%s] Problem during base mount:\n\t%s\n\t%s',
                        passon.id, error.message, stderr.message);
                    debug(error, stderr, stdout);
                    let errors = error.message.split(':');
                    let message = errorMessageHelper(errors[errors.length - 1]);
                    error.msg = JSON.stringify({ error: 'mount failed: ' + message });
                    reject(error);
                } else {
                    debug('[%s] Completed base mount.\n', passon.id);

                    // check if metadata was found, if so put the metadata directory into passon
                    fse.readdir(passon.substitutedPath, (err, files) => {
                        if (err) {
                            debug('[%s] Error reading directory %s:\n\t%s', passon.id, passon.substitutedPath, err);
                            reject(err);
                        } else if (files.length < 1) {
                            debug('[%s] Mount directory %s is empty:\n\t%s', passon.id, passon.substitutedPath, err);
                            reject(new Error('No files in the mount directory'));
                        } else {
                            debug('[%s] Finished mounting [%s] base files: %s', passon.id, files.length, JSON.stringify(files));
                            fulfill(passon);
                        }
                    });
                }
            });
        // } catch(err) {
        //     console.log(err);
        //     debug('Error mounting base files to directory of new compendium - id: %s', err);
        //     reject('Error mounting base files to directory of new compendium: \n' + err);
        // }
        // fulfill(passon);
    });
}

/**
 * function to mount overlay files for new compendium
 * @param {object} passon - new compendium id and data of origin compendia
 */
function mountOverlayFiles(passon) {
    debug('[%s] Mounting overlay files ...', passon.id);

    return new Promise((fulfill, reject) => {
      // try {
        let substFiles = passon.metadata.substitution.substitutionFiles;
        debug('[%s] Running overlay mount [%s] times ...', passon.id, substFiles.length);
        for (var i=0; i<=substFiles.length; i++) {
          // execute only if the last file is mounted
            if (i==substFiles.length) {
                debug('[%s] Nr. %s : Finished overlay mount.\n', passon.id, i-1);
                fulfill(passon);
            } else {
                let cmd = [
                    config.mount.init,
                    path.join(passon.overlayPath, substFiles[i].xchange),
                    path.join(passon.substitutedPath, substFiles[i].original)
                ].join(' ');

                debug('[%s] Running overlay mount with command "%s"', passon.id, cmd);
                exec(cmd, (error, stdout, stderr) => {
                    if (error || stderr) {
                        debug('[%s] Problem during overlay mount:\n\t%s\n\t%s',
                            passon.id, error.message, stderr.message);
                        debug(error, stderr, stdout);
                        let errors = error.message.split(':');
                        let message = errorMessageHelper(errors[errors.length - 1]);
                        error.msg = JSON.stringify({ error: 'mount failed: ' + message });
                        reject(error);
                    } else {
                        debug('[%s] Nr. %s : overlay mount ...', passon.id, i);
                    }
                });
          }
        }
      // } catch(err) {
      //     console.log(err);
      //     debug('Error mounting overlay files to directory of new compendium - id: %s', err);
      //     reject('Error mounting overlay files to directory of new compendium: \n' + err);
      // }
      // fulfill(passon);
    });
}

/**
 * function to save new compendium to mongodb
 * @param {object} passon - new compendium id and data of origin compendia
 */
function saveToDB(passon) {
    return new Promise((fulfill, reject) => {
        debug('[%s] Saving new compendium ...', passon.id);
        var metadataToSave = {};
        metadataToSave = passon.baseMetaData;
        metadataToSave.substituted = passon.metadata.substituted;
        metadataToSave.substitution = passon.metadata.substitution;
        var compendium = new Compendium({
            id: passon.id,
            user: passon.user,
            metadata: metadataToSave
        });

        compendium.save(error => {
            if (error) {
                debug('[%s] ERROR saving new compendium for user: %s', passon.id, passon.user);
                error.msg = JSON.stringify({ error: 'internal error' });
                error.status = 500;
                reject(error);
            } else {
                debug('[%s] Saved new compendium for user: %s.', passon.id, passon.user);
                fulfill(passon);
            }
        });
    });
}

/**
 * function to create docker image
 * @param {object} passon - compendium id and data of compendia
 */
 function createDockerImage(passon) {
    return new Promise((fulfill, reject) => {
      debug('[%s] Creating docker image ...', passon.id);
      let cmd = [
          config.docker.image,
          config.docker.imageTag,
          passon.id,
          config.docker.imagePoint
      ].join(' ');

      debug('Creating docker image using command "%s"', cmd);
      exec(cmd, (error, stdout, stderr) => {
          console.log("\n \n" + stdout + " \n \n ");
          if (error || stderr) {
              debug(error, stderr, stdout);
              error.msg = JSON.stringify({ error: 'internal error' });
              error.status = 500;
              reject(error);
          } else {
              passon.cmd = {};
              passon.cmd.image = cmd;
              debug('Image creation complete.');
              fulfill(passon);
          }
      });
  });
 }

/**
 * function to start docker container
 * @param {object} passon - compendium id and data of compendia
 */
 function startDockerContainer(passon) {
    return new Promise((fulfill, reject) => {
        debug('[%s] Starting docker container with image [%s] ...',passon.id, passon.image);
        let cmd = [
            config.docker.run,
            passon.image
        ].join(' ');

        debug('Starting docker container using command "%s"', cmd);
        exec(cmd, (error, stdout, stderr) => {
            console.log("\n \n" + stdout + " \n \n ");
            if (error || stderr) {
                debug(error, stderr, stdout);
                error.msg = JSON.stringify({ error: 'internal error' });
                error.status = 500;
                reject(error);
            } else {
                passon.cmd.container = cmd;
                debug('Docker Container complete.');
                fulfill(passon);
            }
        });
    });
 }

module.exports = {
    // checkNewId: checkNewId,
    getMetadata: getMetadata,
    createFolder: createFolder,
    mountBaseFiles: mountBaseFiles,
    mountOverlayFiles: mountOverlayFiles,
    // runAnalysis: runAnalysis,
    saveToDB: saveToDB,
    createDockerImage: createDockerImage,
    startDockerContainer: startDockerContainer
};
