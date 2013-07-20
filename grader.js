#!/usr/bin/env node

/**
 * Automatically grade files for the presence of specified HTML tags/attributes.
 * Uses commander.js and cheerio. Teaches command line application development
 * and basic DOM parsing.
 *
 * References:
 * 
 * + cheerio
 *   - https://github.com/MatthewMueller/cheerio
 *   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
 *   - http://maxogden.com/scraping-with-node.html
 *
 * + commander.js
 *   - https://github.com/visionmedia/commander.js
 *   - http://tjholowaychuk.com/post/9103188408/commander-js-node-js-command-line-interfaces-made-easy
 *
 * + JSON
 *   - http://en.wikipedia.org/wiki/JSON
 *   - https://developer.mozilla.org/en-US/docs/JSON
 *   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
 **/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var crypto = require('crypto');

var HTMLFILE_DEFAULT = 'index.html';
var CHECKSFILE_DEFAULT = 'checks.json';

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if (!fs.existsSync(instr)) {
        console.log('%s does not exist. Exiting.', instr);
        process.exit(1);
    }
    return instr;
}

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile))
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHTMLFile = function(htmlfile, checksfile) {
    $ = cheerioHtmlFile(htmlfile);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for (var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

function checkMain(filename, checkConfig) {
    var checkJSON = checkHTMLFile(filename, checkConfig);
    var outJson = JSON.stringify(checkJSON, null, 4);
    console.log(outJson);
}

if (require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to html file', clone(assertFileExists))
        .option('-u, --url <url>', 'URL to html file')
        .parse(process.argv);

    if (program.url && program.file) {
        console.error('Only one of --file or --url should be provided.');
        return -1;
    }

    if (program.url) {
        var filename = 'grader-' + crypto.randomBytes(4).readUInt32LE(0) + '.tmp';
        rest.get(program.url).on('complete', function(result) {
            if (result instanceof Error) {
                console.error('Error: ' + result.message);
                throw Error
            } else {
                fs.writeFile(filename, result, function(err) {
                    if (err) {
                        console.error('Error: ' + err.toString());
                        throw err;
                    }
                });
                checkMain(filename, program.checks)
                fs.unlink(filename);
            }
        })

    } else if (program.file) {
        checkMain(program.file, program.checks)
    } else {
        console.error('No filename??');
        return -1;
    }
} else {
    exports.checkHTMLFile = checkHTMLFile;
}
