var Redis = require('redis-stream'),
    client = new Redis();

//var Readable = require('stream').Readable;
//var Writable = require('stream').Writable;

var get = client.stream('GET');
get.write('test');
console.log(get);

//get.write('my-key');
//var writer = new Writable();

//writer._write = function(chunk, enc, next) {
//  console.log('got data!', chunk, enc);
//  next();
//};
console.log('testing');
//get.pipe(writer);
get.pipe(process.stdout);
//set.write('another value');
