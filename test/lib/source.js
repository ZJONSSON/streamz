const Promise = require('bluebird');
const PassThrough = require('stream').PassThrough;

module.exports = function(values,delay,initDelay) {
  delay = delay || 10;
  initDelay = initDelay || 0;
  values = [].concat(values || [1,2,3,4,5,6,7,8,9]).concat(null);
  
  const p = PassThrough({objectMode:true});
  Promise.delay(initDelay, Promise.mapSeries(values,d => {
    return Promise.delay(delay).then(() => p.push(d));
  }));
    
  return p;
};