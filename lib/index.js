'use strict';

const crossSpawn = require('cross-spawn');
const dargs = require('dargs');
const defaults = require('lodash.defaults');
const path = require('path');
const PluginError = require('gulp-util').PluginError;
const fs = require('vinyl-fs');
const pkgName = require('../package.json').name;
const through = require('through2');
const tmp = require('tmp');
const async = require('async');

const pluginError = msg => new PluginError(pkgName, msg);

const JEKYLL = 'jekyll';

/**
 * Given `{Object}` `options`, apply default settings.
 * @param {Object} [options] Options object
 * @parma {string} [options.source] Source directory
 * @param {string} [options.layouts='_layouts'] Layouts directory
 * @param {string} [options.cwd=process.cwd()] Other specified directories are
 *   relative to this
 * @param {(Array|string)} [options.plugins='_plugins'] Plugins directory or
 *   directories
 * @param {boolean} [options.bundleExec=false] Run with `bundle exec`
 * @param {boolean} [options.quiet=true] Quiet mode.  If `true`, implies
 *   `--trace`
 * @param {boolean} [options.safe=false] Run Jekyll in "safe" mode
 * @returns {Object} `options` with defaults applied
 */
const defaultOptions = (options = {}) => {
  let cwd;
  cwd = options.cwd || process.cwd();

  return defaults(options, {
    bundleExec: false,
    quiet: true,
    cwd: cwd,
    plugins: path.join(cwd, '_plugins'),
    layouts: path.join(cwd, '_layouts'),
    clean: true
  });
};

const buildArgs = (file, options, done) => {
  let bund;
  const args = arguments;

  process.nextTick(() => {
    if (!args.length) {
      return done(new Error('buildArgs: Invalid parameters'));
    }

    options.source = options.source || file.path || process.cwd();

    bund =
      options.bundleExec
        ? [
          'bundle',
          'exec'
        ]
        : [];

    done(null, bund.concat([
      JEKYLL,
      'build'
    ])
      .concat(dargs(options, {
        excludes: ['bundleExec']
      })), options);
  });
};

const spawn = (args, options, done) => {
  let proc;
  let errors = '';

  tmp.dir({name: `${pkgName}-temp`}, (err, dirpath) => {
    if (err) {
      return done(new Error(err));
    }

    args.push(dargs({
      destination: dirpath
    }));

    proc = crossSpawn(args.shift(), args)
      .on('error', e => {
        done(new Error(e));
      })
      .on('close', code => {
        if (code === 127) {
          return done(new Error('You need to have Ruby and Jekyll installed ' +
            'and in your PATH for this task to work.\n' +
            'See http://jekyllrb.com/docs/installation/'));
        }

        if (errors) {
          return done(new Error(errors));
        }

        if (code) {
          return done(new Error('Jekyll exited with error code ' + code));
        }

        done(null, fs.src(path.join(dirpath, '**', '*')));
      });

    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', data => {
      errors += data;
    });

    if (!options.quiet) {
      proc.stdout.pipe(process.stdout);
    }
  });
};

function jekyll (options) {
  const opts = defaultOptions(options);

  return through.obj(function (file, enc, done) {
    const streamOutput = (src, cb) => {
      src.pipe(through.obj((vfile, encoding, next) => {
        this.push(vfile);
        next();
      }, function flush (next) {
        next();
        cb();
      }));

      if (options.destination) {
        src.pipe(fs.dest(options.destination));
      }
    };

    if (!file.isNull()) {
      this.emit('error', pluginError('Source must be a directory!'));
      return done();
    }

    async.seq(buildArgs, spawn, streamOutput)(file, opts, err => {
      if (err) {
        this.emit('error', pluginError(err));
      }
      done();
    });
  });
}

module.exports = jekyll;
