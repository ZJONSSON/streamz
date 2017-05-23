const streamz = require('../streamz');
const Promise = require('bluebird');
const source = require('./lib/source');
const t = require('tap');

const values = [1,2,3,4];

function test(s) {
  // Capture any error raised in the main stream
  let error;
  s.on('error',e => error = e);

  // First pipe
  source(values,1).pipe(s);

  return Promise.delay(100)
    .then(() => {
      // Second pipe after first one closed
      source(values,1)
        .on('end',s.end.bind(s))
        .pipe(s);
      return Promise.delay(100);
    })
    .then(() => {
      if (error)
        throw error;
      else
        return s.promise();
    });
}

t.test('non-overlapping pipes',{autoend:true,jobs:2}, t => {
  t.test('without keepAlive',t => {
    return test(streamz())
      .then(() => {
        throw 'SHOULD_ERROR';
      },e => {
        t.same(e.message,'write after end','should error');
      });
  });

  t.test('with keepAlive',t => {
    return test(streamz(Number,{keepAlive:true}))
      .then(d => t.same(d,[1,2,3,4,1,2,3,4],'stream stays open'));
  });
});