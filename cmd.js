#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var url = require('url');
var defined = require('defined');

var minimist = require('minimist');
var argv = minimist(process.argv.slice(2), {
    alias: { l: 'listen', p: 'port', s: 'ssl', v: 'verbose' },
    boolean: [ 'v', 's' ]
});

if (argv.help || argv._[0] === 'help') return usage(0);

var wsock = require('websocket-stream');
var addr = argv._[0];

if (argv.listen !== undefined) {
    var port = defined(
        argv.listen === true ? undefined : argv.listen,
        argv.port,
        0
    );
    var server = null;

    if (argv.ssl) {
      if (argv.verbose) {
        console.log('Listening on [0.0.0.0]: (wss, port %d)', port);
      }
      server = https.createServer({
                 cert: fs.readFileSync('./cert/cert.pem'),
                 key: fs.readFileSync('./cert/key.pem')
               }, function (req, res) {
                 res.statusCode = 404;
                 res.end('not found\n');
               });
    }
    else {
      if (argv.verbose) {
        console.log('Listening on [0.0.0.0] (ws, port %d)', port);
      }
      server = http.createServer(function (req, res) {
                 res.statusCode = 404;
                 res.end('not found\n');
               });
    }

    var handle = function (stream) {
        process.stdin.pipe(stream).pipe(process.stdout);
        stream.on('end', function () {
            process.nextTick(function () {
                process.exit(0);
            });
        });
    };
    var wss = wsock.createServer({ server: server }, handle);
    server.listen(port);
}
else if (addr) {
    var u = url.parse(addr);
    if (!/^\w+:\/\//.test(addr)) {
        addr = 'ws://' + addr;
        u = url.parse(addr);
    }
    else if (u.protocol === 'http:') {
        u.protocol = 'ws:';
        addr = url.format(u);
        u = url.parse(addr);
    }
    else if (u.protocol === 'https:') {
        u.protocol = 'wss:';
        addr = url.format(u);
        u = url.parse(addr);
    }
    if (argv.port !== undefined) {
        u.port = argv.port;
        u.host = u.hostname + ':' + u.port;
        addr = url.format(u);
    }

    var client = wsock(addr);

    if (argv.verbose) {
      client.on('connect', function() {
        console.log('Connection to %s succeeded!', addr);
      });
    }

    process.stdin
        .pipe(client)
        .pipe(process.stdout)
    ;
}
else usage(1);

function usage (code) {
    var r = fs.createReadStream(path.join(__dirname, 'usage.txt'));
    r.on('end', function () { if (code) process.exit(code) });
    r.pipe(process.stdout);
}

// Added for Docker image support (allows control-c to exit)
process.on('SIGINT', function() {
  process.exit();
});
