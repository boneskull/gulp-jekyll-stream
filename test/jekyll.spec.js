/* eslint-env mocha */

'use strict';

const expect = require('unexpected');
const fs = require('vinyl-fs');
const plugin = require('..');
const path = require('path');

const FIXTURE_PATH = path.join(__dirname, 'fixture');

const TIMEOUT = 3000;

describe('gulp-jekyll-stream', function () {
  it('should generate a site', function (done) {
    this.timeout(TIMEOUT);

    const files = [];
    const src = fs.src(FIXTURE_PATH);

    const stream = plugin()
      .on('data', file => {
        files.push(file);
      })
      .on('end', () => {
        expect(files.length, 'to equal', 13);
        done();
      })
      .on('error', done);

    src.pipe(stream);
  });
});
