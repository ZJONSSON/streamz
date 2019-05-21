/// <reference types="node" />

import stream = require('stream');
import { promises } from 'fs';

interface options {
  concurrency?: number
}

declare class Streamz extends stream.Transform {
  constructor(_c?: number | Function | options, fn?: Function | options, options?: options)
  _fn(d: any, cb?: Function) : any
  promise() : Promise<any>
}

declare function streamz(_c : number | Function | options, fn: Function | options, options: options) : Streamz
export = streamz;