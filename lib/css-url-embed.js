const BASE_URL_REGEX = 'url\\(\\s*?["\']?([^"\'\\(\\)]+?)["\']?\\s*?\\)[};,!\\s]';
const EXCLUSIVE_URL_REGEX = BASE_URL_REGEX + '(?!\\s*?\\/\\*\\s*?noembed\\s*?\\*\\/)';
const EMBEDDABLE_URL_REGEX = /^data:/;
const REMOTE_URL_REGEX = /^(http|https):/;

const fs = require('fs');
const path = require('path');
const mime = require('mime');

function embedUrl(url, urlContentInBuffer, mimeType, fileContent) {
	var base64Content = urlContentInBuffer.toString('base64');
	var dataUri = '("data:' + mimeType + ';base64,' + base64Content + '")';
	var escapedUrl = url.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
	var embedUrlRegex = '\\(\\s*?[\'"]?' + escapedUrl + '[\'"]?\\s*?\\)';

	fileContent.content = fileContent.content.replace(
		new RegExp(embedUrlRegex, 'g'), dataUri);
}

function resolveMimeTypeAndEmbedUrl(url, urlContent, fileContent) {
	const urlContentInBuffer = Buffer.from(urlContent);
	embedUrl(url, urlContentInBuffer, mime.getType(url), fileContent);
}

function processUrl(fileContent, url, options, baseDir) {
	if (REMOTE_URL_REGEX.test(url)) {
		throw new Error('Remote URLs are not supported: ' + url);
	}

	let noArgumentUrl = url;

	if (url.indexOf('?') >= 0 || url.indexOf('#') >= 0) {
		noArgumentUrl = url.split('?')[0].split('#')[0];
	}

	const urlFullPath = path.resolve(baseDir + '/' + noArgumentUrl);

	if (!fs.existsSync(urlFullPath)) {
		throw new Error('"' + url + '" not found on disk');
	}

	if (!fs.statSync(urlFullPath).isFile()) {
		throw new Error('"' + urlFullPath + '" is a folder');
	}

	try {
		const urlContent = fs.readFileSync(urlFullPath);
		resolveMimeTypeAndEmbedUrl(url, urlContent, fileContent);
	} catch (e) {
		throw new Error('Failed to embed "' + url + '"', {cause: e});
	}
}

function processFile(fileSrc, fileDest, options) {
	const fileContent = fs.readFileSync(fileSrc, {encoding: 'utf8'});
	const baseDir = path.resolve(
		options.baseDir ? options.baseDir : path.dirname(fileSrc));
	const urlRegex = new RegExp(EXCLUSIVE_URL_REGEX, 'g');
	const allUrls = [];
	let urlMatch;

	while ((urlMatch = urlRegex.exec(fileContent))) {
		allUrls.push(urlMatch[1].trim());
	}

	const embeddableUrls = allUrls.filter(function (url) {
		return !url.match(EMBEDDABLE_URL_REGEX);
	});

	if (embeddableUrls.length === 0) {
		fs.writeFileSync(fileDest, fileContent, {encoding: 'utf8'});
		return;
	}

	const uniqueEmbeddableUrls = new Set(embeddableUrls);
	const fileContentRef = {content: fileContent};

	for (const url of uniqueEmbeddableUrls) {
		processUrl(fileContentRef, url, options, baseDir);
	}

	fs.writeFileSync(fileDest, fileContentRef.content, {encoding: 'utf8'});
	return uniqueEmbeddableUrls;
}

module.exports = {processFile};
