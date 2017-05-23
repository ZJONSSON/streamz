const streamz = require('../streamz');
const source = require('./lib/source');
const t = require('tap');

const values = [1,2,3,4,5,6,7,8,9];

t.test('custom flush',t => {
  const s = streamz(function(d) {
    // Build a buffer
    this.buffer = this.buffer || [];
    this.buffer.push(d);
  },{
    // Flush the buffer at finish
    flush: function(cb) {
      this.push(this.buffer);
      cb();
    }
  });

  return source(values)
    .pipe(s)
    .promise()
    .then(d => t.same(d,[values],'is executed after finish'));
});