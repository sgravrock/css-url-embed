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

			try {
				grunt.log.subhead('Processing source file "' + file.src[0] + '"');
				const urls = processFile(file.src[0], file.dest, options);

				for (const url of urls) {
					grunt.log.ok('"' + url + '" embedded');
				}

				grunt.log.writeln('File "' + file.dest + '" created');
			} catch (e) {
				grunt.log.error(e);
				grunt.fail.warn('URL embedding failed\n');
			}
		}
	});
};
