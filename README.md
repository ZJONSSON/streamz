#### Streamz - generic all-purpose stream for an object pipeline.

The native stream.Transform does not provide concurrent operations out of the box or multiple incoming pipes going into a single transform.  Streamz is a lightweight wrapper around the Transform stream:

* Executes custom functions (i.e. writes, transforms, filters, pushes) concurrently up to a user defined cap.
* Tracks outstanding asynchronous functions by waiting for callbacks or resolved promises
* Keeps count of incoming pipes as they are initiated and reduces count when they end
* Issues 'end' only when all incoming pipes have ended
* Issues 'finish' only when all incoming pipes have ended and any concurrent functions have finished
* Provides downstream pipes in all instances.  If nothing is "pushed", the downstream pipe will only receive the end event (at the right time).
* Passes errors down to the first listener in the chain
* Provides an easy transition to final promise that is resolved on `finish` and rejected on `error`

The stream initiation is as follows (can be called with or without `new`):

```js
streamz(fn,[options]);

// alternative signature for specifying maximum concurrency:
streamz(concurrency,fn,[options])

```
The user-supplied function (`fn`) is executed for each incoming object (either written directly with `.write` or piped from above).  The function must have either one or two arguments.  The first argument represents each incoming data packet and the second one is an optional callback.   The function can return nothing, a value or a promise.

The function can execute multiple manual pushes (`this.push(data)`) to pass any objects downstream.  If the function returns a value (`!= undefined` and not a promise), that value is automatically pushed.   If the function returns a promise that ultimately returns a non-undefined value, that final value is pushed too.  And finally if (optionally) a callback returns a value that gets pushed as well.  Basically any non-undefined returns through function results, callbacks or promise results get automatically pushed.  Therefore if you want to only manually push from inside the function make sure that any return values (or resolves) show up as `undefined`.

When defining a custom function you can chose between a static function, a function with a callback and a function that returns a Promise.   The static function is considered immediately resolved upon execution, whereas the others are considered asynchronous. However, a custom function can also utilize a callback and a promise at the same time - in which case the callback signals when the stream is ready to receive next packet and the promise fulfillment signals when the processing is done.   This allows concurrency management linked to connection pools (i.e. fire cb when a pool issued an available connection) while the promise doesn't get resolved until the corresponding database call has completed.   Using this approach, a stream will not `finish` until outstanding promises have resolved - in addition to any callbacks.

Options are passed on to the parent Transform stream, however `objectMode` is explicitly set as `true`.  By default, the execution of user-supplied function is sequential (i.e. only one function runs at a time). This can be changed by specifying the maximum concurrent functions through a `concurrency` property in the options (defaults to 1).   Keep in mind that with concurrent cap above one, the order of the outputs might be different from the inputs.

Concurrency can also be defined through the alternative function signature, where the maximum concurrency is the first argument, fn as the second and options as the third.

If you specify the option `keepAlive: true`, the `streamz` object will need an extra `.end()` to close.   This prevents accidental closing when piping multiple streams with uncertain timings (including periods of no open streams) into a `streamz` object.

As with vanilla node streams, a custom [`_flush()`](http://nodejs.org/api/stream.html#stream_transform_flush_callback) function can be defined to handle any remaining buffers after all written data has been consumed.  It is important however to call the '_flush' function of the `streamz` object prior to custom flushes.   Here is an example of how a custom buffer might be flushed:

```js
Customstream.prototype._flush = function(cb) {
  var self = this;
  Streamz.prototype._flush.call(this,function() {
    self.push(self.customBuffer);
    setImmediate(cb);
  });
};
```

Any errors that come up in a streamz object are passed to the children if no custom error listener has been defined.  This allows errors to propagate down to the first error listener or to the rejection of a final promise (if the chain ends in `.promise()`)

A chain that ends with `.promise()` returns a promise that collects any data passed down in an array and resolves when the stream is `finished` or is rejected if any uncaught error occured.   If no data is passed down to the end, the promise simply resolves to an empty array.
