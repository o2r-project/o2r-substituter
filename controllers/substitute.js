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
                // check if there is a basefile selected thats gonna be substituted through overlay file
                // if (substFiles[i].base == config.substitution.nobasefile) {
                //
                //     let newoverlayfilename ='overlay_' + substFiles[i].overlay;
                //     let newoverlayfilepath = passon.substitutedPath + '/' + newoverlayfilename;
                //     try {
                //         fse.copySync(overlayfile, newoverlayfilename);
                //         substFiles[i].filename = newoverlayfilename;
                //     } catch(err) {
                //       debug('Error copying overlay files (without basefile) to directory of new compendium - id: %s', err);
                //       reject('Error copying overlay files (without basefile) to directory of new compendium: \n' + err);
                //     }
                // } else {
                  try {
                      let newoverlayfilename ='overlay_' + substFiles[i].overlay;
                      let newoverlayfilepath = passon.substitutedPath + '/' + newoverlayfilename;
                      fse.copySync(overlayfile, newoverlayfilepath);  //TODO: check if name is copied too
                      substFiles[i].filename = newoverlayfilename;
                  } catch(err) {
                      debug('Error copying overlay files to directory of new compendium - id: %s', err);
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
        // change title of Substituted ERC
        metadataToSave.raw.title = 'Subst && ' + metadataToSave.raw.title;
        metadataToSave.o2r.title = 'Subst && ' + metadataToSave.o2r.title;  // this is for visible title
        metadataToSave.zenodo.title = 'Subst && ' + metadataToSave.zenodo.title;
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
      let imagetitle = 'subst' + passon.id;
      imagetitle = imagetitle.toLowerCase();
      // let cmd = [
      //     config.docker.image,
      //     config.docker.imageTag,
      //     imagetitle,
      //     config.docker.imagePoint
      // ].join(' ');
      //
      // debug('Creating docker image using command "%s"', cmd);
      // exec(cmd, (error, stdout, stderr) => {
      //     if (error || stderr) {
      //       console.log("\n error: \n" + stdout + " \n \n ");
      //         debug(error, stderr, stdout);
      //         error.msg = JSON.stringify({ error: 'internal error' });
      //         error.status = 500;
      //         reject(error);
      //     } else {
      //       console.log("stdout");
      //       console.log("\n success: \n" + stdout + " \n \n ");
      //         passon.docker = {};
      //         passon.docker.imageTag = imagetitle;
      //         passon.docker.imageCMD = cmd;
      //         debug('Image creation complete.');
      //         fulfill(passon);
      //     }
      // });

      // setup Docker client with default options
      var docker = new Docker();

      let lastData = null;
      let ercPath = path.join(config.fs.compendium, passon.id) + '/data';
      passon.dirpath = ercPath;

      docker.buildImage(context: passon.dirpath,
        src: ['Dockerfile'],
        { t: passon.docker.imageTag }, (error, output) => {
          if (error) {
            // this.updateStep('image_build', 'failure', error, (err) => {
            //   if (err) reject(err);

              reject(error);
//             });
          } else {
            output.on('data', d => {
              lastData = JSON.parse(d.toString('utf8'));

              // debugBuild('[%s] [build] %s', this.jobId, JSON.stringify(lastData));

              // this.textAppend('image_build', lastData.stream, (err) => {
              //   if (err) {
              //     debugBuild('[%s] ERROR appending last output log "%s" to job %s', lastData.stream, this.jobId);
              //     reject(err);
              //   }
              // });
            });
            output.on('end', () => {
              // check if build actually succeeded
              if (lastData.error) {
                // debug('[%s] Created Docker image NOT created: %s', this.jobId, JSON.stringify(lastData));
                debug('created docker image NOT created');
                // this.updateStep('image_build', 'failure', lastData.error, (err) => {
                //   if (err) reject(err);
                //
                //   reject(new Error(lastData.error));
                // });

              }
              else if (lastData.stream && (lastData.stream.startsWith('Successfully built') || lastData.stream.startsWith('Successfully tagged'))) {
                // debug('[%s] Created Docker image "%s", last log was "%s"', this.jobId, this.imageTag, lastData.stream);
                debug('create docker image');
                // this.updateStep('image_build', 'success', null, (err) => {
                //   if (err) {
                //     debugBuild('[%s] ERROR updating step: %s', err);
                //     reject(err);
                //   }

                  passon.docker.imageTag = this.imageTag;
                  fulfill(passon);
                });
              }
            });
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

        // setup Docker client with default options
        // var docker = new Docker();
        // debug('Docker client set up: %s', JSON.stringify(docker));
        //
        // if (!passon.docker.imageTag) {
        //     reject(new Error('image tag was not passed on!'));
        // }
        //
        debug('[%s] Starting docker container with image [%s] ...',passon.id, passon.docker.imageTag);
        let cmd = "docker image ls";
        exec(cmd, (error, stdout, stderr) => {
            if (error || stderr) {
              console.log("\n error: \n" + stdout + " \n \n ");
                debug(error, stderr, stdout);
                error.msg = JSON.stringify({ error: 'internal error' });
                error.status = 500;
                reject(error);
            } else {
              console.log("stdout");
              console.log("\n success: \n" + stdout + " \n \n ");
                debug('Image creation complete.');
                fulfill(passon);
            }
        });

        // docker.run(passon.docker.imageTag, [], stdStream, create_options, start_options, (err, data, container) => {
        //     passon.docker.containerTag = container; // pass on a reference to container for later cleanup
        //     if (err) {
        //         reject(new Error('error: starting container'));
        //     }
        // }
        //
        // //promise
        // docker.run(testImage, ['bash', '-c', 'uname -a'], process.stdout).then(function(container) {
        //     console.log(container.output.StatusCode);
        //     return container.remove();
        // }).then(function(data) {
        //     console.log('container removed');
        // }).catch(function(err) {
        //     console.log(err);
        // });


        // debug('Starting Docker container now with options:\n\tcreate_options: %s\n\tstart_options: %s',
        //   JSON.stringify(create_options), JSON.stringify(start_options));

        // let cmd = [
        //     config.docker.run,
        //     passon.image
        // ].join(' ');
        //
        // debug('Starting docker container using command "%s"', cmd);
        // exec(cmd, (error, stdout, stderr) => {
        //     console.log("\n \n" + stdout + " \n \n ");
        //     if (error || stderr) {
        //         debug(error, stderr, stdout);
        //         error.msg = JSON.stringify({ error: 'internal error' });
        //         error.status = 500;
        //         reject(error);
        //     } else {
        //         passon.cmd.container = cmd;
        //         debug('Docker Container complete.');
        //         fulfill(passon);
        //     }
        // });
    });
 }

module.exports = {
    // checkNewId: checkNewId,
    getMetadata: getMetadata,
    createFolder: createFolder,
    copyBaseFiles: copyBaseFiles,
    copyOverlayFiles: copyOverlayFiles,
    // runAnalysis: runAnalysis,
    saveToDB: saveToDB,
    createDockerImage: createDockerImage,
    startDockerContainer: startDockerContainer
};
