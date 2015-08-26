'use strict';

var gutil = require('gulp-util');
var map = require('map-stream');
var spawn = require('win-spawn');
var dargs = require('dargs');

module.exports = function jekyll(options) {
  var passedArgs = dargs(options || {}, ['bundleExec']);
  var jekyllArgs = (options.bundleExec ? ['bundle', 'exec'] : [])
    .concat('jekyll', 'build')
    .concat(passedArgs);

  return map(function spawnJekyll(file, cb) {
    var errors = '';
    var proc;

    if (file.isStream()) {
      return cb(new gutil.PluginError('gulp-jekyll',
        'Streaming not supported'));
    }

    proc = spawn(jekyllArgs.shift(), jekyllArgs)
      .on('error', function onError(err) {
        return cb(new gutil.PluginError('gulp-jekyll', err));
      })
      .on('close', function onClose(code) {
        if (code === 127) {
          return cb(new gutil.PluginError('gulp-jekyll',
            'You need to have Ruby and Jekyll installed and in your PATH for ' +
            'this task to work. See http://jekyllrb.com/docs/installation/'));
        }

        if (errors) {
          return cb(new gutil.PluginError('gulp-jekyll',
            '\n' +
            errors.replace('Use --trace for backtrace.\n', '')));
        }

        if (code > 0) {
          return cb(new gutil.PluginError('gulp-jekyll',
            'Exited with error code ' + code));
        }

        cb(null, file);
      });

    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', function onData(data) {
      errors += data;
    });
  });
};
