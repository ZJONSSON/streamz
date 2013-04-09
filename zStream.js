var stream = require("stream"),
    util = require("util");

function zStream(fn,concurrentCap) {
  if (!(this instanceof zStream))
    return new zStream(fn);

  stream.Transform.call(this,{objectMode: true, highWaterMark: 1});

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

util.inherits(zStream,stream.Transform);

zStream.prototype._transform = function(d,e,callback) {
  // If the function has only one argument it must be syncronous
  if (this._fn.length < 2) return callback(this._fn(d));

  var self = this;

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

zStream.prototype._fn = function(d) {
  // The default is a simple passthrough. 
  this.push(d);
};

zStream.prototype.checkEnd = function() {
  // End is only emitted when incoming pipes have end()ed
  // and no concurrent function calls are outstanding
  if (!this._incomingPipes && !this._concurrent)
    this.emit("end");
};

zStream.prototype.end = function() {
  this._incomingPipes--;
  this.checkEnd();
};

module.exports = zStream;