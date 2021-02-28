const Promise = require('bluebird');
const streamz = require('../streamz');
const t = require('tap');

t.test('delaying end until transforms stops writing',t => {
  // We should be able to continue writing into the stream from the transform, even if incoming stream ended;
  const s = streamz(function(d) {
    if (d == 3) return Promise.delay(100).then(() => {
      this.write(4);
      this.write(5);
      return d;
    });
    if (d == 4) return Promise.delay(100).then(() => {
      this.write(6);
      return d;
    });
    else if (d == 5) this.write(7);
    else return d;
  });

  s.write(1);
  s.write(2);
  s.end(3, () => undefined);

  return s.promise()
    .then(d => t.deepEqual(d, [1,2,3,4,6,7]));
});
