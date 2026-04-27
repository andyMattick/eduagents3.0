"use strict";
/* Bundled by esbuild — do not edit */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));

// node_modules/process-nextick-args/index.js
var require_process_nextick_args = __commonJS({
  "node_modules/process-nextick-args/index.js"(exports, module) {
    "use strict";
    if (typeof process === "undefined" || !process.version || process.version.indexOf("v0.") === 0 || process.version.indexOf("v1.") === 0 && process.version.indexOf("v1.8.") !== 0) {
      module.exports = { nextTick };
    } else {
      module.exports = process;
    }
    function nextTick(fn, arg1, arg2, arg3) {
      if (typeof fn !== "function") {
        throw new TypeError('"callback" argument must be a function');
      }
      var len = arguments.length;
      var args, i;
      switch (len) {
        case 0:
        case 1:
          return process.nextTick(fn);
        case 2:
          return process.nextTick(function afterTickOne() {
            fn.call(null, arg1);
          });
        case 3:
          return process.nextTick(function afterTickTwo() {
            fn.call(null, arg1, arg2);
          });
        case 4:
          return process.nextTick(function afterTickThree() {
            fn.call(null, arg1, arg2, arg3);
          });
        default:
          args = new Array(len - 1);
          i = 0;
          while (i < args.length) {
            args[i++] = arguments[i];
          }
          return process.nextTick(function afterTick() {
            fn.apply(null, args);
          });
      }
    }
  }
});

// node_modules/isarray/index.js
var require_isarray = __commonJS({
  "node_modules/isarray/index.js"(exports, module) {
    var toString = {}.toString;
    module.exports = Array.isArray || function(arr) {
      return toString.call(arr) == "[object Array]";
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/stream.js
var require_stream = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/stream.js"(exports, module) {
    module.exports = __require("stream");
  }
});

// node_modules/readable-stream/node_modules/safe-buffer/index.js
var require_safe_buffer = __commonJS({
  "node_modules/readable-stream/node_modules/safe-buffer/index.js"(exports, module) {
    var buffer = __require("buffer");
    var Buffer2 = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module.exports = buffer;
    } else {
      copyProps(buffer, exports);
      exports.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  }
});

// node_modules/core-util-is/lib/util.js
var require_util = __commonJS({
  "node_modules/core-util-is/lib/util.js"(exports) {
    function isArray(arg) {
      if (Array.isArray) {
        return Array.isArray(arg);
      }
      return objectToString(arg) === "[object Array]";
    }
    exports.isArray = isArray;
    function isBoolean(arg) {
      return typeof arg === "boolean";
    }
    exports.isBoolean = isBoolean;
    function isNull(arg) {
      return arg === null;
    }
    exports.isNull = isNull;
    function isNullOrUndefined(arg) {
      return arg == null;
    }
    exports.isNullOrUndefined = isNullOrUndefined;
    function isNumber(arg) {
      return typeof arg === "number";
    }
    exports.isNumber = isNumber;
    function isString(arg) {
      return typeof arg === "string";
    }
    exports.isString = isString;
    function isSymbol(arg) {
      return typeof arg === "symbol";
    }
    exports.isSymbol = isSymbol;
    function isUndefined(arg) {
      return arg === void 0;
    }
    exports.isUndefined = isUndefined;
    function isRegExp(re) {
      return objectToString(re) === "[object RegExp]";
    }
    exports.isRegExp = isRegExp;
    function isObject(arg) {
      return typeof arg === "object" && arg !== null;
    }
    exports.isObject = isObject;
    function isDate(d) {
      return objectToString(d) === "[object Date]";
    }
    exports.isDate = isDate;
    function isError(e) {
      return objectToString(e) === "[object Error]" || e instanceof Error;
    }
    exports.isError = isError;
    function isFunction(arg) {
      return typeof arg === "function";
    }
    exports.isFunction = isFunction;
    function isPrimitive(arg) {
      return arg === null || typeof arg === "boolean" || typeof arg === "number" || typeof arg === "string" || typeof arg === "symbol" || typeof arg === "undefined";
    }
    exports.isPrimitive = isPrimitive;
    exports.isBuffer = __require("buffer").Buffer.isBuffer;
    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }
  }
});

// node_modules/inherits/inherits_browser.js
var require_inherits_browser = __commonJS({
  "node_modules/inherits/inherits_browser.js"(exports, module) {
    if (typeof Object.create === "function") {
      module.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
              value: ctor,
              enumerable: false,
              writable: true,
              configurable: true
            }
          });
        }
      };
    } else {
      module.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          var TempCtor = function() {
          };
          TempCtor.prototype = superCtor.prototype;
          ctor.prototype = new TempCtor();
          ctor.prototype.constructor = ctor;
        }
      };
    }
  }
});

// node_modules/inherits/inherits.js
var require_inherits = __commonJS({
  "node_modules/inherits/inherits.js"(exports, module) {
    try {
      util = __require("util");
      if (typeof util.inherits !== "function")
        throw "";
      module.exports = util.inherits;
    } catch (e) {
      module.exports = require_inherits_browser();
    }
    var util;
  }
});

// node_modules/readable-stream/lib/internal/streams/BufferList.js
var require_BufferList = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/BufferList.js"(exports, module) {
    "use strict";
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    var Buffer2 = require_safe_buffer().Buffer;
    var util = __require("util");
    function copyBuffer(src, target, offset) {
      src.copy(target, offset);
    }
    module.exports = function() {
      function BufferList() {
        _classCallCheck(this, BufferList);
        this.head = null;
        this.tail = null;
        this.length = 0;
      }
      BufferList.prototype.push = function push(v) {
        var entry = { data: v, next: null };
        if (this.length > 0)
          this.tail.next = entry;
        else
          this.head = entry;
        this.tail = entry;
        ++this.length;
      };
      BufferList.prototype.unshift = function unshift(v) {
        var entry = { data: v, next: this.head };
        if (this.length === 0)
          this.tail = entry;
        this.head = entry;
        ++this.length;
      };
      BufferList.prototype.shift = function shift() {
        if (this.length === 0)
          return;
        var ret = this.head.data;
        if (this.length === 1)
          this.head = this.tail = null;
        else
          this.head = this.head.next;
        --this.length;
        return ret;
      };
      BufferList.prototype.clear = function clear() {
        this.head = this.tail = null;
        this.length = 0;
      };
      BufferList.prototype.join = function join(s) {
        if (this.length === 0)
          return "";
        var p = this.head;
        var ret = "" + p.data;
        while (p = p.next) {
          ret += s + p.data;
        }
        return ret;
      };
      BufferList.prototype.concat = function concat(n) {
        if (this.length === 0)
          return Buffer2.alloc(0);
        var ret = Buffer2.allocUnsafe(n >>> 0);
        var p = this.head;
        var i = 0;
        while (p) {
          copyBuffer(p.data, ret, i);
          i += p.data.length;
          p = p.next;
        }
        return ret;
      };
      return BufferList;
    }();
    if (util && util.inspect && util.inspect.custom) {
      module.exports.prototype[util.inspect.custom] = function() {
        var obj = util.inspect({ length: this.length });
        return this.constructor.name + " " + obj;
      };
    }
  }
});

// node_modules/readable-stream/lib/internal/streams/destroy.js
var require_destroy = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/destroy.js"(exports, module) {
    "use strict";
    var pna = require_process_nextick_args();
    function destroy(err, cb) {
      var _this = this;
      var readableDestroyed = this._readableState && this._readableState.destroyed;
      var writableDestroyed = this._writableState && this._writableState.destroyed;
      if (readableDestroyed || writableDestroyed) {
        if (cb) {
          cb(err);
        } else if (err) {
          if (!this._writableState) {
            pna.nextTick(emitErrorNT, this, err);
          } else if (!this._writableState.errorEmitted) {
            this._writableState.errorEmitted = true;
            pna.nextTick(emitErrorNT, this, err);
          }
        }
        return this;
      }
      if (this._readableState) {
        this._readableState.destroyed = true;
      }
      if (this._writableState) {
        this._writableState.destroyed = true;
      }
      this._destroy(err || null, function(err2) {
        if (!cb && err2) {
          if (!_this._writableState) {
            pna.nextTick(emitErrorNT, _this, err2);
          } else if (!_this._writableState.errorEmitted) {
            _this._writableState.errorEmitted = true;
            pna.nextTick(emitErrorNT, _this, err2);
          }
        } else if (cb) {
          cb(err2);
        }
      });
      return this;
    }
    function undestroy() {
      if (this._readableState) {
        this._readableState.destroyed = false;
        this._readableState.reading = false;
        this._readableState.ended = false;
        this._readableState.endEmitted = false;
      }
      if (this._writableState) {
        this._writableState.destroyed = false;
        this._writableState.ended = false;
        this._writableState.ending = false;
        this._writableState.finalCalled = false;
        this._writableState.prefinished = false;
        this._writableState.finished = false;
        this._writableState.errorEmitted = false;
      }
    }
    function emitErrorNT(self2, err) {
      self2.emit("error", err);
    }
    module.exports = {
      destroy,
      undestroy
    };
  }
});

// node_modules/util-deprecate/node.js
var require_node = __commonJS({
  "node_modules/util-deprecate/node.js"(exports, module) {
    module.exports = __require("util").deprecate;
  }
});

// node_modules/readable-stream/lib/_stream_writable.js
var require_stream_writable = __commonJS({
  "node_modules/readable-stream/lib/_stream_writable.js"(exports, module) {
    "use strict";
    var pna = require_process_nextick_args();
    module.exports = Writable;
    function CorkedRequest(state) {
      var _this = this;
      this.next = null;
      this.entry = null;
      this.finish = function() {
        onCorkedFinish(_this, state);
      };
    }
    var asyncWrite = !process.browser && ["v0.10", "v0.9."].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
    var Duplex;
    Writable.WritableState = WritableState;
    var util = Object.create(require_util());
    util.inherits = require_inherits();
    var internalUtil = {
      deprecate: require_node()
    };
    var Stream = require_stream();
    var Buffer2 = require_safe_buffer().Buffer;
    var OurUint8Array = (typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : {}).Uint8Array || function() {
    };
    function _uint8ArrayToBuffer(chunk) {
      return Buffer2.from(chunk);
    }
    function _isUint8Array(obj) {
      return Buffer2.isBuffer(obj) || obj instanceof OurUint8Array;
    }
    var destroyImpl = require_destroy();
    util.inherits(Writable, Stream);
    function nop() {
    }
    function WritableState(options, stream) {
      Duplex = Duplex || require_stream_duplex();
      options = options || {};
      var isDuplex = stream instanceof Duplex;
      this.objectMode = !!options.objectMode;
      if (isDuplex)
        this.objectMode = this.objectMode || !!options.writableObjectMode;
      var hwm = options.highWaterMark;
      var writableHwm = options.writableHighWaterMark;
      var defaultHwm = this.objectMode ? 16 : 16 * 1024;
      if (hwm || hwm === 0)
        this.highWaterMark = hwm;
      else if (isDuplex && (writableHwm || writableHwm === 0))
        this.highWaterMark = writableHwm;
      else
        this.highWaterMark = defaultHwm;
      this.highWaterMark = Math.floor(this.highWaterMark);
      this.finalCalled = false;
      this.needDrain = false;
      this.ending = false;
      this.ended = false;
      this.finished = false;
      this.destroyed = false;
      var noDecode = options.decodeStrings === false;
      this.decodeStrings = !noDecode;
      this.defaultEncoding = options.defaultEncoding || "utf8";
      this.length = 0;
      this.writing = false;
      this.corked = 0;
      this.sync = true;
      this.bufferProcessing = false;
      this.onwrite = function(er) {
        onwrite(stream, er);
      };
      this.writecb = null;
      this.writelen = 0;
      this.bufferedRequest = null;
      this.lastBufferedRequest = null;
      this.pendingcb = 0;
      this.prefinished = false;
      this.errorEmitted = false;
      this.bufferedRequestCount = 0;
      this.corkedRequestsFree = new CorkedRequest(this);
    }
    WritableState.prototype.getBuffer = function getBuffer() {
      var current = this.bufferedRequest;
      var out = [];
      while (current) {
        out.push(current);
        current = current.next;
      }
      return out;
    };
    (function() {
      try {
        Object.defineProperty(WritableState.prototype, "buffer", {
          get: internalUtil.deprecate(function() {
            return this.getBuffer();
          }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
        });
      } catch (_) {
      }
    })();
    var realHasInstance;
    if (typeof Symbol === "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === "function") {
      realHasInstance = Function.prototype[Symbol.hasInstance];
      Object.defineProperty(Writable, Symbol.hasInstance, {
        value: function(object) {
          if (realHasInstance.call(this, object))
            return true;
          if (this !== Writable)
            return false;
          return object && object._writableState instanceof WritableState;
        }
      });
    } else {
      realHasInstance = function(object) {
        return object instanceof this;
      };
    }
    function Writable(options) {
      Duplex = Duplex || require_stream_duplex();
      if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
        return new Writable(options);
      }
      this._writableState = new WritableState(options, this);
      this.writable = true;
      if (options) {
        if (typeof options.write === "function")
          this._write = options.write;
        if (typeof options.writev === "function")
          this._writev = options.writev;
        if (typeof options.destroy === "function")
          this._destroy = options.destroy;
        if (typeof options.final === "function")
          this._final = options.final;
      }
      Stream.call(this);
    }
    Writable.prototype.pipe = function() {
      this.emit("error", new Error("Cannot pipe, not readable"));
    };
    function writeAfterEnd(stream, cb) {
      var er = new Error("write after end");
      stream.emit("error", er);
      pna.nextTick(cb, er);
    }
    function validChunk(stream, state, chunk, cb) {
      var valid = true;
      var er = false;
      if (chunk === null) {
        er = new TypeError("May not write null values to stream");
      } else if (typeof chunk !== "string" && chunk !== void 0 && !state.objectMode) {
        er = new TypeError("Invalid non-string/buffer chunk");
      }
      if (er) {
        stream.emit("error", er);
        pna.nextTick(cb, er);
        valid = false;
      }
      return valid;
    }
    Writable.prototype.write = function(chunk, encoding, cb) {
      var state = this._writableState;
      var ret = false;
      var isBuf = !state.objectMode && _isUint8Array(chunk);
      if (isBuf && !Buffer2.isBuffer(chunk)) {
        chunk = _uint8ArrayToBuffer(chunk);
      }
      if (typeof encoding === "function") {
        cb = encoding;
        encoding = null;
      }
      if (isBuf)
        encoding = "buffer";
      else if (!encoding)
        encoding = state.defaultEncoding;
      if (typeof cb !== "function")
        cb = nop;
      if (state.ended)
        writeAfterEnd(this, cb);
      else if (isBuf || validChunk(this, state, chunk, cb)) {
        state.pendingcb++;
        ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
      }
      return ret;
    };
    Writable.prototype.cork = function() {
      var state = this._writableState;
      state.corked++;
    };
    Writable.prototype.uncork = function() {
      var state = this._writableState;
      if (state.corked) {
        state.corked--;
        if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest)
          clearBuffer(this, state);
      }
    };
    Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
      if (typeof encoding === "string")
        encoding = encoding.toLowerCase();
      if (!(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((encoding + "").toLowerCase()) > -1))
        throw new TypeError("Unknown encoding: " + encoding);
      this._writableState.defaultEncoding = encoding;
      return this;
    };
    function decodeChunk(state, chunk, encoding) {
      if (!state.objectMode && state.decodeStrings !== false && typeof chunk === "string") {
        chunk = Buffer2.from(chunk, encoding);
      }
      return chunk;
    }
    Object.defineProperty(Writable.prototype, "writableHighWaterMark", {
      enumerable: false,
      get: function() {
        return this._writableState.highWaterMark;
      }
    });
    function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
      if (!isBuf) {
        var newChunk = decodeChunk(state, chunk, encoding);
        if (chunk !== newChunk) {
          isBuf = true;
          encoding = "buffer";
          chunk = newChunk;
        }
      }
      var len = state.objectMode ? 1 : chunk.length;
      state.length += len;
      var ret = state.length < state.highWaterMark;
      if (!ret)
        state.needDrain = true;
      if (state.writing || state.corked) {
        var last = state.lastBufferedRequest;
        state.lastBufferedRequest = {
          chunk,
          encoding,
          isBuf,
          callback: cb,
          next: null
        };
        if (last) {
          last.next = state.lastBufferedRequest;
        } else {
          state.bufferedRequest = state.lastBufferedRequest;
        }
        state.bufferedRequestCount += 1;
      } else {
        doWrite(stream, state, false, len, chunk, encoding, cb);
      }
      return ret;
    }
    function doWrite(stream, state, writev, len, chunk, encoding, cb) {
      state.writelen = len;
      state.writecb = cb;
      state.writing = true;
      state.sync = true;
      if (writev)
        stream._writev(chunk, state.onwrite);
      else
        stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }
    function onwriteError(stream, state, sync, er, cb) {
      --state.pendingcb;
      if (sync) {
        pna.nextTick(cb, er);
        pna.nextTick(finishMaybe, stream, state);
        stream._writableState.errorEmitted = true;
        stream.emit("error", er);
      } else {
        cb(er);
        stream._writableState.errorEmitted = true;
        stream.emit("error", er);
        finishMaybe(stream, state);
      }
    }
    function onwriteStateUpdate(state) {
      state.writing = false;
      state.writecb = null;
      state.length -= state.writelen;
      state.writelen = 0;
    }
    function onwrite(stream, er) {
      var state = stream._writableState;
      var sync = state.sync;
      var cb = state.writecb;
      onwriteStateUpdate(state);
      if (er)
        onwriteError(stream, state, sync, er, cb);
      else {
        var finished = needFinish(state);
        if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
          clearBuffer(stream, state);
        }
        if (sync) {
          asyncWrite(afterWrite, stream, state, finished, cb);
        } else {
          afterWrite(stream, state, finished, cb);
        }
      }
    }
    function afterWrite(stream, state, finished, cb) {
      if (!finished)
        onwriteDrain(stream, state);
      state.pendingcb--;
      cb();
      finishMaybe(stream, state);
    }
    function onwriteDrain(stream, state) {
      if (state.length === 0 && state.needDrain) {
        state.needDrain = false;
        stream.emit("drain");
      }
    }
    function clearBuffer(stream, state) {
      state.bufferProcessing = true;
      var entry = state.bufferedRequest;
      if (stream._writev && entry && entry.next) {
        var l = state.bufferedRequestCount;
        var buffer = new Array(l);
        var holder = state.corkedRequestsFree;
        holder.entry = entry;
        var count = 0;
        var allBuffers = true;
        while (entry) {
          buffer[count] = entry;
          if (!entry.isBuf)
            allBuffers = false;
          entry = entry.next;
          count += 1;
        }
        buffer.allBuffers = allBuffers;
        doWrite(stream, state, true, state.length, buffer, "", holder.finish);
        state.pendingcb++;
        state.lastBufferedRequest = null;
        if (holder.next) {
          state.corkedRequestsFree = holder.next;
          holder.next = null;
        } else {
          state.corkedRequestsFree = new CorkedRequest(state);
        }
        state.bufferedRequestCount = 0;
      } else {
        while (entry) {
          var chunk = entry.chunk;
          var encoding = entry.encoding;
          var cb = entry.callback;
          var len = state.objectMode ? 1 : chunk.length;
          doWrite(stream, state, false, len, chunk, encoding, cb);
          entry = entry.next;
          state.bufferedRequestCount--;
          if (state.writing) {
            break;
          }
        }
        if (entry === null)
          state.lastBufferedRequest = null;
      }
      state.bufferedRequest = entry;
      state.bufferProcessing = false;
    }
    Writable.prototype._write = function(chunk, encoding, cb) {
      cb(new Error("_write() is not implemented"));
    };
    Writable.prototype._writev = null;
    Writable.prototype.end = function(chunk, encoding, cb) {
      var state = this._writableState;
      if (typeof chunk === "function") {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === "function") {
        cb = encoding;
        encoding = null;
      }
      if (chunk !== null && chunk !== void 0)
        this.write(chunk, encoding);
      if (state.corked) {
        state.corked = 1;
        this.uncork();
      }
      if (!state.ending)
        endWritable(this, state, cb);
    };
    function needFinish(state) {
      return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
    }
    function callFinal(stream, state) {
      stream._final(function(err) {
        state.pendingcb--;
        if (err) {
          stream.emit("error", err);
        }
        state.prefinished = true;
        stream.emit("prefinish");
        finishMaybe(stream, state);
      });
    }
    function prefinish(stream, state) {
      if (!state.prefinished && !state.finalCalled) {
        if (typeof stream._final === "function") {
          state.pendingcb++;
          state.finalCalled = true;
          pna.nextTick(callFinal, stream, state);
        } else {
          state.prefinished = true;
          stream.emit("prefinish");
        }
      }
    }
    function finishMaybe(stream, state) {
      var need = needFinish(state);
      if (need) {
        prefinish(stream, state);
        if (state.pendingcb === 0) {
          state.finished = true;
          stream.emit("finish");
        }
      }
      return need;
    }
    function endWritable(stream, state, cb) {
      state.ending = true;
      finishMaybe(stream, state);
      if (cb) {
        if (state.finished)
          pna.nextTick(cb);
        else
          stream.once("finish", cb);
      }
      state.ended = true;
      stream.writable = false;
    }
    function onCorkedFinish(corkReq, state, err) {
      var entry = corkReq.entry;
      corkReq.entry = null;
      while (entry) {
        var cb = entry.callback;
        state.pendingcb--;
        cb(err);
        entry = entry.next;
      }
      state.corkedRequestsFree.next = corkReq;
    }
    Object.defineProperty(Writable.prototype, "destroyed", {
      get: function() {
        if (this._writableState === void 0) {
          return false;
        }
        return this._writableState.destroyed;
      },
      set: function(value) {
        if (!this._writableState) {
          return;
        }
        this._writableState.destroyed = value;
      }
    });
    Writable.prototype.destroy = destroyImpl.destroy;
    Writable.prototype._undestroy = destroyImpl.undestroy;
    Writable.prototype._destroy = function(err, cb) {
      this.end();
      cb(err);
    };
  }
});

// node_modules/readable-stream/lib/_stream_duplex.js
var require_stream_duplex = __commonJS({
  "node_modules/readable-stream/lib/_stream_duplex.js"(exports, module) {
    "use strict";
    var pna = require_process_nextick_args();
    var objectKeys = Object.keys || function(obj) {
      var keys2 = [];
      for (var key in obj) {
        keys2.push(key);
      }
      return keys2;
    };
    module.exports = Duplex;
    var util = Object.create(require_util());
    util.inherits = require_inherits();
    var Readable = require_stream_readable();
    var Writable = require_stream_writable();
    util.inherits(Duplex, Readable);
    {
      keys = objectKeys(Writable.prototype);
      for (v = 0; v < keys.length; v++) {
        method = keys[v];
        if (!Duplex.prototype[method])
          Duplex.prototype[method] = Writable.prototype[method];
      }
    }
    var keys;
    var method;
    var v;
    function Duplex(options) {
      if (!(this instanceof Duplex))
        return new Duplex(options);
      Readable.call(this, options);
      Writable.call(this, options);
      if (options && options.readable === false)
        this.readable = false;
      if (options && options.writable === false)
        this.writable = false;
      this.allowHalfOpen = true;
      if (options && options.allowHalfOpen === false)
        this.allowHalfOpen = false;
      this.once("end", onend);
    }
    Object.defineProperty(Duplex.prototype, "writableHighWaterMark", {
      enumerable: false,
      get: function() {
        return this._writableState.highWaterMark;
      }
    });
    function onend() {
      if (this.allowHalfOpen || this._writableState.ended)
        return;
      pna.nextTick(onEndNT, this);
    }
    function onEndNT(self2) {
      self2.end();
    }
    Object.defineProperty(Duplex.prototype, "destroyed", {
      get: function() {
        if (this._readableState === void 0 || this._writableState === void 0) {
          return false;
        }
        return this._readableState.destroyed && this._writableState.destroyed;
      },
      set: function(value) {
        if (this._readableState === void 0 || this._writableState === void 0) {
          return;
        }
        this._readableState.destroyed = value;
        this._writableState.destroyed = value;
      }
    });
    Duplex.prototype._destroy = function(err, cb) {
      this.push(null);
      this.end();
      pna.nextTick(cb, err);
    };
  }
});

// node_modules/string_decoder/node_modules/safe-buffer/index.js
var require_safe_buffer2 = __commonJS({
  "node_modules/string_decoder/node_modules/safe-buffer/index.js"(exports, module) {
    var buffer = __require("buffer");
    var Buffer2 = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module.exports = buffer;
    } else {
      copyProps(buffer, exports);
      exports.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  }
});

// node_modules/string_decoder/lib/string_decoder.js
var require_string_decoder = __commonJS({
  "node_modules/string_decoder/lib/string_decoder.js"(exports) {
    "use strict";
    var Buffer2 = require_safe_buffer2().Buffer;
    var isEncoding = Buffer2.isEncoding || function(encoding) {
      encoding = "" + encoding;
      switch (encoding && encoding.toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
        case "raw":
          return true;
        default:
          return false;
      }
    };
    function _normalizeEncoding(enc) {
      if (!enc)
        return "utf8";
      var retried;
      while (true) {
        switch (enc) {
          case "utf8":
          case "utf-8":
            return "utf8";
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return "utf16le";
          case "latin1":
          case "binary":
            return "latin1";
          case "base64":
          case "ascii":
          case "hex":
            return enc;
          default:
            if (retried)
              return;
            enc = ("" + enc).toLowerCase();
            retried = true;
        }
      }
    }
    function normalizeEncoding(enc) {
      var nenc = _normalizeEncoding(enc);
      if (typeof nenc !== "string" && (Buffer2.isEncoding === isEncoding || !isEncoding(enc)))
        throw new Error("Unknown encoding: " + enc);
      return nenc || enc;
    }
    exports.StringDecoder = StringDecoder;
    function StringDecoder(encoding) {
      this.encoding = normalizeEncoding(encoding);
      var nb;
      switch (this.encoding) {
        case "utf16le":
          this.text = utf16Text;
          this.end = utf16End;
          nb = 4;
          break;
        case "utf8":
          this.fillLast = utf8FillLast;
          nb = 4;
          break;
        case "base64":
          this.text = base64Text;
          this.end = base64End;
          nb = 3;
          break;
        default:
          this.write = simpleWrite;
          this.end = simpleEnd;
          return;
      }
      this.lastNeed = 0;
      this.lastTotal = 0;
      this.lastChar = Buffer2.allocUnsafe(nb);
    }
    StringDecoder.prototype.write = function(buf) {
      if (buf.length === 0)
        return "";
      var r;
      var i;
      if (this.lastNeed) {
        r = this.fillLast(buf);
        if (r === void 0)
          return "";
        i = this.lastNeed;
        this.lastNeed = 0;
      } else {
        i = 0;
      }
      if (i < buf.length)
        return r ? r + this.text(buf, i) : this.text(buf, i);
      return r || "";
    };
    StringDecoder.prototype.end = utf8End;
    StringDecoder.prototype.text = utf8Text;
    StringDecoder.prototype.fillLast = function(buf) {
      if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
      }
      buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
      this.lastNeed -= buf.length;
    };
    function utf8CheckByte(byte) {
      if (byte <= 127)
        return 0;
      else if (byte >> 5 === 6)
        return 2;
      else if (byte >> 4 === 14)
        return 3;
      else if (byte >> 3 === 30)
        return 4;
      return byte >> 6 === 2 ? -1 : -2;
    }
    function utf8CheckIncomplete(self2, buf, i) {
      var j = buf.length - 1;
      if (j < i)
        return 0;
      var nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0)
          self2.lastNeed = nb - 1;
        return nb;
      }
      if (--j < i || nb === -2)
        return 0;
      nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0)
          self2.lastNeed = nb - 2;
        return nb;
      }
      if (--j < i || nb === -2)
        return 0;
      nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0) {
          if (nb === 2)
            nb = 0;
          else
            self2.lastNeed = nb - 3;
        }
        return nb;
      }
      return 0;
    }
    function utf8CheckExtraBytes(self2, buf, p) {
      if ((buf[0] & 192) !== 128) {
        self2.lastNeed = 0;
        return "\uFFFD";
      }
      if (self2.lastNeed > 1 && buf.length > 1) {
        if ((buf[1] & 192) !== 128) {
          self2.lastNeed = 1;
          return "\uFFFD";
        }
        if (self2.lastNeed > 2 && buf.length > 2) {
          if ((buf[2] & 192) !== 128) {
            self2.lastNeed = 2;
            return "\uFFFD";
          }
        }
      }
    }
    function utf8FillLast(buf) {
      var p = this.lastTotal - this.lastNeed;
      var r = utf8CheckExtraBytes(this, buf, p);
      if (r !== void 0)
        return r;
      if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, p, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
      }
      buf.copy(this.lastChar, p, 0, buf.length);
      this.lastNeed -= buf.length;
    }
    function utf8Text(buf, i) {
      var total = utf8CheckIncomplete(this, buf, i);
      if (!this.lastNeed)
        return buf.toString("utf8", i);
      this.lastTotal = total;
      var end = buf.length - (total - this.lastNeed);
      buf.copy(this.lastChar, 0, end);
      return buf.toString("utf8", i, end);
    }
    function utf8End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed)
        return r + "\uFFFD";
      return r;
    }
    function utf16Text(buf, i) {
      if ((buf.length - i) % 2 === 0) {
        var r = buf.toString("utf16le", i);
        if (r) {
          var c = r.charCodeAt(r.length - 1);
          if (c >= 55296 && c <= 56319) {
            this.lastNeed = 2;
            this.lastTotal = 4;
            this.lastChar[0] = buf[buf.length - 2];
            this.lastChar[1] = buf[buf.length - 1];
            return r.slice(0, -1);
          }
        }
        return r;
      }
      this.lastNeed = 1;
      this.lastTotal = 2;
      this.lastChar[0] = buf[buf.length - 1];
      return buf.toString("utf16le", i, buf.length - 1);
    }
    function utf16End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed) {
        var end = this.lastTotal - this.lastNeed;
        return r + this.lastChar.toString("utf16le", 0, end);
      }
      return r;
    }
    function base64Text(buf, i) {
      var n = (buf.length - i) % 3;
      if (n === 0)
        return buf.toString("base64", i);
      this.lastNeed = 3 - n;
      this.lastTotal = 3;
      if (n === 1) {
        this.lastChar[0] = buf[buf.length - 1];
      } else {
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
      }
      return buf.toString("base64", i, buf.length - n);
    }
    function base64End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed)
        return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
      return r;
    }
    function simpleWrite(buf) {
      return buf.toString(this.encoding);
    }
    function simpleEnd(buf) {
      return buf && buf.length ? this.write(buf) : "";
    }
  }
});

// node_modules/readable-stream/lib/_stream_readable.js
var require_stream_readable = __commonJS({
  "node_modules/readable-stream/lib/_stream_readable.js"(exports, module) {
    "use strict";
    var pna = require_process_nextick_args();
    module.exports = Readable;
    var isArray = require_isarray();
    var Duplex;
    Readable.ReadableState = ReadableState;
    var EE = __require("events").EventEmitter;
    var EElistenerCount = function(emitter, type) {
      return emitter.listeners(type).length;
    };
    var Stream = require_stream();
    var Buffer2 = require_safe_buffer().Buffer;
    var OurUint8Array = (typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : {}).Uint8Array || function() {
    };
    function _uint8ArrayToBuffer(chunk) {
      return Buffer2.from(chunk);
    }
    function _isUint8Array(obj) {
      return Buffer2.isBuffer(obj) || obj instanceof OurUint8Array;
    }
    var util = Object.create(require_util());
    util.inherits = require_inherits();
    var debugUtil = __require("util");
    var debug = void 0;
    if (debugUtil && debugUtil.debuglog) {
      debug = debugUtil.debuglog("stream");
    } else {
      debug = function() {
      };
    }
    var BufferList = require_BufferList();
    var destroyImpl = require_destroy();
    var StringDecoder;
    util.inherits(Readable, Stream);
    var kProxyEvents = ["error", "close", "destroy", "pause", "resume"];
    function prependListener(emitter, event, fn) {
      if (typeof emitter.prependListener === "function")
        return emitter.prependListener(event, fn);
      if (!emitter._events || !emitter._events[event])
        emitter.on(event, fn);
      else if (isArray(emitter._events[event]))
        emitter._events[event].unshift(fn);
      else
        emitter._events[event] = [fn, emitter._events[event]];
    }
    function ReadableState(options, stream) {
      Duplex = Duplex || require_stream_duplex();
      options = options || {};
      var isDuplex = stream instanceof Duplex;
      this.objectMode = !!options.objectMode;
      if (isDuplex)
        this.objectMode = this.objectMode || !!options.readableObjectMode;
      var hwm = options.highWaterMark;
      var readableHwm = options.readableHighWaterMark;
      var defaultHwm = this.objectMode ? 16 : 16 * 1024;
      if (hwm || hwm === 0)
        this.highWaterMark = hwm;
      else if (isDuplex && (readableHwm || readableHwm === 0))
        this.highWaterMark = readableHwm;
      else
        this.highWaterMark = defaultHwm;
      this.highWaterMark = Math.floor(this.highWaterMark);
      this.buffer = new BufferList();
      this.length = 0;
      this.pipes = null;
      this.pipesCount = 0;
      this.flowing = null;
      this.ended = false;
      this.endEmitted = false;
      this.reading = false;
      this.sync = true;
      this.needReadable = false;
      this.emittedReadable = false;
      this.readableListening = false;
      this.resumeScheduled = false;
      this.destroyed = false;
      this.defaultEncoding = options.defaultEncoding || "utf8";
      this.awaitDrain = 0;
      this.readingMore = false;
      this.decoder = null;
      this.encoding = null;
      if (options.encoding) {
        if (!StringDecoder)
          StringDecoder = require_string_decoder().StringDecoder;
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    function Readable(options) {
      Duplex = Duplex || require_stream_duplex();
      if (!(this instanceof Readable))
        return new Readable(options);
      this._readableState = new ReadableState(options, this);
      this.readable = true;
      if (options) {
        if (typeof options.read === "function")
          this._read = options.read;
        if (typeof options.destroy === "function")
          this._destroy = options.destroy;
      }
      Stream.call(this);
    }
    Object.defineProperty(Readable.prototype, "destroyed", {
      get: function() {
        if (this._readableState === void 0) {
          return false;
        }
        return this._readableState.destroyed;
      },
      set: function(value) {
        if (!this._readableState) {
          return;
        }
        this._readableState.destroyed = value;
      }
    });
    Readable.prototype.destroy = destroyImpl.destroy;
    Readable.prototype._undestroy = destroyImpl.undestroy;
    Readable.prototype._destroy = function(err, cb) {
      this.push(null);
      cb(err);
    };
    Readable.prototype.push = function(chunk, encoding) {
      var state = this._readableState;
      var skipChunkCheck;
      if (!state.objectMode) {
        if (typeof chunk === "string") {
          encoding = encoding || state.defaultEncoding;
          if (encoding !== state.encoding) {
            chunk = Buffer2.from(chunk, encoding);
            encoding = "";
          }
          skipChunkCheck = true;
        }
      } else {
        skipChunkCheck = true;
      }
      return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
    };
    Readable.prototype.unshift = function(chunk) {
      return readableAddChunk(this, chunk, null, true, false);
    };
    function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
      var state = stream._readableState;
      if (chunk === null) {
        state.reading = false;
        onEofChunk(stream, state);
      } else {
        var er;
        if (!skipChunkCheck)
          er = chunkInvalid(state, chunk);
        if (er) {
          stream.emit("error", er);
        } else if (state.objectMode || chunk && chunk.length > 0) {
          if (typeof chunk !== "string" && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer2.prototype) {
            chunk = _uint8ArrayToBuffer(chunk);
          }
          if (addToFront) {
            if (state.endEmitted)
              stream.emit("error", new Error("stream.unshift() after end event"));
            else
              addChunk(stream, state, chunk, true);
          } else if (state.ended) {
            stream.emit("error", new Error("stream.push() after EOF"));
          } else {
            state.reading = false;
            if (state.decoder && !encoding) {
              chunk = state.decoder.write(chunk);
              if (state.objectMode || chunk.length !== 0)
                addChunk(stream, state, chunk, false);
              else
                maybeReadMore(stream, state);
            } else {
              addChunk(stream, state, chunk, false);
            }
          }
        } else if (!addToFront) {
          state.reading = false;
        }
      }
      return needMoreData(state);
    }
    function addChunk(stream, state, chunk, addToFront) {
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit("data", chunk);
        stream.read(0);
      } else {
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);
        if (state.needReadable)
          emitReadable(stream);
      }
      maybeReadMore(stream, state);
    }
    function chunkInvalid(state, chunk) {
      var er;
      if (!_isUint8Array(chunk) && typeof chunk !== "string" && chunk !== void 0 && !state.objectMode) {
        er = new TypeError("Invalid non-string/buffer chunk");
      }
      return er;
    }
    function needMoreData(state) {
      return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
    }
    Readable.prototype.isPaused = function() {
      return this._readableState.flowing === false;
    };
    Readable.prototype.setEncoding = function(enc) {
      if (!StringDecoder)
        StringDecoder = require_string_decoder().StringDecoder;
      this._readableState.decoder = new StringDecoder(enc);
      this._readableState.encoding = enc;
      return this;
    };
    var MAX_HWM = 8388608;
    function computeNewHighWaterMark(n) {
      if (n >= MAX_HWM) {
        n = MAX_HWM;
      } else {
        n--;
        n |= n >>> 1;
        n |= n >>> 2;
        n |= n >>> 4;
        n |= n >>> 8;
        n |= n >>> 16;
        n++;
      }
      return n;
    }
    function howMuchToRead(n, state) {
      if (n <= 0 || state.length === 0 && state.ended)
        return 0;
      if (state.objectMode)
        return 1;
      if (n !== n) {
        if (state.flowing && state.length)
          return state.buffer.head.data.length;
        else
          return state.length;
      }
      if (n > state.highWaterMark)
        state.highWaterMark = computeNewHighWaterMark(n);
      if (n <= state.length)
        return n;
      if (!state.ended) {
        state.needReadable = true;
        return 0;
      }
      return state.length;
    }
    Readable.prototype.read = function(n) {
      debug("read", n);
      n = parseInt(n, 10);
      var state = this._readableState;
      var nOrig = n;
      if (n !== 0)
        state.emittedReadable = false;
      if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
        debug("read: emitReadable", state.length, state.ended);
        if (state.length === 0 && state.ended)
          endReadable(this);
        else
          emitReadable(this);
        return null;
      }
      n = howMuchToRead(n, state);
      if (n === 0 && state.ended) {
        if (state.length === 0)
          endReadable(this);
        return null;
      }
      var doRead = state.needReadable;
      debug("need readable", doRead);
      if (state.length === 0 || state.length - n < state.highWaterMark) {
        doRead = true;
        debug("length less than watermark", doRead);
      }
      if (state.ended || state.reading) {
        doRead = false;
        debug("reading or ended", doRead);
      } else if (doRead) {
        debug("do read");
        state.reading = true;
        state.sync = true;
        if (state.length === 0)
          state.needReadable = true;
        this._read(state.highWaterMark);
        state.sync = false;
        if (!state.reading)
          n = howMuchToRead(nOrig, state);
      }
      var ret;
      if (n > 0)
        ret = fromList(n, state);
      else
        ret = null;
      if (ret === null) {
        state.needReadable = true;
        n = 0;
      } else {
        state.length -= n;
      }
      if (state.length === 0) {
        if (!state.ended)
          state.needReadable = true;
        if (nOrig !== n && state.ended)
          endReadable(this);
      }
      if (ret !== null)
        this.emit("data", ret);
      return ret;
    };
    function onEofChunk(stream, state) {
      if (state.ended)
        return;
      if (state.decoder) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) {
          state.buffer.push(chunk);
          state.length += state.objectMode ? 1 : chunk.length;
        }
      }
      state.ended = true;
      emitReadable(stream);
    }
    function emitReadable(stream) {
      var state = stream._readableState;
      state.needReadable = false;
      if (!state.emittedReadable) {
        debug("emitReadable", state.flowing);
        state.emittedReadable = true;
        if (state.sync)
          pna.nextTick(emitReadable_, stream);
        else
          emitReadable_(stream);
      }
    }
    function emitReadable_(stream) {
      debug("emit readable");
      stream.emit("readable");
      flow(stream);
    }
    function maybeReadMore(stream, state) {
      if (!state.readingMore) {
        state.readingMore = true;
        pna.nextTick(maybeReadMore_, stream, state);
      }
    }
    function maybeReadMore_(stream, state) {
      var len = state.length;
      while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
        debug("maybeReadMore read 0");
        stream.read(0);
        if (len === state.length)
          break;
        else
          len = state.length;
      }
      state.readingMore = false;
    }
    Readable.prototype._read = function(n) {
      this.emit("error", new Error("_read() is not implemented"));
    };
    Readable.prototype.pipe = function(dest, pipeOpts) {
      var src = this;
      var state = this._readableState;
      switch (state.pipesCount) {
        case 0:
          state.pipes = dest;
          break;
        case 1:
          state.pipes = [state.pipes, dest];
          break;
        default:
          state.pipes.push(dest);
          break;
      }
      state.pipesCount += 1;
      debug("pipe count=%d opts=%j", state.pipesCount, pipeOpts);
      var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
      var endFn = doEnd ? onend : unpipe;
      if (state.endEmitted)
        pna.nextTick(endFn);
      else
        src.once("end", endFn);
      dest.on("unpipe", onunpipe);
      function onunpipe(readable, unpipeInfo) {
        debug("onunpipe");
        if (readable === src) {
          if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
            unpipeInfo.hasUnpiped = true;
            cleanup();
          }
        }
      }
      function onend() {
        debug("onend");
        dest.end();
      }
      var ondrain = pipeOnDrain(src);
      dest.on("drain", ondrain);
      var cleanedUp = false;
      function cleanup() {
        debug("cleanup");
        dest.removeListener("close", onclose);
        dest.removeListener("finish", onfinish);
        dest.removeListener("drain", ondrain);
        dest.removeListener("error", onerror);
        dest.removeListener("unpipe", onunpipe);
        src.removeListener("end", onend);
        src.removeListener("end", unpipe);
        src.removeListener("data", ondata);
        cleanedUp = true;
        if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain))
          ondrain();
      }
      var increasedAwaitDrain = false;
      src.on("data", ondata);
      function ondata(chunk) {
        debug("ondata");
        increasedAwaitDrain = false;
        var ret = dest.write(chunk);
        if (ret === false && !increasedAwaitDrain) {
          if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
            debug("false write response, pause", state.awaitDrain);
            state.awaitDrain++;
            increasedAwaitDrain = true;
          }
          src.pause();
        }
      }
      function onerror(er) {
        debug("onerror", er);
        unpipe();
        dest.removeListener("error", onerror);
        if (EElistenerCount(dest, "error") === 0)
          dest.emit("error", er);
      }
      prependListener(dest, "error", onerror);
      function onclose() {
        dest.removeListener("finish", onfinish);
        unpipe();
      }
      dest.once("close", onclose);
      function onfinish() {
        debug("onfinish");
        dest.removeListener("close", onclose);
        unpipe();
      }
      dest.once("finish", onfinish);
      function unpipe() {
        debug("unpipe");
        src.unpipe(dest);
      }
      dest.emit("pipe", src);
      if (!state.flowing) {
        debug("pipe resume");
        src.resume();
      }
      return dest;
    };
    function pipeOnDrain(src) {
      return function() {
        var state = src._readableState;
        debug("pipeOnDrain", state.awaitDrain);
        if (state.awaitDrain)
          state.awaitDrain--;
        if (state.awaitDrain === 0 && EElistenerCount(src, "data")) {
          state.flowing = true;
          flow(src);
        }
      };
    }
    Readable.prototype.unpipe = function(dest) {
      var state = this._readableState;
      var unpipeInfo = { hasUnpiped: false };
      if (state.pipesCount === 0)
        return this;
      if (state.pipesCount === 1) {
        if (dest && dest !== state.pipes)
          return this;
        if (!dest)
          dest = state.pipes;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        if (dest)
          dest.emit("unpipe", this, unpipeInfo);
        return this;
      }
      if (!dest) {
        var dests = state.pipes;
        var len = state.pipesCount;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        for (var i = 0; i < len; i++) {
          dests[i].emit("unpipe", this, { hasUnpiped: false });
        }
        return this;
      }
      var index = indexOf(state.pipes, dest);
      if (index === -1)
        return this;
      state.pipes.splice(index, 1);
      state.pipesCount -= 1;
      if (state.pipesCount === 1)
        state.pipes = state.pipes[0];
      dest.emit("unpipe", this, unpipeInfo);
      return this;
    };
    Readable.prototype.on = function(ev, fn) {
      var res = Stream.prototype.on.call(this, ev, fn);
      if (ev === "data") {
        if (this._readableState.flowing !== false)
          this.resume();
      } else if (ev === "readable") {
        var state = this._readableState;
        if (!state.endEmitted && !state.readableListening) {
          state.readableListening = state.needReadable = true;
          state.emittedReadable = false;
          if (!state.reading) {
            pna.nextTick(nReadingNextTick, this);
          } else if (state.length) {
            emitReadable(this);
          }
        }
      }
      return res;
    };
    Readable.prototype.addListener = Readable.prototype.on;
    function nReadingNextTick(self2) {
      debug("readable nexttick read 0");
      self2.read(0);
    }
    Readable.prototype.resume = function() {
      var state = this._readableState;
      if (!state.flowing) {
        debug("resume");
        state.flowing = true;
        resume(this, state);
      }
      return this;
    };
    function resume(stream, state) {
      if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        pna.nextTick(resume_, stream, state);
      }
    }
    function resume_(stream, state) {
      if (!state.reading) {
        debug("resume read 0");
        stream.read(0);
      }
      state.resumeScheduled = false;
      state.awaitDrain = 0;
      stream.emit("resume");
      flow(stream);
      if (state.flowing && !state.reading)
        stream.read(0);
    }
    Readable.prototype.pause = function() {
      debug("call pause flowing=%j", this._readableState.flowing);
      if (this._readableState.flowing !== false) {
        debug("pause");
        this._readableState.flowing = false;
        this.emit("pause");
      }
      return this;
    };
    function flow(stream) {
      var state = stream._readableState;
      debug("flow", state.flowing);
      while (state.flowing && stream.read() !== null) {
      }
    }
    Readable.prototype.wrap = function(stream) {
      var _this = this;
      var state = this._readableState;
      var paused = false;
      stream.on("end", function() {
        debug("wrapped end");
        if (state.decoder && !state.ended) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length)
            _this.push(chunk);
        }
        _this.push(null);
      });
      stream.on("data", function(chunk) {
        debug("wrapped data");
        if (state.decoder)
          chunk = state.decoder.write(chunk);
        if (state.objectMode && (chunk === null || chunk === void 0))
          return;
        else if (!state.objectMode && (!chunk || !chunk.length))
          return;
        var ret = _this.push(chunk);
        if (!ret) {
          paused = true;
          stream.pause();
        }
      });
      for (var i in stream) {
        if (this[i] === void 0 && typeof stream[i] === "function") {
          this[i] = function(method) {
            return function() {
              return stream[method].apply(stream, arguments);
            };
          }(i);
        }
      }
      for (var n = 0; n < kProxyEvents.length; n++) {
        stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
      }
      this._read = function(n2) {
        debug("wrapped _read", n2);
        if (paused) {
          paused = false;
          stream.resume();
        }
      };
      return this;
    };
    Object.defineProperty(Readable.prototype, "readableHighWaterMark", {
      enumerable: false,
      get: function() {
        return this._readableState.highWaterMark;
      }
    });
    Readable._fromList = fromList;
    function fromList(n, state) {
      if (state.length === 0)
        return null;
      var ret;
      if (state.objectMode)
        ret = state.buffer.shift();
      else if (!n || n >= state.length) {
        if (state.decoder)
          ret = state.buffer.join("");
        else if (state.buffer.length === 1)
          ret = state.buffer.head.data;
        else
          ret = state.buffer.concat(state.length);
        state.buffer.clear();
      } else {
        ret = fromListPartial(n, state.buffer, state.decoder);
      }
      return ret;
    }
    function fromListPartial(n, list, hasStrings) {
      var ret;
      if (n < list.head.data.length) {
        ret = list.head.data.slice(0, n);
        list.head.data = list.head.data.slice(n);
      } else if (n === list.head.data.length) {
        ret = list.shift();
      } else {
        ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
      }
      return ret;
    }
    function copyFromBufferString(n, list) {
      var p = list.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;
      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length)
          ret += str;
        else
          ret += str.slice(0, n);
        n -= nb;
        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next)
              list.head = p.next;
            else
              list.head = list.tail = null;
          } else {
            list.head = p;
            p.data = str.slice(nb);
          }
          break;
        }
        ++c;
      }
      list.length -= c;
      return ret;
    }
    function copyFromBuffer(n, list) {
      var ret = Buffer2.allocUnsafe(n);
      var p = list.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;
      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;
        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next)
              list.head = p.next;
            else
              list.head = list.tail = null;
          } else {
            list.head = p;
            p.data = buf.slice(nb);
          }
          break;
        }
        ++c;
      }
      list.length -= c;
      return ret;
    }
    function endReadable(stream) {
      var state = stream._readableState;
      if (state.length > 0)
        throw new Error('"endReadable()" called on non-empty stream');
      if (!state.endEmitted) {
        state.ended = true;
        pna.nextTick(endReadableNT, state, stream);
      }
    }
    function endReadableNT(state, stream) {
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit("end");
      }
    }
    function indexOf(xs, x) {
      for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x)
          return i;
      }
      return -1;
    }
  }
});

// node_modules/readable-stream/lib/_stream_transform.js
var require_stream_transform = __commonJS({
  "node_modules/readable-stream/lib/_stream_transform.js"(exports, module) {
    "use strict";
    module.exports = Transform;
    var Duplex = require_stream_duplex();
    var util = Object.create(require_util());
    util.inherits = require_inherits();
    util.inherits(Transform, Duplex);
    function afterTransform(er, data) {
      var ts = this._transformState;
      ts.transforming = false;
      var cb = ts.writecb;
      if (!cb) {
        return this.emit("error", new Error("write callback called multiple times"));
      }
      ts.writechunk = null;
      ts.writecb = null;
      if (data != null)
        this.push(data);
      cb(er);
      var rs = this._readableState;
      rs.reading = false;
      if (rs.needReadable || rs.length < rs.highWaterMark) {
        this._read(rs.highWaterMark);
      }
    }
    function Transform(options) {
      if (!(this instanceof Transform))
        return new Transform(options);
      Duplex.call(this, options);
      this._transformState = {
        afterTransform: afterTransform.bind(this),
        needTransform: false,
        transforming: false,
        writecb: null,
        writechunk: null,
        writeencoding: null
      };
      this._readableState.needReadable = true;
      this._readableState.sync = false;
      if (options) {
        if (typeof options.transform === "function")
          this._transform = options.transform;
        if (typeof options.flush === "function")
          this._flush = options.flush;
      }
      this.on("prefinish", prefinish);
    }
    function prefinish() {
      var _this = this;
      if (typeof this._flush === "function") {
        this._flush(function(er, data) {
          done(_this, er, data);
        });
      } else {
        done(this, null, null);
      }
    }
    Transform.prototype.push = function(chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };
    Transform.prototype._transform = function(chunk, encoding, cb) {
      throw new Error("_transform() is not implemented");
    };
    Transform.prototype._write = function(chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark)
          this._read(rs.highWaterMark);
      }
    };
    Transform.prototype._read = function(n) {
      var ts = this._transformState;
      if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else {
        ts.needTransform = true;
      }
    };
    Transform.prototype._destroy = function(err, cb) {
      var _this2 = this;
      Duplex.prototype._destroy.call(this, err, function(err2) {
        cb(err2);
        _this2.emit("close");
      });
    };
    function done(stream, er, data) {
      if (er)
        return stream.emit("error", er);
      if (data != null)
        stream.push(data);
      if (stream._writableState.length)
        throw new Error("Calling transform done when ws.length != 0");
      if (stream._transformState.transforming)
        throw new Error("Calling transform done when still transforming");
      return stream.push(null);
    }
  }
});

// node_modules/readable-stream/lib/_stream_passthrough.js
var require_stream_passthrough = __commonJS({
  "node_modules/readable-stream/lib/_stream_passthrough.js"(exports, module) {
    "use strict";
    module.exports = PassThrough;
    var Transform = require_stream_transform();
    var util = Object.create(require_util());
    util.inherits = require_inherits();
    util.inherits(PassThrough, Transform);
    function PassThrough(options) {
      if (!(this instanceof PassThrough))
        return new PassThrough(options);
      Transform.call(this, options);
    }
    PassThrough.prototype._transform = function(chunk, encoding, cb) {
      cb(null, chunk);
    };
  }
});

// node_modules/readable-stream/readable.js
var require_readable = __commonJS({
  "node_modules/readable-stream/readable.js"(exports, module) {
    var Stream = __require("stream");
    if (process.env.READABLE_STREAM === "disable" && Stream) {
      module.exports = Stream;
      exports = module.exports = Stream.Readable;
      exports.Readable = Stream.Readable;
      exports.Writable = Stream.Writable;
      exports.Duplex = Stream.Duplex;
      exports.Transform = Stream.Transform;
      exports.PassThrough = Stream.PassThrough;
      exports.Stream = Stream;
    } else {
      exports = module.exports = require_stream_readable();
      exports.Stream = Stream || exports;
      exports.Readable = exports;
      exports.Writable = require_stream_writable();
      exports.Duplex = require_stream_duplex();
      exports.Transform = require_stream_transform();
      exports.PassThrough = require_stream_passthrough();
    }
  }
});

// node_modules/jszip/lib/support.js
var require_support = __commonJS({
  "node_modules/jszip/lib/support.js"(exports) {
    "use strict";
    exports.base64 = true;
    exports.array = true;
    exports.string = true;
    exports.arraybuffer = typeof ArrayBuffer !== "undefined" && typeof Uint8Array !== "undefined";
    exports.nodebuffer = typeof Buffer !== "undefined";
    exports.uint8array = typeof Uint8Array !== "undefined";
    if (typeof ArrayBuffer === "undefined") {
      exports.blob = false;
    } else {
      buffer = new ArrayBuffer(0);
      try {
        exports.blob = new Blob([buffer], {
          type: "application/zip"
        }).size === 0;
      } catch (e) {
        try {
          Builder = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder;
          builder = new Builder();
          builder.append(buffer);
          exports.blob = builder.getBlob("application/zip").size === 0;
        } catch (e2) {
          exports.blob = false;
        }
      }
    }
    var buffer;
    var Builder;
    var builder;
    try {
      exports.nodestream = !!require_readable().Readable;
    } catch (e) {
      exports.nodestream = false;
    }
  }
});

// node_modules/jszip/lib/base64.js
var require_base64 = __commonJS({
  "node_modules/jszip/lib/base64.js"(exports) {
    "use strict";
    var utils = require_utils();
    var support = require_support();
    var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    exports.encode = function(input) {
      var output = [];
      var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
      var i = 0, len = input.length, remainingBytes = len;
      var isArray = utils.getTypeOf(input) !== "string";
      while (i < input.length) {
        remainingBytes = len - i;
        if (!isArray) {
          chr1 = input.charCodeAt(i++);
          chr2 = i < len ? input.charCodeAt(i++) : 0;
          chr3 = i < len ? input.charCodeAt(i++) : 0;
        } else {
          chr1 = input[i++];
          chr2 = i < len ? input[i++] : 0;
          chr3 = i < len ? input[i++] : 0;
        }
        enc1 = chr1 >> 2;
        enc2 = (chr1 & 3) << 4 | chr2 >> 4;
        enc3 = remainingBytes > 1 ? (chr2 & 15) << 2 | chr3 >> 6 : 64;
        enc4 = remainingBytes > 2 ? chr3 & 63 : 64;
        output.push(_keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4));
      }
      return output.join("");
    };
    exports.decode = function(input) {
      var chr1, chr2, chr3;
      var enc1, enc2, enc3, enc4;
      var i = 0, resultIndex = 0;
      var dataUrlPrefix = "data:";
      if (input.substr(0, dataUrlPrefix.length) === dataUrlPrefix) {
        throw new Error("Invalid base64 input, it looks like a data url.");
      }
      input = input.replace(/[^A-Za-z0-9+/=]/g, "");
      var totalLength = input.length * 3 / 4;
      if (input.charAt(input.length - 1) === _keyStr.charAt(64)) {
        totalLength--;
      }
      if (input.charAt(input.length - 2) === _keyStr.charAt(64)) {
        totalLength--;
      }
      if (totalLength % 1 !== 0) {
        throw new Error("Invalid base64 input, bad content length.");
      }
      var output;
      if (support.uint8array) {
        output = new Uint8Array(totalLength | 0);
      } else {
        output = new Array(totalLength | 0);
      }
      while (i < input.length) {
        enc1 = _keyStr.indexOf(input.charAt(i++));
        enc2 = _keyStr.indexOf(input.charAt(i++));
        enc3 = _keyStr.indexOf(input.charAt(i++));
        enc4 = _keyStr.indexOf(input.charAt(i++));
        chr1 = enc1 << 2 | enc2 >> 4;
        chr2 = (enc2 & 15) << 4 | enc3 >> 2;
        chr3 = (enc3 & 3) << 6 | enc4;
        output[resultIndex++] = chr1;
        if (enc3 !== 64) {
          output[resultIndex++] = chr2;
        }
        if (enc4 !== 64) {
          output[resultIndex++] = chr3;
        }
      }
      return output;
    };
  }
});

// node_modules/jszip/lib/nodejsUtils.js
var require_nodejsUtils = __commonJS({
  "node_modules/jszip/lib/nodejsUtils.js"(exports, module) {
    "use strict";
    module.exports = {
      isNode: typeof Buffer !== "undefined",
      newBufferFrom: function(data, encoding) {
        if (Buffer.from && Buffer.from !== Uint8Array.from) {
          return Buffer.from(data, encoding);
        } else {
          if (typeof data === "number") {
            throw new Error('The "data" argument must not be a number');
          }
          return new Buffer(data, encoding);
        }
      },
      allocBuffer: function(size) {
        if (Buffer.alloc) {
          return Buffer.alloc(size);
        } else {
          var buf = new Buffer(size);
          buf.fill(0);
          return buf;
        }
      },
      isBuffer: function(b) {
        return Buffer.isBuffer(b);
      },
      isStream: function(obj) {
        return obj && typeof obj.on === "function" && typeof obj.pause === "function" && typeof obj.resume === "function";
      }
    };
  }
});

// node_modules/immediate/lib/index.js
var require_lib = __commonJS({
  "node_modules/immediate/lib/index.js"(exports, module) {
    "use strict";
    var Mutation = global.MutationObserver || global.WebKitMutationObserver;
    var scheduleDrain;
    if (process.browser) {
      if (Mutation) {
        called = 0;
        observer = new Mutation(nextTick);
        element = global.document.createTextNode("");
        observer.observe(element, {
          characterData: true
        });
        scheduleDrain = function() {
          element.data = called = ++called % 2;
        };
      } else if (!global.setImmediate && typeof global.MessageChannel !== "undefined") {
        channel = new global.MessageChannel();
        channel.port1.onmessage = nextTick;
        scheduleDrain = function() {
          channel.port2.postMessage(0);
        };
      } else if ("document" in global && "onreadystatechange" in global.document.createElement("script")) {
        scheduleDrain = function() {
          var scriptEl = global.document.createElement("script");
          scriptEl.onreadystatechange = function() {
            nextTick();
            scriptEl.onreadystatechange = null;
            scriptEl.parentNode.removeChild(scriptEl);
            scriptEl = null;
          };
          global.document.documentElement.appendChild(scriptEl);
        };
      } else {
        scheduleDrain = function() {
          setTimeout(nextTick, 0);
        };
      }
    } else {
      scheduleDrain = function() {
        process.nextTick(nextTick);
      };
    }
    var called;
    var observer;
    var element;
    var channel;
    var draining;
    var queue = [];
    function nextTick() {
      draining = true;
      var i, oldQueue;
      var len = queue.length;
      while (len) {
        oldQueue = queue;
        queue = [];
        i = -1;
        while (++i < len) {
          oldQueue[i]();
        }
        len = queue.length;
      }
      draining = false;
    }
    module.exports = immediate;
    function immediate(task) {
      if (queue.push(task) === 1 && !draining) {
        scheduleDrain();
      }
    }
  }
});

// node_modules/lie/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/lie/lib/index.js"(exports, module) {
    "use strict";
    var immediate = require_lib();
    function INTERNAL() {
    }
    var handlers = {};
    var REJECTED = ["REJECTED"];
    var FULFILLED = ["FULFILLED"];
    var PENDING = ["PENDING"];
    if (!process.browser) {
      UNHANDLED = ["UNHANDLED"];
    }
    var UNHANDLED;
    module.exports = Promise2;
    function Promise2(resolver) {
      if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function");
      }
      this.state = PENDING;
      this.queue = [];
      this.outcome = void 0;
      if (!process.browser) {
        this.handled = UNHANDLED;
      }
      if (resolver !== INTERNAL) {
        safelyResolveThenable(this, resolver);
      }
    }
    Promise2.prototype.finally = function(callback) {
      if (typeof callback !== "function") {
        return this;
      }
      var p = this.constructor;
      return this.then(resolve2, reject2);
      function resolve2(value) {
        function yes() {
          return value;
        }
        return p.resolve(callback()).then(yes);
      }
      function reject2(reason) {
        function no() {
          throw reason;
        }
        return p.resolve(callback()).then(no);
      }
    };
    Promise2.prototype.catch = function(onRejected) {
      return this.then(null, onRejected);
    };
    Promise2.prototype.then = function(onFulfilled, onRejected) {
      if (typeof onFulfilled !== "function" && this.state === FULFILLED || typeof onRejected !== "function" && this.state === REJECTED) {
        return this;
      }
      var promise = new this.constructor(INTERNAL);
      if (!process.browser) {
        if (this.handled === UNHANDLED) {
          this.handled = null;
        }
      }
      if (this.state !== PENDING) {
        var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
        unwrap(promise, resolver, this.outcome);
      } else {
        this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
      }
      return promise;
    };
    function QueueItem(promise, onFulfilled, onRejected) {
      this.promise = promise;
      if (typeof onFulfilled === "function") {
        this.onFulfilled = onFulfilled;
        this.callFulfilled = this.otherCallFulfilled;
      }
      if (typeof onRejected === "function") {
        this.onRejected = onRejected;
        this.callRejected = this.otherCallRejected;
      }
    }
    QueueItem.prototype.callFulfilled = function(value) {
      handlers.resolve(this.promise, value);
    };
    QueueItem.prototype.otherCallFulfilled = function(value) {
      unwrap(this.promise, this.onFulfilled, value);
    };
    QueueItem.prototype.callRejected = function(value) {
      handlers.reject(this.promise, value);
    };
    QueueItem.prototype.otherCallRejected = function(value) {
      unwrap(this.promise, this.onRejected, value);
    };
    function unwrap(promise, func, value) {
      immediate(function() {
        var returnValue;
        try {
          returnValue = func(value);
        } catch (e) {
          return handlers.reject(promise, e);
        }
        if (returnValue === promise) {
          handlers.reject(promise, new TypeError("Cannot resolve promise with itself"));
        } else {
          handlers.resolve(promise, returnValue);
        }
      });
    }
    handlers.resolve = function(self2, value) {
      var result = tryCatch(getThen, value);
      if (result.status === "error") {
        return handlers.reject(self2, result.value);
      }
      var thenable = result.value;
      if (thenable) {
        safelyResolveThenable(self2, thenable);
      } else {
        self2.state = FULFILLED;
        self2.outcome = value;
        var i = -1;
        var len = self2.queue.length;
        while (++i < len) {
          self2.queue[i].callFulfilled(value);
        }
      }
      return self2;
    };
    handlers.reject = function(self2, error) {
      self2.state = REJECTED;
      self2.outcome = error;
      if (!process.browser) {
        if (self2.handled === UNHANDLED) {
          immediate(function() {
            if (self2.handled === UNHANDLED) {
              process.emit("unhandledRejection", error, self2);
            }
          });
        }
      }
      var i = -1;
      var len = self2.queue.length;
      while (++i < len) {
        self2.queue[i].callRejected(error);
      }
      return self2;
    };
    function getThen(obj) {
      var then = obj && obj.then;
      if (obj && (typeof obj === "object" || typeof obj === "function") && typeof then === "function") {
        return function appyThen() {
          then.apply(obj, arguments);
        };
      }
    }
    function safelyResolveThenable(self2, thenable) {
      var called = false;
      function onError(value) {
        if (called) {
          return;
        }
        called = true;
        handlers.reject(self2, value);
      }
      function onSuccess(value) {
        if (called) {
          return;
        }
        called = true;
        handlers.resolve(self2, value);
      }
      function tryToUnwrap() {
        thenable(onSuccess, onError);
      }
      var result = tryCatch(tryToUnwrap);
      if (result.status === "error") {
        onError(result.value);
      }
    }
    function tryCatch(func, value) {
      var out = {};
      try {
        out.value = func(value);
        out.status = "success";
      } catch (e) {
        out.status = "error";
        out.value = e;
      }
      return out;
    }
    Promise2.resolve = resolve;
    function resolve(value) {
      if (value instanceof this) {
        return value;
      }
      return handlers.resolve(new this(INTERNAL), value);
    }
    Promise2.reject = reject;
    function reject(reason) {
      var promise = new this(INTERNAL);
      return handlers.reject(promise, reason);
    }
    Promise2.all = all;
    function all(iterable) {
      var self2 = this;
      if (Object.prototype.toString.call(iterable) !== "[object Array]") {
        return this.reject(new TypeError("must be an array"));
      }
      var len = iterable.length;
      var called = false;
      if (!len) {
        return this.resolve([]);
      }
      var values = new Array(len);
      var resolved = 0;
      var i = -1;
      var promise = new this(INTERNAL);
      while (++i < len) {
        allResolver(iterable[i], i);
      }
      return promise;
      function allResolver(value, i2) {
        self2.resolve(value).then(resolveFromAll, function(error) {
          if (!called) {
            called = true;
            handlers.reject(promise, error);
          }
        });
        function resolveFromAll(outValue) {
          values[i2] = outValue;
          if (++resolved === len && !called) {
            called = true;
            handlers.resolve(promise, values);
          }
        }
      }
    }
    Promise2.race = race;
    function race(iterable) {
      var self2 = this;
      if (Object.prototype.toString.call(iterable) !== "[object Array]") {
        return this.reject(new TypeError("must be an array"));
      }
      var len = iterable.length;
      var called = false;
      if (!len) {
        return this.resolve([]);
      }
      var i = -1;
      var promise = new this(INTERNAL);
      while (++i < len) {
        resolver(iterable[i]);
      }
      return promise;
      function resolver(value) {
        self2.resolve(value).then(function(response) {
          if (!called) {
            called = true;
            handlers.resolve(promise, response);
          }
        }, function(error) {
          if (!called) {
            called = true;
            handlers.reject(promise, error);
          }
        });
      }
    }
  }
});

// node_modules/jszip/lib/external.js
var require_external = __commonJS({
  "node_modules/jszip/lib/external.js"(exports, module) {
    "use strict";
    var ES6Promise = null;
    if (typeof Promise !== "undefined") {
      ES6Promise = Promise;
    } else {
      ES6Promise = require_lib2();
    }
    module.exports = {
      Promise: ES6Promise
    };
  }
});

// node_modules/setimmediate/setImmediate.js
var require_setImmediate = __commonJS({
  "node_modules/setimmediate/setImmediate.js"(exports) {
    (function(global2, undefined2) {
      "use strict";
      if (global2.setImmediate) {
        return;
      }
      var nextHandle = 1;
      var tasksByHandle = {};
      var currentlyRunningATask = false;
      var doc = global2.document;
      var registerImmediate;
      function setImmediate2(callback) {
        if (typeof callback !== "function") {
          callback = new Function("" + callback);
        }
        var args = new Array(arguments.length - 1);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
        }
        var task = { callback, args };
        tasksByHandle[nextHandle] = task;
        registerImmediate(nextHandle);
        return nextHandle++;
      }
      function clearImmediate(handle) {
        delete tasksByHandle[handle];
      }
      function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
          case 0:
            callback();
            break;
          case 1:
            callback(args[0]);
            break;
          case 2:
            callback(args[0], args[1]);
            break;
          case 3:
            callback(args[0], args[1], args[2]);
            break;
          default:
            callback.apply(undefined2, args);
            break;
        }
      }
      function runIfPresent(handle) {
        if (currentlyRunningATask) {
          setTimeout(runIfPresent, 0, handle);
        } else {
          var task = tasksByHandle[handle];
          if (task) {
            currentlyRunningATask = true;
            try {
              run(task);
            } finally {
              clearImmediate(handle);
              currentlyRunningATask = false;
            }
          }
        }
      }
      function installNextTickImplementation() {
        registerImmediate = function(handle) {
          process.nextTick(function() {
            runIfPresent(handle);
          });
        };
      }
      function canUsePostMessage() {
        if (global2.postMessage && !global2.importScripts) {
          var postMessageIsAsynchronous = true;
          var oldOnMessage = global2.onmessage;
          global2.onmessage = function() {
            postMessageIsAsynchronous = false;
          };
          global2.postMessage("", "*");
          global2.onmessage = oldOnMessage;
          return postMessageIsAsynchronous;
        }
      }
      function installPostMessageImplementation() {
        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
          if (event.source === global2 && typeof event.data === "string" && event.data.indexOf(messagePrefix) === 0) {
            runIfPresent(+event.data.slice(messagePrefix.length));
          }
        };
        if (global2.addEventListener) {
          global2.addEventListener("message", onGlobalMessage, false);
        } else {
          global2.attachEvent("onmessage", onGlobalMessage);
        }
        registerImmediate = function(handle) {
          global2.postMessage(messagePrefix + handle, "*");
        };
      }
      function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
          var handle = event.data;
          runIfPresent(handle);
        };
        registerImmediate = function(handle) {
          channel.port2.postMessage(handle);
        };
      }
      function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
          var script = doc.createElement("script");
          script.onreadystatechange = function() {
            runIfPresent(handle);
            script.onreadystatechange = null;
            html.removeChild(script);
            script = null;
          };
          html.appendChild(script);
        };
      }
      function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
          setTimeout(runIfPresent, 0, handle);
        };
      }
      var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global2);
      attachTo = attachTo && attachTo.setTimeout ? attachTo : global2;
      if ({}.toString.call(global2.process) === "[object process]") {
        installNextTickImplementation();
      } else if (canUsePostMessage()) {
        installPostMessageImplementation();
      } else if (global2.MessageChannel) {
        installMessageChannelImplementation();
      } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        installReadyStateChangeImplementation();
      } else {
        installSetTimeoutImplementation();
      }
      attachTo.setImmediate = setImmediate2;
      attachTo.clearImmediate = clearImmediate;
    })(typeof self === "undefined" ? typeof global === "undefined" ? exports : global : self);
  }
});

// node_modules/jszip/lib/utils.js
var require_utils = __commonJS({
  "node_modules/jszip/lib/utils.js"(exports) {
    "use strict";
    var support = require_support();
    var base64 = require_base64();
    var nodejsUtils = require_nodejsUtils();
    var external = require_external();
    require_setImmediate();
    function string2binary(str) {
      var result = null;
      if (support.uint8array) {
        result = new Uint8Array(str.length);
      } else {
        result = new Array(str.length);
      }
      return stringToArrayLike(str, result);
    }
    exports.newBlob = function(part, type) {
      exports.checkSupport("blob");
      try {
        return new Blob([part], {
          type
        });
      } catch (e) {
        try {
          var Builder = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder;
          var builder = new Builder();
          builder.append(part);
          return builder.getBlob(type);
        } catch (e2) {
          throw new Error("Bug : can't construct the Blob.");
        }
      }
    };
    function identity(input) {
      return input;
    }
    function stringToArrayLike(str, array) {
      for (var i = 0; i < str.length; ++i) {
        array[i] = str.charCodeAt(i) & 255;
      }
      return array;
    }
    var arrayToStringHelper = {
      stringifyByChunk: function(array, type, chunk) {
        var result = [], k = 0, len = array.length;
        if (len <= chunk) {
          return String.fromCharCode.apply(null, array);
        }
        while (k < len) {
          if (type === "array" || type === "nodebuffer") {
            result.push(String.fromCharCode.apply(null, array.slice(k, Math.min(k + chunk, len))));
          } else {
            result.push(String.fromCharCode.apply(null, array.subarray(k, Math.min(k + chunk, len))));
          }
          k += chunk;
        }
        return result.join("");
      },
      stringifyByChar: function(array) {
        var resultStr = "";
        for (var i = 0; i < array.length; i++) {
          resultStr += String.fromCharCode(array[i]);
        }
        return resultStr;
      },
      applyCanBeUsed: {
        uint8array: function() {
          try {
            return support.uint8array && String.fromCharCode.apply(null, new Uint8Array(1)).length === 1;
          } catch (e) {
            return false;
          }
        }(),
        nodebuffer: function() {
          try {
            return support.nodebuffer && String.fromCharCode.apply(null, nodejsUtils.allocBuffer(1)).length === 1;
          } catch (e) {
            return false;
          }
        }()
      }
    };
    function arrayLikeToString(array) {
      var chunk = 65536, type = exports.getTypeOf(array), canUseApply = true;
      if (type === "uint8array") {
        canUseApply = arrayToStringHelper.applyCanBeUsed.uint8array;
      } else if (type === "nodebuffer") {
        canUseApply = arrayToStringHelper.applyCanBeUsed.nodebuffer;
      }
      if (canUseApply) {
        while (chunk > 1) {
          try {
            return arrayToStringHelper.stringifyByChunk(array, type, chunk);
          } catch (e) {
            chunk = Math.floor(chunk / 2);
          }
        }
      }
      return arrayToStringHelper.stringifyByChar(array);
    }
    exports.applyFromCharCode = arrayLikeToString;
    function arrayLikeToArrayLike(arrayFrom, arrayTo) {
      for (var i = 0; i < arrayFrom.length; i++) {
        arrayTo[i] = arrayFrom[i];
      }
      return arrayTo;
    }
    var transform = {};
    transform["string"] = {
      "string": identity,
      "array": function(input) {
        return stringToArrayLike(input, new Array(input.length));
      },
      "arraybuffer": function(input) {
        return transform["string"]["uint8array"](input).buffer;
      },
      "uint8array": function(input) {
        return stringToArrayLike(input, new Uint8Array(input.length));
      },
      "nodebuffer": function(input) {
        return stringToArrayLike(input, nodejsUtils.allocBuffer(input.length));
      }
    };
    transform["array"] = {
      "string": arrayLikeToString,
      "array": identity,
      "arraybuffer": function(input) {
        return new Uint8Array(input).buffer;
      },
      "uint8array": function(input) {
        return new Uint8Array(input);
      },
      "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(input);
      }
    };
    transform["arraybuffer"] = {
      "string": function(input) {
        return arrayLikeToString(new Uint8Array(input));
      },
      "array": function(input) {
        return arrayLikeToArrayLike(new Uint8Array(input), new Array(input.byteLength));
      },
      "arraybuffer": identity,
      "uint8array": function(input) {
        return new Uint8Array(input);
      },
      "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(new Uint8Array(input));
      }
    };
    transform["uint8array"] = {
      "string": arrayLikeToString,
      "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
      },
      "arraybuffer": function(input) {
        return input.buffer;
      },
      "uint8array": identity,
      "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(input);
      }
    };
    transform["nodebuffer"] = {
      "string": arrayLikeToString,
      "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
      },
      "arraybuffer": function(input) {
        return transform["nodebuffer"]["uint8array"](input).buffer;
      },
      "uint8array": function(input) {
        return arrayLikeToArrayLike(input, new Uint8Array(input.length));
      },
      "nodebuffer": identity
    };
    exports.transformTo = function(outputType, input) {
      if (!input) {
        input = "";
      }
      if (!outputType) {
        return input;
      }
      exports.checkSupport(outputType);
      var inputType = exports.getTypeOf(input);
      var result = transform[inputType][outputType](input);
      return result;
    };
    exports.resolve = function(path) {
      var parts = path.split("/");
      var result = [];
      for (var index = 0; index < parts.length; index++) {
        var part = parts[index];
        if (part === "." || part === "" && index !== 0 && index !== parts.length - 1) {
          continue;
        } else if (part === "..") {
          result.pop();
        } else {
          result.push(part);
        }
      }
      return result.join("/");
    };
    exports.getTypeOf = function(input) {
      if (typeof input === "string") {
        return "string";
      }
      if (Object.prototype.toString.call(input) === "[object Array]") {
        return "array";
      }
      if (support.nodebuffer && nodejsUtils.isBuffer(input)) {
        return "nodebuffer";
      }
      if (support.uint8array && input instanceof Uint8Array) {
        return "uint8array";
      }
      if (support.arraybuffer && input instanceof ArrayBuffer) {
        return "arraybuffer";
      }
    };
    exports.checkSupport = function(type) {
      var supported = support[type.toLowerCase()];
      if (!supported) {
        throw new Error(type + " is not supported by this platform");
      }
    };
    exports.MAX_VALUE_16BITS = 65535;
    exports.MAX_VALUE_32BITS = -1;
    exports.pretty = function(str) {
      var res = "", code, i;
      for (i = 0; i < (str || "").length; i++) {
        code = str.charCodeAt(i);
        res += "\\x" + (code < 16 ? "0" : "") + code.toString(16).toUpperCase();
      }
      return res;
    };
    exports.delay = function(callback, args, self2) {
      setImmediate(function() {
        callback.apply(self2 || null, args || []);
      });
    };
    exports.inherits = function(ctor, superCtor) {
      var Obj = function() {
      };
      Obj.prototype = superCtor.prototype;
      ctor.prototype = new Obj();
    };
    exports.extend = function() {
      var result = {}, i, attr;
      for (i = 0; i < arguments.length; i++) {
        for (attr in arguments[i]) {
          if (Object.prototype.hasOwnProperty.call(arguments[i], attr) && typeof result[attr] === "undefined") {
            result[attr] = arguments[i][attr];
          }
        }
      }
      return result;
    };
    exports.prepareContent = function(name, inputData, isBinary, isOptimizedBinaryString, isBase64) {
      var promise = external.Promise.resolve(inputData).then(function(data) {
        var isBlob = support.blob && (data instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(data)) !== -1);
        if (isBlob && typeof FileReader !== "undefined") {
          return new external.Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) {
              resolve(e.target.result);
            };
            reader.onerror = function(e) {
              reject(e.target.error);
            };
            reader.readAsArrayBuffer(data);
          });
        } else {
          return data;
        }
      });
      return promise.then(function(data) {
        var dataType = exports.getTypeOf(data);
        if (!dataType) {
          return external.Promise.reject(new Error("Can't read the data of '" + name + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
        }
        if (dataType === "arraybuffer") {
          data = exports.transformTo("uint8array", data);
        } else if (dataType === "string") {
          if (isBase64) {
            data = base64.decode(data);
          } else if (isBinary) {
            if (isOptimizedBinaryString !== true) {
              data = string2binary(data);
            }
          }
        }
        return data;
      });
    };
  }
});

// node_modules/jszip/lib/stream/GenericWorker.js
var require_GenericWorker = __commonJS({
  "node_modules/jszip/lib/stream/GenericWorker.js"(exports, module) {
    "use strict";
    function GenericWorker(name) {
      this.name = name || "default";
      this.streamInfo = {};
      this.generatedError = null;
      this.extraStreamInfo = {};
      this.isPaused = true;
      this.isFinished = false;
      this.isLocked = false;
      this._listeners = {
        "data": [],
        "end": [],
        "error": []
      };
      this.previous = null;
    }
    GenericWorker.prototype = {
      push: function(chunk) {
        this.emit("data", chunk);
      },
      end: function() {
        if (this.isFinished) {
          return false;
        }
        this.flush();
        try {
          this.emit("end");
          this.cleanUp();
          this.isFinished = true;
        } catch (e) {
          this.emit("error", e);
        }
        return true;
      },
      error: function(e) {
        if (this.isFinished) {
          return false;
        }
        if (this.isPaused) {
          this.generatedError = e;
        } else {
          this.isFinished = true;
          this.emit("error", e);
          if (this.previous) {
            this.previous.error(e);
          }
          this.cleanUp();
        }
        return true;
      },
      on: function(name, listener) {
        this._listeners[name].push(listener);
        return this;
      },
      cleanUp: function() {
        this.streamInfo = this.generatedError = this.extraStreamInfo = null;
        this._listeners = [];
      },
      emit: function(name, arg) {
        if (this._listeners[name]) {
          for (var i = 0; i < this._listeners[name].length; i++) {
            this._listeners[name][i].call(this, arg);
          }
        }
      },
      pipe: function(next) {
        return next.registerPrevious(this);
      },
      registerPrevious: function(previous) {
        if (this.isLocked) {
          throw new Error("The stream '" + this + "' has already been used.");
        }
        this.streamInfo = previous.streamInfo;
        this.mergeStreamInfo();
        this.previous = previous;
        var self2 = this;
        previous.on("data", function(chunk) {
          self2.processChunk(chunk);
        });
        previous.on("end", function() {
          self2.end();
        });
        previous.on("error", function(e) {
          self2.error(e);
        });
        return this;
      },
      pause: function() {
        if (this.isPaused || this.isFinished) {
          return false;
        }
        this.isPaused = true;
        if (this.previous) {
          this.previous.pause();
        }
        return true;
      },
      resume: function() {
        if (!this.isPaused || this.isFinished) {
          return false;
        }
        this.isPaused = false;
        var withError = false;
        if (this.generatedError) {
          this.error(this.generatedError);
          withError = true;
        }
        if (this.previous) {
          this.previous.resume();
        }
        return !withError;
      },
      flush: function() {
      },
      processChunk: function(chunk) {
        this.push(chunk);
      },
      withStreamInfo: function(key, value) {
        this.extraStreamInfo[key] = value;
        this.mergeStreamInfo();
        return this;
      },
      mergeStreamInfo: function() {
        for (var key in this.extraStreamInfo) {
          if (!Object.prototype.hasOwnProperty.call(this.extraStreamInfo, key)) {
            continue;
          }
          this.streamInfo[key] = this.extraStreamInfo[key];
        }
      },
      lock: function() {
        if (this.isLocked) {
          throw new Error("The stream '" + this + "' has already been used.");
        }
        this.isLocked = true;
        if (this.previous) {
          this.previous.lock();
        }
      },
      toString: function() {
        var me = "Worker " + this.name;
        if (this.previous) {
          return this.previous + " -> " + me;
        } else {
          return me;
        }
      }
    };
    module.exports = GenericWorker;
  }
});

// node_modules/jszip/lib/utf8.js
var require_utf8 = __commonJS({
  "node_modules/jszip/lib/utf8.js"(exports) {
    "use strict";
    var utils = require_utils();
    var support = require_support();
    var nodejsUtils = require_nodejsUtils();
    var GenericWorker = require_GenericWorker();
    var _utf8len = new Array(256);
    for (i = 0; i < 256; i++) {
      _utf8len[i] = i >= 252 ? 6 : i >= 248 ? 5 : i >= 240 ? 4 : i >= 224 ? 3 : i >= 192 ? 2 : 1;
    }
    var i;
    _utf8len[254] = _utf8len[254] = 1;
    var string2buf = function(str) {
      var buf, c, c2, m_pos, i2, str_len = str.length, buf_len = 0;
      for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
      }
      if (support.uint8array) {
        buf = new Uint8Array(buf_len);
      } else {
        buf = new Array(buf_len);
      }
      for (i2 = 0, m_pos = 0; i2 < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        if (c < 128) {
          buf[i2++] = c;
        } else if (c < 2048) {
          buf[i2++] = 192 | c >>> 6;
          buf[i2++] = 128 | c & 63;
        } else if (c < 65536) {
          buf[i2++] = 224 | c >>> 12;
          buf[i2++] = 128 | c >>> 6 & 63;
          buf[i2++] = 128 | c & 63;
        } else {
          buf[i2++] = 240 | c >>> 18;
          buf[i2++] = 128 | c >>> 12 & 63;
          buf[i2++] = 128 | c >>> 6 & 63;
          buf[i2++] = 128 | c & 63;
        }
      }
      return buf;
    };
    var utf8border = function(buf, max) {
      var pos;
      max = max || buf.length;
      if (max > buf.length) {
        max = buf.length;
      }
      pos = max - 1;
      while (pos >= 0 && (buf[pos] & 192) === 128) {
        pos--;
      }
      if (pos < 0) {
        return max;
      }
      if (pos === 0) {
        return max;
      }
      return pos + _utf8len[buf[pos]] > max ? pos : max;
    };
    var buf2string = function(buf) {
      var i2, out, c, c_len;
      var len = buf.length;
      var utf16buf = new Array(len * 2);
      for (out = 0, i2 = 0; i2 < len; ) {
        c = buf[i2++];
        if (c < 128) {
          utf16buf[out++] = c;
          continue;
        }
        c_len = _utf8len[c];
        if (c_len > 4) {
          utf16buf[out++] = 65533;
          i2 += c_len - 1;
          continue;
        }
        c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
        while (c_len > 1 && i2 < len) {
          c = c << 6 | buf[i2++] & 63;
          c_len--;
        }
        if (c_len > 1) {
          utf16buf[out++] = 65533;
          continue;
        }
        if (c < 65536) {
          utf16buf[out++] = c;
        } else {
          c -= 65536;
          utf16buf[out++] = 55296 | c >> 10 & 1023;
          utf16buf[out++] = 56320 | c & 1023;
        }
      }
      if (utf16buf.length !== out) {
        if (utf16buf.subarray) {
          utf16buf = utf16buf.subarray(0, out);
        } else {
          utf16buf.length = out;
        }
      }
      return utils.applyFromCharCode(utf16buf);
    };
    exports.utf8encode = function utf8encode(str) {
      if (support.nodebuffer) {
        return nodejsUtils.newBufferFrom(str, "utf-8");
      }
      return string2buf(str);
    };
    exports.utf8decode = function utf8decode(buf) {
      if (support.nodebuffer) {
        return utils.transformTo("nodebuffer", buf).toString("utf-8");
      }
      buf = utils.transformTo(support.uint8array ? "uint8array" : "array", buf);
      return buf2string(buf);
    };
    function Utf8DecodeWorker() {
      GenericWorker.call(this, "utf-8 decode");
      this.leftOver = null;
    }
    utils.inherits(Utf8DecodeWorker, GenericWorker);
    Utf8DecodeWorker.prototype.processChunk = function(chunk) {
      var data = utils.transformTo(support.uint8array ? "uint8array" : "array", chunk.data);
      if (this.leftOver && this.leftOver.length) {
        if (support.uint8array) {
          var previousData = data;
          data = new Uint8Array(previousData.length + this.leftOver.length);
          data.set(this.leftOver, 0);
          data.set(previousData, this.leftOver.length);
        } else {
          data = this.leftOver.concat(data);
        }
        this.leftOver = null;
      }
      var nextBoundary = utf8border(data);
      var usableData = data;
      if (nextBoundary !== data.length) {
        if (support.uint8array) {
          usableData = data.subarray(0, nextBoundary);
          this.leftOver = data.subarray(nextBoundary, data.length);
        } else {
          usableData = data.slice(0, nextBoundary);
          this.leftOver = data.slice(nextBoundary, data.length);
        }
      }
      this.push({
        data: exports.utf8decode(usableData),
        meta: chunk.meta
      });
    };
    Utf8DecodeWorker.prototype.flush = function() {
      if (this.leftOver && this.leftOver.length) {
        this.push({
          data: exports.utf8decode(this.leftOver),
          meta: {}
        });
        this.leftOver = null;
      }
    };
    exports.Utf8DecodeWorker = Utf8DecodeWorker;
    function Utf8EncodeWorker() {
      GenericWorker.call(this, "utf-8 encode");
    }
    utils.inherits(Utf8EncodeWorker, GenericWorker);
    Utf8EncodeWorker.prototype.processChunk = function(chunk) {
      this.push({
        data: exports.utf8encode(chunk.data),
        meta: chunk.meta
      });
    };
    exports.Utf8EncodeWorker = Utf8EncodeWorker;
  }
});

// node_modules/jszip/lib/stream/ConvertWorker.js
var require_ConvertWorker = __commonJS({
  "node_modules/jszip/lib/stream/ConvertWorker.js"(exports, module) {
    "use strict";
    var GenericWorker = require_GenericWorker();
    var utils = require_utils();
    function ConvertWorker(destType) {
      GenericWorker.call(this, "ConvertWorker to " + destType);
      this.destType = destType;
    }
    utils.inherits(ConvertWorker, GenericWorker);
    ConvertWorker.prototype.processChunk = function(chunk) {
      this.push({
        data: utils.transformTo(this.destType, chunk.data),
        meta: chunk.meta
      });
    };
    module.exports = ConvertWorker;
  }
});

// node_modules/jszip/lib/nodejs/NodejsStreamOutputAdapter.js
var require_NodejsStreamOutputAdapter = __commonJS({
  "node_modules/jszip/lib/nodejs/NodejsStreamOutputAdapter.js"(exports, module) {
    "use strict";
    var Readable = require_readable().Readable;
    var utils = require_utils();
    utils.inherits(NodejsStreamOutputAdapter, Readable);
    function NodejsStreamOutputAdapter(helper, options, updateCb) {
      Readable.call(this, options);
      this._helper = helper;
      var self2 = this;
      helper.on("data", function(data, meta) {
        if (!self2.push(data)) {
          self2._helper.pause();
        }
        if (updateCb) {
          updateCb(meta);
        }
      }).on("error", function(e) {
        self2.emit("error", e);
      }).on("end", function() {
        self2.push(null);
      });
    }
    NodejsStreamOutputAdapter.prototype._read = function() {
      this._helper.resume();
    };
    module.exports = NodejsStreamOutputAdapter;
  }
});

// node_modules/jszip/lib/stream/StreamHelper.js
var require_StreamHelper = __commonJS({
  "node_modules/jszip/lib/stream/StreamHelper.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var ConvertWorker = require_ConvertWorker();
    var GenericWorker = require_GenericWorker();
    var base64 = require_base64();
    var support = require_support();
    var external = require_external();
    var NodejsStreamOutputAdapter = null;
    if (support.nodestream) {
      try {
        NodejsStreamOutputAdapter = require_NodejsStreamOutputAdapter();
      } catch (e) {
      }
    }
    function transformZipOutput(type, content, mimeType) {
      switch (type) {
        case "blob":
          return utils.newBlob(utils.transformTo("arraybuffer", content), mimeType);
        case "base64":
          return base64.encode(content);
        default:
          return utils.transformTo(type, content);
      }
    }
    function concat(type, dataArray) {
      var i, index = 0, res = null, totalLength = 0;
      for (i = 0; i < dataArray.length; i++) {
        totalLength += dataArray[i].length;
      }
      switch (type) {
        case "string":
          return dataArray.join("");
        case "array":
          return Array.prototype.concat.apply([], dataArray);
        case "uint8array":
          res = new Uint8Array(totalLength);
          for (i = 0; i < dataArray.length; i++) {
            res.set(dataArray[i], index);
            index += dataArray[i].length;
          }
          return res;
        case "nodebuffer":
          return Buffer.concat(dataArray);
        default:
          throw new Error("concat : unsupported type '" + type + "'");
      }
    }
    function accumulate(helper, updateCallback) {
      return new external.Promise(function(resolve, reject) {
        var dataArray = [];
        var chunkType = helper._internalType, resultType = helper._outputType, mimeType = helper._mimeType;
        helper.on("data", function(data, meta) {
          dataArray.push(data);
          if (updateCallback) {
            updateCallback(meta);
          }
        }).on("error", function(err) {
          dataArray = [];
          reject(err);
        }).on("end", function() {
          try {
            var result = transformZipOutput(resultType, concat(chunkType, dataArray), mimeType);
            resolve(result);
          } catch (e) {
            reject(e);
          }
          dataArray = [];
        }).resume();
      });
    }
    function StreamHelper(worker, outputType, mimeType) {
      var internalType = outputType;
      switch (outputType) {
        case "blob":
        case "arraybuffer":
          internalType = "uint8array";
          break;
        case "base64":
          internalType = "string";
          break;
      }
      try {
        this._internalType = internalType;
        this._outputType = outputType;
        this._mimeType = mimeType;
        utils.checkSupport(internalType);
        this._worker = worker.pipe(new ConvertWorker(internalType));
        worker.lock();
      } catch (e) {
        this._worker = new GenericWorker("error");
        this._worker.error(e);
      }
    }
    StreamHelper.prototype = {
      accumulate: function(updateCb) {
        return accumulate(this, updateCb);
      },
      on: function(evt, fn) {
        var self2 = this;
        if (evt === "data") {
          this._worker.on(evt, function(chunk) {
            fn.call(self2, chunk.data, chunk.meta);
          });
        } else {
          this._worker.on(evt, function() {
            utils.delay(fn, arguments, self2);
          });
        }
        return this;
      },
      resume: function() {
        utils.delay(this._worker.resume, [], this._worker);
        return this;
      },
      pause: function() {
        this._worker.pause();
        return this;
      },
      toNodejsStream: function(updateCb) {
        utils.checkSupport("nodestream");
        if (this._outputType !== "nodebuffer") {
          throw new Error(this._outputType + " is not supported by this method");
        }
        return new NodejsStreamOutputAdapter(this, {
          objectMode: this._outputType !== "nodebuffer"
        }, updateCb);
      }
    };
    module.exports = StreamHelper;
  }
});

// node_modules/jszip/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/jszip/lib/defaults.js"(exports) {
    "use strict";
    exports.base64 = false;
    exports.binary = false;
    exports.dir = false;
    exports.createFolders = true;
    exports.date = null;
    exports.compression = null;
    exports.compressionOptions = null;
    exports.comment = null;
    exports.unixPermissions = null;
    exports.dosPermissions = null;
  }
});

// node_modules/jszip/lib/stream/DataWorker.js
var require_DataWorker = __commonJS({
  "node_modules/jszip/lib/stream/DataWorker.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var GenericWorker = require_GenericWorker();
    var DEFAULT_BLOCK_SIZE = 16 * 1024;
    function DataWorker(dataP) {
      GenericWorker.call(this, "DataWorker");
      var self2 = this;
      this.dataIsReady = false;
      this.index = 0;
      this.max = 0;
      this.data = null;
      this.type = "";
      this._tickScheduled = false;
      dataP.then(function(data) {
        self2.dataIsReady = true;
        self2.data = data;
        self2.max = data && data.length || 0;
        self2.type = utils.getTypeOf(data);
        if (!self2.isPaused) {
          self2._tickAndRepeat();
        }
      }, function(e) {
        self2.error(e);
      });
    }
    utils.inherits(DataWorker, GenericWorker);
    DataWorker.prototype.cleanUp = function() {
      GenericWorker.prototype.cleanUp.call(this);
      this.data = null;
    };
    DataWorker.prototype.resume = function() {
      if (!GenericWorker.prototype.resume.call(this)) {
        return false;
      }
      if (!this._tickScheduled && this.dataIsReady) {
        this._tickScheduled = true;
        utils.delay(this._tickAndRepeat, [], this);
      }
      return true;
    };
    DataWorker.prototype._tickAndRepeat = function() {
      this._tickScheduled = false;
      if (this.isPaused || this.isFinished) {
        return;
      }
      this._tick();
      if (!this.isFinished) {
        utils.delay(this._tickAndRepeat, [], this);
        this._tickScheduled = true;
      }
    };
    DataWorker.prototype._tick = function() {
      if (this.isPaused || this.isFinished) {
        return false;
      }
      var size = DEFAULT_BLOCK_SIZE;
      var data = null, nextIndex = Math.min(this.max, this.index + size);
      if (this.index >= this.max) {
        return this.end();
      } else {
        switch (this.type) {
          case "string":
            data = this.data.substring(this.index, nextIndex);
            break;
          case "uint8array":
            data = this.data.subarray(this.index, nextIndex);
            break;
          case "array":
          case "nodebuffer":
            data = this.data.slice(this.index, nextIndex);
            break;
        }
        this.index = nextIndex;
        return this.push({
          data,
          meta: {
            percent: this.max ? this.index / this.max * 100 : 0
          }
        });
      }
    };
    module.exports = DataWorker;
  }
});

// node_modules/jszip/lib/crc32.js
var require_crc32 = __commonJS({
  "node_modules/jszip/lib/crc32.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    function makeTable() {
      var c, table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
        }
        table[n] = c;
      }
      return table;
    }
    var crcTable = makeTable();
    function crc32(crc, buf, len, pos) {
      var t = crcTable, end = pos + len;
      crc = crc ^ -1;
      for (var i = pos; i < end; i++) {
        crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
      }
      return crc ^ -1;
    }
    function crc32str(crc, str, len, pos) {
      var t = crcTable, end = pos + len;
      crc = crc ^ -1;
      for (var i = pos; i < end; i++) {
        crc = crc >>> 8 ^ t[(crc ^ str.charCodeAt(i)) & 255];
      }
      return crc ^ -1;
    }
    module.exports = function crc32wrapper(input, crc) {
      if (typeof input === "undefined" || !input.length) {
        return 0;
      }
      var isArray = utils.getTypeOf(input) !== "string";
      if (isArray) {
        return crc32(crc | 0, input, input.length, 0);
      } else {
        return crc32str(crc | 0, input, input.length, 0);
      }
    };
  }
});

// node_modules/jszip/lib/stream/Crc32Probe.js
var require_Crc32Probe = __commonJS({
  "node_modules/jszip/lib/stream/Crc32Probe.js"(exports, module) {
    "use strict";
    var GenericWorker = require_GenericWorker();
    var crc32 = require_crc32();
    var utils = require_utils();
    function Crc32Probe() {
      GenericWorker.call(this, "Crc32Probe");
      this.withStreamInfo("crc32", 0);
    }
    utils.inherits(Crc32Probe, GenericWorker);
    Crc32Probe.prototype.processChunk = function(chunk) {
      this.streamInfo.crc32 = crc32(chunk.data, this.streamInfo.crc32 || 0);
      this.push(chunk);
    };
    module.exports = Crc32Probe;
  }
});

// node_modules/jszip/lib/stream/DataLengthProbe.js
var require_DataLengthProbe = __commonJS({
  "node_modules/jszip/lib/stream/DataLengthProbe.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var GenericWorker = require_GenericWorker();
    function DataLengthProbe(propName) {
      GenericWorker.call(this, "DataLengthProbe for " + propName);
      this.propName = propName;
      this.withStreamInfo(propName, 0);
    }
    utils.inherits(DataLengthProbe, GenericWorker);
    DataLengthProbe.prototype.processChunk = function(chunk) {
      if (chunk) {
        var length = this.streamInfo[this.propName] || 0;
        this.streamInfo[this.propName] = length + chunk.data.length;
      }
      GenericWorker.prototype.processChunk.call(this, chunk);
    };
    module.exports = DataLengthProbe;
  }
});

// node_modules/jszip/lib/compressedObject.js
var require_compressedObject = __commonJS({
  "node_modules/jszip/lib/compressedObject.js"(exports, module) {
    "use strict";
    var external = require_external();
    var DataWorker = require_DataWorker();
    var Crc32Probe = require_Crc32Probe();
    var DataLengthProbe = require_DataLengthProbe();
    function CompressedObject(compressedSize, uncompressedSize, crc32, compression, data) {
      this.compressedSize = compressedSize;
      this.uncompressedSize = uncompressedSize;
      this.crc32 = crc32;
      this.compression = compression;
      this.compressedContent = data;
    }
    CompressedObject.prototype = {
      getContentWorker: function() {
        var worker = new DataWorker(external.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new DataLengthProbe("data_length"));
        var that = this;
        worker.on("end", function() {
          if (this.streamInfo["data_length"] !== that.uncompressedSize) {
            throw new Error("Bug : uncompressed data size mismatch");
          }
        });
        return worker;
      },
      getCompressedWorker: function() {
        return new DataWorker(external.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
      }
    };
    CompressedObject.createWorkerFrom = function(uncompressedWorker, compression, compressionOptions) {
      return uncompressedWorker.pipe(new Crc32Probe()).pipe(new DataLengthProbe("uncompressedSize")).pipe(compression.compressWorker(compressionOptions)).pipe(new DataLengthProbe("compressedSize")).withStreamInfo("compression", compression);
    };
    module.exports = CompressedObject;
  }
});

// node_modules/jszip/lib/zipObject.js
var require_zipObject = __commonJS({
  "node_modules/jszip/lib/zipObject.js"(exports, module) {
    "use strict";
    var StreamHelper = require_StreamHelper();
    var DataWorker = require_DataWorker();
    var utf8 = require_utf8();
    var CompressedObject = require_compressedObject();
    var GenericWorker = require_GenericWorker();
    var ZipObject = function(name, data, options) {
      this.name = name;
      this.dir = options.dir;
      this.date = options.date;
      this.comment = options.comment;
      this.unixPermissions = options.unixPermissions;
      this.dosPermissions = options.dosPermissions;
      this._data = data;
      this._dataBinary = options.binary;
      this.options = {
        compression: options.compression,
        compressionOptions: options.compressionOptions
      };
    };
    ZipObject.prototype = {
      internalStream: function(type) {
        var result = null, outputType = "string";
        try {
          if (!type) {
            throw new Error("No output type specified.");
          }
          outputType = type.toLowerCase();
          var askUnicodeString = outputType === "string" || outputType === "text";
          if (outputType === "binarystring" || outputType === "text") {
            outputType = "string";
          }
          result = this._decompressWorker();
          var isUnicodeString = !this._dataBinary;
          if (isUnicodeString && !askUnicodeString) {
            result = result.pipe(new utf8.Utf8EncodeWorker());
          }
          if (!isUnicodeString && askUnicodeString) {
            result = result.pipe(new utf8.Utf8DecodeWorker());
          }
        } catch (e) {
          result = new GenericWorker("error");
          result.error(e);
        }
        return new StreamHelper(result, outputType, "");
      },
      async: function(type, onUpdate) {
        return this.internalStream(type).accumulate(onUpdate);
      },
      nodeStream: function(type, onUpdate) {
        return this.internalStream(type || "nodebuffer").toNodejsStream(onUpdate);
      },
      _compressWorker: function(compression, compressionOptions) {
        if (this._data instanceof CompressedObject && this._data.compression.magic === compression.magic) {
          return this._data.getCompressedWorker();
        } else {
          var result = this._decompressWorker();
          if (!this._dataBinary) {
            result = result.pipe(new utf8.Utf8EncodeWorker());
          }
          return CompressedObject.createWorkerFrom(result, compression, compressionOptions);
        }
      },
      _decompressWorker: function() {
        if (this._data instanceof CompressedObject) {
          return this._data.getContentWorker();
        } else if (this._data instanceof GenericWorker) {
          return this._data;
        } else {
          return new DataWorker(this._data);
        }
      }
    };
    var removedMethods = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"];
    var removedFn = function() {
      throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    };
    for (i = 0; i < removedMethods.length; i++) {
      ZipObject.prototype[removedMethods[i]] = removedFn;
    }
    var i;
    module.exports = ZipObject;
  }
});

// node_modules/jszip/node_modules/pako/lib/utils/common.js
var require_common = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/utils/common.js"(exports) {
    "use strict";
    var TYPED_OK = typeof Uint8Array !== "undefined" && typeof Uint16Array !== "undefined" && typeof Int32Array !== "undefined";
    function _has(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    }
    exports.assign = function(obj) {
      var sources = Array.prototype.slice.call(arguments, 1);
      while (sources.length) {
        var source = sources.shift();
        if (!source) {
          continue;
        }
        if (typeof source !== "object") {
          throw new TypeError(source + "must be non-object");
        }
        for (var p in source) {
          if (_has(source, p)) {
            obj[p] = source[p];
          }
        }
      }
      return obj;
    };
    exports.shrinkBuf = function(buf, size) {
      if (buf.length === size) {
        return buf;
      }
      if (buf.subarray) {
        return buf.subarray(0, size);
      }
      buf.length = size;
      return buf;
    };
    var fnTyped = {
      arraySet: function(dest, src, src_offs, len, dest_offs) {
        if (src.subarray && dest.subarray) {
          dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
          return;
        }
        for (var i = 0; i < len; i++) {
          dest[dest_offs + i] = src[src_offs + i];
        }
      },
      flattenChunks: function(chunks) {
        var i, l, len, pos, chunk, result;
        len = 0;
        for (i = 0, l = chunks.length; i < l; i++) {
          len += chunks[i].length;
        }
        result = new Uint8Array(len);
        pos = 0;
        for (i = 0, l = chunks.length; i < l; i++) {
          chunk = chunks[i];
          result.set(chunk, pos);
          pos += chunk.length;
        }
        return result;
      }
    };
    var fnUntyped = {
      arraySet: function(dest, src, src_offs, len, dest_offs) {
        for (var i = 0; i < len; i++) {
          dest[dest_offs + i] = src[src_offs + i];
        }
      },
      flattenChunks: function(chunks) {
        return [].concat.apply([], chunks);
      }
    };
    exports.setTyped = function(on) {
      if (on) {
        exports.Buf8 = Uint8Array;
        exports.Buf16 = Uint16Array;
        exports.Buf32 = Int32Array;
        exports.assign(exports, fnTyped);
      } else {
        exports.Buf8 = Array;
        exports.Buf16 = Array;
        exports.Buf32 = Array;
        exports.assign(exports, fnUntyped);
      }
    };
    exports.setTyped(TYPED_OK);
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/trees.js
var require_trees = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/trees.js"(exports) {
    "use strict";
    var utils = require_common();
    var Z_FIXED = 4;
    var Z_BINARY = 0;
    var Z_TEXT = 1;
    var Z_UNKNOWN = 2;
    function zero(buf) {
      var len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }
    var STORED_BLOCK = 0;
    var STATIC_TREES = 1;
    var DYN_TREES = 2;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var Buf_size = 16;
    var MAX_BL_BITS = 7;
    var END_BLOCK = 256;
    var REP_3_6 = 16;
    var REPZ_3_10 = 17;
    var REPZ_11_138 = 18;
    var extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
    var extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
    var extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];
    var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    var DIST_CODE_LEN = 512;
    var static_ltree = new Array((L_CODES + 2) * 2);
    zero(static_ltree);
    var static_dtree = new Array(D_CODES * 2);
    zero(static_dtree);
    var _dist_code = new Array(DIST_CODE_LEN);
    zero(_dist_code);
    var _length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
    zero(_length_code);
    var base_length = new Array(LENGTH_CODES);
    zero(base_length);
    var base_dist = new Array(D_CODES);
    zero(base_dist);
    function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
      this.static_tree = static_tree;
      this.extra_bits = extra_bits;
      this.extra_base = extra_base;
      this.elems = elems;
      this.max_length = max_length;
      this.has_stree = static_tree && static_tree.length;
    }
    var static_l_desc;
    var static_d_desc;
    var static_bl_desc;
    function TreeDesc(dyn_tree, stat_desc) {
      this.dyn_tree = dyn_tree;
      this.max_code = 0;
      this.stat_desc = stat_desc;
    }
    function d_code(dist) {
      return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
    }
    function put_short(s, w) {
      s.pending_buf[s.pending++] = w & 255;
      s.pending_buf[s.pending++] = w >>> 8 & 255;
    }
    function send_bits(s, value, length) {
      if (s.bi_valid > Buf_size - length) {
        s.bi_buf |= value << s.bi_valid & 65535;
        put_short(s, s.bi_buf);
        s.bi_buf = value >> Buf_size - s.bi_valid;
        s.bi_valid += length - Buf_size;
      } else {
        s.bi_buf |= value << s.bi_valid & 65535;
        s.bi_valid += length;
      }
    }
    function send_code(s, c, tree) {
      send_bits(s, tree[c * 2], tree[c * 2 + 1]);
    }
    function bi_reverse(code, len) {
      var res = 0;
      do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
      } while (--len > 0);
      return res >>> 1;
    }
    function bi_flush(s) {
      if (s.bi_valid === 16) {
        put_short(s, s.bi_buf);
        s.bi_buf = 0;
        s.bi_valid = 0;
      } else if (s.bi_valid >= 8) {
        s.pending_buf[s.pending++] = s.bi_buf & 255;
        s.bi_buf >>= 8;
        s.bi_valid -= 8;
      }
    }
    function gen_bitlen(s, desc) {
      var tree = desc.dyn_tree;
      var max_code = desc.max_code;
      var stree = desc.stat_desc.static_tree;
      var has_stree = desc.stat_desc.has_stree;
      var extra = desc.stat_desc.extra_bits;
      var base = desc.stat_desc.extra_base;
      var max_length = desc.stat_desc.max_length;
      var h;
      var n, m;
      var bits;
      var xbits;
      var f;
      var overflow = 0;
      for (bits = 0; bits <= MAX_BITS; bits++) {
        s.bl_count[bits] = 0;
      }
      tree[s.heap[s.heap_max] * 2 + 1] = 0;
      for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
        n = s.heap[h];
        bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
        if (bits > max_length) {
          bits = max_length;
          overflow++;
        }
        tree[n * 2 + 1] = bits;
        if (n > max_code) {
          continue;
        }
        s.bl_count[bits]++;
        xbits = 0;
        if (n >= base) {
          xbits = extra[n - base];
        }
        f = tree[n * 2];
        s.opt_len += f * (bits + xbits);
        if (has_stree) {
          s.static_len += f * (stree[n * 2 + 1] + xbits);
        }
      }
      if (overflow === 0) {
        return;
      }
      do {
        bits = max_length - 1;
        while (s.bl_count[bits] === 0) {
          bits--;
        }
        s.bl_count[bits]--;
        s.bl_count[bits + 1] += 2;
        s.bl_count[max_length]--;
        overflow -= 2;
      } while (overflow > 0);
      for (bits = max_length; bits !== 0; bits--) {
        n = s.bl_count[bits];
        while (n !== 0) {
          m = s.heap[--h];
          if (m > max_code) {
            continue;
          }
          if (tree[m * 2 + 1] !== bits) {
            s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
            tree[m * 2 + 1] = bits;
          }
          n--;
        }
      }
    }
    function gen_codes(tree, max_code, bl_count) {
      var next_code = new Array(MAX_BITS + 1);
      var code = 0;
      var bits;
      var n;
      for (bits = 1; bits <= MAX_BITS; bits++) {
        next_code[bits] = code = code + bl_count[bits - 1] << 1;
      }
      for (n = 0; n <= max_code; n++) {
        var len = tree[n * 2 + 1];
        if (len === 0) {
          continue;
        }
        tree[n * 2] = bi_reverse(next_code[len]++, len);
      }
    }
    function tr_static_init() {
      var n;
      var bits;
      var length;
      var code;
      var dist;
      var bl_count = new Array(MAX_BITS + 1);
      length = 0;
      for (code = 0; code < LENGTH_CODES - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < 1 << extra_lbits[code]; n++) {
          _length_code[length++] = code;
        }
      }
      _length_code[length - 1] = code;
      dist = 0;
      for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < 1 << extra_dbits[code]; n++) {
          _dist_code[dist++] = code;
        }
      }
      dist >>= 7;
      for (; code < D_CODES; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
          _dist_code[256 + dist++] = code;
        }
      }
      for (bits = 0; bits <= MAX_BITS; bits++) {
        bl_count[bits] = 0;
      }
      n = 0;
      while (n <= 143) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
      }
      while (n <= 255) {
        static_ltree[n * 2 + 1] = 9;
        n++;
        bl_count[9]++;
      }
      while (n <= 279) {
        static_ltree[n * 2 + 1] = 7;
        n++;
        bl_count[7]++;
      }
      while (n <= 287) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
      }
      gen_codes(static_ltree, L_CODES + 1, bl_count);
      for (n = 0; n < D_CODES; n++) {
        static_dtree[n * 2 + 1] = 5;
        static_dtree[n * 2] = bi_reverse(n, 5);
      }
      static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
      static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
      static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
    }
    function init_block(s) {
      var n;
      for (n = 0; n < L_CODES; n++) {
        s.dyn_ltree[n * 2] = 0;
      }
      for (n = 0; n < D_CODES; n++) {
        s.dyn_dtree[n * 2] = 0;
      }
      for (n = 0; n < BL_CODES; n++) {
        s.bl_tree[n * 2] = 0;
      }
      s.dyn_ltree[END_BLOCK * 2] = 1;
      s.opt_len = s.static_len = 0;
      s.last_lit = s.matches = 0;
    }
    function bi_windup(s) {
      if (s.bi_valid > 8) {
        put_short(s, s.bi_buf);
      } else if (s.bi_valid > 0) {
        s.pending_buf[s.pending++] = s.bi_buf;
      }
      s.bi_buf = 0;
      s.bi_valid = 0;
    }
    function copy_block(s, buf, len, header) {
      bi_windup(s);
      if (header) {
        put_short(s, len);
        put_short(s, ~len);
      }
      utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
      s.pending += len;
    }
    function smaller(tree, n, m, depth) {
      var _n2 = n * 2;
      var _m2 = m * 2;
      return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
    }
    function pqdownheap(s, tree, k) {
      var v = s.heap[k];
      var j = k << 1;
      while (j <= s.heap_len) {
        if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
          j++;
        }
        if (smaller(tree, v, s.heap[j], s.depth)) {
          break;
        }
        s.heap[k] = s.heap[j];
        k = j;
        j <<= 1;
      }
      s.heap[k] = v;
    }
    function compress_block(s, ltree, dtree) {
      var dist;
      var lc;
      var lx = 0;
      var code;
      var extra;
      if (s.last_lit !== 0) {
        do {
          dist = s.pending_buf[s.d_buf + lx * 2] << 8 | s.pending_buf[s.d_buf + lx * 2 + 1];
          lc = s.pending_buf[s.l_buf + lx];
          lx++;
          if (dist === 0) {
            send_code(s, lc, ltree);
          } else {
            code = _length_code[lc];
            send_code(s, code + LITERALS + 1, ltree);
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc -= base_length[code];
              send_bits(s, lc, extra);
            }
            dist--;
            code = d_code(dist);
            send_code(s, code, dtree);
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(s, dist, extra);
            }
          }
        } while (lx < s.last_lit);
      }
      send_code(s, END_BLOCK, ltree);
    }
    function build_tree(s, desc) {
      var tree = desc.dyn_tree;
      var stree = desc.stat_desc.static_tree;
      var has_stree = desc.stat_desc.has_stree;
      var elems = desc.stat_desc.elems;
      var n, m;
      var max_code = -1;
      var node;
      s.heap_len = 0;
      s.heap_max = HEAP_SIZE;
      for (n = 0; n < elems; n++) {
        if (tree[n * 2] !== 0) {
          s.heap[++s.heap_len] = max_code = n;
          s.depth[n] = 0;
        } else {
          tree[n * 2 + 1] = 0;
        }
      }
      while (s.heap_len < 2) {
        node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
        tree[node * 2] = 1;
        s.depth[node] = 0;
        s.opt_len--;
        if (has_stree) {
          s.static_len -= stree[node * 2 + 1];
        }
      }
      desc.max_code = max_code;
      for (n = s.heap_len >> 1; n >= 1; n--) {
        pqdownheap(s, tree, n);
      }
      node = elems;
      do {
        n = s.heap[1];
        s.heap[1] = s.heap[s.heap_len--];
        pqdownheap(s, tree, 1);
        m = s.heap[1];
        s.heap[--s.heap_max] = n;
        s.heap[--s.heap_max] = m;
        tree[node * 2] = tree[n * 2] + tree[m * 2];
        s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
        tree[n * 2 + 1] = tree[m * 2 + 1] = node;
        s.heap[1] = node++;
        pqdownheap(s, tree, 1);
      } while (s.heap_len >= 2);
      s.heap[--s.heap_max] = s.heap[1];
      gen_bitlen(s, desc);
      gen_codes(tree, max_code, s.bl_count);
    }
    function scan_tree(s, tree, max_code) {
      var n;
      var prevlen = -1;
      var curlen;
      var nextlen = tree[0 * 2 + 1];
      var count = 0;
      var max_count = 7;
      var min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      tree[(max_code + 1) * 2 + 1] = 65535;
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          s.bl_tree[curlen * 2] += count;
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            s.bl_tree[curlen * 2]++;
          }
          s.bl_tree[REP_3_6 * 2]++;
        } else if (count <= 10) {
          s.bl_tree[REPZ_3_10 * 2]++;
        } else {
          s.bl_tree[REPZ_11_138 * 2]++;
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }
    function send_tree(s, tree, max_code) {
      var n;
      var prevlen = -1;
      var curlen;
      var nextlen = tree[0 * 2 + 1];
      var count = 0;
      var max_count = 7;
      var min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          do {
            send_code(s, curlen, s.bl_tree);
          } while (--count !== 0);
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            send_code(s, curlen, s.bl_tree);
            count--;
          }
          send_code(s, REP_3_6, s.bl_tree);
          send_bits(s, count - 3, 2);
        } else if (count <= 10) {
          send_code(s, REPZ_3_10, s.bl_tree);
          send_bits(s, count - 3, 3);
        } else {
          send_code(s, REPZ_11_138, s.bl_tree);
          send_bits(s, count - 11, 7);
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }
    function build_bl_tree(s) {
      var max_blindex;
      scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
      scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
      build_tree(s, s.bl_desc);
      for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
        if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
          break;
        }
      }
      s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
      return max_blindex;
    }
    function send_all_trees(s, lcodes, dcodes, blcodes) {
      var rank;
      send_bits(s, lcodes - 257, 5);
      send_bits(s, dcodes - 1, 5);
      send_bits(s, blcodes - 4, 4);
      for (rank = 0; rank < blcodes; rank++) {
        send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
      }
      send_tree(s, s.dyn_ltree, lcodes - 1);
      send_tree(s, s.dyn_dtree, dcodes - 1);
    }
    function detect_data_type(s) {
      var black_mask = 4093624447;
      var n;
      for (n = 0; n <= 31; n++, black_mask >>>= 1) {
        if (black_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
          return Z_BINARY;
        }
      }
      if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
        return Z_TEXT;
      }
      for (n = 32; n < LITERALS; n++) {
        if (s.dyn_ltree[n * 2] !== 0) {
          return Z_TEXT;
        }
      }
      return Z_BINARY;
    }
    var static_init_done = false;
    function _tr_init(s) {
      if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
      }
      s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
      s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
      s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
      s.bi_buf = 0;
      s.bi_valid = 0;
      init_block(s);
    }
    function _tr_stored_block(s, buf, stored_len, last) {
      send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
      copy_block(s, buf, stored_len, true);
    }
    function _tr_align(s) {
      send_bits(s, STATIC_TREES << 1, 3);
      send_code(s, END_BLOCK, static_ltree);
      bi_flush(s);
    }
    function _tr_flush_block(s, buf, stored_len, last) {
      var opt_lenb, static_lenb;
      var max_blindex = 0;
      if (s.level > 0) {
        if (s.strm.data_type === Z_UNKNOWN) {
          s.strm.data_type = detect_data_type(s);
        }
        build_tree(s, s.l_desc);
        build_tree(s, s.d_desc);
        max_blindex = build_bl_tree(s);
        opt_lenb = s.opt_len + 3 + 7 >>> 3;
        static_lenb = s.static_len + 3 + 7 >>> 3;
        if (static_lenb <= opt_lenb) {
          opt_lenb = static_lenb;
        }
      } else {
        opt_lenb = static_lenb = stored_len + 5;
      }
      if (stored_len + 4 <= opt_lenb && buf !== -1) {
        _tr_stored_block(s, buf, stored_len, last);
      } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
        send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s, static_ltree, static_dtree);
      } else {
        send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s, s.dyn_ltree, s.dyn_dtree);
      }
      init_block(s);
      if (last) {
        bi_windup(s);
      }
    }
    function _tr_tally(s, dist, lc) {
      s.pending_buf[s.d_buf + s.last_lit * 2] = dist >>> 8 & 255;
      s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 255;
      s.pending_buf[s.l_buf + s.last_lit] = lc & 255;
      s.last_lit++;
      if (dist === 0) {
        s.dyn_ltree[lc * 2]++;
      } else {
        s.matches++;
        dist--;
        s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
        s.dyn_dtree[d_code(dist) * 2]++;
      }
      return s.last_lit === s.lit_bufsize - 1;
    }
    exports._tr_init = _tr_init;
    exports._tr_stored_block = _tr_stored_block;
    exports._tr_flush_block = _tr_flush_block;
    exports._tr_tally = _tr_tally;
    exports._tr_align = _tr_align;
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/adler32.js
var require_adler32 = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/adler32.js"(exports, module) {
    "use strict";
    function adler32(adler, buf, len, pos) {
      var s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
      while (len !== 0) {
        n = len > 2e3 ? 2e3 : len;
        len -= n;
        do {
          s1 = s1 + buf[pos++] | 0;
          s2 = s2 + s1 | 0;
        } while (--n);
        s1 %= 65521;
        s2 %= 65521;
      }
      return s1 | s2 << 16 | 0;
    }
    module.exports = adler32;
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/crc32.js
var require_crc322 = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/crc32.js"(exports, module) {
    "use strict";
    function makeTable() {
      var c, table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
        }
        table[n] = c;
      }
      return table;
    }
    var crcTable = makeTable();
    function crc32(crc, buf, len, pos) {
      var t = crcTable, end = pos + len;
      crc ^= -1;
      for (var i = pos; i < end; i++) {
        crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
      }
      return crc ^ -1;
    }
    module.exports = crc32;
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/messages.js
var require_messages = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/messages.js"(exports, module) {
    "use strict";
    module.exports = {
      2: "need dictionary",
      1: "stream end",
      0: "",
      "-1": "file error",
      "-2": "stream error",
      "-3": "data error",
      "-4": "insufficient memory",
      "-5": "buffer error",
      "-6": "incompatible version"
    };
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/deflate.js
var require_deflate = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/deflate.js"(exports) {
    "use strict";
    var utils = require_common();
    var trees = require_trees();
    var adler32 = require_adler32();
    var crc32 = require_crc322();
    var msg = require_messages();
    var Z_NO_FLUSH = 0;
    var Z_PARTIAL_FLUSH = 1;
    var Z_FULL_FLUSH = 3;
    var Z_FINISH = 4;
    var Z_BLOCK = 5;
    var Z_OK = 0;
    var Z_STREAM_END = 1;
    var Z_STREAM_ERROR = -2;
    var Z_DATA_ERROR = -3;
    var Z_BUF_ERROR = -5;
    var Z_DEFAULT_COMPRESSION = -1;
    var Z_FILTERED = 1;
    var Z_HUFFMAN_ONLY = 2;
    var Z_RLE = 3;
    var Z_FIXED = 4;
    var Z_DEFAULT_STRATEGY = 0;
    var Z_UNKNOWN = 2;
    var Z_DEFLATED = 8;
    var MAX_MEM_LEVEL = 9;
    var MAX_WBITS = 15;
    var DEF_MEM_LEVEL = 8;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
    var PRESET_DICT = 32;
    var INIT_STATE = 42;
    var EXTRA_STATE = 69;
    var NAME_STATE = 73;
    var COMMENT_STATE = 91;
    var HCRC_STATE = 103;
    var BUSY_STATE = 113;
    var FINISH_STATE = 666;
    var BS_NEED_MORE = 1;
    var BS_BLOCK_DONE = 2;
    var BS_FINISH_STARTED = 3;
    var BS_FINISH_DONE = 4;
    var OS_CODE = 3;
    function err(strm, errorCode) {
      strm.msg = msg[errorCode];
      return errorCode;
    }
    function rank(f) {
      return (f << 1) - (f > 4 ? 9 : 0);
    }
    function zero(buf) {
      var len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }
    function flush_pending(strm) {
      var s = strm.state;
      var len = s.pending;
      if (len > strm.avail_out) {
        len = strm.avail_out;
      }
      if (len === 0) {
        return;
      }
      utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
      strm.next_out += len;
      s.pending_out += len;
      strm.total_out += len;
      strm.avail_out -= len;
      s.pending -= len;
      if (s.pending === 0) {
        s.pending_out = 0;
      }
    }
    function flush_block_only(s, last) {
      trees._tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
      s.block_start = s.strstart;
      flush_pending(s.strm);
    }
    function put_byte(s, b) {
      s.pending_buf[s.pending++] = b;
    }
    function putShortMSB(s, b) {
      s.pending_buf[s.pending++] = b >>> 8 & 255;
      s.pending_buf[s.pending++] = b & 255;
    }
    function read_buf(strm, buf, start, size) {
      var len = strm.avail_in;
      if (len > size) {
        len = size;
      }
      if (len === 0) {
        return 0;
      }
      strm.avail_in -= len;
      utils.arraySet(buf, strm.input, strm.next_in, len, start);
      if (strm.state.wrap === 1) {
        strm.adler = adler32(strm.adler, buf, len, start);
      } else if (strm.state.wrap === 2) {
        strm.adler = crc32(strm.adler, buf, len, start);
      }
      strm.next_in += len;
      strm.total_in += len;
      return len;
    }
    function longest_match(s, cur_match) {
      var chain_length = s.max_chain_length;
      var scan = s.strstart;
      var match;
      var len;
      var best_len = s.prev_length;
      var nice_match = s.nice_match;
      var limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
      var _win = s.window;
      var wmask = s.w_mask;
      var prev = s.prev;
      var strend = s.strstart + MAX_MATCH;
      var scan_end1 = _win[scan + best_len - 1];
      var scan_end = _win[scan + best_len];
      if (s.prev_length >= s.good_match) {
        chain_length >>= 2;
      }
      if (nice_match > s.lookahead) {
        nice_match = s.lookahead;
      }
      do {
        match = cur_match;
        if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
          continue;
        }
        scan += 2;
        match++;
        do {
        } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
        len = MAX_MATCH - (strend - scan);
        scan = strend - MAX_MATCH;
        if (len > best_len) {
          s.match_start = cur_match;
          best_len = len;
          if (len >= nice_match) {
            break;
          }
          scan_end1 = _win[scan + best_len - 1];
          scan_end = _win[scan + best_len];
        }
      } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
      if (best_len <= s.lookahead) {
        return best_len;
      }
      return s.lookahead;
    }
    function fill_window(s) {
      var _w_size = s.w_size;
      var p, n, m, more, str;
      do {
        more = s.window_size - s.lookahead - s.strstart;
        if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
          utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
          s.match_start -= _w_size;
          s.strstart -= _w_size;
          s.block_start -= _w_size;
          n = s.hash_size;
          p = n;
          do {
            m = s.head[--p];
            s.head[p] = m >= _w_size ? m - _w_size : 0;
          } while (--n);
          n = _w_size;
          p = n;
          do {
            m = s.prev[--p];
            s.prev[p] = m >= _w_size ? m - _w_size : 0;
          } while (--n);
          more += _w_size;
        }
        if (s.strm.avail_in === 0) {
          break;
        }
        n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
        s.lookahead += n;
        if (s.lookahead + s.insert >= MIN_MATCH) {
          str = s.strstart - s.insert;
          s.ins_h = s.window[str];
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + 1]) & s.hash_mask;
          while (s.insert) {
            s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;
            s.prev[str & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = str;
            str++;
            s.insert--;
            if (s.lookahead + s.insert < MIN_MATCH) {
              break;
            }
          }
        }
      } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
    }
    function deflate_stored(s, flush) {
      var max_block_size = 65535;
      if (max_block_size > s.pending_buf_size - 5) {
        max_block_size = s.pending_buf_size - 5;
      }
      for (; ; ) {
        if (s.lookahead <= 1) {
          fill_window(s);
          if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        s.strstart += s.lookahead;
        s.lookahead = 0;
        var max_start = s.block_start + max_block_size;
        if (s.strstart === 0 || s.strstart >= max_start) {
          s.lookahead = s.strstart - max_start;
          s.strstart = max_start;
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
        if (s.strstart - s.block_start >= s.w_size - MIN_LOOKAHEAD) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.strstart > s.block_start) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_NEED_MORE;
    }
    function deflate_fast(s, flush) {
      var hash_head;
      var bflush;
      for (; ; ) {
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
        if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
          s.match_length = longest_match(s, hash_head);
        }
        if (s.match_length >= MIN_MATCH) {
          bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
          s.lookahead -= s.match_length;
          if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
            s.match_length--;
            do {
              s.strstart++;
              s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
            } while (--s.match_length !== 0);
            s.strstart++;
          } else {
            s.strstart += s.match_length;
            s.match_length = 0;
            s.ins_h = s.window[s.strstart];
            s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + 1]) & s.hash_mask;
          }
        } else {
          bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function deflate_slow(s, flush) {
      var hash_head;
      var bflush;
      var max_insert;
      for (; ; ) {
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
        s.prev_length = s.match_length;
        s.prev_match = s.match_start;
        s.match_length = MIN_MATCH - 1;
        if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
          s.match_length = longest_match(s, hash_head);
          if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) {
            s.match_length = MIN_MATCH - 1;
          }
        }
        if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
          max_insert = s.strstart + s.lookahead - MIN_MATCH;
          bflush = trees._tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
          s.lookahead -= s.prev_length - 1;
          s.prev_length -= 2;
          do {
            if (++s.strstart <= max_insert) {
              s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
            }
          } while (--s.prev_length !== 0);
          s.match_available = 0;
          s.match_length = MIN_MATCH - 1;
          s.strstart++;
          if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
              return BS_NEED_MORE;
            }
          }
        } else if (s.match_available) {
          bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);
          if (bflush) {
            flush_block_only(s, false);
          }
          s.strstart++;
          s.lookahead--;
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        } else {
          s.match_available = 1;
          s.strstart++;
          s.lookahead--;
        }
      }
      if (s.match_available) {
        bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);
        s.match_available = 0;
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function deflate_rle(s, flush) {
      var bflush;
      var prev;
      var scan, strend;
      var _win = s.window;
      for (; ; ) {
        if (s.lookahead <= MAX_MATCH) {
          fill_window(s);
          if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        s.match_length = 0;
        if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
          scan = s.strstart - 1;
          prev = _win[scan];
          if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
            strend = s.strstart + MAX_MATCH;
            do {
            } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
            s.match_length = MAX_MATCH - (strend - scan);
            if (s.match_length > s.lookahead) {
              s.match_length = s.lookahead;
            }
          }
        }
        if (s.match_length >= MIN_MATCH) {
          bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);
          s.lookahead -= s.match_length;
          s.strstart += s.match_length;
          s.match_length = 0;
        } else {
          bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function deflate_huff(s, flush) {
      var bflush;
      for (; ; ) {
        if (s.lookahead === 0) {
          fill_window(s);
          if (s.lookahead === 0) {
            if (flush === Z_NO_FLUSH) {
              return BS_NEED_MORE;
            }
            break;
          }
        }
        s.match_length = 0;
        bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function Config(good_length, max_lazy, nice_length, max_chain, func) {
      this.good_length = good_length;
      this.max_lazy = max_lazy;
      this.nice_length = nice_length;
      this.max_chain = max_chain;
      this.func = func;
    }
    var configuration_table;
    configuration_table = [
      new Config(0, 0, 0, 0, deflate_stored),
      new Config(4, 4, 8, 4, deflate_fast),
      new Config(4, 5, 16, 8, deflate_fast),
      new Config(4, 6, 32, 32, deflate_fast),
      new Config(4, 4, 16, 16, deflate_slow),
      new Config(8, 16, 32, 32, deflate_slow),
      new Config(8, 16, 128, 128, deflate_slow),
      new Config(8, 32, 128, 256, deflate_slow),
      new Config(32, 128, 258, 1024, deflate_slow),
      new Config(32, 258, 258, 4096, deflate_slow)
    ];
    function lm_init(s) {
      s.window_size = 2 * s.w_size;
      zero(s.head);
      s.max_lazy_match = configuration_table[s.level].max_lazy;
      s.good_match = configuration_table[s.level].good_length;
      s.nice_match = configuration_table[s.level].nice_length;
      s.max_chain_length = configuration_table[s.level].max_chain;
      s.strstart = 0;
      s.block_start = 0;
      s.lookahead = 0;
      s.insert = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      s.ins_h = 0;
    }
    function DeflateState() {
      this.strm = null;
      this.status = 0;
      this.pending_buf = null;
      this.pending_buf_size = 0;
      this.pending_out = 0;
      this.pending = 0;
      this.wrap = 0;
      this.gzhead = null;
      this.gzindex = 0;
      this.method = Z_DEFLATED;
      this.last_flush = -1;
      this.w_size = 0;
      this.w_bits = 0;
      this.w_mask = 0;
      this.window = null;
      this.window_size = 0;
      this.prev = null;
      this.head = null;
      this.ins_h = 0;
      this.hash_size = 0;
      this.hash_bits = 0;
      this.hash_mask = 0;
      this.hash_shift = 0;
      this.block_start = 0;
      this.match_length = 0;
      this.prev_match = 0;
      this.match_available = 0;
      this.strstart = 0;
      this.match_start = 0;
      this.lookahead = 0;
      this.prev_length = 0;
      this.max_chain_length = 0;
      this.max_lazy_match = 0;
      this.level = 0;
      this.strategy = 0;
      this.good_match = 0;
      this.nice_match = 0;
      this.dyn_ltree = new utils.Buf16(HEAP_SIZE * 2);
      this.dyn_dtree = new utils.Buf16((2 * D_CODES + 1) * 2);
      this.bl_tree = new utils.Buf16((2 * BL_CODES + 1) * 2);
      zero(this.dyn_ltree);
      zero(this.dyn_dtree);
      zero(this.bl_tree);
      this.l_desc = null;
      this.d_desc = null;
      this.bl_desc = null;
      this.bl_count = new utils.Buf16(MAX_BITS + 1);
      this.heap = new utils.Buf16(2 * L_CODES + 1);
      zero(this.heap);
      this.heap_len = 0;
      this.heap_max = 0;
      this.depth = new utils.Buf16(2 * L_CODES + 1);
      zero(this.depth);
      this.l_buf = 0;
      this.lit_bufsize = 0;
      this.last_lit = 0;
      this.d_buf = 0;
      this.opt_len = 0;
      this.static_len = 0;
      this.matches = 0;
      this.insert = 0;
      this.bi_buf = 0;
      this.bi_valid = 0;
    }
    function deflateResetKeep(strm) {
      var s;
      if (!strm || !strm.state) {
        return err(strm, Z_STREAM_ERROR);
      }
      strm.total_in = strm.total_out = 0;
      strm.data_type = Z_UNKNOWN;
      s = strm.state;
      s.pending = 0;
      s.pending_out = 0;
      if (s.wrap < 0) {
        s.wrap = -s.wrap;
      }
      s.status = s.wrap ? INIT_STATE : BUSY_STATE;
      strm.adler = s.wrap === 2 ? 0 : 1;
      s.last_flush = Z_NO_FLUSH;
      trees._tr_init(s);
      return Z_OK;
    }
    function deflateReset(strm) {
      var ret = deflateResetKeep(strm);
      if (ret === Z_OK) {
        lm_init(strm.state);
      }
      return ret;
    }
    function deflateSetHeader(strm, head) {
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      if (strm.state.wrap !== 2) {
        return Z_STREAM_ERROR;
      }
      strm.state.gzhead = head;
      return Z_OK;
    }
    function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      var wrap = 1;
      if (level === Z_DEFAULT_COMPRESSION) {
        level = 6;
      }
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else if (windowBits > 15) {
        wrap = 2;
        windowBits -= 16;
      }
      if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED) {
        return err(strm, Z_STREAM_ERROR);
      }
      if (windowBits === 8) {
        windowBits = 9;
      }
      var s = new DeflateState();
      strm.state = s;
      s.strm = strm;
      s.wrap = wrap;
      s.gzhead = null;
      s.w_bits = windowBits;
      s.w_size = 1 << s.w_bits;
      s.w_mask = s.w_size - 1;
      s.hash_bits = memLevel + 7;
      s.hash_size = 1 << s.hash_bits;
      s.hash_mask = s.hash_size - 1;
      s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
      s.window = new utils.Buf8(s.w_size * 2);
      s.head = new utils.Buf16(s.hash_size);
      s.prev = new utils.Buf16(s.w_size);
      s.lit_bufsize = 1 << memLevel + 6;
      s.pending_buf_size = s.lit_bufsize * 4;
      s.pending_buf = new utils.Buf8(s.pending_buf_size);
      s.d_buf = 1 * s.lit_bufsize;
      s.l_buf = (1 + 2) * s.lit_bufsize;
      s.level = level;
      s.strategy = strategy;
      s.method = method;
      return deflateReset(strm);
    }
    function deflateInit(strm, level) {
      return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
    }
    function deflate(strm, flush) {
      var old_flush, s;
      var beg, val;
      if (!strm || !strm.state || flush > Z_BLOCK || flush < 0) {
        return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
      }
      s = strm.state;
      if (!strm.output || !strm.input && strm.avail_in !== 0 || s.status === FINISH_STATE && flush !== Z_FINISH) {
        return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR : Z_STREAM_ERROR);
      }
      s.strm = strm;
      old_flush = s.last_flush;
      s.last_flush = flush;
      if (s.status === INIT_STATE) {
        if (s.wrap === 2) {
          strm.adler = 0;
          put_byte(s, 31);
          put_byte(s, 139);
          put_byte(s, 8);
          if (!s.gzhead) {
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
            put_byte(s, OS_CODE);
            s.status = BUSY_STATE;
          } else {
            put_byte(s, (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16));
            put_byte(s, s.gzhead.time & 255);
            put_byte(s, s.gzhead.time >> 8 & 255);
            put_byte(s, s.gzhead.time >> 16 & 255);
            put_byte(s, s.gzhead.time >> 24 & 255);
            put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
            put_byte(s, s.gzhead.os & 255);
            if (s.gzhead.extra && s.gzhead.extra.length) {
              put_byte(s, s.gzhead.extra.length & 255);
              put_byte(s, s.gzhead.extra.length >> 8 & 255);
            }
            if (s.gzhead.hcrc) {
              strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
            }
            s.gzindex = 0;
            s.status = EXTRA_STATE;
          }
        } else {
          var header = Z_DEFLATED + (s.w_bits - 8 << 4) << 8;
          var level_flags = -1;
          if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
            level_flags = 0;
          } else if (s.level < 6) {
            level_flags = 1;
          } else if (s.level === 6) {
            level_flags = 2;
          } else {
            level_flags = 3;
          }
          header |= level_flags << 6;
          if (s.strstart !== 0) {
            header |= PRESET_DICT;
          }
          header += 31 - header % 31;
          s.status = BUSY_STATE;
          putShortMSB(s, header);
          if (s.strstart !== 0) {
            putShortMSB(s, strm.adler >>> 16);
            putShortMSB(s, strm.adler & 65535);
          }
          strm.adler = 1;
        }
      }
      if (s.status === EXTRA_STATE) {
        if (s.gzhead.extra) {
          beg = s.pending;
          while (s.gzindex < (s.gzhead.extra.length & 65535)) {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                break;
              }
            }
            put_byte(s, s.gzhead.extra[s.gzindex] & 255);
            s.gzindex++;
          }
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (s.gzindex === s.gzhead.extra.length) {
            s.gzindex = 0;
            s.status = NAME_STATE;
          }
        } else {
          s.status = NAME_STATE;
        }
      }
      if (s.status === NAME_STATE) {
        if (s.gzhead.name) {
          beg = s.pending;
          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            if (s.gzindex < s.gzhead.name.length) {
              val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.gzindex = 0;
            s.status = COMMENT_STATE;
          }
        } else {
          s.status = COMMENT_STATE;
        }
      }
      if (s.status === COMMENT_STATE) {
        if (s.gzhead.comment) {
          beg = s.pending;
          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            if (s.gzindex < s.gzhead.comment.length) {
              val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.status = HCRC_STATE;
          }
        } else {
          s.status = HCRC_STATE;
        }
      }
      if (s.status === HCRC_STATE) {
        if (s.gzhead.hcrc) {
          if (s.pending + 2 > s.pending_buf_size) {
            flush_pending(strm);
          }
          if (s.pending + 2 <= s.pending_buf_size) {
            put_byte(s, strm.adler & 255);
            put_byte(s, strm.adler >> 8 & 255);
            strm.adler = 0;
            s.status = BUSY_STATE;
          }
        } else {
          s.status = BUSY_STATE;
        }
      }
      if (s.pending !== 0) {
        flush_pending(strm);
        if (strm.avail_out === 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH) {
        return err(strm, Z_BUF_ERROR);
      }
      if (s.status === FINISH_STATE && strm.avail_in !== 0) {
        return err(strm, Z_BUF_ERROR);
      }
      if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH && s.status !== FINISH_STATE) {
        var bstate = s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
        if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
          s.status = FINISH_STATE;
        }
        if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
          if (strm.avail_out === 0) {
            s.last_flush = -1;
          }
          return Z_OK;
        }
        if (bstate === BS_BLOCK_DONE) {
          if (flush === Z_PARTIAL_FLUSH) {
            trees._tr_align(s);
          } else if (flush !== Z_BLOCK) {
            trees._tr_stored_block(s, 0, 0, false);
            if (flush === Z_FULL_FLUSH) {
              zero(s.head);
              if (s.lookahead === 0) {
                s.strstart = 0;
                s.block_start = 0;
                s.insert = 0;
              }
            }
          }
          flush_pending(strm);
          if (strm.avail_out === 0) {
            s.last_flush = -1;
            return Z_OK;
          }
        }
      }
      if (flush !== Z_FINISH) {
        return Z_OK;
      }
      if (s.wrap <= 0) {
        return Z_STREAM_END;
      }
      if (s.wrap === 2) {
        put_byte(s, strm.adler & 255);
        put_byte(s, strm.adler >> 8 & 255);
        put_byte(s, strm.adler >> 16 & 255);
        put_byte(s, strm.adler >> 24 & 255);
        put_byte(s, strm.total_in & 255);
        put_byte(s, strm.total_in >> 8 & 255);
        put_byte(s, strm.total_in >> 16 & 255);
        put_byte(s, strm.total_in >> 24 & 255);
      } else {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 65535);
      }
      flush_pending(strm);
      if (s.wrap > 0) {
        s.wrap = -s.wrap;
      }
      return s.pending !== 0 ? Z_OK : Z_STREAM_END;
    }
    function deflateEnd(strm) {
      var status;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      status = strm.state.status;
      if (status !== INIT_STATE && status !== EXTRA_STATE && status !== NAME_STATE && status !== COMMENT_STATE && status !== HCRC_STATE && status !== BUSY_STATE && status !== FINISH_STATE) {
        return err(strm, Z_STREAM_ERROR);
      }
      strm.state = null;
      return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
    }
    function deflateSetDictionary(strm, dictionary) {
      var dictLength = dictionary.length;
      var s;
      var str, n;
      var wrap;
      var avail;
      var next;
      var input;
      var tmpDict;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      s = strm.state;
      wrap = s.wrap;
      if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
        return Z_STREAM_ERROR;
      }
      if (wrap === 1) {
        strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
      }
      s.wrap = 0;
      if (dictLength >= s.w_size) {
        if (wrap === 0) {
          zero(s.head);
          s.strstart = 0;
          s.block_start = 0;
          s.insert = 0;
        }
        tmpDict = new utils.Buf8(s.w_size);
        utils.arraySet(tmpDict, dictionary, dictLength - s.w_size, s.w_size, 0);
        dictionary = tmpDict;
        dictLength = s.w_size;
      }
      avail = strm.avail_in;
      next = strm.next_in;
      input = strm.input;
      strm.avail_in = dictLength;
      strm.next_in = 0;
      strm.input = dictionary;
      fill_window(s);
      while (s.lookahead >= MIN_MATCH) {
        str = s.strstart;
        n = s.lookahead - (MIN_MATCH - 1);
        do {
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;
          s.prev[str & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = str;
          str++;
        } while (--n);
        s.strstart = str;
        s.lookahead = MIN_MATCH - 1;
        fill_window(s);
      }
      s.strstart += s.lookahead;
      s.block_start = s.strstart;
      s.insert = s.lookahead;
      s.lookahead = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      strm.next_in = next;
      strm.input = input;
      strm.avail_in = avail;
      s.wrap = wrap;
      return Z_OK;
    }
    exports.deflateInit = deflateInit;
    exports.deflateInit2 = deflateInit2;
    exports.deflateReset = deflateReset;
    exports.deflateResetKeep = deflateResetKeep;
    exports.deflateSetHeader = deflateSetHeader;
    exports.deflate = deflate;
    exports.deflateEnd = deflateEnd;
    exports.deflateSetDictionary = deflateSetDictionary;
    exports.deflateInfo = "pako deflate (from Nodeca project)";
  }
});

// node_modules/jszip/node_modules/pako/lib/utils/strings.js
var require_strings = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/utils/strings.js"(exports) {
    "use strict";
    var utils = require_common();
    var STR_APPLY_OK = true;
    var STR_APPLY_UIA_OK = true;
    try {
      String.fromCharCode.apply(null, [0]);
    } catch (__) {
      STR_APPLY_OK = false;
    }
    try {
      String.fromCharCode.apply(null, new Uint8Array(1));
    } catch (__) {
      STR_APPLY_UIA_OK = false;
    }
    var _utf8len = new utils.Buf8(256);
    for (q = 0; q < 256; q++) {
      _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
    }
    var q;
    _utf8len[254] = _utf8len[254] = 1;
    exports.string2buf = function(str) {
      var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
      for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
      }
      buf = new utils.Buf8(buf_len);
      for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        if (c < 128) {
          buf[i++] = c;
        } else if (c < 2048) {
          buf[i++] = 192 | c >>> 6;
          buf[i++] = 128 | c & 63;
        } else if (c < 65536) {
          buf[i++] = 224 | c >>> 12;
          buf[i++] = 128 | c >>> 6 & 63;
          buf[i++] = 128 | c & 63;
        } else {
          buf[i++] = 240 | c >>> 18;
          buf[i++] = 128 | c >>> 12 & 63;
          buf[i++] = 128 | c >>> 6 & 63;
          buf[i++] = 128 | c & 63;
        }
      }
      return buf;
    };
    function buf2binstring(buf, len) {
      if (len < 65534) {
        if (buf.subarray && STR_APPLY_UIA_OK || !buf.subarray && STR_APPLY_OK) {
          return String.fromCharCode.apply(null, utils.shrinkBuf(buf, len));
        }
      }
      var result = "";
      for (var i = 0; i < len; i++) {
        result += String.fromCharCode(buf[i]);
      }
      return result;
    }
    exports.buf2binstring = function(buf) {
      return buf2binstring(buf, buf.length);
    };
    exports.binstring2buf = function(str) {
      var buf = new utils.Buf8(str.length);
      for (var i = 0, len = buf.length; i < len; i++) {
        buf[i] = str.charCodeAt(i);
      }
      return buf;
    };
    exports.buf2string = function(buf, max) {
      var i, out, c, c_len;
      var len = max || buf.length;
      var utf16buf = new Array(len * 2);
      for (out = 0, i = 0; i < len; ) {
        c = buf[i++];
        if (c < 128) {
          utf16buf[out++] = c;
          continue;
        }
        c_len = _utf8len[c];
        if (c_len > 4) {
          utf16buf[out++] = 65533;
          i += c_len - 1;
          continue;
        }
        c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
        while (c_len > 1 && i < len) {
          c = c << 6 | buf[i++] & 63;
          c_len--;
        }
        if (c_len > 1) {
          utf16buf[out++] = 65533;
          continue;
        }
        if (c < 65536) {
          utf16buf[out++] = c;
        } else {
          c -= 65536;
          utf16buf[out++] = 55296 | c >> 10 & 1023;
          utf16buf[out++] = 56320 | c & 1023;
        }
      }
      return buf2binstring(utf16buf, out);
    };
    exports.utf8border = function(buf, max) {
      var pos;
      max = max || buf.length;
      if (max > buf.length) {
        max = buf.length;
      }
      pos = max - 1;
      while (pos >= 0 && (buf[pos] & 192) === 128) {
        pos--;
      }
      if (pos < 0) {
        return max;
      }
      if (pos === 0) {
        return max;
      }
      return pos + _utf8len[buf[pos]] > max ? pos : max;
    };
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/zstream.js
var require_zstream = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/zstream.js"(exports, module) {
    "use strict";
    function ZStream() {
      this.input = null;
      this.next_in = 0;
      this.avail_in = 0;
      this.total_in = 0;
      this.output = null;
      this.next_out = 0;
      this.avail_out = 0;
      this.total_out = 0;
      this.msg = "";
      this.state = null;
      this.data_type = 2;
      this.adler = 0;
    }
    module.exports = ZStream;
  }
});

// node_modules/jszip/node_modules/pako/lib/deflate.js
var require_deflate2 = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/deflate.js"(exports) {
    "use strict";
    var zlib_deflate = require_deflate();
    var utils = require_common();
    var strings = require_strings();
    var msg = require_messages();
    var ZStream = require_zstream();
    var toString = Object.prototype.toString;
    var Z_NO_FLUSH = 0;
    var Z_FINISH = 4;
    var Z_OK = 0;
    var Z_STREAM_END = 1;
    var Z_SYNC_FLUSH = 2;
    var Z_DEFAULT_COMPRESSION = -1;
    var Z_DEFAULT_STRATEGY = 0;
    var Z_DEFLATED = 8;
    function Deflate(options) {
      if (!(this instanceof Deflate))
        return new Deflate(options);
      this.options = utils.assign({
        level: Z_DEFAULT_COMPRESSION,
        method: Z_DEFLATED,
        chunkSize: 16384,
        windowBits: 15,
        memLevel: 8,
        strategy: Z_DEFAULT_STRATEGY,
        to: ""
      }, options || {});
      var opt = this.options;
      if (opt.raw && opt.windowBits > 0) {
        opt.windowBits = -opt.windowBits;
      } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
        opt.windowBits += 16;
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      var status = zlib_deflate.deflateInit2(this.strm, opt.level, opt.method, opt.windowBits, opt.memLevel, opt.strategy);
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
      if (opt.header) {
        zlib_deflate.deflateSetHeader(this.strm, opt.header);
      }
      if (opt.dictionary) {
        var dict;
        if (typeof opt.dictionary === "string") {
          dict = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          dict = new Uint8Array(opt.dictionary);
        } else {
          dict = opt.dictionary;
        }
        status = zlib_deflate.deflateSetDictionary(this.strm, dict);
        if (status !== Z_OK) {
          throw new Error(msg[status]);
        }
        this._dict_set = true;
      }
    }
    Deflate.prototype.push = function(data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var status, _mode;
      if (this.ended) {
        return false;
      }
      _mode = mode === ~~mode ? mode : mode === true ? Z_FINISH : Z_NO_FLUSH;
      if (typeof data === "string") {
        strm.input = strings.string2buf(data);
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      do {
        if (strm.avail_out === 0) {
          strm.output = new utils.Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = zlib_deflate.deflate(strm, _mode);
        if (status !== Z_STREAM_END && status !== Z_OK) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }
        if (strm.avail_out === 0 || strm.avail_in === 0 && (_mode === Z_FINISH || _mode === Z_SYNC_FLUSH)) {
          if (this.options.to === "string") {
            this.onData(strings.buf2binstring(utils.shrinkBuf(strm.output, strm.next_out)));
          } else {
            this.onData(utils.shrinkBuf(strm.output, strm.next_out));
          }
        }
      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END);
      if (_mode === Z_FINISH) {
        status = zlib_deflate.deflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === Z_OK;
      }
      if (_mode === Z_SYNC_FLUSH) {
        this.onEnd(Z_OK);
        strm.avail_out = 0;
        return true;
      }
      return true;
    };
    Deflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Deflate.prototype.onEnd = function(status) {
      if (status === Z_OK) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = utils.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function deflate(input, options) {
      var deflator = new Deflate(options);
      deflator.push(input, true);
      if (deflator.err) {
        throw deflator.msg || msg[deflator.err];
      }
      return deflator.result;
    }
    function deflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return deflate(input, options);
    }
    function gzip(input, options) {
      options = options || {};
      options.gzip = true;
      return deflate(input, options);
    }
    exports.Deflate = Deflate;
    exports.deflate = deflate;
    exports.deflateRaw = deflateRaw;
    exports.gzip = gzip;
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/inffast.js
var require_inffast = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/inffast.js"(exports, module) {
    "use strict";
    var BAD = 30;
    var TYPE = 12;
    module.exports = function inflate_fast(strm, start) {
      var state;
      var _in;
      var last;
      var _out;
      var beg;
      var end;
      var dmax;
      var wsize;
      var whave;
      var wnext;
      var s_window;
      var hold;
      var bits;
      var lcode;
      var dcode;
      var lmask;
      var dmask;
      var here;
      var op;
      var len;
      var dist;
      var from;
      var from_source;
      var input, output;
      state = strm.state;
      _in = strm.next_in;
      input = strm.input;
      last = _in + (strm.avail_in - 5);
      _out = strm.next_out;
      output = strm.output;
      beg = _out - (start - strm.avail_out);
      end = _out + (strm.avail_out - 257);
      dmax = state.dmax;
      wsize = state.wsize;
      whave = state.whave;
      wnext = state.wnext;
      s_window = state.window;
      hold = state.hold;
      bits = state.bits;
      lcode = state.lencode;
      dcode = state.distcode;
      lmask = (1 << state.lenbits) - 1;
      dmask = (1 << state.distbits) - 1;
      top:
        do {
          if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
          }
          here = lcode[hold & lmask];
          dolen:
            for (; ; ) {
              op = here >>> 24;
              hold >>>= op;
              bits -= op;
              op = here >>> 16 & 255;
              if (op === 0) {
                output[_out++] = here & 65535;
              } else if (op & 16) {
                len = here & 65535;
                op &= 15;
                if (op) {
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                  }
                  len += hold & (1 << op) - 1;
                  hold >>>= op;
                  bits -= op;
                }
                if (bits < 15) {
                  hold += input[_in++] << bits;
                  bits += 8;
                  hold += input[_in++] << bits;
                  bits += 8;
                }
                here = dcode[hold & dmask];
                dodist:
                  for (; ; ) {
                    op = here >>> 24;
                    hold >>>= op;
                    bits -= op;
                    op = here >>> 16 & 255;
                    if (op & 16) {
                      dist = here & 65535;
                      op &= 15;
                      if (bits < op) {
                        hold += input[_in++] << bits;
                        bits += 8;
                        if (bits < op) {
                          hold += input[_in++] << bits;
                          bits += 8;
                        }
                      }
                      dist += hold & (1 << op) - 1;
                      if (dist > dmax) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD;
                        break top;
                      }
                      hold >>>= op;
                      bits -= op;
                      op = _out - beg;
                      if (dist > op) {
                        op = dist - op;
                        if (op > whave) {
                          if (state.sane) {
                            strm.msg = "invalid distance too far back";
                            state.mode = BAD;
                            break top;
                          }
                        }
                        from = 0;
                        from_source = s_window;
                        if (wnext === 0) {
                          from += wsize - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        } else if (wnext < op) {
                          from += wsize + wnext - op;
                          op -= wnext;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = 0;
                            if (wnext < len) {
                              op = wnext;
                              len -= op;
                              do {
                                output[_out++] = s_window[from++];
                              } while (--op);
                              from = _out - dist;
                              from_source = output;
                            }
                          }
                        } else {
                          from += wnext - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        }
                        while (len > 2) {
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          len -= 3;
                        }
                        if (len) {
                          output[_out++] = from_source[from++];
                          if (len > 1) {
                            output[_out++] = from_source[from++];
                          }
                        }
                      } else {
                        from = _out - dist;
                        do {
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          len -= 3;
                        } while (len > 2);
                        if (len) {
                          output[_out++] = output[from++];
                          if (len > 1) {
                            output[_out++] = output[from++];
                          }
                        }
                      }
                    } else if ((op & 64) === 0) {
                      here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                      continue dodist;
                    } else {
                      strm.msg = "invalid distance code";
                      state.mode = BAD;
                      break top;
                    }
                    break;
                  }
              } else if ((op & 64) === 0) {
                here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
                continue dolen;
              } else if (op & 32) {
                state.mode = TYPE;
                break top;
              } else {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break top;
              }
              break;
            }
        } while (_in < last && _out < end);
      len = bits >> 3;
      _in -= len;
      bits -= len << 3;
      hold &= (1 << bits) - 1;
      strm.next_in = _in;
      strm.next_out = _out;
      strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
      strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
      state.hold = hold;
      state.bits = bits;
      return;
    };
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/inftrees.js
var require_inftrees = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/inftrees.js"(exports, module) {
    "use strict";
    var utils = require_common();
    var MAXBITS = 15;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var lbase = [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      13,
      15,
      17,
      19,
      23,
      27,
      31,
      35,
      43,
      51,
      59,
      67,
      83,
      99,
      115,
      131,
      163,
      195,
      227,
      258,
      0,
      0
    ];
    var lext = [
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      17,
      17,
      17,
      17,
      18,
      18,
      18,
      18,
      19,
      19,
      19,
      19,
      20,
      20,
      20,
      20,
      21,
      21,
      21,
      21,
      16,
      72,
      78
    ];
    var dbase = [
      1,
      2,
      3,
      4,
      5,
      7,
      9,
      13,
      17,
      25,
      33,
      49,
      65,
      97,
      129,
      193,
      257,
      385,
      513,
      769,
      1025,
      1537,
      2049,
      3073,
      4097,
      6145,
      8193,
      12289,
      16385,
      24577,
      0,
      0
    ];
    var dext = [
      16,
      16,
      16,
      16,
      17,
      17,
      18,
      18,
      19,
      19,
      20,
      20,
      21,
      21,
      22,
      22,
      23,
      23,
      24,
      24,
      25,
      25,
      26,
      26,
      27,
      27,
      28,
      28,
      29,
      29,
      64,
      64
    ];
    module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts) {
      var bits = opts.bits;
      var len = 0;
      var sym = 0;
      var min = 0, max = 0;
      var root = 0;
      var curr = 0;
      var drop = 0;
      var left = 0;
      var used = 0;
      var huff = 0;
      var incr;
      var fill;
      var low;
      var mask;
      var next;
      var base = null;
      var base_index = 0;
      var end;
      var count = new utils.Buf16(MAXBITS + 1);
      var offs = new utils.Buf16(MAXBITS + 1);
      var extra = null;
      var extra_index = 0;
      var here_bits, here_op, here_val;
      for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
      }
      for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
      }
      root = bits;
      for (max = MAXBITS; max >= 1; max--) {
        if (count[max] !== 0) {
          break;
        }
      }
      if (root > max) {
        root = max;
      }
      if (max === 0) {
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        opts.bits = 1;
        return 0;
      }
      for (min = 1; min < max; min++) {
        if (count[min] !== 0) {
          break;
        }
      }
      if (root < min) {
        root = min;
      }
      left = 1;
      for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
          return -1;
        }
      }
      if (left > 0 && (type === CODES || max !== 1)) {
        return -1;
      }
      offs[1] = 0;
      for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
      }
      for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
          work[offs[lens[lens_index + sym]]++] = sym;
        }
      }
      if (type === CODES) {
        base = extra = work;
        end = 19;
      } else if (type === LENS) {
        base = lbase;
        base_index -= 257;
        extra = lext;
        extra_index -= 257;
        end = 256;
      } else {
        base = dbase;
        extra = dext;
        end = -1;
      }
      huff = 0;
      sym = 0;
      len = min;
      next = table_index;
      curr = root;
      drop = 0;
      low = -1;
      used = 1 << root;
      mask = used - 1;
      if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
        return 1;
      }
      for (; ; ) {
        here_bits = len - drop;
        if (work[sym] < end) {
          here_op = 0;
          here_val = work[sym];
        } else if (work[sym] > end) {
          here_op = extra[extra_index + work[sym]];
          here_val = base[base_index + work[sym]];
        } else {
          here_op = 32 + 64;
          here_val = 0;
        }
        incr = 1 << len - drop;
        fill = 1 << curr;
        min = fill;
        do {
          fill -= incr;
          table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
        } while (fill !== 0);
        incr = 1 << len - 1;
        while (huff & incr) {
          incr >>= 1;
        }
        if (incr !== 0) {
          huff &= incr - 1;
          huff += incr;
        } else {
          huff = 0;
        }
        sym++;
        if (--count[len] === 0) {
          if (len === max) {
            break;
          }
          len = lens[lens_index + work[sym]];
        }
        if (len > root && (huff & mask) !== low) {
          if (drop === 0) {
            drop = root;
          }
          next += min;
          curr = len - drop;
          left = 1 << curr;
          while (curr + drop < max) {
            left -= count[curr + drop];
            if (left <= 0) {
              break;
            }
            curr++;
            left <<= 1;
          }
          used += 1 << curr;
          if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
            return 1;
          }
          low = huff & mask;
          table[low] = root << 24 | curr << 16 | next - table_index | 0;
        }
      }
      if (huff !== 0) {
        table[next + huff] = len - drop << 24 | 64 << 16 | 0;
      }
      opts.bits = root;
      return 0;
    };
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/inflate.js
var require_inflate = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/inflate.js"(exports) {
    "use strict";
    var utils = require_common();
    var adler32 = require_adler32();
    var crc32 = require_crc322();
    var inflate_fast = require_inffast();
    var inflate_table = require_inftrees();
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var Z_FINISH = 4;
    var Z_BLOCK = 5;
    var Z_TREES = 6;
    var Z_OK = 0;
    var Z_STREAM_END = 1;
    var Z_NEED_DICT = 2;
    var Z_STREAM_ERROR = -2;
    var Z_DATA_ERROR = -3;
    var Z_MEM_ERROR = -4;
    var Z_BUF_ERROR = -5;
    var Z_DEFLATED = 8;
    var HEAD = 1;
    var FLAGS = 2;
    var TIME = 3;
    var OS = 4;
    var EXLEN = 5;
    var EXTRA = 6;
    var NAME = 7;
    var COMMENT = 8;
    var HCRC = 9;
    var DICTID = 10;
    var DICT = 11;
    var TYPE = 12;
    var TYPEDO = 13;
    var STORED = 14;
    var COPY_ = 15;
    var COPY = 16;
    var TABLE = 17;
    var LENLENS = 18;
    var CODELENS = 19;
    var LEN_ = 20;
    var LEN = 21;
    var LENEXT = 22;
    var DIST = 23;
    var DISTEXT = 24;
    var MATCH = 25;
    var LIT = 26;
    var CHECK = 27;
    var LENGTH = 28;
    var DONE = 29;
    var BAD = 30;
    var MEM = 31;
    var SYNC = 32;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var MAX_WBITS = 15;
    var DEF_WBITS = MAX_WBITS;
    function zswap32(q) {
      return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
    }
    function InflateState() {
      this.mode = 0;
      this.last = false;
      this.wrap = 0;
      this.havedict = false;
      this.flags = 0;
      this.dmax = 0;
      this.check = 0;
      this.total = 0;
      this.head = null;
      this.wbits = 0;
      this.wsize = 0;
      this.whave = 0;
      this.wnext = 0;
      this.window = null;
      this.hold = 0;
      this.bits = 0;
      this.length = 0;
      this.offset = 0;
      this.extra = 0;
      this.lencode = null;
      this.distcode = null;
      this.lenbits = 0;
      this.distbits = 0;
      this.ncode = 0;
      this.nlen = 0;
      this.ndist = 0;
      this.have = 0;
      this.next = null;
      this.lens = new utils.Buf16(320);
      this.work = new utils.Buf16(288);
      this.lendyn = null;
      this.distdyn = null;
      this.sane = 0;
      this.back = 0;
      this.was = 0;
    }
    function inflateResetKeep(strm) {
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      strm.total_in = strm.total_out = state.total = 0;
      strm.msg = "";
      if (state.wrap) {
        strm.adler = state.wrap & 1;
      }
      state.mode = HEAD;
      state.last = 0;
      state.havedict = 0;
      state.dmax = 32768;
      state.head = null;
      state.hold = 0;
      state.bits = 0;
      state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
      state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);
      state.sane = 1;
      state.back = -1;
      return Z_OK;
    }
    function inflateReset(strm) {
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      state.wsize = 0;
      state.whave = 0;
      state.wnext = 0;
      return inflateResetKeep(strm);
    }
    function inflateReset2(strm, windowBits) {
      var wrap;
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else {
        wrap = (windowBits >> 4) + 1;
        if (windowBits < 48) {
          windowBits &= 15;
        }
      }
      if (windowBits && (windowBits < 8 || windowBits > 15)) {
        return Z_STREAM_ERROR;
      }
      if (state.window !== null && state.wbits !== windowBits) {
        state.window = null;
      }
      state.wrap = wrap;
      state.wbits = windowBits;
      return inflateReset(strm);
    }
    function inflateInit2(strm, windowBits) {
      var ret;
      var state;
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      state = new InflateState();
      strm.state = state;
      state.window = null;
      ret = inflateReset2(strm, windowBits);
      if (ret !== Z_OK) {
        strm.state = null;
      }
      return ret;
    }
    function inflateInit(strm) {
      return inflateInit2(strm, DEF_WBITS);
    }
    var virgin = true;
    var lenfix;
    var distfix;
    function fixedtables(state) {
      if (virgin) {
        var sym;
        lenfix = new utils.Buf32(512);
        distfix = new utils.Buf32(32);
        sym = 0;
        while (sym < 144) {
          state.lens[sym++] = 8;
        }
        while (sym < 256) {
          state.lens[sym++] = 9;
        }
        while (sym < 280) {
          state.lens[sym++] = 7;
        }
        while (sym < 288) {
          state.lens[sym++] = 8;
        }
        inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
        sym = 0;
        while (sym < 32) {
          state.lens[sym++] = 5;
        }
        inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
        virgin = false;
      }
      state.lencode = lenfix;
      state.lenbits = 9;
      state.distcode = distfix;
      state.distbits = 5;
    }
    function updatewindow(strm, src, end, copy) {
      var dist;
      var state = strm.state;
      if (state.window === null) {
        state.wsize = 1 << state.wbits;
        state.wnext = 0;
        state.whave = 0;
        state.window = new utils.Buf8(state.wsize);
      }
      if (copy >= state.wsize) {
        utils.arraySet(state.window, src, end - state.wsize, state.wsize, 0);
        state.wnext = 0;
        state.whave = state.wsize;
      } else {
        dist = state.wsize - state.wnext;
        if (dist > copy) {
          dist = copy;
        }
        utils.arraySet(state.window, src, end - copy, dist, state.wnext);
        copy -= dist;
        if (copy) {
          utils.arraySet(state.window, src, end - copy, copy, 0);
          state.wnext = copy;
          state.whave = state.wsize;
        } else {
          state.wnext += dist;
          if (state.wnext === state.wsize) {
            state.wnext = 0;
          }
          if (state.whave < state.wsize) {
            state.whave += dist;
          }
        }
      }
      return 0;
    }
    function inflate(strm, flush) {
      var state;
      var input, output;
      var next;
      var put;
      var have, left;
      var hold;
      var bits;
      var _in, _out;
      var copy;
      var from;
      var from_source;
      var here = 0;
      var here_bits, here_op, here_val;
      var last_bits, last_op, last_val;
      var len;
      var ret;
      var hbuf = new utils.Buf8(4);
      var opts;
      var n;
      var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
      if (!strm || !strm.state || !strm.output || !strm.input && strm.avail_in !== 0) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.mode === TYPE) {
        state.mode = TYPEDO;
      }
      put = strm.next_out;
      output = strm.output;
      left = strm.avail_out;
      next = strm.next_in;
      input = strm.input;
      have = strm.avail_in;
      hold = state.hold;
      bits = state.bits;
      _in = have;
      _out = left;
      ret = Z_OK;
      inf_leave:
        for (; ; ) {
          switch (state.mode) {
            case HEAD:
              if (state.wrap === 0) {
                state.mode = TYPEDO;
                break;
              }
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.wrap & 2 && hold === 35615) {
                state.check = 0;
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
                hold = 0;
                bits = 0;
                state.mode = FLAGS;
                break;
              }
              state.flags = 0;
              if (state.head) {
                state.head.done = false;
              }
              if (!(state.wrap & 1) || (((hold & 255) << 8) + (hold >> 8)) % 31) {
                strm.msg = "incorrect header check";
                state.mode = BAD;
                break;
              }
              if ((hold & 15) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              hold >>>= 4;
              bits -= 4;
              len = (hold & 15) + 8;
              if (state.wbits === 0) {
                state.wbits = len;
              } else if (len > state.wbits) {
                strm.msg = "invalid window size";
                state.mode = BAD;
                break;
              }
              state.dmax = 1 << len;
              strm.adler = state.check = 1;
              state.mode = hold & 512 ? DICTID : TYPE;
              hold = 0;
              bits = 0;
              break;
            case FLAGS:
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.flags = hold;
              if ((state.flags & 255) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              if (state.flags & 57344) {
                strm.msg = "unknown header flags set";
                state.mode = BAD;
                break;
              }
              if (state.head) {
                state.head.text = hold >> 8 & 1;
              }
              if (state.flags & 512) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = TIME;
            case TIME:
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.head) {
                state.head.time = hold;
              }
              if (state.flags & 512) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                hbuf[2] = hold >>> 16 & 255;
                hbuf[3] = hold >>> 24 & 255;
                state.check = crc32(state.check, hbuf, 4, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = OS;
            case OS:
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.head) {
                state.head.xflags = hold & 255;
                state.head.os = hold >> 8;
              }
              if (state.flags & 512) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = EXLEN;
            case EXLEN:
              if (state.flags & 1024) {
                while (bits < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.length = hold;
                if (state.head) {
                  state.head.extra_len = hold;
                }
                if (state.flags & 512) {
                  hbuf[0] = hold & 255;
                  hbuf[1] = hold >>> 8 & 255;
                  state.check = crc32(state.check, hbuf, 2, 0);
                }
                hold = 0;
                bits = 0;
              } else if (state.head) {
                state.head.extra = null;
              }
              state.mode = EXTRA;
            case EXTRA:
              if (state.flags & 1024) {
                copy = state.length;
                if (copy > have) {
                  copy = have;
                }
                if (copy) {
                  if (state.head) {
                    len = state.head.extra_len - state.length;
                    if (!state.head.extra) {
                      state.head.extra = new Array(state.head.extra_len);
                    }
                    utils.arraySet(state.head.extra, input, next, copy, len);
                  }
                  if (state.flags & 512) {
                    state.check = crc32(state.check, input, copy, next);
                  }
                  have -= copy;
                  next += copy;
                  state.length -= copy;
                }
                if (state.length) {
                  break inf_leave;
                }
              }
              state.length = 0;
              state.mode = NAME;
            case NAME:
              if (state.flags & 2048) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.name += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.name = null;
              }
              state.length = 0;
              state.mode = COMMENT;
            case COMMENT:
              if (state.flags & 4096) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.comment += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.comment = null;
              }
              state.mode = HCRC;
            case HCRC:
              if (state.flags & 512) {
                while (bits < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (hold !== (state.check & 65535)) {
                  strm.msg = "header crc mismatch";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              if (state.head) {
                state.head.hcrc = state.flags >> 9 & 1;
                state.head.done = true;
              }
              strm.adler = state.check = 0;
              state.mode = TYPE;
              break;
            case DICTID:
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              strm.adler = state.check = zswap32(hold);
              hold = 0;
              bits = 0;
              state.mode = DICT;
            case DICT:
              if (state.havedict === 0) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits;
                return Z_NEED_DICT;
              }
              strm.adler = state.check = 1;
              state.mode = TYPE;
            case TYPE:
              if (flush === Z_BLOCK || flush === Z_TREES) {
                break inf_leave;
              }
            case TYPEDO:
              if (state.last) {
                hold >>>= bits & 7;
                bits -= bits & 7;
                state.mode = CHECK;
                break;
              }
              while (bits < 3) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.last = hold & 1;
              hold >>>= 1;
              bits -= 1;
              switch (hold & 3) {
                case 0:
                  state.mode = STORED;
                  break;
                case 1:
                  fixedtables(state);
                  state.mode = LEN_;
                  if (flush === Z_TREES) {
                    hold >>>= 2;
                    bits -= 2;
                    break inf_leave;
                  }
                  break;
                case 2:
                  state.mode = TABLE;
                  break;
                case 3:
                  strm.msg = "invalid block type";
                  state.mode = BAD;
              }
              hold >>>= 2;
              bits -= 2;
              break;
            case STORED:
              hold >>>= bits & 7;
              bits -= bits & 7;
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
                strm.msg = "invalid stored block lengths";
                state.mode = BAD;
                break;
              }
              state.length = hold & 65535;
              hold = 0;
              bits = 0;
              state.mode = COPY_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            case COPY_:
              state.mode = COPY;
            case COPY:
              copy = state.length;
              if (copy) {
                if (copy > have) {
                  copy = have;
                }
                if (copy > left) {
                  copy = left;
                }
                if (copy === 0) {
                  break inf_leave;
                }
                utils.arraySet(output, input, next, copy, put);
                have -= copy;
                next += copy;
                left -= copy;
                put += copy;
                state.length -= copy;
                break;
              }
              state.mode = TYPE;
              break;
            case TABLE:
              while (bits < 14) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.nlen = (hold & 31) + 257;
              hold >>>= 5;
              bits -= 5;
              state.ndist = (hold & 31) + 1;
              hold >>>= 5;
              bits -= 5;
              state.ncode = (hold & 15) + 4;
              hold >>>= 4;
              bits -= 4;
              if (state.nlen > 286 || state.ndist > 30) {
                strm.msg = "too many length or distance symbols";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = LENLENS;
            case LENLENS:
              while (state.have < state.ncode) {
                while (bits < 3) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.lens[order[state.have++]] = hold & 7;
                hold >>>= 3;
                bits -= 3;
              }
              while (state.have < 19) {
                state.lens[order[state.have++]] = 0;
              }
              state.lencode = state.lendyn;
              state.lenbits = 7;
              opts = { bits: state.lenbits };
              ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid code lengths set";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = CODELENS;
            case CODELENS:
              while (state.have < state.nlen + state.ndist) {
                for (; ; ) {
                  here = state.lencode[hold & (1 << state.lenbits) - 1];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (here_val < 16) {
                  hold >>>= here_bits;
                  bits -= here_bits;
                  state.lens[state.have++] = here_val;
                } else {
                  if (here_val === 16) {
                    n = here_bits + 2;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    if (state.have === 0) {
                      strm.msg = "invalid bit length repeat";
                      state.mode = BAD;
                      break;
                    }
                    len = state.lens[state.have - 1];
                    copy = 3 + (hold & 3);
                    hold >>>= 2;
                    bits -= 2;
                  } else if (here_val === 17) {
                    n = here_bits + 3;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    len = 0;
                    copy = 3 + (hold & 7);
                    hold >>>= 3;
                    bits -= 3;
                  } else {
                    n = here_bits + 7;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    len = 0;
                    copy = 11 + (hold & 127);
                    hold >>>= 7;
                    bits -= 7;
                  }
                  if (state.have + copy > state.nlen + state.ndist) {
                    strm.msg = "invalid bit length repeat";
                    state.mode = BAD;
                    break;
                  }
                  while (copy--) {
                    state.lens[state.have++] = len;
                  }
                }
              }
              if (state.mode === BAD) {
                break;
              }
              if (state.lens[256] === 0) {
                strm.msg = "invalid code -- missing end-of-block";
                state.mode = BAD;
                break;
              }
              state.lenbits = 9;
              opts = { bits: state.lenbits };
              ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid literal/lengths set";
                state.mode = BAD;
                break;
              }
              state.distbits = 6;
              state.distcode = state.distdyn;
              opts = { bits: state.distbits };
              ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
              state.distbits = opts.bits;
              if (ret) {
                strm.msg = "invalid distances set";
                state.mode = BAD;
                break;
              }
              state.mode = LEN_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            case LEN_:
              state.mode = LEN;
            case LEN:
              if (have >= 6 && left >= 258) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits;
                inflate_fast(strm, _out);
                put = strm.next_out;
                output = strm.output;
                left = strm.avail_out;
                next = strm.next_in;
                input = strm.input;
                have = strm.avail_in;
                hold = state.hold;
                bits = state.bits;
                if (state.mode === TYPE) {
                  state.back = -1;
                }
                break;
              }
              state.back = 0;
              for (; ; ) {
                here = state.lencode[hold & (1 << state.lenbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (here_op && (here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= last_bits;
                bits -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              state.back += here_bits;
              state.length = here_val;
              if (here_op === 0) {
                state.mode = LIT;
                break;
              }
              if (here_op & 32) {
                state.back = -1;
                state.mode = TYPE;
                break;
              }
              if (here_op & 64) {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break;
              }
              state.extra = here_op & 15;
              state.mode = LENEXT;
            case LENEXT:
              if (state.extra) {
                n = state.extra;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.length += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits -= state.extra;
                state.back += state.extra;
              }
              state.was = state.length;
              state.mode = DIST;
            case DIST:
              for (; ; ) {
                here = state.distcode[hold & (1 << state.distbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if ((here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= last_bits;
                bits -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              state.back += here_bits;
              if (here_op & 64) {
                strm.msg = "invalid distance code";
                state.mode = BAD;
                break;
              }
              state.offset = here_val;
              state.extra = here_op & 15;
              state.mode = DISTEXT;
            case DISTEXT:
              if (state.extra) {
                n = state.extra;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.offset += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits -= state.extra;
                state.back += state.extra;
              }
              if (state.offset > state.dmax) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
              state.mode = MATCH;
            case MATCH:
              if (left === 0) {
                break inf_leave;
              }
              copy = _out - left;
              if (state.offset > copy) {
                copy = state.offset - copy;
                if (copy > state.whave) {
                  if (state.sane) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD;
                    break;
                  }
                }
                if (copy > state.wnext) {
                  copy -= state.wnext;
                  from = state.wsize - copy;
                } else {
                  from = state.wnext - copy;
                }
                if (copy > state.length) {
                  copy = state.length;
                }
                from_source = state.window;
              } else {
                from_source = output;
                from = put - state.offset;
                copy = state.length;
              }
              if (copy > left) {
                copy = left;
              }
              left -= copy;
              state.length -= copy;
              do {
                output[put++] = from_source[from++];
              } while (--copy);
              if (state.length === 0) {
                state.mode = LEN;
              }
              break;
            case LIT:
              if (left === 0) {
                break inf_leave;
              }
              output[put++] = state.length;
              left--;
              state.mode = LEN;
              break;
            case CHECK:
              if (state.wrap) {
                while (bits < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold |= input[next++] << bits;
                  bits += 8;
                }
                _out -= left;
                strm.total_out += _out;
                state.total += _out;
                if (_out) {
                  strm.adler = state.check = state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
                }
                _out = left;
                if ((state.flags ? hold : zswap32(hold)) !== state.check) {
                  strm.msg = "incorrect data check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              state.mode = LENGTH;
            case LENGTH:
              if (state.wrap && state.flags) {
                while (bits < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (hold !== (state.total & 4294967295)) {
                  strm.msg = "incorrect length check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              state.mode = DONE;
            case DONE:
              ret = Z_STREAM_END;
              break inf_leave;
            case BAD:
              ret = Z_DATA_ERROR;
              break inf_leave;
            case MEM:
              return Z_MEM_ERROR;
            case SYNC:
            default:
              return Z_STREAM_ERROR;
          }
        }
      strm.next_out = put;
      strm.avail_out = left;
      strm.next_in = next;
      strm.avail_in = have;
      state.hold = hold;
      state.bits = bits;
      if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH)) {
        if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
          state.mode = MEM;
          return Z_MEM_ERROR;
        }
      }
      _in -= strm.avail_in;
      _out -= strm.avail_out;
      strm.total_in += _in;
      strm.total_out += _out;
      state.total += _out;
      if (state.wrap && _out) {
        strm.adler = state.check = state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
      }
      strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
      if ((_in === 0 && _out === 0 || flush === Z_FINISH) && ret === Z_OK) {
        ret = Z_BUF_ERROR;
      }
      return ret;
    }
    function inflateEnd(strm) {
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      var state = strm.state;
      if (state.window) {
        state.window = null;
      }
      strm.state = null;
      return Z_OK;
    }
    function inflateGetHeader(strm, head) {
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if ((state.wrap & 2) === 0) {
        return Z_STREAM_ERROR;
      }
      state.head = head;
      head.done = false;
      return Z_OK;
    }
    function inflateSetDictionary(strm, dictionary) {
      var dictLength = dictionary.length;
      var state;
      var dictid;
      var ret;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.wrap !== 0 && state.mode !== DICT) {
        return Z_STREAM_ERROR;
      }
      if (state.mode === DICT) {
        dictid = 1;
        dictid = adler32(dictid, dictionary, dictLength, 0);
        if (dictid !== state.check) {
          return Z_DATA_ERROR;
        }
      }
      ret = updatewindow(strm, dictionary, dictLength, dictLength);
      if (ret) {
        state.mode = MEM;
        return Z_MEM_ERROR;
      }
      state.havedict = 1;
      return Z_OK;
    }
    exports.inflateReset = inflateReset;
    exports.inflateReset2 = inflateReset2;
    exports.inflateResetKeep = inflateResetKeep;
    exports.inflateInit = inflateInit;
    exports.inflateInit2 = inflateInit2;
    exports.inflate = inflate;
    exports.inflateEnd = inflateEnd;
    exports.inflateGetHeader = inflateGetHeader;
    exports.inflateSetDictionary = inflateSetDictionary;
    exports.inflateInfo = "pako inflate (from Nodeca project)";
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/constants.js
var require_constants = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      Z_NO_FLUSH: 0,
      Z_PARTIAL_FLUSH: 1,
      Z_SYNC_FLUSH: 2,
      Z_FULL_FLUSH: 3,
      Z_FINISH: 4,
      Z_BLOCK: 5,
      Z_TREES: 6,
      Z_OK: 0,
      Z_STREAM_END: 1,
      Z_NEED_DICT: 2,
      Z_ERRNO: -1,
      Z_STREAM_ERROR: -2,
      Z_DATA_ERROR: -3,
      Z_BUF_ERROR: -5,
      Z_NO_COMPRESSION: 0,
      Z_BEST_SPEED: 1,
      Z_BEST_COMPRESSION: 9,
      Z_DEFAULT_COMPRESSION: -1,
      Z_FILTERED: 1,
      Z_HUFFMAN_ONLY: 2,
      Z_RLE: 3,
      Z_FIXED: 4,
      Z_DEFAULT_STRATEGY: 0,
      Z_BINARY: 0,
      Z_TEXT: 1,
      Z_UNKNOWN: 2,
      Z_DEFLATED: 8
    };
  }
});

// node_modules/jszip/node_modules/pako/lib/zlib/gzheader.js
var require_gzheader = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/zlib/gzheader.js"(exports, module) {
    "use strict";
    function GZheader() {
      this.text = 0;
      this.time = 0;
      this.xflags = 0;
      this.os = 0;
      this.extra = null;
      this.extra_len = 0;
      this.name = "";
      this.comment = "";
      this.hcrc = 0;
      this.done = false;
    }
    module.exports = GZheader;
  }
});

// node_modules/jszip/node_modules/pako/lib/inflate.js
var require_inflate2 = __commonJS({
  "node_modules/jszip/node_modules/pako/lib/inflate.js"(exports) {
    "use strict";
    var zlib_inflate = require_inflate();
    var utils = require_common();
    var strings = require_strings();
    var c = require_constants();
    var msg = require_messages();
    var ZStream = require_zstream();
    var GZheader = require_gzheader();
    var toString = Object.prototype.toString;
    function Inflate(options) {
      if (!(this instanceof Inflate))
        return new Inflate(options);
      this.options = utils.assign({
        chunkSize: 16384,
        windowBits: 0,
        to: ""
      }, options || {});
      var opt = this.options;
      if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
        opt.windowBits = -opt.windowBits;
        if (opt.windowBits === 0) {
          opt.windowBits = -15;
        }
      }
      if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
        opt.windowBits += 32;
      }
      if (opt.windowBits > 15 && opt.windowBits < 48) {
        if ((opt.windowBits & 15) === 0) {
          opt.windowBits |= 15;
        }
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      var status = zlib_inflate.inflateInit2(this.strm, opt.windowBits);
      if (status !== c.Z_OK) {
        throw new Error(msg[status]);
      }
      this.header = new GZheader();
      zlib_inflate.inflateGetHeader(this.strm, this.header);
      if (opt.dictionary) {
        if (typeof opt.dictionary === "string") {
          opt.dictionary = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          opt.dictionary = new Uint8Array(opt.dictionary);
        }
        if (opt.raw) {
          status = zlib_inflate.inflateSetDictionary(this.strm, opt.dictionary);
          if (status !== c.Z_OK) {
            throw new Error(msg[status]);
          }
        }
      }
    }
    Inflate.prototype.push = function(data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var dictionary = this.options.dictionary;
      var status, _mode;
      var next_out_utf8, tail, utf8str;
      var allowBufError = false;
      if (this.ended) {
        return false;
      }
      _mode = mode === ~~mode ? mode : mode === true ? c.Z_FINISH : c.Z_NO_FLUSH;
      if (typeof data === "string") {
        strm.input = strings.binstring2buf(data);
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      do {
        if (strm.avail_out === 0) {
          strm.output = new utils.Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH);
        if (status === c.Z_NEED_DICT && dictionary) {
          status = zlib_inflate.inflateSetDictionary(this.strm, dictionary);
        }
        if (status === c.Z_BUF_ERROR && allowBufError === true) {
          status = c.Z_OK;
          allowBufError = false;
        }
        if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }
        if (strm.next_out) {
          if (strm.avail_out === 0 || status === c.Z_STREAM_END || strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH)) {
            if (this.options.to === "string") {
              next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
              tail = strm.next_out - next_out_utf8;
              utf8str = strings.buf2string(strm.output, next_out_utf8);
              strm.next_out = tail;
              strm.avail_out = chunkSize - tail;
              if (tail) {
                utils.arraySet(strm.output, strm.output, next_out_utf8, tail, 0);
              }
              this.onData(utf8str);
            } else {
              this.onData(utils.shrinkBuf(strm.output, strm.next_out));
            }
          }
        }
        if (strm.avail_in === 0 && strm.avail_out === 0) {
          allowBufError = true;
        }
      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END);
      if (status === c.Z_STREAM_END) {
        _mode = c.Z_FINISH;
      }
      if (_mode === c.Z_FINISH) {
        status = zlib_inflate.inflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === c.Z_OK;
      }
      if (_mode === c.Z_SYNC_FLUSH) {
        this.onEnd(c.Z_OK);
        strm.avail_out = 0;
        return true;
      }
      return true;
    };
    Inflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Inflate.prototype.onEnd = function(status) {
      if (status === c.Z_OK) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = utils.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function inflate(input, options) {
      var inflator = new Inflate(options);
      inflator.push(input, true);
      if (inflator.err) {
        throw inflator.msg || msg[inflator.err];
      }
      return inflator.result;
    }
    function inflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return inflate(input, options);
    }
    exports.Inflate = Inflate;
    exports.inflate = inflate;
    exports.inflateRaw = inflateRaw;
    exports.ungzip = inflate;
  }
});

// node_modules/jszip/node_modules/pako/index.js
var require_pako = __commonJS({
  "node_modules/jszip/node_modules/pako/index.js"(exports, module) {
    "use strict";
    var assign = require_common().assign;
    var deflate = require_deflate2();
    var inflate = require_inflate2();
    var constants = require_constants();
    var pako = {};
    assign(pako, deflate, inflate, constants);
    module.exports = pako;
  }
});

// node_modules/jszip/lib/flate.js
var require_flate = __commonJS({
  "node_modules/jszip/lib/flate.js"(exports) {
    "use strict";
    var USE_TYPEDARRAY = typeof Uint8Array !== "undefined" && typeof Uint16Array !== "undefined" && typeof Uint32Array !== "undefined";
    var pako = require_pako();
    var utils = require_utils();
    var GenericWorker = require_GenericWorker();
    var ARRAY_TYPE = USE_TYPEDARRAY ? "uint8array" : "array";
    exports.magic = "\b\0";
    function FlateWorker(action, options) {
      GenericWorker.call(this, "FlateWorker/" + action);
      this._pako = null;
      this._pakoAction = action;
      this._pakoOptions = options;
      this.meta = {};
    }
    utils.inherits(FlateWorker, GenericWorker);
    FlateWorker.prototype.processChunk = function(chunk) {
      this.meta = chunk.meta;
      if (this._pako === null) {
        this._createPako();
      }
      this._pako.push(utils.transformTo(ARRAY_TYPE, chunk.data), false);
    };
    FlateWorker.prototype.flush = function() {
      GenericWorker.prototype.flush.call(this);
      if (this._pako === null) {
        this._createPako();
      }
      this._pako.push([], true);
    };
    FlateWorker.prototype.cleanUp = function() {
      GenericWorker.prototype.cleanUp.call(this);
      this._pako = null;
    };
    FlateWorker.prototype._createPako = function() {
      this._pako = new pako[this._pakoAction]({
        raw: true,
        level: this._pakoOptions.level || -1
      });
      var self2 = this;
      this._pako.onData = function(data) {
        self2.push({
          data,
          meta: self2.meta
        });
      };
    };
    exports.compressWorker = function(compressionOptions) {
      return new FlateWorker("Deflate", compressionOptions);
    };
    exports.uncompressWorker = function() {
      return new FlateWorker("Inflate", {});
    };
  }
});

// node_modules/jszip/lib/compressions.js
var require_compressions = __commonJS({
  "node_modules/jszip/lib/compressions.js"(exports) {
    "use strict";
    var GenericWorker = require_GenericWorker();
    exports.STORE = {
      magic: "\0\0",
      compressWorker: function() {
        return new GenericWorker("STORE compression");
      },
      uncompressWorker: function() {
        return new GenericWorker("STORE decompression");
      }
    };
    exports.DEFLATE = require_flate();
  }
});

// node_modules/jszip/lib/signature.js
var require_signature = __commonJS({
  "node_modules/jszip/lib/signature.js"(exports) {
    "use strict";
    exports.LOCAL_FILE_HEADER = "PK";
    exports.CENTRAL_FILE_HEADER = "PK";
    exports.CENTRAL_DIRECTORY_END = "PK";
    exports.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07";
    exports.ZIP64_CENTRAL_DIRECTORY_END = "PK";
    exports.DATA_DESCRIPTOR = "PK\x07\b";
  }
});

// node_modules/jszip/lib/generate/ZipFileWorker.js
var require_ZipFileWorker = __commonJS({
  "node_modules/jszip/lib/generate/ZipFileWorker.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var GenericWorker = require_GenericWorker();
    var utf8 = require_utf8();
    var crc32 = require_crc32();
    var signature = require_signature();
    var decToHex = function(dec, bytes) {
      var hex = "", i;
      for (i = 0; i < bytes; i++) {
        hex += String.fromCharCode(dec & 255);
        dec = dec >>> 8;
      }
      return hex;
    };
    var generateUnixExternalFileAttr = function(unixPermissions, isDir) {
      var result = unixPermissions;
      if (!unixPermissions) {
        result = isDir ? 16893 : 33204;
      }
      return (result & 65535) << 16;
    };
    var generateDosExternalFileAttr = function(dosPermissions) {
      return (dosPermissions || 0) & 63;
    };
    var generateZipParts = function(streamInfo, streamedContent, streamingEnded, offset, platform, encodeFileName) {
      var file = streamInfo["file"], compression = streamInfo["compression"], useCustomEncoding = encodeFileName !== utf8.utf8encode, encodedFileName = utils.transformTo("string", encodeFileName(file.name)), utfEncodedFileName = utils.transformTo("string", utf8.utf8encode(file.name)), comment = file.comment, encodedComment = utils.transformTo("string", encodeFileName(comment)), utfEncodedComment = utils.transformTo("string", utf8.utf8encode(comment)), useUTF8ForFileName = utfEncodedFileName.length !== file.name.length, useUTF8ForComment = utfEncodedComment.length !== comment.length, dosTime, dosDate, extraFields = "", unicodePathExtraField = "", unicodeCommentExtraField = "", dir = file.dir, date = file.date;
      var dataInfo = {
        crc32: 0,
        compressedSize: 0,
        uncompressedSize: 0
      };
      if (!streamedContent || streamingEnded) {
        dataInfo.crc32 = streamInfo["crc32"];
        dataInfo.compressedSize = streamInfo["compressedSize"];
        dataInfo.uncompressedSize = streamInfo["uncompressedSize"];
      }
      var bitflag = 0;
      if (streamedContent) {
        bitflag |= 8;
      }
      if (!useCustomEncoding && (useUTF8ForFileName || useUTF8ForComment)) {
        bitflag |= 2048;
      }
      var extFileAttr = 0;
      var versionMadeBy = 0;
      if (dir) {
        extFileAttr |= 16;
      }
      if (platform === "UNIX") {
        versionMadeBy = 798;
        extFileAttr |= generateUnixExternalFileAttr(file.unixPermissions, dir);
      } else {
        versionMadeBy = 20;
        extFileAttr |= generateDosExternalFileAttr(file.dosPermissions, dir);
      }
      dosTime = date.getUTCHours();
      dosTime = dosTime << 6;
      dosTime = dosTime | date.getUTCMinutes();
      dosTime = dosTime << 5;
      dosTime = dosTime | date.getUTCSeconds() / 2;
      dosDate = date.getUTCFullYear() - 1980;
      dosDate = dosDate << 4;
      dosDate = dosDate | date.getUTCMonth() + 1;
      dosDate = dosDate << 5;
      dosDate = dosDate | date.getUTCDate();
      if (useUTF8ForFileName) {
        unicodePathExtraField = decToHex(1, 1) + decToHex(crc32(encodedFileName), 4) + utfEncodedFileName;
        extraFields += "up" + decToHex(unicodePathExtraField.length, 2) + unicodePathExtraField;
      }
      if (useUTF8ForComment) {
        unicodeCommentExtraField = decToHex(1, 1) + decToHex(crc32(encodedComment), 4) + utfEncodedComment;
        extraFields += "uc" + decToHex(unicodeCommentExtraField.length, 2) + unicodeCommentExtraField;
      }
      var header = "";
      header += "\n\0";
      header += decToHex(bitflag, 2);
      header += compression.magic;
      header += decToHex(dosTime, 2);
      header += decToHex(dosDate, 2);
      header += decToHex(dataInfo.crc32, 4);
      header += decToHex(dataInfo.compressedSize, 4);
      header += decToHex(dataInfo.uncompressedSize, 4);
      header += decToHex(encodedFileName.length, 2);
      header += decToHex(extraFields.length, 2);
      var fileRecord = signature.LOCAL_FILE_HEADER + header + encodedFileName + extraFields;
      var dirRecord = signature.CENTRAL_FILE_HEADER + decToHex(versionMadeBy, 2) + header + decToHex(encodedComment.length, 2) + "\0\0\0\0" + decToHex(extFileAttr, 4) + decToHex(offset, 4) + encodedFileName + extraFields + encodedComment;
      return {
        fileRecord,
        dirRecord
      };
    };
    var generateCentralDirectoryEnd = function(entriesCount, centralDirLength, localDirLength, comment, encodeFileName) {
      var dirEnd = "";
      var encodedComment = utils.transformTo("string", encodeFileName(comment));
      dirEnd = signature.CENTRAL_DIRECTORY_END + "\0\0\0\0" + decToHex(entriesCount, 2) + decToHex(entriesCount, 2) + decToHex(centralDirLength, 4) + decToHex(localDirLength, 4) + decToHex(encodedComment.length, 2) + encodedComment;
      return dirEnd;
    };
    var generateDataDescriptors = function(streamInfo) {
      var descriptor = "";
      descriptor = signature.DATA_DESCRIPTOR + decToHex(streamInfo["crc32"], 4) + decToHex(streamInfo["compressedSize"], 4) + decToHex(streamInfo["uncompressedSize"], 4);
      return descriptor;
    };
    function ZipFileWorker(streamFiles, comment, platform, encodeFileName) {
      GenericWorker.call(this, "ZipFileWorker");
      this.bytesWritten = 0;
      this.zipComment = comment;
      this.zipPlatform = platform;
      this.encodeFileName = encodeFileName;
      this.streamFiles = streamFiles;
      this.accumulate = false;
      this.contentBuffer = [];
      this.dirRecords = [];
      this.currentSourceOffset = 0;
      this.entriesCount = 0;
      this.currentFile = null;
      this._sources = [];
    }
    utils.inherits(ZipFileWorker, GenericWorker);
    ZipFileWorker.prototype.push = function(chunk) {
      var currentFilePercent = chunk.meta.percent || 0;
      var entriesCount = this.entriesCount;
      var remainingFiles = this._sources.length;
      if (this.accumulate) {
        this.contentBuffer.push(chunk);
      } else {
        this.bytesWritten += chunk.data.length;
        GenericWorker.prototype.push.call(this, {
          data: chunk.data,
          meta: {
            currentFile: this.currentFile,
            percent: entriesCount ? (currentFilePercent + 100 * (entriesCount - remainingFiles - 1)) / entriesCount : 100
          }
        });
      }
    };
    ZipFileWorker.prototype.openedSource = function(streamInfo) {
      this.currentSourceOffset = this.bytesWritten;
      this.currentFile = streamInfo["file"].name;
      var streamedContent = this.streamFiles && !streamInfo["file"].dir;
      if (streamedContent) {
        var record = generateZipParts(streamInfo, streamedContent, false, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
        this.push({
          data: record.fileRecord,
          meta: { percent: 0 }
        });
      } else {
        this.accumulate = true;
      }
    };
    ZipFileWorker.prototype.closedSource = function(streamInfo) {
      this.accumulate = false;
      var streamedContent = this.streamFiles && !streamInfo["file"].dir;
      var record = generateZipParts(streamInfo, streamedContent, true, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
      this.dirRecords.push(record.dirRecord);
      if (streamedContent) {
        this.push({
          data: generateDataDescriptors(streamInfo),
          meta: { percent: 100 }
        });
      } else {
        this.push({
          data: record.fileRecord,
          meta: { percent: 0 }
        });
        while (this.contentBuffer.length) {
          this.push(this.contentBuffer.shift());
        }
      }
      this.currentFile = null;
    };
    ZipFileWorker.prototype.flush = function() {
      var localDirLength = this.bytesWritten;
      for (var i = 0; i < this.dirRecords.length; i++) {
        this.push({
          data: this.dirRecords[i],
          meta: { percent: 100 }
        });
      }
      var centralDirLength = this.bytesWritten - localDirLength;
      var dirEnd = generateCentralDirectoryEnd(this.dirRecords.length, centralDirLength, localDirLength, this.zipComment, this.encodeFileName);
      this.push({
        data: dirEnd,
        meta: { percent: 100 }
      });
    };
    ZipFileWorker.prototype.prepareNextSource = function() {
      this.previous = this._sources.shift();
      this.openedSource(this.previous.streamInfo);
      if (this.isPaused) {
        this.previous.pause();
      } else {
        this.previous.resume();
      }
    };
    ZipFileWorker.prototype.registerPrevious = function(previous) {
      this._sources.push(previous);
      var self2 = this;
      previous.on("data", function(chunk) {
        self2.processChunk(chunk);
      });
      previous.on("end", function() {
        self2.closedSource(self2.previous.streamInfo);
        if (self2._sources.length) {
          self2.prepareNextSource();
        } else {
          self2.end();
        }
      });
      previous.on("error", function(e) {
        self2.error(e);
      });
      return this;
    };
    ZipFileWorker.prototype.resume = function() {
      if (!GenericWorker.prototype.resume.call(this)) {
        return false;
      }
      if (!this.previous && this._sources.length) {
        this.prepareNextSource();
        return true;
      }
      if (!this.previous && !this._sources.length && !this.generatedError) {
        this.end();
        return true;
      }
    };
    ZipFileWorker.prototype.error = function(e) {
      var sources = this._sources;
      if (!GenericWorker.prototype.error.call(this, e)) {
        return false;
      }
      for (var i = 0; i < sources.length; i++) {
        try {
          sources[i].error(e);
        } catch (e2) {
        }
      }
      return true;
    };
    ZipFileWorker.prototype.lock = function() {
      GenericWorker.prototype.lock.call(this);
      var sources = this._sources;
      for (var i = 0; i < sources.length; i++) {
        sources[i].lock();
      }
    };
    module.exports = ZipFileWorker;
  }
});

// node_modules/jszip/lib/generate/index.js
var require_generate = __commonJS({
  "node_modules/jszip/lib/generate/index.js"(exports) {
    "use strict";
    var compressions = require_compressions();
    var ZipFileWorker = require_ZipFileWorker();
    var getCompression = function(fileCompression, zipCompression) {
      var compressionName = fileCompression || zipCompression;
      var compression = compressions[compressionName];
      if (!compression) {
        throw new Error(compressionName + " is not a valid compression method !");
      }
      return compression;
    };
    exports.generateWorker = function(zip, options, comment) {
      var zipFileWorker = new ZipFileWorker(options.streamFiles, comment, options.platform, options.encodeFileName);
      var entriesCount = 0;
      try {
        zip.forEach(function(relativePath, file) {
          entriesCount++;
          var compression = getCompression(file.options.compression, options.compression);
          var compressionOptions = file.options.compressionOptions || options.compressionOptions || {};
          var dir = file.dir, date = file.date;
          file._compressWorker(compression, compressionOptions).withStreamInfo("file", {
            name: relativePath,
            dir,
            date,
            comment: file.comment || "",
            unixPermissions: file.unixPermissions,
            dosPermissions: file.dosPermissions
          }).pipe(zipFileWorker);
        });
        zipFileWorker.entriesCount = entriesCount;
      } catch (e) {
        zipFileWorker.error(e);
      }
      return zipFileWorker;
    };
  }
});

// node_modules/jszip/lib/nodejs/NodejsStreamInputAdapter.js
var require_NodejsStreamInputAdapter = __commonJS({
  "node_modules/jszip/lib/nodejs/NodejsStreamInputAdapter.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var GenericWorker = require_GenericWorker();
    function NodejsStreamInputAdapter(filename, stream) {
      GenericWorker.call(this, "Nodejs stream input adapter for " + filename);
      this._upstreamEnded = false;
      this._bindStream(stream);
    }
    utils.inherits(NodejsStreamInputAdapter, GenericWorker);
    NodejsStreamInputAdapter.prototype._bindStream = function(stream) {
      var self2 = this;
      this._stream = stream;
      stream.pause();
      stream.on("data", function(chunk) {
        self2.push({
          data: chunk,
          meta: {
            percent: 0
          }
        });
      }).on("error", function(e) {
        if (self2.isPaused) {
          this.generatedError = e;
        } else {
          self2.error(e);
        }
      }).on("end", function() {
        if (self2.isPaused) {
          self2._upstreamEnded = true;
        } else {
          self2.end();
        }
      });
    };
    NodejsStreamInputAdapter.prototype.pause = function() {
      if (!GenericWorker.prototype.pause.call(this)) {
        return false;
      }
      this._stream.pause();
      return true;
    };
    NodejsStreamInputAdapter.prototype.resume = function() {
      if (!GenericWorker.prototype.resume.call(this)) {
        return false;
      }
      if (this._upstreamEnded) {
        this.end();
      } else {
        this._stream.resume();
      }
      return true;
    };
    module.exports = NodejsStreamInputAdapter;
  }
});

// node_modules/jszip/lib/object.js
var require_object = __commonJS({
  "node_modules/jszip/lib/object.js"(exports, module) {
    "use strict";
    var utf8 = require_utf8();
    var utils = require_utils();
    var GenericWorker = require_GenericWorker();
    var StreamHelper = require_StreamHelper();
    var defaults = require_defaults();
    var CompressedObject = require_compressedObject();
    var ZipObject = require_zipObject();
    var generate = require_generate();
    var nodejsUtils = require_nodejsUtils();
    var NodejsStreamInputAdapter = require_NodejsStreamInputAdapter();
    var fileAdd = function(name, data, originalOptions) {
      var dataType = utils.getTypeOf(data), parent;
      var o = utils.extend(originalOptions || {}, defaults);
      o.date = o.date || new Date();
      if (o.compression !== null) {
        o.compression = o.compression.toUpperCase();
      }
      if (typeof o.unixPermissions === "string") {
        o.unixPermissions = parseInt(o.unixPermissions, 8);
      }
      if (o.unixPermissions && o.unixPermissions & 16384) {
        o.dir = true;
      }
      if (o.dosPermissions && o.dosPermissions & 16) {
        o.dir = true;
      }
      if (o.dir) {
        name = forceTrailingSlash(name);
      }
      if (o.createFolders && (parent = parentFolder(name))) {
        folderAdd.call(this, parent, true);
      }
      var isUnicodeString = dataType === "string" && o.binary === false && o.base64 === false;
      if (!originalOptions || typeof originalOptions.binary === "undefined") {
        o.binary = !isUnicodeString;
      }
      var isCompressedEmpty = data instanceof CompressedObject && data.uncompressedSize === 0;
      if (isCompressedEmpty || o.dir || !data || data.length === 0) {
        o.base64 = false;
        o.binary = true;
        data = "";
        o.compression = "STORE";
        dataType = "string";
      }
      var zipObjectContent = null;
      if (data instanceof CompressedObject || data instanceof GenericWorker) {
        zipObjectContent = data;
      } else if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
        zipObjectContent = new NodejsStreamInputAdapter(name, data);
      } else {
        zipObjectContent = utils.prepareContent(name, data, o.binary, o.optimizedBinaryString, o.base64);
      }
      var object = new ZipObject(name, zipObjectContent, o);
      this.files[name] = object;
    };
    var parentFolder = function(path) {
      if (path.slice(-1) === "/") {
        path = path.substring(0, path.length - 1);
      }
      var lastSlash = path.lastIndexOf("/");
      return lastSlash > 0 ? path.substring(0, lastSlash) : "";
    };
    var forceTrailingSlash = function(path) {
      if (path.slice(-1) !== "/") {
        path += "/";
      }
      return path;
    };
    var folderAdd = function(name, createFolders) {
      createFolders = typeof createFolders !== "undefined" ? createFolders : defaults.createFolders;
      name = forceTrailingSlash(name);
      if (!this.files[name]) {
        fileAdd.call(this, name, null, {
          dir: true,
          createFolders
        });
      }
      return this.files[name];
    };
    function isRegExp(object) {
      return Object.prototype.toString.call(object) === "[object RegExp]";
    }
    var out = {
      load: function() {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
      },
      forEach: function(cb) {
        var filename, relativePath, file;
        for (filename in this.files) {
          file = this.files[filename];
          relativePath = filename.slice(this.root.length, filename.length);
          if (relativePath && filename.slice(0, this.root.length) === this.root) {
            cb(relativePath, file);
          }
        }
      },
      filter: function(search) {
        var result = [];
        this.forEach(function(relativePath, entry) {
          if (search(relativePath, entry)) {
            result.push(entry);
          }
        });
        return result;
      },
      file: function(name, data, o) {
        if (arguments.length === 1) {
          if (isRegExp(name)) {
            var regexp = name;
            return this.filter(function(relativePath, file) {
              return !file.dir && regexp.test(relativePath);
            });
          } else {
            var obj = this.files[this.root + name];
            if (obj && !obj.dir) {
              return obj;
            } else {
              return null;
            }
          }
        } else {
          name = this.root + name;
          fileAdd.call(this, name, data, o);
        }
        return this;
      },
      folder: function(arg) {
        if (!arg) {
          return this;
        }
        if (isRegExp(arg)) {
          return this.filter(function(relativePath, file) {
            return file.dir && arg.test(relativePath);
          });
        }
        var name = this.root + arg;
        var newFolder = folderAdd.call(this, name);
        var ret = this.clone();
        ret.root = newFolder.name;
        return ret;
      },
      remove: function(name) {
        name = this.root + name;
        var file = this.files[name];
        if (!file) {
          if (name.slice(-1) !== "/") {
            name += "/";
          }
          file = this.files[name];
        }
        if (file && !file.dir) {
          delete this.files[name];
        } else {
          var kids = this.filter(function(relativePath, file2) {
            return file2.name.slice(0, name.length) === name;
          });
          for (var i = 0; i < kids.length; i++) {
            delete this.files[kids[i].name];
          }
        }
        return this;
      },
      generate: function() {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
      },
      generateInternalStream: function(options) {
        var worker, opts = {};
        try {
          opts = utils.extend(options || {}, {
            streamFiles: false,
            compression: "STORE",
            compressionOptions: null,
            type: "",
            platform: "DOS",
            comment: null,
            mimeType: "application/zip",
            encodeFileName: utf8.utf8encode
          });
          opts.type = opts.type.toLowerCase();
          opts.compression = opts.compression.toUpperCase();
          if (opts.type === "binarystring") {
            opts.type = "string";
          }
          if (!opts.type) {
            throw new Error("No output type specified.");
          }
          utils.checkSupport(opts.type);
          if (opts.platform === "darwin" || opts.platform === "freebsd" || opts.platform === "linux" || opts.platform === "sunos") {
            opts.platform = "UNIX";
          }
          if (opts.platform === "win32") {
            opts.platform = "DOS";
          }
          var comment = opts.comment || this.comment || "";
          worker = generate.generateWorker(this, opts, comment);
        } catch (e) {
          worker = new GenericWorker("error");
          worker.error(e);
        }
        return new StreamHelper(worker, opts.type || "string", opts.mimeType);
      },
      generateAsync: function(options, onUpdate) {
        return this.generateInternalStream(options).accumulate(onUpdate);
      },
      generateNodeStream: function(options, onUpdate) {
        options = options || {};
        if (!options.type) {
          options.type = "nodebuffer";
        }
        return this.generateInternalStream(options).toNodejsStream(onUpdate);
      }
    };
    module.exports = out;
  }
});

// node_modules/jszip/lib/reader/DataReader.js
var require_DataReader = __commonJS({
  "node_modules/jszip/lib/reader/DataReader.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    function DataReader(data) {
      this.data = data;
      this.length = data.length;
      this.index = 0;
      this.zero = 0;
    }
    DataReader.prototype = {
      checkOffset: function(offset) {
        this.checkIndex(this.index + offset);
      },
      checkIndex: function(newIndex) {
        if (this.length < this.zero + newIndex || newIndex < 0) {
          throw new Error("End of data reached (data length = " + this.length + ", asked index = " + newIndex + "). Corrupted zip ?");
        }
      },
      setIndex: function(newIndex) {
        this.checkIndex(newIndex);
        this.index = newIndex;
      },
      skip: function(n) {
        this.setIndex(this.index + n);
      },
      byteAt: function() {
      },
      readInt: function(size) {
        var result = 0, i;
        this.checkOffset(size);
        for (i = this.index + size - 1; i >= this.index; i--) {
          result = (result << 8) + this.byteAt(i);
        }
        this.index += size;
        return result;
      },
      readString: function(size) {
        return utils.transformTo("string", this.readData(size));
      },
      readData: function() {
      },
      lastIndexOfSignature: function() {
      },
      readAndCheckSignature: function() {
      },
      readDate: function() {
        var dostime = this.readInt(4);
        return new Date(Date.UTC((dostime >> 25 & 127) + 1980, (dostime >> 21 & 15) - 1, dostime >> 16 & 31, dostime >> 11 & 31, dostime >> 5 & 63, (dostime & 31) << 1));
      }
    };
    module.exports = DataReader;
  }
});

// node_modules/jszip/lib/reader/ArrayReader.js
var require_ArrayReader = __commonJS({
  "node_modules/jszip/lib/reader/ArrayReader.js"(exports, module) {
    "use strict";
    var DataReader = require_DataReader();
    var utils = require_utils();
    function ArrayReader(data) {
      DataReader.call(this, data);
      for (var i = 0; i < this.data.length; i++) {
        data[i] = data[i] & 255;
      }
    }
    utils.inherits(ArrayReader, DataReader);
    ArrayReader.prototype.byteAt = function(i) {
      return this.data[this.zero + i];
    };
    ArrayReader.prototype.lastIndexOfSignature = function(sig) {
      var sig0 = sig.charCodeAt(0), sig1 = sig.charCodeAt(1), sig2 = sig.charCodeAt(2), sig3 = sig.charCodeAt(3);
      for (var i = this.length - 4; i >= 0; --i) {
        if (this.data[i] === sig0 && this.data[i + 1] === sig1 && this.data[i + 2] === sig2 && this.data[i + 3] === sig3) {
          return i - this.zero;
        }
      }
      return -1;
    };
    ArrayReader.prototype.readAndCheckSignature = function(sig) {
      var sig0 = sig.charCodeAt(0), sig1 = sig.charCodeAt(1), sig2 = sig.charCodeAt(2), sig3 = sig.charCodeAt(3), data = this.readData(4);
      return sig0 === data[0] && sig1 === data[1] && sig2 === data[2] && sig3 === data[3];
    };
    ArrayReader.prototype.readData = function(size) {
      this.checkOffset(size);
      if (size === 0) {
        return [];
      }
      var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
      this.index += size;
      return result;
    };
    module.exports = ArrayReader;
  }
});

// node_modules/jszip/lib/reader/StringReader.js
var require_StringReader = __commonJS({
  "node_modules/jszip/lib/reader/StringReader.js"(exports, module) {
    "use strict";
    var DataReader = require_DataReader();
    var utils = require_utils();
    function StringReader(data) {
      DataReader.call(this, data);
    }
    utils.inherits(StringReader, DataReader);
    StringReader.prototype.byteAt = function(i) {
      return this.data.charCodeAt(this.zero + i);
    };
    StringReader.prototype.lastIndexOfSignature = function(sig) {
      return this.data.lastIndexOf(sig) - this.zero;
    };
    StringReader.prototype.readAndCheckSignature = function(sig) {
      var data = this.readData(4);
      return sig === data;
    };
    StringReader.prototype.readData = function(size) {
      this.checkOffset(size);
      var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
      this.index += size;
      return result;
    };
    module.exports = StringReader;
  }
});

// node_modules/jszip/lib/reader/Uint8ArrayReader.js
var require_Uint8ArrayReader = __commonJS({
  "node_modules/jszip/lib/reader/Uint8ArrayReader.js"(exports, module) {
    "use strict";
    var ArrayReader = require_ArrayReader();
    var utils = require_utils();
    function Uint8ArrayReader(data) {
      ArrayReader.call(this, data);
    }
    utils.inherits(Uint8ArrayReader, ArrayReader);
    Uint8ArrayReader.prototype.readData = function(size) {
      this.checkOffset(size);
      if (size === 0) {
        return new Uint8Array(0);
      }
      var result = this.data.subarray(this.zero + this.index, this.zero + this.index + size);
      this.index += size;
      return result;
    };
    module.exports = Uint8ArrayReader;
  }
});

// node_modules/jszip/lib/reader/NodeBufferReader.js
var require_NodeBufferReader = __commonJS({
  "node_modules/jszip/lib/reader/NodeBufferReader.js"(exports, module) {
    "use strict";
    var Uint8ArrayReader = require_Uint8ArrayReader();
    var utils = require_utils();
    function NodeBufferReader(data) {
      Uint8ArrayReader.call(this, data);
    }
    utils.inherits(NodeBufferReader, Uint8ArrayReader);
    NodeBufferReader.prototype.readData = function(size) {
      this.checkOffset(size);
      var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
      this.index += size;
      return result;
    };
    module.exports = NodeBufferReader;
  }
});

// node_modules/jszip/lib/reader/readerFor.js
var require_readerFor = __commonJS({
  "node_modules/jszip/lib/reader/readerFor.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var support = require_support();
    var ArrayReader = require_ArrayReader();
    var StringReader = require_StringReader();
    var NodeBufferReader = require_NodeBufferReader();
    var Uint8ArrayReader = require_Uint8ArrayReader();
    module.exports = function(data) {
      var type = utils.getTypeOf(data);
      utils.checkSupport(type);
      if (type === "string" && !support.uint8array) {
        return new StringReader(data);
      }
      if (type === "nodebuffer") {
        return new NodeBufferReader(data);
      }
      if (support.uint8array) {
        return new Uint8ArrayReader(utils.transformTo("uint8array", data));
      }
      return new ArrayReader(utils.transformTo("array", data));
    };
  }
});

// node_modules/jszip/lib/zipEntry.js
var require_zipEntry = __commonJS({
  "node_modules/jszip/lib/zipEntry.js"(exports, module) {
    "use strict";
    var readerFor = require_readerFor();
    var utils = require_utils();
    var CompressedObject = require_compressedObject();
    var crc32fn = require_crc32();
    var utf8 = require_utf8();
    var compressions = require_compressions();
    var support = require_support();
    var MADE_BY_DOS = 0;
    var MADE_BY_UNIX = 3;
    var findCompression = function(compressionMethod) {
      for (var method in compressions) {
        if (!Object.prototype.hasOwnProperty.call(compressions, method)) {
          continue;
        }
        if (compressions[method].magic === compressionMethod) {
          return compressions[method];
        }
      }
      return null;
    };
    function ZipEntry(options, loadOptions) {
      this.options = options;
      this.loadOptions = loadOptions;
    }
    ZipEntry.prototype = {
      isEncrypted: function() {
        return (this.bitFlag & 1) === 1;
      },
      useUTF8: function() {
        return (this.bitFlag & 2048) === 2048;
      },
      readLocalPart: function(reader) {
        var compression, localExtraFieldsLength;
        reader.skip(22);
        this.fileNameLength = reader.readInt(2);
        localExtraFieldsLength = reader.readInt(2);
        this.fileName = reader.readData(this.fileNameLength);
        reader.skip(localExtraFieldsLength);
        if (this.compressedSize === -1 || this.uncompressedSize === -1) {
          throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
        }
        compression = findCompression(this.compressionMethod);
        if (compression === null) {
          throw new Error("Corrupted zip : compression " + utils.pretty(this.compressionMethod) + " unknown (inner file : " + utils.transformTo("string", this.fileName) + ")");
        }
        this.decompressed = new CompressedObject(this.compressedSize, this.uncompressedSize, this.crc32, compression, reader.readData(this.compressedSize));
      },
      readCentralPart: function(reader) {
        this.versionMadeBy = reader.readInt(2);
        reader.skip(2);
        this.bitFlag = reader.readInt(2);
        this.compressionMethod = reader.readString(2);
        this.date = reader.readDate();
        this.crc32 = reader.readInt(4);
        this.compressedSize = reader.readInt(4);
        this.uncompressedSize = reader.readInt(4);
        var fileNameLength = reader.readInt(2);
        this.extraFieldsLength = reader.readInt(2);
        this.fileCommentLength = reader.readInt(2);
        this.diskNumberStart = reader.readInt(2);
        this.internalFileAttributes = reader.readInt(2);
        this.externalFileAttributes = reader.readInt(4);
        this.localHeaderOffset = reader.readInt(4);
        if (this.isEncrypted()) {
          throw new Error("Encrypted zip are not supported");
        }
        reader.skip(fileNameLength);
        this.readExtraFields(reader);
        this.parseZIP64ExtraField(reader);
        this.fileComment = reader.readData(this.fileCommentLength);
      },
      processAttributes: function() {
        this.unixPermissions = null;
        this.dosPermissions = null;
        var madeBy = this.versionMadeBy >> 8;
        this.dir = this.externalFileAttributes & 16 ? true : false;
        if (madeBy === MADE_BY_DOS) {
          this.dosPermissions = this.externalFileAttributes & 63;
        }
        if (madeBy === MADE_BY_UNIX) {
          this.unixPermissions = this.externalFileAttributes >> 16 & 65535;
        }
        if (!this.dir && this.fileNameStr.slice(-1) === "/") {
          this.dir = true;
        }
      },
      parseZIP64ExtraField: function() {
        if (!this.extraFields[1]) {
          return;
        }
        var extraReader = readerFor(this.extraFields[1].value);
        if (this.uncompressedSize === utils.MAX_VALUE_32BITS) {
          this.uncompressedSize = extraReader.readInt(8);
        }
        if (this.compressedSize === utils.MAX_VALUE_32BITS) {
          this.compressedSize = extraReader.readInt(8);
        }
        if (this.localHeaderOffset === utils.MAX_VALUE_32BITS) {
          this.localHeaderOffset = extraReader.readInt(8);
        }
        if (this.diskNumberStart === utils.MAX_VALUE_32BITS) {
          this.diskNumberStart = extraReader.readInt(4);
        }
      },
      readExtraFields: function(reader) {
        var end = reader.index + this.extraFieldsLength, extraFieldId, extraFieldLength, extraFieldValue;
        if (!this.extraFields) {
          this.extraFields = {};
        }
        while (reader.index + 4 < end) {
          extraFieldId = reader.readInt(2);
          extraFieldLength = reader.readInt(2);
          extraFieldValue = reader.readData(extraFieldLength);
          this.extraFields[extraFieldId] = {
            id: extraFieldId,
            length: extraFieldLength,
            value: extraFieldValue
          };
        }
        reader.setIndex(end);
      },
      handleUTF8: function() {
        var decodeParamType = support.uint8array ? "uint8array" : "array";
        if (this.useUTF8()) {
          this.fileNameStr = utf8.utf8decode(this.fileName);
          this.fileCommentStr = utf8.utf8decode(this.fileComment);
        } else {
          var upath = this.findExtraFieldUnicodePath();
          if (upath !== null) {
            this.fileNameStr = upath;
          } else {
            var fileNameByteArray = utils.transformTo(decodeParamType, this.fileName);
            this.fileNameStr = this.loadOptions.decodeFileName(fileNameByteArray);
          }
          var ucomment = this.findExtraFieldUnicodeComment();
          if (ucomment !== null) {
            this.fileCommentStr = ucomment;
          } else {
            var commentByteArray = utils.transformTo(decodeParamType, this.fileComment);
            this.fileCommentStr = this.loadOptions.decodeFileName(commentByteArray);
          }
        }
      },
      findExtraFieldUnicodePath: function() {
        var upathField = this.extraFields[28789];
        if (upathField) {
          var extraReader = readerFor(upathField.value);
          if (extraReader.readInt(1) !== 1) {
            return null;
          }
          if (crc32fn(this.fileName) !== extraReader.readInt(4)) {
            return null;
          }
          return utf8.utf8decode(extraReader.readData(upathField.length - 5));
        }
        return null;
      },
      findExtraFieldUnicodeComment: function() {
        var ucommentField = this.extraFields[25461];
        if (ucommentField) {
          var extraReader = readerFor(ucommentField.value);
          if (extraReader.readInt(1) !== 1) {
            return null;
          }
          if (crc32fn(this.fileComment) !== extraReader.readInt(4)) {
            return null;
          }
          return utf8.utf8decode(extraReader.readData(ucommentField.length - 5));
        }
        return null;
      }
    };
    module.exports = ZipEntry;
  }
});

// node_modules/jszip/lib/zipEntries.js
var require_zipEntries = __commonJS({
  "node_modules/jszip/lib/zipEntries.js"(exports, module) {
    "use strict";
    var readerFor = require_readerFor();
    var utils = require_utils();
    var sig = require_signature();
    var ZipEntry = require_zipEntry();
    var support = require_support();
    function ZipEntries(loadOptions) {
      this.files = [];
      this.loadOptions = loadOptions;
    }
    ZipEntries.prototype = {
      checkSignature: function(expectedSignature) {
        if (!this.reader.readAndCheckSignature(expectedSignature)) {
          this.reader.index -= 4;
          var signature = this.reader.readString(4);
          throw new Error("Corrupted zip or bug: unexpected signature (" + utils.pretty(signature) + ", expected " + utils.pretty(expectedSignature) + ")");
        }
      },
      isSignature: function(askedIndex, expectedSignature) {
        var currentIndex = this.reader.index;
        this.reader.setIndex(askedIndex);
        var signature = this.reader.readString(4);
        var result = signature === expectedSignature;
        this.reader.setIndex(currentIndex);
        return result;
      },
      readBlockEndOfCentral: function() {
        this.diskNumber = this.reader.readInt(2);
        this.diskWithCentralDirStart = this.reader.readInt(2);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(2);
        this.centralDirRecords = this.reader.readInt(2);
        this.centralDirSize = this.reader.readInt(4);
        this.centralDirOffset = this.reader.readInt(4);
        this.zipCommentLength = this.reader.readInt(2);
        var zipComment = this.reader.readData(this.zipCommentLength);
        var decodeParamType = support.uint8array ? "uint8array" : "array";
        var decodeContent = utils.transformTo(decodeParamType, zipComment);
        this.zipComment = this.loadOptions.decodeFileName(decodeContent);
      },
      readBlockZip64EndOfCentral: function() {
        this.zip64EndOfCentralSize = this.reader.readInt(8);
        this.reader.skip(4);
        this.diskNumber = this.reader.readInt(4);
        this.diskWithCentralDirStart = this.reader.readInt(4);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(8);
        this.centralDirRecords = this.reader.readInt(8);
        this.centralDirSize = this.reader.readInt(8);
        this.centralDirOffset = this.reader.readInt(8);
        this.zip64ExtensibleData = {};
        var extraDataSize = this.zip64EndOfCentralSize - 44, index = 0, extraFieldId, extraFieldLength, extraFieldValue;
        while (index < extraDataSize) {
          extraFieldId = this.reader.readInt(2);
          extraFieldLength = this.reader.readInt(4);
          extraFieldValue = this.reader.readData(extraFieldLength);
          this.zip64ExtensibleData[extraFieldId] = {
            id: extraFieldId,
            length: extraFieldLength,
            value: extraFieldValue
          };
        }
      },
      readBlockZip64EndOfCentralLocator: function() {
        this.diskWithZip64CentralDirStart = this.reader.readInt(4);
        this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8);
        this.disksCount = this.reader.readInt(4);
        if (this.disksCount > 1) {
          throw new Error("Multi-volumes zip are not supported");
        }
      },
      readLocalFiles: function() {
        var i, file;
        for (i = 0; i < this.files.length; i++) {
          file = this.files[i];
          this.reader.setIndex(file.localHeaderOffset);
          this.checkSignature(sig.LOCAL_FILE_HEADER);
          file.readLocalPart(this.reader);
          file.handleUTF8();
          file.processAttributes();
        }
      },
      readCentralDir: function() {
        var file;
        this.reader.setIndex(this.centralDirOffset);
        while (this.reader.readAndCheckSignature(sig.CENTRAL_FILE_HEADER)) {
          file = new ZipEntry({
            zip64: this.zip64
          }, this.loadOptions);
          file.readCentralPart(this.reader);
          this.files.push(file);
        }
        if (this.centralDirRecords !== this.files.length) {
          if (this.centralDirRecords !== 0 && this.files.length === 0) {
            throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
          } else {
          }
        }
      },
      readEndOfCentral: function() {
        var offset = this.reader.lastIndexOfSignature(sig.CENTRAL_DIRECTORY_END);
        if (offset < 0) {
          var isGarbage = !this.isSignature(0, sig.LOCAL_FILE_HEADER);
          if (isGarbage) {
            throw new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
          } else {
            throw new Error("Corrupted zip: can't find end of central directory");
          }
        }
        this.reader.setIndex(offset);
        var endOfCentralDirOffset = offset;
        this.checkSignature(sig.CENTRAL_DIRECTORY_END);
        this.readBlockEndOfCentral();
        if (this.diskNumber === utils.MAX_VALUE_16BITS || this.diskWithCentralDirStart === utils.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === utils.MAX_VALUE_16BITS || this.centralDirRecords === utils.MAX_VALUE_16BITS || this.centralDirSize === utils.MAX_VALUE_32BITS || this.centralDirOffset === utils.MAX_VALUE_32BITS) {
          this.zip64 = true;
          offset = this.reader.lastIndexOfSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
          if (offset < 0) {
            throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
          }
          this.reader.setIndex(offset);
          this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
          this.readBlockZip64EndOfCentralLocator();
          if (!this.isSignature(this.relativeOffsetEndOfZip64CentralDir, sig.ZIP64_CENTRAL_DIRECTORY_END)) {
            this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(sig.ZIP64_CENTRAL_DIRECTORY_END);
            if (this.relativeOffsetEndOfZip64CentralDir < 0) {
              throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
            }
          }
          this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir);
          this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_END);
          this.readBlockZip64EndOfCentral();
        }
        var expectedEndOfCentralDirOffset = this.centralDirOffset + this.centralDirSize;
        if (this.zip64) {
          expectedEndOfCentralDirOffset += 20;
          expectedEndOfCentralDirOffset += 12 + this.zip64EndOfCentralSize;
        }
        var extraBytes = endOfCentralDirOffset - expectedEndOfCentralDirOffset;
        if (extraBytes > 0) {
          if (this.isSignature(endOfCentralDirOffset, sig.CENTRAL_FILE_HEADER)) {
          } else {
            this.reader.zero = extraBytes;
          }
        } else if (extraBytes < 0) {
          throw new Error("Corrupted zip: missing " + Math.abs(extraBytes) + " bytes.");
        }
      },
      prepareReader: function(data) {
        this.reader = readerFor(data);
      },
      load: function(data) {
        this.prepareReader(data);
        this.readEndOfCentral();
        this.readCentralDir();
        this.readLocalFiles();
      }
    };
    module.exports = ZipEntries;
  }
});

// node_modules/jszip/lib/load.js
var require_load = __commonJS({
  "node_modules/jszip/lib/load.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var external = require_external();
    var utf8 = require_utf8();
    var ZipEntries = require_zipEntries();
    var Crc32Probe = require_Crc32Probe();
    var nodejsUtils = require_nodejsUtils();
    function checkEntryCRC32(zipEntry) {
      return new external.Promise(function(resolve, reject) {
        var worker = zipEntry.decompressed.getContentWorker().pipe(new Crc32Probe());
        worker.on("error", function(e) {
          reject(e);
        }).on("end", function() {
          if (worker.streamInfo.crc32 !== zipEntry.decompressed.crc32) {
            reject(new Error("Corrupted zip : CRC32 mismatch"));
          } else {
            resolve();
          }
        }).resume();
      });
    }
    module.exports = function(data, options) {
      var zip = this;
      options = utils.extend(options || {}, {
        base64: false,
        checkCRC32: false,
        optimizedBinaryString: false,
        createFolders: false,
        decodeFileName: utf8.utf8decode
      });
      if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
        return external.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file."));
      }
      return utils.prepareContent("the loaded zip file", data, true, options.optimizedBinaryString, options.base64).then(function(data2) {
        var zipEntries = new ZipEntries(options);
        zipEntries.load(data2);
        return zipEntries;
      }).then(function checkCRC32(zipEntries) {
        var promises = [external.Promise.resolve(zipEntries)];
        var files = zipEntries.files;
        if (options.checkCRC32) {
          for (var i = 0; i < files.length; i++) {
            promises.push(checkEntryCRC32(files[i]));
          }
        }
        return external.Promise.all(promises);
      }).then(function addFiles(results) {
        var zipEntries = results.shift();
        var files = zipEntries.files;
        for (var i = 0; i < files.length; i++) {
          var input = files[i];
          var unsafeName = input.fileNameStr;
          var safeName = utils.resolve(input.fileNameStr);
          zip.file(safeName, input.decompressed, {
            binary: true,
            optimizedBinaryString: true,
            date: input.date,
            dir: input.dir,
            comment: input.fileCommentStr.length ? input.fileCommentStr : null,
            unixPermissions: input.unixPermissions,
            dosPermissions: input.dosPermissions,
            createFolders: options.createFolders
          });
          if (!input.dir) {
            zip.file(safeName).unsafeOriginalName = unsafeName;
          }
        }
        if (zipEntries.zipComment.length) {
          zip.comment = zipEntries.zipComment;
        }
        return zip;
      });
    };
  }
});

// node_modules/jszip/lib/index.js
var require_lib3 = __commonJS({
  "node_modules/jszip/lib/index.js"(exports, module) {
    "use strict";
    function JSZip2() {
      if (!(this instanceof JSZip2)) {
        return new JSZip2();
      }
      if (arguments.length) {
        throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
      }
      this.files = /* @__PURE__ */ Object.create(null);
      this.comment = null;
      this.root = "";
      this.clone = function() {
        var newObj = new JSZip2();
        for (var i in this) {
          if (typeof this[i] !== "function") {
            newObj[i] = this[i];
          }
        }
        return newObj;
      };
    }
    JSZip2.prototype = require_object();
    JSZip2.prototype.loadAsync = require_load();
    JSZip2.support = require_support();
    JSZip2.defaults = require_defaults();
    JSZip2.version = "3.10.1";
    JSZip2.loadAsync = function(content, options) {
      return new JSZip2().loadAsync(content, options);
    };
    JSZip2.external = require_external();
    module.exports = JSZip2;
  }
});

// src/prism-v4/semantic/cognitive/templates/templates.json
var require_templates = __commonJS({
  "src/prism-v4/semantic/cognitive/templates/templates.json"(exports, module) {
    module.exports = [
      { id: "definition-basic", subject: "generic", name: "Definition", archetypeKey: "definition", description: "Identify or define a concept, term, or idea.", patternConfig: { textPatterns: ["define", "what is", "explain the meaning", "give the definition"], structuralPatterns: [], regexPatterns: ["define\\s+", "what\\s+is\\s+"], minConfidence: 0.2 }, boosts: { bloom: { remember: 0.4, understand: 0.3, apply: 0.1, analyze: 0.05, evaluate: 0.05, create: 0 }, multiStepBoost: 0.05, difficultyBoost: -0.05, misconceptionRiskBoost: 0.02 }, stepHints: { expectedSteps: 1, stepType: "definition" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "code-reasoning-basic", subject: "generic", name: "Code Reasoning", archetypeKey: "code-interpretation", description: "Interpret simple code snippets and predict their behavior or output.", patternConfig: { textPatterns: ["code", "loop", "output", "predict the output"], structuralPatterns: ["hasCodeLikeContent"], regexPatterns: ["for\\s*\\(", "while\\s*\\(", "if\\s*\\(", "console\\.log", "\\{[^}]*\\}"], minConfidence: 0.4 }, boosts: { bloom: { remember: 0.1, understand: 0.4, apply: 0.3, analyze: 0.15, evaluate: 0.05, create: 0 }, multiStepBoost: 0.1, difficultyBoost: 0.05, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "code-interpretation" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "interpretation", subject: "generic", name: "Interpretation", archetypeKey: "interpretation", description: "Interpret meaning from text, model, or source material.", patternConfig: { textPatterns: ["interpret", "explain", "conclude", "what does this mean"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.2, apply: 0, analyze: 0.3, evaluate: 0.2, create: 0 }, multiStepBoost: 0.1, difficultyBoost: 0.08, misconceptionRiskBoost: 0.05 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "evidence-evaluation", subject: "generic", name: "Evidence Evaluation", archetypeKey: "evidence-evaluation", description: "Use evidence to support, justify, or evaluate a claim.", patternConfig: { textPatterns: ["evidence", "support", "justify", "best supports", "which claim"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0, analyze: 0.25, evaluate: 0.3, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.1, misconceptionRiskBoost: 0.12 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "data-analysis", subject: "generic", name: "Data Analysis", archetypeKey: "data-analysis", description: "Analyze data in tables, charts, or graphs.", patternConfig: { textPatterns: ["data", "graph", "table", "chart", "plot", "trend"], structuralPatterns: ["multiRepresentation"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0.2, analyze: 0.3, evaluate: 0, create: 0 }, multiStepBoost: 0.16, difficultyBoost: 0.12, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "cause-effect-reasoning", subject: "generic", name: "Cause and Effect", archetypeKey: "cause-effect-reasoning", description: "Reason about causes, effects, impacts, and consequences.", patternConfig: { textPatterns: ["cause", "effect", "result", "consequence", "impact", "leads to"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0, analyze: 0.25, evaluate: 0.15, create: 0 }, multiStepBoost: 0.1, difficultyBoost: 0.08, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "multi-representation-synthesis", subject: "generic", name: "Multi-Representation Synthesis", archetypeKey: "multi-representation-synthesis", description: "Use more than one representation together.", patternConfig: { textPatterns: ["use the graph", "use the table", "compare the diagram", "using the model", "from the graph and table"], structuralPatterns: ["multiRepresentation"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.2, analyze: 0.25, evaluate: 0, create: 0.05 }, multiStepBoost: 0.2, difficultyBoost: 0.14, misconceptionRiskBoost: 0.12 }, stepHints: { expectedSteps: 3, stepType: "mixed" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "modeling", subject: "math", name: "Modeling", archetypeKey: "modeling", description: "Construct or use a mathematical model.", patternConfig: { textPatterns: ["model", "represent", "write an equation", "simulate", "construct"], structuralPatterns: ["hasEquation"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.25, analyze: 0.15, evaluate: 0, create: 0.15 }, multiStepBoost: 0.18, difficultyBoost: 0.1, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "procedural" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "multi-step-algebra", subject: "math", name: "Multi-Step Algebra", archetypeKey: "multi-step-algebra", description: "Solve equations, systems, or inequalities.", patternConfig: { textPatterns: ["solve", "equation", "system of equations", "inequality"], structuralPatterns: ["hasEquation"], regexPatterns: ["[a-zA-Z]\\s*=\\s*[^=]"], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.3, analyze: 0.2, evaluate: 0, create: 0 }, multiStepBoost: 0.2, difficultyBoost: 0.12, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 3, stepType: "procedural" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "function-analysis", subject: "math", name: "Function Analysis", archetypeKey: "function-analysis", description: "Interpret functions, slope, intercept, or rate of change.", patternConfig: { textPatterns: ["function", "rate of change", "slope", "intercept"], structuralPatterns: ["hasEquation"], regexPatterns: ["f\\s*\\(\\s*x\\s*\\)"], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0.25, analyze: 0.2, evaluate: 0, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "proof", subject: "math", name: "Proof", archetypeKey: "proof", description: "Prove or justify a mathematical claim.", patternConfig: { textPatterns: ["prove", "show that", "justify why"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0, analyze: 0.2, evaluate: 0.25, create: 0.15 }, multiStepBoost: 0.18, difficultyBoost: 0.14, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 3, stepType: "mixed" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "optimization", subject: "math", name: "Optimization", archetypeKey: "optimization", description: "Maximize, minimize, or find best value.", patternConfig: { textPatterns: ["maximize", "minimize", "optimal", "best value"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.2, analyze: 0.25, evaluate: 0.2, create: 0 }, multiStepBoost: 0.18, difficultyBoost: 0.14, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 3, stepType: "procedural" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "confidence-interval", subject: "statistics", name: "Confidence Interval", archetypeKey: "confidence-interval", description: "Interpret interval estimates and margin of error.", patternConfig: { textPatterns: ["confidence interval", "margin of error", "interval estimate"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0.25, analyze: 0.2, evaluate: 0, create: 0 }, multiStepBoost: 0.16, difficultyBoost: 0.12, misconceptionRiskBoost: 0.12 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "hypothesis-testing", subject: "statistics", name: "Hypothesis Testing", archetypeKey: "hypothesis-testing", description: "Work with null hypothesis, p-value, and decisions.", patternConfig: { textPatterns: ["hypothesis test", "p-value", "null hypothesis", "alternative hypothesis"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.25, analyze: 0.25, evaluate: 0.2, create: 0 }, multiStepBoost: 0.18, difficultyBoost: 0.15, misconceptionRiskBoost: 0.15 }, stepHints: { expectedSteps: 3, stepType: "procedural" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "type-i-ii", subject: "statistics", name: "Type I/II Error", archetypeKey: "type-i-ii", description: "Reason about false positives and false negatives.", patternConfig: { textPatterns: ["type i", "type ii", "false positive", "false negative"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0, analyze: 0.25, evaluate: 0.15, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.12, misconceptionRiskBoost: 0.18 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "sampling-distribution", subject: "statistics", name: "Sampling Distribution", archetypeKey: "sampling-distribution", description: "Interpret standard error and sampling distributions.", patternConfig: { textPatterns: ["sampling distribution", "standard error", "sample proportion"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0.2, analyze: 0.2, evaluate: 0, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.12, misconceptionRiskBoost: 0.12 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "distribution-interpretation", subject: "statistics", name: "Distribution Interpretation", archetypeKey: "distribution-interpretation", description: "Interpret the shape or spread of a distribution.", patternConfig: { textPatterns: ["distribution", "spread", "skew", "center", "variability"], structuralPatterns: ["hasGraph"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0.1, analyze: 0.25, evaluate: 0, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "main-idea", subject: "reading", name: "Main Idea", archetypeKey: "main-idea", description: "Find the main or central idea.", patternConfig: { textPatterns: ["main idea", "central idea", "theme"], structuralPatterns: ["hasPassage"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.25, apply: 0, analyze: 0.15, evaluate: 0, create: 0 }, multiStepBoost: 0.08, difficultyBoost: 0.06, misconceptionRiskBoost: 0.04 }, stepHints: { expectedSteps: 1, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "inference", subject: "reading", name: "Inference", archetypeKey: "inference", description: "Infer or interpret unstated meaning.", patternConfig: { textPatterns: ["infer", "inference", "imply", "suggest"], structuralPatterns: ["hasPassage"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0, analyze: 0.3, evaluate: 0.1, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.1, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "author-purpose", subject: "reading", name: "Author Purpose", archetypeKey: "author-purpose", description: "Identify author purpose, tone, or point of view.", patternConfig: { textPatterns: ["author's purpose", "point of view", "tone", "purpose of the passage"], structuralPatterns: ["hasPassage"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.2, apply: 0, analyze: 0.25, evaluate: 0, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.08, misconceptionRiskBoost: 0.06 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "argument-analysis", subject: "reading", name: "Argument Analysis", archetypeKey: "argument-analysis", description: "Analyze claims, reasons, and counterclaims.", patternConfig: { textPatterns: ["argument", "claim", "reasoning", "counterclaim"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0, analyze: 0.3, evaluate: 0.25, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "passage-evidence", subject: "reading", name: "Passage Evidence", archetypeKey: "passage-evidence", description: "Use details from a passage to support an answer.", patternConfig: { textPatterns: ["from the passage", "which detail", "best supports", "evidence from the passage"], structuralPatterns: ["hasPassage"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0.1, analyze: 0.2, evaluate: 0.2, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.08, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "experimental-design", subject: "science", name: "Experimental Design", archetypeKey: "experimental-design", description: "Design experiments and procedures.", patternConfig: { textPatterns: ["experimental design", "design an experiment", "hypothesis", "procedure"], structuralPatterns: ["hasExperiment"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.2, analyze: 0.2, evaluate: 0, create: 0.2 }, multiStepBoost: 0.2, difficultyBoost: 0.14, misconceptionRiskBoost: 0.12 }, stepHints: { expectedSteps: 3, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "variable-control", subject: "science", name: "Variable Control", archetypeKey: "variable-control", description: "Identify independent, dependent, and control variables.", patternConfig: { textPatterns: ["control variable", "independent variable", "dependent variable", "constant"], structuralPatterns: ["hasExperiment"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.2, apply: 0.2, analyze: 0.15, evaluate: 0, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "science-data-interpretation", subject: "science", name: "Science Data Interpretation", archetypeKey: "science-data-interpretation", description: "Interpret scientific observations, trends, or graphs.", patternConfig: { textPatterns: ["data", "graph", "trend", "observation"], structuralPatterns: ["multiRepresentation"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0, analyze: 0.3, evaluate: 0, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "model-evaluation", subject: "science", name: "Model Evaluation", archetypeKey: "model-evaluation", description: "Compare models or evaluate their limitations.", patternConfig: { textPatterns: ["evaluate the model", "limitations of the model", "compare models"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0, analyze: 0.25, evaluate: 0.25, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.12, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "science-explanation", subject: "science", name: "Scientific Explanation", archetypeKey: "science-explanation", description: "Explain a scientific phenomenon using evidence.", patternConfig: { textPatterns: ["explain why", "scientific explanation", "using evidence", "phenomenon"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0.1, analyze: 0.2, evaluate: 0.1, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "sourcing", subject: "socialstudies", name: "Sourcing", archetypeKey: "sourcing", description: "Identify source origin, author, or context.", patternConfig: { textPatterns: ["source", "who wrote", "when was this written", "origin of the document"], structuralPatterns: ["hasSourceExcerpt"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.2, apply: 0, analyze: 0.2, evaluate: 0, create: 0 }, multiStepBoost: 0.1, difficultyBoost: 0.08, misconceptionRiskBoost: 0.06 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "corroboration", subject: "socialstudies", name: "Corroboration", archetypeKey: "corroboration", description: "Compare two sources for agreement or disagreement.", patternConfig: { textPatterns: ["corroborate", "compare sources", "both sources", "agree and disagree"], structuralPatterns: ["hasSourceExcerpt", "multiRepresentation"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0, analyze: 0.3, evaluate: 0.2, create: 0 }, multiStepBoost: 0.16, difficultyBoost: 0.12, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 3, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "perspective-analysis", subject: "socialstudies", name: "Perspective Analysis", archetypeKey: "perspective-analysis", description: "Analyze bias, audience, or perspective.", patternConfig: { textPatterns: ["perspective", "point of view", "bias", "audience"], structuralPatterns: ["hasSourceExcerpt"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0, analyze: 0.25, evaluate: 0.15, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.1, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "historical-cause-effect", subject: "socialstudies", name: "Historical Cause and Effect", archetypeKey: "historical-cause-effect", description: "Reason about causes and consequences in history or civics.", patternConfig: { textPatterns: ["cause", "effect", "result", "consequence", "impact"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0, analyze: 0.25, evaluate: 0.15, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.08, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "civic-reasoning", subject: "socialstudies", name: "Civic Reasoning", archetypeKey: "civic-reasoning", description: "Reason about government, policy, or civic claims.", patternConfig: { textPatterns: ["government", "policy", "law", "citizen", "civic"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.35 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0.1, analyze: 0.2, evaluate: 0.15, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.08, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } }
    ];
  }
});

// src/prism-v4/ingestion/normalize/textCleaner.ts
function cleanText(raw) {
  return raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// src/prism-v4/ingestion/azure/azureNormalizer.ts
function normalizeAzureLayout(rawAzure) {
  const azure = rawAzure ?? {};
  const pages = (azure.pages ?? []).map((page) => ({
    pageNumber: page.pageNumber ?? 1,
    text: (page.lines ?? []).map((line) => line.content?.trim() ?? "").filter(Boolean).join("\n")
  }));
  const paragraphs = (azure.paragraphs ?? []).map((paragraph) => ({
    text: paragraph.content?.trim() ?? "",
    pageNumber: paragraph.boundingRegions?.[0]?.pageNumber ?? 1,
    role: paragraph.role
  })).filter((paragraph) => paragraph.text.length > 0);
  const tables = (azure.tables ?? []).map((table) => ({
    rowCount: table.rowCount ?? 0,
    columnCount: table.columnCount ?? 0,
    pageNumber: table.boundingRegions?.[0]?.pageNumber,
    cells: (table.cells ?? []).map((cell) => ({
      rowIndex: cell.rowIndex ?? 0,
      columnIndex: cell.columnIndex ?? 0,
      text: cell.content?.trim() ?? ""
    }))
  }));
  const readingOrder = paragraphs.map((paragraph) => paragraph.text);
  return {
    content: azure.content?.trim() ?? "",
    pages,
    paragraphs,
    tables,
    readingOrder
  };
}

// src/prism-v4/ingestion/normalize/structureMapper.ts
function mapAzureToCanonical(normalized, fileName) {
  return {
    fileName,
    content: normalized.content || normalized.readingOrder.join("\n\n"),
    pages: normalized.pages.map((page) => ({
      pageNumber: page.pageNumber,
      text: page.text
    })),
    paragraphs: normalized.paragraphs.map((paragraph) => ({
      text: paragraph.text,
      pageNumber: paragraph.pageNumber,
      role: paragraph.role
    })),
    tables: normalized.tables.map((table) => ({
      rowCount: table.rowCount,
      columnCount: table.columnCount,
      pageNumber: table.pageNumber,
      cells: table.cells.map((cell) => ({
        rowIndex: cell.rowIndex,
        columnIndex: cell.columnIndex,
        text: cell.text
      }))
    })),
    readingOrder: [...normalized.readingOrder]
  };
}

// lib/azure.ts
function normalizeEndpoint(raw) {
  let s = raw.trim().replace(/\.{2,}/g, "").replace(/^https:\/(?!\/)/, "https://").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(s)) {
    s = `https://${s}`;
  }
  return s;
}
function getEnvValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return void 0;
}
function getAzureConfig() {
  const endpoint = getEnvValue("AZURE_DOCUMENT_ENDPOINT", "AZURE_FORM_RECOGNIZER_ENDPOINT");
  const key = getEnvValue("AZURE_DOCUMENT_KEY", "AZURE_FORM_RECOGNIZER_KEY");
  const model = getEnvValue("AZURE_DOCUMENT_MODEL", "AZURE_FORM_RECOGNIZER_MODEL") ?? "prebuilt-read";
  const pages = getEnvValue("AZURE_DOCUMENT_PAGES", "AZURE_FORM_RECOGNIZER_PAGES") ?? "1-";
  if (!endpoint || !key) {
    throw new Error("Azure is not configured. Set AZURE_DOCUMENT_ENDPOINT and AZURE_DOCUMENT_KEY, or AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY.");
  }
  const clean = normalizeEndpoint(endpoint);
  console.log("[azure] normalized endpoint:", clean);
  return { endpoint: clean, key, model, pages };
}
function azureAnalyzeUrl(endpoint, model, pages) {
  const selectedModel = model?.trim() || "prebuilt-read";
  const url = new URL(`${endpoint}/documentintelligence/documentModels/${selectedModel}:analyze`);
  url.searchParams.set("api-version", "2024-11-30");
  if (pages && pages.trim().length > 0) {
    url.searchParams.set("pages", pages.trim());
  }
  return url.toString();
}
async function analyzeAzureDocument(fileBuffer, mimeType = "application/pdf") {
  const config = getAzureConfig();
  const analyzeUrl = azureAnalyzeUrl(config.endpoint, config.model, config.pages);
  const fallbackAnalyzeUrl = azureAnalyzeUrl(config.endpoint, config.model);
  console.log("[azure] URL:", analyzeUrl);
  console.log("[azure] model:", config.model);
  console.log("[azure] pages policy:", config.pages || "<none>");
  let submitRes = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config.key,
      "Content-Type": mimeType
    },
    body: new Uint8Array(fileBuffer)
  });
  if (submitRes.status !== 202 && config.pages) {
    const firstAttemptError = await submitRes.text();
    const normalizedError = firstAttemptError.toLowerCase();
    const shouldFallback = normalizedError.includes("pages") || normalizedError.includes("query") || normalizedError.includes("invalid");
    if (shouldFallback) {
      console.warn("[azure] pages parameter rejected; retrying without pages query", {
        status: submitRes.status
      });
      submitRes = await fetch(fallbackAnalyzeUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": config.key,
          "Content-Type": mimeType
        },
        body: new Uint8Array(fileBuffer)
      });
    } else {
      throw new Error(`Azure rejected the document (${submitRes.status}): ${firstAttemptError}`);
    }
  }
  if (submitRes.status !== 202) {
    const errText = await submitRes.text();
    throw new Error(`Azure rejected the document (${submitRes.status}): ${errText}`);
  }
  const operationLocation = submitRes.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Azure did not return an operation-location header");
  }
  const maxPolls = 30;
  const pollIntervalMs = 1500;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    const pollRes = await fetch(operationLocation, {
      headers: {
        "Ocp-Apim-Subscription-Key": config.key
      }
    });
    const pollData = await pollRes.json();
    if (pollData.status === "succeeded") {
      return pollData.analyzeResult ?? { content: "", pages: [], paragraphs: [], tables: [] };
    }
    if (pollData.status === "failed") {
      throw new Error(`Azure analysis failed: ${JSON.stringify(pollData)}`);
    }
  }
  throw new Error("Azure analysis timed out after polling");
}

// src/prism-v4/ingestion/azure/azureClient.ts
var MAX_ATTEMPTS = 3;
var INITIAL_BACKOFF_MS = 500;
async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
async function callAzureLayoutModel(fileBuffer, mimeType = "application/pdf") {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await analyzeAzureDocument(fileBuffer, mimeType);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) {
        break;
      }
      await delay(INITIAL_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }
  const message = lastError instanceof Error ? lastError.message : "Unknown Azure error";
  throw new Error(`Azure layout extraction failed after ${MAX_ATTEMPTS} attempts: ${message}`);
}

// src/prism-v4/ingestion/azure/azureExtractor.ts
var MAX_RETRIES = 3;
var BASE_DELAY_MS = 500;
function delay2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function estimatePdfPageCount(fileBuffer) {
  try {
    const raw = fileBuffer.toString("latin1");
    const matches = raw.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : null;
  } catch {
    return null;
  }
}
function logPreAzureDiagnostics(fileBuffer, mimeType) {
  const byteLength = fileBuffer.byteLength;
  if (mimeType.toLowerCase().includes("pdf")) {
    const estimatedPages = estimatePdfPageCount(fileBuffer);
    console.log("[ingestion][azure][preflight]", {
      mimeType,
      byteLength,
      estimatedPdfPages: estimatedPages
    });
    return estimatedPages;
  }
  console.log("[ingestion][azure][preflight]", {
    mimeType,
    byteLength,
    estimatedPdfPages: null
  });
  return null;
}
async function runAzureExtraction(fileBuffer, mimeType = "application/pdf") {
  const estimatedPdfPages = logPreAzureDiagnostics(fileBuffer, mimeType);
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const result = await callAzureLayoutModel(fileBuffer, mimeType);
      console.log("[ingestion][azure][postflight]", {
        mimeType,
        byteLength: fileBuffer.byteLength,
        azurePages: Array.isArray(result?.pages) ? result.pages.length : 0,
        azureParagraphs: Array.isArray(result?.paragraphs) ? result.paragraphs.length : 0,
        azureTables: Array.isArray(result?.tables) ? result.tables.length : 0,
        contentChars: typeof result?.content === "string" ? result.content.length : 0
      });
      const azurePageCount = Array.isArray(result?.pages) ? result.pages.length : 0;
      if (mimeType.toLowerCase().includes("pdf") && typeof estimatedPdfPages === "number" && estimatedPdfPages > 2 && azurePageCount === 2) {
        console.warn("[ingestion][azure][limit-warning] PDF appears multi-page but Azure returned exactly 2 pages. This commonly indicates Azure Document Intelligence free-tier page limits (F0).", {
          estimatedPdfPages,
          azurePageCount
        });
      }
      return result;
    } catch (err) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        console.error("Azure extraction failed:", err);
        throw new Error("Azure extraction failed after retries");
      }
      await delay2(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
}

// src/prism-v4/documents/contentHash.ts
function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObjectKeys(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, sortObjectKeys(entry)]));
}
function stableStringify(value) {
  return JSON.stringify(sortObjectKeys(value));
}
async function sha256Hex(input) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("SHA-256 hashing requires Web Crypto support");
  }
  const encoded = new TextEncoder().encode(input);
  const digest = await subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function fragmentText(document, fragment) {
  const anchored = fragment.anchors.map((anchor) => document.nodes.find((node) => node.id === anchor.nodeId)?.normalizedText ?? document.nodes.find((node) => node.id === anchor.nodeId)?.text ?? "").filter((text) => typeof text === "string" && text.trim().length > 0);
  return anchored.join(" ").trim();
}
function semanticContentBlocks(doc) {
  const blocks = doc.fragments.filter((fragment) => fragment.instructionalRole !== "metadata").map((fragment) => fragmentText(doc.document, fragment)).filter(Boolean);
  if (blocks.length > 0) {
    return blocks;
  }
  return doc.document.nodes.map((node) => node.normalizedText ?? node.text ?? "").filter((text) => text.trim().length > 0);
}
function problemGroups(doc) {
  const grouped = /* @__PURE__ */ new Map();
  for (const problem of doc.problems) {
    const groupId = problem.problemGroupId ?? problem.id;
    const existing = grouped.get(groupId) ?? {
      groupId,
      sourceSpan: problem.sourceSpan,
      segments: []
    };
    existing.sourceSpan = existing.sourceSpan ?? problem.sourceSpan;
    existing.segments.push(problem.text ?? "");
    grouped.set(groupId, existing);
  }
  return [...grouped.values()].sort((left, right) => left.groupId.localeCompare(right.groupId));
}
async function computeContentHashV1(doc) {
  const payload = {
    nodes: doc.document.nodes.map((node) => node.normalizedText ?? node.text ?? ""),
    problems: doc.problems.map((problem) => problem.text ?? "")
  };
  return `v1:${await sha256Hex(stableStringify(payload))}`;
}
async function computeContentHashV2(doc) {
  const payload = {
    contentBlocks: semanticContentBlocks(doc),
    problemGroups: problemGroups(doc),
    concepts: (doc.insights.scoredConcepts ?? []).filter((concept) => !concept.isNoise).map((concept) => ({
      label: concept.concept,
      score: concept.score,
      freqProblems: concept.freqProblems,
      freqDocuments: concept.freqDocuments
    }))
  };
  return `v2:${await sha256Hex(stableStringify(payload))}`;
}
function getPreferredContentHash(doc) {
  return doc.contentHashV2 ?? doc.contentHashV1 ?? doc.contentHash ?? null;
}
function withPreferredContentHash(doc) {
  return {
    ...doc,
    contentHash: getPreferredContentHash(doc) ?? void 0
  };
}

// src/prism-v4/semantic/utils/textUtils.ts
var STOP_WORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "what",
  "which",
  "with"
]);
function normalizeWhitespace(text) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function splitSentences(text) {
  return normalizeWhitespace(text).split(/(?<=[.!?])\s+|\n+/).map((sentence) => sentence.trim()).filter(Boolean);
}
function extractKeywords(text) {
  const counts = /* @__PURE__ */ new Map();
  for (const token of normalizeWhitespace(text).toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length < 3 || STOP_WORDS.has(token)) {
      continue;
    }
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 20).map(([token]) => token);
}
function countSyllables(word) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) {
    return 1;
  }
  const withoutTrailingE = cleaned.endsWith("e") ? cleaned.slice(0, -1) : cleaned;
  const matches = withoutTrailingE.match(/[aeiouy]+/g);
  return Math.max(1, matches ? matches.length : 1);
}

// src/prism-v4/semantic/utils/conceptUtils.ts
var DATE_OR_TIME_PATTERN = /\b(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi;
var LEADING_TRAILING_PUNCTUATION = /^[^a-z0-9]+|[^a-z0-9]+$/gi;
var SCORE_WEIGHTS = {
  freqProblems: 0.55,
  freqPages: 0.35,
  semanticDensity: 0.6,
  multipartPresence: 0.45,
  crossDocumentRecurrence: 0.3
};
var NOISE_SCORE_THRESHOLD = 1.15;
function normalizeConceptLabel(value) {
  const trimmed = normalizeWhitespace(value).toLowerCase();
  if (!trimmed) {
    return "";
  }
  const preserveTaxonomyId = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/i.test(trimmed);
  if (preserveTaxonomyId) {
    return trimmed;
  }
  return normalizeWhitespace(trimmed.replace(DATE_OR_TIME_PATTERN, " ").replace(/[“”"'`]+/g, " ").replace(/[^a-z0-9\s-]+/g, " ").replace(LEADING_TRAILING_PUNCTUATION, " ").replace(/\s+/g, " "));
}
function isLikelyNoiseConcept(value) {
  const normalized = normalizeConceptLabel(value);
  if (!normalized) {
    return true;
  }
  if (normalized.length < 3) {
    return true;
  }
  if (/^(?:name|date|teacher|class|period|page|review|unit|chapter)\b/.test(normalized)) {
    return true;
  }
  const alphaTokens = normalized.match(/[a-z]+/g) ?? [];
  return alphaTokens.length === 0;
}
function tokenizeConcept(value) {
  return normalizeConceptLabel(value).split(/\s+/).filter(Boolean);
}
function isTaxonomyConcept(value) {
  return /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/i.test(value.trim());
}
function levenshteinDistance(left, right) {
  if (left === right) {
    return 0;
  }
  if (!left.length) {
    return right.length;
  }
  if (!right.length) {
    return left.length;
  }
  const matrix = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
  for (let row = 0; row <= left.length; row += 1) {
    matrix[row][0] = row;
  }
  for (let column = 0; column <= right.length; column += 1) {
    matrix[0][column] = column;
  }
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(matrix[row - 1][column] + 1, matrix[row][column - 1] + 1, matrix[row - 1][column - 1] + cost);
    }
  }
  return matrix[left.length][right.length];
}
function tokenOverlapRatio(left, right) {
  const leftTokens = new Set(tokenizeConcept(left));
  const rightTokens = new Set(tokenizeConcept(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.max(leftTokens.size, rightTokens.size);
}
function semanticDensityPenalty(value) {
  if (!isLikelyNoiseConcept(value)) {
    return 0;
  }
  if (/^(?:chapter|unit|page|review)\b/.test(normalizeConceptLabel(value))) {
    return 0.45;
  }
  return 0.25;
}
function shouldMergeConceptLabels(left, right) {
  const normalizedLeft = normalizeConceptLabel(left);
  const normalizedRight = normalizeConceptLabel(right);
  if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) {
    return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
  }
  if (isTaxonomyConcept(normalizedLeft) || isTaxonomyConcept(normalizedRight)) {
    return false;
  }
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return tokenOverlapRatio(normalizedLeft, normalizedRight) >= 0.5;
  }
  const distance = levenshteinDistance(normalizedLeft, normalizedRight);
  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
  const normalizedDistance = maxLength > 0 ? distance / maxLength : 1;
  return tokenOverlapRatio(normalizedLeft, normalizedRight) >= 0.75 || normalizedDistance <= 0.18;
}
function chooseCanonicalConceptLabel(left, right) {
  const normalizedLeft = normalizeConceptLabel(left);
  const normalizedRight = normalizeConceptLabel(right);
  if (!normalizedLeft) {
    return normalizedRight;
  }
  if (!normalizedRight) {
    return normalizedLeft;
  }
  if (isTaxonomyConcept(normalizedLeft) || isTaxonomyConcept(normalizedRight)) {
    return normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  }
  const leftTokens = tokenizeConcept(normalizedLeft).length;
  const rightTokens = tokenizeConcept(normalizedRight).length;
  if (leftTokens !== rightTokens) {
    return leftTokens < rightTokens ? normalizedLeft : normalizedRight;
  }
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length < normalizedRight.length ? normalizedLeft : normalizedRight;
  }
  return normalizedLeft.localeCompare(normalizedRight) <= 0 ? normalizedLeft : normalizedRight;
}
function scoreConceptMetadata(input) {
  const freqDocuments = Math.max(1, input.freqDocuments ?? 1);
  const crossDocumentRecurrence = Math.max(0, input.crossDocumentRecurrence ?? freqDocuments);
  const score = SCORE_WEIGHTS.freqProblems * Math.log1p(Math.max(0, input.freqProblems)) + SCORE_WEIGHTS.freqPages * Math.log1p(Math.max(0, input.freqPages)) + SCORE_WEIGHTS.semanticDensity * Math.max(0, input.semanticDensity) + SCORE_WEIGHTS.multipartPresence * Math.max(0, input.multipartPresence) + SCORE_WEIGHTS.crossDocumentRecurrence * Math.log1p(Math.max(0, crossDocumentRecurrence)) - semanticDensityPenalty(input.label ?? "");
  const isNoise = Math.max(0, input.freqProblems) <= 1 && score < NOISE_SCORE_THRESHOLD;
  return {
    score: Number(score.toFixed(4)),
    isNoise,
    freqDocuments,
    crossDocumentRecurrence
  };
}

// src/prism-v4/documents/analysis/buildInsights.ts
function buildAnalyzedDocumentInsights(args) {
  const conceptFrequencies = {};
  const conceptStats = /* @__PURE__ */ new Map();
  const representations = /* @__PURE__ */ new Set();
  const misconceptionThemes = /* @__PURE__ */ new Set();
  const difficultyDistribution = {
    low: 0,
    medium: 0,
    high: 0
  };
  const problemGroupSizes = /* @__PURE__ */ new Map();
  let totalConceptEvidence = 0;
  for (const problem of args.problems) {
    if (problem.problemGroupId) {
      problemGroupSizes.set(problem.problemGroupId, (problemGroupSizes.get(problem.problemGroupId) ?? 0) + 1);
    }
  }
  function mergeStats(target, source) {
    target.occurrences += source.occurrences;
    for (const alias of source.aliases) {
      target.aliases.add(alias);
    }
    for (const problemId of source.problemIds) {
      target.problemIds.add(problemId);
    }
    for (const pageNumber of source.pageNumbers) {
      target.pageNumbers.add(pageNumber);
    }
    for (const documentId of source.documentIds) {
      target.documentIds.add(documentId);
    }
    for (const multipartProblemId of source.multipartProblemIds) {
      target.multipartProblemIds.add(multipartProblemId);
    }
  }
  function getOrCreateConceptStats(concept) {
    const existing = conceptStats.get(concept);
    if (existing) {
      return existing;
    }
    const created = {
      concept,
      aliases: /* @__PURE__ */ new Set(),
      occurrences: 0,
      problemIds: /* @__PURE__ */ new Set(),
      pageNumbers: /* @__PURE__ */ new Set(),
      documentIds: /* @__PURE__ */ new Set(),
      multipartProblemIds: /* @__PURE__ */ new Set()
    };
    conceptStats.set(concept, created);
    return created;
  }
  function resolveConceptKey(rawConcept) {
    const normalized = rawConcept.includes(".") ? rawConcept.toLowerCase() : normalizeConceptLabel(rawConcept);
    if (!normalized) {
      return null;
    }
    for (const existingKey of conceptStats.keys()) {
      if (!shouldMergeConceptLabels(existingKey, normalized)) {
        continue;
      }
      const canonical = chooseCanonicalConceptLabel(existingKey, normalized);
      if (canonical === existingKey) {
        return existingKey;
      }
      const existingStats = conceptStats.get(existingKey);
      const canonicalStats = getOrCreateConceptStats(canonical);
      if (existingStats && existingStats !== canonicalStats) {
        mergeStats(canonicalStats, existingStats);
        conceptStats.delete(existingKey);
      }
      return canonical;
    }
    return normalized;
  }
  function recordConcept(rawConcept, options) {
    const concept = resolveConceptKey(rawConcept);
    if (!concept) {
      return;
    }
    const stats = getOrCreateConceptStats(concept);
    stats.aliases.add(rawConcept.trim());
    stats.occurrences += 1;
    stats.documentIds.add(options.documentId);
    if (options.problemId) {
      stats.problemIds.add(options.problemId);
    }
    if (options.isMultipart && options.problemId) {
      stats.multipartProblemIds.add(options.problemId);
    }
    for (const pageNumber of options.pageNumbers ?? []) {
      stats.pageNumbers.add(pageNumber);
    }
    totalConceptEvidence += 1;
  }
  for (const problem of args.problems) {
    const pageNumbers = problem.sourceSpan ? Array.from({ length: Math.max(1, problem.sourceSpan.lastPage - problem.sourceSpan.firstPage + 1) }, (_, index) => problem.sourceSpan.firstPage + index) : [];
    const isMultipart = Boolean(problem.problemGroupId && (problemGroupSizes.get(problem.problemGroupId) ?? 0) > 1);
    for (const concept of problem.concepts) {
      recordConcept(concept, {
        problemId: problem.id,
        pageNumbers,
        documentId: problem.documentId,
        isMultipart
      });
    }
    for (const representation of problem.representations) {
      representations.add(representation);
    }
    for (const misconception of problem.misconceptions) {
      misconceptionThemes.add(misconception);
    }
    difficultyDistribution[problem.difficulty] += 1;
  }
  for (const fragment of args.fragments) {
    representations.add(fragment.contentType);
    for (const concept of fragment.prerequisiteConcepts ?? []) {
      recordConcept(concept, { documentId: fragment.documentId });
    }
    for (const misconception of fragment.misconceptionTriggers ?? []) {
      misconceptionThemes.add(misconception);
    }
  }
  const instructionalCount = args.fragments.filter((fragment) => fragment.isInstructional).length;
  const scoredConcepts = [...conceptStats.values()].map((stats) => {
    const freqProblems = stats.problemIds.size;
    const freqPages = stats.pageNumbers.size;
    const freqDocuments = stats.documentIds.size;
    const semanticDensity = totalConceptEvidence === 0 ? 0 : Number((stats.occurrences / totalConceptEvidence).toFixed(4));
    const multipartPresence = freqProblems === 0 ? 0 : Number((stats.multipartProblemIds.size / freqProblems).toFixed(4));
    const scored = scoreConceptMetadata({
      freqProblems,
      freqPages,
      freqDocuments,
      semanticDensity,
      multipartPresence,
      crossDocumentRecurrence: freqDocuments,
      label: stats.concept
    });
    conceptFrequencies[stats.concept] = stats.occurrences;
    return {
      concept: stats.concept,
      aliases: [...stats.aliases].map((alias) => alias.trim()).filter(Boolean).filter((alias) => alias !== stats.concept),
      freqProblems,
      freqPages,
      freqDocuments: scored.freqDocuments,
      semanticDensity,
      multipartPresence,
      crossDocumentRecurrence: scored.crossDocumentRecurrence,
      score: scored.score,
      isNoise: scored.isNoise || isLikelyNoiseConcept(stats.concept)
    };
  }).sort((left, right) => right.score - left.score || right.freqProblems - left.freqProblems || left.concept.localeCompare(right.concept));
  const sortedConcepts = scoredConcepts.filter((concept) => !concept.isNoise).map((concept) => concept.concept);
  return {
    concepts: sortedConcepts,
    scoredConcepts,
    conceptFrequencies,
    representations: [...representations],
    difficultyDistribution,
    misconceptionThemes: [...misconceptionThemes],
    instructionalDensity: args.fragments.length === 0 ? 0 : Number((instructionalCount / args.fragments.length).toFixed(2)),
    problemCount: args.problems.length,
    exampleCount: args.fragments.filter((fragment) => fragment.instructionalRole === "example").length,
    explanationCount: args.fragments.filter((fragment) => fragment.instructionalRole === "explanation").length
  };
}

// src/prism-v4/documents/analysis/validateCanonicalDocument.ts
function validateCanonicalDocument(document) {
  const seenNodeIds = /* @__PURE__ */ new Set();
  const surfaceIds = new Set(document.surfaces.map((surface) => surface.id));
  const nodeIds = new Set(document.nodes.map((node) => node.id));
  for (let index = 1; index < document.surfaces.length; index += 1) {
    if (document.surfaces[index - 1].index > document.surfaces[index].index) {
      throw new Error("CanonicalDocument surfaces must be sorted by index");
    }
  }
  for (const node of document.nodes) {
    if (seenNodeIds.has(node.id)) {
      throw new Error(`Duplicate DocumentNode id: ${node.id}`);
    }
    seenNodeIds.add(node.id);
    if (!surfaceIds.has(node.surfaceId)) {
      throw new Error(`DocumentNode ${node.id} references unknown surface ${node.surfaceId}`);
    }
    if (node.parentId && !nodeIds.has(node.parentId)) {
      throw new Error(`DocumentNode ${node.id} references unknown parent ${node.parentId}`);
    }
  }
  return document;
}

// src/prism-v4/documents/analysis/canonicalize.ts
function createNodeId(documentId, index) {
  return `${documentId}-node-${index}`;
}
function createSurfaceId(documentId, index) {
  return `${documentId}-surface-${index + 1}`;
}
function canonicalizeAzureExtract(documentId, extract) {
  const surfaces = (extract.pages ?? []).map((page, index) => ({
    id: createSurfaceId(documentId, index),
    surfaceType: "page",
    index,
    label: `Page ${page.pageNumber}`
  }));
  const fallbackSurfaceId = surfaces[0]?.id ?? createSurfaceId(documentId, 0);
  const allSurfaces = surfaces.length > 0 ? surfaces : [{ id: fallbackSurfaceId, surfaceType: "page", index: 0, label: "Page 1" }];
  const nodes = [];
  let orderIndex = 0;
  for (const paragraph of extract.paragraphs ?? []) {
    const normalized = normalizeWhitespace(paragraph.text);
    if (!normalized) {
      continue;
    }
    const surfaceId = allSurfaces[(paragraph.pageNumber ?? 1) - 1]?.id ?? fallbackSurfaceId;
    const heading = paragraph.role === "title";
    const parentId = createNodeId(documentId, orderIndex);
    nodes.push({
      id: parentId,
      documentId,
      surfaceId,
      nodeType: heading ? "heading" : "paragraph",
      orderIndex: orderIndex++,
      text: paragraph.text,
      normalizedText: normalized,
      metadata: heading ? { headingLevel: 1, styleHint: "azure-title" } : void 0
    });
    for (const sentence of splitSentences(normalized)) {
      nodes.push({
        id: createNodeId(documentId, orderIndex),
        documentId,
        surfaceId,
        nodeType: "inline",
        parentId,
        orderIndex: orderIndex++,
        text: sentence,
        normalizedText: sentence
      });
    }
  }
  for (const [tableIndex, table] of (extract.tables ?? []).entries()) {
    const pageNumber = table.pageNumber ?? 1;
    const surfaceId = allSurfaces[pageNumber - 1]?.id ?? fallbackSurfaceId;
    const tableId = createNodeId(documentId, orderIndex);
    const preview = table.cells.sort((left, right) => left.rowIndex - right.rowIndex || left.columnIndex - right.columnIndex).map((cell) => normalizeWhitespace(cell.text)).filter(Boolean).slice(0, 8).join(" | ");
    nodes.push({
      id: tableId,
      documentId,
      surfaceId,
      nodeType: "table",
      orderIndex: orderIndex++,
      text: preview,
      normalizedText: preview,
      metadata: { styleHint: `table-${tableIndex}`, tableRowIndex: 0, tableColumnIndex: 0 }
    });
    for (const cell of table.cells) {
      const cellText = normalizeWhitespace(cell.text);
      nodes.push({
        id: createNodeId(documentId, orderIndex),
        documentId,
        surfaceId,
        nodeType: "tableCell",
        parentId: tableId,
        orderIndex: orderIndex++,
        text: cell.text,
        normalizedText: cellText,
        metadata: {
          tableRowIndex: cell.rowIndex,
          tableColumnIndex: cell.columnIndex
        }
      });
    }
  }
  if (nodes.length === 0 && normalizeWhitespace(extract.content)) {
    nodes.push({
      id: createNodeId(documentId, 0),
      documentId,
      surfaceId: fallbackSurfaceId,
      nodeType: "paragraph",
      orderIndex: 0,
      text: extract.content,
      normalizedText: normalizeWhitespace(extract.content)
    });
  }
  return validateCanonicalDocument({
    id: documentId,
    sourceFileName: extract.fileName,
    sourceMimeType: "application/pdf",
    surfaces: allSurfaces,
    nodes,
    createdAt: new Date().toISOString()
  });
}
function canonicalDocumentToAzureExtract(document) {
  const surfaceLabels = new Map(document.surfaces.map((surface) => [surface.id, surface]));
  const paragraphNodes = document.nodes.filter((node) => ["heading", "paragraph", "listItem", "caption"].includes(node.nodeType));
  const tableNodes = document.nodes.filter((node) => node.nodeType === "tableCell");
  const pages = document.surfaces.map((surface) => {
    const texts = paragraphNodes.filter((node) => node.surfaceId === surface.id).sort((left, right) => left.orderIndex - right.orderIndex).map((node) => node.normalizedText ?? normalizeWhitespace(node.text ?? "")).filter(Boolean);
    return {
      pageNumber: surface.index + 1,
      text: texts.join("\n")
    };
  });
  const paragraphs = paragraphNodes.sort((left, right) => left.orderIndex - right.orderIndex).map((node) => ({
    text: node.normalizedText ?? normalizeWhitespace(node.text ?? ""),
    pageNumber: (surfaceLabels.get(node.surfaceId)?.index ?? 0) + 1,
    role: node.nodeType === "heading" ? "title" : void 0
  })).filter((paragraph) => paragraph.text.length > 0);
  const tablesBySurface = /* @__PURE__ */ new Map();
  for (const cell of tableNodes) {
    tablesBySurface.set(cell.parentId ?? cell.id, [...tablesBySurface.get(cell.parentId ?? cell.id) ?? [], cell]);
  }
  const tables = [...tablesBySurface.entries()].map(([, cells]) => ({
    rowCount: Math.max(...cells.map((cell) => Number(cell.metadata?.tableRowIndex ?? 0)), 0) + 1,
    columnCount: Math.max(...cells.map((cell) => Number(cell.metadata?.tableColumnIndex ?? 0)), 0) + 1,
    pageNumber: (surfaceLabels.get(cells[0].surfaceId)?.index ?? 0) + 1,
    cells: cells.sort((left, right) => left.orderIndex - right.orderIndex).map((cell) => ({
      rowIndex: Number(cell.metadata?.tableRowIndex ?? 0),
      columnIndex: Number(cell.metadata?.tableColumnIndex ?? 0),
      text: cell.normalizedText ?? normalizeWhitespace(cell.text ?? "")
    }))
  }));
  return {
    fileName: document.sourceFileName,
    content: paragraphs.map((paragraph) => paragraph.text).join("\n\n"),
    pages,
    paragraphs,
    tables,
    readingOrder: paragraphs.map((paragraph) => paragraph.text)
  };
}

// src/prism-v4/documents/analysis/classifyFragments.ts
function unique(values) {
  return [...new Set(values)];
}
var SUBJECT_CONCEPT_PATTERNS = {
  algebra: [
    { concept: "algebra", pattern: /\balgebra\b/ },
    { concept: "linear equations", pattern: /\blinear equation(s)?\b/ },
    { concept: "slope", pattern: /\bslope\b/ },
    { concept: "y-intercept", pattern: /\by[- ]intercept\b/ },
    { concept: "systems of equations", pattern: /\bsystem(s)? of equation(s)?\b/ },
    { concept: "inequalities", pattern: /\binequalit(y|ies)\b/ },
    { concept: "factoring", pattern: /\bfactor(ing|ed)?\b/ },
    { concept: "quadratic equations", pattern: /\bquadratic( equation(s)?)?\b/ },
    { concept: "exponents", pattern: /\bexponent(s)?\b/ },
    { concept: "functions", pattern: /\bfunction(s)?\b/ },
    { concept: "domain and range", pattern: /\bdomain and range\b/ },
    { concept: "proportional relationships", pattern: /\bproportional relationship(s)?\b/ },
    { concept: "rate of change", pattern: /\brate of change\b/ },
    { concept: "variable isolation", pattern: /\bvariable isolation\b/ },
    { concept: "distributive property", pattern: /\bdistributive property\b/ },
    { concept: "solving for x", pattern: /\bsolv(e|ing) for x\b/ },
    { concept: "equation solving", pattern: /\bequation(s)?\b|\binverse operation(s)?\b/ },
    { concept: "isolate variable", pattern: /\bisolate (the )?variable\b|\bsolve for the variable\b/ },
    { concept: "ratios", pattern: /\bratio(s)?\b/ },
    { concept: "decimal operations", pattern: /\bdecimal(s)?\b|\b0\.\d+/ },
    { concept: "operations", pattern: /\boperation(s)?\b|\badd\b|\bsubtract\b|\bmultiply\b|\bdivide\b/ }
  ],
  geometry: [
    { concept: "angles", pattern: /\bangle(s)?\b/ },
    { concept: "triangles", pattern: /\btriangle(s)?\b/ },
    { concept: "congruence", pattern: /\bcongruen(t|ce)\b/ },
    { concept: "similarity", pattern: /\bsimilarit(y|ies)\b|\bsimilar figures\b/ },
    { concept: "Pythagorean theorem", pattern: /\bpythagorean theorem\b|\bpythagorean\b/ },
    { concept: "area", pattern: /\barea\b/ },
    { concept: "perimeter", pattern: /\bperimeter\b/ },
    { concept: "volume", pattern: /\bvolume\b/ },
    { concept: "transformations", pattern: /\btransformation(s)?\b/ },
    { concept: "symmetry", pattern: /\bsymmetr(y|ical)\b/ },
    { concept: "circles", pattern: /\bcircle(s)?\b/ },
    { concept: "radius and diameter", pattern: /\bradius\b|\bdiameter\b/ },
    { concept: "polygons", pattern: /\bpolygon(s)?\b/ },
    { concept: "coordinate geometry", pattern: /\bcoordinate geometry\b|\bcoordinate plane\b/ },
    { concept: "proofs", pattern: /\bproof(s)?\b/ }
  ],
  biology: [
    { concept: "cells", pattern: /\bcell(s)?\b/ },
    { concept: "photosynthesis", pattern: /\bphotosynthesis\b/ },
    { concept: "cellular respiration", pattern: /\bcellular respiration\b/ },
    { concept: "chloroplast", pattern: /\bchloroplast(s)?\b/ },
    { concept: "mitochondria", pattern: /\bmitochondria\b|\bmitochondrion\b/ },
    { concept: "cell membrane", pattern: /\bcell membrane\b/ },
    { concept: "DNA", pattern: /\bdna\b/ },
    { concept: "mitosis", pattern: /\bmitosis\b/ },
    { concept: "osmosis", pattern: /\bosmosis\b/ },
    { concept: "diffusion", pattern: /\bdiffusion\b/ },
    { concept: "enzymes", pattern: /\benzyme(s)?\b/ },
    { concept: "ecosystems", pattern: /\becosystem(s)?\b/ },
    { concept: "food chains", pattern: /\bfood chain(s)?\b/ },
    { concept: "producers and consumers", pattern: /\bproducer(s)?\b|\bconsumer(s)?\b/ },
    { concept: "decomposers", pattern: /\bdecomposer(s)?\b/ },
    { concept: "energy transfer", pattern: /\benergy transfer\b/ },
    { concept: "homeostasis", pattern: /\bhomeostasis\b/ }
  ],
  physics: [
    { concept: "forces and motion", pattern: /\bforce(s)?\b|\bmotion\b/ },
    { concept: "gravity", pattern: /\bgravity\b/ },
    { concept: "speed and velocity", pattern: /\bspeed\b|\bvelocity\b/ }
  ],
  earth_science: [
    { concept: "water cycle", pattern: /\bwater cycle\b/ },
    { concept: "evaporation", pattern: /\bevaporation\b/ },
    { concept: "condensation", pattern: /\bcondensation\b/ },
    { concept: "precipitation", pattern: /\bprecipitation\b/ },
    { concept: "weathering", pattern: /\bweathering\b/ },
    { concept: "erosion", pattern: /\berosion\b/ },
    { concept: "plate tectonics", pattern: /\bplate tectonics\b/ },
    { concept: "rock cycle", pattern: /\brock cycle\b/ },
    { concept: "atmosphere", pattern: /\batmosphere\b/ },
    { concept: "climate", pattern: /\bclimate\b/ },
    { concept: "weather patterns", pattern: /\bweather pattern(s)?\b/ },
    { concept: "ocean currents", pattern: /\bocean current(s)?\b/ },
    { concept: "carbon cycle", pattern: /\bcarbon cycle\b/ },
    { concept: "renewable energy", pattern: /\brenewable energy\b/ },
    { concept: "natural resources", pattern: /\bnatural resource(s)?\b/ }
  ],
  chemistry: [
    { concept: "atoms", pattern: /\batom(s)?\b/ },
    { concept: "molecules", pattern: /\bmolecule(s)?\b/ },
    { concept: "chemical reactions", pattern: /\bchemical reaction(s)?\b/ },
    { concept: "periodic table", pattern: /\bperiodic table\b/ },
    { concept: "valence electrons", pattern: /\bvalence electron(s)?\b|\bvalence\b/ },
    { concept: "ionic bonds", pattern: /\bionic bond(s)?\b/ },
    { concept: "covalent bonds", pattern: /\bcovalent bond(s)?\b/ },
    { concept: "pH", pattern: /\bph\b/ },
    { concept: "acids and bases", pattern: /\bacid(s)?\b|\bbase(s)?\b/ },
    { concept: "solutions", pattern: /\bsolution(s)?\b/ },
    { concept: "mixtures", pattern: /\bmixture(s)?\b/ },
    { concept: "conservation of mass", pattern: /\bconservation of mass\b/ },
    { concept: "endothermic reactions", pattern: /\bendothermic\b/ },
    { concept: "exothermic reactions", pattern: /\bexothermic\b/ },
    { concept: "states of matter", pattern: /\bstate(s)? of matter\b/ }
  ],
  ela: [
    { concept: "main idea", pattern: /\bmain idea\b/ },
    { concept: "theme", pattern: /\btheme\b/ },
    { concept: "inference", pattern: /\binference(s)?\b|\binfer\b/ },
    { concept: "character analysis", pattern: /\bcharacter analysis\b|\bcharacter trait(s)?\b/ },
    { concept: "plot structure", pattern: /\bplot structure\b|\bplot\b/ },
    { concept: "conflict", pattern: /\bconflict\b/ },
    { concept: "setting", pattern: /\bsetting\b/ },
    { concept: "author's purpose", pattern: /\bauthor['’]s purpose\b/ },
    { concept: "figurative language", pattern: /\bfigurative language\b/ },
    { concept: "tone", pattern: /\btone\b/ },
    { concept: "summarizing", pattern: /\bsummar(y|ize|izing)\b/ },
    { concept: "text evidence", pattern: /\btext evidence\b/ }
  ],
  statistics: [
    { concept: "hypothesis testing", pattern: /\bhypothesis test(ing)?\b|\bnull hypothesis\b|\balternative hypothesis\b|\bh0\b|\bha\b/ },
    { concept: "p-values & decision rules", pattern: /\bp-?value(s)?\b|\bdecision rule\b|(?:\balpha\b|α)\s*[=:]?\s*0?\.\d+/ },
    { concept: "one-sample proportion test", pattern: /\bone-?sample proportion test\b|\bsample proportion\b|\bkissing couples\b/ },
    { concept: "one-sample mean test", pattern: /\bone-?sample mean test\b|\bsample mean\b|\brestaurant income\b|\bconstruction zone speed(s)?\b/ },
    { concept: "simulation-based inference", pattern: /\bsimulation-based inference\b|\bsimulation\b|\bsampling distribution\b|\bdotplot\b|\brepeated samples?\b/ },
    { concept: "parameters & statistics", pattern: /\bparameter(s)?\b|\bstatistic(s)?\b/ },
    { concept: "type i and type ii errors", pattern: /\btype i\b|\btype ii\b|\bfalse positive\b|\bfalse negative\b/ }
  ],
  social_studies: [
    { concept: "government", pattern: /\bgovernment\b/ },
    { concept: "government branches", pattern: /\bbranch(es)? of government\b|\bgovernment branch(es)?\b/ },
    { concept: "constitution", pattern: /\bconstitution\b/ },
    { concept: "democracy", pattern: /\bdemocrac(y|ies)\b/ },
    { concept: "economy", pattern: /\beconom(y|ic)\b/ },
    { concept: "supply and demand", pattern: /\bsupply and demand\b/ },
    { concept: "geography", pattern: /\bgeograph(y|ic)\b/ },
    { concept: "culture", pattern: /\bculture\b/ },
    { concept: "historical periods", pattern: /\bhistorical period(s)?\b|\bancient\b|\bmedieval\b|\bindustrial revolution\b/ },
    { concept: "historical events", pattern: /\bhistorical event(s)?\b|\bhistory\b/ },
    { concept: "primary sources", pattern: /\bprimary source(s)?\b/ },
    { concept: "secondary sources", pattern: /\bsecondary source(s)?\b/ },
    { concept: "citizenship", pattern: /\bcitizenship\b/ },
    { concept: "rights and responsibilities", pattern: /\bright(s)?\b|\bresponsibilit(y|ies)\b/ },
    { concept: "global trade", pattern: /\bglobal trade\b|\btrade\b/ },
    { concept: "conflict and cooperation", pattern: /\bconflict\b|\bcooperation\b/ },
    { concept: "timelines", pattern: /\btimeline(s)?\b/ }
  ]
};
var CONCEPT_PATTERNS = [
  ...Object.values(SUBJECT_CONCEPT_PATTERNS).flat(),
  { concept: "fractions", pattern: /\bfraction(s)?\b/ },
  { concept: "equivalent fractions", pattern: /\bequivalent\b/ },
  { concept: "number line reasoning", pattern: /\bnumber line\b/ },
  { concept: "equation solving", pattern: /\bequation(s)?\b|\binverse operation(s)?\b/ },
  { concept: "common denominators", pattern: /\bdenominator(s)?\b/ },
  { concept: "linear equations", pattern: /\blinear equation(s)?\b/ },
  { concept: "isolate variable", pattern: /\bisolate (the )?variable\b|\bsolve for the variable\b/ },
  { concept: "photosynthesis", pattern: /\bphotosynthesis\b/ },
  { concept: "chloroplast", pattern: /\bchloroplast(s)?\b/ },
  { concept: "glucose", pattern: /\bglucose\b/ },
  { concept: "light-dependent reactions", pattern: /\blight[- ]dependent\b/ },
  { concept: "calvin cycle", pattern: /\bcalvin cycle\b/ }
];
function extractLearningTarget(text, instructionalRole) {
  if (instructionalRole !== "objective") {
    return null;
  }
  return text.replace(/^(learning objective|objective|learning target|i can)[:\s-]*/i, "").trim() || text.trim();
}
function extractPrerequisiteConcepts(text) {
  const lower = text.toLowerCase();
  const concepts = CONCEPT_PATTERNS.filter(({ pattern }) => pattern.test(lower)).map(({ concept }) => normalizeConceptLabel(concept)).filter((concept) => !isLikelyNoiseConcept(concept));
  const normalized = new Set(concepts);
  const hasStatisticalSignal = [
    "hypothesis testing",
    "p-values & decision rules",
    "one-sample proportion test",
    "one-sample mean test",
    "simulation-based inference",
    "parameters & statistics",
    "type i and type ii errors"
  ].some((concept) => normalized.has(concept));
  if (hasStatisticalSignal) {
    normalized.delete("decimal operations");
    normalized.delete("rights and responsibilities");
    if (normalized.has("inference")) {
      normalized.delete("inference");
      if (/\bsimulation\b|\bsampling distribution\b|\bdotplot\b/.test(lower)) {
        normalized.add("simulation-based inference");
      }
    }
  }
  if (/review|before|prior|remember/.test(lower)) {
    return unique(normalized.size > 0 ? [...normalized] : [text.trim().slice(0, 48)]);
  }
  return unique([...normalized]);
}
function inferScaffoldLevel(text, instructionalRole) {
  const lower = text.toLowerCase();
  if (instructionalRole === "objective" || /independent|exit ticket|extension/.test(lower)) {
    return "low";
  }
  if (instructionalRole === "example" || /step|guided|together|model/.test(lower)) {
    return "high";
  }
  if (instructionalRole === "instruction" || /practice|support|hint/.test(lower)) {
    return "medium";
  }
  return "medium";
}
function inferExampleType(text, instructionalRole) {
  if (instructionalRole !== "example") {
    return void 0;
  }
  const lower = text.toLowerCase();
  if (/counterexample|not this|incorrect/.test(lower)) {
    return "counterexample";
  }
  if (/worked example|step|showing each step|model/.test(lower)) {
    return "worked";
  }
  return "non-worked";
}
function extractMisconceptionTriggers(text) {
  const lower = text.toLowerCase();
  const triggers = [];
  if (/common mistake|mistake|error|misconception/.test(lower)) {
    triggers.push(text.trim());
  }
  if (/denominator/.test(lower)) {
    triggers.push("confusing numerator and denominator roles");
  }
  if (/number line/.test(lower)) {
    triggers.push("misreading scale or interval spacing");
  }
  if (/inverse operation|equation/.test(lower)) {
    triggers.push("forgetting inverse operations");
  }
  return unique(triggers);
}
function inferContentType(nodeType, text) {
  if (nodeType === "figure") {
    return "image";
  }
  if (nodeType === "caption") {
    return "text";
  }
  if (nodeType === "table" || nodeType === "tableCell") {
    return "table";
  }
  if (nodeType === "heading") {
    return "heading";
  }
  if (/\?$/.test(text) || /\bsolve\b|\bexplain\b|\bshow\b|\bjustify\b/i.test(text)) {
    return "question";
  }
  if (/\bgraph\b|\bchart\b|\bplot\b/i.test(text)) {
    return "graph";
  }
  if (/\bdiagram\b|\bfigure\b|\billustration\b/i.test(text)) {
    return "diagram";
  }
  return "text";
}
function classifyRole(text, contentType) {
  const lower = text.toLowerCase();
  if (!text.trim()) {
    return { isInstructional: false, instructionalRole: "metadata", confidence: 0.98, evidence: "Empty text node." };
  }
  if (contentType === "image") {
    return { isInstructional: false, instructionalRole: "metadata", confidence: 0.82, evidence: "Figure/image node classified as non-instructional by default." };
  }
  if (/^page\s+\d+$/i.test(text) || /^name[:\s]/i.test(text) || /^date[:\s]/i.test(text)) {
    return { isInstructional: false, instructionalRole: "metadata", confidence: 0.95, evidence: "Detected page or form metadata." };
  }
  if (/\bobjective\b|\blearning target\b|\bi can\b/i.test(lower)) {
    return { isInstructional: true, instructionalRole: "objective", confidence: 0.94, evidence: "Objective cue detected." };
  }
  if (/\bexample\b|\bfor example\b|\bworked example\b/i.test(lower)) {
    return { isInstructional: true, instructionalRole: "example", confidence: 0.9, evidence: "Example cue detected." };
  }
  if (contentType === "question") {
    return { isInstructional: true, instructionalRole: "problem-stem", confidence: 0.88, evidence: "Question or directive cue detected." };
  }
  if (/\bdirections\b|\binstructions\b|\bcomplete the following\b/i.test(lower)) {
    return { isInstructional: true, instructionalRole: "instruction", confidence: 0.9, evidence: "Instruction cue detected." };
  }
  if (/\breflect\b|\breflection\b|\bjournal\b/i.test(lower)) {
    return { isInstructional: true, instructionalRole: "reflection", confidence: 0.88, evidence: "Reflection cue detected." };
  }
  if (/\bnote\b|\bremember\b|\bimportant\b/i.test(lower)) {
    return { isInstructional: true, instructionalRole: "note", confidence: 0.8, evidence: "Note cue detected." };
  }
  return { isInstructional: true, instructionalRole: "explanation", confidence: 0.62, evidence: "Default instructional explanation classification." };
}
function classifyFragments(document) {
  return document.nodes.map((node) => {
    const text = node.normalizedText ?? node.text ?? "";
    const contentType = inferContentType(node.nodeType, text);
    const classification = classifyRole(text, contentType);
    const learningTarget = extractLearningTarget(text, classification.instructionalRole);
    const prerequisiteConcepts = extractPrerequisiteConcepts(text);
    const scaffoldLevel = inferScaffoldLevel(text, classification.instructionalRole);
    const exampleType = inferExampleType(text, classification.instructionalRole);
    const misconceptionTriggers = extractMisconceptionTriggers(text);
    return {
      id: `${document.id}-fragment-${node.id}`,
      documentId: document.id,
      anchors: [{ documentId: document.id, surfaceId: node.surfaceId, nodeId: node.id }],
      isInstructional: classification.isInstructional,
      instructionalRole: classification.instructionalRole,
      contentType,
      learningTarget,
      prerequisiteConcepts,
      scaffoldLevel,
      exampleType,
      misconceptionTriggers,
      confidence: classification.confidence,
      classifierVersion: "wave5-v1",
      strategy: "rule-based",
      evidence: classification.evidence,
      semanticTags: classification.isInstructional ? unique([
        classification.instructionalRole,
        ...learningTarget ? ["learning-target"] : [],
        ...prerequisiteConcepts.length > 0 ? ["prerequisite"] : [],
        ...misconceptionTriggers.length > 0 ? ["misconception-trigger"] : []
      ]) : ["metadata"]
    };
  });
}

// src/prism-v4/semantic/extract/classifyParagraphBlocks.ts
var DATE_OR_TIME_PATTERN2 = /\b(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi;
var PAGE_PATTERN = /^\s*(?:page\s+)?\d+(?:\s+of\s+\d+)?\s*$/i;
var METADATA_PATTERN = /^(?:name|date|teacher|class|period|student)\b/i;
var STOPWORDS = /* @__PURE__ */ new Set(["the", "and", "for", "with", "that", "from", "this", "your", "into", "page"]);
function buildSignature(text) {
  return normalizeWhitespace(text.toLowerCase().replace(DATE_OR_TIME_PATTERN2, " ").replace(/\d+/g, " ").replace(/[^a-z\s]+/g, " "));
}
function computeSemanticDensity(text) {
  const tokens = (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return 0;
  }
  const meaningfulTokens = tokens.filter((token) => token.length > 2 && !STOPWORDS.has(token));
  return meaningfulTokens.length / tokens.length;
}
function looksLikeHeading(text, role) {
  if (role === "title" || role === "sectionHeading") {
    return true;
  }
  if (/[.!?]$/.test(text) || text.length > 90) {
    return false;
  }
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 10;
}
function classifyBlock(args) {
  const { text, role, semanticDensity, isRepeated, signature } = args;
  if (!text) {
    return { structuralRole: "noise", isSuppressed: true };
  }
  if (PAGE_PATTERN.test(text) || DATE_OR_TIME_PATTERN2.test(text) || signature.length === 0) {
    return { structuralRole: "footer", isSuppressed: true };
  }
  if (METADATA_PATTERN.test(text)) {
    return { structuralRole: "noise", isSuppressed: true };
  }
  if (isRepeated && looksLikeHeading(text, role)) {
    return { structuralRole: "header", isSuppressed: true };
  }
  if (isRepeated && semanticDensity < 0.5) {
    return { structuralRole: "footer", isSuppressed: true };
  }
  if (semanticDensity < 0.26) {
    return { structuralRole: "noise", isSuppressed: true };
  }
  return { structuralRole: "content", isSuppressed: false };
}
function classifyParagraphBlocks(azureExtract) {
  const baseBlocks = (azureExtract.paragraphs ?? []).map((paragraph) => ({
    text: normalizeWhitespace(paragraph.text),
    pageNumber: paragraph.pageNumber,
    role: paragraph.role
  })).filter((paragraph) => paragraph.text.length > 0);
  const signaturePages = /* @__PURE__ */ new Map();
  for (const block of baseBlocks) {
    const signature = buildSignature(block.text);
    if (!signaturePages.has(signature)) {
      signaturePages.set(signature, /* @__PURE__ */ new Set());
    }
    signaturePages.get(signature).add(block.pageNumber);
  }
  return baseBlocks.map((block) => {
    const signature = buildSignature(block.text);
    const semanticDensity = computeSemanticDensity(block.text);
    const isRepeated = signature.length > 0 && (signaturePages.get(signature)?.size ?? 0) > 1;
    const classification = classifyBlock({
      text: block.text,
      role: block.role,
      semanticDensity,
      isRepeated,
      signature
    });
    return {
      ...block,
      signature,
      semanticDensity: Number(semanticDensity.toFixed(2)),
      structuralRole: classification.structuralRole,
      isSuppressed: classification.isSuppressed
    };
  });
}

// src/prism-v4/semantic/extract/extractProblem.ts
var INLINE_SUBPART_BOUNDARY = /\s+(?=(?:\d+[a-z][.)]|\([a-z]\)|[a-z][.)]|\d+[a-z])\s+)/i;
function looksLikeProblemBoundary(text) {
  return /^(?:\d+[.)\]]|q\s*\d+[.)\]]|question\s*\d+[:.]|[A-Z][.)])\s+/i.test(text);
}
function matchTopLevelProblem(text) {
  const match = text.match(/^(?:problem\s+)?(\d+)(?:\s*[:.)-])?(?:\s+(.*))?$/i);
  if (!match) {
    return null;
  }
  return {
    problemNumber: Number(match[1]),
    body: normalizeWhitespace(match[2] ?? "")
  };
}
function matchSubpart(text) {
  const match = text.match(/^(?:(\d+)([a-z])[.)]|\(([a-z])\)|([a-z])[.)]|(\d+)([a-z]))\s+(.*)$/);
  if (!match) {
    return null;
  }
  const numberedProblem = match[1] ?? match[5];
  const partLabel = (match[2] ?? match[3] ?? match[4] ?? match[6] ?? "").toLowerCase();
  if (!partLabel) {
    return null;
  }
  return {
    problemNumber: numberedProblem ? Number(numberedProblem) : void 0,
    partLabel,
    body: normalizeWhitespace(match[7] ?? "")
  };
}
function alphabetIndex(partLabel) {
  const normalized = partLabel.trim().toLowerCase();
  if (!/^[a-z]$/.test(normalized)) {
    return 0;
  }
  return normalized.charCodeAt(0) - 96;
}
function toProblemPartDraft(subpart, pageNumber) {
  return {
    partLabel: subpart.partLabel,
    partIndex: alphabetIndex(subpart.partLabel),
    teacherLabel: `${subpart.partLabel})`,
    pageNumber,
    textLines: subpart.body ? [subpart.body] : []
  };
}
function splitInlineSubparts(text, pageNumber) {
  const segments = text.split(INLINE_SUBPART_BOUNDARY).map((segment) => normalizeWhitespace(segment)).filter((segment) => segment.length > 0);
  if (segments.length <= 1) {
    return null;
  }
  const result = { parts: [] };
  for (const segment of segments) {
    const subpart = matchSubpart(segment);
    if (subpart) {
      result.parts.push(toProblemPartDraft(subpart, pageNumber));
      continue;
    }
    if (result.parts.length === 0) {
      result.leadingText = result.leadingText ? `${result.leadingText}
${segment}` : segment;
      continue;
    }
    result.parts[result.parts.length - 1].textLines.push(segment);
  }
  return result.parts.length > 0 ? result : null;
}
function looksLikeHeader(text, role) {
  if (role === "title") {
    return true;
  }
  const normalized = normalizeWhitespace(text);
  if (!normalized || normalized.length > 90 || /[.!?]$/.test(normalized)) {
    return false;
  }
  if (/^(?:name|date|teacher|class|period|directions)\b/i.test(normalized)) {
    return true;
  }
  const words = normalized.split(/\s+/);
  return words.length > 1 && words.length <= 12 && !/^\d/.test(normalized);
}
function createProblem(params) {
  const createdAt = new Date().toISOString();
  const localProblemId = params.problemId;
  const problemGroupId = params.rootProblemId;
  return {
    problemId: params.problemId,
    localProblemId,
    problemGroupId,
    canonicalProblemId: void 0,
    rootProblemId: params.rootProblemId,
    parentProblemId: params.parentProblemId,
    problemNumber: params.problemNumber,
    partIndex: params.partIndex,
    partLabel: params.partLabel,
    teacherLabel: params.teacherLabel,
    stemText: params.stemText,
    partText: params.partText,
    displayOrder: params.displayOrder,
    createdAt,
    rawText: params.rawText,
    cleanedText: params.cleanedText,
    mediaUrls: extractMediaUrls(params.rawText),
    sourceType: "document",
    sourceDocumentId: params.fileName,
    sourcePageNumber: params.sourcePageNumber,
    sourceSpan: params.sourceSpan
  };
}
function extractMediaUrls(text) {
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  const figureRefs = [...text.matchAll(/\b(?:figure|image|diagram|graph|table)\s+\d+/gi)].map((match) => match[0]);
  return [.../* @__PURE__ */ new Set([...urls, ...figureRefs])];
}
function buildProblemGroupProblems(group, fileName) {
  const stemText = normalizeWhitespace(group.stemLines.join("\n"));
  const rootDisplayOrder = group.problemNumber * 1e3;
  const rootProblem = createProblem({
    problemId: group.rootProblemId,
    rootProblemId: group.rootProblemId,
    parentProblemId: null,
    problemNumber: group.problemNumber,
    partIndex: 0,
    teacherLabel: group.teacherLabel,
    stemText,
    rawText: `${group.teacherLabel} ${stemText}`.trim(),
    cleanedText: stemText,
    fileName,
    sourcePageNumber: group.pageNumber,
    sourceSpan: { firstPage: group.pageNumber, lastPage: group.lastPageNumber },
    displayOrder: rootDisplayOrder
  });
  if (group.parts.length === 0) {
    return [rootProblem];
  }
  return [
    rootProblem,
    ...group.parts.map((part) => {
      const partText = normalizeWhitespace(part.textLines.join("\n"));
      const rawText = [
        `${group.teacherLabel} ${stemText}`.trim(),
        `${part.teacherLabel} ${partText}`.trim()
      ].filter(Boolean).join("\n");
      const cleanedText = [stemText, partText].filter(Boolean).join("\n");
      return createProblem({
        problemId: `${group.rootProblemId}${part.partLabel}`,
        rootProblemId: group.rootProblemId,
        parentProblemId: group.rootProblemId,
        problemNumber: group.problemNumber,
        partIndex: part.partIndex,
        partLabel: part.partLabel,
        teacherLabel: part.teacherLabel,
        stemText,
        partText,
        rawText,
        cleanedText,
        fileName,
        sourcePageNumber: part.pageNumber,
        sourceSpan: { firstPage: group.pageNumber, lastPage: group.lastPageNumber },
        displayOrder: group.problemNumber * 1e3 + part.partIndex * 100
      });
    })
  ];
}
function buildLegacyProblem(rawText, cleanedText, fileName, sourcePageNumber) {
  const problemId = `p${sourcePageNumber}-${Math.abs(cleanedText.length)}`;
  const createdAt = new Date().toISOString();
  return {
    problemId,
    localProblemId: problemId,
    problemGroupId: problemId,
    canonicalProblemId: void 0,
    rootProblemId: void 0,
    parentProblemId: null,
    problemNumber: void 0,
    partIndex: 0,
    partLabel: void 0,
    teacherLabel: void 0,
    stemText: void 0,
    partText: void 0,
    displayOrder: void 0,
    createdAt,
    rawText,
    cleanedText,
    mediaUrls: extractMediaUrls(rawText),
    sourceType: "document",
    sourceDocumentId: fileName,
    sourcePageNumber,
    sourceSpan: { firstPage: sourcePageNumber, lastPage: sourcePageNumber }
  };
}
function extractHierarchicalProblems(blocks, fileName) {
  const groups = [];
  let currentGroup = null;
  let currentPart = null;
  let foundTopLevelProblem = false;
  for (const block of blocks) {
    const topLevel = matchTopLevelProblem(block.text);
    if (topLevel) {
      foundTopLevelProblem = true;
      currentPart = null;
      const inlineSubparts2 = splitInlineSubparts(topLevel.body, block.pageNumber);
      currentGroup = {
        problemNumber: topLevel.problemNumber,
        rootProblemId: `p${topLevel.problemNumber}`,
        teacherLabel: `${topLevel.problemNumber}.`,
        pageNumber: block.pageNumber,
        lastPageNumber: block.pageNumber,
        stemLines: inlineSubparts2?.leadingText ? [inlineSubparts2.leadingText] : topLevel.body ? [topLevel.body] : [],
        parts: inlineSubparts2?.parts ?? []
      };
      groups.push(currentGroup);
      currentPart = currentGroup.parts[currentGroup.parts.length - 1] ?? null;
      continue;
    }
    if (!currentGroup) {
      if (looksLikeHeader(block.text, block.role)) {
        continue;
      }
      continue;
    }
    currentGroup.lastPageNumber = Math.max(currentGroup.lastPageNumber, block.pageNumber);
    const inlineSubparts = splitInlineSubparts(block.text, block.pageNumber);
    if (inlineSubparts) {
      if (inlineSubparts.leadingText) {
        if (currentPart) {
          currentPart.textLines.push(inlineSubparts.leadingText);
        } else {
          currentGroup.stemLines.push(inlineSubparts.leadingText);
        }
      }
      currentGroup.parts.push(...inlineSubparts.parts);
      currentPart = currentGroup.parts[currentGroup.parts.length - 1] ?? currentPart;
      continue;
    }
    const subpart = matchSubpart(block.text);
    if (subpart) {
      if (subpart.problemNumber && subpart.problemNumber !== currentGroup.problemNumber) {
        currentPart = null;
        currentGroup = {
          problemNumber: subpart.problemNumber,
          rootProblemId: `p${subpart.problemNumber}`,
          teacherLabel: `${subpart.problemNumber}.`,
          pageNumber: block.pageNumber,
          lastPageNumber: block.pageNumber,
          stemLines: [],
          parts: []
        };
        groups.push(currentGroup);
      }
      currentPart = toProblemPartDraft(subpart, block.pageNumber);
      currentGroup.parts.push(currentPart);
      continue;
    }
    if (currentPart) {
      currentPart.textLines.push(block.text);
    } else {
      currentGroup.stemLines.push(block.text);
    }
  }
  if (!foundTopLevelProblem) {
    return [];
  }
  return groups.flatMap((group) => buildProblemGroupProblems(group, fileName));
}
function extractLegacyProblems(blocks, azureExtract) {
  const problems = [];
  let currentLines = [];
  let currentPageNumber = blocks[0]?.pageNumber ?? 1;
  for (const block of blocks) {
    const isBoundary = block.role === "title" ? false : looksLikeProblemBoundary(block.text);
    if (isBoundary && currentLines.length > 0) {
      const rawText = currentLines.join("\n");
      problems.push(buildLegacyProblem(rawText, normalizeWhitespace(rawText), azureExtract.fileName, currentPageNumber));
      currentLines = [];
    }
    if (currentLines.length === 0) {
      currentPageNumber = block.pageNumber;
    }
    currentLines.push(block.text);
  }
  if (currentLines.length > 0) {
    const rawText = currentLines.join("\n");
    problems.push(buildLegacyProblem(rawText, normalizeWhitespace(rawText), azureExtract.fileName, currentPageNumber));
  }
  return problems;
}
function extractProblems(azureExtract) {
  const blocks = classifyParagraphBlocks(azureExtract).filter((paragraph) => !paragraph.isSuppressed).map((paragraph) => ({
    text: paragraph.text,
    pageNumber: paragraph.pageNumber,
    role: paragraph.role
  }));
  const fallbackText = normalizeWhitespace(blocks.map((block) => block.text).join("\n") || azureExtract.content);
  if (blocks.length === 0) {
    return fallbackText.length > 0 ? [buildLegacyProblem(azureExtract.content, fallbackText, azureExtract.fileName, 1)] : [];
  }
  const hierarchicalProblems = extractHierarchicalProblems(blocks, azureExtract.fileName);
  const problems = hierarchicalProblems.length > 0 ? hierarchicalProblems : extractLegacyProblems(blocks, azureExtract);
  if (problems.length === 0 && fallbackText.length > 0) {
    return [buildLegacyProblem(azureExtract.content, fallbackText, azureExtract.fileName, 1)];
  }
  return problems;
}

// src/prism-v4/semantic/utils/heuristics.ts
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

// src/prism-v4/semantic/utils/representationCues.ts
function hasAnyMatch(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}
function detectRepresentationSignals(args) {
  const normalizedText = args.text.toLowerCase();
  const codeLike = hasAnyMatch(args.text, [
    /\bfor\s*\(/,
    /\bwhile\s*\(/,
    /\bif\s*\(/,
    /\bfunction\b/i,
    /\bdef\b/i,
    /\bclass\b/i,
    /console\.log/,
    /[{}]/
  ]);
  const cues = {
    equation: !codeLike && hasAnyMatch(args.text, [
      /\bsolve for\b/i,
      /\bequation\b/i,
      /\b[fF]\s*\(\s*x\s*\)/,
      /[a-zA-Z]\s*=\s*[^=]/
    ]),
    graph: hasAnyMatch(normalizedText, [
      /\bgraph\b/,
      /\bchart\b/,
      /\bplot\b/,
      /\baxis\b/,
      /\bhistogram\b/,
      /\bscatterplot\b/
    ]),
    table: args.hasExtractedTable === true || hasAnyMatch(normalizedText, [
      /\btable\b/,
      /\brow\b/,
      /\bcolumn\b/
    ]),
    diagram: hasAnyMatch(normalizedText, [
      /\bdiagram\b/,
      /\billustration\b/,
      /\blabeled figure\b/,
      /\bschematic\b/
    ]),
    map: hasAnyMatch(normalizedText, [
      /\bmap\b/,
      /\bregion\b/,
      /\blocation\b/
    ]),
    timeline: hasAnyMatch(normalizedText, [
      /\btimeline\b/,
      /\bsequence of events\b/
    ]),
    experiment: hasAnyMatch(normalizedText, [
      /\bexperiment\b/,
      /\blab\b/,
      /\bvariable\b/,
      /\bhypothesis\b/,
      /\bprocedure\b/
    ]),
    primarySource: hasAnyMatch(normalizedText, [
      /\bpassage\b/,
      /\bexcerpt\b/,
      /\bsource\b/,
      /\bdocument\b/,
      /\bauthor\b/,
      /\bread the passage\b/
    ]),
    codeLike
  };
  const precedence = [
    { name: "table", active: cues.table },
    { name: "graph", active: cues.graph },
    { name: "map", active: cues.map },
    { name: "timeline", active: cues.timeline },
    { name: "experiment", active: cues.experiment },
    { name: "primarySource", active: cues.primarySource },
    { name: "diagram", active: cues.diagram },
    { name: "paragraph", active: cues.codeLike },
    { name: "equation", active: cues.equation }
  ];
  const representation = precedence.find((entry) => entry.active)?.name ?? "paragraph";
  const publicCueCount = Object.entries(cues).filter(([name, active]) => name !== "codeLike" && active).length;
  const representationCount = Math.max(1, publicCueCount + (cues.codeLike ? 1 : 0));
  return {
    representation,
    representationCount,
    cues
  };
}

// src/prism-v4/semantic/extract/extractProblemMetadata.ts
var DIRECTIVE_PATTERNS = [
  /\bsolve\b/gi,
  /\bexplain\b/gi,
  /\bjustify\b/gi,
  /\bcompare\b/gi,
  /\banalyze\b/gi,
  /\bshow\b/gi,
  /\bdescribe\b/gi,
  /\binterpret\b/gi,
  /\bevaluate\b/gi,
  /\bprove\b/gi,
  /\bcalculate\b/gi,
  /\bdetermine\b/gi
];
function countDirectiveMatches(text) {
  return DIRECTIVE_PATTERNS.reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0);
}
function normalizeExtractedMultiStep(steps) {
  return clamp01(0.1 + Math.max(0, steps - 1) * 0.3);
}
function extractProblemMetadata(problems, tablesByProblemId) {
  return problems.map((p) => {
    const text = normalizeWhitespace(p.cleanedText || p.rawText || "");
    const lower = text.toLowerCase();
    const answerChoices = [...text.matchAll(/(?:^|\n)\s*(?:[A-D]|[1-4])[.)]\s+(.+)/gim)].map((match) => normalizeWhitespace(match[1]));
    let problemType = "constructedResponse";
    if (/\btrue\s+or\s+false\b/i.test(text)) {
      problemType = "trueFalse";
    } else if (/\bselect all\b/i.test(text)) {
      problemType = "multipleSelect";
    } else if (answerChoices.length >= 2 || /multiple choice/i.test(text)) {
      problemType = "multipleChoice";
    } else if (/\bfill in the blank\b/i.test(text)) {
      problemType = "fillInBlank";
    } else if (/\bshort answer\b/i.test(text) || text.length < 120) {
      problemType = "shortAnswer";
    }
    const representationSignals = detectRepresentationSignals({
      text,
      hasExtractedTable: (tablesByProblemId[p.problemId] ?? []).length > 0
    });
    const representation = representationSignals.representation;
    const directiveCount = countDirectiveMatches(text);
    const sequentialMarkers = text.match(/\b(?:then|next|after that|finally|using your work|show your work)\b/gi) ?? [];
    const partReferenceBoost = /\bpart\s+[a-z0-9]+\b/gi.test(lower) ? 1 : 0;
    const steps = Math.max(1, Math.min(4, directiveCount + (sequentialMarkers.length > 0 ? 1 : 0) + partReferenceBoost));
    const multiStep = normalizeExtractedMultiStep(steps);
    const abstractionLevel = clamp01((["justify", "analyze", "infer", "evaluate", "generalize"].filter((keyword) => lower.includes(keyword)).length + (representation === "equation" || representation === "graph" ? 1 : 0)) / 6);
    return {
      ...p,
      problemType,
      representation,
      multiStep,
      steps,
      abstractionLevel,
      answerChoices
    };
  });
}

// src/prism-v4/semantic/tag/tagBloom.ts
function tagBloom(problems) {
  const result = {};
  for (const p of problems) {
    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    const scores = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0
    };
    if (/\bdefine\b|\blist\b|\bidentify\b/.test(text))
      scores.remember = 1;
    if (/\bexplain\b|\bsummarize\b|\bdescribe\b/.test(text))
      scores.understand = 1;
    if (/\bsolve\b|\buse\b|\bapply\b/.test(text))
      scores.apply = 1;
    if (/\banalyze\b|\bcompare\b|\bcontrast\b/.test(text))
      scores.analyze = 1;
    if (/\bevaluate\b|\bargue\b|\bjustify\b/.test(text))
      scores.evaluate = 1;
    if (/\bdesign\b|\bcreate\b|\bcompose\b/.test(text))
      scores.create = 1;
    if (Object.values(scores).every((v) => v === 0)) {
      scores.remember = 0.5;
      scores.understand = 0.5;
    }
    result[p.problemId] = scores;
  }
  return result;
}

// src/prism-v4/semantic/tag/tagConcepts.ts
var CONCEPT_RULES = [
  { terms: ["hypothesis", "null", "alternative", "significance"], tag: "math.statistics.hypothesis-testing" },
  { terms: ["p-value", "alpha", "parameter", "statistic"], tag: "math.statistics.decision-rules" },
  { terms: ["simulation", "dotplot", "sampling"], tag: "math.statistics.simulation" },
  { terms: ["proportion", "proportions"], tag: "math.statistics.proportion-test" },
  { terms: ["mean", "means"], tag: "math.statistics.mean-test" },
  { terms: ["type", "false"], tag: "math.statistics.type-errors" },
  { terms: ["fraction", "fractions", "numerator", "denominator"], tag: "math.fractions" },
  { terms: ["equivalent", "equivalent fractions"], tag: "math.equivalent-fractions" },
  { terms: ["decimal", "decimals"], tag: "math.decimals" },
  { terms: ["ratio", "ratios", "proportional"], tag: "math.ratios" },
  { terms: ["equation", "equations", "algebra", "variable", "slope"], tag: "math.algebra" },
  { terms: ["infer", "inference", "evidence", "theme"], tag: "reading.inference" },
  { terms: ["area", "perimeter", "rectangle", "triangle"], tag: "math.geometry" },
  { terms: ["ecosystem", "ecosystems", "producer", "consumer", "decomposer"], tag: "science.ecosystems" },
  { terms: ["cell", "cells", "chloroplast", "photosynthesis"], tag: "science.cells" },
  { terms: ["force", "forces", "motion"], tag: "science.forces" },
  { terms: ["experiment", "hypothesis", "variable"], tag: "science.inquiry" },
  { terms: ["government", "culture", "timeline", "geography", "historical"], tag: "socialstudies.history" },
  { terms: ["source", "author", "document", "speech"], tag: "socialstudies.source-analysis" }
];
function tagConcepts(problems) {
  const result = {};
  for (const p of problems) {
    const text = p.cleanedText || p.rawText || "";
    const lowerText = text.toLowerCase();
    const keywords = extractKeywords(text);
    const conceptScores = {};
    const hasStatisticsSignal = /p-?value|null hypothesis|alternative hypothesis|alpha|α|sample proportion|sample mean|sampling distribution|dotplot|type i|type ii|simulation/.test(lowerText);
    for (const kw of keywords) {
      for (const rule of CONCEPT_RULES) {
        if (hasStatisticsSignal && ["math.decimals", "reading.inference"].includes(rule.tag)) {
          continue;
        }
        if (rule.terms.includes(kw)) {
          conceptScores[rule.tag] = (conceptScores[rule.tag] ?? 0) + 1;
        }
      }
    }
    if (hasStatisticsSignal && /kissing couples|sample proportion|proportion test/.test(lowerText)) {
      conceptScores["math.statistics.proportion-test"] = (conceptScores["math.statistics.proportion-test"] ?? 0) + 2;
    }
    if (hasStatisticsSignal && /restaurant income|construction zone|sample mean|mean test/.test(lowerText)) {
      conceptScores["math.statistics.mean-test"] = (conceptScores["math.statistics.mean-test"] ?? 0) + 2;
    }
    if (Object.keys(conceptScores).length === 0) {
      conceptScores["general.comprehension"] = 1;
    }
    result[p.problemId] = conceptScores;
  }
  return result;
}

// src/prism-v4/semantic/tag/tagLinguisticLoad.ts
function tagLinguisticLoad(problems) {
  const linguisticLoad = {};
  const vocabularyTier = {};
  const sentenceComplexity = {};
  const wordProblem = {};
  const passiveVoice = {};
  const abstractLanguage = {};
  for (const p of problems) {
    const text = p.cleanedText || p.rawText || "";
    const sentences = splitSentences(text);
    const words = text.split(/\s+/).filter(Boolean);
    const avgSentenceLength = sentences.length ? words.length / sentences.length : words.length;
    const avgSyllables = words.length > 0 ? words.reduce((sum, w) => sum + countSyllables(w), 0) / words.length : 1;
    const load = clamp01((avgSentenceLength / 20 + avgSyllables / 3) / 2);
    linguisticLoad[p.problemId] = load;
    vocabularyTier[p.problemId] = avgSyllables < 1.5 ? 1 : avgSyllables < 2.5 ? 2 : 3;
    sentenceComplexity[p.problemId] = clamp01(avgSentenceLength / 25);
    wordProblem[p.problemId] = /\bstory\b|\bword problem\b|\bscenario\b|\bhow many\b|\bhow much\b/i.test(text) ? 1 : 0;
    passiveVoice[p.problemId] = /\bwas\b\s+\w+ed\b|\bwere\b\s+\w+ed\b/i.test(text) ? 0.7 : 0.1;
    abstractLanguage[p.problemId] = /\bjustice\b|\bfreedom\b|\bidea\b|\bconcept\b/i.test(text) ? 0.8 : 0.2;
  }
  return {
    linguisticLoad,
    vocabularyTier,
    sentenceComplexity,
    wordProblem,
    passiveVoice,
    abstractLanguage
  };
}

// src/prism-v4/semantic/tag/tagMisconceptionTriggers.ts
function tagMisconceptionTriggers(problems) {
  const result = {};
  for (const p of problems) {
    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    const triggers = {};
    if (/\bfraction\b|\bfractions\b/.test(text) && /\bgreater\b|\bless\b/.test(text)) {
      triggers["fractionMagnitude"] = 0.8;
    }
    if (/\barea\b/.test(text) && /\bperimeter\b/.test(text)) {
      triggers["areaVsPerimeter"] = 0.9;
    }
    if (/\bnegative\b|\bminus\b/.test(text) && /\bsubtract\b/.test(text)) {
      triggers["integerSubtraction"] = 0.7;
    }
    if (/\binfer\b|\binference\b/.test(text) && /\bevidence\b/.test(text)) {
      triggers["evidenceVsOpinion"] = 0.65;
    }
    result[p.problemId] = triggers;
  }
  return result;
}

// src/prism-v4/semantic/tag/tagRepresentation.ts
function tagRepresentation(problems) {
  const result = {};
  for (const p of problems) {
    if (p.representation) {
      result[p.problemId] = p.representation;
      continue;
    }
    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    if (/\bgraph\b|\bchart\b|\bplot\b/.test(text)) {
      result[p.problemId] = "graph";
    } else if (/\btable\b|\brow\b|\bcolumn\b/.test(text)) {
      result[p.problemId] = "table";
    } else if (/\bdiagram\b|\billustration\b/.test(text)) {
      result[p.problemId] = "diagram";
    } else if (/\bmap\b/.test(text)) {
      result[p.problemId] = "map";
    } else if (/\btimeline\b/.test(text)) {
      result[p.problemId] = "timeline";
    } else if (/\bexperiment\b|\blab\b/.test(text)) {
      result[p.problemId] = "experiment";
    } else if (/\bprimary source\b|\bexcerpt\b/.test(text)) {
      result[p.problemId] = "primarySource";
    } else if (/\bequation\b|\bsolve for\b|\b=\b/.test(text)) {
      result[p.problemId] = "equation";
    } else {
      result[p.problemId] = "paragraph";
    }
  }
  return result;
}

// src/prism-v4/documents/analysis/extractAnchoredProblems.ts
function anchorsForProblem(problem, document) {
  const targetText = normalizeWhitespace(problem.cleanedText ?? problem.rawText);
  const matchingNodes = document.nodes.filter((node) => {
    const nodeText = node.normalizedText ?? normalizeWhitespace(node.text ?? "");
    return nodeText.length > 0 && (targetText.includes(nodeText) || nodeText.includes(targetText));
  });
  if (matchingNodes.length > 0) {
    return matchingNodes.map((node) => ({
      documentId: document.id,
      surfaceId: node.surfaceId,
      nodeId: node.id
    }));
  }
  const instructionalNode = document.nodes.find((node) => {
    const nodeText = node.normalizedText ?? "";
    return nodeText.length > 0 && targetText.toLowerCase().includes(nodeText.toLowerCase().slice(0, Math.min(nodeText.length, 20)));
  });
  return instructionalNode ? [{ documentId: document.id, surfaceId: instructionalNode.surfaceId, nodeId: instructionalNode.id }] : [];
}
function difficultyLabel(score) {
  if (score >= 0.67) {
    return "high";
  }
  if (score >= 0.34) {
    return "medium";
  }
  return "low";
}
function cognitiveDemandLabel(problemText, bloomScores) {
  const lower = problemText.toLowerCase();
  if (/\bmodel\b|\bdesign\b|\breal world\b/.test(lower)) {
    return "modeling";
  }
  if ((bloomScores.analyze ?? 0) >= 1 || (bloomScores.evaluate ?? 0) >= 1) {
    return "analysis";
  }
  if ((bloomScores.understand ?? 0) >= 1 || /\bexplain\b|\bwhy\b|\bjustify\b/.test(lower)) {
    return "conceptual";
  }
  if ((bloomScores.apply ?? 0) >= 1 || /\bsolve\b|\bcalculate\b|\bdetermine\b/.test(lower)) {
    return "procedural";
  }
  return "recall";
}
function clamp012(value) {
  return Math.max(0, Math.min(1, value));
}
function bloomLevelFromScores(scores) {
  const safe = scores ?? {};
  const ladder = [
    { key: "create", level: 6 },
    { key: "evaluate", level: 5 },
    { key: "analyze", level: 4 },
    { key: "apply", level: 3 },
    { key: "understand", level: 2 },
    { key: "remember", level: 1 }
  ];
  for (const entry of ladder) {
    if ((safe[entry.key] ?? 0) > 0) {
      return entry.level;
    }
  }
  return 2;
}
function representationLoadFromLabel(label) {
  const value = (label ?? "paragraph").toLowerCase();
  if (value === "paragraph") {
    return 0.25;
  }
  if (value === "equation" || value === "table") {
    return 0.55;
  }
  if (value === "graph" || value === "diagram" || value === "experiment") {
    return 0.75;
  }
  if (value === "map" || value === "timeline" || value === "primarysource") {
    return 0.65;
  }
  return 0.5;
}
function extractAnchoredProblems(args) {
  const problems = extractProblems(args.azureExtract);
  const metadata = extractProblemMetadata(problems, {});
  const concepts = tagConcepts(metadata);
  const representations = tagRepresentation(metadata);
  const misconceptions = tagMisconceptionTriggers(metadata);
  const bloom = tagBloom(metadata);
  const linguistic = tagLinguisticLoad(metadata);
  const extractedProblems = metadata.map((problem) => {
    const problemAnchors = anchorsForProblem(problem, args.document);
    const instructionalFragments = args.fragments.filter((fragment) => fragment.anchors.some((anchor) => problemAnchors.some((problemAnchor) => problemAnchor.nodeId === anchor.nodeId)));
    const extractionMode = instructionalFragments.some((fragment) => fragment.instructionalRole === "example") ? "inferred" : "authored";
    const bloomScores = bloom[problem.problemId] ?? {};
    const representation = representations[problem.problemId] ?? "paragraph";
    const linguisticLoad = clamp012(linguistic.linguisticLoad[problem.problemId] ?? 0.5);
    const representationLoad = clamp012(representationLoadFromLabel(representation));
    const cognitiveLoad = clamp012(problem.multiStep * 0.5 + problem.abstractionLevel * 0.3 + representationLoad * 0.2);
    const bloomLevel = bloomLevelFromScores(bloomScores);
    const difficultyScore = Math.max(problem.multiStep, problem.abstractionLevel, linguisticLoad);
    return {
      id: problem.problemId,
      documentId: args.document.id,
      problemGroupId: problem.problemGroupId,
      anchors: problemAnchors,
      text: problem.cleanedText ?? problem.rawText,
      extractionMode,
      sourceSpan: problem.sourceSpan,
      concepts: Object.keys(concepts[problem.problemId] ?? {}),
      representations: [representation],
      difficulty: difficultyLabel(difficultyScore),
      misconceptions: Object.keys(misconceptions[problem.problemId] ?? {}),
      cognitiveDemand: cognitiveDemandLabel(problem.cleanedText ?? problem.rawText, bloomScores),
      bloomLevel,
      cognitiveLoad,
      linguisticLoad,
      representationLoad
    };
  });
  return { extractedProblems, sourceProblems: problems };
}

// src/prism-v4/documents/analysis/parseOfficeDocuments.ts
var import_jszip = __toESM(require_lib3());
function stripXmlTags(value) {
  return normalizeWhitespace(value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
}
function createSurface(documentId, index, surfaceType, label) {
  return { id: `${documentId}-surface-${index + 1}`, surfaceType, index, label };
}
function addInlineSentenceNodes(args) {
  let nextOrderIndex = args.startOrderIndex;
  for (const sentence of splitSentences(args.text)) {
    args.nodes.push({
      id: `${args.documentId}-node-${nextOrderIndex}`,
      documentId: args.documentId,
      surfaceId: args.surfaceId,
      nodeType: "inline",
      parentId: args.parentId,
      orderIndex: nextOrderIndex,
      text: sentence,
      normalizedText: sentence
    });
    nextOrderIndex += 1;
  }
  return nextOrderIndex;
}
async function parsePptxToCanonicalDocument(documentId, fileName, mimeType, fileBuffer) {
  const zip = await import_jszip.default.loadAsync(fileBuffer);
  const slidePaths = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((left, right) => Number(left.match(/slide(\d+)/)?.[1] ?? 0) - Number(right.match(/slide(\d+)/)?.[1] ?? 0));
  if (slidePaths.length === 0) {
    throw new Error("PPTX parsing failed: no slide XML found");
  }
  const notePaths = Object.keys(zip.files).filter((path) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path)).sort((left, right) => Number(left.match(/notesSlide(\d+)/)?.[1] ?? 0) - Number(right.match(/notesSlide(\d+)/)?.[1] ?? 0));
  const surfaces = slidePaths.map((_, index) => createSurface(documentId, index, "slide", `Slide ${index + 1}`));
  const nodes = [];
  let orderIndex = 0;
  for (const [index, slidePath] of slidePaths.entries()) {
    const slideXml = await zip.file(slidePath)?.async("string");
    if (!slideXml) {
      continue;
    }
    const surface = surfaces[index];
    const textParagraphs = [...slideXml.matchAll(/<a:p\b([\s\S]*?)>([\s\S]*?)<\/a:p>/g)];
    const picCount = (slideXml.match(/<p:pic\b/g) ?? []).length;
    textParagraphs.forEach((paragraphMatch) => {
      const attrs = paragraphMatch[1] ?? "";
      const body = paragraphMatch[2] ?? "";
      const text = normalizeWhitespace([...body.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) => stripXmlTags(match[1])).join(" "));
      if (!text) {
        return;
      }
      const levelMatch = attrs.match(/lvl="(\d+)"/);
      const nodeType = levelMatch ? "listItem" : "section";
      const nodeId = `${documentId}-node-${orderIndex}`;
      nodes.push({
        id: nodeId,
        documentId,
        surfaceId: surface.id,
        nodeType,
        orderIndex: orderIndex++,
        text,
        normalizedText: text,
        metadata: levelMatch ? { listDepth: Number(levelMatch[1]), styleHint: "pptx-bullet" } : { styleHint: "pptx-textbox" }
      });
      orderIndex = addInlineSentenceNodes({ documentId, surfaceId: surface.id, parentId: nodeId, text, startOrderIndex: orderIndex, nodes });
    });
    for (let picIndex = 0; picIndex < picCount; picIndex += 1) {
      nodes.push({
        id: `${documentId}-node-${orderIndex}`,
        documentId,
        surfaceId: surface.id,
        nodeType: "figure",
        orderIndex: orderIndex++,
        text: `Slide image ${picIndex + 1}`,
        normalizedText: `Slide image ${picIndex + 1}`,
        metadata: { styleHint: "pptx-image" }
      });
    }
    const notesXml = notePaths[index] ? await zip.file(notePaths[index])?.async("string") : null;
    if (notesXml) {
      const notesText = normalizeWhitespace([...notesXml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) => stripXmlTags(match[1])).join(" "));
      if (notesText) {
        const nodeId = `${documentId}-node-${orderIndex}`;
        nodes.push({
          id: nodeId,
          documentId,
          surfaceId: surface.id,
          nodeType: "paragraph",
          orderIndex: orderIndex++,
          text: notesText,
          normalizedText: notesText,
          metadata: { noteSource: "speaker-notes", styleHint: "pptx-notes" }
        });
        orderIndex = addInlineSentenceNodes({ documentId, surfaceId: surface.id, parentId: nodeId, text: notesText, startOrderIndex: orderIndex, nodes });
      }
    }
  }
  return validateCanonicalDocument({
    id: documentId,
    sourceFileName: fileName,
    sourceMimeType: mimeType,
    surfaces,
    nodes,
    createdAt: new Date().toISOString()
  });
}

// src/prism-v4/documents/analysis/analyzeRegisteredDocument.ts
function cleanAzureExtract(extract) {
  return {
    ...extract,
    content: cleanText(extract.content),
    pages: extract.pages.map((page) => ({ ...page, text: cleanText(page.text) })),
    paragraphs: extract.paragraphs?.map((paragraph) => ({ ...paragraph, text: cleanText(paragraph.text) })),
    tables: extract.tables?.map((table) => ({
      ...table,
      cells: table.cells.map((cell) => ({ ...cell, text: cleanText(cell.text) }))
    })),
    readingOrder: extract.readingOrder?.map((entry) => cleanText(entry)).filter(Boolean)
  };
}
async function analyzeRegisteredDocument(args) {
  let azureExtract = args.azureExtract;
  let canonicalDocument = args.canonicalDocument;
  if (!canonicalDocument && !azureExtract && args.rawBinary) {
    if (args.sourceMimeType.includes("pdf")) {
      const rawAzure = await runAzureExtraction(args.rawBinary, "application/pdf");
      const normalizedAzure = normalizeAzureLayout(rawAzure);
      console.log("[ingestion][normalize]", {
        documentId: args.documentId,
        sourceFileName: args.sourceFileName,
        normalizedPages: normalizedAzure.pages.length,
        normalizedParagraphs: normalizedAzure.paragraphs.length,
        normalizedTables: normalizedAzure.tables.length,
        readingOrderEntries: normalizedAzure.readingOrder.length
      });
      azureExtract = cleanAzureExtract(mapAzureToCanonical(normalizedAzure, args.sourceFileName));
      console.log("[ingestion][canonical-azure-extract]", {
        documentId: args.documentId,
        azurePages: azureExtract.pages.length,
        azureParagraphs: azureExtract.paragraphs?.length ?? 0,
        azureTables: azureExtract.tables?.length ?? 0,
        readingOrderEntries: azureExtract.readingOrder?.length ?? 0
      });
      canonicalDocument = canonicalizeAzureExtract(args.documentId, azureExtract);
      console.log("[ingestion][canonical-document]", {
        documentId: args.documentId,
        surfaces: canonicalDocument.surfaces.length,
        nodes: canonicalDocument.nodes.length
      });
    } else if (args.sourceMimeType.includes("presentationml")) {
      canonicalDocument = await parsePptxToCanonicalDocument(args.documentId, args.sourceFileName, args.sourceMimeType, args.rawBinary);
      azureExtract = canonicalDocumentToAzureExtract(canonicalDocument);
    }
  }
  canonicalDocument = validateCanonicalDocument(canonicalDocument ?? (azureExtract ? canonicalizeAzureExtract(args.documentId, {
    ...azureExtract,
    fileName: args.sourceFileName
  }) : {
    id: args.documentId,
    sourceFileName: args.sourceFileName,
    sourceMimeType: args.sourceMimeType,
    surfaces: [{ id: `${args.documentId}-surface-1`, surfaceType: "other", index: 0, label: args.sourceFileName }],
    nodes: [],
    createdAt: new Date().toISOString()
  }));
  const fragments = classifyFragments(canonicalDocument);
  const extractInput = azureExtract ?? canonicalDocumentToAzureExtract(canonicalDocument);
  const { extractedProblems } = extractInput ? extractAnchoredProblems({ document: canonicalDocument, fragments, azureExtract: { ...extractInput, fileName: args.sourceFileName } }) : { extractedProblems: [] };
  const insights = buildAnalyzedDocumentInsights({
    fragments,
    problems: extractedProblems
  });
  const updatedAt = new Date().toISOString();
  const analyzedDocumentBase = {
    document: canonicalDocument,
    fragments,
    problems: extractedProblems,
    insights,
    updatedAt
  };
  const contentHashV1 = await computeContentHashV1(analyzedDocumentBase);
  const contentHashV2 = await computeContentHashV2(analyzedDocumentBase);
  return withPreferredContentHash({
    ...analyzedDocumentBase,
    contentHashV1,
    contentHashV2
  });
}

// src/prism-v4/documents/registry.ts
var documents = /* @__PURE__ */ new Map();
var analyzedDocuments = /* @__PURE__ */ new Map();
var sessions = /* @__PURE__ */ new Map();
var collectionAnalyses = /* @__PURE__ */ new Map();
function now() {
  return new Date().toISOString();
}
function saveRegisteredDocument(record) {
  documents.set(record.documentId, record);
  return record;
}
function getRegisteredDocument(documentId) {
  return documents.get(documentId) ?? null;
}
function saveAnalyzedDocument(analyzedDocument) {
  const normalized = withPreferredContentHash(analyzedDocument);
  analyzedDocuments.set(normalized.document.id, normalized);
  const existing = documents.get(analyzedDocument.document.id);
  if (existing) {
    documents.set(normalized.document.id, {
      ...existing,
      canonicalDocument: normalized.document
    });
  }
  return normalized;
}
function getAnalyzedDocument(documentId) {
  return analyzedDocuments.get(documentId) ?? null;
}
function getAnalyzedDocumentsForSession(sessionId) {
  const session = getDocumentSession(sessionId);
  if (!session) {
    return [];
  }
  return session.documentIds.map((documentId) => getAnalyzedDocument(documentId)).filter((document) => Boolean(document));
}
function upsertDocumentSession(session) {
  const existing = sessions.get(session.sessionId);
  const next = {
    ...session,
    createdAt: existing?.createdAt ?? session.createdAt ?? now(),
    updatedAt: now()
  };
  sessions.set(next.sessionId, next);
  return next;
}
function getDocumentSession(sessionId) {
  return sessions.get(sessionId) ?? null;
}
function getSessionDocuments(sessionId) {
  const session = getDocumentSession(sessionId);
  if (!session) {
    return [];
  }
  return session.documentIds.map((documentId) => getRegisteredDocument(documentId)).filter((document) => Boolean(document));
}
function saveCollectionAnalysis(analysis) {
  collectionAnalyses.set(analysis.sessionId, analysis);
  return analysis;
}
function getCollectionAnalysis(sessionId) {
  return collectionAnalyses.get(sessionId) ?? null;
}
function buildDefaultCollectionAnalysis(sessionId) {
  const session = getDocumentSession(sessionId);
  if (!session) {
    return null;
  }
  const analysis = {
    sessionId,
    documentIds: session.documentIds,
    conceptOverlap: {},
    conceptGaps: [],
    difficultyProgression: {},
    representationProgression: {},
    redundancy: Object.fromEntries(session.documentIds.map((documentId) => [documentId, []])),
    coverageSummary: {
      totalConcepts: 0,
      docsPerConcept: {},
      perDocument: Object.fromEntries(session.documentIds.map((documentId) => [documentId, {
        documentId,
        conceptCount: 0,
        problemCount: 0,
        instructionalDensity: 0,
        representations: [],
        dominantDifficulty: "low"
      }]))
    },
    documentSimilarity: [],
    conceptToDocumentMap: {},
    updatedAt: now()
  };
  return saveCollectionAnalysis(analysis);
}

// src/prism-v4/documents/analysis/buildCollectionAnalysis.ts
var DIFFICULTY_SCORE = {
  low: 1,
  medium: 2,
  high: 3
};
function unique2(values) {
  return [...new Set(values)];
}
function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}
function dominantDifficulty(distribution) {
  return ["high", "medium", "low"].reduce((winner, candidate) => {
    if (distribution[candidate] > distribution[winner]) {
      return candidate;
    }
    return winner;
  }, "low");
}
function buildPairKey(leftDocumentId, rightDocumentId) {
  return [leftDocumentId, rightDocumentId].sort().join("::");
}
function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}
function canonicalDocumentConcepts(analyzed) {
  const scoredConcepts = (analyzed.insights.scoredConcepts ?? []).filter((concept) => !concept.isNoise);
  if (scoredConcepts.length > 0) {
    return scoredConcepts;
  }
  return analyzed.insights.concepts.map((concept) => ({
    concept,
    freqProblems: analyzed.problems.filter((problem) => problem.concepts.includes(concept)).length,
    freqPages: 0,
    freqDocuments: 1,
    semanticDensity: 0,
    multipartPresence: 0,
    crossDocumentRecurrence: 1,
    score: analyzed.insights.conceptFrequencies[concept] ?? 0,
    isNoise: false
  }));
}
function weightedJaccard(left, right) {
  const keys = /* @__PURE__ */ new Set([...left.keys(), ...right.keys()]);
  let numerator = 0;
  let denominator = 0;
  for (const key of keys) {
    const leftValue = left.get(key) ?? 0;
    const rightValue = right.get(key) ?? 0;
    numerator += Math.min(leftValue, rightValue);
    denominator += Math.max(leftValue, rightValue);
  }
  return denominator === 0 ? 0 : round(numerator / denominator, 2);
}
function buildDocumentCollectionAnalysis(sessionId) {
  const session = getDocumentSession(sessionId);
  if (!session) {
    return null;
  }
  const analyzedDocuments2 = getAnalyzedDocumentsForSession(sessionId);
  if (analyzedDocuments2.length === 0) {
    return buildDefaultCollectionAnalysis(sessionId);
  }
  const conceptToDocumentMap = {};
  const conceptCoverage = {};
  const difficultyProgression = {};
  const representationProgression = {};
  const redundancy = Object.fromEntries(session.documentIds.map((documentId) => [documentId, []]));
  const pairSimilarity = /* @__PURE__ */ new Map();
  const perDocument = Object.fromEntries(analyzedDocuments2.map((analyzed) => {
    const documentConcepts = canonicalDocumentConcepts(analyzed);
    return [analyzed.document.id, {
      documentId: analyzed.document.id,
      conceptCount: documentConcepts.length,
      problemCount: analyzed.problems.length,
      instructionalDensity: analyzed.insights.instructionalDensity,
      representations: analyzed.insights.representations,
      dominantDifficulty: dominantDifficulty(analyzed.insights.difficultyDistribution),
      averageConceptScore: documentConcepts.length === 0 ? 0 : round(average(documentConcepts.map((concept) => concept.score)))
    }];
  }));
  for (const analyzed of analyzedDocuments2) {
    const documentConcepts = canonicalDocumentConcepts(analyzed);
    const conceptAliases = /* @__PURE__ */ new Map();
    const conceptGroupIds = /* @__PURE__ */ new Map();
    for (const concept of documentConcepts) {
      conceptAliases.set(concept.concept, concept.concept);
      for (const alias of concept.aliases ?? []) {
        const normalizedAlias = alias.includes(".") ? alias.toLowerCase() : normalizeConceptLabel(alias);
        if (normalizedAlias) {
          conceptAliases.set(normalizedAlias, concept.concept);
        }
      }
    }
    for (const problem of analyzed.problems) {
      const groupId = problem.problemGroupId ?? problem.id;
      for (const rawConcept of problem.concepts) {
        const normalizedConcept = rawConcept.includes(".") ? rawConcept.toLowerCase() : normalizeConceptLabel(rawConcept);
        const canonicalConcept = conceptAliases.get(normalizedConcept) ?? normalizedConcept;
        if (!canonicalConcept) {
          continue;
        }
        const groups = conceptGroupIds.get(canonicalConcept) ?? /* @__PURE__ */ new Set();
        groups.add(groupId);
        conceptGroupIds.set(canonicalConcept, groups);
      }
    }
    for (const concept of documentConcepts) {
      const conceptProblems = analyzed.problems.filter((problem) => problem.concepts.includes(concept));
      const conceptName = concept.concept;
      const conceptProblemsCanonical = analyzed.problems.filter((problem) => problem.concepts.some((rawConcept) => {
        const normalizedConcept = rawConcept.includes(".") ? rawConcept.toLowerCase() : normalizeConceptLabel(rawConcept);
        return (conceptAliases.get(normalizedConcept) ?? normalizedConcept) === conceptName;
      }));
      const representations = unique2(conceptProblems.flatMap((problem) => problem.representations));
      conceptToDocumentMap[conceptName] = unique2([...conceptToDocumentMap[conceptName] ?? [], analyzed.document.id]);
      difficultyProgression[conceptName] = [
        ...difficultyProgression[conceptName] ?? [],
        {
          documentId: analyzed.document.id,
          difficulty: conceptProblemsCanonical.sort((left, right) => DIFFICULTY_SCORE[right.difficulty] - DIFFICULTY_SCORE[left.difficulty])[0]?.difficulty ?? "low",
          problemCount: conceptProblemsCanonical.length,
          averageDifficultyScore: average(conceptProblemsCanonical.map((problem) => DIFFICULTY_SCORE[problem.difficulty]))
        }
      ];
      representationProgression[conceptName] = [
        ...representationProgression[conceptName] ?? [],
        {
          documentId: analyzed.document.id,
          representations,
          fragmentCount: analyzed.fragments.filter((fragment) => fragment.isInstructional).length,
          representationCount: representations.length
        }
      ];
      const existingCoverage = conceptCoverage[conceptName];
      const totalDocuments = session.documentIds.length || 1;
      const nextDocumentIds = unique2([...existingCoverage?.documentIds ?? [], analyzed.document.id]);
      const groupCount = conceptGroupIds.get(conceptName)?.size ?? concept.freqProblems;
      const totalScore = (existingCoverage?.totalScore ?? 0) + concept.score;
      const totalProblems = (existingCoverage?.freqProblems ?? 0) + concept.freqProblems;
      const totalPages = (existingCoverage?.freqPages ?? 0) + concept.freqPages;
      const totalGroups = (existingCoverage?.groupCount ?? 0) + groupCount;
      const averageScore = totalScore / nextDocumentIds.length;
      const averageMultipartPresence = ((existingCoverage?.multipartPresence ?? 0) * ((existingCoverage?.freqDocuments ?? 0) || 0) + concept.multipartPresence) / nextDocumentIds.length;
      const coverageScore = round(nextDocumentIds.length / totalDocuments * averageScore);
      const gapScore = round(Math.max(0, averageScore - Math.min(totalProblems, Math.max(1, nextDocumentIds.length)) * 0.35));
      const overlapStrength = round(coverageScore + Math.max(0, nextDocumentIds.length - 1) * 0.2);
      const redundancyScore = round(nextDocumentIds.length / totalDocuments * Math.max(0.25, averageScore / Math.max(totalProblems, 1)));
      const gap = gapScore >= 0.75 || averageScore >= 1.45 && totalProblems <= Math.max(2, nextDocumentIds.length);
      const noiseCandidate = averageScore < 1.1 && totalProblems >= Math.max(3, nextDocumentIds.length + 1);
      const crossDocumentAnchor = nextDocumentIds.length > 1;
      const stability = round(Math.max(0, coverageScore * 0.7 + overlapStrength * 0.2 + averageMultipartPresence * 0.2 - (gap ? 0.2 : 0)));
      conceptCoverage[conceptName] = {
        concept: conceptName,
        documentIds: nextDocumentIds,
        averageScore: round(averageScore),
        totalScore: round(totalScore),
        coverageScore,
        gapScore,
        freqProblems: totalProblems,
        freqPages: totalPages,
        freqDocuments: nextDocumentIds.length,
        groupCount: totalGroups,
        multipartPresence: round(averageMultipartPresence),
        crossDocumentAnchor,
        gap,
        noiseCandidate,
        stability,
        overlapStrength,
        redundancy: redundancyScore
      };
    }
  }
  for (const concept of Object.keys(difficultyProgression)) {
    difficultyProgression[concept] = difficultyProgression[concept].sort((left, right) => left.averageDifficultyScore - right.averageDifficultyScore || left.documentId.localeCompare(right.documentId));
    representationProgression[concept] = representationProgression[concept].sort((left, right) => left.representationCount - right.representationCount || left.documentId.localeCompare(right.documentId));
  }
  for (const [documentId, snapshot] of Object.entries(perDocument)) {
    snapshot.uniqueConcepts = Object.values(conceptCoverage).filter((coverage) => coverage.documentIds.length === 1 && coverage.documentIds[0] === documentId).map((coverage) => coverage.concept).sort();
    snapshot.anchorConcepts = Object.values(conceptCoverage).filter((coverage) => coverage.crossDocumentAnchor && coverage.documentIds.includes(documentId)).sort((left, right) => right.stability - left.stability || left.concept.localeCompare(right.concept)).map((coverage) => coverage.concept);
  }
  const conceptOverlap = Object.fromEntries(Object.entries(conceptToDocumentMap).filter(([, documentIds]) => documentIds.length >= 2));
  const conceptGaps = Object.values(conceptCoverage).filter((coverage) => coverage.gap || coverage.documentIds.length < session.documentIds.length).sort((left, right) => Number(right.gap) - Number(left.gap) || right.averageScore - left.averageScore || left.concept.localeCompare(right.concept)).map((coverage) => coverage.concept);
  for (const left of analyzedDocuments2) {
    for (const right of analyzedDocuments2) {
      if (left.document.id === right.document.id) {
        continue;
      }
      const leftConceptMap = new Map(canonicalDocumentConcepts(left).map((concept) => [concept.concept, concept.score]));
      const rightConceptMap = new Map(canonicalDocumentConcepts(right).map((concept) => [concept.concept, concept.score]));
      const sharedConcepts = unique2([...leftConceptMap.keys()].filter((concept) => rightConceptMap.has(concept))).sort();
      const similarityScore = weightedJaccard(leftConceptMap, rightConceptMap);
      const sharedProblemCount = left.problems.filter((problem) => problem.concepts.some((concept) => sharedConcepts.includes(concept) || sharedConcepts.includes(normalizeConceptLabel(concept)))).length;
      const redundancyScore = sharedConcepts.length === 0 ? 0 : round(sharedConcepts.reduce((sum, concept) => sum + Math.min(leftConceptMap.get(concept) ?? 0, rightConceptMap.get(concept) ?? 0), 0) / Math.max(1, sharedConcepts.reduce((sum, concept) => sum + Math.max(leftConceptMap.get(concept) ?? 0, rightConceptMap.get(concept) ?? 0), 0)), 2);
      if (sharedConcepts.length > 0) {
        redundancy[left.document.id] = [
          ...redundancy[left.document.id] ?? [],
          {
            otherDocumentId: right.document.id,
            sharedConcepts,
            similarityScore,
            sharedProblemCount,
            overlapStrength: similarityScore,
            redundancyScore
          }
        ];
      }
      const pairKey = buildPairKey(left.document.id, right.document.id);
      if (!pairSimilarity.has(pairKey)) {
        pairSimilarity.set(pairKey, {
          leftDocumentId: left.document.id < right.document.id ? left.document.id : right.document.id,
          rightDocumentId: left.document.id < right.document.id ? right.document.id : left.document.id,
          score: similarityScore,
          sharedConcepts,
          overlapStrength: similarityScore,
          redundancyScore
        });
      }
    }
  }
  return saveCollectionAnalysis({
    sessionId,
    documentIds: session.documentIds,
    conceptOverlap,
    conceptGaps,
    difficultyProgression,
    representationProgression,
    redundancy,
    coverageSummary: {
      totalConcepts: Object.keys(conceptToDocumentMap).length,
      docsPerConcept: Object.fromEntries(Object.entries(conceptToDocumentMap).map(([concept, documentIds]) => [concept, documentIds.length])),
      perDocument,
      conceptCoverage
    },
    documentSimilarity: [...pairSimilarity.values()].sort((left, right) => right.score - left.score || left.leftDocumentId.localeCompare(right.leftDocumentId) || left.rightDocumentId.localeCompare(right.rightDocumentId)),
    conceptToDocumentMap,
    updatedAt: new Date().toISOString()
  });
}

// src/prism-v4/documents/analysis/groupFragments.ts
function normalizeToken(value) {
  return value.trim().toLowerCase();
}
function uniqueSorted(values) {
  return [...new Set(values.map((value) => typeof value === "string" ? value.trim() : "").filter(Boolean))].sort((left, right) => left.localeCompare(right));
}
function average2(values) {
  if (values.length === 0) {
    return 0;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}
function intersectCount(left, right) {
  const rightSet = new Set(right);
  let count = 0;
  for (const value of left) {
    if (rightSet.has(value)) {
      count += 1;
    }
  }
  return count;
}
function parseNodeOrder(nodeId) {
  const matches = [...nodeId.matchAll(/(\d+)/g)];
  const lastMatch = matches.at(-1)?.[1];
  return lastMatch ? Number.parseInt(lastMatch, 10) : Number.MAX_SAFE_INTEGER;
}
function scoreDifficulty(fragment) {
  const scaffoldScore = fragment.scaffoldLevel === "low" ? 0.75 : fragment.scaffoldLevel === "high" ? 0.25 : 0.5;
  const roleScore = fragment.instructionalRole === "problem-stem" || fragment.instructionalRole === "problem-part" ? 0.8 : fragment.instructionalRole === "reflection" ? 0.7 : fragment.instructionalRole === "example" ? 0.35 : fragment.instructionalRole === "objective" ? 0.3 : 0.45;
  return Number((scaffoldScore * 0.6 + roleScore * 0.4).toFixed(2));
}
function scoreLinguisticLoad(fragment, concepts, misconceptions) {
  const contentScore = fragment.contentType === "question" ? 0.7 : fragment.contentType === "table" || fragment.contentType === "graph" || fragment.contentType === "diagram" ? 0.55 : fragment.contentType === "heading" ? 0.15 : 0.35;
  const roleScore = fragment.instructionalRole === "reflection" ? 0.8 : fragment.instructionalRole === "explanation" ? 0.6 : fragment.instructionalRole === "instruction" ? 0.55 : 0.4;
  const semanticScore = Math.min(1, concepts.length * 0.08 + misconceptions.length * 0.12);
  return Number(Math.min(1, contentScore * 0.45 + roleScore * 0.35 + semanticScore * 0.2).toFixed(2));
}
function fragmentSkills(fragment) {
  return uniqueSorted([
    fragment.instructionalRole,
    fragment.contentType,
    fragment.exampleType,
    fragment.scaffoldLevel,
    ...(fragment.semanticTags ?? []).filter((tag) => !["learning-target", "prerequisite", "misconception-trigger", "metadata"].includes(tag))
  ]);
}
function fragmentConcepts(fragment) {
  return uniqueSorted(fragment.prerequisiteConcepts ?? []);
}
function fragmentLearningTargets(fragment) {
  return uniqueSorted([fragment.learningTarget ?? void 0]);
}
function fragmentMisconceptions(fragment) {
  return uniqueSorted(fragment.misconceptionTriggers ?? []);
}
function fragmentSourceSections(fragment) {
  return uniqueSorted(fragment.anchors.map((anchor) => `${anchor.documentId}:${anchor.surfaceId}`));
}
function buildCandidate(fragment) {
  const concepts = fragmentConcepts(fragment);
  const skills = fragmentSkills(fragment);
  const learningTargets = fragmentLearningTargets(fragment);
  const misconceptions = fragmentMisconceptions(fragment);
  const sourceSections = fragmentSourceSections(fragment);
  const firstAnchor = [...fragment.anchors].sort((left, right) => {
    const leftOrder = parseNodeOrder(left.nodeId);
    const rightOrder = parseNodeOrder(right.nodeId);
    if (left.documentId !== right.documentId) {
      return left.documentId.localeCompare(right.documentId);
    }
    if (left.surfaceId !== right.surfaceId) {
      return left.surfaceId.localeCompare(right.surfaceId);
    }
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.nodeId.localeCompare(right.nodeId);
  })[0];
  const primaryDocumentId = firstAnchor?.documentId ?? fragment.documentId;
  const primarySection = firstAnchor ? `${firstAnchor.documentId}:${firstAnchor.surfaceId}` : `${fragment.documentId}:unknown`;
  const firstNodeOrder = firstAnchor ? parseNodeOrder(firstAnchor.nodeId) : Number.MAX_SAFE_INTEGER;
  const anchorOrderKey = `${primaryDocumentId}:${primarySection}:${String(firstNodeOrder).padStart(8, "0")}:${fragment.id}`;
  const dedupeFingerprint = [
    fragment.instructionalRole,
    fragment.contentType,
    fragment.exampleType ?? "",
    fragment.scaffoldLevel ?? "",
    learningTargets.map(normalizeToken).join("|"),
    concepts.map(normalizeToken).join("|"),
    misconceptions.map(normalizeToken).join("|")
  ].join("::");
  return {
    fragment,
    concepts,
    skills,
    learningTargets,
    misconceptions,
    sourceSections,
    difficulty: scoreDifficulty(fragment),
    linguisticLoad: scoreLinguisticLoad(fragment, concepts, misconceptions),
    primarySection,
    primaryDocumentId,
    anchorOrderKey,
    firstNodeOrder,
    dedupeFingerprint
  };
}
function createUnit(candidate) {
  return {
    fragments: [candidate.fragment],
    concepts: new Set(candidate.concepts),
    skills: new Set(candidate.skills),
    learningTargets: new Set(candidate.learningTargets),
    misconceptions: new Set(candidate.misconceptions),
    sourceSections: new Set(candidate.sourceSections),
    difficultyValues: [candidate.difficulty],
    linguisticLoadValues: [candidate.linguisticLoad],
    confidenceValues: [candidate.fragment.confidence],
    dedupeFingerprints: /* @__PURE__ */ new Set([candidate.dedupeFingerprint]),
    primarySection: candidate.primarySection,
    primaryDocumentId: candidate.primaryDocumentId,
    firstNodeOrder: candidate.firstNodeOrder,
    anchorOrderKey: candidate.anchorOrderKey
  };
}
function isDedupableRole(role) {
  return role === "instruction" || role === "example" || role === "explanation" || role === "objective" || role === "note";
}
function hasQuestionTableConflict(candidate, unit) {
  const candidateIsQuestion = candidate.fragment.contentType === "question";
  const candidateIsTable = candidate.fragment.contentType === "table";
  if (!candidateIsQuestion && !candidateIsTable) {
    return false;
  }
  const unitHasQuestion = unit.fragments.some((fragment) => fragment.contentType === "question");
  const unitHasTable = unit.fragments.some((fragment) => fragment.contentType === "table");
  return candidateIsQuestion && unitHasTable || candidateIsTable && unitHasQuestion;
}
function shouldMergeAdjacent(candidate, unit) {
  if (hasQuestionTableConflict(candidate, unit)) {
    return false;
  }
  const lastFragment = unit.fragments.at(-1);
  if (!lastFragment) {
    return false;
  }
  const sameRole = lastFragment.instructionalRole === candidate.fragment.instructionalRole;
  const sameContentType = lastFragment.contentType === candidate.fragment.contentType;
  const sameLearningTarget = candidate.learningTargets.length > 0 && candidate.learningTargets.some((target) => unit.learningTargets.has(target));
  const sameConceptCluster = candidate.concepts.length > 0 && candidate.concepts.some((concept) => unit.concepts.has(concept));
  const difficultyBandGap = Math.abs(average2(unit.difficultyValues) - candidate.difficulty);
  const sameSection = candidate.sourceSections.some((section) => unit.sourceSections.has(section));
  const sameDocument = candidate.primaryDocumentId === unit.primaryDocumentId;
  const isAdjacent = sameDocument && sameSection && Math.abs(candidate.firstNodeOrder - unit.firstNodeOrder) <= 3;
  return sameRole && sameContentType && (sameLearningTarget || sameConceptCluster) && difficultyBandGap <= 0.3 && isAdjacent;
}
function scoreCandidate(candidate, unit) {
  const conceptOverlap = intersectCount(candidate.concepts, unit.concepts);
  const skillOverlap = intersectCount(candidate.skills, unit.skills);
  const targetOverlap = intersectCount(candidate.learningTargets, unit.learningTargets);
  const misconceptionOverlap = intersectCount(candidate.misconceptions, unit.misconceptions);
  const sectionOverlap = intersectCount(candidate.sourceSections, unit.sourceSections);
  const sameDocument = candidate.primaryDocumentId === unit.primaryDocumentId ? 1 : 0;
  const proximity = sameDocument && candidate.primarySection === unit.primarySection && Math.abs(candidate.firstNodeOrder - unit.firstNodeOrder) <= 3 ? 1 : 0;
  const roleContinuity = unit.fragments.some((fragment) => fragment.instructionalRole === candidate.fragment.instructionalRole) ? 1 : 0;
  const contentContinuity = unit.fragments.some((fragment) => fragment.contentType === candidate.fragment.contentType) ? 1 : 0;
  return targetOverlap * 4 + conceptOverlap * 3 + skillOverlap * 2 + misconceptionOverlap * 2 + sectionOverlap + sameDocument + proximity + roleContinuity + contentContinuity;
}
function hasSemanticOverlap(candidate, unit) {
  return intersectCount(candidate.concepts, unit.concepts) > 0 || intersectCount(candidate.learningTargets, unit.learningTargets) > 0 || intersectCount(candidate.misconceptions, unit.misconceptions) > 0;
}
function addCandidate(unit, candidate) {
  const lastCandidate = unit.fragments.length > 0 ? buildCandidate(unit.fragments[unit.fragments.length - 1]) : null;
  const preserveAdjacentFragment = Boolean(lastCandidate && lastCandidate.primaryDocumentId === candidate.primaryDocumentId && lastCandidate.primarySection === candidate.primarySection && Math.abs(lastCandidate.firstNodeOrder - candidate.firstNodeOrder) <= 1);
  const preserveCrossDocumentFragment = Boolean(lastCandidate && lastCandidate.primaryDocumentId !== candidate.primaryDocumentId);
  if (!(isDedupableRole(candidate.fragment.instructionalRole) && unit.dedupeFingerprints.has(candidate.dedupeFingerprint) && !preserveAdjacentFragment && !preserveCrossDocumentFragment)) {
    unit.fragments.push(candidate.fragment);
  }
  for (const concept of candidate.concepts) {
    unit.concepts.add(concept);
  }
  for (const skill of candidate.skills) {
    unit.skills.add(skill);
  }
  for (const target of candidate.learningTargets) {
    unit.learningTargets.add(target);
  }
  for (const misconception of candidate.misconceptions) {
    unit.misconceptions.add(misconception);
  }
  for (const sourceSection of candidate.sourceSections) {
    unit.sourceSections.add(sourceSection);
  }
  unit.difficultyValues.push(candidate.difficulty);
  unit.linguisticLoadValues.push(candidate.linguisticLoad);
  unit.confidenceValues.push(candidate.fragment.confidence);
  unit.dedupeFingerprints.add(candidate.dedupeFingerprint);
  if (candidate.anchorOrderKey.localeCompare(unit.anchorOrderKey) < 0) {
    unit.primarySection = candidate.primarySection;
    unit.primaryDocumentId = candidate.primaryDocumentId;
    unit.firstNodeOrder = candidate.firstNodeOrder;
    unit.anchorOrderKey = candidate.anchorOrderKey;
  }
  unit.fragments.sort((left, right) => buildCandidate(left).anchorOrderKey.localeCompare(buildCandidate(right).anchorOrderKey));
}
function hashStable(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
function toInstructionalUnit(unit) {
  const sortedFragments = [...unit.fragments].sort((left, right) => buildCandidate(left).anchorOrderKey.localeCompare(buildCandidate(right).anchorOrderKey));
  const concepts = uniqueSorted([...unit.concepts, ...sortedFragments.flatMap((fragment) => fragmentConcepts(fragment))]);
  const learningTargets = [...unit.learningTargets].sort((left, right) => left.localeCompare(right));
  const skills = [...unit.skills].sort((left, right) => left.localeCompare(right));
  const misconceptions = [...unit.misconceptions].sort((left, right) => left.localeCompare(right));
  const sourceSections = [...unit.sourceSections].sort((left, right) => left.localeCompare(right));
  const idSource = sortedFragments.map((fragment) => fragment.id).join("|");
  const title = learningTargets[0] ?? (concepts.length > 0 ? `Instructional Unit: ${concepts.slice(0, 2).join(", ")}` : void 0);
  return {
    unitId: `unit-${hashStable(idSource)}`,
    fragments: sortedFragments,
    concepts,
    skills,
    learningTargets,
    misconceptions,
    difficulty: average2(unit.difficultyValues),
    linguisticLoad: average2(unit.linguisticLoadValues),
    sourceSections,
    confidence: average2(unit.confidenceValues),
    title
  };
}
function groupFragments(fragments) {
  const candidates = fragments.map((fragment) => buildCandidate(fragment)).sort((left, right) => left.anchorOrderKey.localeCompare(right.anchorOrderKey));
  const units = [];
  for (const candidate of candidates) {
    let bestUnit = null;
    let bestScore = 0;
    for (const unit of units) {
      if (hasQuestionTableConflict(candidate, unit)) {
        continue;
      }
      const score = scoreCandidate(candidate, unit);
      if (score > bestScore) {
        bestScore = score;
        bestUnit = unit;
      }
    }
    if (bestUnit && (shouldMergeAdjacent(candidate, bestUnit) || bestScore >= 6 && hasSemanticOverlap(candidate, bestUnit))) {
      addCandidate(bestUnit, candidate);
      continue;
    }
    units.push(createUnit(candidate));
  }
  return units.map((unit) => toInstructionalUnit(unit)).sort((left, right) => {
    const leftKey = left.fragments.map((fragment) => buildCandidate(fragment).anchorOrderKey)[0] ?? left.unitId;
    const rightKey = right.fragments.map((fragment) => buildCandidate(fragment).anchorOrderKey)[0] ?? right.unitId;
    return leftKey.localeCompare(rightKey) || left.unitId.localeCompare(right.unitId);
  });
}

// lib/supabase.ts
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }
  return { url, key };
}
async function supabaseRest(table, options = {}) {
  const { url, key } = supabaseAdmin();
  const {
    method = "GET",
    select,
    filters = {},
    body,
    prefer
  } = options;
  const reqUrl = new URL(`${url}/rest/v1/${table}`);
  if (select)
    reqUrl.searchParams.set("select", select);
  for (const [k, v] of Object.entries(filters)) {
    reqUrl.searchParams.set(k, v);
  }
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  if (prefer)
    headers["Prefer"] = prefer;
  const res = await fetch(reqUrl.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase REST ${method} ${table} failed (${res.status}): ${text}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}

// src/prism-v4/teacherFeedback/overrideKeys.ts
var INSTRUCTIONAL_UNIT_OVERRIDE_NAMESPACE = "instructional-unit";
function buildInstructionalUnitOverrideId(sessionId, unitId) {
  return `${sessionId}::${INSTRUCTIONAL_UNIT_OVERRIDE_NAMESPACE}::${unitId}`;
}

// src/prism-v4/semantic/cognitive/templates/loadTemplates.ts
var import_templates = __toESM(require_templates());
function loadSeededTemplates() {
  return import_templates.default;
}

// src/prism-v4/semantic/cognitive/templates/loadTeacherTemplates.ts
var SYSTEM_TEMPLATE_IDS = new Set(loadSeededTemplates().map((template) => template.id));

// src/prism-v4/semantic/learning/learningService.ts
var ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;

// src/prism-v4/teacherFeedback/store.ts
var overrideMemory = /* @__PURE__ */ new Map();
function canUseSupabase() {
  return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}
async function readJsonIfAvailable(response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<")) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
async function getProblemOverride(canonicalProblemId) {
  if (typeof window !== "undefined") {
    const response = await fetch(`/api/v4/problem-overrides/${encodeURIComponent(canonicalProblemId)}`);
    if (!response.ok) {
      return null;
    }
    const payload = await readJsonIfAvailable(response);
    if (!payload) {
      return null;
    }
    return payload.overrides ?? null;
  }
  if (canUseSupabase()) {
    const rows = await supabaseRest("problem_overrides", {
      select: "canonical_problem_id,overrides,updated_at",
      filters: { canonical_problem_id: `eq.${canonicalProblemId}` }
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    return row?.overrides ?? null;
  }
  return overrideMemory.get(canonicalProblemId) ?? null;
}

// src/prism-v4/documents/registryStore.ts
var SESSIONS_TABLE = "prism_v4_sessions";
var DOCUMENTS_TABLE = "prism_v4_documents";
var ANALYZED_DOCUMENTS_TABLE = "prism_v4_analyzed_documents";
var COLLECTION_ANALYSES_TABLE = "prism_v4_collection_analyses";
var SESSION_SNAPSHOTS_TABLE = "prism_v4_session_snapshots";
var prismSessionContextCache = /* @__PURE__ */ new Map();
var prismSessionSnapshotStore = /* @__PURE__ */ new Map();
var staleCollectionAnalysisSessions = /* @__PURE__ */ new Set();
var prismSessionSnapshotsSupported = true;
function canUseSupabase2() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return false;
  }
  if (!/^https?:\/\//i.test(url)) {
    return false;
  }
  return typeof window === "undefined";
}
function isMissingSnapshotTableError(error) {
  const message = String(error instanceof Error ? error.message : error).toLowerCase();
  return message.includes("pgrst205") || message.includes("schema cache") && message.includes(SESSION_SNAPSHOTS_TABLE) || message.includes(`could not find the table 'public.${SESSION_SNAPSHOTS_TABLE}'`) || message.includes("42703") || message.includes("23502") && message.includes(SESSION_SNAPSHOTS_TABLE);
}
function disablePersistedSnapshots(error) {
  if (!isMissingSnapshotTableError(error)) {
    throw error;
  }
  if (prismSessionSnapshotsSupported) {
    console.warn(`[registryStore] ${SESSION_SNAPSHOTS_TABLE} missing in Supabase schema cache; falling back to in-memory snapshots. Run supabase/prism_v4_session_snapshots_migration.sql and reload PostgREST schema cache.`);
  }
  prismSessionSnapshotsSupported = false;
}
function now2() {
  return new Date().toISOString();
}
function hasSameDocumentIds(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  const leftSet = new Set(left);
  return right.every((value) => leftSet.has(value));
}
function shouldRebuildCollectionAnalysis(session, analyzedDocuments2, analysis) {
  if (staleCollectionAnalysisSessions.has(session.sessionId)) {
    return true;
  }
  if (!analysis) {
    return true;
  }
  if (!hasSameDocumentIds(session.documentIds, analysis.documentIds)) {
    return true;
  }
  return analyzedDocuments2.some((document) => document.updatedAt > analysis.updatedAt);
}
function invalidatePrismSessionContext(sessionId) {
  if (!sessionId) {
    return;
  }
  prismSessionContextCache.delete(sessionId);
}
function markCollectionAnalysisStale(sessionId) {
  if (!sessionId) {
    return;
  }
  staleCollectionAnalysisSessions.add(sessionId);
}
function clearCollectionAnalysisStale(sessionId) {
  if (!sessionId) {
    return;
  }
  staleCollectionAnalysisSessions.delete(sessionId);
}
function fromSessionRow(row) {
  return {
    sessionId: row.session_id,
    documentIds: row.document_ids ?? [],
    documentRoles: row.document_roles ?? {},
    sessionRoles: row.session_roles ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function fromDocumentRow(row) {
  return {
    documentId: row.document_id,
    sourceFileName: row.source_file_name,
    sourceMimeType: row.source_mime_type,
    createdAt: row.created_at,
    rawBinary: row.raw_binary_base64 ? Buffer.from(row.raw_binary_base64, "base64") : void 0,
    canonicalDocument: row.canonical_document ?? void 0,
    azureExtract: row.azure_extract ?? void 0
  };
}
function serializePrismSessionContext(context) {
  return {
    session: context.session,
    registeredDocuments: context.registeredDocuments.map((document) => ({
      documentId: document.documentId,
      sourceFileName: document.sourceFileName,
      sourceMimeType: document.sourceMimeType,
      createdAt: document.createdAt,
      canonicalDocument: document.canonicalDocument,
      azureExtract: document.azureExtract
    })),
    analyzedDocuments: context.analyzedDocuments,
    collectionAnalysis: context.collectionAnalysis,
    sourceFileNames: context.sourceFileNames
  };
}
function buildBasePrismSessionContext(baseContext) {
  return {
    session: baseContext.session,
    registeredDocuments: baseContext.registeredDocuments.map((document) => ({ ...document })),
    analyzedDocuments: baseContext.analyzedDocuments,
    collectionAnalysis: baseContext.collectionAnalysis,
    sourceFileNames: baseContext.sourceFileNames,
    groupedUnits: groupFragments(baseContext.analyzedDocuments.flatMap((document) => document.fragments))
  };
}
function restorePrismSessionContext(snapshotContext) {
  return buildBasePrismSessionContext(snapshotContext);
}
function toInstructionalUnitConcepts(concepts) {
  return Object.entries(concepts).filter(([, weight]) => typeof weight === "number" && Number.isFinite(weight) && weight > 0).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([concept]) => concept);
}
function deriveInstructionalUnitTitle(unit, concepts) {
  const learningTargetTitle = unit.learningTargets[0]?.trim();
  if (learningTargetTitle) {
    return learningTargetTitle;
  }
  if (concepts.length === 0) {
    return void 0;
  }
  return `Instructional Unit: ${concepts.slice(0, 2).join(", ")}`;
}
async function applyInstructionalUnitOverrides(context) {
  if (context.groupedUnits.length === 0) {
    return context;
  }
  const groupedUnits = await Promise.all(context.groupedUnits.map(async (unit) => {
    const override = await getProblemOverride(buildInstructionalUnitOverrideId(context.session.sessionId, unit.unitId));
    if (!override || !Object.prototype.hasOwnProperty.call(override, "concepts") || !override.concepts) {
      return unit;
    }
    const concepts = toInstructionalUnitConcepts(override.concepts);
    return {
      ...unit,
      concepts,
      title: deriveInstructionalUnitTitle(unit, concepts)
    };
  }));
  return {
    ...context,
    groupedUnits
  };
}
function applyPrismSessionContextToRegistry(context) {
  upsertDocumentSession({
    sessionId: context.session.sessionId,
    documentIds: context.session.documentIds,
    documentRoles: context.session.documentRoles,
    sessionRoles: context.session.sessionRoles,
    createdAt: context.session.createdAt
  });
  for (const document of context.registeredDocuments) {
    const existing = getRegisteredDocument(document.documentId);
    saveRegisteredDocument({
      ...existing,
      ...document
    });
  }
  for (const analyzedDocument of context.analyzedDocuments) {
    saveAnalyzedDocument(analyzedDocument);
  }
  saveCollectionAnalysis(context.collectionAnalysis);
  clearCollectionAnalysisStale(context.session.sessionId);
}
function fromSessionSnapshotRow(row) {
  return {
    sessionId: row.session_id,
    context: row.snapshot_json,
    createdAt: row.created_at
  };
}
async function savePrismSessionSnapshot(sessionId, context) {
  const snapshot = {
    sessionId,
    context: serializePrismSessionContext(context),
    createdAt: now2()
  };
  if (!canUseSupabase2()) {
    prismSessionSnapshotStore.set(sessionId, snapshot);
    return snapshot;
  }
  if (!prismSessionSnapshotsSupported) {
    prismSessionSnapshotStore.set(sessionId, snapshot);
    return snapshot;
  }
  try {
    await supabaseRest(SESSION_SNAPSHOTS_TABLE, {
      method: "POST",
      body: {
        session_id: snapshot.sessionId,
        snapshot_json: snapshot.context,
        created_at: snapshot.createdAt
      },
      prefer: "resolution=merge-duplicates,return=minimal"
    });
  } catch (error) {
    disablePersistedSnapshots(error);
    prismSessionSnapshotStore.set(sessionId, snapshot);
  }
  return snapshot;
}
async function loadPrismSessionSnapshot(sessionId) {
  if (!canUseSupabase2()) {
    return prismSessionSnapshotStore.get(sessionId) ?? null;
  }
  if (!prismSessionSnapshotsSupported) {
    return prismSessionSnapshotStore.get(sessionId) ?? null;
  }
  try {
    const rows = await supabaseRest(SESSION_SNAPSHOTS_TABLE, {
      select: "session_id,snapshot_json,created_at",
      filters: { session_id: `eq.${sessionId}` }
    });
    const row = Array.isArray(rows) ? rows[0] : void 0;
    return row ? fromSessionSnapshotRow(row) : null;
  } catch (error) {
    disablePersistedSnapshots(error);
    return prismSessionSnapshotStore.get(sessionId) ?? null;
  }
}
async function invalidatePrismSessionSnapshot(sessionId) {
  if (!sessionId) {
    return;
  }
  prismSessionSnapshotStore.delete(sessionId);
  if (!canUseSupabase2()) {
    return;
  }
  if (!prismSessionSnapshotsSupported) {
    return;
  }
  try {
    await supabaseRest(SESSION_SNAPSHOTS_TABLE, {
      method: "DELETE",
      filters: { session_id: `eq.${sessionId}` },
      prefer: "return=minimal"
    });
  } catch (error) {
    disablePersistedSnapshots(error);
  }
}
async function getDocumentSessionStore(sessionId) {
  if (!canUseSupabase2()) {
    return getDocumentSession(sessionId);
  }
  const rows = await supabaseRest(SESSIONS_TABLE, {
    select: "session_id,document_ids,document_roles,session_roles,created_at,updated_at",
    filters: { session_id: `eq.${sessionId}` }
  });
  const row = Array.isArray(rows) ? rows[0] : void 0;
  return row ? fromSessionRow(row) : null;
}
async function loadRegisteredDocumentStore(documentId) {
  if (!canUseSupabase2()) {
    return getRegisteredDocument(documentId);
  }
  const rows = await supabaseRest(DOCUMENTS_TABLE, {
    select: "document_id,session_id,source_file_name,source_mime_type,created_at,raw_binary_base64,canonical_document,azure_extract",
    filters: { document_id: `eq.${documentId}` }
  });
  const row = Array.isArray(rows) ? rows[0] : void 0;
  return row ? fromDocumentRow(row) : null;
}
async function loadDocumentSessionIdStore(documentId) {
  if (!canUseSupabase2()) {
    return null;
  }
  const rows = await supabaseRest(DOCUMENTS_TABLE, {
    select: "document_id,session_id",
    filters: { document_id: `eq.${documentId}` }
  });
  const row = Array.isArray(rows) ? rows[0] : void 0;
  return row?.session_id ?? null;
}
async function getSessionDocumentsStore(sessionId) {
  if (!canUseSupabase2()) {
    return getSessionDocuments(sessionId);
  }
  const rows = await supabaseRest(DOCUMENTS_TABLE, {
    select: "document_id,session_id,source_file_name,source_mime_type,created_at,raw_binary_base64,canonical_document,azure_extract",
    filters: { session_id: `eq.${sessionId}`, order: "created_at.asc" }
  });
  return (rows ?? []).map((row) => fromDocumentRow(row));
}
async function loadAnalyzedDocumentStore(documentId) {
  if (!canUseSupabase2()) {
    const analyzed = getAnalyzedDocument(documentId);
    return analyzed ? withPreferredContentHash(analyzed) : null;
  }
  const rows = await supabaseRest(ANALYZED_DOCUMENTS_TABLE, {
    select: "document_id,session_id,analyzed_document,updated_at",
    filters: { document_id: `eq.${documentId}` }
  });
  const row = Array.isArray(rows) ? rows[0] : void 0;
  return row?.analyzed_document ? withPreferredContentHash(row.analyzed_document) : null;
}
async function loadPrismDocumentAnalysisTarget(documentId, sessionId) {
  const resolvedSessionId = sessionId ?? await loadDocumentSessionIdStore(documentId);
  if (resolvedSessionId) {
    const context = await loadPrismSessionContextCached(resolvedSessionId);
    if (context) {
      const registeredDocument2 = context.registeredDocuments.find((document) => document.documentId === documentId) ?? null;
      if (registeredDocument2) {
        const analyzedDocument = context.analyzedDocuments.find((document) => document.document.id === documentId) ?? null;
        return {
          sessionId: resolvedSessionId,
          registeredDocument: registeredDocument2,
          analyzedDocument
        };
      }
    }
    const fallbackSessionId = await loadDocumentSessionIdStore(documentId);
    if (fallbackSessionId && fallbackSessionId !== resolvedSessionId) {
      const fallbackContext = await loadPrismSessionContextCached(fallbackSessionId);
      if (fallbackContext) {
        const registeredDocument2 = fallbackContext.registeredDocuments.find((document) => document.documentId === documentId) ?? null;
        if (registeredDocument2) {
          const analyzedDocument = fallbackContext.analyzedDocuments.find((document) => document.document.id === documentId) ?? null;
          return {
            sessionId: fallbackSessionId,
            registeredDocument: registeredDocument2,
            analyzedDocument
          };
        }
      }
    }
  }
  const registeredDocument = await loadRegisteredDocumentStore(documentId);
  if (!registeredDocument) {
    return null;
  }
  return {
    sessionId: null,
    registeredDocument,
    analyzedDocument: await loadAnalyzedDocumentStore(documentId)
  };
}
async function getAnalyzedDocumentsForSessionStore(sessionId) {
  if (!canUseSupabase2()) {
    return getAnalyzedDocumentsForSession(sessionId).map((document) => withPreferredContentHash(document));
  }
  const rows = await supabaseRest(ANALYZED_DOCUMENTS_TABLE, {
    select: "document_id,session_id,analyzed_document,updated_at",
    filters: { session_id: `eq.${sessionId}`, order: "updated_at.asc" }
  });
  return (rows ?? []).map((row) => withPreferredContentHash(row.analyzed_document));
}
async function saveAnalyzedDocumentStore(analyzedDocument, sessionId, options = {}) {
  const invalidateSessionCache = options.invalidateSessionCache ?? true;
  const invalidateSnapshot = options.invalidateSnapshot ?? true;
  const normalized = withPreferredContentHash(analyzedDocument);
  if (!canUseSupabase2()) {
    const saved = saveAnalyzedDocument(normalized);
    markCollectionAnalysisStale(sessionId);
    if (invalidateSessionCache) {
      invalidatePrismSessionContext(sessionId);
    }
    if (invalidateSnapshot) {
      await invalidatePrismSessionSnapshot(sessionId);
    }
    return saved;
  }
  await supabaseRest(ANALYZED_DOCUMENTS_TABLE, {
    method: "POST",
    body: {
      document_id: normalized.document.id,
      session_id: sessionId,
      analyzed_document: normalized,
      updated_at: normalized.updatedAt
    },
    prefer: "resolution=merge-duplicates,return=minimal"
  });
  await supabaseRest(DOCUMENTS_TABLE, {
    method: "PATCH",
    filters: { document_id: `eq.${normalized.document.id}` },
    body: {
      canonical_document: normalized.document,
      azure_extract: canonicalDocumentToAzureExtract(normalized.document)
    },
    prefer: "return=minimal"
  });
  markCollectionAnalysisStale(sessionId);
  if (invalidateSessionCache) {
    invalidatePrismSessionContext(sessionId);
  }
  if (invalidateSnapshot) {
    await invalidatePrismSessionSnapshot(sessionId);
  }
  return normalized;
}
async function saveCollectionAnalysisStore(analysis, options = {}) {
  const invalidateSessionCache = options.invalidateSessionCache ?? true;
  const invalidateSnapshot = options.invalidateSnapshot ?? true;
  if (!canUseSupabase2()) {
    const saved = saveCollectionAnalysis(analysis);
    clearCollectionAnalysisStale(analysis.sessionId);
    if (invalidateSessionCache) {
      invalidatePrismSessionContext(analysis.sessionId);
    }
    if (invalidateSnapshot) {
      await invalidatePrismSessionSnapshot(analysis.sessionId);
    }
    return saved;
  }
  await supabaseRest(COLLECTION_ANALYSES_TABLE, {
    method: "POST",
    body: {
      session_id: analysis.sessionId,
      analysis,
      updated_at: analysis.updatedAt
    },
    prefer: "resolution=merge-duplicates,return=minimal"
  });
  clearCollectionAnalysisStale(analysis.sessionId);
  if (invalidateSessionCache) {
    invalidatePrismSessionContext(analysis.sessionId);
  }
  if (invalidateSnapshot) {
    await invalidatePrismSessionSnapshot(analysis.sessionId);
  }
  return analysis;
}
async function getCollectionAnalysisStore(sessionId) {
  if (!canUseSupabase2()) {
    return null;
  }
  const rows = await supabaseRest(COLLECTION_ANALYSES_TABLE, {
    select: "session_id,analysis,updated_at",
    filters: { session_id: `eq.${sessionId}` }
  });
  const row = Array.isArray(rows) ? rows[0] : void 0;
  return row?.analysis ?? null;
}
async function loadBasePrismSessionContext(sessionId) {
  const start = Date.now();
  const session = await getDocumentSessionStore(sessionId);
  if (!session) {
    return null;
  }
  const [registeredDocuments, storedAnalyzedDocuments, storedCollectionAnalysis] = await Promise.all([
    getSessionDocumentsStore(sessionId),
    getAnalyzedDocumentsForSessionStore(sessionId),
    getCollectionAnalysisStore(sessionId)
  ]);
  upsertDocumentSession({
    sessionId: session.sessionId,
    documentIds: session.documentIds,
    documentRoles: session.documentRoles,
    sessionRoles: session.sessionRoles,
    createdAt: session.createdAt
  });
  for (const document of registeredDocuments) {
    saveRegisteredDocument(document);
  }
  for (const analyzedDocument of storedAnalyzedDocuments) {
    saveAnalyzedDocument(analyzedDocument);
  }
  const analyzedDocumentsById = new Map(storedAnalyzedDocuments.map((analyzedDocument) => [analyzedDocument.document.id, analyzedDocument]));
  const missingDocuments = registeredDocuments.filter((document) => !analyzedDocumentsById.has(document.documentId));
  const analyzedDocuments2 = [...storedAnalyzedDocuments];
  if (missingDocuments.length > 0) {
    const generatedAnalyses = await Promise.all(missingDocuments.map(async (document) => {
      const analyzedDocument = await analyzeRegisteredDocument({
        documentId: document.documentId,
        sourceFileName: document.sourceFileName,
        sourceMimeType: document.sourceMimeType,
        rawBinary: document.rawBinary,
        azureExtract: document.azureExtract,
        canonicalDocument: document.canonicalDocument
      });
      const saved = saveAnalyzedDocument(analyzedDocument);
      await saveAnalyzedDocumentStore(saved, sessionId, { invalidateSessionCache: false, invalidateSnapshot: false });
      return saved;
    }));
    analyzedDocuments2.push(...generatedAnalyses);
  }
  const existingCollectionAnalysis = storedCollectionAnalysis ?? getCollectionAnalysis(sessionId);
  let collectionAnalysis = shouldRebuildCollectionAnalysis(session, analyzedDocuments2, existingCollectionAnalysis) ? buildDocumentCollectionAnalysis(sessionId) ?? buildDefaultCollectionAnalysis(sessionId) : existingCollectionAnalysis;
  if (!collectionAnalysis) {
    throw new Error(`Collection analysis could not be built for session ${sessionId}`);
  }
  if (!existingCollectionAnalysis || existingCollectionAnalysis.updatedAt !== collectionAnalysis.updatedAt) {
    collectionAnalysis = await saveCollectionAnalysisStore(collectionAnalysis, { invalidateSessionCache: false, invalidateSnapshot: false });
  } else {
    clearCollectionAnalysisStale(sessionId);
  }
  const sourceFileNames = Object.fromEntries(registeredDocuments.map((document) => [document.documentId, document.sourceFileName]));
  console.log("loadPrismSessionContext", {
    sessionId,
    duration: Date.now() - start,
    docCount: registeredDocuments.length,
    analyzedCount: analyzedDocuments2.length,
    conceptCount: Object.keys(collectionAnalysis.conceptToDocumentMap).length
  });
  return buildBasePrismSessionContext({
    session,
    registeredDocuments,
    analyzedDocuments: analyzedDocuments2,
    collectionAnalysis,
    sourceFileNames
  });
}
function loadPrismSessionContextCached(sessionId) {
  if (!prismSessionContextCache.has(sessionId)) {
    prismSessionContextCache.set(sessionId, (async () => {
      const snapshot = await loadPrismSessionSnapshot(sessionId);
      if (snapshot) {
        const context2 = restorePrismSessionContext(snapshot.context);
        applyPrismSessionContextToRegistry(context2);
        return context2;
      }
      const context = await loadBasePrismSessionContext(sessionId);
      if (context) {
        await savePrismSessionSnapshot(sessionId, context);
      }
      return context;
    })());
  }
  return prismSessionContextCache.get(sessionId).then((context) => {
    if (!context) {
      return null;
    }
    return applyInstructionalUnitOverrides(context);
  });
}

// api/v4/documents/analyze.ts
var runtime = "nodejs";
function parseBody(body) {
  if (typeof body !== "string") {
    return body;
  }
  return JSON.parse(body);
}
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const payload = parseBody(req.body ?? {});
    if (!payload.documentId) {
      return res.status(400).json({ error: "documentId is required" });
    }
    const analysisTarget = await loadPrismDocumentAnalysisTarget(payload.documentId, payload.sessionId ?? null);
    if (!analysisTarget) {
      return res.status(404).json({ error: "Document not found" });
    }
    let analyzedDocument = analysisTarget.analyzedDocument;
    if (!analyzedDocument) {
      analyzedDocument = await analyzeRegisteredDocument({
        documentId: analysisTarget.registeredDocument.documentId,
        sourceFileName: analysisTarget.registeredDocument.sourceFileName,
        sourceMimeType: analysisTarget.registeredDocument.sourceMimeType,
        rawBinary: analysisTarget.registeredDocument.rawBinary,
        azureExtract: analysisTarget.registeredDocument.azureExtract,
        canonicalDocument: analysisTarget.registeredDocument.canonicalDocument
      });
      await saveAnalyzedDocumentStore(analyzedDocument, analysisTarget.sessionId);
    }
    return res.status(200).json({
      documentId: payload.documentId,
      status: analyzedDocument.problems.length > 0 || analyzedDocument.fragments.length > 0 ? "ready" : "registered",
      analyzedDocument
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Analyze route failed" });
  }
}
export {
  handler as default,
  runtime
};
