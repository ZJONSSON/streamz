const stream = require('stream');
const Promise = require('bluebird');
const util = require('util');

const noop = () => undefined;

function Streamz(_c, fn, options) {
  if (!(this instanceof Streamz))
    return new Streamz(_c, fn, options);

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
  this.options = options;
  options.objectMode = true;

  if (options.highWaterMark === undefined) 
    options.highWaterMark = 10;

  stream.Transform.call(this,options);

  this._concurrency = _c || options.concurrency || options.cap || 1;

  if (fn)
    this._fn = fn;
  else if (options.fn)
    this._fn = options.fn;

  this._incomingPipes = (options.keepAlive ? 1 : 0);
  this._concurrent = 0;
  if (options.flush)
    this._flush = options.flush;
  if (typeof options.catch === 'function')
    this._catch = options.catch;

  this.on('error',e => {
    if (this._events.error.length < 2) {
      const pipes = this._readableState.pipes;
      if (pipes) [].concat(pipes).forEach(child => child.emit('error', e));
      else throw e;
    }
  });

  this.on('pipe',p => {
    if (!(p instanceof Streamz) && (!p._events.error || !p._events.error.length || p._events.error.length === 1))
      p.on('error',e => this.emit('error', e));

    this._incomingPipes++;
  });
}

util.inherits(Streamz,stream.Transform);

Streamz.prototype.callbacks = undefined;

Streamz.prototype._flush = function(cb) { setImmediate(cb);};

Streamz.prototype.emitError = function(e,d) {
  if (this._catch)
    Promise.try(() => this._catch.call(this,e,d))
      .catch(e => this.emit('error',e));
  else
    this.emit('error',e);
};

Streamz.prototype._transform = function(d, e, _cb) {
  let ret;

  this._concurrent+=1;

  // If we haven't reached the concurrency limit, we schedule
  // a callback to the transform stream at the next tick
  let concurrency = this._concurrency;
  if (typeof concurrency === 'function') concurrency = concurrency();
  if (this._concurrent < concurrency)
    setImmediate(_cb);
  else
    this.callbacks = (this.callbacks || []).concat(_cb);

  let pop = () => {
    pop = noop;
    if (this.callbacks && this.callbacks.length)
      this.callbacks.shift()();
  };

  let done = () => {
    // Ensure done is only called once
    done = noop;
    this._concurrent--;
    pop();
    setImmediate( () => this._finalize());
  };

  // If the return value is not a promise then vanillaCb = `done`
  // If a promise is returned, we switch the reference to the
  // original stream callback and only execute `done` when the
  // promise has been resolved
  let vanillaCb = done;
  
  try {
    ret = this._fn(d, (e, d) => {
      if (e)
        this.emitError(e,d);
      else if (d !== undefined)
        this.push(d);
      vanillaCb();
    });
  } catch(e) {
    this.emitError(e,d);
    vanillaCb();
  }

  if (ret && typeof ret.then === 'function') {
    // switch reference to the original stream callback
    // and only call done when the promise is resolved
    vanillaCb = pop;
    ret.then(d => {
      if (d !== undefined)
        this.push(d);
    },e => {
      this.emitError(e,d);
    })
    .then(done);
  } else {
    // If we got non-promise value, we push it
    if (ret !== undefined)
      this.push(ret);

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

Streamz.prototype.end = function(d,cb) {
  this._incomingPipes--;
  if (d !== undefined)
    this._transform(d, null, noop);
  if (this._incomingPipes < 1) {
    this._finalize = () => {
      if (!this._concurrent && !this._writableState.length)
        stream.Transform.prototype.end.apply(this, undefined, cb);
    };
    this._finalize();
  }
};

Streamz.prototype.promise = function() {
  const buffer = [];
  const bufferStream = Streamz(d => {
    buffer.push(d);
  });
        
  return new Promise((resolve,reject) => {
    this.pipe(bufferStream)
      .on('error', reject)
      .on('finish', () => resolve(buffer));
  });
};

module.exports = Streamz;