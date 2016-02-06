var streamz = require('../streamz'),
    Promise = require('bluebird'),
    inspect = require('./lib/inspect'),
    source = require('./lib/source'),
    assert = require('assert');

var values = [1,2,3,4,5,6,7,8,9];

function sum(d,m) {
  return d.reduce(function(p,d) { return p+d * (m ||1);},0);
}

function test(s,m) {
  s.setMaxListeners(1000);
  source(values).pipe(s);
    
  return inspect(s)
    .then(function(d) {
      assert.deepEqual(sum(d),sum(values,m || 2));
    });
}

describe('function',function() {
   describe('none',function() {
    it('passes through data',function() {
      return test(streamz(),1);    
    });
  });

  describe('pushing,',function() {
    describe('static',function() {
      it('processes data',function() {
        return test(streamz(function(d) {
          this.push(d*2);
        }));    
      });
    });

    describe('with callback',function() {
      it('processes data',function() {
        return test(streamz(function(d,cb) {
          var self = this;
          setTimeout(function() {
            self.push(d*2);
            cb();
          },10);
        }));
      });
    });

    describe('returning a promise',function() {
      it('processes data',function() {
        return test(streamz(function(d) {
          var self = this;
          return Promise.delay(20)
            .then(function() {
              self.push(d*2);
            });
        }));
      });
    });
  });

  describe('return value,',function() {
    describe('static',function() {
      it('processes data',function() {
        return test(streamz(function(d) {
          return d*2;
        }));    
      });
    });

    describe('with callback',function() {
      it('processes data',function() {
        return test(streamz(function(d,cb) {
          setTimeout(function() {
            cb();
          },10);
          return d*2;
        }));
      });
    });

    describe('returning a promise',function() {
      it('processes data',function() {
        return test(streamz(function(d) {
          return Promise.delay(20)
            .then(function() {
              return d*2;
            });
        }));
      });
    });
  });

  describe('both pushing and returning',function() {
    describe('static',function() {
      it('processes data',function() {
        return test(streamz(function(d) {
          this.push(d*2);
          return d*2;
        }),4);    
      });
    });

    describe('with callback',function() {
      it('processes data',function() {
        return test(streamz(function(d,cb) {
          var self = this;
          setTimeout(function() {
            self.push(d*2);
            cb();
          },10);
          return d*2;
        }),4);
      });
    });

    describe('returning a promise',function() {
      it('processes data',function() {
        return test(streamz(function(d) {
          var self = this;
          return Promise.delay(20)
            .then(function() {
              self.push(d*2);
              return d*2;
            });
        }),4);
      });
    });
  });

  describe('async without cb or promise',function() {
    it('fails to capture the data',function() {
      return test(streamz(function(d) {
        var self = this;
        setTimeout(function() {
          self.push(d*2);
        },10);
        // Capture the inevitable stream.push() after EOF
        self.on('error',Object);
      }))
      .then(function() {
        throw 'Should Error';
      },Object);
    });
  });

});