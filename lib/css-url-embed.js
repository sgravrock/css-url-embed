const BASE_URL_REGEX = 'url\\(\\s*?["\']?([^"\'\\(\\)]+?)["\']?\\s*?\\)[};,!\\s]';
const EXCLUSIVE_URL_REGEX = BASE_URL_REGEX + '(?!\\s*?\\/\\*\\s*?noembed\\s*?\\*\\/)';
const EMBEDDABLE_URL_REGEX = /^data:/;
const REMOTE_URL_REGEX = /^(http|https):/;

import fs from 'node:fs';
import path from 'node:path';
import mime from 'mime';

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

function processUrl(fileContent, url, baseDir) {
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

export function processFile(fileSrc, fileDest) {
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
		processUrl(fileContentRef, url, baseDir);
	}

	fs.writeFileSync(fileDest, fileContentRef.content, {encoding: 'utf8'});
	return uniqueEmbeddableUrls;
}
