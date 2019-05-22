const {Transform } = require('stream');
const Promise = require('bluebird');
const noop = () => undefined;

class Streamz extends Transform {
  constructor(fn, options) {
    super(options = Object.assign({highWaterMark: 10}, options, {objectMode: true}));
    this.options = options;
    this._concurrency =  options.concurrency || options.cap || 1;

    if (fn)
      this._fn = fn;
    else if (options.fn)
      this._fn = options.fn;

    this._incomingPipes = (options.keepAlive ? 1 : 0);
    this._concurrent = 0;
    if (options.flush)
      this._flush = (cb) => {
        this._flush = noop;
        options.flush.call(this,() => setImmediate(cb));
      };
    if (typeof options.catch === 'function')
      this._catch = options.catch;

    this.on('error',e => {
      // @ts-ignore
      if (this._events.error.length < 2) {
        // @ts-ignore
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

  emitError(e,d) {
    if (this._catch)
      Promise.try(() => this._catch.call(this,e,d))
        .catch(e => this.emit('error',e));
    else
      this.emit('error',e);
  }

  // @ts-ignore
  _transform(d, e, _cb) {
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
      // @ts-ignore
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

    // @ts-ignore
    if (ret && typeof ret.then === 'function') {
      // switch reference to the original stream callback
      // and only call done when the promise is resolved
      vanillaCb = pop;
      // @ts-ignore
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
  }

  _fn(d) {
    // The default is a simple passthrough. 
    this.push(d);
  }

  _finalize() {
  }

  end(d,cb) {
    this._incomingPipes--;
    if (d !== undefined)
      this._transform(d, null, noop);
    if (this._incomingPipes < 1) {
      this._finalize = () => {
        // @ts-ignore
        if (!this._concurrent && !this._writableState.length)
          Transform.prototype.end.apply(this, cb);
      };
      this._finalize();
    }
  }

  promise() {
    let size = 0;
    const buffer = [];
    const bufferStream = new Streamz(d => {
      if (this.options.maxBuffer) {
        size += (d && d.length) || 1;
        if (size > this.options.maxBuffer) {
          this.emitError(new Error('max buffer size reached'));
          return;
        }
      }
      buffer.push(d);
    });
          
    return new Promise((resolve,reject) => {
      this.pipe(bufferStream)
        .on('error', reject)
        .on('finish', () => resolve(buffer));
    });
  }
}

module.exports = Streamz;