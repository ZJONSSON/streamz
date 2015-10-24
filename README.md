#### Streamz - generic all-purpose stream for an object pipeline.

The native stream.Transform does not provide concurrent operations out of the box or multiple incoming pipes going into a single transform.  Streamz is a lightweight wrapper around the Transform stream:

* Executes custom functions (i.e. writes, transforms, filters, pushes) concurrently up to a user defined cap.
* Tracks outstanding asynchronous functions by waiting for callbacks or resolved promises
* Keeps count of incoming pipes as they are initiated and reduces count when they end
* Issues 'end' only when all incoming pipes have ended
* Issues 'finish' only when all incoming pipes have ended and any concurrent functions have finished
* Provides downstream pipes in all instances.  If nothing is "pushed", the downstream pipe will only receive the end event (at the right time).

The stream initiation is as follows (can be called with or without `new`):

```js
streamz(fn,[options]);

// alternative signature for specifying maximum concurrency:
streamz(concurrency,fn,[options])

```
The user-supplied function is executed for each incoming object.  The function can either have one input argument `fn(data)` or two inputs where the second one is a callback function to be executed at the end of the transform.  If the function has only one argument it is either assumed synchronous (i.e. finished when the function returns) or promised based (if the function returns an object with an executable `.then`)

Options are passed on to the parent Transform stream, however `objectMode` is explicitly set as `true`.  By default, the execution of user-supplied function is sequential (i.e. only one function runs at a time). This can be changed by specifying the maximum concurrent functions through a `concurrency` property in the options (defaults to 1).   Keep in mind that with concurrent cap above one, the order of the outputs might be different from the inputs.

Concurrency can also be defined through an alternative function signature, with the maximum concurrency as the first argument, fn as the second and options as the third

If the intention is to pass data downstream, the objects/data need to be pushed from the user-supplied function (`this.push(data)`).  The function doesn't have to push anything, or it could push some objects not others (i.e. filter).   If any objects are pushed however, there must be a receiving stream below, otherwise the pipeline will be blocked when the buffer is full.

As with node streams a custom [`_flush()`](http://nodejs.org/api/stream.html#stream_transform_flush_callback) function can be defined to handle any remaining buffers after all written data has been consumed.  It is important however to call the '_flush' function of the `streamz` object prior to custom flushes.   Here is an example of how a custom buffer might be flushed:

```js
Customstream.prototype._flush = function(cb) {
  var self = this;
  Streamz.prototype._flush.call(this,function() {
    self.push(self.customBuffer);
    setImmediate(cb);
  });
};
```
