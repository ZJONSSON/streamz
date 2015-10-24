var PassThrough = require('stream').PassThrough;

module.exports = function(values,delay,initDelay) {
  delay = delay || 10;
  initDelay = initDelay || 0;
  values = [].concat(values || [1,2,3,4,5,6,7,8,9]);
  
  var p = PassThrough({objectMode:true});
  values.forEach(function(d,i) {
    setTimeout(function() {
      p.write(d);
      if (i == values.length-1)
        p.end();
    },i*delay+initDelay);
  });
  return p;
};