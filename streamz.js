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
  callback = cb;

  // If the function has only one argument it must be syncronous
  if (this._fn.length < 2) return callback(this._fn(d));

  // If we haven't reached the cap, we callback immediately
  if (++this._concurrent < this._concurrentCap) {
    callback();
    callback = null;
  }

  this._fn(d,function() {
    self._concurrent--;
    if (callback) callback();
    self.checkEnd();
  });
};

Streamz.prototype._fn = function(d) {
  // The default is a simple passthrough. 
  this.push(d);
};

Streamz.prototype.checkEnd = function() {
  // End is only emitted when incoming pipes have end()ed
  // and no concurrent function calls are outstanding
  if (!this._incomingPipes && !this._concurrent)
    this.emit("end");
};

Streamz.prototype.end = function() {
  this._incomingPipes--;
  this.checkEnd();
};

module.exports = Streamz;