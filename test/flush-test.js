var streamz = require('../streamz'),
    source = require('./lib/source'),
    assert = require('assert');

var values = [1,2,3,4,5,6,7,8,9];

describe('custom flush',function() {
   it('is executed after finish',function() {
    var s = streamz(function(d) {
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
      .then(function(d) {
        assert.deepEqual(d,[values]);
      });
  });

});