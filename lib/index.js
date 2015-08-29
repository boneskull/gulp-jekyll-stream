'use strict';

var childProcess = require('child_process');
var dargs = require('dargs');
var defaults = require('lodash.defaults');
var path = require('path');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var fs = require('vinyl-fs');
var pkgName = require('../package.json').name;
var through = require('through2');

function defaultOptions(options) {
  var cwd;
  options = options || {};
  cwd = options.cwd || process.cwd();

  return defaults(options, {
    bundleExec: false,
    quiet: true,
    source: cwd,
    destination: path.join(cwd, '_site/'),
    plugins: path.join(cwd, '_plugins/'),
    layouts: path.join(cwd, '_layouts/')
  });
}

function buildArgs(file, options) {
  var includes;

  if (!arguments.length) {
    throw new Error('Invalid parameters');
  }

  options = options || {};
  options.source = file.path;

  includes = [
    'source',
    'destination',
    'plugins',
    'layouts'
  ];

  if (options.trace) {
    includes.push('trace');
  }

  if (options.safe) {
    includes.push('safe');
  }

  return (options.bundleExec ? ['bundle', 'exec'] : [])
    .concat(['jekyll', 'build'])
    .concat(dargs(options, {
      includes: includes
    }));
}

function spawn(args, options, done) {
  var proc;
  var errors = '';

  if (!args.length) {
    return done(new Error('Invalid parameters'));
  }

  if (typeof options === 'function') {
    done = options;
    options = {};
  }

  options = options || {};

  proc = childProcess.spawn(args.shift(), args)
    .on('error', function onError(err) {
      done(new PluginError(pkgName, err));
    })
    .on('close', function onClose(code) {
      if (code === 127) {
        return done(new PluginError(pkgName,
          'You need to have Ruby and Jekyll installed and in your PATH for ' +
          'this task to work. See http://jekyllrb.com/docs/installation/'));
      }

      if (errors) {
        return done(new PluginError(pkgName,
          '\n' +
          errors.replace('Use --trace for backtrace.\n', '')));
      }

      if (code) {
        return done(new PluginError(pkgName, 'Exited with error code ' + code));
      }

      done(null, fs.src(path.join(options.destination, '**', '*'), {
        cwd: options.cwd,
        base: options.destination
      }));
    });

  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', function onStderr(data) {
    errors += data;
  });

  if (!options.quiet) {
    proc.stdout.pipe(process.stdout);
  }
}

function jekyll(options) {
  var opts = defaultOptions(options);

  return through.obj(function spawnJekyll(file, enc, done) {
    var args;

    if (!file.isNull()) {
      return done(new PluginError(pkgName, 'Source must be directory'));
    }

    args = buildArgs(file, opts);
    spawn(args, opts, done);
  });
}

module.exports = jekyll;
