const fs = require('node:fs')
const path = require('node:path');
const os = require('node:os');
const { rimrafSync } = require('rimraf');
const { processFile } = require('../lib/css-url-embed.js');

describe('processFile', function() {
	beforeEach(function() {
		const prefix = path.join(os.tmpdir(), 'jasmine-npm-package');
		this.tmpDir = fs.mkdtempSync(prefix);
	});

	afterEach(function() {
		rimrafSync(this.tmpDir);
	})

	it('replaces URLs with their contents', async function() {
		const infile = './spec/fixtures/example.css';
		const outfile = path.join(this.tmpDir, 'out.css');

		const result = await processFile(infile, outfile);

		expect(result).toEqual(new Set(['./a.png', './b.png']));
		const writtenContents = fs.readFileSync(outfile, {encoding: 'utf8'});
		const expectedContents = fs.readFileSync('spec/fixtures/example-expected.css',
			{encoding: 'utf8'});
		expect(writtenContents).toEqual(expectedContents);
	});

	it('does not modify remote URLs', async function() {
		const infile = './spec/fixtures/remote.css';
		const outfile = path.join(this.tmpDir, 'out.css');

		const result = await processFile(infile, outfile);

		expect(result).toEqual(new Set([]));
		const writtenContents = fs.readFileSync(outfile, {encoding: 'utf8'});
		const expectedContents = fs.readFileSync('spec/fixtures/remote.css',
			{encoding: 'utf8'});
		expect(writtenContents).toEqual(expectedContents);
	});

	it('ignores URLs marked with /* noembed */', async function() {
		const infile = './spec/fixtures/noembed.css';
		const outfile = path.join(this.tmpDir, 'out.css');

		const result = await processFile(infile, outfile);

		expect(result).toEqual(new Set(['./b.png']));
		const writtenContents = fs.readFileSync(outfile, {encoding: 'utf8'});
		const expectedContents = fs.readFileSync('spec/fixtures/noembed-expected.css',
			{encoding: 'utf8'});
		expect(writtenContents).toEqual(expectedContents);
	});

	it('fails if a file is not found', async function() {
		const orig = './spec/fixtures/example.css';
		// Moving the file is enough to break the paths in it
		const infile = path.join(this.tmpDir, 'example.css');
		fs.writeFileSync(infile, fs.readFileSync(orig));
		const outfile = path.join(this.tmpDir, 'out.css');

		await expectAsync(processFile(infile, outfile))
			.toBeRejectedWithError('"./a.png" not found on disk');
	});
})
