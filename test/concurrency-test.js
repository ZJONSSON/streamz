var streamz = require('../streamz'),
    Promise = require('bluebird'),
    source = require('./lib/source'),
    inspect = require('./lib/inspect'),
    assert = require('assert');


var values = [1,2,3,4,5,6,7,8,9];

function sum(d,m) {
  return d.reduce(function(p,d) {
    return p+d * (m ||1);
  },0);
}

// Simple function that doubles incoming numbers
// and pushes them down after a random delay
function delayDouble(d) {
  // keep track of the maximum number of concurrent functions
  this.maxConcurrent = Math.max(this.maxConcurrent || 0,this._concurrent);
  var self = this;
  return Promise.delay(100+Math.random()*100)
    .then(function() {
      self.push(d*2);
    });
}

describe('concurrency',function() {
  describe('defined as first param',function() {
    it('is run concurrently',function() {
      var s = streamz(5,delayDouble);

      source(values).pipe(s);

      return inspect(s)
        .then(function(d) {
          assert.equal(sum(d),sum(values,2));
          assert.equal(s.maxConcurrent,5);
        });
    });
  });

  describe('defined in options',function() {
    it('is run concurrently',function() {
    var s = streamz(delayDouble,{concurrency:5});

    source(values).pipe(s);
    
    return inspect(s)
      .then(function(d) {
        assert.equal(sum(d),sum(values,2));
        assert.equal(s.maxConcurrent,5);
      });
    });
  });

  describe('legacy: number as options',function() {
    it('is run concurrently',function() {
    var s = streamz(delayDouble,5);

    source(values).pipe(s);
    
    return inspect(s)
      .then(function(d) {
        assert.equal(sum(d),sum(values,2));
        assert.equal(s.maxConcurrent,5);
      });
    });
  });

  describe('larger than length of data',function() {
    it('works',function() {
      var s = streamz(delayDouble,{concurrency:1000});

      source(values).pipe(s);

      return inspect(s)
        .then(function(d) {
          assert.equal(sum(d),sum(values,2));
          assert(s.maxConcurrent > 5,'maxConcurrent more than 5');
        });
    });
  });
});
