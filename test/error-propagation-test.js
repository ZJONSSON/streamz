const streamz = require('../streamz');
const Promise = require('bluebird');
const valueStream = require('./lib/source');
const t = require('tap');

t.test('error propagation',{autoend:true, jobs: 2}, t => {

  t.test('next handler',t => {
    let max,err;

    valueStream()
      .pipe(streamz(d => {
        if (d == 5) return Promise.reject('EXCEPTION');
        else return d;
      }))
      .pipe(streamz(d => max = d))
      .pipe(streamz())
      .pipe(streamz())
      .on('error',e => err = e)
      .pipe(streamz())
      .on('error',() => err = 'should not be picked up here');
    
    return Promise.delay(200)
      .then(() => {
        t.same(err,'EXCEPTION','picks up error');
        t.same(max,4,'stops stream');
      });
  });

  t.test('promise rejection',t => {
    let max,err;

    return valueStream()
      .pipe(streamz(d => {
        if (d == 5) return Promise.reject('EXCEPTION');
        else return Promise.resolve(d);
      }))
      .pipe(streamz(d => max = d))
      .pipe(streamz())
      .pipe(streamz())
      .promise()
      .catch(e => err = e)
      .then(() => {
        t.same(err,'EXCEPTION','picks up error');
        t.same(max,4,'stops stream');
      });
  });
});
