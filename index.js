var ws = require('ws');
var express = require('express');
var pty = require('pty.js');
var app = express();
var server = require('http').createServer(app);
var wsServer = new ws.Server({
	server: server,
	path: '/ws'
});

var net = require('net');
var controlSock = new net.Socket({
	fd: 3, readable: true, writable: true
});
controlSock.on('error', function(){});

app.use(express.static(__dirname + '/public'));

wsServer.on('connection', function(sock) {
	var term = null;
	sock.on('message', function(message) {
		message = JSON.parse(message);
		if (message.init) {
			term = pty.spawn(
				process.env.SHELL ? process.env.SHELL : '/bin/sh', [], {
				name: message.type,
				rows: message.rows,
				cols: message.cols,
				cwd: process.env.HOME,
				env: process.env
			});
			term.on('data', function(data) {
				sock.send(JSON.stringify({ data: data }));
			});
		}
		if (message.resize) {
			term.resize(message.resize.cols, message.resize.rows);
		}
		if (message.data) {
			term.write(message.data);
		}
	});

	sock.on('close', function(){
		if (!term) { return; }
		term.end();
	});
});

server.listen(0, '127.0.0.1', function() {
	controlSock.write(JSON.stringify({
		proxy: this.address().port
	}));
	controlSock.write('\n');
});

