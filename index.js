var express         = require('express'),
    compression     = require('compression'),
    Pg              = require('pg').native,
    QueryStream     = require('pg-query-stream'),
    Redis           = require('redis'),
    RedisStream     = require('redis-stream'),
    WebSocketServer = require('ws').Server,
    WebSocketStream = require('websocketstream'), 
    XXHash          = require('xxhash'),
    zlib            = require('zlib'),
    gzip            = zlib.createGzip(),
    JSONStream      = require('JSONStream'), 
    Writable        = require('stream').Writable,
    Readable        = require('stream').Readable;

require('./proxy');
// disable JSON parsing
Pg.types.setTypeParser(114, function(s) { return s; });
var app = express();
app.use(compression());
app.use(express.static(__dirname + '/public', {
  //etag: true,
  //maxAge: (86400 * 365) * 1000
}));
app.listen(8080, '0.0.0.0');

var startPort = 8082,
    servers   = [],
    count     = 3;

Array.apply(null, Array(count)).map(function() { return new WebSocketServer({ port: startPort++ }); }).forEach(function(wss) {
  
  wss.on('connection', function(ws) {
    var redisClient = Redis.createClient({
      return_buffers: true 
    });
    
    ws.extensions['permessage-deflate']._options.compressHook = function(data, fin, cb) {
      var cacheKey = XXHash.hash64(new Buffer(data), 0xCAFEBABE, 'base64');
      redisClient.get(cacheKey, function(err, reply) {
        if(!err && reply) {
          cb(null, reply);
        }
      });
      
      return cacheKey;
    };

    ws.extensions['permessage-deflate']._options.compressedHook = function(cacheKey, compressedData) {
      redisClient.set(cacheKey, compressedData);
    };

    Pg.connect('postgres://postgres:postgres@localhost/corona_development', function(err, pgClient, done) {
      ws.on('message', function(message) {
        var msg = JSON.parse(message);

        console.log('got message', msg);
        switch(msg.resource) {
          case 'customers':
            send('SELECT array_to_json(array_agg(customers)) AS data FROM customers;');
          break;
          
          case 'images':
            // store a copy and listen for changes on pubsub; only send difference
            // methods: text change, json diff patch
            // then monitor objects for changes and re-render views
            send('SELECT array_to_json(array_agg(images)) AS data FROM images;');
          break;
          
          case 'sites':
            send('SELECT array_to_json(array_agg(sites)) AS data FROM sites;');
          break;
          
          case 'markers':
            send('SELECT array_to_json(array_agg(markers)) AS data FROM markers;');
          break;
        }
      });

      ws.on('close', function() {
        redisClient.quit();
      });

      function send(query) {
        pgClient.query(query, function(err, result) {
          ws.send(result.rows[0].data, { compress: true });
          done();
        });
      }
    });
  });
});
