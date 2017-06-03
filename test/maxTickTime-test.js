const streamz = require('../streamz');
const Promise = require('bluebird');
const t = require('tap');

const values = [1,2,3,4,5,6,7,8,9];

function valueStream() {
  const s = streamz();
  [...Array(100)].forEach( (d,i) => s.push(i));
  s.end();
  return s;
  
}

t.test('maxTickTime',{autoend:true}, t => {
  t.test('with maxTickTime and event-loop blocking',t => {
    let maxConcurrent = 0;
    const transform = streamz(d => {
      const time  = process.hrtime();
      while (process.hrtime(time)[1] < 1000000*3) {/**/}
      maxConcurrent = Math.max(maxConcurrent || 0,transform._concurrent);
      return Promise.delay(50,d);
    },{
      maxTickTime:1,
      concurrency: 100
    });

    return valueStream()
      .pipe(transform)
      .promise()
      .then( () => t.same(maxConcurrent,2,'Max concurrent never exceeds 2'));
  });

  t.test('with zero maxTickTime and event-loop blocking',t => {
    let maxConcurrent = 0;
    const transform = streamz(d => {
      const time  = process.hrtime();
      while (process.hrtime(time)[1] < 1000000*3) {/**/}
      maxConcurrent = Math.max(maxConcurrent || 0,transform._concurrent);
      return Promise.delay(50,d);
    },{
      maxTickTime: 10000,
      concurrency: 100
    });

    return valueStream()
      .pipe(transform)
      .promise()
      .then( () => t.same(maxConcurrent,9,'Max concurrent goes to 9'));
  });

});
