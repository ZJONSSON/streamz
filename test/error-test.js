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

  t.test('as an async rejection',t => {
    let max,err;

    valueStream()
      .pipe(streamz(async function(d) {
        if (d == 5) await Promise.delay(100).then(() => Promise.reject('EXCEPTION'));
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

  t.test('as an async rejection',t => {
    let max,err;

    valueStream()
      .pipe(streamz(async function(d) {
        if (d == 5) await Promise.delay(100).then(() => Promise.reject('EXCEPTION'));
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

  t.test('error without any child pipes', t => {
    try {
      streamz().emit('error','this is an error');
    }
    catch(e) {
      t.equal(e,'this is an error','throws');
      t.end();
    }
  });
});

t.test('catch', {autoend:true, jobs: 10}, t => {
  t.test('exception passes the error',t => {
    let max,err;

    valueStream()
      .pipe(streamz(d => {
        if (d == 5) throw 'EXCEPTION';
        else return d;  
      },{catch: e => {
        throw `Found: ${e}`;
      }}))
      .on('error',e => err = e)
      .pipe(streamz(d => max = d));

    return Promise.delay(400)
      .then(() => {
        t.same(err,'Found: EXCEPTION','emits error');
        t.same(max,4,'stops');
      });
  });

  t.test('error callback',t => {
    let max,err;

    valueStream()
      .pipe(streamz((d,cb) => {
        if (d == 5) cb('EXCEPTION');
        else cb(null,d);
      },{catch: e => {
        throw `Found: ${e}`;
      }}))
      .on('error',e => err = e)
      .pipe(streamz(d => max = d));

    return Promise.delay(400)
      .then(() => {
        t.same(err,'Found: EXCEPTION','emits error');
        t.same(max,4,'stops');
      });
  });

  t.test('as promise rejection',t => {
    let max,err;

    valueStream()
      .pipe(streamz(d => {
        if (d == 5) return Promise.reject('EXCEPTION');
        else return Promise.resolve(d);
      },{catch: e => {
        throw `Found: ${e}`;
      }}))
      .pipe(streamz(d => max = d))
      .promise()
      .catch(e => err = e);
    
    return Promise.delay(400)
      .then(() => {
        t.same(err,'Found: EXCEPTION','emits');
        t.same(max,4,'stops');
      });
  });

  t.test('as async rejection',t => {
    let max,err;

    valueStream()
      .pipe(streamz(async function(d) {
        if (d == 5) await Promise.delay(100).then(() => { throw 'EXCEPTION';});
        else return Promise.resolve(d);
      },{catch: e => {
        throw `Found: ${e}`;
      }}))
      .pipe(streamz(d => max = d))
      .promise()
      .catch(e => err = e);
    
    return Promise.delay(400)
      .then(() => {
        t.same(err,'Found: EXCEPTION','emits');
        t.same(max,4,'stops');
      });
  });

  t.test('ignoring the error',t => {
    let max,err,caughtErr,caughtData;

    valueStream()
      .pipe(streamz(d => {
        if (d == 5) throw 'EXCEPTION';
        else return d;  
      },{catch: (e,d) => {
        caughtErr = e;
        caughtData = d;
      }}))
      .on('error',e => err = e)
      .pipe(streamz(d => max = d));

    return Promise.delay(400)
      .then(() => {
        t.same(caughtErr,'EXCEPTION','The error is caught');
        t.same(caughtData,5);
        t.same(err,undefined,'Error is not emitted');
        t.same(max,9,'does not stop the stream');
      });
  });

 
});