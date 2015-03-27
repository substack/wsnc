#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var http = require('http');
var url = require('url');

var minimist = require('minimist');
var argv = minimist(process.argv.slice(2), {
    alias: { l: 'listen' }
});

if (argv.help || argv._[0] === 'help') return usage(0);

var wsock = require('websocket-stream');
var addr = argv._[0];

if (argv.listen) {
    var server = http.createServer(function (req, res) {
        res.statusCode = 404;
        res.end('not found\n');
    });
    var handle = function (stream) {
        process.stdin.pipe(stream).pipe(process.stdout);
        stream.on('end', function () {
            process.nextTick(function () {
                process.exit(0);
            });
        });
    };
    var wss = wsock.createServer({ server: server }, handle);
    server.listen(argv.listen);
}
else if (addr) {
    var u = url.parse(addr);
    if (!u.protocol) addr = 'ws://' + addr;
    else if (u.protocol === 'http:') {
        u.protocol = 'ws:';
        addr = url.format(u);
    }
    else if (u.protocol === 'https:') {
        u.protocol = 'wss:';
        addr = url.format(u);
    }
    
    process.stdin
        .pipe(wsock(addr))
        .pipe(process.stdout)
    ;
}
else usage(1);

function usage (code) {
    var r = fs.createReadStream(path.join(__dirname, 'usage.txt'));
    r.on('end', function () { if (code) process.exit(code) });
    r.pipe(process.stdout);
}
