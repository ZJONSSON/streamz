const streamz = require('../streamz');
const t = require('tap');

const values = [1,2,3,4,5,6,7,8,9];

function valueStream() {
  const s = require('stream').PassThrough({objectMode:true});
  values.forEach((d,i) => setTimeout(() =>{
    s.write(d);
    if (i == values.length -1)
      s.end();
  },i*1));
  return s;
}

t.test('promise',{autoend:true, jobs: 10}, t => {
  t.test('concats data and resolves on finish',t => {
    return valueStream()
      .pipe(streamz())
      .pipe(streamz())
      .promise()
      .then(d => t.same(d,values));
  });

  t.test('resolves with empty array if no data',t => {
    return valueStream()
      .pipe(streamz())
      .pipe(streamz())
      .pipe(streamz(function() {}))
      .promise()
      .then(d => t.same(d,[]));
  });
});
