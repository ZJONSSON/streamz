const Streamz = require('../streamz');
const Promise = require('bluebird');
const source = require('./lib/source');
const t = require('tap');

class StreamzChecker extends Streamz {
  constructor(fn, options) {
    super(fn,options);
    this.maxConcurrent = 0;
    this.startConcurrent = 0;
  }
}

const values =  [...Array(20)].map( (d,i) => i);
const sum = (d,m) => d.reduce((p,d)  => p+d * (m ||1),0);

// Simple function that doubles incoming numbers
// and pushes them down after a random delay
function delayDouble(d) {
  // keep track of the maximum number of concurrent functions
  this.maxConcurrent = Math.max(this.maxConcurrent || 0,this._concurrent);
  if (d==14) this.startConcurrent = this._concurrent;
  return Promise.delay(d !== 15 ? d*10 : 300)  // Make number 15 extra long
    .then(() => {
      this.push(d*2);
    });
}

t.test('concurrency',{autoend: true, jobs: 10}, t => {
  t.test('new Streamz(5,fn)',t => {
    const s = new StreamzChecker(delayDouble, {concurrency: 5});

    return source(values)
      .pipe(s)
      .promise()
      .then(d => {
        t.same(sum(d),sum(values,2),'returns correct output');
        t.same(s.maxConcurrent,5,'has max 5 concurrent');
        t.same(s.startConcurrent,5,'starts with 5 concurrent');
      });
  });

  t.test('new Streamz(fn,{concurrency:5})',t => {
    const s = new StreamzChecker(delayDouble,{concurrency:5});

    return source(values)
      .pipe(s)
      .promise()
      .then(d => {
        t.same(sum(d),sum(values,2),'returns correct output');
        t.same(s.maxConcurrent,5,'has max 5 concurrent');
        t.same(s.startConcurrent,5,'starts with 5 concurrent');
      });
  });

  t.test('new Streamz(fn,{concurrency:fn})',t => {
    let concurrency = () => 3;
    const s = new StreamzChecker(delayDouble,{concurrency:concurrency});

    return source(values)
      .pipe(s)
      .promise()
      .then(d => {
        t.same(sum(d),sum(values,2),'returns correct output');
        t.same(s.maxConcurrent,3,'has max 12 concurrent');
        t.same(s.startConcurrent,3,'starts with 12 concurrent');
      });
  });

  t.test('pipe ended stream into new Streamz(fn,{concurrency:5})',t => {
    const s = new StreamzChecker(Object,{concurrency:5});
    s.write({value:true});
    s.end();

    return s.promise()
      .then(d => {
        t.same(d,[{value: true}],'returns correct output');
      });
  });

  t.test('concurrency larger than data',t => {
    const s = new StreamzChecker(delayDouble,{concurrency:1000});
    
    return source(values)
      .pipe(s)
      .promise()
      .then(d => {
        t.same(sum(d),sum(values,2),'correct');
        t.ok(s.maxConcurrent > 5,'maxConcurrent more than 5');
      });
  });
});
