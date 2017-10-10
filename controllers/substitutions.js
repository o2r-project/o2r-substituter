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
const debug = require('debug')('substituter-compendium');
const exec = require('child_process').exec;

var Compendium = require('../lib/model/compendium');

exports.view = (req, res) => {
  var answer = {};
  var filter = {};
  filter[config.meta.substituted] = true;
  var limit = parseInt(req.query.limit || config.list_limit, 10);
  var start = parseInt(req.query.start || 1, 10) - 1;

  if (req.query.base != null) {
      filter[config.meta.base] = req.query.base;
  }
  if (req.query.overlay != null) {
      filter[config.meta.overlay] = req.query.overlay;
  }

  Compendium.find(filter).select('id').skip(start).limit(limit).exec((err, comps) => {
    if (err) {
      res.status(500).send({ error: 'query failed' });
    } else {
      var count = comps.length;
      if (count <= 0) {
        debug('No compendium found.');
        res.status(404).send({ error: 'no compendium found' });
      } else {
        debug('Found %s results', count);

        answer.results = comps.map(comp => {
          return comp.id;
        });
        res.status(200).send(answer);
      }
    }
  });
};
