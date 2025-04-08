import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { rimrafSync } from 'rimraf';
import { processFile } from'../lib/css-url-embed.js';

describe('processFile', function() {
	beforeEach(function() {
		const prefix = path.join(os.tmpdir(), 'jasmine-npm-package');
		this.tmpDir = fs.mkdtempSync(prefix);
	});

	afterEach(function() {
		rimrafSync(this.tmpDir);
	})

	it('replaces URLs with their contents', function() {
		const infile = './spec/fixtures/example.css';
		const outfile = path.join(this.tmpDir, 'out.css');

		const result = processFile(infile, outfile);

		expect(result).toEqual(new Set(['./a.png', './b.png']));
		const writtenContents = fs.readFileSync(outfile, {encoding: 'utf8'});
		const expectedContents = fs.readFileSync('spec/fixtures/example-expected.css',
			{encoding: 'utf8'});
		expect(writtenContents).toEqual(expectedContents);
	});

	it('ignores URLs marked with /* noembed */', function() {
		const infile = './spec/fixtures/noembed.css';
		const outfile = path.join(this.tmpDir, 'out.css');

		const result = processFile(infile, outfile);

		expect(result).toEqual(new Set(['./b.png']));
		const writtenContents = fs.readFileSync(outfile, {encoding: 'utf8'});
		const expectedContents = fs.readFileSync('spec/fixtures/noembed-expected.css',
			{encoding: 'utf8'});
		expect(writtenContents).toEqual(expectedContents);
	});

	it('fails if a file is not found', function() {
		const orig = './spec/fixtures/example.css';
		// Moving the file is enough to break the paths in it
		const infile = path.join(this.tmpDir, 'example.css');
		fs.writeFileSync(infile, fs.readFileSync(orig));
		const outfile = path.join(this.tmpDir, 'out.css');

		expect(function() {
			processFile(infile, outfile);
		}).toThrowError('"./a.png" not found on disk');
	});
})
