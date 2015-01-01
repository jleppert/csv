var http = require('http');

function convert(y, z) {
  return Math.pow(2, z) - y - 1;
}

var url = require('url');
function getParts(uri) {
  var parts = url.parse(uri).pathname.split('/');

  return {
    id: [parts[1], parts[2]].join('/'),
    z: parts[3],
    x: parts[4],
    y: parts[5] ? parts[5].replace('.png', '') : null
  };
}

var server = http.createServer(function(req, res) {
  var parts = getParts(req.url);

  if(!parts.y) {
    res.end('');
    return;
  }
  
  http.request({
    protocol: 'http:',
    host: 'kespry-files.s3.amazonaws.com',
    path: '/' + [parts.id, parts.z, parts.x, convert(parseInt(parts.y), parseInt(parts.z))].join('/') + '.png',
    port: 80,
    method: 'GET'
  }, function(awsRes) {
    var data = [];
    awsRes.on('data', function(chunk) {
      data.push(chunk);
    });

    awsRes.on('end', function() {
      var buffer = Buffer.concat(data);
      res.writeHead(200, {
        'Content-Length': buffer.length,
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(buffer, 'binary');
    });

    awsRes.on('error', function() {
      console.log('error occured', arguments);
    });
  }).end();

}).listen(8081, function() {
  console.log('Tile proxy started server on port', 8081);
});
