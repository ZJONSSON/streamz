const streamz = require('../streamz');
const Promise = require('bluebird');
const valueStream = require('./lib/source');
const fs = require('fs');
const t = require('tap');

t.test('error', {autoend:true, jobs: 10}, t => {
  t.test('thrown in function',t => {
    let max,err;

    valueStream()
      .pipe(streamz(d => {
        if (d == 5) throw 'EXCEPTION';
        else return d;  
      }))
      .on('error',e => err = e)
      .pipe(streamz(d => max = d));

    return Promise.delay(400)
      .then(() => {
        t.same(err,'EXCEPTION','emits error');
        t.same(max,4,'stops');
      });
  });

  t.test('as error callback',t => {
    let max,err;

    valueStream()
      .pipe(streamz((d,cb) => {
        if (d == 5) cb('EXCEPTION');
        else cb(null,d);
      }))
      .on('error',e => err = e)
      .pipe(streamz(d => max = d));

    return Promise.delay(400)
      .then(() => {
        t.same(err,'EXCEPTION','emits error');
        t.same(max,4,'stops');
      });
  });

  t.test('as promise rejection',t => {
    let max,err;

    valueStream()
      .pipe(streamz(d => {
        if (d == 5) return Promise.reject('EXCEPTION');
        else return Promise.resolve(d);
      }))
      .pipe(streamz(d => max = d))
      .promise()
      .catch(e => err = e);
    
    return Promise.delay(400)
      .then(() => {
        t.same(err,'EXCEPTION','emits');
        t.same(max,4,'stops');
      });
  });

  t.test('error in component above',t => {
    return fs.createReadStream('this_file_does_not_exists')
      .pipe(streamz())
      .promise()
      .then(
        () => {throw 'Should Error';},
        e => t.same(e.code,'ENOENT','is captured')
      );
  });
});