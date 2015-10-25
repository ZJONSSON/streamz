var stream = require('stream'),
    util = require('util');

function Streamz(_c,fn,options) {
  if (!(this instanceof Streamz))
    return new Streamz(_c,fn,options);

  if (isNaN(_c)) {
    options = fn;
    fn = _c;
    _c = undefined;
  }

  if (typeof fn !== 'function') {
    options = fn;
    fn = undefined;
  }

  // Legacy way to define concurrency
  if (!_c && options && !isNaN(options)) {
    _c = options;
    options = undefined;
  }

  options = options || {};
  options.objectMode = true;
  options.highWaterMark = options.highWaterMark || 10;

  stream.Transform.call(this,options);

  this._concurrency = _c || options.concurrency || options.cap || 1;

  if (fn)
    this._fn = fn;
  else if (options.fn)
    this._fn = options.fn;

  this._incomingPipes = 0;
  this._concurrent = 0;

  this.on('pipe',function() {
    this._incomingPipes++;
  });

  this.on('unpipe',function() {
    this._incomingPipes--;
  });
}

util.inherits(Streamz,stream.Transform);

Streamz.prototype._transform = function(d,e,cb) {
  var self = this,
      ret;

  // If we haven't reached the concurrency, we callback immediately
  this._concurrent+=1;

  var callback = function() {
    self._concurrent--;
    setImmediate(cb);
    self._finalize();
  };

  if (this._concurrent < this._concurrency) {
    setImmediate(cb);
    cb = Object;
  }
    
  // If the function has only one argument it must be syncronous or Promise
  if (this._fn.length < 2) {
    ret = this._fn(d);
    // If we get a `.then` function we assume a Promise
    if (ret && typeof ret.then === 'function')
      ret.then(function(d) {
        if (d) self.push(d);
      },function(e) {
        self.emit('error',e);
      })
      .then(callback);
    else {
      if (ret !== undefined)
        self.push(ret);
      callback();
    }
  } else {
    ret = self._fn(d,callback);
    if (ret !== undefined)
      self.push(ret);
  }
};

Streamz.prototype._fn = function(d) {
  // The default is a simple passthrough. 
  this.push(d);
};

Streamz.prototype._finalize = Object;

Streamz.prototype._flush = function(cb) {
  this._finalize = function() {
    if (!this._concurrent) {
      setImmediate(cb);
      cb = undefined;
    }
  };
  this._finalize();
};

Streamz.prototype.end = function(d) {
  this._incomingPipes--;
  if (this._incomingPipes>0) {
    if (d !== undefined)
      this._transform.apply(this,arguments);
  } else
    stream.Transform.prototype.end.apply(this,arguments);
};

module.exports = Streamz;

