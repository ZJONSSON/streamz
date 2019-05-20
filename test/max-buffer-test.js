const streamz = require('../streamz');
const t = require('tap');
const valueStream = require('./lib/source');

const maxBuffer = 5;
const smValue = [1,2,3,4];
const mdValue = [1,2,3,4,5];
const lgValue = [1,2,3,4,5,6];

t.test('max-buffer', {autoend:true, jobs: 10}, t => {

  t.test('allows in bounds', t => {
    return valueStream(smValue)
      .pipe(streamz({maxBuffer}))
      .promise()
      .then(d => t.same(d, smValue));
  });

  t.test('allows at capacity', t => {
    return valueStream(mdValue)
      .pipe(streamz({maxBuffer}))
      .promise()
      .then(d => t.same(d, mdValue));
  });

  t.test('rejects at max buffer size', t => {
    let err;
    return valueStream(lgValue)
      .pipe(streamz({maxBuffer}))
      .promise()
      .catch(e => err = e)
      .then(() => {
        t.same(err.message, 'max buffer size reached');
      });
  });

});
