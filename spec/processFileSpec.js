const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { rimrafSync } = require('rimraf');
const { processFile } = require('../lib/css-url-embed')

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

		await new Promise(function(resolve) {
			processFile(mockGrunt(), infile, outfile, {failOnMissingUrl: true}, resolve);
		});

		const result = fs.readFileSync(outfile, {encoding: 'utf8'});
		const expected = fs.readFileSync('spec/fixtures/example-expected.css',
			{encoding: 'utf8'});
		expect(result).toEqual(expected);
	});

	it('ignores URLs marked with /* noembed */', async function() {
		const infile = './spec/fixtures/noembed.css';
		const outfile = path.join(this.tmpDir, 'out.css');

		await new Promise(function(resolve) {
			processFile(mockGrunt(), infile, outfile, {failOnMissingUrl: true}, resolve);
		});

		const result = fs.readFileSync(outfile, {encoding: 'utf8'});
		const expected = fs.readFileSync('spec/fixtures/noembed-expected.css',
			{encoding: 'utf8'});
		expect(result).toEqual(expected);
	});

	it('fails if a file is not found', async function() {
		const orig = './spec/fixtures/example.css';
		// Moving the file is enough to break the paths in it
		const infile = path.join(this.tmpDir, 'example.css');
		fs.writeFileSync(infile, fs.readFileSync(orig));
		const outfile = path.join(this.tmpDir, 'out.css');

		// Don't fail the spec immediately
		const grunt = mockGrunt();
		grunt.fail.warn.and.callFake(function() {});

		await new Promise(function(resolve) {
			processFile(grunt, infile, outfile, {failOnMissingUrl: true}, resolve);
		});

		expect(grunt.fail.warn).toHaveBeenCalledWith('"./a.png" not found on disk\n');
		expect(grunt.fail.warn).toHaveBeenCalledWith('"./b.png" not found on disk\n');
	});
})

function mockGrunt() {
	const grunt = {
		log: jasmine.createSpyObj('grunt.log',
			['ok', 'error', 'warn', 'writeln', 'subhead']),
		fail: jasmine.createSpyObj('grunt.fail', ['warn']),
		file: jasmine.createSpyObj('grunt.file',
			['exists', 'isFile', 'read', 'write']),
		option: jasmine.createSpy('grunt.option'),
		util: {
			_: jasmine.createSpyObj('grunt.util._', ['uniq']),
		},
	};

	grunt.file.isFile.and.callFake(function(path) {
		return fs.statSync(path).isFile();
	})

	grunt.file.read.and.callFake(function(path) {
		return fs.readFileSync(path, {encoding: 'utf8'});
	});

	grunt.file.write.and.callFake(function(path, contents) {
		return fs.writeFileSync(path, contents, {encoding: 'utf8'});
	});

	grunt.file.exists.and.callFake(function(path) {
		jasmine.debugLog('exists looking for ' + path);
		return fs.existsSync(path);
	});

	grunt.util._.uniq.and.callFake(function(things) {
		return Array.from(new Set(things));
	});

	// processFile doesn't call its callback when there is an error.
	// Make these fail immediately so the spec doesn't just time out
	// with no diagnostic info.
	grunt.log.error.and.callFake(fail);
	grunt.fail.warn.and.callFake(function(msg) {
		fail(`grunt.fail.warn was called with "${msg}"`);
	});

	for (const m of ['ok', 'warn', 'writeln']) {
		grunt.log[m].and.callFake(function (msg) {
			jasmine.debugLog(msg);
		})
	}

	return grunt;
}
