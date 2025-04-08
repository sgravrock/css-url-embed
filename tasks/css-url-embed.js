module.exports = function(grunt) {
  var {processFile} = require('../lib/css-url-embed');

  grunt.registerMultiTask('cssUrlEmbed', "Embed URLs as base64 strings inside your stylesheets", function() {
    var async = this.async();

    var options = this.options({
      failOnMissingUrl: true,
      inclusive: false,
      useMimeTypeSniffing: true
    });

    var existingFiles = this.files.filter(function(file) {
      if (!grunt.file.exists(file.src[0])) {
        return false;
      }

      return true;
    });

    var leftToProcess = existingFiles.length;

    if (leftToProcess === 0) {
      async();
    }

    existingFiles.forEach(function(file) {
      processFile(grunt, file.src[0], file.dest, options, function() {
        if (--leftToProcess === 0) {
          async();
        }
      });
    });
  });
};
