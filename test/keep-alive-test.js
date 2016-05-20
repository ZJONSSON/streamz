var streamz = require('../streamz'),
    Promise = require('bluebird'),
    source = require('./lib/source'),
    inspect = require('./lib/inspect'),
    assert = require('assert');

var values = [1,2,3,4];

function test(s) {
  // Capture any error raised in the main stream
  var error;
  s.on('error',function(e) {
    error = e;
  });

  // First pipe
  source(values,1).pipe(s);

  return Promise.delay(100)
    .then(function() {
      // Second pipe after first one closed
      source(values,1)
        .on('end',s.end.bind(s))
        .pipe(s);
      return Promise.delay(100);
    })
    .then(function() {
      if (error)
        throw error;
      else
        return inspect(s);
    });
}

describe('non-overlapping pipes',function() {
  it('error without keepAlive',function() {
    return test(streamz())
      .then(function() {
        throw 'SHOULD_ERROR';
      },function(e) {
        assert.equal(e.message,'write after end');
      });
  });

  it('works with keepAlive',function() {
    return test(streamz(Number,{keepAlive:true}))
      .then(function(d) {
        assert.deepEqual(d,[1,2,3,4,1,2,3,4]);
      });
  });
});