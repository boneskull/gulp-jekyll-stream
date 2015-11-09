'use strict';

var childProcess = require('child_process');
var dargs = require('dargs');
var defaults = require('lodash.defaults');
var path = require('path');
var PluginError = require('gulp-util').PluginError;
var fs = require('vinyl-fs');
var pkgName = require('../package.json').name;
var through = require('through2');
var temp = require('temp').track();
var async = require('async');

function pluginError(msg) {
  return new PluginError(pkgName, msg);
}

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
function defaultOptions(options) {
  var cwd;
  options = options || {};
  cwd = options.cwd || process.cwd();

  return defaults(options, {
    bundleExec: false,
    quiet: true,
    cwd: cwd,
    plugins: path.join(cwd, '_plugins/'),
    layouts: path.join(cwd, '_layouts/'),
    clean: true
  });
}

function buildArgs(file, options, done) {
  var includes, jekyllCmd, args = arguments;

  process.nextTick(function build() {
    if (!args.length) {
      done(new Error('buildArgs: Invalid parameters'));
    }

    options = options || {};
    options.source = options.source || file.path || process.cwd();

    includes = [
      'source',
      'destination',
      'plugins',
      'layouts',
      'config'
    ];

    if (options.trace) {
      includes.push('trace');
    }

    if (options.safe) {
      includes.push('safe');
    }

    if(options.bundleExec) {
      bund = ['bundle', 'exec'];
      jekyllCmd = 'jekyll';
    } else {
      bund = [];
      jekyllCmd = /win(32|64)/i.test(process.platform) ? 'jekyll.bat' : 'jekyll';
    }

    done(null, bund
      .concat([jekyllCmd, 'build'])
      .concat(dargs(options, {
        includes: includes
      })), options);
  });
}

function spawn(args, options, done) {
  var proc;
  var errors = '';

  temp.mkdir(pkgName, function(err, dirpath) {
    if (err) {
      return done(new Error(err));
    }
    args.push(dargs({
      destination: dirpath
    }));
    proc = childProcess.spawn(args.shift(), args)
      .on('error', function onError(e) {
        done(new Error(e));
      })
      .on('close', function onClose(code) {
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
    proc.stderr.on('data', function onStderr(data) {
      errors += data;
    });

    if (!options.quiet) {
      proc.stdout.pipe(process.stdout);
    }
  });
}

function jekyll(options) {
  var opts = defaultOptions(options);

  return through.obj(function spawnJekyll(file, enc, done) {
    var push = this.push.bind(this);
    var emit = this.emit.bind(this);

    function streamOutput(src, cb) {
      src.pipe(through.obj(function transform(vfile, encoding, next) {
        push(vfile);
        next();
      }, function flush(next) {
        next();
        cb();
      }));

      if (options.destination) {
        src.pipe(fs.dest(options.destination));
      }
    }

    if (!file.isNull()) {
      emit('error', pluginError('Source must be a directory!'));
      return done();
    }

    async.seq(buildArgs, spawn, streamOutput)(file, opts, function(err) {
      if (err) {
        emit('error', pluginError(err));
      }
      done();
    });
  });
}

module.exports = jekyll;
