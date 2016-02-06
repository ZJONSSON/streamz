var streamz = require('../streamz'),
    Promise = require('bluebird'),
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

describe('error propagation',function() {

 it('handled by next handler',function() {
  var max,err;

  valueStream()
    .pipe(streamz(function(d) {        
      if (d == 5) return Promise.reject('EXCEPTION');
      else return d;
    }))
    .pipe(streamz(function(d) {
      max = d;
    }))
    .pipe(streamz())
    .pipe(streamz())
    .on('error',function(e) {
      err = e;
    })
    .pipe(streamz())
    .on('error',function() {
      err = 'should not be picked up here';
    });
  
    return Promise.delay(200)
      .then(function() {
        assert.equal(err,'EXCEPTION');
        assert.equal(max,4);
    });
  });


  it('handled by promise rejection',function() {
    var max,err;

    return valueStream()
      .pipe(streamz(function(d) {        
        if (d == 5) return Promise.reject('EXCEPTION');
        else return Promise.resolve(d);
      }))
      .pipe(streamz(function(d) {
        max = d;
      }))
      .pipe(streamz())
      .pipe(streamz())
      .promise()
      .catch(function(e) {
        err = e;
      })  
      .then(function() {
        assert.equal(err,'EXCEPTION');
        assert.equal(max,4);
      });
  });
});
