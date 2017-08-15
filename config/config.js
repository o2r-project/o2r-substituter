/*
 * (C) Copyright 2017 o2r project.
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
var c = {};
c.net = {};
c.mongo = {};
c.fs = {};
c.mount = {};
var env = process.env;

c.api_version = 1;

// network & database
c.net.port = env.SUBSTITUTER_PORT || 8089;
c.mongo.location = env.SUBSTITUTER_MONGODB || 'mongodb://localhost/';
c.mongo.database = env.SUBSTITUTER_MONGODB_DATABASE || 'muncher';
c.mongo.inital_connection_attempts = 30;
c.mongo.inital_connection_max_delay = 5000;
c.mongo.inital_connection_initial_delay = 1000;

// fix mongo location if trailing slash was omitted
if (c.mongo.location[c.mongo.location.length-1] !== '/') {
  c.mongo.location += '/';
}

// fs paths
c.fs.base       = env.SUBSTITUTER_BASEPATH || '/tmp/o2r-dev/'; // '/tmp/o2r/'
c.fs.compendium = c.fs.base + 'compendium/';

// docker commands
c.docker = {};

c.bagtainer = {};
c.bagtainer.docker = {};
// See https://docs.docker.com/engine/reference/commandline/create/ and https://docs.docker.com/engine/reference/api/docker_remote_api_v1.24/#create-a-container
c.bagtainer.docker.create_options = {
  //AttachStderr: true,
  //AttachStdin: false,
  //AttachStdout: true,
  //Cmd: ['bash', '-c', 'cat /etc/resolv.conf'],
  CpuShares: 256,
  //Cpuset: '',
  //Domainname: '',
  //Entrypoint: null,
  Env: ['O2RPLATFORM=true'],
  //Hostname: 'b9ea983254ef',
  Memory: 1073741824, // 1G
  MemorySwap: 2147483648, // double of 1G
  NetworkMode: 'none',
  Rm: true
};
// https://docs.docker.com/engine/reference/api/docker_remote_api_v1.24/#start-a-container
c.bagtainer.docker.start_options = {
};

c.id_length = 6; // length of compendium ids [0-9,a-z,A-Z]

// session secret
c.sessionsecret = env.SESSION_SECRET || 'o2r';

// authentication levels
c.user = {};
c.user.level = {};
c.user.level.substitute = 50;

module.exports = c;
