var BASE_URL_REGEX = 'url\\(\\s*?["\']?([^"\'\\(\\)]+?)["\']?\\s*?\\)[};,!\\s]';
var EXCLUSIVE_URL_REGEX = BASE_URL_REGEX + '(?!\\s*?\\/\\*\\s*?noembed\\s*?\\*\\/)';
var EMBEDDABLE_URL_REGEX = /^data:/;
var REMOTE_URL_REGEX = /^(http|https):/;

var fs = require('fs');
var path = require('path');
var mime = require('mime');

var mmmagicMimeType;

try {
	var mmmagic = require('mmmagic');
	mmmagicMimeType = new mmmagic.Magic(mmmagic.MAGIC_MIME_TYPE);
} catch (e) {
}

function embedUrl(url, urlContentInBuffer, mimeType, fileContent) {
	var base64Content = urlContentInBuffer.toString('base64');
	var dataUri = '("data:' + mimeType + ';base64,' + base64Content + '")';
	var escapedUrl = url.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
	var embedUrlRegex = '\\(\\s*?[\'"]?' + escapedUrl + '[\'"]?\\s*?\\)';

	fileContent.content = fileContent.content.replace(
		new RegExp(embedUrlRegex, 'g'), dataUri);
}

function resolveMimeTypeAndEmbedUrl(url, urlContent, fileContent) {
	var urlContentInBuffer = Buffer.from(urlContent);
	embedUrl(url, urlContentInBuffer, mime.getType(url), fileContent);
}

function processUrl(fileContent, url, options, baseDir) {
	if (REMOTE_URL_REGEX.test(url)) {
		throw new Error('Remote URLs are not supported: ' + url);
	}

	var noArgumentUrl = url;

	if (url.indexOf('?') >= 0 || url.indexOf('#') >= 0) {
		noArgumentUrl = url.split('?')[0].split('#')[0];
	}

	var urlFullPath = path.resolve(baseDir + '/' + noArgumentUrl);

	if (!fs.existsSync(urlFullPath)) {
		throw new Error('"' + url + '" not found on disk');
	}

	if (!fs.statSync(urlFullPath).isFile()) {
		throw new Error('"' + urlFullPath + '" is a folder');
	}

	try {
		var urlContent = fs.readFileSync(urlFullPath);
		resolveMimeTypeAndEmbedUrl(url, urlContent, fileContent);
	} catch (e) {
		throw new Error('Failed to embed "' + url + '"', {cause: e});
	}
}

function processFile(fileSrc, fileDest, options) {
	var fileContent = fs.readFileSync(fileSrc, {encoding: 'utf8'});
	var baseDir = path.resolve(
		options.baseDir ? options.baseDir : path.dirname(fileSrc));
	var urlRegex = new RegExp(EXCLUSIVE_URL_REGEX, 'g');
	var allUrls = [];
	var urlMatch;

	while ((urlMatch = urlRegex.exec(fileContent))) {
		allUrls.push(urlMatch[1].trim());
	}

	var embeddableUrls = allUrls.filter(function (url) {
		return !url.match(EMBEDDABLE_URL_REGEX);
	});

	if (embeddableUrls.length === 0) {
		fs.writeFileSync(fileDest, fileContent, {encoding: 'utf8'});
		return;
	}

	var uniqueEmbeddableUrls = new Set(embeddableUrls);
	var fileContentRef = {content: fileContent};

	for (const url of uniqueEmbeddableUrls) {
		processUrl(fileContentRef, url, options, baseDir);
	}

	fs.writeFileSync(fileDest, fileContentRef.content, {encoding: 'utf8'});
	return uniqueEmbeddableUrls;
}

module.exports = {processFile};
