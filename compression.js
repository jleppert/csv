var express = require('express');

var WebSocketServer = require('ws').Server;
var    wss             = new WebSocketServer({ port: 8082, perMessageDeflate: false });


var app = express();
app.use(express.static(__dirname + '/public')); 
app.listen(8080, '0.0.0.0');

wss.on('connection', function(ws) {
  ws.send('testing 12345');
  console.log('Got websocket connection from a client');
});
