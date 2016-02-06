var streamz = require('../streamz'),
    assert = require('assert');

var values = [1,2,3,4,5,6,7,8,9];

var valueStream = function() {
  var s = require('stream').PassThrough({objectMode:true});
  values.forEach(function(d,i) {
    setTimeout(function() {
      s.write(d);
      if (i == values.length -1)
        s.end();
    },i*1);
  });
  return s;
};

describe('promise',function() {
  it('concats data and resolves on finish',function() {
    return valueStream()
      .pipe(streamz())
      .pipe(streamz())
      .promise()
      .then(function(d) {
        assert.deepEqual(d,values);
      });
  });

  it('resolves with empty array if no data',function() {
    return valueStream()
      .pipe(streamz())
      .pipe(streamz())
      .pipe(streamz(function() {}))
      .promise()
      .then(function(d) {
        assert.deepEqual(d,[]);
      });
  });
});
