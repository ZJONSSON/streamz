const Streamz = require('../streamz');
const t = require('tap');
const valueStream = require('./lib/source');

const maxBuffer = 5;
const smArrayValue = [1,2,3,4];
const mdArrayValue = [1,2,3,4,5];
const lgArrayValue = [1,2,3,4,5,6];
const smStringValue = smArrayValue.join('');
const mdStringValue = mdArrayValue.join('');
const lgStringValue = lgArrayValue.join('');
const smBufferValue = Buffer.from(smArrayValue);
const mdBufferValue = Buffer.from(mdArrayValue);
const lgBufferValue = Buffer.from(lgArrayValue);

const testSuccess = (t,val) => valueStream(val)
  .pipe(new Streamz(null, {maxBuffer}))
  .promise()
  .then(d => t.same(d, [].concat(val)));

const testRejection = (t,val) => {
  let err;
  return valueStream(val)
    .pipe(new Streamz(null, {maxBuffer}))
    .promise()
    .catch(e => err = e)
    .then(() => {
      t.same(err.message, 'max buffer size reached');
    });
};

t.test('max-buffer', {autoend:true, jobs: 10}, t => {

  t.test('allows in bounds', {autoend:true, jobs: 10}, t => {
    t.test('array', t => testSuccess(t, smArrayValue));
    t.test('string', t => testSuccess(t, smStringValue));
    t.test('buffer', t => testSuccess(t, smBufferValue));
  });

  t.test('allows at capacity', {autoend:true, jobs: 10}, t => {
    t.test('array', t => testSuccess(t, mdArrayValue));
    t.test('string', t => testSuccess(t, mdStringValue));
    t.test('buffer', t => testSuccess(t, mdBufferValue));
  });

  t.test('rejects at max buffer size', {autoend:true, jobs: 10}, t => {
    t.test('array', t => testRejection(t, lgArrayValue));
    t.test('string', t => testRejection(t, lgStringValue));
    t.test('buffer', t => testRejection(t, lgBufferValue));
  });

});
