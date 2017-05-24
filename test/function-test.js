const streamz = require('../streamz');
const Promise = require('bluebird');
const source = require('./lib/source');
const t = require('tap');

const values = [1,2,3,4,5,6,7,8,9];
const sum = (d,m) => d.reduce((p,d)  => p+d * (m ||1),0);

function test(s,m,t,e) {
  s.setMaxListeners(1000);
  return source(values).pipe(s).promise()
    .then(d => t.same(sum(d),sum(values,m || 2),e));
}

t.test('function',{autoend:true,jobs:10}, t => {
  t.test('none',t => {
    return test(streamz(),1,t,'passes through data');
  });

  t.test('pushing',t => {
    const fn = function(d) {
      this.push(d*2);
    };
    return test(streamz(fn),2,t,'processes data');
  });

  t.test('with callback', t => {
    const fn = function(d,cb) {
      setTimeout(() => {
        this.push(d*2);
        cb();
      },10);
    };
    return test(streamz(fn),2,t,'processes data');
  });

  t.test('with promise that pushes', t => {
    const fn = function(d) {
      return Promise.delay(20)
        .then(() => {
          this.push(d*2);
        });
    };
    return test(streamz(fn),2,t,'processes data');
  });

  t.test('with promise that returns', t => {
    const fn = function(d) {
      return Promise.delay(20)
        .then(() => d*2);
    };
    return test(streamz(fn),2,t,'processes data');
  });

  t.test('both pushing and returning', t => {
    const fn = function(d) {
      this.push(d*2);
      return d*2;
    };

    return test(streamz(fn),4,t,'processes data');
  });

  t.test('write after stream ended',t => {
    const s = streamz(function(d) {
      if (d === 8 || d === 9)
        return Promise.delay(10)
          .then(() => {
            this.write(d+2);
          });
      else
        return d;
    });

    return source(values)
      .pipe(s)
      .promise()
      .then(d => t.same(d,[1,2,3,4,5,6,7,10,11]));
  });
    
  t.test('with push, empty callback and return value', t => {
    const fn = function(d,cb) {
      setTimeout(() => {
        this.push(d*2);
        cb();
      },10);
      return d*2;
    };
    return test(streamz(fn),4,t,'processes data');
  });

  t.test('with promise resolving in push and return value', t => {
    const fn = function(d) {
      return Promise.delay(20)
        .then(() => {
          this.push(d*2);
          return d*2;
        });
    };
    return test(streamz(fn),4,t,'processes data');
  });

  t.test('with `fn` defined in options', t => {
    return test(streamz({fn : d => d*2}),2,t,'processes data');
  });

  t.test('.end() called with value', t => {
    const s = streamz();
    s.write(1);
    s.write(2);
    s.end(3);
    return s.promise().then(d => t.same(d,[1,2,3],'is pushed down'));
  });

});