'use strict';

var which = require('which');

if (!which.sync('ruby')) {
  return console.log('WARNING: "ruby" executable not found in PATH!  Ruby is ' +
    'required.');
}

if (!which.sync('jekyll')) {
  return console.log('WARNING: "jekyll" executable not found in PATH!  ' +
    'Jekyll is required.  Try "gem install jekyll"');
}

console.log('INFO: "jekyll" executable found; installation looks good');
