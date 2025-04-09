const BASE_URL_REGEX = 'url\\(\\s*?["\']?([^"\'\\(\\)]+?)["\']?\\s*?\\)[};,!\\s]';
const EXCLUSIVE_URL_REGEX = BASE_URL_REGEX + '(?!\\s*?\\/\\*\\s*?noembed\\s*?\\*\\/)';
const EMBEDDABLE_URL_REGEX = /^data:/;
const REMOTE_URL_REGEX = /^(http|https):/;

const fs = require('node:fs')
const path = require('node:path');

function processFile(fileSrc, fileDest, getMimeType) {
	const fileContent = fs.readFileSync(fileSrc, {encoding: 'utf8'});
	const baseDir = path.resolve(path.dirname(fileSrc));
	const urlRegex = new RegExp(EXCLUSIVE_URL_REGEX, 'g');
	const allUrls = [];
	let urlMatch;

	while ((urlMatch = urlRegex.exec(fileContent))) {
		allUrls.push(urlMatch[1].trim());
	}

	const embeddableUrls = allUrls.filter(function (url) {
		return !url.match(EMBEDDABLE_URL_REGEX) && !url.match(REMOTE_URL_REGEX);
	});

	const uniqueEmbeddableUrls = new Set(embeddableUrls);
	const fileContentRef = {content: fileContent};

	for (const url of uniqueEmbeddableUrls) {
		processUrl(fileContentRef, url, baseDir, getMimeType);
	}

	fs.writeFileSync(fileDest, fileContentRef.content, {encoding: 'utf8'});
	return uniqueEmbeddableUrls;
}

function processUrl(fileContent, url, baseDir, getMimeType) {
	const noArgumentUrl = stripUrlArguments(url);
	const urlFullPath = path.resolve(baseDir + '/' + noArgumentUrl);
	ensureIsFile(urlFullPath, noArgumentUrl);

	try {
		const urlContent = fs.readFileSync(urlFullPath);
		const mimeType = getMimeType(urlFullPath);
		embedUrl(url, urlContent, mimeType, fileContent);
	} catch (e) {
		throw new Error('Failed to embed "' + url + '"', {cause: e});
	}
}

function embedUrl(url, urlContent, mimeType, fileContent) {
	var base64Content = Buffer.from(urlContent).toString('base64');
	var dataUri = '("data:' + mimeType + ';base64,' + base64Content + '")';
	var escapedUrl = url.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
	var embedUrlRegex = '\\(\\s*?[\'"]?' + escapedUrl + '[\'"]?\\s*?\\)';

	fileContent.content = fileContent.content.replace(
		new RegExp(embedUrlRegex, 'g'), dataUri);
}

function stripUrlArguments(url) {
	if (url.indexOf('?') >= 0 || url.indexOf('#') >= 0) {
		return url.split('?')[0].split('#')[0];
	} else {
		return url;
	}
}

function ensureIsFile(path, url) {
	if (!fs.existsSync(path)) {
		throw new Error('"' + url + '" not found on disk');
	}

	if (!fs.statSync(path).isFile()) {
		throw new Error('"' + path + '" is a folder');
	}
}

module.exports = {processFile};
