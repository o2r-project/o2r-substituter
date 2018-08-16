# o2r-substituter

[![Build Status](https://travis-ci.org/o2r-project/o2r-substituter.svg?branch=master)](https://travis-ci.org/o2r-project/o2r-substituter) [![](https://images.microbadger.com/badges/version/o2rproject/o2r-substituter.svg)](https://microbadger.com/images/o2rproject/o2r-substituter "Get your own version badge on microbadger.com") [![](https://images.microbadger.com/badges/image/o2rproject/o2r-substituter.svg)](https://microbadger.com/images/o2rproject/o2r-substituter "Get your own image badge on microbadger.com")

Node.js implementation to load compendia from third party repositories and handle direct user uploads for the [o2r API](https://o2r.info/api).

Currently, it implements the endpoint `/api/v1/substitution`.

## Requirements

- Node.js `>= 6.2`
- npm

## Configuration

The configuration can be done via environment variables.

- `SUBSTITUTER_PORT`
  Define on which port substituter should listen. Defaults to `8090`.
- `SUBSTITUTER_MONGODB` __Required__
  Location for the MongoDB. Defaults to `mongodb://localhost:27017/`. You will very likely need to change this.
- `SUBSTITUTER_MONGODB_DATABASE`
  Which database inside the mongo db should be used. Defaults to `muncher`.
- `SUBSTITUTER_BASEPATH`
  The local path where compendia are stored. Defaults to `/tmp/o2r/`.
- `SESSION_SECRET`
  String used to sign the session ID cookie, must match other microservices.

## Development & Testing

```bash
npm install

# manually start mongodb, o2r-loader, o2r-muncher, and o2r-transporter
npm start

npm test
```

## Dockerfile

The file `Dockerfile` is the basis for the Docker image published at [Docker Hub](https://hub.docker.com/r/o2rproject/o2r-substituter/).

To build and run locally use the following commands to start other required microservices

```bash
docker build --tag substituter .

docker run --name mongodb -d -p 27017:27017 mongo:3.4
docker run --name testmuncher -d -p 8080:8080 --link mongodb:mongodb -v /tmp/o2r:/tmp/o2r -v /var/run/docker.sock:/var/run/docker.sock -e MUNCHER_MONGODB=mongodb://mongodb:27017 -e DEBUG=* o2rproject/o2r-muncher:latest
docker run --name testloader  -d -p 8088:8088 --link mongodb:mongodb -v /tmp/o2r:/tmp/o2r -v /var/run/docker.sock:/var/run/docker.sock -e LOADER_MONGODB=mongodb://mongodb:27017 -e DEBUG=* loader

docker run --name testsubstituter -it -p 8090:8090 --link mongodb:mongodb -v /tmp/o2r:/tmp/o2r -e SUBSTITUTER_MONGODB=mongodb://mongodb:27017 -e DEBUG=* substituter
```

## License

o2r-substituter is licensed under Apache License, Version 2.0, see file LICENSE.

Copyright (C) 2017 - o2r project.
