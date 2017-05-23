const streamz = require('../streamz');
const Promise = require('bluebird');
const t = require('tap');

// Simulate a connection pool
function getPool(poolSize,queryDelay) {
  return {
    queue : [],
    
    available : poolSize,
    
    getConnection : function() {

      const next = () => {
        if (this.available && this.queue.length) {
          this.available--;
          this.queue.shift().resolve();
        }
      };

      const release = () => {
        this.available++;
        next();
      };
    
      const defer = Promise.defer();
      this.queue.push(defer);

      next();

      return defer.promise
        .then(() => ({
          query : Promise.delay(queryDelay),
          release : release
        }));
    }
  };
}

t.test('callback and promise',t => {
  const poolSize = 10;
  const items = 50;
  const queryDelay = 100;

 
  const input = streamz();
  const end = streamz();
  const pool = getPool(poolSize,queryDelay);

  let i = items;
  while(i--)
    input.write(i);
  input.end();

  let concurrent = 0;
  let maxConcurrent = 0;

  const main = streamz(function(d,cb) {
    maxConcurrent = Math.max(maxConcurrent,concurrent++);
    return pool.getConnection()
      .then(connection => {
        cb(null,'callback'); // signal we have received connection
        return connection.query
          .then(() => {
            concurrent--;
            connection.release();
            this.push('manual');
            return 'promise';
          });
      });
  });

  return input
    .pipe(main)
    .pipe(end)
    .promise()
    .then(d => {
      t.same(maxConcurrent,poolSize,'max concurrency controlled by callbacks');
      ['promise','callback','manual'].forEach(key => {
        const count = d.filter(d => d === key).length;
        t.same(count,items,`${key} values pushed`);
      });
    });
});
