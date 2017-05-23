const streamz = require('../streamz');
const Promise = require('bluebird');
const source = require('./lib/source');
const t = require('tap');

const values = [1,2,3,4,5,6,7,8,9];

const sum = (d,m) => d.reduce((p,d)  => p+d * (m ||1),0);

// Simple function that doubles incoming numbers
// and pushes them down after a random delay
function delayDouble(d) {
  // keep track of the maximum number of concurrent functions
  this.maxConcurrent = Math.max(this.maxConcurrent || 0,this._concurrent);
  return Promise.delay(50+Math.random()*10)
    .then(() => {
      this.push(d*2);
    });
}

t.test('multiple pipes (3)',t => {
  const s = streamz(3,delayDouble);
  source(values,1).pipe(s);
  source(values,6).pipe(s);    
  setTimeout(() => source(values,4).pipe(s),5);

  return s.pipe(streamz()).promise()
    .then(d => {
      t.same(sum(d),sum(values,2)*3,'sum is correct');
      t.same(s.maxConcurrent,3,'maxConccurent is 3');
      t.same(s._incomingPipes,0,'ending pipes is zero');
      t.end();
    });
});