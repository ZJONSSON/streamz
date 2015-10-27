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


describe('error',function() {

  describe('thrown in function',function() {
    it('emits error and stops',function() {
      var max,err;

      valueStream()
        .pipe(streamz(function(d) {
          if (d == 5) throw 'EXCEPTION';
          else return d;  
        }))
        .on('error',function(e) {
          err = e;
        })
        .pipe(streamz(function(d) {
          max = d;
        }));

        return Promise.delay(200)
          .then(function() {
            assert.equal(err,'EXCEPTION');
            assert.equal(max,4);
        });
      });      
  });

  describe('as error callback',function() {
    it('emits error and stops',function() {
      var max,err;

      valueStream()
        .pipe(streamz(function(d,cb) {
          if (d == 5) cb('EXCEPTION');
          else cb(null,d);
        }))
        .on('error',function(e) {
          err = e;
        })
        .pipe(streamz(function(d) {
          max = d;
        }));

        return Promise.delay(200)
          .then(function() {
            assert.equal(err,'EXCEPTION');
            assert.equal(max,4);
        });
      });      
  });

  describe('as promise rejection',function() {
    it('emits error and stops',function() {
      var max,err;

      valueStream()
        .pipe(streamz(function(d) {        
          if (d == 5) return Promise.reject('EXCEPTION');
          else return Promise.resolve(d);
        }))
        .on('error',function(e) {
          err = e;
        })
        .pipe(streamz(function(d) {
          max = d;
        }));

        return Promise.delay(200)
          .then(function() {
            assert.equal(err,'EXCEPTION');
            assert.equal(max,4);
        });
      });      
  });

});