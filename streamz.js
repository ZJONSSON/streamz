var stream = require('stream'),
    Promise = require('bluebird'),
    util = require('util');

function noop() {}

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

  this._incomingPipes = (options.keepAlive ? 1 : 0);
  this._concurrent = 0;

  this.on('error',function(e) {
    if (this._events.error.length < 2) {
      var pipes = this._readableState.pipes;
      if (pipes) [].concat(pipes).forEach(function(child) {
          child.emit('error',e);
        });
      else throw e;
    }
  });

  this.on('pipe',function() {
    this._incomingPipes++;
  });
}

util.inherits(Streamz,stream.Transform);

Streamz.prototype.callbacks = undefined;

Streamz.prototype._transform = function(d,e,_cb) {
  var self = this,
      ret;

  this._concurrent+=1;

  // If we haven't reached the concurrency limit, we schedule
  // a callback to the transform stream at the next tick
  if (this._concurrent < this._concurrency)
    setImmediate(_cb);
  else
    this.callbacks = (this.callbacks || []).concat(_cb);

  var pop = function() {
    pop = noop;
    if (self.callbacks && self.callbacks.length)
      self.callbacks.shift()();
  };

  var done = function() {
    // Ensure done is only called once
    done = noop;
    self._concurrent--;
    pop();
    self._finalize();
  };

  // If the return value is not a promise then vanillaCb = `done`
  // If a promise is returned, we switch the reference to the
  // original stream callback and only execute `done` when the
  // promise has been resolved
  var vanillaCb = done;
  
  try {
    ret = this._fn(d,function(e,d) {
      if (e)
        self.emit('error',e);
      else if (d !== undefined)
        self.push(d);
      vanillaCb();
    });
  } catch(e) {
    self.emit('error',e);
    vanillaCb();
  }

  if (ret && typeof ret.then === 'function') {
    // switch reference to the original stream callback
    // and only call done when the promise is resolved
    vanillaCb = pop;
    ret.then(function(d) {
      if (d !== undefined)
        self.push(d);
    },function(e) {
      self.emit('error',e);
    })
    .then(done);
  } else {
    // If we got non-promise value, we push it
    if (ret !== undefined)
      self.push(ret);

    // If the fn was synchronous we signal we are done
    if (this._fn.length < 2)
      vanillaCb();
  }
};

Streamz.prototype._fn = function(d) {
  // The default is a simple passthrough. 
  this.push(d);
};

Streamz.prototype._finalize = noop;

Streamz.prototype._flush = function(cb) {
  this._finalize = function() {
    if (!this._concurrent) {
      setImmediate(cb);
      cb = noop;
    }
  }.bind(this);
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

Streamz.prototype.promise = function() {
  var self = this,
      buffer=[],
      bufferStream = Streamz(function(d) {
        buffer.push(d);
      });

  return new Promise(function(resolve,reject) {
    self.pipe(bufferStream)
      .on('error',reject)
      .on('finish',function() {
        resolve(buffer)
      });
  });
};

module.exports = Streamz;