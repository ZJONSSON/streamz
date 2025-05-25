import { Transform, TransformOptions, Writable, Readable } from 'stream';

declare namespace Streamz {
  interface StreamzOptions<T = any, R = any> extends TransformOptions {
    concurrency?: number | (() => number);
    cap?: number;
    fn?: StreamzFunction<T, R>;
    flush?: (callback: () => void) => void;
    catch?: (error: Error, data?: any) => void;
    keepAlive?: boolean;
  }

  type StreamzFunction<T, R> = (
    data: T,
    callback?: (error?: Error | null, result?: R) => void
  ) => R | Promise<R> | void;

  // Typed Transform interface for better pipe inference
  interface TypedTransform<T, R> extends Transform {
    _transform(chunk: T, encoding: BufferEncoding, callback: (error?: Error | null, data?: R) => void): void;
  }

  // Transform options with typed transform function
  interface TypedTransformOptions<T, R> extends TransformOptions {
    transform?: (chunk: T, encoding: BufferEncoding, callback: (error?: Error | null, data?: R) => void) => void;
    flush?: (callback: (error?: Error | null, data?: R) => void) => void;
  }
}

declare class Streamz<T = any, R = any> extends Transform {
  constructor(fn?: Streamz.StreamzFunction<T, R>, options?: Streamz.StreamzOptions<T, R>);
  constructor(concurrency: number, fn?: Streamz.StreamzFunction<T, R>, options?: Streamz.StreamzOptions<T, R>);
  constructor(options?: Streamz.StreamzOptions<T, R>);

  options: Streamz.StreamzOptions<T, R>;
  callbacks?: Function[];
  endedCb?: Function;

  private _concurrency: number | (() => number);
  private _fn: Streamz.StreamzFunction<T, R>;
  private _incomingPipes: number;
  private _concurrent: number;
  private _catch?: (error: Error, data?: any) => void;

  emitError(error: Error, data?: any): void;
  promise(): Promise<R[]>;

  // Enhanced pipe method with type inference
  pipe<U>(destination: Streamz<R, U>, options?: { end?: boolean }): Streamz<R, U>;
  pipe<U>(destination: Streamz.TypedTransform<R, U>, options?: { end?: boolean }): Streamz.TypedTransform<R, U>;
  pipe<U extends Writable>(destination: U, options?: { end?: boolean }): U;

  private _finalize(): void;
}

// Helper function to create typed Transform streams
declare function createTypedTransform<T, R>(options: Streamz.TypedTransformOptions<T, R>): Streamz.TypedTransform<T, R>;

interface StreamzConstructor {
  // Function overloads with proper type inference
  <T, R>(fn: (data: T) => R): Streamz<T, R>;
  <T, R>(fn: (data: T) => Promise<R>): Streamz<T, R>;
  <T, R>(fn: (data: T, callback: (error?: Error | null, result?: R) => void) => void): Streamz<T, R>;
  <T, R>(fn: (data: T, callback: (error?: Error | null, result?: R) => void) => R): Streamz<T, R>;
  
  // Concurrency overloads
  <T, R>(concurrency: number, fn: (data: T) => R): Streamz<T, R>;
  <T, R>(concurrency: number, fn: (data: T) => Promise<R>): Streamz<T, R>;
  <T, R>(concurrency: number, fn: (data: T, callback: (error?: Error | null, result?: R) => void) => void): Streamz<T, R>;
  <T, R>(concurrency: number, fn: (data: T, callback: (error?: Error | null, result?: R) => void) => R): Streamz<T, R>;
  
  // Options overloads
  <T, R>(options: Streamz.StreamzOptions<T, R> & { fn: (data: T) => R }): Streamz<T, R>;
  <T, R>(options: Streamz.StreamzOptions<T, R> & { fn: (data: T) => Promise<R> }): Streamz<T, R>;
  <T, R>(options: Streamz.StreamzOptions<T, R> & { fn: (data: T, callback: (error?: Error | null, result?: R) => void) => void }): Streamz<T, R>;
  
  // Fallback overloads for when types can't be inferred
  (fn?: Function, options?: Streamz.StreamzOptions): Streamz;
  (concurrency: number, fn?: Function, options?: Streamz.StreamzOptions): Streamz;
  (options?: Streamz.StreamzOptions): Streamz;
  
  // Constructor overloads
  new <T, R>(fn: (data: T) => R): Streamz<T, R>;
  new <T, R>(fn: (data: T) => Promise<R>): Streamz<T, R>;
  new <T, R>(fn: (data: T, callback: (error?: Error | null, result?: R) => void) => void): Streamz<T, R>;
  new <T, R>(concurrency: number, fn: (data: T) => R): Streamz<T, R>;
  new <T, R>(concurrency: number, fn: (data: T) => Promise<R>): Streamz<T, R>;
  new <T, R>(concurrency: number, fn: (data: T, callback: (error?: Error | null, result?: R) => void) => void): Streamz<T, R>;
  new <T, R>(options: Streamz.StreamzOptions<T, R>): Streamz<T, R>;
  new (fn?: Function, options?: Streamz.StreamzOptions): Streamz;
  new (concurrency: number, fn?: Function, options?: Streamz.StreamzOptions): Streamz;
  new (options?: Streamz.StreamzOptions): Streamz;

  // Static method to create typed transforms
  Transform: typeof createTypedTransform;
}

declare const StreamzConstructor: StreamzConstructor;

export = StreamzConstructor; 