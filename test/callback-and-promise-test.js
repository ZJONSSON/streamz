var streamz = require('../streamz');
var Promise = require('bluebird');
var inspect = require('./lib/inspect');
var assert = require('assert');

// Simulate a connection pool
function getPool(poolSize,queryDelay) {
  return {
    queue : [],
    
    available : poolSize,
    
    getConnection : function() {

      var next = function() {
        if (this.available && this.queue.length) {
          this.available--;
          this.queue.shift().resolve();
        }
      }
      .bind(this);

      var release = function() {
        this.available++;
        next();
      }
      .bind(this);

    
      var defer = Promise.defer();
      this.queue.push(defer);

      next();

      return defer.promise
        .then(function() {
          return {
            query : Promise.delay(queryDelay),
            release : release
          };
        });
    }
  };
}

describe('callback and promise',function() {
  var poolSize = 10,
      items = 50,
      queryDelay = 100;

 
  var input = streamz(),
      end = streamz(),
      pool = getPool(poolSize,queryDelay);

  var i = items;
  while(i--) input.write(i);
  input.end();

  var concurrent = 0,
      maxConcurrent = 0,
      concurrentAtEnd,
      timeAtEnd;

  var main = streamz(function(d,cb) {
    var self = this;
    maxConcurrent = Math.max(maxConcurrent,concurrent++);
    return pool.getConnection()
      .then(function(connection) {      
        cb(null,'callback'); // signal we have received connection
        return connection.query
          .then(function() {
            concurrent--;
            connection.release();
            self.push('manual');
            return 'promise';
          });
      });
  })
  .on('finish',function() { 
    concurrentAtEnd = concurrent;
    timeAtEnd = Number(new Date());
  });

  input
    .pipe(main)
    .pipe(end);

  var done = inspect(end);

  it('maximum concurrency controlled by callbacks',function() {
    return done.then(function() {
      assert.equal(maxConcurrent,poolSize);
    });
  });

  it('concurrency at the end is controlled by callbacks',function() {
    return done.then(function() {
      assert.equal(concurrentAtEnd,poolSize);
    });
  });

  it('next stream only finishes when prev outstanding promises are resolved',function() {
    return done.then(function() {
      assert(Number(new Date())-timeAtEnd > queryDelay,'duration is longer than promise delay');
    });
  });

  it('promise, manual push and callback values were pushed',function() {
    return done.then(function(d) {
      ['promise','callback','manual'].forEach(function(key) { 

        var count = d.filter(function(d) {
          return d == key;
        }).length;

        assert.equal(count,items);
      });
      
    });
  });
});
