'use strict';

var which = require('which');

try {
  which.sync('ruby');
} catch (ignored) {
  return console.log('WARNING: "ruby" executable not found in PATH!  Ruby is ' +
    'required.');
}

try {
  which.sync('jekyll');
} catch (ignored) {
  return console.log('WARNING: "jekyll" executable not found in PATH!  ' +
    'Jekyll is required.  Try "gem install jekyll"');
}

console.log('INFO: "jekyll" executable found; installation looks good');
