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


const config = require('../config/config');
const debug = require('debug')('substituter');
const path = require('path');
const exec = require('child_process').exec;
const errorMessageHelper = require('../lib/error-message');
const Stream = require('stream');
const clone = require('clone');
const fse = require('fs-extra');
const yaml = require('js-yaml');
const writeYaml = require('write-yaml');

var Compendium = require('../lib/model/compendium');

/**
 * function to get metadata of base compendium
 * @param {object} passon - new compendium id and data of origin compendia
 */
function getMetadata(passon) {
    return new Promise((fulfill, reject) => {
        debug('[%s] Requesting metadata of base compendium with id - %s ...', passon.id, passon.metadata.substitution.base);
        try {
            Compendium.findOne({ id: passon.metadata.substitution.base })
                .select('id metadata bag').exec((err, compendium) => {
                    if (err) {
                        debug('[%s] Error requesting metadata of base compendium.', passon.id);
                        err.status = 400;
                        err.msg = 'base ID is invalid';
                        reject(err);
                    } else {
                        if (!compendium || compendium == null) {
                            debug('[%s] Error requesting metadata of base compendium.', passon.id);
                            let err = new Error();
                            err.status = 400;
                            err.msg = 'base ID is invalid';
                            reject(err);
                        } else {
                            debug('[%s] Requesting metadata of base compendium with id - %s - successful.', passon.id, passon.metadata.substitution.base);
                            passon.baseMetaData = compendium.metadata;
                            passon.bag = compendium.bag;
                            fulfill(passon);
                        }
                    }
                });
        } catch (err) {
            debug('[%s] Error requesting metadata of base Compendium.', passon.id);
            err.status = 400;
            err.msg = 'base ID is invalid';
            reject(err);
        }
    })
}

/**
 * function to check if overlay compendium exists
 * @param {object} passon - new compendium id and data of origin compendia
 */
function checkOverlayId(passon) {
    return new Promise((fulfill, reject) => {
        debug('[%s] Checking overlay compendium with id - %s ...', passon.id, passon.metadata.substitution.overlay);
        try {
            Compendium.findOne({ id: passon.metadata.substitution.overlay })
                .select('id bag').exec((err, compendium) => {
                    if (err) {
                        debug('[%s] Error checking id of overlay Compendium.', passon.id);
                        err.status = 400;
                        err.msg = 'overlay ID is invalid';
                        reject(err);
                    } else {
                        if (!compendium || compendium == null) {
                            debug('[%s] Error getting overlay compendium with id %s', passon.id, passon.metadata.substitution.overlay);
                            let err = new Error();
                            err.status = 400;
                            err.msg = 'overlay ID is invalid';
                            reject(err);
                        } else {
                            debug('[%s] Checking metadata of overlay compendium with id - %s - successful.', passon.id, passon.metadata.substitution.overlay);
                            passon.overlay = {};
                            passon.overlay.bag = compendium.bag;
                            fulfill(passon);
                        }
                    }
                });
        } catch (err) {
            debug('[%s] Error checking id of overlay Compendium.', passon.id);
            err.status = 400;
            err.msg = 'overlay ID is invalid';
            reject(err);
        }
    })
}

/**
 * function to create folder for new compendium
 * @param {object} passon - new compendium id and data of origin compendia
 */
function createFolder(passon) {
    return new Promise((fulfill, reject) => {
        var outputPath = path.join(config.fs.compendium, passon.id);
        debug('[%s] Creating folder for new compendium ...', passon.id);
        try {
            fse.mkdirsSync(outputPath);
            debug('[%s] Created folder for new compendium in: \n # %s\n', passon.id, outputPath);
            passon.substitutedPath = outputPath;
            passon.basePath = path.join(config.fs.compendium, passon.metadata.substitution.base);
            passon.overlayPath = path.join(config.fs.compendium, passon.metadata.substitution.overlay);
            debug("[%s] basePath: [%s], overlayPath: [%s], substitutedPath: [%s]", passon.id, passon.basePath, passon.overlayPath, passon.substitutedPath);
            fulfill(passon);
        } catch (err) {
            debug('[%s] Error creating directory for new compendium - err:\n%s', passon.id, err);
            reject(err);
        }
    });
}

/**
 * function to copy base files for new compendium, stripping the bag if it exists
 * @param {object} passon - new compendium id and data of origin compendia
 */
function copyBaseFiles(passon) {
    debug('[%s] Copying base files ...', passon.id);
    return new Promise((fulfill, reject) => {
        let substFiles = passon.metadata.substitution.substitutionFiles;

        // if compendium is a bag, copy only the payload
        let copyBasePath = passon.basePath;
        if (passon.bag) {
            copyBasePath = path.join(passon.basePath, 'data');
        }

        // check if array substitutionFiles exists and has data
        if (Array.isArray(substFiles) && Number.isInteger(substFiles.length) && substFiles.length > 0) {
            for (var i = 0; i <= substFiles.length; i++) {
                if (i == substFiles.length) {
                    try {
                        debug('[%s] Copy base files from %s to %s', passon.id, copyBasePath, passon.substitutedPath);
                        fse.copySync(copyBasePath, passon.substitutedPath);
                        debug('[%s] Finished copy base files', passon.id);
                        fulfill(passon);
                    } catch (err) {
                        debug('[%s] Error copying base files to directory of new compendium:\n%s', passon.id, err);
                        cleanup(passon);
                        err.status = 400;
                        err.msg = 'could not copy base files - base path does not exist';
                        reject(err);
                    }
                } else {
                    try {
                        // check if base filename exists in substitutionFiles
                        if (filenameNotExists(substFiles[i].base)) {
                            console.log("true");
                            debug('[%s] Error copying base files to directory of new compendium. - file:\n%s', passon.id, substFiles[i].base);
                            cleanup(passon);
                            let err = new Error();
                            err.status = 400;
                            err.msg = 'substitution base file does not exist';
                            reject(err);
                        } else {
                            // check if overlay filename exists in substitutionFiles
                            if (filenameNotExists(substFiles[i].overlay)) {
                                debug('[%s] Error copying base files to directory of new compendium. - file:\n%s', passon.id, substFiles[i].overlay);
                                cleanup(passon);
                                let err = new Error();
                                err.status = 400;
                                err.msg = 'substitution overlay file does not exist';
                                reject(err);
                            } else {
                                let baseFileFullPath = path.join(passon.basePath, substFiles[i].base);
                                // check if base file exists in base path
                                if (!fse.existsSync(baseFileFullPath)) {
                                    debug('[%s] Base file does not exist - filename:\n%s', passon.id, substFiles[i].base);
                                    let err = new Error();
                                    cleanup(passon);
                                    err.status = 400;
                                    err.msg = 'base file does not exist';
                                    reject(err);
                                } else {
                                    debug('[%s] base file %s exists at %s', passon.id, substFiles[i].base, baseFileFullPath);
                                }
                            } // end if - does overlay file exist?
                        } // end if - does base file exist?
                    } catch (err) {
                        debug('[%s] Error copying base files to directory of new compendium: %s', passon.id, err);
                        cleanup(passon);
                        err.status = 400;
                        err.msg = 'could not copy base files - base path does not exist';
                        reject(err);
                    }
                }
            } // end for
        } else {
            debug('[%s] Error copying overlay files to directory of new compendium.', passon.id);
            cleanup(passon);
            let err = new Error();
            err.status = 400;
            err.msg = 'substitution files missing';
            reject(err);
        } // end if - does substitutionFiles array exist
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
        debug('[%s] Running copy overlay files [%s] time(s) ...', passon.id, substFiles.length);
        try {
            for (var i = 0; i <= substFiles.length; i++) {
                if (i == substFiles.length) {
                    // execute only if the last file is mounted
                    debug('[%s] Finished copy overlay files.\n', passon.id);
                    fulfill(passon);
                } else {
                    overlayFileSource = path.join(passon.overlayPath, substFiles[i].overlay);
                    overlayFileDestination = path.join(passon.substitutedPath, path.basename(overlayFileSource)); // always copy overlay files to the base directory

                    try {
                        if (fse.existsSync(overlayFileDestination)) {
                            prefixedFileName = config.substitutionFilePrepend + path.basename(overlayFileDestination);
                            prefixedOverlayFileDestination = path.join(passon.substitutedPath, prefixedFileName);

                            // add prefix until the destination file name does not exist
                            while (fse.existsSync(prefixedOverlayFileDestination)) {
                                prefixedFileName = config.substitutionFilePrepend + prefixedFileName;
                                prefixedOverlayFileDestination = path.join(passon.substitutedPath, prefixedFileName);
                            }
                            fse.copySync(overlayFileSource, prefixedOverlayFileDestination);
                            substFiles[i].filename = prefixedFileName; // update substitution metadata
                            debug('[%s] copied file #%s: %s to %s', passon.id, (i + 1), overlayFileSource, prefixedOverlayFileDestination);
                        } else {
                            fse.copySync(overlayFileSource, overlayFileDestination);
                            substFiles[i].filename = path.basename(overlayFileDestination);
                            debug('[%s] copied file #%s: %s to %s', passon.id, (i + 1), overlayFileSource, overlayFileDestination);
                        }
                    } catch (err) {
                        debug('[%s] Error copying overlay files to directory of new compendium: %s', passon.id, err);
                        cleanup(passon);
                        err.status = 400;
                        err.msg = 'overlay file does not exist';
                        reject(err);
                    }
                } // end copying files
            } // end for
        } catch (err) {
            debug('[%s] Error copying overlay files to directory of new compendium : %s', passon.id, err);
            cleanup(passon);
            err.status = 400;
            err.msg = 'overlay file does not exist';
            reject(err);
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
            metadata: metadataToSave,
            bag: config.meta.bag,
            candidate: config.meta.candidate,
            compendium: config.meta.compendium
        });

        compendium.save(error => {
            if (error) {
                debug('[%s] ERROR saving new compendium for user: %s', passon.id, passon.user);
                cleanup(passon);
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
 * function to start docker container
 * @param {object} passon - compendium id and data of compendia
 */
function createVolumeBinds(passon) {
    return new Promise((fulfill, reject) => {
        try {
            debug('[%s] Starting creating volume binds ...', passon.id);
            passon.imageTag = config.docker.imageNamePrefix + passon.id;
            if (!passon.imageTag) {
                debug('[%s] image tag was not passed.');
                cleanup(passon);
                reject(new Error('image tag was not passed on!'));
            }

            debug('[%s] Starting creating volume binds with image [%s] ...', passon.id, passon.imageTag);
            let substFiles = passon.metadata.substitution.substitutionFiles;
            // data folder for erc.yaml
            let baseBind = passon.substitutedPath + ":" + "/erc";
            // for erc.yml
            let cmdBinds = new Array();
            let cmdBaseBind = "-v " + baseBind;
            cmdBinds.push(cmdBaseBind);
            for (let i = 0; i < substFiles.length; i++) {

                let baseFileName = substFiles[i].base;
                if (passon.bag) {
                    let splitCompBag = baseFileName.indexOf("/") + 1;    // split after ".../ERC_ID/data/" to get only filenamePath of basefile
                    baseFileName = baseFileName.substring(splitCompBag);
                }

                if (filenameNotExists(substFiles[i].filename)) {
                  reject(new Error('substitution filename has not been passed correctly.'));
                }

                let bind = path.join(passon.substitutedPath, substFiles[i].filename) + ":" + path.join("/erc", baseFileName) + ":ro";
                let cmdBind = "-v " + bind;
                cmdBinds.push(cmdBind);
            }
            passon.yaml = {};
            passon.yaml.binds = cmdBinds;
            if (!passon.yaml.binds) {
                debug('[%s] volume binds were not passed.');
                cleanup(passon);
                reject(new Error('volume binds were not passed!'));
            } else {
                debug('Finished creating volume binds with binds: \n%s', JSON.stringify(passon.yaml.binds));
                fulfill(passon);
            }
        } catch (err) {
            debug('[%s] Error during creating volume binds with err:\n%s', passon.id, err);
            cleanup(passon);
            reject(new Error('volume binds were not passed!'));
        }
    });
}

/**
 * function for cleanup after error is detected
 * @param {object} passon - compendium id and data of compendia
 */
function cleanup(passon) {
    debug('[%s] Cleaning up ...', passon.id);
    try {
        debug('[%s] Cleanup running ...', passon.id);
        let cleanupPath = passon.substitutedPath;
        fse.removeSync(cleanupPath);
        debug('[%s] Finished cleanup.', passon.id);
    } catch (err) {
        debug('[%s] Cleanup not successful: %s', passon.id, err);
    }
};

/**
 * function to read erc.yml and overwrite with execution command for "docker run"
 * @param {object} passon - compendium id and data of compendia
 */
function updateCompendiumConfiguration(passon) {
    return new Promise((fulfill, reject) => {
        debug('[%s] Starting write yaml ...', passon.id);
        let yamlPath = path.join(passon.substitutedPath, 'erc.yml');
        // check if erc.yml exists
        if (fse.existsSync(yamlPath)) {
            try {
                let dockerCmd = config.docker.cmd;
                let yamlBinds = passon.yaml.binds;
                for (let i = 0; i < yamlBinds.length; i++) {
                    dockerCmd = dockerCmd + " " + passon.yaml.binds[i];
                }
                let doc = yaml.safeLoad(fse.readFileSync(yamlPath, 'utf8'));
                debug('[%s] Old erc.yml file: \n %s', passon.id, yaml.dump(doc));
                if (!doc.execution) {
                    doc.execution = {};
                }
                doc.execution.cmd = "'" + dockerCmd + " " + passon.imageTag + "'";
                debug('[%s] New erc.yml file: \n %s', passon.id, yaml.dump(doc));
                writeYaml.sync(yamlPath, doc, function (err) {
                    debug("[%s] Error writing erc.yml in: %s \n err: %s", passon.id, yamlPath, err);
                    cleanup(passon);
                    reject("Error writing erc.yml in: %s", yamlPath);
                });
                fulfill(passon);
            } catch (err) {
                debug("[%s] Error writing erc.yml - err: %s", passon.id, err);
                cleanup(passon);
                reject("Error writing erc.yml in: %s", yamlPath);
            }
        } else {
            debug("[%s] missing configuration file (erc.yml) in base compendium, please execute a job for the base compedium first", passon.id);
            cleanup(passon);
            var err = new Error();
            err.status = 400;
            err.msg = 'missing configuration file in base compendium, please execute a job for the base compedium first';
            reject(err);
        }
    })
};

/**
 * function to check if filename exist
 * @param {object} filename - filename
 * @return {boolean} true, if filename does not exist, else false
 */
function filenameNotExists(filename) {
    if (filename == undefined || typeof (filename) != 'string' || filename == '') {
        return true;
    } else {
        return false;
    }
};

module.exports = {
    getMetadata: getMetadata,
    checkOverlayId: checkOverlayId,
    createFolder: createFolder,
    copyBaseFiles: copyBaseFiles,
    copyOverlayFiles: copyOverlayFiles,
    saveToDB: saveToDB,
    createVolumeBinds: createVolumeBinds,
    cleanup: cleanup,
    updateCompendiumConfiguration: updateCompendiumConfiguration
};
