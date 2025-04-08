module.exports = function (grunt) {
	var {processFile} = require('../lib/css-url-embed');

	grunt.registerMultiTask('cssUrlEmbed', "Embed URLs as base64 strings inside your stylesheets", function () {
		var options = this.options({
			failOnMissingUrl: true,
			inclusive: false,
			useMimeTypeSniffing: true
		});

		var existingFiles = this.files.filter(function (file) {
			if (!grunt.file.exists(file.src[0])) {
				return false;
			}

			return true;
		});

		for (const file of existingFiles) {
			processFile(grunt, file.src[0], file.dest, options);
		}
	});
};
