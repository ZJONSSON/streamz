var streamz = require('../streamz'),
    Promise = require('bluebird'),
    source = require('./lib/source'),
    inspect = require('./lib/inspect'),
    assert = require('assert');

var values = [1,2,3,4,5,6,7,8,9];

function sum(d,m) {
  return d.reduce(function(p,d) { return p+d * (m ||1);},0);
}

// Simple function that doubles incoming numbers
// and pushes them down after a random delay
function delayDouble(d) {
  // keep track of the maximum number of concurrent functions
  this.maxConcurrent = Math.max(this.maxConcurrent || 0,this._concurrent);
  var self = this;
  return Promise.delay(50+Math.random()*10)
    .then(function() {
      self.push(d*2);
    });
}

describe('multiple pipes',function() {
  it('process data in time',function() {
    this.timeout(10000);

    var s = streamz(3,delayDouble);
    source(values,1).pipe(s);
    source(values,6).pipe(s);    
    setTimeout(function() {
      source(values,4).pipe(s);
    },10);

    return inspect(s)
     .then(function(d) {
        assert.equal(sum(d),sum(values,2)*3);
        assert.equal(s.maxConcurrent,3);
        assert.equal(s._incomingPipes,0);
      });
  });
});