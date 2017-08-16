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

var Stream = require('stream');
const Docker = require('dockerode');
const clone = require('clone');

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
                passon.cleanup = "noCleanup";
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
            passon.cleanup = "noCleanup";
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
 * function to copy base files for new compendium
 * @param {object} passon - new compendium id and data of origin compendia
 */
function copyBaseFiles(passon) {
    debug('[%s] Copying base files ...', passon.id);
        return new Promise((fulfill, reject) => {
        try {
            debug('[%s] Running copy base files', passon.id);
            fse.copySync(passon.basePath, passon.substitutedPath);
            debug('[%s] Finished copy base files', passon.id);
            fulfill(passon);
        } catch(err) {
            debug('Error copying base files to directory of new compendium - id: %s', err);
            passon.cleanup = "folderCleanup";
            reject('Error copying base files to directory of new compendium: \n' + err);
        }
    });
}

/**
 * function to copy overlay files for new compendium
 * @param {object} passon - new compendium id and data of origin compendia
 */
function copyOverlayFiles(passon) {
    debug('[%s] Copying overlay files ...', passon.id);

    return new Promise((fulfill, reject) => {
        let substFiles = passon.metadata.substitution.substitutionFiles;
        debug('[%s] Running copy overlay files [%s] times ...', passon.id, substFiles.length);
        for (var i=0; i<=substFiles.length; i++) {
          // execute only if the last file is mounted
            if (i==substFiles.length) {
                debug('[%s] Finished copy overlay files.\n', passon.id);
                fulfill(passon);
            } else {
                debug('[%s] copied files: %s', passon.id, (i+1));
                let basefile = passon.substitutedPath + '/' + substFiles[i].base;
                let overlayfile = passon.overlayPath + '/' + substFiles[i].overlay;
                  try {
                      let newoverlayfilename ='overlay_' + substFiles[i].overlay;
                      let newoverlayfilepath = passon.substitutedPath + '/' + newoverlayfilename;
                      fse.copySync(overlayfile, newoverlayfilepath);  //TODO: check if name is copied too
                      substFiles[i].filename = newoverlayfilename;
                  } catch(err) {
                      debug('Error copying overlay files to directory of new compendium - id: %s', err);
                      passon.cleanup = "folderCleanup";
                      reject('Error copying overlay files to directory of new compendium: \n' + err);
                  }
          }
        }
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
                passon.cleanup = "dockerCleanup";
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
      let imagetitle = 'subst' + passon.id;
      imagetitle = "bagtainer:" + imagetitle.toLowerCase();

      // setup Docker client with default options
      var docker = new Docker();
      // debug('[%s] Docker client set up: %s', passon.id, JSON.stringify(docker));
      debug('[%s] Docker client set up.', passon.id);

      docker.buildImage({
        context: "/tmp/o2r-dev/compendium/sVAYJ3/data/",
        src: ['Dockerfile', "main.Rmd", "BerlinMit.csv", "erc.yml"]
      }, {t: imagetitle}, function (err, response) {
          if (err) debug(err)
          debug('# \n # \n Creating docker  image finished. \n # \n #');
          passon.docker = {};
          passon.docker.imageTag = imagetitle;
          fulfill(passon);
      });

  });
 }

/**
 * function to start docker container
 * @param {object} passon - compendium id and data of compendia
 */
 function startDockerContainer(passon) {
    return new Promise((fulfill, reject) => {

        // setup Docker client with default options
        var docker = new Docker();
        // debug('Docker client set up: %s', JSON.stringify(docker));
        debug('[%s] Starting docker container ...');
        if (!passon.docker.imageTag) {
            debug('[%s] image tag was not passed.');
            passon.cleanup = "folderCleanup";
            reject(new Error('image tag was not passed on!'));
        }

        debug('[%s] Starting docker container with image [%s] ...',passon.id, passon.docker.imageTag);
        let substFiles = passon.metadata.substitution.substitutionFiles;
        passon.o2rPath = config.fs.compendium + passon.id + '/data/'; //TODO: check if anywhere else saved in passon
        let volumemount = "";
        let containerBinds = new Array();
        let baseBind = config.fs.compendium + passon.id + '/data' + ":" + "/erc";
        containerBinds.push(baseBind);
        for (let i=0; i< substFiles.length; i++) {
            let bind = passon.o2rPath + substFiles[i].filename + ":" + "/erc/" + substFiles[i].base + ":ro";
            containerBinds.push(bind);
        }
        passon.docker.binds = containerBinds;

        if (!passon.docker.binds) {
            debug('[%s] volume binds were not passed.');
            passon.cleanup = "folderCleanup";
            reject(new Error('volume binds were not passed!'));
        } else {
            debug('Run docker image with binds: \n%s', JSON.stringify(passon.docker.binds));

            let create_options = clone(config.bagtainer.docker.create_options);
            let start_options = clone(config.bagtainer.docker.start_options);
            debug('Starting Docker container now with options:\n\tcreate_options: %s\n\tstart_options: %s', JSON.stringify(create_options), JSON.stringify(start_options));

            docker.run(passon.docker.imageTag, [], process.stdout, {
              "HostConfig": {
                "Binds": containerBinds
              }
            }).then(function(container) {
                debug('Container StatusCode: %s', container.output.StatusCode);
                if (container.output.StatusCode === 0) {
                    debug('[%s] Creating container finished.', passon.id);
                    passon.docker.containerID = container.id;
                    debug('removing container %s ...', container.id);
                    return container.remove();
                }
            }).then(function(data) {
                // data === "" --> typeof(data) === String
                debug('Container has been removed');
                fulfill(passon);
            }).catch(function(err) {
                debug('[DOCKER] error: %s', err);
                container.remove();
                reject(new Error(err));
            });
        }
    });
 }

 function cleanup(passon, index) {
    debug('[%s] Starting cleanup ...', passon.id);
    switch(index) {
        case 'noCleanup':
            debug('no cleanup necessary.');
        break;
        case 'folderCleanup':
            debug('[%s] Cleanup running ...', passon.id);
            let cleanupPath = path.join(config.fs.compendium, passon.id);
            fse.removeSync(cleanupPath);
        break;
    }
    debug('[%s] Finished cleanup.', passon.id);
 };

module.exports = {
    // checkNewId: checkNewId,
    getMetadata: getMetadata,
    createFolder: createFolder,
    copyBaseFiles: copyBaseFiles,
    copyOverlayFiles: copyOverlayFiles,
    // runAnalysis: runAnalysis,
    saveToDB: saveToDB,
    createDockerImage: createDockerImage,
    startDockerContainer: startDockerContainer,
    cleanup: cleanup
};
