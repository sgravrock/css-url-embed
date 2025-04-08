var BASE_URL_REGEX = 'url\\(\\s*?["\']?([^"\'\\(\\)]+?)["\']?\\s*?\\)[};,!\\s]';
var EXCLUSIVE_URL_REGEX = BASE_URL_REGEX + '(?!\\s*?\\/\\*\\s*?noembed\\s*?\\*\\/)';
var INCLUSIVE_URL_REGEX = BASE_URL_REGEX + '\\s*?\\/\\*\\s*?embed\\s*?\\*\\/';
var EMBEDDABLE_URL_REGEX = /^data:/;
var REMOTE_URL_REGEX = /^(http|https):/;

var fs = require('fs');
var path = require('path');
var units = require('node-units');
var mime = require('mime');

var mmmagicMimeType;

try {
	var mmmagic = require('mmmagic');
	mmmagicMimeType = new mmmagic.Magic(mmmagic.MAGIC_MIME_TYPE);
} catch (e) {
}

function isTooBig(size, options) {
	return options.skipUrlsLargerThan &&
		size > units.convert(options.skipUrlsLargerThan + ' to B');
}

function embedUrlAndGoToNext(grunt, url, urlContentInBuffer, mimeType,
		fileContent, nextUrl) {
	var base64Content = urlContentInBuffer.toString('base64');
	var dataUri = '("data:' + mimeType + ';base64,' + base64Content + '")';
	var escapedUrl = url.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
	var embedUrlRegex = '\\(\\s*?[\'"]?' + escapedUrl + '[\'"]?\\s*?\\)';

	fileContent.content = fileContent.content.replace(
		new RegExp(embedUrlRegex, 'g'), dataUri);

	grunt.log.ok('"' + url + '" embedded');

	nextUrl();
}

function resolveMimeTypeEmbedUrlAndGoToNext(grunt, url, urlContent, fileContent,
		nextUrl, options) {
	var urlContentInBuffer = new Buffer(urlContent);

	if (mmmagicMimeType && options.useMimeTypeSniffing) {
		mmmagicMimeType.detect(urlContentInBuffer, function (error, mimeType) {
			if (error) {
				mimeType = 'application/octet-stream';
				grunt.log.warn('Failed to get MIME-type of "' + url +
					'". Defaulting to "' + mimeType + '".');
			}

			embedUrlAndGoToNext(grunt, url, urlContentInBuffer, mimeType,
				fileContent, nextUrl);
		});
	} else {
		embedUrlAndGoToNext(grunt, url, urlContentInBuffer, mime.getType(url),
			fileContent, nextUrl);
	}
}

function processNextUrl(grunt, fileContent, currentUrlIndex, urlArray, options,
		baseDir, isVerbose, finishCallback) {
	if (++currentUrlIndex === urlArray.length) {
		finishCallback();
	} else {
		processUrl(grunt, fileContent, currentUrlIndex, urlArray, options,
			baseDir, isVerbose, finishCallback);
	}
}

function processUrl(grunt, fileContent, currentUrlIndex, urlArray, options,
		baseDir, isVerbose, finishCallback) {
	var url = urlArray[currentUrlIndex];
	var nextUrl = processNextUrl.bind(null, grunt, fileContent, currentUrlIndex,
		urlArray, options, baseDir, isVerbose, finishCallback);

	try {
		if (isVerbose) {
			grunt.log.writeln('\n[ #' + (currentUrlIndex + 1) + ' ]');
		}

		if (REMOTE_URL_REGEX.test(url)) {
			grunt.fail.warn('Remote URLs are not supported: ' + url);
		} else {
			var noArgumentUrl = url;

			if (url.indexOf('?') >= 0 || url.indexOf('#') >= 0) {
				noArgumentUrl = url.split('?')[0].split('#')[0];

				if (isVerbose) {
					grunt.log.writeln('"' + url + '" trimmed to "' +
						noArgumentUrl + '"');
				}
			}

			var urlFullPath = path.resolve(baseDir + '/' + noArgumentUrl);

			if (isVerbose) {
				grunt.log.writeln('"' + url + '" resolved to "' +
					urlFullPath + '"');
			}

			if (!grunt.file.exists(urlFullPath)) {
				var missingUrlMessage = '"' + (isVerbose ? urlFullPath : url) +
					'" not found on disk';

				if (options.failOnMissingUrl) {
					grunt.fail.warn(missingUrlMessage + '\n');
				}

				grunt.log.warn(missingUrlMessage);

				return nextUrl();
			}

			if (!grunt.file.isFile(urlFullPath)) {
				if (isVerbose) {
					grunt.log.warn('"' + urlFullPath + '" is a folder');
				}

				return nextUrl();
			}

			var urlFileSize = fs.statSync(urlFullPath)['size'];

			if (isTooBig(urlFileSize, options)) {
				grunt.log.warn('"' + (isVerbose ? urlFullPath : url) +
					'" is too big');

				return nextUrl();
			}

			var urlContent = fs.readFileSync(urlFullPath);

			resolveMimeTypeEmbedUrlAndGoToNext(grunt, url, urlContent,
				fileContent, nextUrl, options);
		}
	} catch (e) {
		grunt.log.error(e);
		grunt.fail.warn('Failed to embed "' + url + '"\n');
	}
}

function processFile(grunt, fileSrc, fileDest, options, callback) {
	try {
		grunt.log.subhead('Processing source file "' + fileSrc + '"');

		var fileContent = grunt.file.read(fileSrc);
		var isVerbose = grunt.option('verbose');
		var baseDir = path.resolve(
			options.baseDir ? options.baseDir : path.dirname(fileSrc));
		var pattern = options.inclusive ? INCLUSIVE_URL_REGEX : EXCLUSIVE_URL_REGEX;
		var urlRegex = new RegExp(pattern, 'g');
		var allUrls = [];
		var urlMatch;

		while ((urlMatch = urlRegex.exec(fileContent))) {
			allUrls.push(urlMatch[1].trim());
		}

		var embeddableUrls = allUrls.filter(function (url) {
			return !url.match(EMBEDDABLE_URL_REGEX);
		});

		if (embeddableUrls.length === 0) {
			grunt.file.write(fileDest, fileContent);
			grunt.log.writeln('Nothing to embed here!');
			grunt.log.writeln('File "' + fileDest + '" created');
			return callback();
		}

		if (isVerbose) {
			grunt.log.writeln('Using "' + baseDir + '" as base directory for URLs');
		}

		var uniqueEmbeddableUrls = grunt.util._.uniq(embeddableUrls);

		grunt.log.writeln(uniqueEmbeddableUrls.length + ' embeddable URL' +
			(uniqueEmbeddableUrls.length > 1 ? 's' : '') + ' found');

		var fileContentRef = {content: fileContent};

		processUrl(grunt, fileContentRef, 0, uniqueEmbeddableUrls, options,
			baseDir, isVerbose, function () {
				grunt.file.write(fileDest, fileContentRef.content);
				grunt.log.writeln('File "' + fileDest + '" created');
				callback();
			});
	} catch (e) {
		grunt.log.error(e);
		grunt.fail.warn('URL embedding failed\n');
	}
}

module.exports = {processFile};
