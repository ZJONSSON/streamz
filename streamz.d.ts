/// <reference types="node" />

import stream = require('stream');

interface options  {
  concurrency?: number
  catch?(cb: Function): void
  flush?(cb: Function): void
  maxBuffer?: number
  keepAlive?: boolean
  fn?: Function
}

declare class Streamz extends stream.Transform {
  constructor(fn?: Function, options?: options)
  _fn(d: any, cb?: Function) : any
  promise() : Promise<any>
}

export = Streamz;