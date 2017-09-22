# o2r-substituter

Node.js implementation to load compendia from third party repositories and handle direct user uploads for the [o2r web api](http://o2r.info/o2r-web-api).

Currently, it implements the endpoint `/api/v1/substitution`.

## Features

- ...

## Requirements

Requirements:

- Node.js `>= 6.2`
- npm

## Configuration

The configuration can be done via environment variables.

- `SUBSTITUTER_PORT`
  Define on which port substituter should listen. Defaults to `8089`.
- `SUBSTITUTER_MONGODB` __Required__
  Location for the MongoDB. Defaults to `mongodb://localhost/`. You will very likely need to change this.
- `SUBSTITUTER_MONGODB_DATABASE`
  Which database inside the mongo db should be used. Defaults to `muncher`.
- `SUBSTITUTER_BASEPATH`
  The local path where compendia are stored. Defaults to `/tmp/o2r/`.
- `SESSION_SECRET`
  String used to sign the session ID cookie, must match other microservices.

## Development & Testing

```bash
npm install

# manually start mongodb, o2r-loader, and o2r-muncher
npm start

npm test
```

## Dockerfile

The file `Dockerfile` is the basis for the Docker image published at [Docker Hub](https://hub.docker.com/r/o2rproject/o2r-substituter/).

## License

o2r-substituter is licensed under Apache License, Version 2.0, see file LICENSE.

Copyright (C) 2017 - o2r project.
