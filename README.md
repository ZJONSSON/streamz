The new streams (Streams2) revolutionize stream-based programming in node.js and allow for very complex interactions between inputs, outputs and transforms.   However, I think there is still room for improvements, particularly around multiple incoming pipes and asynchronous execution.  

Enter streamz.js, the generic all-purpose stream for an object pipeline.

The key benefits are the following:

* Keeps count of incoming pipes as they are initiated and reduces count when they end
* Executes "functions" (i.e. writes, transforms, filters, pushes) concurrently up to a user defined cap.
* Issues 'end' only when all incoming pipes have ended
* Issues 'finish' only when all incoming pipes have ended and any concurrent functions have finished
* Provides downstream pipes in all instances.  If nothing is "pushed", the downstream pipe will only receive the end event (at the right time).

The stream initiation is as follows (can be called with or without `new`):

```js
var streamz = require("streamz");
var myStream = streamz(concurrentCap,fn,[options]);
```
The user-supplied function is executed for each incoming object.  The function can either have one input argument `fn(data)`, which means that the function is synchronous or two inputs `fn(data,callback)` which means that the function is asynchronous, i.e. the `callback` has to be executed at the end.

Options are passed on to the parent Transform stream, however `objectMode`s is explicitly set as `true`.

If the intention is to pass data downstream, the particular objects need to be pushed from the user-supplied function (`this.push(data)`).  The function doesn't have to push anything, or it could push some objects not others (i.e. filter).   If any objects are pushed however, there must be a receiving stream below, otherwise the pipeline will be blocked when the buffer is full.

The `concurrentCap` is a limit on how many functions (`fn`) can be executed concurrently at any given point in time.   Setting the cap to 1 will ensure synchronous execution (i.e. only one function running at a a time).

As with node streams a custom [`_flush()`](http://nodejs.org/api/stream.html#stream_transform_flush_callback) function can be defined to handle any remaining buffers after all written data has been consumed.

All feedback, pulls and ideas appreciated.

PS: This library was based on the following original comments to the new Node Streams:

* When piping multiple sources into a stream, I found that the first "end" signal from any of the sources triggered a premature "end" in the target stream
* Writable streams always assume that writes should be sequential.  While this is sensible for file-streams (where order is important) it's less so for database inserts/updates and similar operations
* Two possible events signaling the end of a stream (end and finish) depending on stream type (readable/writable).  
* The selection of different streams feels a little over-engineered (perhaps due to legacy reasons).  I find it more productive to think of every stream as a generic transform that either reads, writes or transform (up to the user).
* I feel that every stream could be piped further (which not the case with Writable).  This is useful for example when streams are forked into multiple directions and we need to know when all forks have ended (i.e. fork each end into a terminal stream).
* High watermark in a writable stream (i.e. writable buffer) does not make sense to me, unless it is a reference to maximum concurrent functions.   As new streams pull data, buffers should (imho) be central to read-streams.
