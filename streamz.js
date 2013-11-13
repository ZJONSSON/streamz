var stream = require("stream"),
    util = require("util");

function Streamz(fn,concurrentCap,options) {
  if (!(this instanceof Streamz))
    return new Streamz(fn,concurrentCap);

  options = options || {};
  options.objectMode = true;
  options.highWaterMark = options.highWaterMark || 10;

  stream.Transform.call(this,options);

  this._concurrentCap = concurrentCap || 1;

  if (fn) this._fn = fn;
  this._incomingPipes = 0;
  this._concurrent = 0;

  this.on("pipe",function() {
    this._incomingPipes++;
  });

  this.on("unpipe",function() {
    this._incomingPipes--;
  });
}

util.inherits(Streamz,stream.Transform);

Streamz.prototype._transform = function(d,e,cb) {
  var self = this;

  var callback = function() {
    setImmediate(cb);
  };

  // If the function has only one argument it must be syncronous
  if (this._fn.length < 2) {
    this._fn(d);
    return callback();
  }

  // If we haven't reached the cap, we callback immediately
  this._concurrent+=1;
  if (this._concurrent < this._concurrentCap) {
    callback();
    callback = null;
  }

  self._fn(d,function() {
    self._concurrent--;
    if (callback) callback();
  });
};

Streamz.prototype._fn = function(d) {
  // The default is a simple passthrough. 
  this.push(d);
};

Streamz.prototype.end = function() {
  this._incomingPipes--;
  if (this._incomingPipes)
    this._transform.apply(this,arguments);
  else
    stream.Transform.prototype.end.apply(this,arguments);
};

module.exports = Streamz;