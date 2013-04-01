var is_browser = (typeof(self) !== "undefined" || typeof(window) !== "undefined");
var FS;
this['Module'] = {
  'noInitialRun': is_browser,
};
var Module = this['Module'];
if(is_browser) {
  Module['print'] = function(a) { self['postMessage'](JSON.stringify({'cmd': 'stdout', 'contents': a})); }
  Module['printErr'] = function(a) { self['postMessage'](JSON.stringify({'cmd': 'stderr', 'contents': a})); }
}
Module['preInit'] = function() {
  Module['FS_root'] = function() {
    return FS.root.contents;
  }
};
var addUrl = function(id, real_url, pseudo_path, pseudo_name) {
  var xhr = new XMLHttpRequest;
  xhr.onload = function(ev) {
    if(xhr.readyState == 4){
      var byteArray = new Uint8Array(xhr['response']);
      Module['FS_createDataFile'](pseudo_path, pseudo_name, byteArray, true, true);
      self.postMessage(JSON.stringify({'id': id}));
    }
  };
  xhr.open("GET", real_url, true);
  xhr.responseType = "arraybuffer"; 
  xhr.send(null);
};
var addData = function(id, data, pseudo_path, pseudo_name) {
  Module['FS_createDataFile'](pseudo_path, pseudo_name, data, true, true);
  self.postMessage(JSON.stringify({'id': id}));
};
var mkdir = function(id, pseudo_path, pseudo_name) {
  Module['FS_createPath'](pseudo_path, pseudo_name, true, true);
  self.postMessage(JSON.stringify({'id': id}));
};
var getFile = function(id, pseudo_path, pseudo_name) {
  var array = FS.root.contents[pseudo_name].contents;
  var binary_data = new Uint8Array(array);
  var chunk_size = 1000;
  var chunk_count = Math.ceil(binary_data.length/chunk_size);
  for(var i = 0; i < chunk_count; i++) {
    var chunk = binary_data.subarray(i*chunk_size, Math.min((i+1)*chunk_size, binary_data.length));
    var str_chunk = String['fromCharCode'].apply(null, chunk);
    self.postMessage(JSON.stringify({'id': id, 'chunk_id': i, 'chunk_count': chunk_count, 'contents': str_chunk}));
  }
};
self['onmessage'] = function(ev) {
  var msg = JSON.parse(ev['data']);
  if(msg['cmd'] === 'addUrl') {
    addUrl(msg['id'], msg['real_url'], msg['pseudo_path'], msg['pseudo_name']);
  }
  if(msg['cmd'] === 'addData') {
    addData(msg['id'], msg['contents'], msg['pseudo_path'], msg['pseudo_name']);
  }
  if(msg['cmd'] === 'mkdir') {
    mkdir(msg['id'], msg['pseudo_path'], msg['pseudo_name']);
  }
  if(msg['cmd'] === 'run') {
    try {
      Module['run'](msg['args']);
    }
    catch(e) {
      self['postMessage'](JSON.stringify({'id': msg['id'], 'error': e.toString()}));
      return;
    }
    self['postMessage'](JSON.stringify({'id': msg['id'], 'success': true}));
  }
  if(msg['cmd'] === 'getFile') {
    getFile(msg['id'], msg['pseudo_path'], msg['pseudo_name']);
  }
};
// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
try {
  this['Module'] = Module;
} catch(e) {
  this['Module'] = Module = {};
}
// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  Module['print'] = function(x) {
    process['stdout'].write(x + '\n');
  };
  Module['printErr'] = function(x) {
    process['stderr'].write(x + '\n');
  };
  var nodeFS = require('fs');
  var nodePath = require('path');
  Module['read'] = function(filename) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename).toString();
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename).toString();
    }
    return ret;
  };
  Module['load'] = function(f) {
    globalEval(read(f));
  };
  if (!Module['arguments']) {
    Module['arguments'] = process['argv'].slice(2);
  }
}
if (ENVIRONMENT_IS_SHELL) {
  Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm
  // Polyfill over SpiderMonkey/V8 differences
  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function(f) { snarf(f) };
  }
  if (!Module['arguments']) {
    if (typeof scriptArgs != 'undefined') {
      Module['arguments'] = scriptArgs;
    } else if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
  }
}
if (ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER) {
  if (!Module['print']) {
    Module['print'] = function(x) {
      console.log(x);
    };
  }
  if (!Module['printErr']) {
    Module['printErr'] = function(x) {
      console.log(x);
    };
  }
}
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };
  if (!Module['arguments']) {
    if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
  }
}
if (ENVIRONMENT_IS_WORKER) {
  // We can do very little here...
  var TRY_USE_DUMP = false;
  if (!Module['print']) {
    Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }
  Module['load'] = importScripts;
}
if (!ENVIRONMENT_IS_WORKER && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_SHELL) {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}
function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***
// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];
// Callbacks
if (!Module['preRun']) Module['preRun'] = [];
if (!Module['postRun']) Module['postRun'] = [];
// === Auto-generated preamble library stuff ===
//========================================
// Runtime code shared with compiler
//========================================
var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      var logg = log2(quantum);
      return '((((' +target + ')+' + (quantum-1) + ')>>' + logg + ')<<' + logg + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (/^\[\d+\ x\ (.*)\]/.test(type)) return true; // [15 x ?] blocks. Like structs
  if (/<?{ ?[^}]* ?}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type, quantumSize) {
    if (Runtime.QUANTUM_SIZE == 1) return 1;
    var size = {
      '%i1': 1,
      '%i8': 1,
      '%i16': 2,
      '%i32': 4,
      '%i64': 8,
      "%float": 4,
      "%double": 8
    }['%'+type]; // add '%' since float and double confuse Closure compiler as keys, and also spidermonkey as a compiler will remove 's from '_i8' etc
    if (!size) {
      if (type.charAt(type.length-1) == '*') {
        size = Runtime.QUANTUM_SIZE; // A pointer
      } else if (type[0] == 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 == 0);
        size = bits/8;
      }
    }
    return size;
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    type.flatIndexes = type.fields.map(function(field) {
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = size;
      } else if (Runtime.isStructType(field)) {
        size = Types.types[field].flatSize;
        alignSize = Types.types[field].alignSize;
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else {
        throw 'Unclear type in struct: ' + field + ', in ' + type.name_ + ' :: ' + dump(Types.types[type.name_]);
      }
      alignSize = type.packed ? 1 : Math.min(alignSize, Runtime.QUANTUM_SIZE);
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      return FUNCTION_TABLE[ptr].apply(null, args);
    } else {
      return FUNCTION_TABLE[ptr]();
    }
  },
  addFunction: function (func, sig) {
    //assert(sig); // TODO: support asm
    var table = FUNCTION_TABLE; // TODO: support asm
    var ret = table.length;
    table.push(func);
    table.push(0);
    return ret;
  },
  removeFunction: function (index) {
    var table = FUNCTION_TABLE; // TODO: support asm
    table[index] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function() {
        Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xff;
      if (needed) {
        buffer.push(code);
        needed--;
      }
      if (buffer.length == 0) {
        if (code < 128) return String.fromCharCode(code);
        buffer.push(code);
        if (code > 191 && code < 224) {
          needed = 1;
        } else {
          needed = 2;
        }
        return '';
      }
      if (needed > 0) return '';
      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var ret;
      if (c1 > 191 && c1 < 224) {
        ret = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
      } else {
        ret = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = ((((STACKTOP)+3)>>2)<<2); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = ((((STATICTOP)+3)>>2)<<2); if (STATICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 4))*(quantum ? quantum : 4); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? (((low)>>>(0))+(((high)>>>(0))*4294967296)) : (((low)>>>(0))+(((high)|(0))*4294967296))); return ret; },
  QUANTUM_SIZE: 4,
  __dummy__: 0
}
//========================================
// Runtime essentials
//========================================
var __THREW__ = 0; // Used in checking for thrown exceptions.
var setjmpId = 1; // Used in setjmp/longjmp
var setjmpLabels = {};
var ABORT = false;
var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function abort(text) {
  Module.print(text + ':\n' + (new Error).stack);
  ABORT = true;
  throw "Assertion: " + text;
}
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}
var globalScope = this;
// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;
// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = globalScope['Module']['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}
// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length+1);
      writeStringToMemory(value, ret);
      return ret;
    } else if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}
// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;
// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,Math.min(Math.floor((value)/4294967296), 4294967295)>>>0],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': (HEAPF64[(tempDoublePtr)>>3]=value,HEAP32[((ptr)>>2)]=HEAP32[((tempDoublePtr)>>2)],HEAP32[(((ptr)+(4))>>2)]=HEAP32[(((tempDoublePtr)+(4))>>2)]); break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;
// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return (HEAP32[((tempDoublePtr)>>2)]=HEAP32[((ptr)>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((ptr)+(4))>>2)],HEAPF64[(tempDoublePtr)>>3]);
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;
var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_NONE = 3; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_NONE'] = ALLOC_NONE;
// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }
  var singleType = typeof types === 'string' ? types : null;
  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }
  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }
  if (singleType === 'i8') {
    HEAPU8.set(new Uint8Array(slab), ret);
    return ret;
  }
  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];
    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }
    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later
    setValue(ret+i, curr, type);
    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }
  return ret;
}
Module['allocate'] = allocate;
function Pointer_stringify(ptr, /* optional */ length) {
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;
  var ret = '';
  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;
// Memory management
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return ((x+4095)>>12)<<12;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STACK_ROOT, STACKTOP, STACK_MAX;
var STATICTOP;
function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value, (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}
var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;
// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(!!Int32Array && !!Float64Array && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'Cannot fallback to non-typed array case: Code is too specialized');
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');
Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;
STACK_ROOT = STACKTOP = Runtime.alignMemory(1);
STACK_MAX = TOTAL_STACK; // we lose a little stack here, but TOTAL_STACK is nice and round so use that as the max
var tempDoublePtr = Runtime.alignMemory(allocate(12, 'i8', ALLOC_STACK), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
}
function copyTempDouble(ptr) {
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];
  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];
  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];
  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];
}
STATICTOP = STACK_MAX;
assert(STATICTOP < TOTAL_MEMORY); // Stack must fit in TOTAL_MEMORY; allocations from here on may enlarge TOTAL_MEMORY
var nullString = allocate(intArrayFromString('(null)'), 'i8', ALLOC_STACK);
function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}
var __ATINIT__ = []; // functions called during startup
var __ATMAIN__ = []; // functions called when main() is to be run
var __ATEXIT__ = []; // functions called during shutdown
function initRuntime() {
  callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}
// Tools
// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;
function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;
// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;
function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore, sig) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}
if (!Math.imul) Math.imul = function(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyTracking = {};
var calledRun = false;
var runDependencyWatcher = null;
function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 6000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    } 
    // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
    if (!calledRun && shouldRunNow) run();
  }
}
Module['removeRunDependency'] = removeRunDependency;
Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data
// === Body ===
assert(STATICTOP == STACK_MAX); assert(STACK_MAX == TOTAL_STACK);
STATICTOP += 30900;
assert(STATICTOP < TOTAL_MEMORY);
var _stdout;
var _stdin;
var _stderr;
__ATINIT__ = __ATINIT__.concat([
  { func: function() { __GLOBAL__I_a() } },
  { func: function() { __GLOBAL__I_a1183() } },
  { func: function() { __GLOBAL__I_a1256() } },
  { func: function() { __GLOBAL__I_a1271() } },
  { func: function() { __GLOBAL__I_a1463() } },
  { func: function() { __GLOBAL__I_a285() } }
]);
var ___dso_handle;
var __ZTVN10__cxxabiv120__si_class_type_infoE;
var __ZTVN10__cxxabiv117__class_type_infoE;
allocate(12, "i8", ALLOC_NONE, 5242880);
allocate([16,0,0,0,11,0,0,0,10,0,0,0,16,0,0,0,24,0,0,0,40,0,0,0,51,0,0,0,61,0,0,0,12,0,0,0,12,0,0,0,14,0,0,0,19,0,0,0,26,0,0,0,58,0,0,0,60,0,0,0,55,0,0,0,14,0,0,0,13,0,0,0,16,0,0,0,24,0,0,0,40,0,0,0,57,0,0,0,69,0,0,0,56,0,0,0,14,0,0,0,17,0,0,0,22,0,0,0,29,0,0,0,51,0,0,0,87,0,0,0,80,0,0,0,62,0,0,0,18,0,0,0,22,0,0,0,37,0,0,0,56,0,0,0,68,0,0,0,109,0,0,0,103,0,0,0,77,0,0,0,24,0,0,0,35,0,0,0,55,0,0,0,64,0,0,0,81,0,0,0,104,0,0,0,113,0,0,0,92,0,0,0,49,0,0,0,64,0,0,0,78,0,0,0,87,0,0,0,103,0,0,0,121,0,0,0,120,0,0,0,101,0,0,0,72,0,0,0,92,0,0,0,95,0,0,0,98,0,0,0,112,0,0,0,100,0,0,0,103,0,0,0,99,0,0,0], "i8", ALLOC_NONE, 5242892);
allocate([0,1,2,3,4,5,6,7,8,9,10,11] /* \00\01\02\03\04\05\0 */, "i8", ALLOC_NONE, 5243148);
allocate([0,1,2,3,4,5,6,7,8,9,10,11] /* \00\01\02\03\04\05\0 */, "i8", ALLOC_NONE, 5243160);
allocate([1,2,3,0,4,17,5,18,33,49,65,6,19,81,97,7,34,113,20,50,129,145,161,8,35,66,177,193,21,82,209,240,36,51,98,114,130,9,10,22,23,24,25,26,37,38,39,40,41,42,52,53,54,55,56,57,58,67,68,69,70,71,72,73,74,83,84,85,86,87,88,89,90,99,100,101,102,103,104,105,106,115,116,117,118,119,120,121,122,131,132,133,134,135,136,137,138,146,147,148,149,150,151,152,153,154,162,163,164,165,166,167,168,169,170,178,179,180,181,182,183,184,185,186,194,195,196,197,198,199,200,201,202,210,211,212,213,214,215,216,217,218,225,226,227,228,229,230,231,232,233,234,241,242,243,244,245,246,247,248,249,250] /* \01\02\03\00\04\11\0 */, "i8", ALLOC_NONE, 5243172);
allocate([0,1,2,3,17,4,5,33,49,6,18,65,81,7,97,113,19,34,50,129,8,20,66,145,161,177,193,9,35,51,82,240,21,98,114,209,10,22,36,52,225,37,241,23,24,25,26,38,39,40,41,42,53,54,55,56,57,58,67,68,69,70,71,72,73,74,83,84,85,86,87,88,89,90,99,100,101,102,103,104,105,106,115,116,117,118,119,120,121,122,130,131,132,133,134,135,136,137,138,146,147,148,149,150,151,152,153,154,162,163,164,165,166,167,168,169,170,178,179,180,181,182,183,184,185,186,194,195,196,197,198,199,200,201,202,210,211,212,213,214,215,216,217,218,226,227,228,229,230,231,232,233,234,242,243,244,245,246,247,248,249,250] /* \00\01\02\03\11\04\0 */, "i8", ALLOC_NONE, 5243336);
allocate([0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0] /* \00\00\01\05\01\01\0 */, "i8", ALLOC_NONE, 5243500);
allocate([0,0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0] /* \00\00\03\01\01\01\0 */, "i8", ALLOC_NONE, 5243520);
allocate([0,0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,125] /* \00\00\02\01\03\03\0 */, "i8", ALLOC_NONE, 5243540);
allocate([0,0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,119] /* \00\00\02\01\02\04\0 */, "i8", ALLOC_NONE, 5243560);
allocate([17,0,0,0,18,0,0,0,24,0,0,0,47,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,18,0,0,0,21,0,0,0,26,0,0,0,66,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,24,0,0,0,26,0,0,0,56,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,47,0,0,0,66,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0,99,0,0,0], "i8", ALLOC_NONE, 5243580);
allocate([0,64,197,88,159,83,66,75,0,64,73,50,163,34,168,17,197,88,33,123,252,115,98,104,197,88,191,69,11,48,126,24,159,83,252,115,65,109,84,98,159,83,179,65,65,45,18,23,66,75,98,104,84,98,126,88,66,75,33,59,186,40,195,20,0,64,197,88,159,83,66,75,0,64,73,50,163,34,168,17,73,50,191,69,179,65,33,59,73,50,130,39,55,27,224,13,163,34,11,48,65,45,186,40,163,34,55,27,191,18,142,9,168,17,126,24,18,23,195,20,168,17,224,13,142,9,223,4], "i8", ALLOC_NONE, 5243836);
allocate([0,0,0,0,0,0,240,63,239,97,72,177,80,49,246,63,202,111,77,145,174,231,244,63,170,17,108,239,98,208,242,63,0,0,0,0,0,0,240,63,59,191,167,192,105,36,233,63,187,32,199,123,122,81,225,63,93,171,114,222,85,168,209,63], "i8", ALLOC_NONE, 5243964);
allocate([1,0,0,0,0,0,0,0,2,0,0,0], "i8", ALLOC_NONE, 5244028);
allocate([0,0,0,0,0,0,36,64,0,0,0,0,0,0,89,64,0,0,0,0,0,136,195,64,0,0,0,0,132,215,151,65,0,128,224,55,121,195,65,67,23,110,5,181,181,184,147,70,245,249,63,233,3,79,56,77,50,29,48,249,72,119,130,90,60,191,115,127,221,79,21,117], "i8", ALLOC_NONE, 5244040);
allocate(24, "i8", ALLOC_NONE, 5244112);
allocate(32, "i8", ALLOC_NONE, 5244136);
allocate([0,0,0,0,1,0,0,0,5,0,0,0,6,0,0,0,14,0,0,0,15,0,0,0,27,0,0,0,2,0,0,0,4,0,0,0,7,0,0,0,13,0,0,0,16,0,0,0,26,0,0,0,28,0,0,0,3,0,0,0,8,0,0,0,12,0,0,0,17,0,0,0,25,0,0,0,29,0,0,0,38,0,0,0,9,0,0,0,11,0,0,0,18,0,0,0,24,0,0,0,30,0,0,0,37,0,0,0,39,0,0,0,10,0,0,0,19,0,0,0,23,0,0,0,31,0,0,0,36,0,0,0,40,0,0,0,45,0,0,0,20,0,0,0,22,0,0,0,32,0,0,0,35,0,0,0,41,0,0,0,44,0,0,0,46,0,0,0,21,0,0,0,33,0,0,0,34,0,0,0,42,0,0,0,43,0,0,0,47,0,0,0,48,0,0,0], "i8", ALLOC_NONE, 5244168);
allocate([0,0,0,0,1,0,0,0,5,0,0,0,6,0,0,0,14,0,0,0,15,0,0,0,2,0,0,0,4,0,0,0,7,0,0,0,13,0,0,0,16,0,0,0,25,0,0,0,3,0,0,0,8,0,0,0,12,0,0,0,17,0,0,0,24,0,0,0,26,0,0,0,9,0,0,0,11,0,0,0,18,0,0,0,23,0,0,0,27,0,0,0,32,0,0,0,10,0,0,0,19,0,0,0,22,0,0,0,28,0,0,0,31,0,0,0,33,0,0,0,20,0,0,0,21,0,0,0,29,0,0,0,30,0,0,0,34,0,0,0,35,0,0,0], "i8", ALLOC_NONE, 5244364);
allocate([0,0,0,0,1,0,0,0,5,0,0,0,6,0,0,0,14,0,0,0,2,0,0,0,4,0,0,0,7,0,0,0,13,0,0,0,15,0,0,0,3,0,0,0,8,0,0,0,12,0,0,0,16,0,0,0,21,0,0,0,9,0,0,0,11,0,0,0,17,0,0,0,20,0,0,0,22,0,0,0,10,0,0,0,18,0,0,0,19,0,0,0,23,0,0,0,24,0,0,0], "i8", ALLOC_NONE, 5244508);
allocate([0,0,0,0,1,0,0,0,5,0,0,0,6,0,0,0,2,0,0,0,4,0,0,0,7,0,0,0,12,0,0,0,3,0,0,0,8,0,0,0,11,0,0,0,13,0,0,0,9,0,0,0,10,0,0,0,14,0,0,0,15,0,0,0], "i8", ALLOC_NONE, 5244608);
allocate([0,0,0,0,1,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,6,0,0,0,3,0,0,0,7,0,0,0,8,0,0,0], "i8", ALLOC_NONE, 5244672);
allocate([0,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0], "i8", ALLOC_NONE, 5244708);
allocate([0,0,0,0,1,0,0,0,5,0,0,0,6,0,0,0,14,0,0,0,15,0,0,0,27,0,0,0,28,0,0,0,2,0,0,0,4,0,0,0,7,0,0,0,13,0,0,0,16,0,0,0,26,0,0,0,29,0,0,0,42,0,0,0,3,0,0,0,8,0,0,0,12,0,0,0,17,0,0,0,25,0,0,0,30,0,0,0,41,0,0,0,43,0,0,0,9,0,0,0,11,0,0,0,18,0,0,0,24,0,0,0,31,0,0,0,40,0,0,0,44,0,0,0,53,0,0,0,10,0,0,0,19,0,0,0,23,0,0,0,32,0,0,0,39,0,0,0,45,0,0,0,52,0,0,0,54,0,0,0,20,0,0,0,22,0,0,0,33,0,0,0,38,0,0,0,46,0,0,0,51,0,0,0,55,0,0,0,60,0,0,0,21,0,0,0,34,0,0,0,37,0,0,0,47,0,0,0,50,0,0,0,56,0,0,0,59,0,0,0,61,0,0,0,35,0,0,0,36,0,0,0,48,0,0,0,49,0,0,0,57,0,0,0,58,0,0,0,62,0,0,0,63,0,0,0], "i8", ALLOC_NONE, 5244724);
allocate(512, "i8", ALLOC_NONE, 5244980);
allocate([0,0,0,0,1,0,0,0,8,0,0,0,16,0,0,0,9,0,0,0,2,0,0,0,3,0,0,0,10,0,0,0,17,0,0,0,24,0,0,0,32,0,0,0,25,0,0,0,18,0,0,0,11,0,0,0,4,0,0,0,5,0,0,0,12,0,0,0,19,0,0,0,26,0,0,0,33,0,0,0,40,0,0,0,48,0,0,0,41,0,0,0,34,0,0,0,27,0,0,0,20,0,0,0,13,0,0,0,6,0,0,0,14,0,0,0,21,0,0,0,28,0,0,0,35,0,0,0,42,0,0,0,49,0,0,0,50,0,0,0,43,0,0,0,36,0,0,0,29,0,0,0,22,0,0,0,30,0,0,0,37,0,0,0,44,0,0,0,51,0,0,0,52,0,0,0,45,0,0,0,38,0,0,0,46,0,0,0,53,0,0,0,54,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0], "i8", ALLOC_NONE, 5245492);
allocate([0,0,0,0,1,0,0,0,8,0,0,0,16,0,0,0,9,0,0,0,2,0,0,0,3,0,0,0,10,0,0,0,17,0,0,0,24,0,0,0,32,0,0,0,25,0,0,0,18,0,0,0,11,0,0,0,4,0,0,0,5,0,0,0,12,0,0,0,19,0,0,0,26,0,0,0,33,0,0,0,40,0,0,0,41,0,0,0,34,0,0,0,27,0,0,0,20,0,0,0,13,0,0,0,21,0,0,0,28,0,0,0,35,0,0,0,42,0,0,0,43,0,0,0,36,0,0,0,29,0,0,0,37,0,0,0,44,0,0,0,45,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0], "i8", ALLOC_NONE, 5245752);
allocate([0,0,0,0,1,0,0,0,8,0,0,0,16,0,0,0,9,0,0,0,2,0,0,0,3,0,0,0,10,0,0,0,17,0,0,0,24,0,0,0,32,0,0,0,25,0,0,0,18,0,0,0,11,0,0,0,4,0,0,0,12,0,0,0,19,0,0,0,26,0,0,0,33,0,0,0,34,0,0,0,27,0,0,0,20,0,0,0,28,0,0,0,35,0,0,0,36,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0], "i8", ALLOC_NONE, 5245960);
allocate([0,0,0,0,1,0,0,0,8,0,0,0,16,0,0,0,9,0,0,0,2,0,0,0,3,0,0,0,10,0,0,0,17,0,0,0,24,0,0,0,25,0,0,0,18,0,0,0,11,0,0,0,19,0,0,0,26,0,0,0,27,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0], "i8", ALLOC_NONE, 5246124);
allocate([0,0,0,0,1,0,0,0,8,0,0,0,16,0,0,0,9,0,0,0,2,0,0,0,10,0,0,0,17,0,0,0,18,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0], "i8", ALLOC_NONE, 5246252);
allocate([0,0,0,0,1,0,0,0,8,0,0,0,9,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0], "i8", ALLOC_NONE, 5246352);
allocate([0,0,0,0,1,0,0,0,8,0,0,0,16,0,0,0,9,0,0,0,2,0,0,0,3,0,0,0,10,0,0,0,17,0,0,0,24,0,0,0,32,0,0,0,25,0,0,0,18,0,0,0,11,0,0,0,4,0,0,0,5,0,0,0,12,0,0,0,19,0,0,0,26,0,0,0,33,0,0,0,40,0,0,0,48,0,0,0,41,0,0,0,34,0,0,0,27,0,0,0,20,0,0,0,13,0,0,0,6,0,0,0,7,0,0,0,14,0,0,0,21,0,0,0,28,0,0,0,35,0,0,0,42,0,0,0,49,0,0,0,56,0,0,0,57,0,0,0,50,0,0,0,43,0,0,0,36,0,0,0,29,0,0,0,22,0,0,0,15,0,0,0,23,0,0,0,30,0,0,0,37,0,0,0,44,0,0,0,51,0,0,0,58,0,0,0,59,0,0,0,52,0,0,0,45,0,0,0,38,0,0,0,31,0,0,0,39,0,0,0,46,0,0,0,53,0,0,0,60,0,0,0,61,0,0,0,54,0,0,0,47,0,0,0,55,0,0,0,62,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0,63,0,0,0], "i8", ALLOC_NONE, 5246432);
allocate(152, "i8", ALLOC_NONE, 5246752);
allocate([129,1,29,90,14,2,134,37,16,3,20,17,18,4,11,8,20,5,216,3,23,6,218,1,25,7,229,0,28,8,111,0,30,9,54,0,33,10,26,0,35,11,13,0,9,12,6,0,10,13,3,0,12,13,1,0,143,15,127,90,36,16,37,63,38,17,242,44,39,18,124,32,40,19,185,23,42,20,130,17,43,21,239,12,45,22,161,9,46,23,47,7,48,24,92,5,49,25,6,4,51,26,3,3,52,27,64,2,54,28,177,1,56,29,68,1,57,30,245,0,59,31,183,0,60,32,138,0,62,33,104,0,63,34,78,0,32,35,59,0,33,9,44,0,165,37,225,90,64,38,76,72,65,39,13,58,67,40,241,46,68,41,31,38,69,42,51,31,70,43,168,25,72,44,24,21,73,45,119,17,74,46,116,14,75,47,251,11,77,48,248,9,78,49,97,8,79,50,6,7,48,51,205,5,50,52,222,4,50,53,15,4,51,54,99,3,52,55,212,2,53,56,92,2,54,57,248,1,55,58,164,1,56,59,96,1,57,60,37,1,58,61,246,0,59,62,203,0,61,63,171,0,61,32,143,0,193,65,18,91,80,66,4,77,81,67,44,65,82,68,216,55,83,69,232,47,84,70,60,41,86,71,121,35,87,72,223,30,87,73,169,26,72,74,78,23,72,75,36,20,74,76,156,17,74,77,107,15,75,78,81,13,77,79,182,11,77,48,64,10,208,81,50,88,88,82,28,77,89,83,142,67,90,84,221,59,91,85,238,52,92,86,174,46,93,87,154,41,86,71,22,37,216,89,112,85,95,90,169,76,96,91,217,68,97,92,34,62,99,93,36,56,99,94,180,50,93,86,23,46,223,96,168,86,101,97,70,79,102,98,229,71,103,99,207,65,104,100,61,60,99,93,94,55,105,102,49,82,106,103,15,76,107,104,57,70,103,99,94,65,233,106,39,86,108,107,231,80,109,103,133,75,110,109,151,85,111,107,79,80,238,111,16,90,112,109,34,85,240,111,235,89,113,113,29,90], "i8", ALLOC_NONE, 5246904);
allocate([64,6,0,0,128,62,0,0], "i8", ALLOC_NONE, 5247360);
allocate([0,0,0,0,136,19,0,0], "i8", ALLOC_NONE, 5247368);
allocate([0,0,0,0,1,0,0,0,3,0,0,0,7,0,0,0,15,0,0,0,31,0,0,0,63,0,0,0,127,0,0,0,255,0,0,0,255,1,0,0,255,3,0,0,255,7,0,0,255,15,0,0,255,31,0,0,255,63,0,0,255,127,0,0], "i8", ALLOC_NONE, 5247376);
allocate([0,192,48,240,12,204,60,252,3,195,51,243,15,207,63,255,128,64,176,112,140,76,188,124,131,67,179,115,143,79,191,127,32,224,16,208,44,236,28,220,35,227,19,211,47,239,31,223,160,96,144,80,172,108,156,92,163,99,147,83,175,111,159,95,8,200,56,248,4,196,52,244,11,203,59,251,7,199,55,247,136,72,184,120,132,68,180,116,139,75,187,123,135,71,183,119,40,232,24,216,36,228,20,212,43,235,27,219,39,231,23,215,168,104,152,88,164,100,148,84,171,107,155,91,167,103,151,87,2,194,50,242,14,206,62,254,1,193,49,241,13,205,61,253,130,66,178,114,142,78,190,126,129,65,177,113,141,77,189,125,34,226,18,210,46,238,30,222,33,225,17,209,45,237,29,221,162,98,146,82,174,110,158,94,161,97,145,81,173,109,157,93,10,202,58,250,6,198,54,246,9,201,57,249,5,197,53,245,138,74,186,122,134,70,182,118,137,73,185,121,133,69,181,117,42,234,26,218,38,230,22,214,41,233,25,217,37,229,21,213,170,106,154,90,166,102,150,86,169,105,153,89,165,101,149,85], "i8", ALLOC_NONE, 5247440);
allocate([65,116,32,109,97,114,107,101,114,32,48,120,37,48,50,120,44,32,114,101,99,111,118,101,114,121,32,97,99,116,105,111,110,32,37,100,0] /* At marker 0x%02x, re */, "i8", ALLOC_NONE, 5247696);
allocate([65,0,0,0,112,0,0,0,114,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5247736);
allocate([83,101,108,101,99,116,101,100,32,37,100,32,99,111,108,111,114,115,32,102,111,114,32,113,117,97,110,116,105,122,97,116,105,111,110,0] /* Selected %d colors f */, "i8", ALLOC_NONE, 5247752);
allocate([77,0,0,0,97,0,0,0,114,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5247788);
allocate([81,117,97,110,116,105,122,105,110,103,32,116,111,32,37,100,32,99,111,108,111,114,115,0] /* Quantizing to %d col */, "i8", ALLOC_NONE, 5247804);
allocate([66,111,103,117,115,32,72,117,102,102,109,97,110,32,116,97,98,108,101,32,100,101,102,105,110,105,116,105,111,110,0] /* Bogus Huffman table  */, "i8", ALLOC_NONE, 5247828);
allocate([70,0,0,0,101,0,0,0,98,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5247860);
allocate([81,117,97,110,116,105,122,105,110,103,32,116,111,32,37,100,32,61,32,37,100,42,37,100,42,37,100,32,99,111,108,111,114,115,0] /* Quantizing to %d = % */, "i8", ALLOC_NONE, 5247876);
allocate([74,0,0,0,97,0,0,0,110,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5247912);
allocate([32,32,32,32,32,32,32,32,37,52,117,32,37,52,117,32,37,52,117,32,37,52,117,32,37,52,117,32,37,52,117,32,37,52,117,32,37,52,117,0] /*         %4u %4u %4u  */, "i8", ALLOC_NONE, 5247928);
allocate([68,0,0,0,101,0,0,0,99,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5247968);
allocate([85,110,101,120,112,101,99,116,101,100,32,109,97,114,107,101,114,32,48,120,37,48,50,120,0] /* Unexpected marker 0x */, "i8", ALLOC_NONE, 5248004);
allocate([78,0,0,0,111,0,0,0,118,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5248032);
allocate([77,105,115,99,101,108,108,97,110,101,111,117,115,32,109,97,114,107,101,114,32,48,120,37,48,50,120,44,32,108,101,110,103,116,104,32,37,117,0] /* Miscellaneous marker */, "i8", ALLOC_NONE, 5248068);
allocate([79,0,0,0,99,0,0,0,116,0,0,0,111,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5248108);
allocate([32,32,32,32,119,105,116,104,32,37,100,32,120,32,37,100,32,116,104,117,109,98,110,97,105,108,32,105,109,97,103,101,0] /*     with %d x %d thu */, "i8", ALLOC_NONE, 5248140);
allocate([83,0,0,0,101,0,0,0,112,0,0,0,116,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5248176);
allocate([74,70,73,70,32,101,120,116,101,110,115,105,111,110,32,109,97,114,107,101,114,58,32,116,121,112,101,32,48,120,37,48,50,120,44,32,108,101,110,103,116,104,32,37,117,0] /* JFIF extension marke */, "i8", ALLOC_NONE, 5248216);
allocate([32,114,101,113,117,105,114,101,100,33,0] /*  required!\00 */, "i8", ALLOC_NONE, 5248264);
allocate([117,110,115,117,112,112,111,114,116,101,100,32,108,111,99,97,108,101,32,102,111,114,32,115,116,97,110,100,97,114,100,32,105,110,112,117,116,0] /* unsupported locale f */, "i8", ALLOC_NONE, 5248276);
allocate([71,83,49,45,49,50,56,0] /* GS1-128\00 */, "i8", ALLOC_NONE, 5248316);
allocate([44,32,0] /* , \00 */, "i8", ALLOC_NONE, 5248324);
allocate([65,0,0,0,117,0,0,0,103,0,0,0,117,0,0,0,115,0,0,0,116,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5248328);
allocate([87,97,114,110,105,110,103,58,32,116,104,117,109,98,110,97,105,108,32,105,109,97,103,101,32,115,105,122,101,32,100,111,101,115,32,110,111,116,32,109,97,116,99,104,32,100,97,116,97,32,108,101,110,103,116,104,32,37,117,0] /* Warning: thumbnail i */, "i8", ALLOC_NONE, 5248356);
allocate([74,0,0,0,117,0,0,0,108,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5248416);
allocate([74,70,73,70,32,65,80,80,48,32,109,97,114,107,101,114,58,32,118,101,114,115,105,111,110,32,37,100,46,37,48,50,100,44,32,100,101,110,115,105,116,121,32,37,100,120,37,100,32,32,37,100,0] /* JFIF APP0 marker: ve */, "i8", ALLOC_NONE, 5248436);
allocate([74,0,0,0,117,0,0,0,110,0,0,0,101,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5248492);
allocate([32,32,32,32,32,32,32,32,37,51,100,32,37,51,100,32,37,51,100,32,37,51,100,32,37,51,100,32,37,51,100,32,37,51,100,32,37,51,100,0] /*         %3d %3d %3d  */, "i8", ALLOC_NONE, 5248512);
allocate([69,110,100,32,79,102,32,73,109,97,103,101,0] /* End Of Image\00 */, "i8", ALLOC_NONE, 5248552);
allocate([67,111,109,112,111,110,101,110,116,32,105,110,100,101,120,32,37,100,58,32,109,105,115,109,97,116,99,104,105,110,103,32,115,97,109,112,108,105,110,103,32,114,97,116,105,111,32,37,100,58,37,100,44,32,37,100,58,37,100,44,32,37,99,0] /* Component index %d:  */, "i8", ALLOC_NONE, 5248568);
allocate([65,0,0,0,112,0,0,0,114,0,0,0,105,0,0,0,108,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5248632);
allocate([79,98,116,97,105,110,101,100,32,69,77,83,32,104,97,110,100,108,101,32,37,117,0] /* Obtained EMS handle  */, "i8", ALLOC_NONE, 5248656);
allocate([77,0,0,0,97,0,0,0,114,0,0,0,99,0,0,0,104,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5248680);
allocate([70,114,101,101,100,32,69,77,83,32,104,97,110,100,108,101,32,37,117,0] /* Freed EMS handle %u\ */, "i8", ALLOC_NONE, 5248704);
allocate([70,0,0,0,101,0,0,0,98,0,0,0,114,0,0,0,117,0,0,0,97,0,0,0,114,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5248724);
allocate([68,101,102,105,110,101,32,82,101,115,116,97,114,116,32,73,110,116,101,114,118,97,108,32,37,117,0] /* Define Restart Inter */, "i8", ALLOC_NONE, 5248760);
allocate([74,0,0,0,97,0,0,0,110,0,0,0,117,0,0,0,97,0,0,0,114,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5248788);
allocate([68,101,102,105,110,101,32,81,117,97,110,116,105,122,97,116,105,111,110,32,84,97,98,108,101,32,37,100,32,32,112,114,101,99,105,115,105,111,110,32,37,100,0] /* Define Quantization  */, "i8", ALLOC_NONE, 5248820);
allocate([68,101,102,105,110,101,32,72,117,102,102,109,97,110,32,84,97,98,108,101,32,48,120,37,48,50,120,0] /* Define Huffman Table */, "i8", ALLOC_NONE, 5248864);
allocate([80,77,0] /* PM\00 */, "i8", ALLOC_NONE, 5248892);
allocate([68,101,102,105,110,101,32,65,114,105,116,104,109,101,116,105,99,32,84,97,98,108,101,32,48,120,37,48,50,120,58,32,48,120,37,48,50,120,0] /* Define Arithmetic Ta */, "i8", ALLOC_NONE, 5248896);
allocate([44,32,97,116,32,108,101,97,115,116,32,0] /* , at least \00 */, "i8", ALLOC_NONE, 5248936);
allocate([82,101,45,114,101,97,100,105,110,103,32,109,101,116,97,32,100,97,116,97,46,0] /* Re-reading meta data */, "i8", ALLOC_NONE, 5248948);
allocate([99,111,100,101,49,50,56,0] /* code128\00 */, "i8", ALLOC_NONE, 5248972);
allocate([65,77,0] /* AM\00 */, "i8", ALLOC_NONE, 5248980);
allocate([85,110,107,110,111,119,110,32,65,80,80,49,52,32,109,97,114,107,101,114,32,40,110,111,116,32,65,100,111,98,101,41,44,32,108,101,110,103,116,104,32,37,117,0] /* Unknown APP14 marker */, "i8", ALLOC_NONE, 5248984);
allocate([98,97,115,105,99,95,115,116,114,105,110,103,0] /* basic_string\00 */, "i8", ALLOC_NONE, 5249028);
allocate([98,105,45,108,101,118,101,108,32,116,104,114,101,115,104,111,108,100,32,118,97,108,117,101,0] /* bi-level threshold v */, "i8", ALLOC_NONE, 5249044);
allocate([85,110,107,110,111,119,110,32,65,80,80,48,32,109,97,114,107,101,114,32,40,110,111,116,32,74,70,73,70,41,44,32,108,101,110,103,116,104,32,37,117,0] /* Unknown APP0 marker  */, "i8", ALLOC_NONE, 5249072);
allocate([80,0,0,0,77,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5249116);
allocate([65,100,111,98,101,32,65,80,80,49,52,32,109,97,114,107,101,114,58,32,118,101,114,115,105,111,110,32,37,100,44,32,102,108,97,103,115,32,48,120,37,48,52,120,32,48,120,37,48,52,120,44,32,116,114,97,110,115,102,111,114,109,32,37,100,0] /* Adobe APP14 marker:  */, "i8", ALLOC_NONE, 5249128);
allocate([65,0,0,0,77,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5249196);
allocate([67,97,117,116,105,111,110,58,32,113,117,97,110,116,105,122,97,116,105,111,110,32,116,97,98,108,101,115,32,97,114,101,32,116,111,111,32,99,111,97,114,115,101,32,102,111,114,32,98,97,115,101,108,105,110,101,32,74,80,69,71,0] /* Caution: quantizatio */, "i8", ALLOC_NONE, 5249208);
allocate([68,67,84,32,115,99,97,108,101,100,32,98,108,111,99,107,32,115,105,122,101,32,37,100,120,37,100,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0] /* DCT scaled block siz */, "i8", ALLOC_NONE, 5249272);
allocate([57,32,32,49,51,45,74,97,110,45,50,48,49,51,0] /* 9  13-Jan-2013\00 */, "i8", ALLOC_NONE, 5249316);
allocate([67,111,112,121,114,105,103,104,116,32,40,67,41,32,50,48,49,51,44,32,84,104,111,109,97,115,32,71,46,32,76,97,110,101,44,32,71,117,105,100,111,32,86,111,108,108,98,101,100,105,110,103,0] /* Copyright (C) 2013,  */, "i8", ALLOC_NONE, 5249332);
allocate([87,114,105,116,101,32,116,111,32,88,77,83,32,102,97,105,108,101,100,0] /* Write to XMS failed\ */, "i8", ALLOC_NONE, 5249388);
allocate([66,111,103,117,115,32,109,101,115,115,97,103,101,32,99,111,100,101,32,37,100,0] /* Bogus message code % */, "i8", ALLOC_NONE, 5249408);
allocate([82,101,97,100,32,102,114,111,109,32,88,77,83,32,102,97,105,108,101,100,0] /* Read from XMS failed */, "i8", ALLOC_NONE, 5249432);
allocate([73,109,97,103,101,32,116,111,111,32,119,105,100,101,32,102,111,114,32,116,104,105,115,32,105,109,112,108,101,109,101,110,116,97,116,105,111,110,0] /* Image too wide for t */, "i8", ALLOC_NONE, 5249456);
allocate([76,83,69,0] /* LSE\00 */, "i8", ALLOC_NONE, 5249496);
allocate([86,105,114,116,117,97,108,32,97,114,114,97,121,32,99,111,110,116,114,111,108,108,101,114,32,109,101,115,115,101,100,32,117,112,0] /* Virtual array contro */, "i8", ALLOC_NONE, 5249500);
allocate([69,114,114,111,114,58,32,84,111,111,32,102,101,119,32,112,97,114,97,109,101,116,101,114,32,102,111,114,32,97,114,103,117,109,101,110,116,32,0] /* Error: Too few param */, "i8", ALLOC_NONE, 5249536);
allocate([84,114,97,110,115,102,111,114,109,105,110,103,32,68,67,84,32,99,111,101,102,102,105,99,105,101,110,116,115,46,0] /* Transforming DCT coe */, "i8", ALLOC_NONE, 5249576);
allocate([117,112,99,101,0] /* upce\00 */, "i8", ALLOC_NONE, 5249608);
allocate([85,110,115,117,112,112,111,114,116,101,100,32,109,97,114,107,101,114,32,116,121,112,101,32,48,120,37,48,50,120,0] /* Unsupported marker t */, "i8", ALLOC_NONE, 5249616);
allocate([116,104,114,101,115,104,111,108,100,0] /* threshold\00 */, "i8", ALLOC_NONE, 5249648);
allocate([65,112,112,108,105,99,97,116,105,111,110,32,116,114,97,110,115,102,101,114,114,101,100,32,116,111,111,32,102,101,119,32,115,99,97,110,108,105,110,101,115,0] /* Application transfer */, "i8", ALLOC_NONE, 5249660);
allocate([87,114,105,116,101,32,102,97,105,108,101,100,32,111,110,32,116,101,109,112,111,114,97,114,121,32,102,105,108,101,32,45,45,45,32,111,117,116,32,111,102,32,100,105,115,107,32,115,112,97,99,101,63,0] /* Write failed on temp */, "i8", ALLOC_NONE, 5249704);
allocate([83,101,101,107,32,102,97,105,108,101,100,32,111,110,32,116,101,109,112,111,114,97,114,121,32,102,105,108,101,0] /* Seek failed on tempo */, "i8", ALLOC_NONE, 5249760);
allocate([68,67,84,32,99,111,101,102,102,105,99,105,101,110,116,32,111,117,116,32,111,102,32,114,97,110,103,101,0] /* DCT coefficient out  */, "i8", ALLOC_NONE, 5249792);
allocate([82,101,97,100,32,102,97,105,108,101,100,32,111,110,32,116,101,109,112,111,114,97,114,121,32,102,105,108,101,0] /* Read failed on tempo */, "i8", ALLOC_NONE, 5249824);
allocate([108,111,99,97,108,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0] /* locale not supported */, "i8", ALLOC_NONE, 5249856);
allocate([70,97,105,108,101,100,32,116,111,32,99,114,101,97,116,101,32,116,101,109,112,111,114,97,114,121,32,102,105,108,101,32,37,115,0] /* Failed to create tem */, "i8", ALLOC_NONE, 5249880);
allocate([73,110,118,97,108,105,100,32,74,80,69,71,32,102,105,108,101,32,115,116,114,117,99,116,117,114,101,58,32,116,119,111,32,83,79,73,32,109,97,114,107,101,114,115,0] /* Invalid JPEG file st */, "i8", ALLOC_NONE, 5249916);
allocate([37,0,0,0,73,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,112,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5249964);
allocate([85,110,115,117,112,112,111,114,116,101,100,32,74,80,69,71,32,112,114,111,99,101,115,115,58,32,83,79,70,32,116,121,112,101,32,48,120,37,48,50,120,0] /* Unsupported JPEG pro */, "i8", ALLOC_NONE, 5250012);
allocate([37,73,58,37,77,58,37,83,32,37,112,0] /* %I:%M:%S %p\00 */, "i8", ALLOC_NONE, 5250056);
allocate([73,110,118,97,108,105,100,32,74,80,69,71,32,102,105,108,101,32,115,116,114,117,99,116,117,114,101,58,32,109,105,115,115,105,110,103,32,83,79,83,32,109,97,114,107,101,114,0] /* Invalid JPEG file st */, "i8", ALLOC_NONE, 5250068);
allocate([37,0,0,0,97,0,0,0,32,0,0,0,37,0,0,0,98,0,0,0,32,0,0,0,37,0,0,0,100,0,0,0,32,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,89,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5250116);
allocate([73,110,118,97,108,105,100,32,74,80,69,71,32,102,105,108,101,32,115,116,114,117,99,116,117,114,101,58,32,116,119,111,32,83,79,70,32,109,97,114,107,101,114,115,0] /* Invalid JPEG file st */, "i8", ALLOC_NONE, 5250200);
allocate([32,112,97,114,97,109,101,116,101,114,32,114,101,113,117,105,114,101,100,33,0] /*  parameter required! */, "i8", ALLOC_NONE, 5250248);
allocate([83,99,97,108,105,110,103,32,98,121,32,112,97,114,116,105,97,108,108,121,32,108,111,97,100,105,110,103,32,68,67,84,32,99,111,101,102,102,105,99,105,101,110,116,115,46,0] /* Scaling by partially */, "i8", ALLOC_NONE, 5250272);
allocate([101,97,110,0] /* ean\00 */, "i8", ALLOC_NONE, 5250320);
allocate([37,97,32,37,98,32,37,100,32,37,72,58,37,77,58,37,83,32,37,89,0] /* %a %b %d %H:%M:%S %Y */, "i8", ALLOC_NONE, 5250324);
allocate([73,110,118,97,108,105,100,32,74,80,69,71,32,102,105,108,101,32,115,116,114,117,99,116,117,114,101,58,32,37,115,32,98,101,102,111,114,101,32,83,79,70,0] /* Invalid JPEG file st */, "i8", ALLOC_NONE, 5250348);
allocate([37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5250392);
allocate([67,97,110,110,111,116,32,113,117,97,110,116,105,122,101,32,116,111,32,109,111,114,101,32,116,104,97,110,32,37,100,32,99,111,108,111,114,115,0] /* Cannot quantize to m */, "i8", ALLOC_NONE, 5250428);
allocate([67,97,110,110,111,116,32,113,117,97,110,116,105,122,101,32,116,111,32,102,101,119,101,114,32,116,104,97,110,32,37,100,32,99,111,108,111,114,115,0] /* Cannot quantize to f */, "i8", ALLOC_NONE, 5250468);
allocate([37,0,0,0,109,0,0,0,47,0,0,0,37,0,0,0,100,0,0,0,47,0,0,0,37,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5250508);
allocate([67,97,110,110,111,116,32,113,117,97,110,116,105,122,101,32,109,111,114,101,32,116,104,97,110,32,37,100,32,99,111,108,111,114,32,99,111,109,112,111,110,101,110,116,115,0] /* Cannot quantize more */, "i8", ALLOC_NONE, 5250544);
allocate([73,110,118,97,108,105,100,32,99,114,111,112,32,114,101,113,117,101,115,116,0] /* Invalid crop request */, "i8", ALLOC_NONE, 5250592);
allocate([32,110,101,101,100,115,32,97,110,32,112,97,114,97,109,101,116,101,114,33,0] /*  needs an parameter! */, "i8", ALLOC_NONE, 5250616);
allocate([73,110,115,117,102,102,105,99,105,101,110,116,32,109,101,109,111,114,121,32,40,99,97,115,101,32,37,100,41,0] /* Insufficient memory  */, "i8", ALLOC_NONE, 5250640);
allocate([69,114,114,111,114,58,32,65,114,103,117,109,101,110,116,32,0] /* Error: Argument \00 */, "i8", ALLOC_NONE, 5250672);
allocate([78,111,116,32,97,32,74,80,69,71,32,102,105,108,101,58,32,115,116,97,114,116,115,32,119,105,116,104,32,48,120,37,48,50,120,32,48,120,37,48,50,120,0] /* Not a JPEG file: sta */, "i8", ALLOC_NONE, 5250692);
allocate([102,0,0,0,97,0,0,0,108,0,0,0,115,0,0,0,101,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5250736);
allocate([81,117,97,110,116,105,122,97,116,105,111,110,32,116,97,98,108,101,32,48,120,37,48,50,120,32,119,97,115,32,110,111,116,32,100,101,102,105,110,101,100,0] /* Quantization table 0 */, "i8", ALLOC_NONE, 5250760);
allocate([102,97,108,115,101,0] /* false\00 */, "i8", ALLOC_NONE, 5250804);
allocate([44,32,111,110,108,121,32,0] /* , only \00 */, "i8", ALLOC_NONE, 5250812);
allocate([74,80,69,71,32,100,97,116,97,115,116,114,101,97,109,32,99,111,110,116,97,105,110,115,32,110,111,32,105,109,97,103,101,0] /* JPEG datastream cont */, "i8", ALLOC_NONE, 5250820);
allocate([116,0,0,0,114,0,0,0,117,0,0,0,101,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5250856);
allocate([69,114,114,111,114,58,32,84,111,111,32,109,97,110,121,32,112,97,114,97,109,101,116,101,114,32,102,111,114,32,97,114,103,117,109,101,110,116,32,0] /* Error: Too many para */, "i8", ALLOC_NONE, 5250876);
allocate([72,117,102,102,109,97,110,32,116,97,98,108,101,32,48,120,37,48,50,120,32,119,97,115,32,110,111,116,32,100,101,102,105,110,101,100,0] /* Huffman table 0x%02x */, "i8", ALLOC_NONE, 5250916);
allocate([32,112,114,101,115,101,110,116,32,102,111,114,32,97,114,103,117,109,101,110,116,32,0] /*  present for argumen */, "i8", ALLOC_NONE, 5250956);
allocate([66,97,99,107,105,110,103,32,115,116,111,114,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0] /* Backing store not su */, "i8", ALLOC_NONE, 5250980);
allocate([32,87,97,114,110,105,110,103,115,46,0] /*  Warnings.\00 */, "i8", ALLOC_NONE, 5251008);
allocate([117,112,99,97,0] /* upca\00 */, "i8", ALLOC_NONE, 5251020);
allocate([32,32,32,32,32,32,32,65,116,32,108,101,97,115,116,32,0] /*        At least \00 */, "i8", ALLOC_NONE, 5251028);
allocate([69,114,114,111,114,58,32,84,104,101,114,101,32,105,115,32,110,111,32,112,97,114,97,109,101,116,101,114,58,32,0] /* Error: There is no p */, "i8", ALLOC_NONE, 5251048);
allocate([65,114,105,116,104,109,101,116,105,99,32,116,97,98,108,101,32,48,120,37,48,50,120,32,119,97,115,32,110,111,116,32,100,101,102,105,110,101,100,0] /* Arithmetic table 0x% */, "i8", ALLOC_NONE, 5251080);
allocate([100,105,115,112,108,97,121,32,116,104,105,115,32,104,101,108,112,32,116,101,120,116,32,97,110,100,32,101,120,105,116,0] /* display this help te */, "i8", ALLOC_NONE, 5251120);
allocate([82,101,113,117,101,115,116,101,100,32,102,101,97,116,117,114,101,32,119,97,115,32,111,109,105,116,116,101,100,32,97,116,32,99,111,109,112,105,108,101,32,116,105,109,101,0] /* Requested feature wa */, "i8", ALLOC_NONE, 5251152);
allocate([78,111,116,32,105,109,112,108,101,109,101,110,116,101,100,32,121,101,116,0] /* Not implemented yet\ */, "i8", ALLOC_NONE, 5251200);
allocate([108,105,98,47,73,109,97,103,101,46,104,104,0] /* lib/Image.hh\00 */, "i8", ALLOC_NONE, 5251220);
allocate([73,110,118,97,108,105,100,32,99,111,108,111,114,32,113,117,97,110,116,105,122,97,116,105,111,110,32,109,111,100,101,32,99,104,97,110,103,101,0] /* Invalid color quanti */, "i8", ALLOC_NONE, 5251236);
allocate([73,110,118,97,108,105,100,32,99,111,109,112,111,110,101,110,116,32,73,68,32,37,100,32,105,110,32,83,79,83,0] /* Invalid component ID */, "i8", ALLOC_NONE, 5251276);
allocate([83,99,97,110,32,115,99,114,105,112,116,32,100,111,101,115,32,110,111,116,32,116,114,97,110,115,109,105,116,32,97,108,108,32,100,97,116,97,0] /* Scan script does not */, "i8", ALLOC_NONE, 5251308);
allocate([118,101,114,116,105,99,97,108,32,63,32,105,116,46,103,101,116,95,121,40,41,32,61,61,32,48,32,58,32,105,116,46,103,101,116,95,120,40,41,32,61,61,32,48,0] /* vertical ? it.get_y( */, "i8", ALLOC_NONE, 5251348);
allocate([67,97,110,110,111,116,32,116,114,97,110,115,99,111,100,101,32,100,117,101,32,116,111,32,109,117,108,116,105,112,108,101,32,117,115,101,32,111,102,32,113,117,97,110,116,105,122,97,116,105,111,110,32,116,97,98,108,101,32,37,100,0] /* Cannot transcode due */, "i8", ALLOC_NONE, 5251396);
allocate([98,97,114,100,101,99,111,100,101,47,84,111,107,101,110,105,122,101,114,46,104,104,0] /* bardecode/Tokenizer. */, "i8", ALLOC_NONE, 5251460);
allocate([80,114,101,109,97,116,117,114,101,32,101,110,100,32,111,102,32,105,110,112,117,116,32,102,105,108,101,0] /* Premature end of inp */, "i8", ALLOC_NONE, 5251484);
allocate([98,46,115,105,122,101,40,41,32,61,61,32,57,0] /* b.size() == 9\00 */, "i8", ALLOC_NONE, 5251512);
allocate([69,109,112,116,121,32,105,110,112,117,116,32,102,105,108,101,0] /* Empty input file\00 */, "i8", ALLOC_NONE, 5251528);
allocate([98,97,114,100,101,99,111,100,101,47,99,111,100,101,51,57,46,104,104,0] /* bardecode/code39.hh\ */, "i8", ALLOC_NONE, 5251548);
allocate([77,97,120,105,109,117,109,32,115,117,112,112,111,114,116,101,100,32,105,109,97,103,101,32,100,105,109,101,110,115,105,111,110,32,105,115,32,37,117,32,112,105,120,101,108,115,0] /* Maximum supported im */, "i8", ALLOC_NONE, 5251568);
allocate([98,46,115,105,122,101,40,41,32,61,61,32,49,48,0] /* b.size() == 10\00 */, "i8", ALLOC_NONE, 5251616);
allocate([77,105,115,115,105,110,103,32,72,117,102,102,109,97,110,32,99,111,100,101,32,116,97,98,108,101,32,101,110,116,114,121,0] /* Missing Huffman code */, "i8", ALLOC_NONE, 5251632);
allocate([85,110,104,97,110,100,108,101,100,32,98,112,115,47,115,112,112,32,99,111,109,98,105,110,97,116,105,111,110,46,0] /* Unhandled bps/spp co */, "i8", ALLOC_NONE, 5251668);
allocate([101,97,110,49,51,0] /* ean13\00 */, "i8", ALLOC_NONE, 5251700);
allocate([32,97,108,108,111,119,101,100,33,0] /*  allowed!\00 */, "i8", ALLOC_NONE, 5251708);
allocate([98,97,114,100,101,99,111,100,101,47,99,111,100,101,50,53,105,46,104,104,0] /* bardecode/code25i.hh */, "i8", ALLOC_NONE, 5251720);
allocate([72,117,102,102,109,97,110,32,99,111,100,101,32,115,105,122,101,32,116,97,98,108,101,32,111,118,101,114,102,108,111,119,0] /* Huffman code size ta */, "i8", ALLOC_NONE, 5251744);
allocate([98,97,114,100,101,99,111,100,101,47,99,111,100,101,49,50,56,46,104,104,0] /* bardecode/code128.hh */, "i8", ALLOC_NONE, 5251780);
allocate([70,114,97,99,116,105,111,110,97,108,32,115,97,109,112,108,105,110,103,32,110,111,116,32,105,109,112,108,101,109,101,110,116,101,100,32,121,101,116,0] /* Fractional sampling  */, "i8", ALLOC_NONE, 5251804);
allocate([37,48,50,100,0] /* %02d\00 */, "i8", ALLOC_NONE, 5251844);
allocate([79,117,116,112,117,116,32,102,105,108,101,32,119,114,105,116,101,32,101,114,114,111,114,32,45,45,45,32,111,117,116,32,111,102,32,100,105,115,107,32,115,112,97,99,101,63,0] /* Output file write er */, "i8", ALLOC_NONE, 5251852);
allocate([87,65,82,78,73,78,71,58,32,70,117,110,99,116,105,111,110,32,99,104,97,114,97,116,101,114,115,32,102,111,114,32,99,111,100,101,49,50,56,32,97,114,101,32,110,111,116,32,121,101,116,32,115,117,112,112,111,114,116,101,100,46,0] /* WARNING: Function ch */, "i8", ALLOC_NONE, 5251900);
allocate([73,110,112,117,116,32,102,105,108,101,32,114,101,97,100,32,101,114,114,111,114,0] /* Input file read erro */, "i8", ALLOC_NONE, 5251964);
allocate([66,111,103,117,115,32,98,117,102,102,101,114,32,99,111,110,116,114,111,108,32,109,111,100,101,0] /* Bogus buffer control */, "i8", ALLOC_NONE, 5251988);
allocate([109,111,100,117,108,101,115,95,99,111,117,110,116,40,118,44,117,41,32,60,61,32,49,54,0] /* modules_count(v,u) _ */, "i8", ALLOC_NONE, 5252016);
allocate([68,105,100,110,39,116,32,101,120,112,101,99,116,32,109,111,114,101,32,116,104,97,110,32,111,110,101,32,115,99,97,110,0] /* Didn't expect more t */, "i8", ALLOC_NONE, 5252044);
allocate([87,114,105,116,101,32,116,111,32,69,77,83,32,102,97,105,108,101,100,0] /* Write to EMS failed\ */, "i8", ALLOC_NONE, 5252080);
allocate([118,101,99,116,111,114,0] /* vector\00 */, "i8", ALLOC_NONE, 5252100);
allocate([98,97,114,100,101,99,111,100,101,47,115,99,97,110,110,101,114,95,117,116,105,108,115,46,104,104,0] /* bardecode/scanner_ut */, "i8", ALLOC_NONE, 5252108);
allocate([82,101,97,100,32,102,114,111,109,32,69,77,83,32,102,97,105,108,101,100,0] /* Read from EMS failed */, "i8", ALLOC_NONE, 5252136);
allocate([102,97,108,115,101,32,38,38,32,34,84,79,68,79,34,0] /* false && \22TODO\22\ */, "i8", ALLOC_NONE, 5252160);
allocate([69,109,112,116,121,32,74,80,69,71,32,105,109,97,103,101,32,40,68,78,76,32,110,111,116,32,115,117,112,112,111,114,116,101,100,41,0] /* Empty JPEG image (DN */, "i8", ALLOC_NONE, 5252176);
allocate([98,97,114,100,101,99,111,100,101,47,101,97,110,46,104,104,0] /* bardecode/ean.hh\00 */, "i8", ALLOC_NONE, 5252216);
allocate([66,111,103,117,115,32,68,81,84,32,105,110,100,101,120,32,37,100,0] /* Bogus DQT index %d\0 */, "i8", ALLOC_NONE, 5252236);
allocate([33,32,116,46,102,105,114,115,116,0] /* ! t.first\00 */, "i8", ALLOC_NONE, 5252256);
allocate([66,111,103,117,115,32,68,72,84,32,105,110,100,101,120,32,37,100,0] /* Bogus DHT index %d\0 */, "i8", ALLOC_NONE, 5252268);
allocate([115,116,100,58,58,98,97,100,95,97,108,108,111,99,0] /* std::bad_alloc\00 */, "i8", ALLOC_NONE, 5252288);
allocate([74,80,69,71,67,111,100,101,99,58,32,74,80,69,71,32,99,97,110,32,110,111,116,32,104,111,108,100,32,108,101,115,115,32,116,104,97,110,32,56,32,98,105,116,45,112,101,114,45,99,104,97,110,110,101,108,46,0] /* JPEGCodec: JPEG can  */, "i8", ALLOC_NONE, 5252304);
allocate([37,46,48,76,102,0] /* %.0Lf\00 */, "i8", ALLOC_NONE, 5252364);
allocate([117,110,107,110,111,119,110,32,101,120,105,102,32,111,114,105,101,110,116,97,116,105,111,110,58,32,0] /* unknown exif orienta */, "i8", ALLOC_NONE, 5252372);
allocate([98,97,114,100,101,99,111,100,101,47,83,99,97,110,110,101,114,46,116,99,99,0] /* bardecode/Scanner.tc */, "i8", ALLOC_NONE, 5252400);
allocate([66,111,103,117,115,32,68,65,67,32,118,97,108,117,101,32,48,120,37,120,0] /* Bogus DAC value 0x%x */, "i8", ALLOC_NONE, 5252424);
allocate([33,32,101,110,100,40,41,0] /* ! end()\00 */, "i8", ALLOC_NONE, 5252448);
allocate([69,114,114,111,114,58,32,78,111,32,102,114,97,103,109,101,110,116,97,116,105,111,110,32,102,111,114,32,97,114,103,117,109,101,110,116,32,0] /* Error: No fragmentat */, "i8", ALLOC_NONE, 5252456);
allocate([66,111,103,117,115,32,68,65,67,32,105,110,100,101,120,32,37,100,0] /* Bogus DAC index %d\0 */, "i8", ALLOC_NONE, 5252496);
allocate([98,97,114,100,101,99,111,100,101,47,83,99,97,110,110,101,114,46,104,104,0] /* bardecode/Scanner.hh */, "i8", ALLOC_NONE, 5252516);
allocate([85,110,115,117,112,112,111,114,116,101,100,32,99,111,108,111,114,32,99,111,110,118,101,114,115,105,111,110,32,114,101,113,117,101,115,116,0] /* Unsupported color co */, "i8", ALLOC_NONE, 5252540);
allocate([109,111,110,101,121,95,103,101,116,32,101,114,114,111,114,0] /* money_get error\00 */, "i8", ALLOC_NONE, 5252580);
allocate([41,93,0] /* )]\00 */, "i8", ALLOC_NONE, 5252596);
allocate([84,111,111,32,109,97,110,121,32,99,111,108,111,114,32,99,111,109,112,111,110,101,110,116,115,58,32,37,100,44,32,109,97,120,32,37,100,0] /* Too many color compo */, "i8", ALLOC_NONE, 5252600);
allocate([77,65,88,95,65,76,76,79,67,95,67,72,85,78,75,32,105,115,32,119,114,111,110,103,44,32,112,108,101,97,115,101,32,102,105,120,0] /* MAX_ALLOC_CHUNK is w */, "i8", ALLOC_NONE, 5252640);
allocate([37,76,102,0] /* %Lf\00 */, "i8", ALLOC_NONE, 5252680);
allocate([44,0] /* ,\00 */, "i8", ALLOC_NONE, 5252684);
allocate([67,67,73,82,54,48,49,32,115,97,109,112,108,105,110,103,32,110,111,116,32,105,109,112,108,101,109,101,110,116,101,100,32,121,101,116,0] /* CCIR601 sampling not */, "i8", ALLOC_NONE, 5252688);
allocate([32,97,116,58,32,40,0] /*  at: (\00 */, "i8", ALLOC_NONE, 5252728);
allocate([83,117,115,112,101,110,115,105,111,110,32,110,111,116,32,97,108,108,111,119,101,100,32,104,101,114,101,0] /* Suspension not allow */, "i8", ALLOC_NONE, 5252736);
allocate([32,91,116,121,112,101,58,32,0] /*  [type: \00 */, "i8", ALLOC_NONE, 5252764);
allocate([66,117,102,102,101,114,32,112,97,115,115,101,100,32,116,111,32,74,80,69,71,32,108,105,98,114,97,114,121,32,105,115,32,116,111,111,32,115,109,97,108,108,0] /* Buffer passed to JPE */, "i8", ALLOC_NONE, 5252776);
allocate([66,111,103,117,115,32,118,105,114,116,117,97,108,32,97,114,114,97,121,32,97,99,99,101,115,115,0] /* Bogus virtual array  */, "i8", ALLOC_NONE, 5252820);
allocate([37,112,0] /* %p\00 */, "i8", ALLOC_NONE, 5252848);
allocate([69,114,114,111,114,32,114,101,97,100,105,110,103,32,0] /* Error reading \00 */, "i8", ALLOC_NONE, 5252852);
allocate([74,80,69,71,32,112,97,114,97,109,101,116,101,114,32,115,116,114,117,99,116,32,109,105,115,109,97,116,99,104,58,32,108,105,98,114,97,114,121,32,116,104,105,110,107,115,32,115,105,122,101,32,105,115,32,37,117,44,32,99,97,108,108,101,114,32,101,120,112,101,99,116,115,32,37,117,0] /* JPEG parameter struc */, "i8", ALLOC_NONE, 5252868);
allocate([37,115,10,0] /* %s\0A\00 */, "i8", ALLOC_NONE, 5252948);
allocate([73,109,112,114,111,112,101,114,32,99,97,108,108,32,116,111,32,74,80,69,71,32,108,105,98,114,97,114,121,32,105,110,32,115,116,97,116,101,32,37,100,0] /* Improper call to JPE */, "i8", ALLOC_NONE, 5252952);
allocate([105,111,115,95,98,97,115,101,58,58,99,108,101,97,114,0] /* ios_base::clear\00 */, "i8", ALLOC_NONE, 5252996);
allocate([87,114,105,116,105,110,103,32,117,110,109,111,100,105,102,105,101,100,32,68,67,84,32,98,117,102,102,101,114,46,0] /* Writing unmodified D */, "i8", ALLOC_NONE, 5253012);
allocate([117,110,114,101,103,105,115,116,101,114,67,111,100,101,99,58,32,110,111,32,99,111,100,101,99,115,44,32,117,110,114,101,103,105,115,116,101,114,32,105,109,112,111,115,115,105,98,108,101,33,0] /* unregisterCodec: no  */, "i8", ALLOC_NONE, 5253044);
allocate([58,0] /* :\00 */, "i8", ALLOC_NONE, 5253096);
allocate([44,32,98,112,112,58,0] /* , bpp:\00 */, "i8", ALLOC_NONE, 5253100);
allocate([85,115,97,103,101,58,0] /* Usage:\00 */, "i8", ALLOC_NONE, 5253108);
allocate([73,110,118,97,108,105,100,32,115,99,97,110,32,115,99,114,105,112,116,32,97,116,32,101,110,116,114,121,32,37,100,0] /* Invalid scan script  */, "i8", ALLOC_NONE, 5253116);
allocate([32,32,32,32,45,32,67,111,112,121,114,105,103,104,116,32,50,48,48,55,32,98,121,32,76,97,114,115,32,75,117,104,116,122,44,32,69,120,97,99,116,67,79,68,69,0] /*     - Copyright 2007 */, "i8", ALLOC_NONE, 5253148);
allocate([32,115,112,101,99,105,102,105,101,100,33,0] /*  specified!\00 */, "i8", ALLOC_NONE, 5253196);
allocate([66,111,103,117,115,32,115,97,109,112,108,105,110,103,32,102,97,99,116,111,114,115,0] /* Bogus sampling facto */, "i8", ALLOC_NONE, 5253208);
allocate([32,32,32,32,45,32,67,111,112,121,114,105,103,104,116,32,50,48,48,55,45,50,48,49,48,32,98,121,32,82,101,110,195,169,32,82,101,98,101,44,32,69,120,97,99,116,67,79,68,69,0] /*     - Copyright 2007 */, "i8", ALLOC_NONE, 5253232);
allocate([73,110,118,97,108,105,100,32,112,114,111,103,114,101,115,115,105,118,101,32,112,97,114,97,109,101,116,101,114,115,32,97,116,32,115,99,97,110,32,115,99,114,105,112,116,32,101,110,116,114,121,32,37,100,0] /* Invalid progressive  */, "i8", ALLOC_NONE, 5253284);
allocate([98,97,114,99,111,100,101,32,114,101,99,111,103,110,105,116,105,111,110,32,109,111,100,117,108,101,32,111,102,32,116,104,101,32,101,120,97,99,116,45,105,109,97,103,101,32,108,105,98,114,97,114,121,0] /* barcode recognition  */, "i8", ALLOC_NONE, 5253340);
allocate([73,110,118,97,108,105,100,32,112,114,111,103,114,101,115,115,105,118,101,32,112,97,114,97,109,101,116,101,114,115,32,83,115,61,37,100,32,83,101,61,37,100,32,65,104,61,37,100,32,65,108,61,37,100,0] /* Invalid progressive  */, "i8", ALLOC_NONE, 5253396);
allocate([65,76,73,71,78,95,84,89,80,69,32,105,115,32,119,114,111,110,103,44,32,112,108,101,97,115,101,32,102,105,120,0] /* ALIGN_TYPE is wrong, */, "i8", ALLOC_NONE, 5253452);
allocate([67,0] /* C\00 */, "i8", ALLOC_NONE, 5253484);
allocate([83,79,83,0] /* SOS\00 */, "i8", ALLOC_NONE, 5253488);
allocate([9,9,0] /* \09\09\00 */, "i8", ALLOC_NONE, 5253492);
allocate([98,105,116,102,105,101,108,100,32,111,102,32,100,105,114,101,99,116,105,111,110,115,32,116,111,32,98,101,32,115,99,97,110,110,101,100,32,40,48,32,110,111,110,101,44,49,32,108,101,102,116,45,116,111,45,114,105,103,104,116,44,50,32,116,111,112,45,100,111,119,110,44,32,52,32,114,105,103,104,116,45,116,111,45,108,101,102,116,44,32,56,45,100,111,119,110,45,116,111,112,44,32,49,53,32,97,110,121,41,0] /* bitfield of directio */, "i8", ALLOC_NONE, 5253496);
allocate([85,110,115,117,112,112,111,114,116,101,100,32,74,80,69,71,32,100,97,116,97,32,112,114,101,99,105,115,105,111,110,32,37,100,0] /* Unsupported JPEG dat */, "i8", ALLOC_NONE, 5253608);
allocate([45,45,0] /* --\00 */, "i8", ALLOC_NONE, 5253644);
allocate([115,116,100,58,58,98,97,100,95,99,97,115,116,0] /* std::bad_cast\00 */, "i8", ALLOC_NONE, 5253648);
allocate([83,97,116,0] /* Sat\00 */, "i8", ALLOC_NONE, 5253664);
allocate([70,114,105,0] /* Fri\00 */, "i8", ALLOC_NONE, 5253668);
allocate([100,105,114,101,99,116,105,111,110,115,0] /* directions\00 */, "i8", ALLOC_NONE, 5253672);
allocate([84,104,117,0] /* Thu\00 */, "i8", ALLOC_NONE, 5253684);
allocate([87,101,100,0] /* Wed\00 */, "i8", ALLOC_NONE, 5253688);
allocate([73,110,118,97,108,105,100,32,109,101,109,111,114,121,32,112,111,111,108,32,99,111,100,101,32,37,100,0] /* Invalid memory pool  */, "i8", ALLOC_NONE, 5253692);
allocate([84,117,101,0] /* Tue\00 */, "i8", ALLOC_NONE, 5253720);
allocate([77,111,110,0] /* Mon\00 */, "i8", ALLOC_NONE, 5253724);
allocate([83,117,110,0] /* Sun\00 */, "i8", ALLOC_NONE, 5253728);
allocate([83,97,116,117,114,100,97,121,0] /* Saturday\00 */, "i8", ALLOC_NONE, 5253732);
allocate([105,111,115,116,114,101,97,109,0] /* iostream\00 */, "i8", ALLOC_NONE, 5253744);
allocate([70,114,105,100,97,121,0] /* Friday\00 */, "i8", ALLOC_NONE, 5253756);
allocate([32,32,32,32,32,32,0] /*       \00 */, "i8", ALLOC_NONE, 5253764);
allocate([84,104,117,114,115,100,97,121,0] /* Thursday\00 */, "i8", ALLOC_NONE, 5253772);
allocate([87,101,100,110,101,115,100,97,121,0] /* Wednesday\00 */, "i8", ALLOC_NONE, 5253784);
allocate([84,117,101,115,100,97,121,0] /* Tuesday\00 */, "i8", ALLOC_NONE, 5253796);
allocate([77,111,110,100,97,121,0] /* Monday\00 */, "i8", ALLOC_NONE, 5253804);
allocate([83,117,110,100,97,121,0] /* Sunday\00 */, "i8", ALLOC_NONE, 5253812);
allocate([83,97,109,112,108,105,110,103,32,102,97,99,116,111,114,115,32,116,111,111,32,108,97,114,103,101,32,102,111,114,32,105,110,116,101,114,108,101,97,118,101,100,32,115,99,97,110,0] /* Sampling factors too */, "i8", ALLOC_NONE, 5253820);
allocate([83,0,0,0,97,0,0,0,116,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5253868);
allocate([70,0,0,0,114,0,0,0,105,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5253884);
allocate([84,0,0,0,104,0,0,0,117,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5253900);
allocate([87,0,0,0,101,0,0,0,100,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5253916);
allocate([84,0,0,0,117,0,0,0,101,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5253932);
allocate([117,110,107,110,111,119,110,32,98,97,114,99,111,100,101,32,116,121,112,101,0] /* unknown barcode type */, "i8", ALLOC_NONE, 5253948);
allocate([77,0,0,0,111,0,0,0,110,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5253972);
allocate([83,0,0,0,117,0,0,0,110,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5253988);
allocate([110,117,109,98,101,114,32,111,102,32,108,105,110,101,115,32,116,104,97,116,32,97,114,101,32,115,107,105,112,112,101,100,0] /* number of lines that */, "i8", ALLOC_NONE, 5254004);
allocate([83,0,0,0,97,0,0,0,116,0,0,0,117,0,0,0,114,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5254040);
allocate([70,0,0,0,114,0,0,0,105,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5254076);
allocate([87,114,111,110,103,32,74,80,69,71,32,108,105,98,114,97,114,121,32,118,101,114,115,105,111,110,58,32,108,105,98,114,97,114,121,32,105,115,32,37,100,44,32,99,97,108,108,101,114,32,101,120,112,101,99,116,115,32,37,100,0] /* Wrong JPEG library v */, "i8", ALLOC_NONE, 5254104);
allocate([84,0,0,0,104,0,0,0,117,0,0,0,114,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5254168);
allocate([87,0,0,0,101,0,0,0,100,0,0,0,110,0,0,0,101,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5254204);
allocate([84,0,0,0,117,0,0,0,101,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5254244);
allocate([77,0,0,0,111,0,0,0,110,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5254276);
allocate([83,0,0,0,117,0,0,0,110,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5254304);
allocate([32,32,45,0] /*   -\00 */, "i8", ALLOC_NONE, 5254332);
allocate([99,111,100,101,50,53,105,0] /* code25i\00 */, "i8", ALLOC_NONE, 5254336);
allocate([68,101,99,0] /* Dec\00 */, "i8", ALLOC_NONE, 5254344);
allocate([78,111,118,0] /* Nov\00 */, "i8", ALLOC_NONE, 5254348);
allocate([108,105,110,101,45,115,107,105,112,0] /* line-skip\00 */, "i8", ALLOC_NONE, 5254352);
allocate([79,99,116,0] /* Oct\00 */, "i8", ALLOC_NONE, 5254364);
allocate([83,101,112,0] /* Sep\00 */, "i8", ALLOC_NONE, 5254368);
allocate([66,111,103,117,115,32,109,97,114,107,101,114,32,108,101,110,103,116,104,0] /* Bogus marker length\ */, "i8", ALLOC_NONE, 5254372);
allocate([65,117,103,0] /* Aug\00 */, "i8", ALLOC_NONE, 5254392);
allocate([65,112,112,108,105,99,97,116,105,111,110,32,116,114,97,110,115,102,101,114,114,101,100,32,116,111,111,32,109,97,110,121,32,115,99,97,110,108,105,110,101,115,0] /* Application transfer */, "i8", ALLOC_NONE, 5254396);
allocate([74,117,108,0] /* Jul\00 */, "i8", ALLOC_NONE, 5254440);
allocate([73,110,118,97,108,105,100,32,83,79,83,32,112,97,114,97,109,101,116,101,114,115,32,102,111,114,32,115,101,113,117,101,110,116,105,97,108,32,74,80,69,71,0] /* Invalid SOS paramete */, "i8", ALLOC_NONE, 5254444);
allocate([114,101,99,111,109,112,114,101,115,115,0] /* recompress\00 */, "i8", ALLOC_NONE, 5254488);
allocate([74,117,110,0] /* Jun\00 */, "i8", ALLOC_NONE, 5254500);
allocate([67,111,114,114,117,112,116,32,74,80,69,71,32,100,97,116,97,58,32,102,111,117,110,100,32,109,97,114,107,101,114,32,48,120,37,48,50,120,32,105,110,115,116,101,97,100,32,111,102,32,82,83,84,37,100,0] /* Corrupt JPEG data: f */, "i8", ALLOC_NONE, 5254504);
allocate([65,112,114,0] /* Apr\00 */, "i8", ALLOC_NONE, 5254560);
allocate([80,114,101,109,97,116,117,114,101,32,101,110,100,32,111,102,32,74,80,69,71,32,102,105,108,101,0] /* Premature end of JPE */, "i8", ALLOC_NONE, 5254564);
allocate([101,97,110,56,0] /* ean8\00 */, "i8", ALLOC_NONE, 5254592);
allocate([77,97,114,0] /* Mar\00 */, "i8", ALLOC_NONE, 5254600);
allocate([87,97,114,110,105,110,103,58,32,117,110,107,110,111,119,110,32,74,70,73,70,32,114,101,118,105,115,105,111,110,32,110,117,109,98,101,114,32,37,100,46,37,48,50,100,0] /* Warning: unknown JFI */, "i8", ALLOC_NONE, 5254604);
allocate([70,101,98,0] /* Feb\00 */, "i8", ALLOC_NONE, 5254652);
allocate([69,114,114,111,114,58,32,85,110,114,101,99,111,103,110,105,122,101,100,32,97,114,103,117,109,101,110,116,58,32,0] /* Error: Unrecognized  */, "i8", ALLOC_NONE, 5254656);
allocate([67,111,114,114,117,112,116,32,74,80,69,71,32,100,97,116,97,58,32,98,97,100,32,72,117,102,102,109,97,110,32,99,111,100,101,0] /* Corrupt JPEG data: b */, "i8", ALLOC_NONE, 5254688);
allocate([74,97,110,0] /* Jan\00 */, "i8", ALLOC_NONE, 5254724);
allocate([99,111,100,101,51,57,95,101,120,116,0] /* code39_ext\00 */, "i8", ALLOC_NONE, 5254728);
allocate([67,111,114,114,117,112,116,32,74,80,69,71,32,100,97,116,97,58,32,112,114,101,109,97,116,117,114,101,32,101,110,100,32,111,102,32,100,97,116,97,32,115,101,103,109,101,110,116,0] /* Corrupt JPEG data: p */, "i8", ALLOC_NONE, 5254740);
allocate([117,110,104,97,110,100,108,101,100,32,115,112,112,47,98,112,115,32,105,110,32,0] /* unhandled spp/bps in */, "i8", ALLOC_NONE, 5254792);
allocate([58,32,0] /* : \00 */, "i8", ALLOC_NONE, 5254816);
allocate([68,101,99,101,109,98,101,114,0] /* December\00 */, "i8", ALLOC_NONE, 5254820);
allocate([67,111,114,114,117,112,116,32,74,80,69,71,32,100,97,116,97,58,32,37,117,32,101,120,116,114,97,110,101,111,117,115,32,98,121,116,101,115,32,98,101,102,111,114,101,32,109,97,114,107,101,114,32,48,120,37,48,50,120,0] /* Corrupt JPEG data: % */, "i8", ALLOC_NONE, 5254832);
allocate([78,111,118,101,109,98,101,114,0] /* November\00 */, "i8", ALLOC_NONE, 5254892);
allocate([73,110,99,111,110,115,105,115,116,101,110,116,32,112,114,111,103,114,101,115,115,105,111,110,32,115,101,113,117,101,110,99,101,32,102,111,114,32,99,111,109,112,111,110,101,110,116,32,37,100,32,99,111,101,102,102,105,99,105,101,110,116,32,37,100,0] /* Inconsistent progres */, "i8", ALLOC_NONE, 5254904);
allocate([102,108,105,112,88,58,32,117,110,115,117,112,112,111,114,116,101,100,32,100,101,112,116,104,46,0] /* flipX: unsupported d */, "i8", ALLOC_NONE, 5254972);
allocate([79,99,116,111,98,101,114,0] /* October\00 */, "i8", ALLOC_NONE, 5255000);
allocate([67,111,114,114,117,112,116,32,74,80,69,71,32,100,97,116,97,58,32,98,97,100,32,97,114,105,116,104,109,101,116,105,99,32,99,111,100,101,0] /* Corrupt JPEG data: b */, "i8", ALLOC_NONE, 5255008);
allocate([66,111,103,117,115,32,74,80,69,71,32,99,111,108,111,114,115,112,97,99,101,0] /* Bogus JPEG colorspac */, "i8", ALLOC_NONE, 5255048);
allocate([83,101,112,116,101,109,98,101,114,0] /* September\00 */, "i8", ALLOC_NONE, 5255072);
allocate([85,110,107,110,111,119,110,32,65,100,111,98,101,32,99,111,108,111,114,32,116,114,97,110,115,102,111,114,109,32,99,111,100,101,32,37,100,0] /* Unknown Adobe color  */, "i8", ALLOC_NONE, 5255084);
allocate([65,117,103,117,115,116,0] /* August\00 */, "i8", ALLOC_NONE, 5255124);
allocate([79,98,116,97,105,110,101,100,32,88,77,83,32,104,97,110,100,108,101,32,37,117,0] /* Obtained XMS handle  */, "i8", ALLOC_NONE, 5255132);
allocate([117,110,115,112,101,99,105,102,105,101,100,32,105,111,115,116,114,101,97,109,95,99,97,116,101,103,111,114,121,32,101,114,114,111,114,0] /* unspecified iostream */, "i8", ALLOC_NONE, 5255156);
allocate([74,117,108,121,0] /* July\00 */, "i8", ALLOC_NONE, 5255192);
allocate([70,114,101,101,100,32,88,77,83,32,104,97,110,100,108,101,32,37,117,0] /* Freed XMS handle %u\ */, "i8", ALLOC_NONE, 5255200);
allocate([74,117,110,101,0] /* June\00 */, "i8", ALLOC_NONE, 5255220);
allocate([85,110,114,101,99,111,103,110,105,122,101,100,32,99,111,109,112,111,110,101,110,116,32,73,68,115,32,37,100,32,37,100,32,37,100,44,32,97,115,115,117,109,105,110,103,32,89,67,98,67,114,0] /* Unrecognized compone */, "i8", ALLOC_NONE, 5255228);
allocate([77,97,121,0] /* May\00 */, "i8", ALLOC_NONE, 5255280);
allocate([74,70,73,70,32,101,120,116,101,110,115,105,111,110,32,109,97,114,107,101,114,58,32,82,71,66,32,116,104,117,109,98,110,97,105,108,32,105,109,97,103,101,44,32,108,101,110,103,116,104,32,37,117,0] /* JFIF extension marke */, "i8", ALLOC_NONE, 5255284);
allocate([82,101,45,101,110,99,111,100,105,110,103,32,68,67,84,32,99,111,101,102,102,105,99,105,101,110,116,115,32,40,100,117,101,32,109,101,116,97,32,99,104,97,110,103,101,115,41,46,0] /* Re-encoding DCT coef */, "i8", ALLOC_NONE, 5255340);
allocate([65,112,114,105,108,0] /* April\00 */, "i8", ALLOC_NONE, 5255392);
allocate([45,0] /* -\00 */, "i8", ALLOC_NONE, 5255400);
allocate([108,105,98,47,73,109,97,103,101,73,116,101,114,97,116,111,114,46,104,104,0] /* lib/ImageIterator.hh */, "i8", ALLOC_NONE, 5255404);
allocate([114,111,116,57,48,58,32,117,110,115,117,112,112,111,114,116,101,100,32,100,101,112,116,104,46,32,115,112,112,58,32,0] /* rot90: unsupported d */, "i8", ALLOC_NONE, 5255428);
allocate([74,70,73,70,32,101,120,116,101,110,115,105,111,110,32,109,97,114,107,101,114,58,32,112,97,108,101,116,116,101,32,116,104,117,109,98,110,97,105,108,32,105,109,97,103,101,44,32,108,101,110,103,116,104,32,37,117,0] /* JFIF extension marke */, "i8", ALLOC_NONE, 5255460);
allocate([32,109,97,116,99,104,101,115,32,97,110,32,97,114,103,117,109,101,110,116,0] /*  matches an argument */, "i8", ALLOC_NONE, 5255520);
allocate([106,112,103,0] /* jpg\00 */, "i8", ALLOC_NONE, 5255544);
allocate([99,111,100,101,51,57,95,109,111,100,52,51,0] /* code39_mod43\00 */, "i8", ALLOC_NONE, 5255548);
allocate([114,98,0] /* rb\00 */, "i8", ALLOC_NONE, 5255564);
allocate([77,97,114,99,104,0] /* March\00 */, "i8", ALLOC_NONE, 5255568);
allocate([74,70,73,70,32,101,120,116,101,110,115,105,111,110,32,109,97,114,107,101,114,58,32,74,80,69,71,45,99,111,109,112,114,101,115,115,101,100,32,116,104,117,109,98,110,97,105,108,32,105,109,97,103,101,44,32,108,101,110,103,116,104,32,37,117,0] /* JFIF extension marke */, "i8", ALLOC_NONE, 5255576);
allocate([70,101,98,114,117,97,114,121,0] /* February\00 */, "i8", ALLOC_NONE, 5255644);
allocate([37,108,100,37,99,0] /* %ld%c\00 */, "i8", ALLOC_NONE, 5255656);
allocate([69,114,114,111,114,58,32,78,111,32,112,97,114,97,109,101,116,101,114,32,102,111,114,32,97,114,103,117,109,101,110,116,32,0] /* Error: No parameter  */, "i8", ALLOC_NONE, 5255664);
allocate([110,117,109,98,101,114,32,111,102,32,108,105,110,101,115,32,116,104,97,116,32,97,114,101,32,115,99,97,110,110,101,100,32,99,111,110,99,117,114,114,101,110,116,108,121,0] /* number of lines that */, "i8", ALLOC_NONE, 5255700);
allocate([79,112,101,110,101,100,32,116,101,109,112,111,114,97,114,121,32,102,105,108,101,32,37,115,0] /* Opened temporary fil */, "i8", ALLOC_NONE, 5255748);
allocate([74,97,110,117,97,114,121,0] /* January\00 */, "i8", ALLOC_NONE, 5255776);
allocate([67,108,111,115,101,100,32,116,101,109,112,111,114,97,114,121,32,102,105,108,101,32,37,115,0] /* Closed temporary fil */, "i8", ALLOC_NONE, 5255784);
allocate([32,32,83,115,61,37,100,44,32,83,101,61,37,100,44,32,65,104,61,37,100,44,32,65,108,61,37,100,0] /*   Ss=%d, Se=%d, Ah=% */, "i8", ALLOC_NONE, 5255812);
allocate([66,111,103,117,115,32,105,110,112,117,116,32,99,111,108,111,114,115,112,97,99,101,0] /* Bogus input colorspa */, "i8", ALLOC_NONE, 5255844);
allocate([68,0,0,0,101,0,0,0,99,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5255868);
allocate([32,32,32,32,67,111,109,112,111,110,101,110,116,32,37,100,58,32,100,99,61,37,100,32,97,99,61,37,100,0] /*     Component %d: dc */, "i8", ALLOC_NONE, 5255884);
allocate([78,0,0,0,111,0,0,0,118,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5255916);
allocate([83,116,97,114,116,32,79,102,32,83,99,97,110,58,32,37,100,32,99,111,109,112,111,110,101,110,116,115,0] /* Start Of Scan: %d co */, "i8", ALLOC_NONE, 5255932);
allocate([79,0,0,0,99,0,0,0,116,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5255964);
allocate([83,116,97,114,116,32,111,102,32,73,109,97,103,101,0] /* Start of Image\00 */, "i8", ALLOC_NONE, 5255980);
allocate([83,0,0,0,101,0,0,0,112,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5255996);
allocate([32,32,32,32,67,111,109,112,111,110,101,110,116,32,37,100,58,32,37,100,104,120,37,100,118,32,113,61,37,100,0] /*     Component %d: %d */, "i8", ALLOC_NONE, 5256012);
allocate([65,0,0,0,117,0,0,0,103,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5256044);
allocate([83,116,97,114,116,32,79,102,32,70,114,97,109,101,32,48,120,37,48,50,120,58,32,119,105,100,116,104,61,37,117,44,32,104,101,105,103,104,116,61,37,117,44,32,99,111,109,112,111,110,101,110,116,115,61,37,100,0] /* Start Of Frame 0x%02 */, "i8", ALLOC_NONE, 5256060);
allocate([74,0,0,0,117,0,0,0,108,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5256120);
allocate([83,109,111,111,116,104,105,110,103,32,110,111,116,32,115,117,112,112,111,114,116,101,100,32,119,105,116,104,32,110,111,110,115,116,97,110,100,97,114,100,32,115,97,109,112,108,105,110,103,32,114,97,116,105,111,115,0] /* Smoothing not suppor */, "i8", ALLOC_NONE, 5256136);
allocate([87,97,114,110,105,110,103,58,32,82,101,115,105,100,117,97,108,32,112,97,114,97,109,101,116,101,114,32,0] /* Warning: Residual pa */, "i8", ALLOC_NONE, 5256196);
allocate([106,112,101,103,0] /* jpeg\00 */, "i8", ALLOC_NONE, 5256228);
allocate([99,111,100,101,51,57,0] /* code39\00 */, "i8", ALLOC_NONE, 5256236);
allocate([74,0,0,0,117,0,0,0,110,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5256244);
allocate([82,83,84,37,100,0] /* RST%d\00 */, "i8", ALLOC_NONE, 5256260);
allocate([74,80,69,71,77,69,77,0] /* JPEGMEM\00 */, "i8", ALLOC_NONE, 5256268);
allocate([77,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5256276);
allocate([99,111,110,99,117,114,114,101,110,116,45,108,105,110,101,115,0] /* concurrent-lines\00 */, "i8", ALLOC_NONE, 5256292);
allocate([69,114,114,111,114,58,32,78,111,32,112,97,114,97,109,101,116,101,114,32,97,108,108,111,119,101,100,32,102,111,114,32,98,111,111,108,101,97,110,32,118,97,108,117,101,115,33,0] /* Error: No parameter  */, "i8", ALLOC_NONE, 5256312);
allocate(472, "i8", ALLOC_NONE, 5256360);
allocate([115,116,100,58,58,112,97,105,114,60,109,111,100,117,108,101,95,119,111,114,100,95,116,44,32,109,111,100,117,108,101,95,119,111,114,100,95,116,62,32,66,97,114,68,101,99,111,100,101,58,58,99,111,100,101,50,53,105,95,116,58,58,103,101,116,95,107,101,121,115,40,99,111,110,115,116,32,66,97,114,68,101,99,111,100,101,58,58,98,97,114,95,118,101,99,116,111,114,95,116,32,38,41,32,99,111,110,115,116,0] /* std::pair_module_wor */, "i8", ALLOC_NONE, 5256832);
allocate([98,111,111,108,32,66,97,114,68,101,99,111,100,101,58,58,99,111,100,101,50,53,105,95,116,58,58,114,101,118,101,114,115,101,95,99,104,101,99,107,95,98,97,114,95,118,101,99,116,111,114,40,99,111,110,115,116,32,66,97,114,68,101,99,111,100,101,58,58,98,97,114,95,118,101,99,116,111,114,95,116,32,38,44,32,112,115,105,122,101,95,116,44,32,100,111,117,98,108,101,41,32,99,111,110,115,116,0] /* bool BarDecode::code */, "i8", ALLOC_NONE, 5256944);
allocate([115,116,100,58,58,112,97,105,114,60,109,111,100,117,108,101,95,119,111,114,100,95,116,44,32,109,111,100,117,108,101,95,119,111,114,100,95,116,62,32,66,97,114,68,101,99,111,100,101,58,58,99,111,100,101,50,53,105,95,116,58,58,114,101,118,101,114,115,101,95,103,101,116,95,107,101,121,115,40,99,111,110,115,116,32,66,97,114,68,101,99,111,100,101,58,58,98,97,114,95,118,101,99,116,111,114,95,116,32,38,41,32,99,111,110,115,116,0] /* std::pair_module_wor */, "i8", ALLOC_NONE, 5257052);
allocate([98,111,111,108,32,66,97,114,68,101,99,111,100,101,58,58,99,111,100,101,50,53,105,95,116,58,58,99,104,101,99,107,95,98,97,114,95,118,101,99,116,111,114,40,99,111,110,115,116,32,66,97,114,68,101,99,111,100,101,58,58,98,97,114,95,118,101,99,116,111,114,95,116,32,38,44,32,112,115,105,122,101,95,116,44,32,100,111,117,98,108,101,41,32,99,111,110,115,116,0] /* bool BarDecode::code */, "i8", ALLOC_NONE, 5257172);
allocate([115,116,100,58,58,115,116,114,105,110,103,32,66,97,114,68,101,99,111,100,101,58,58,99,111,100,101,49,50,56,95,116,58,58,100,101,99,111,100,101,49,50,56,40,66,97,114,68,101,99,111,100,101,58,58,99,111,100,101,49,50,56,95,116,58,58,99,111,100,101,95,115,101,116,95,116,44,32,109,111,100,117,108,101,95,119,111,114,100,95,116,41,32,99,111,110,115,116,0] /* std::string BarDecod */, "i8", ALLOC_NONE, 5257272);
allocate([109,111,100,117,108,101,95,119,111,114,100,95,116,32,66,97,114,68,101,99,111,100,101,58,58,99,111,100,101,51,57,95,116,58,58,103,101,116,95,107,101,121,40,99,111,110,115,116,32,66,97,114,68,101,99,111,100,101,58,58,98,97,114,95,118,101,99,116,111,114,95,116,32,38,41,32,99,111,110,115,116,0] /* module_word_t BarDec */, "i8", ALLOC_NONE, 5257372);
allocate([98,111,111,108,32,66,97,114,68,101,99,111,100,101,58,58,99,111,100,101,51,57,95,116,58,58,99,104,101,99,107,95,98,97,114,95,118,101,99,116,111,114,40,99,111,110,115,116,32,66,97,114,68,101,99,111,100,101,58,58,98,97,114,95,118,101,99,116,111,114,95,116,32,38,44,32,112,115,105,122,101,95,116,41,32,99,111,110,115,116,0] /* bool BarDecode::code */, "i8", ALLOC_NONE, 5257456);
allocate([109,111,100,117,108,101,95,119,111,114,100,95,116,32,66,97,114,68,101,99,111,100,101,58,58,99,111,100,101,51,57,95,116,58,58,114,101,118,101,114,115,101,95,103,101,116,95,107,101,121,40,99,111,110,115,116,32,66,97,114,68,101,99,111,100,101,58,58,98,97,114,95,118,101,99,116,111,114,95,116,32,38,41,32,99,111,110,115,116,0] /* module_word_t BarDec */, "i8", ALLOC_NONE, 5257548);
allocate([118,111,105,100,32,66,97,114,68,101,99,111,100,101,58,58,84,111,107,101,110,105,122,101,114,60,116,114,117,101,62,58,58,110,101,120,116,95,108,105,110,101,40,115,116,100,58,58,118,101,99,116,111,114,60,116,111,107,101,110,95,116,62,32,38,41,32,91,118,101,114,116,105,99,97,108,32,61,32,116,114,117,101,93,0] /* void BarDecode::Toke */, "i8", ALLOC_NONE, 5257640);
allocate([118,111,105,100,32,66,97,114,68,101,99,111,100,101,58,58,84,111,107,101,110,105,122,101,114,60,102,97,108,115,101,62,58,58,110,101,120,116,95,108,105,110,101,40,115,116,100,58,58,118,101,99,116,111,114,60,116,111,107,101,110,95,116,62,32,38,41,32,91,118,101,114,116,105,99,97,108,32,61,32,102,97,108,115,101,93,0] /* void BarDecode::Toke */, "i8", ALLOC_NONE, 5257728);
allocate([66,97,114,68,101,99,111,100,101,58,58,115,99,97,110,110,101,114,95,114,101,115,117,108,116,95,116,32,66,97,114,68,101,99,111,100,101,58,58,101,97,110,95,116,58,58,115,99,97,110,40,84,73,84,32,38,44,32,84,73,84,44,32,112,111,115,95,116,44,32,112,111,115,95,116,44,32,112,115,105,122,101,95,116,44,32,66,97,114,68,101,99,111,100,101,58,58,100,105,114,101,99,116,105,111,110,115,95,116,41,32,91,84,73,84,32,61,32,115,116,100,58,58,95,95,49,58,58,95,95,119,114,97,112,95,105,116,101,114,60,99,111,110,115,116,32,115,116,100,58,58,95,95,49,58,58,112,97,105,114,60,98,111,111,108,44,32,117,110,115,105,103,110,101,100,32,105,110,116,62,32,42,62,93,0] /* BarDecode::scanner_r */, "i8", ALLOC_NONE, 5257816);
allocate([115,101,108,102,95,116,32,38,66,97,114,68,101,99,111,100,101,58,58,66,97,114,99,111,100,101,73,116,101,114,97,116,111,114,60,116,114,117,101,62,58,58,111,112,101,114,97,116,111,114,43,43,40,41,32,91,118,101,114,116,105,99,97,108,32,61,32,116,114,117,101,93,0] /* self_t &BarDecode::B */, "i8", ALLOC_NONE, 5258004);
allocate([118,111,105,100,32,66,97,114,68,101,99,111,100,101,58,58,66,97,114,99,111,100,101,73,116,101,114,97,116,111,114,60,116,114,117,101,62,58,58,110,101,120,116,40,41,32,91,118,101,114,116,105,99,97,108,32,61,32,116,114,117,101,93,0] /* void BarDecode::Barc */, "i8", ALLOC_NONE, 5258080);
allocate([115,101,108,102,95,116,32,38,66,97,114,68,101,99,111,100,101,58,58,66,97,114,99,111,100,101,73,116,101,114,97,116,111,114,60,102,97,108,115,101,62,58,58,111,112,101,114,97,116,111,114,43,43,40,41,32,91,118,101,114,116,105,99,97,108,32,61,32,102,97,108,115,101,93,0] /* self_t &BarDecode::B */, "i8", ALLOC_NONE, 5258144);
allocate([118,111,105,100,32,66,97,114,68,101,99,111,100,101,58,58,66,97,114,99,111,100,101,73,116,101,114,97,116,111,114,60,102,97,108,115,101,62,58,58,110,101,120,116,40,41,32,91,118,101,114,116,105,99,97,108,32,61,32,102,97,108,115,101,93,0] /* void BarDecode::Barc */, "i8", ALLOC_NONE, 5258220);
allocate([109,111,100,117,108,101,95,119,111,114,100,95,116,32,66,97,114,68,101,99,111,100,101,58,58,60,97,110,111,110,121,109,111,117,115,32,110,97,109,101,115,112,97,99,101,62,58,58,115,99,97,110,110,101,114,95,117,116,105,108,105,116,105,101,115,58,58,114,101,118,101,114,115,101,95,103,101,116,95,109,111,100,117,108,101,95,119,111,114,100,40,99,111,110,115,116,32,66,97,114,68,101,99,111,100,101,58,58,98,97,114,95,118,101,99,116,111,114,95,116,32,38,44,32,117,95,116,44,32,117,115,105,122,101,95,116,41,0] /* module_word_t BarDec */, "i8", ALLOC_NONE, 5258288);
allocate([109,111,100,117,108,101,95,119,111,114,100,95,116,32,66,97,114,68,101,99,111,100,101,58,58,60,97,110,111,110,121,109,111,117,115,32,110,97,109,101,115,112,97,99,101,62,58,58,115,99,97,110,110,101,114,95,117,116,105,108,105,116,105,101,115,58,58,103,101,116,95,109,111,100,117,108,101,95,119,111,114,100,40,99,111,110,115,116,32,66,97,114,68,101,99,111,100,101,58,58,98,97,114,95,118,101,99,116,111,114,95,116,32,38,44,32,117,95,116,44,32,117,115,105,122,101,95,116,41,0] /* module_word_t BarDec */, "i8", ALLOC_NONE, 5258428);
allocate(288, "i8", ALLOC_NONE, 5258560);
allocate(168, "i8", ALLOC_NONE, 5258848);
allocate(288, "i8", ALLOC_NONE, 5259016);
allocate(288, "i8", ALLOC_NONE, 5259304);
allocate(168, "i8", ALLOC_NONE, 5259592);
allocate(288, "i8", ALLOC_NONE, 5259760);
allocate(4, "i8", ALLOC_NONE, 5260048);
allocate(4, "i8", ALLOC_NONE, 5260052);
allocate(4, "i8", ALLOC_NONE, 5260056);
allocate(4, "i8", ALLOC_NONE, 5260060);
allocate(4, "i8", ALLOC_NONE, 5260064);
allocate(4, "i8", ALLOC_NONE, 5260068);
allocate(8, "i8", ALLOC_NONE, 5260072);
allocate(8, "i8", ALLOC_NONE, 5260080);
allocate(8, "i8", ALLOC_NONE, 5260088);
allocate(8, "i8", ALLOC_NONE, 5260096);
allocate(12, "i8", ALLOC_NONE, 5260104);
allocate(12, "i8", ALLOC_NONE, 5260116);
allocate(12, "i8", ALLOC_NONE, 5260128);
allocate(12, "i8", ALLOC_NONE, 5260140);
allocate(28, "i8", ALLOC_NONE, 5260152);
allocate(24, "i8", ALLOC_NONE, 5260180);
allocate(8, "i8", ALLOC_NONE, 5260204);
allocate(8, "i8", ALLOC_NONE, 5260212);
allocate(8, "i8", ALLOC_NONE, 5260220);
allocate(8, "i8", ALLOC_NONE, 5260228);
allocate(8, "i8", ALLOC_NONE, 5260236);
allocate(8, "i8", ALLOC_NONE, 5260244);
allocate(8, "i8", ALLOC_NONE, 5260252);
allocate(8, "i8", ALLOC_NONE, 5260260);
allocate(12, "i8", ALLOC_NONE, 5260268);
allocate(8, "i8", ALLOC_NONE, 5260280);
allocate(8, "i8", ALLOC_NONE, 5260288);
allocate(8, "i8", ALLOC_NONE, 5260296);
allocate(148, "i8", ALLOC_NONE, 5260304);
allocate(8, "i8", ALLOC_NONE, 5260452);
allocate(16, "i8", ALLOC_NONE, 5260460);
allocate(8, "i8", ALLOC_NONE, 5260476);
allocate(8, "i8", ALLOC_NONE, 5260484);
allocate(8, "i8", ALLOC_NONE, 5260492);
allocate(8, "i8", ALLOC_NONE, 5260500);
allocate([48,49,50,51,52,53,54,55,56,57,0] /* 0123456789\00 */, "i8", ALLOC_NONE, 5260508);
allocate([48,49,50,51,52,53,54,55,56,57,0] /* 0123456789\00 */, "i8", ALLOC_NONE, 5260520);
allocate([37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0], "i8", ALLOC_NONE, 5260532);
allocate([37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0], "i8", ALLOC_NONE, 5260564);
allocate([37,0,0,0,73,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,112,0,0,0], "i8", ALLOC_NONE, 5260584);
allocate([37,0,0,0,89,0,0,0,45,0,0,0,37,0,0,0,109,0,0,0,45,0,0,0,37,0,0,0,100,0,0,0], "i8", ALLOC_NONE, 5260628);
allocate([37,0,0,0,109,0,0,0,47,0,0,0,37,0,0,0,100,0,0,0,47,0,0,0,37,0,0,0,121,0,0,0], "i8", ALLOC_NONE, 5260660);
allocate([37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0], "i8", ALLOC_NONE, 5260692);
allocate([37,72,58,37,77,58,37,83] /* %H:%M:%S */, "i8", ALLOC_NONE, 5260724);
allocate([37,72,58,37,77] /* %H:%M */, "i8", ALLOC_NONE, 5260732);
allocate([37,73,58,37,77,58,37,83,32,37,112] /* %I:%M:%S %p */, "i8", ALLOC_NONE, 5260740);
allocate([37,89,45,37,109,45,37,100] /* %Y-%m-%d */, "i8", ALLOC_NONE, 5260752);
allocate([37,109,47,37,100,47,37,121] /* %m/%d/%y */, "i8", ALLOC_NONE, 5260760);
allocate([37,72,58,37,77,58,37,83] /* %H:%M:%S */, "i8", ALLOC_NONE, 5260768);
allocate([37,0,0,0,0,0] /* %\00\00\00\00\00 */, "i8", ALLOC_NONE, 5260776);
allocate([37,112,0,0,0,0] /* %p\00\00\00\00 */, "i8", ALLOC_NONE, 5260784);
allocate(4, "i8", ALLOC_NONE, 5260792);
allocate(4, "i8", ALLOC_NONE, 5260796);
allocate(4, "i8", ALLOC_NONE, 5260800);
allocate(12, "i8", ALLOC_NONE, 5260804);
allocate(12, "i8", ALLOC_NONE, 5260816);
allocate(12, "i8", ALLOC_NONE, 5260828);
allocate(12, "i8", ALLOC_NONE, 5260840);
allocate(4, "i8", ALLOC_NONE, 5260852);
allocate(4, "i8", ALLOC_NONE, 5260856);
allocate(4, "i8", ALLOC_NONE, 5260860);
allocate(12, "i8", ALLOC_NONE, 5260864);
allocate(12, "i8", ALLOC_NONE, 5260876);
allocate(12, "i8", ALLOC_NONE, 5260888);
allocate(12, "i8", ALLOC_NONE, 5260900);
allocate(4, "i8", ALLOC_NONE, 5260912);
allocate([0,0,0,0,60,96,80,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5260916);
allocate(1, "i8", ALLOC_NONE, 5260936);
allocate([0,0,0,0,72,96,80,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5260940);
allocate(1, "i8", ALLOC_NONE, 5260960);
allocate([0,0,0,0,84,96,80,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5260964);
allocate(1, "i8", ALLOC_NONE, 5260984);
allocate([0,0,0,0,96,96,80,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5260988);
allocate(1, "i8", ALLOC_NONE, 5261008);
allocate([0,0,0,0,108,96,80,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261012);
allocate(1, "i8", ALLOC_NONE, 5261032);
allocate([0,0,0,0,120,96,80,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261036);
allocate(1, "i8", ALLOC_NONE, 5261056);
allocate([0,0,0,0,140,96,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261060);
allocate(1, "i8", ALLOC_NONE, 5261088);
allocate([0,0,0,0,172,96,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261092);
allocate(1, "i8", ALLOC_NONE, 5261120);
allocate([0,0,0,0,204,96,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261124);
allocate(1, "i8", ALLOC_NONE, 5261152);
allocate([0,0,0,0,236,96,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261156);
allocate(1, "i8", ALLOC_NONE, 5261184);
allocate([0,0,0,0,132,97,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261188);
allocate(1, "i8", ALLOC_NONE, 5261212);
allocate([0,0,0,0,164,97,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261216);
allocate(1, "i8", ALLOC_NONE, 5261240);
allocate([0,0,0,0,196,97,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,248,255,255,255,196,97,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261244);
allocate(1, "i8", ALLOC_NONE, 5261328);
allocate([0,0,0,0,236,97,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,248,255,255,255,236,97,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261332);
allocate(1, "i8", ALLOC_NONE, 5261416);
allocate([0,0,0,0,20,98,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261420);
allocate(1, "i8", ALLOC_NONE, 5261460);
allocate([0,0,0,0,32,98,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261464);
allocate(1, "i8", ALLOC_NONE, 5261504);
allocate([0,0,0,0,44,98,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261508);
allocate(1, "i8", ALLOC_NONE, 5261540);
allocate([0,0,0,0,76,98,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261544);
allocate(1, "i8", ALLOC_NONE, 5261576);
allocate([0,0,0,0,116,98,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261580);
allocate(1, "i8", ALLOC_NONE, 5261596);
allocate([0,0,0,0,124,98,80,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261600);
allocate(1, "i8", ALLOC_NONE, 5261620);
allocate([0,0,0,0,136,98,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261624);
allocate(1, "i8", ALLOC_NONE, 5261676);
allocate([0,0,0,0,168,98,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261680);
allocate(1, "i8", ALLOC_NONE, 5261732);
allocate([0,0,0,0,200,98,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261736);
allocate(1, "i8", ALLOC_NONE, 5261800);
allocate([0,0,0,0,232,98,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261804);
allocate(1, "i8", ALLOC_NONE, 5261868);
allocate([0,0,0,0,8,99,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261872);
allocate(1, "i8", ALLOC_NONE, 5261904);
allocate([0,0,0,0,20,99,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261908);
allocate(1, "i8", ALLOC_NONE, 5261940);
allocate([0,0,0,0,32,99,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261944);
allocate(1, "i8", ALLOC_NONE, 5261992);
allocate([0,0,0,0,64,99,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5261996);
allocate(1, "i8", ALLOC_NONE, 5262044);
allocate([0,0,0,0,96,99,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262048);
allocate(1, "i8", ALLOC_NONE, 5262096);
allocate([0,0,0,0,128,99,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262100);
allocate(1, "i8", ALLOC_NONE, 5262148);
allocate([0,0,0,0,160,99,80,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262152);
allocate(1, "i8", ALLOC_NONE, 5262172);
allocate([0,0,0,0,172,99,80,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262176);
allocate(1, "i8", ALLOC_NONE, 5262196);
allocate([0,0,0,0,184,99,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262200);
allocate(1, "i8", ALLOC_NONE, 5262268);
allocate([0,0,0,0,216,99,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262272);
allocate(1, "i8", ALLOC_NONE, 5262324);
allocate([0,0,0,0,8,100,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262328);
allocate(1, "i8", ALLOC_NONE, 5262364);
allocate([64,0,0,0,0,0,0,0,20,100,80,0,0,0,0,0,0,0,0,0,56,0,0,0,248,255,255,255,20,100,80,0,0,0,0,0,0,0,0,0,192,255,255,255,192,255,255,255,20,100,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262368);
allocate(1, "i8", ALLOC_NONE, 5262428);
allocate([0,0,0,0,32,100,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262432);
allocate(1, "i8", ALLOC_NONE, 5262480);
allocate([0,0,0,0,44,100,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262484);
allocate(1, "i8", ALLOC_NONE, 5262532);
allocate([0,0,0,0,56,100,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262536);
allocate(1, "i8", ALLOC_NONE, 5262600);
allocate([0,0,0,0,68,100,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262604);
allocate(1, "i8", ALLOC_NONE, 5262668);
allocate([0,0,0,0,76,100,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262672);
allocate(1, "i8", ALLOC_NONE, 5262736);
allocate([100,0,0,0,0,0,0,0,124,100,80,0,0,0,0,0,0,0,0,0,156,255,255,255,156,255,255,255,124,100,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262740);
allocate(1, "i8", ALLOC_NONE, 5262780);
allocate([4,0,0,0,0,0,0,0,168,100,80,0,0,0,0,0,0,0,0,0,252,255,255,255,252,255,255,255,168,100,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262784);
allocate(1, "i8", ALLOC_NONE, 5262824);
allocate([4,0,0,0,0,0,0,0,192,100,80,0,0,0,0,0,0,0,0,0,252,255,255,255,252,255,255,255,192,100,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262828);
allocate(1, "i8", ALLOC_NONE, 5262868);
allocate([8,0,0,0,0,0,0,0,216,100,80,0,0,0,0,0,0,0,0,0,248,255,255,255,248,255,255,255,216,100,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262872);
allocate(1, "i8", ALLOC_NONE, 5262912);
allocate([8,0,0,0,0,0,0,0,240,100,80,0,0,0,0,0,0,0,0,0,248,255,255,255,248,255,255,255,240,100,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262916);
allocate(1, "i8", ALLOC_NONE, 5262956);
allocate([0,0,0,0,8,101,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5262960);
allocate(1, "i8", ALLOC_NONE, 5263024);
allocate([0,0,0,0,20,101,80,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263028);
allocate(1, "i8", ALLOC_NONE, 5263048);
allocate([0,0,0,0,52,101,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263052);
allocate(1, "i8", ALLOC_NONE, 5263116);
allocate([0,0,0,0,64,101,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263120);
allocate(1, "i8", ALLOC_NONE, 5263184);
allocate([0,0,0,0,108,101,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263188);
allocate(1, "i8", ALLOC_NONE, 5263244);
allocate([0,0,0,0,140,101,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263248);
allocate(1, "i8", ALLOC_NONE, 5263304);
allocate([0,0,0,0,172,101,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263308);
allocate(1, "i8", ALLOC_NONE, 5263364);
allocate([0,0,0,0,204,101,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263368);
allocate(1, "i8", ALLOC_NONE, 5263424);
allocate([0,0,0,0,4,102,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263428);
allocate(1, "i8", ALLOC_NONE, 5263492);
allocate([0,0,0,0,16,102,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263496);
allocate(1, "i8", ALLOC_NONE, 5263560);
allocate([0,0,0,0,28,102,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263564);
allocate(1, "i8", ALLOC_NONE, 5263580);
allocate([0,0,0,0,36,102,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263584);
allocate(1, "i8", ALLOC_NONE, 5263600);
allocate([0,0,0,0,44,102,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263604);
allocate(1, "i8", ALLOC_NONE, 5263620);
allocate([0,0,0,0,52,102,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263624);
allocate(1, "i8", ALLOC_NONE, 5263640);
allocate([0,0,0,0,60,102,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263644);
allocate(1, "i8", ALLOC_NONE, 5263660);
allocate([0,0,0,0,72,102,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263664);
allocate(1, "i8", ALLOC_NONE, 5263680);
allocate([0,0,0,0,84,102,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263684);
allocate(1, "i8", ALLOC_NONE, 5263728);
allocate([0,0,0,0,96,102,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263732);
allocate(1, "i8", ALLOC_NONE, 5263776);
allocate([0,0,0,0,108,102,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263780);
allocate(1, "i8", ALLOC_NONE, 5263824);
allocate([0,0,0,0,116,102,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263828);
allocate(1, "i8", ALLOC_NONE, 5263868);
__ZTVN10__cxxabiv120__si_class_type_infoE=allocate([0,0,0,0,128,102,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
allocate(1, "i8", ALLOC_STATIC);
__ZTVN10__cxxabiv117__class_type_infoE=allocate([0,0,0,0,140,102,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
allocate(1, "i8", ALLOC_STATIC);
allocate([0,0,0,0,164,102,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263872);
allocate(1, "i8", ALLOC_NONE, 5263940);
allocate([0,0,0,0,176,102,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5263944);
allocate(1, "i8", ALLOC_NONE, 5264012);
allocate([83,116,57,116,121,112,101,95,105,110,102,111,0] /* St9type_info\00 */, "i8", ALLOC_NONE, 5264016);
allocate([83,116,57,101,120,99,101,112,116,105,111,110,0] /* St9exception\00 */, "i8", ALLOC_NONE, 5264032);
allocate([83,116,57,98,97,100,95,97,108,108,111,99,0] /* St9bad_alloc\00 */, "i8", ALLOC_NONE, 5264048);
allocate([83,116,56,98,97,100,95,99,97,115,116,0] /* St8bad_cast\00 */, "i8", ALLOC_NONE, 5264064);
allocate([83,116,49,51,114,117,110,116,105,109,101,95,101,114,114,111,114,0] /* St13runtime_error\00 */, "i8", ALLOC_NONE, 5264076);
allocate([83,116,49,50,111,117,116,95,111,102,95,114,97,110,103,101,0] /* St12out_of_range\00 */, "i8", ALLOC_NONE, 5264096);
allocate([83,116,49,50,108,101,110,103,116,104,95,101,114,114,111,114,0] /* St12length_error\00 */, "i8", ALLOC_NONE, 5264116);
allocate([83,116,49,49,108,111,103,105,99,95,101,114,114,111,114,0] /* St11logic_error\00 */, "i8", ALLOC_NONE, 5264136);
allocate([78,83,116,51,95,95,49,57,116,105,109,101,95,98,97,115,101,69,0] /* NSt3__19time_baseE\0 */, "i8", ALLOC_NONE, 5264152);
allocate([78,83,116,51,95,95,49,57,109,111,110,101,121,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0] /* NSt3__19money_putIwN */, "i8", ALLOC_NONE, 5264172);
allocate([78,83,116,51,95,95,49,57,109,111,110,101,121,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0] /* NSt3__19money_putIcN */, "i8", ALLOC_NONE, 5264244);
allocate([78,83,116,51,95,95,49,57,109,111,110,101,121,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0] /* NSt3__19money_getIwN */, "i8", ALLOC_NONE, 5264316);
allocate([78,83,116,51,95,95,49,57,109,111,110,101,121,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0] /* NSt3__19money_getIcN */, "i8", ALLOC_NONE, 5264388);
allocate([78,83,116,51,95,95,49,57,98,97,115,105,99,95,105,111,115,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0] /* NSt3__19basic_iosIwN */, "i8", ALLOC_NONE, 5264460);
allocate([78,83,116,51,95,95,49,57,98,97,115,105,99,95,105,111,115,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0] /* NSt3__19basic_iosIcN */, "i8", ALLOC_NONE, 5264504);
allocate([78,83,116,51,95,95,49,57,95,95,110,117,109,95,112,117,116,73,119,69,69,0] /* NSt3__19__num_putIwE */, "i8", ALLOC_NONE, 5264548);
allocate([78,83,116,51,95,95,49,57,95,95,110,117,109,95,112,117,116,73,99,69,69,0] /* NSt3__19__num_putIcE */, "i8", ALLOC_NONE, 5264572);
allocate([78,83,116,51,95,95,49,57,95,95,110,117,109,95,103,101,116,73,119,69,69,0] /* NSt3__19__num_getIwE */, "i8", ALLOC_NONE, 5264596);
allocate([78,83,116,51,95,95,49,57,95,95,110,117,109,95,103,101,116,73,99,69,69,0] /* NSt3__19__num_getIcE */, "i8", ALLOC_NONE, 5264620);
allocate([78,83,116,51,95,95,49,56,116,105,109,101,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0] /* NSt3__18time_putIwNS */, "i8", ALLOC_NONE, 5264644);
allocate([78,83,116,51,95,95,49,56,116,105,109,101,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0] /* NSt3__18time_putIcNS */, "i8", ALLOC_NONE, 5264716);
allocate([78,83,116,51,95,95,49,56,116,105,109,101,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0] /* NSt3__18time_getIwNS */, "i8", ALLOC_NONE, 5264788);
allocate([78,83,116,51,95,95,49,56,116,105,109,101,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0] /* NSt3__18time_getIcNS */, "i8", ALLOC_NONE, 5264860);
allocate([78,83,116,51,95,95,49,56,110,117,109,112,117,110,99,116,73,119,69,69,0] /* NSt3__18numpunctIwEE */, "i8", ALLOC_NONE, 5264932);
allocate([78,83,116,51,95,95,49,56,110,117,109,112,117,110,99,116,73,99,69,69,0] /* NSt3__18numpunctIcEE */, "i8", ALLOC_NONE, 5264956);
allocate([78,83,116,51,95,95,49,56,109,101,115,115,97,103,101,115,73,119,69,69,0] /* NSt3__18messagesIwEE */, "i8", ALLOC_NONE, 5264980);
allocate([78,83,116,51,95,95,49,56,109,101,115,115,97,103,101,115,73,99,69,69,0] /* NSt3__18messagesIcEE */, "i8", ALLOC_NONE, 5265004);
allocate([78,83,116,51,95,95,49,56,105,116,101,114,97,116,111,114,73,78,83,95,49,57,111,117,116,112,117,116,95,105,116,101,114,97,116,111,114,95,116,97,103,69,98,105,80,98,82,98,69,69,0] /* NSt3__18iteratorINS_ */, "i8", ALLOC_NONE, 5265028);
allocate([78,83,116,51,95,95,49,56,105,111,115,95,98,97,115,101,69,0] /* NSt3__18ios_baseE\00 */, "i8", ALLOC_NONE, 5265080);
allocate([78,83,116,51,95,95,49,56,105,111,115,95,98,97,115,101,55,102,97,105,108,117,114,101,69,0] /* NSt3__18ios_base7fai */, "i8", ALLOC_NONE, 5265100);
allocate([78,83,116,51,95,95,49,55,110,117,109,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0] /* NSt3__17num_putIwNS_ */, "i8", ALLOC_NONE, 5265128);
allocate([78,83,116,51,95,95,49,55,110,117,109,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0] /* NSt3__17num_putIcNS_ */, "i8", ALLOC_NONE, 5265196);
allocate([78,83,116,51,95,95,49,55,110,117,109,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0] /* NSt3__17num_getIwNS_ */, "i8", ALLOC_NONE, 5265264);
allocate([78,83,116,51,95,95,49,55,110,117,109,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0] /* NSt3__17num_getIcNS_ */, "i8", ALLOC_NONE, 5265332);
allocate([78,83,116,51,95,95,49,55,99,111,108,108,97,116,101,73,119,69,69,0] /* NSt3__17collateIwEE\ */, "i8", ALLOC_NONE, 5265400);
allocate([78,83,116,51,95,95,49,55,99,111,108,108,97,116,101,73,99,69,69,0] /* NSt3__17collateIcEE\ */, "i8", ALLOC_NONE, 5265420);
allocate([78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,119,99,49,48,95,109,98,115,116,97,116,101,95,116,69,69,0] /* NSt3__17codecvtIwc10 */, "i8", ALLOC_NONE, 5265440);
allocate([78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,99,99,49,48,95,109,98,115,116,97,116,101,95,116,69,69,0] /* NSt3__17codecvtIcc10 */, "i8", ALLOC_NONE, 5265476);
allocate([78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,68,115,99,49,48,95,109,98,115,116,97,116,101,95,116,69,69,0] /* NSt3__17codecvtIDsc1 */, "i8", ALLOC_NONE, 5265512);
allocate([78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,68,105,99,49,48,95,109,98,115,116,97,116,101,95,116,69,69,0] /* NSt3__17codecvtIDic1 */, "i8", ALLOC_NONE, 5265548);
allocate([78,83,116,51,95,95,49,54,108,111,99,97,108,101,53,102,97,99,101,116,69,0] /* NSt3__16locale5facet */, "i8", ALLOC_NONE, 5265584);
allocate([78,83,116,51,95,95,49,54,108,111,99,97,108,101,53,95,95,105,109,112,69,0] /* NSt3__16locale5__imp */, "i8", ALLOC_NONE, 5265608);
allocate([78,83,116,51,95,95,49,53,99,116,121,112,101,73,119,69,69,0] /* NSt3__15ctypeIwEE\00 */, "i8", ALLOC_NONE, 5265632);
allocate([78,83,116,51,95,95,49,53,99,116,121,112,101,73,99,69,69,0] /* NSt3__15ctypeIcEE\00 */, "i8", ALLOC_NONE, 5265652);
allocate([78,83,116,51,95,95,49,50,48,95,95,116,105,109,101,95,103,101,116,95,99,95,115,116,111,114,97,103,101,73,119,69,69,0] /* NSt3__120__time_get_ */, "i8", ALLOC_NONE, 5265672);
allocate([78,83,116,51,95,95,49,50,48,95,95,116,105,109,101,95,103,101,116,95,99,95,115,116,111,114,97,103,101,73,99,69,69,0] /* NSt3__120__time_get_ */, "i8", ALLOC_NONE, 5265708);
allocate([78,83,116,51,95,95,49,49,57,95,95,105,111,115,116,114,101,97,109,95,99,97,116,101,103,111,114,121,69,0] /* NSt3__119__iostream_ */, "i8", ALLOC_NONE, 5265744);
allocate([78,83,116,51,95,95,49,49,56,98,97,115,105,99,95,115,116,114,105,110,103,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,78,83,95,57,97,108,108,111,99,97,116,111,114,73,99,69,69,69,69,0] /* NSt3__118basic_strin */, "i8", ALLOC_NONE, 5265776);
allocate([78,83,116,51,95,95,49,49,55,95,95,119,105,100,101,110,95,102,114,111,109,95,117,116,102,56,73,76,106,51,50,69,69,69,0] /* NSt3__117__widen_fro */, "i8", ALLOC_NONE, 5265848);
allocate([78,83,116,51,95,95,49,49,54,95,95,110,97,114,114,111,119,95,116,111,95,117,116,102,56,73,76,106,51,50,69,69,69,0] /* NSt3__116__narrow_to */, "i8", ALLOC_NONE, 5265884);
allocate([78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,105,110,103,98,117,102,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,78,83,95,57,97,108,108,111,99,97,116,111,114,73,99,69,69,69,69,0] /* NSt3__115basic_strin */, "i8", ALLOC_NONE, 5265920);
allocate([78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,101,97,109,98,117,102,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0] /* NSt3__115basic_strea */, "i8", ALLOC_NONE, 5265988);
allocate([78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,101,97,109,98,117,102,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0] /* NSt3__115basic_strea */, "i8", ALLOC_NONE, 5266040);
allocate([78,83,116,51,95,95,49,49,52,101,114,114,111,114,95,99,97,116,101,103,111,114,121,69,0] /* NSt3__114error_categ */, "i8", ALLOC_NONE, 5266092);
allocate([78,83,116,51,95,95,49,49,52,98,97,115,105,99,95,105,111,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0] /* NSt3__114basic_iostr */, "i8", ALLOC_NONE, 5266120);
allocate([78,83,116,51,95,95,49,49,52,98,97,115,105,99,95,105,102,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0] /* NSt3__114basic_ifstr */, "i8", ALLOC_NONE, 5266168);
allocate([78,83,116,51,95,95,49,49,52,95,95,115,104,97,114,101,100,95,99,111,117,110,116,69,0] /* NSt3__114__shared_co */, "i8", ALLOC_NONE, 5266216);
allocate([78,83,116,51,95,95,49,49,52,95,95,110,117,109,95,112,117,116,95,98,97,115,101,69,0] /* NSt3__114__num_put_b */, "i8", ALLOC_NONE, 5266244);
allocate([78,83,116,51,95,95,49,49,52,95,95,110,117,109,95,103,101,116,95,98,97,115,101,69,0] /* NSt3__114__num_get_b */, "i8", ALLOC_NONE, 5266272);
allocate([78,83,116,51,95,95,49,49,51,109,101,115,115,97,103,101,115,95,98,97,115,101,69,0] /* NSt3__113messages_ba */, "i8", ALLOC_NONE, 5266300);
allocate([78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,111,115,116,114,101,97,109,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0] /* NSt3__113basic_ostre */, "i8", ALLOC_NONE, 5266324);
allocate([78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,111,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0] /* NSt3__113basic_ostre */, "i8", ALLOC_NONE, 5266372);
allocate([78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,105,115,116,114,101,97,109,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0] /* NSt3__113basic_istre */, "i8", ALLOC_NONE, 5266420);
allocate([78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,105,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0] /* NSt3__113basic_istre */, "i8", ALLOC_NONE, 5266468);
allocate([78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,102,105,108,101,98,117,102,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0] /* NSt3__113basic_fileb */, "i8", ALLOC_NONE, 5266516);
allocate([78,83,116,51,95,95,49,49,50,115,121,115,116,101,109,95,101,114,114,111,114,69,0] /* NSt3__112system_erro */, "i8", ALLOC_NONE, 5266564);
allocate([78,83,116,51,95,95,49,49,50,99,111,100,101,99,118,116,95,98,97,115,101,69,0] /* NSt3__112codecvt_bas */, "i8", ALLOC_NONE, 5266588);
allocate([78,83,116,51,95,95,49,49,50,95,95,100,111,95,109,101,115,115,97,103,101,69,0] /* NSt3__112__do_messag */, "i8", ALLOC_NONE, 5266612);
allocate([78,83,116,51,95,95,49,49,49,95,95,115,116,100,111,117,116,98,117,102,73,119,69,69,0] /* NSt3__111__stdoutbuf */, "i8", ALLOC_NONE, 5266636);
allocate([78,83,116,51,95,95,49,49,49,95,95,115,116,100,111,117,116,98,117,102,73,99,69,69,0] /* NSt3__111__stdoutbuf */, "i8", ALLOC_NONE, 5266664);
allocate([78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,112,117,116,73,119,69,69,0] /* NSt3__111__money_put */, "i8", ALLOC_NONE, 5266692);
allocate([78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,112,117,116,73,99,69,69,0] /* NSt3__111__money_put */, "i8", ALLOC_NONE, 5266720);
allocate([78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,103,101,116,73,119,69,69,0] /* NSt3__111__money_get */, "i8", ALLOC_NONE, 5266748);
allocate([78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,103,101,116,73,99,69,69,0] /* NSt3__111__money_get */, "i8", ALLOC_NONE, 5266776);
allocate([78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,119,76,98,49,69,69,69,0] /* NSt3__110moneypunctI */, "i8", ALLOC_NONE, 5266804);
allocate([78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,119,76,98,48,69,69,69,0] /* NSt3__110moneypunctI */, "i8", ALLOC_NONE, 5266832);
allocate([78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,99,76,98,49,69,69,69,0] /* NSt3__110moneypunctI */, "i8", ALLOC_NONE, 5266860);
allocate([78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,99,76,98,48,69,69,69,0] /* NSt3__110moneypunctI */, "i8", ALLOC_NONE, 5266888);
allocate([78,83,116,51,95,95,49,49,48,109,111,110,101,121,95,98,97,115,101,69,0] /* NSt3__110money_baseE */, "i8", ALLOC_NONE, 5266916);
allocate([78,83,116,51,95,95,49,49,48,99,116,121,112,101,95,98,97,115,101,69,0] /* NSt3__110ctype_baseE */, "i8", ALLOC_NONE, 5266940);
allocate([78,83,116,51,95,95,49,49,48,95,95,116,105,109,101,95,112,117,116,69,0] /* NSt3__110__time_putE */, "i8", ALLOC_NONE, 5266964);
allocate([78,83,116,51,95,95,49,49,48,95,95,115,116,100,105,110,98,117,102,73,119,69,69,0] /* NSt3__110__stdinbufI */, "i8", ALLOC_NONE, 5266988);
allocate([78,83,116,51,95,95,49,49,48,95,95,115,116,100,105,110,98,117,102,73,99,69,69,0] /* NSt3__110__stdinbufI */, "i8", ALLOC_NONE, 5267012);
allocate([78,57,66,97,114,68,101,99,111,100,101,57,84,111,107,101,110,105,122,101,114,73,76,98,49,69,69,69,0] /* N9BarDecode9Tokenize */, "i8", ALLOC_NONE, 5267036);
allocate([78,57,66,97,114,68,101,99,111,100,101,57,84,111,107,101,110,105,122,101,114,73,76,98,48,69,69,69,0] /* N9BarDecode9Tokenize */, "i8", ALLOC_NONE, 5267068);
allocate([78,57,66,97,114,68,101,99,111,100,101,49,53,66,97,114,99,111,100,101,73,116,101,114,97,116,111,114,73,76,98,49,69,69,69,0] /* N9BarDecode15Barcode */, "i8", ALLOC_NONE, 5267100);
allocate([78,57,66,97,114,68,101,99,111,100,101,49,53,66,97,114,99,111,100,101,73,116,101,114,97,116,111,114,73,76,98,48,69,69,69,0] /* N9BarDecode15Barcode */, "i8", ALLOC_NONE, 5267136);
allocate([78,57,66,97,114,68,101,99,111,100,101,49,51,80,105,120,101,108,73,116,101,114,97,116,111,114,73,76,98,49,69,69,69,0] /* N9BarDecode13PixelIt */, "i8", ALLOC_NONE, 5267172);
allocate([78,57,66,97,114,68,101,99,111,100,101,49,51,80,105,120,101,108,73,116,101,114,97,116,111,114,73,76,98,48,69,69,69,0] /* N9BarDecode13PixelIt */, "i8", ALLOC_NONE, 5267208);
allocate([78,55,85,116,105,108,105,116,121,56,65,114,103,117,109,101,110,116,73,105,69,69,0] /* N7Utility8ArgumentIi */, "i8", ALLOC_NONE, 5267244);
allocate([78,55,85,116,105,108,105,116,121,56,65,114,103,117,109,101,110,116,73,98,69,69,0] /* N7Utility8ArgumentIb */, "i8", ALLOC_NONE, 5267268);
allocate([78,55,85,116,105,108,105,116,121,49,51,66,97,115,105,99,65,114,103,117,109,101,110,116,69,0] /* N7Utility13BasicArgu */, "i8", ALLOC_NONE, 5267292);
allocate([78,49,48,95,95,99,120,120,97,98,105,118,49,50,49,95,95,118,109,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0] /* N10__cxxabiv121__vmi */, "i8", ALLOC_NONE, 5267320);
allocate([78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0] /* N10__cxxabiv120__si_ */, "i8", ALLOC_NONE, 5267360);
allocate([78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0] /* N10__cxxabiv117__cla */, "i8", ALLOC_NONE, 5267400);
allocate([78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0] /* N10__cxxabiv116__shi */, "i8", ALLOC_NONE, 5267436);
allocate([57,74,80,69,71,67,111,100,101,99,0] /* 9JPEGCodec\00 */, "i8", ALLOC_NONE, 5267472);
allocate([49,48,73,109,97,103,101,67,111,100,101,99,0] /* 10ImageCodec\00 */, "i8", ALLOC_NONE, 5267484);
allocate(8, "i8", ALLOC_NONE, 5267500);
allocate(8, "i8", ALLOC_NONE, 5267508);
allocate([0,0,0,0,0,0,0,0,52,96,80,0], "i8", ALLOC_NONE, 5267516);
allocate([0,0,0,0,0,0,0,0,52,96,80,0], "i8", ALLOC_NONE, 5267528);
allocate([0,0,0,0,0,0,0,0,52,96,80,0], "i8", ALLOC_NONE, 5267540);
allocate([0,0,0,0,0,0,0,0,120,96,80,0], "i8", ALLOC_NONE, 5267552);
allocate([0,0,0,0,0,0,0,0,120,96,80,0], "i8", ALLOC_NONE, 5267564);
allocate([0,0,0,0,0,0,0,0,52,96,80,0], "i8", ALLOC_NONE, 5267576);
allocate(8, "i8", ALLOC_NONE, 5267588);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,76,101,80,0,0,0,0,0], "i8", ALLOC_NONE, 5267596);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,84,101,80,0,0,0,0,0], "i8", ALLOC_NONE, 5267628);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,92,101,80,0,0,0,0,0], "i8", ALLOC_NONE, 5267660);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,100,101,80,0,0,0,0,0], "i8", ALLOC_NONE, 5267692);
allocate([0,0,0,0,0,0,0,0,116,98,80,0], "i8", ALLOC_NONE, 5267724);
allocate([0,0,0,0,0,0,0,0,116,98,80,0], "i8", ALLOC_NONE, 5267736);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,144,100,80,0,0,0,0,0], "i8", ALLOC_NONE, 5267748);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,144,100,80,0,0,0,0,0], "i8", ALLOC_NONE, 5267772);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,152,100,80,0,0,0,0,0], "i8", ALLOC_NONE, 5267796);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,152,100,80,0,0,0,0,0], "i8", ALLOC_NONE, 5267820);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,252,101,80,0,0,8,0,0], "i8", ALLOC_NONE, 5267844);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,252,101,80,0,0,8,0,0], "i8", ALLOC_NONE, 5267876);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,160,99,80,0,2,0,0,0,132,96,80,0,2,0,0,0,248,99,80,0,0,8,0,0], "i8", ALLOC_NONE, 5267908);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,160,99,80,0,2,0,0,0,132,96,80,0,2,0,0,0,0,100,80,0,0,8,0,0], "i8", ALLOC_NONE, 5267948);
allocate([0,0,0,0,0,0,0,0,160,99,80,0], "i8", ALLOC_NONE, 5267988);
allocate([0,0,0,0,0,0,0,0,160,99,80,0], "i8", ALLOC_NONE, 5268000);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,160,100,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268012);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,160,100,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268044);
allocate(8, "i8", ALLOC_NONE, 5268076);
allocate(8, "i8", ALLOC_NONE, 5268084);
allocate([0,0,0,0,0,0,0,0,20,101,80,0], "i8", ALLOC_NONE, 5268092);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,36,97,80,0,0,0,0,0], "i8", ALLOC_NONE, 5268104);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,60,97,80,0,0,0,0,0], "i8", ALLOC_NONE, 5268136);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,84,97,80,0,0,0,0,0], "i8", ALLOC_NONE, 5268168);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,108,97,80,0,0,0,0,0], "i8", ALLOC_NONE, 5268200);
allocate([0,0,0,0,0,0,0,0,160,99,80,0], "i8", ALLOC_NONE, 5268232);
allocate([0,0,0,0,0,0,0,0,160,99,80,0], "i8", ALLOC_NONE, 5268244);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,32,101,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268256);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,32,101,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268288);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,32,101,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268320);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,32,101,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268352);
allocate([0,0,0,0,0,0,0,0,136,100,80,0], "i8", ALLOC_NONE, 5268384);
allocate([0,0,0,0,0,0,0,0,160,99,80,0], "i8", ALLOC_NONE, 5268396);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,244,101,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268408);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,244,101,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268440);
allocate(8, "i8", ALLOC_NONE, 5268472);
allocate(8, "i8", ALLOC_NONE, 5268480);
allocate([0,0,0,0,0,0,0,0,40,101,80,0], "i8", ALLOC_NONE, 5268488);
allocate([0,0,0,0,0,0,0,0,92,100,80,0], "i8", ALLOC_NONE, 5268500);
allocate([0,0,0,0,0,0,0,0,128,99,80,0], "i8", ALLOC_NONE, 5268512);
allocate([0,0,0,0,0,0,0,0,128,99,80,0], "i8", ALLOC_NONE, 5268524);
allocate([0,0,0,0,0,0,0,0,76,100,80,0], "i8", ALLOC_NONE, 5268536);
allocate(8, "i8", ALLOC_NONE, 5268548);
allocate(8, "i8", ALLOC_NONE, 5268556);
allocate(8, "i8", ALLOC_NONE, 5268564);
allocate([0,0,0,0,0,0,0,0,3,0,0,0,2,0,0,0,240,100,80,0,2,0,0,0,192,100,80,0,2,8,0,0], "i8", ALLOC_NONE, 5268572);
allocate([0,0,0,0,0,0,0,0,240,100,80,0], "i8", ALLOC_NONE, 5268604);
allocate(8, "i8", ALLOC_NONE, 5268616);
allocate(8, "i8", ALLOC_NONE, 5268624);
allocate(8, "i8", ALLOC_NONE, 5268632);
allocate(8, "i8", ALLOC_NONE, 5268640);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,12,97,80,0,3,244,255,255], "i8", ALLOC_NONE, 5268648);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,24,97,80,0,3,244,255,255], "i8", ALLOC_NONE, 5268672);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,12,97,80,0,3,244,255,255], "i8", ALLOC_NONE, 5268696);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,24,97,80,0,3,244,255,255], "i8", ALLOC_NONE, 5268720);
allocate([0,0,0,0,0,0,0,0,76,100,80,0], "i8", ALLOC_NONE, 5268744);
allocate([0,0,0,0,0,0,0,0,84,96,80,0], "i8", ALLOC_NONE, 5268756);
allocate(8, "i8", ALLOC_NONE, 5268768);
allocate([0,0,0,0,0,0,0,0,84,100,80,0], "i8", ALLOC_NONE, 5268776);
allocate([0,0,0,0,0,0,0,0,68,100,80,0], "i8", ALLOC_NONE, 5268788);
allocate([0,0,0,0,0,0,0,0,76,100,80,0], "i8", ALLOC_NONE, 5268800);
allocate(8, "i8", ALLOC_NONE, 5268812);
allocate(8, "i8", ALLOC_NONE, 5268820);
allocate(8, "i8", ALLOC_NONE, 5268828);
allocate(8, "i8", ALLOC_NONE, 5268836);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,236,101,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268844);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,236,101,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268876);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,236,101,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268908);
allocate([0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,160,99,80,0,2,0,0,0,236,101,80,0,2,0,0,0], "i8", ALLOC_NONE, 5268940);
allocate(8, "i8", ALLOC_NONE, 5268972);
allocate(8, "i8", ALLOC_NONE, 5268980);
allocate(8, "i8", ALLOC_NONE, 5268988);
allocate([0,0,0,0,0,0,0,0,68,100,80,0], "i8", ALLOC_NONE, 5268996);
allocate([0,0,0,0,0,0,0,0,76,100,80,0], "i8", ALLOC_NONE, 5269008);
allocate(8, "i8", ALLOC_NONE, 5269020);
allocate(8, "i8", ALLOC_NONE, 5269028);
allocate(8, "i8", ALLOC_NONE, 5269036);
allocate(8, "i8", ALLOC_NONE, 5269044);
allocate([0,0,0,0,0,0,0,0,108,98,80,0], "i8", ALLOC_NONE, 5269052);
allocate([0,0,0,0,0,0,0,0,108,98,80,0], "i8", ALLOC_NONE, 5269064);
allocate([0,0,0,0,0,0,0,0,108,102,80,0], "i8", ALLOC_NONE, 5269076);
allocate([0,0,0,0,0,0,0,0,108,102,80,0], "i8", ALLOC_NONE, 5269088);
allocate(8, "i8", ALLOC_NONE, 5269100);
allocate([0,0,0,0,0,0,0,0,140,102,80,0], "i8", ALLOC_NONE, 5269108);
allocate([0,0,0,0,0,0,0,0,140,102,80,0], "i8", ALLOC_NONE, 5269120);
allocate([0,0,0,0,0,0,0,0,152,102,80,0], "i8", ALLOC_NONE, 5269132);
allocate([0,0,0,0,0,0,0,0,44,96,80,0], "i8", ALLOC_NONE, 5269144);
allocate([0,0,0,0,0,0,0,0,176,102,80,0], "i8", ALLOC_NONE, 5269156);
allocate(8, "i8", ALLOC_NONE, 5269168);
allocate([64,0,0,0,0,0,0,0,240,100,80,0,0,0,0,0,0,0,0,0,192,255,255,255,192,255,255,255,240,100,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5269176);
allocate([100,0,0,0,0,0,0,0,240,100,80,0,0,0,0,0,0,0,0,0,156,255,255,255,156,255,255,255,240,100,80,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, 5269216);
allocate(52, "i8", ALLOC_NONE, 5269256);
allocate(52, "i8", ALLOC_NONE, 5269308);
allocate(56, "i8", ALLOC_NONE, 5269360);
allocate(52, "i8", ALLOC_NONE, 5269416);
allocate(52, "i8", ALLOC_NONE, 5269468);
allocate(56, "i8", ALLOC_NONE, 5269520);
allocate([255,255,255,255], "i8", ALLOC_NONE, 5269576);
allocate([255,255,255,255], "i8", ALLOC_NONE, 5269580);
allocate(8, "i8", ALLOC_NONE, 5269584);
allocate(8, "i8", ALLOC_NONE, 5269592);
allocate(8, "i8", ALLOC_NONE, 5269600);
allocate(8, "i8", ALLOC_NONE, 5269608);
allocate(8, "i8", ALLOC_NONE, 5269616);
allocate(8, "i8", ALLOC_NONE, 5269624);
allocate(8, "i8", ALLOC_NONE, 5269632);
allocate(8, "i8", ALLOC_NONE, 5269640);
allocate(8, "i8", ALLOC_NONE, 5269648);
allocate(8, "i8", ALLOC_NONE, 5269656);
allocate(8, "i8", ALLOC_NONE, 5269664);
allocate(8, "i8", ALLOC_NONE, 5269672);
allocate(8, "i8", ALLOC_NONE, 5269680);
allocate(8, "i8", ALLOC_NONE, 5269688);
allocate(8, "i8", ALLOC_NONE, 5269696);
allocate(8, "i8", ALLOC_NONE, 5269704);
allocate(8, "i8", ALLOC_NONE, 5269712);
allocate(8, "i8", ALLOC_NONE, 5269720);
allocate(8, "i8", ALLOC_NONE, 5269728);
allocate(8, "i8", ALLOC_NONE, 5269736);
allocate(8, "i8", ALLOC_NONE, 5269744);
allocate(8, "i8", ALLOC_NONE, 5269752);
allocate(4, "i8", ALLOC_NONE, 5269760);
allocate(84, "i8", ALLOC_NONE, 5269764);
allocate(84, "i8", ALLOC_NONE, 5269848);
allocate(84, "i8", ALLOC_NONE, 5269932);
allocate(8, "i8", ALLOC_NONE, 5270016);
allocate(8, "i8", ALLOC_NONE, 5270024);
allocate(88, "i8", ALLOC_NONE, 5270032);
allocate(84, "i8", ALLOC_NONE, 5270120);
allocate(84, "i8", ALLOC_NONE, 5270204);
allocate(84, "i8", ALLOC_NONE, 5270288);
allocate(88, "i8", ALLOC_NONE, 5270372);
allocate(1, "i8", ALLOC_NONE, 5270460);
allocate([48,49,50,51,52,53,54,55,56,57,97,98,99,100,101,102,65,66,67,68,69,70,120,88,43,45,112,80,105,73,110,78,0] /* 0123456789abcdefABCD */, "i8", ALLOC_NONE, 5270464);
allocate(8, "i8", ALLOC_NONE, 5270500);
allocate(8, "i8", ALLOC_NONE, 5270508);
allocate(8, "i8", ALLOC_NONE, 5270516);
allocate(8, "i8", ALLOC_NONE, 5270524);
allocate(224, "i8", ALLOC_NONE, 5270532);
allocate(224, "i8", ALLOC_NONE, 5270756);
allocate(25, "i8", ALLOC_NONE, 5270980);
allocate(25, "i8", ALLOC_NONE, 5271008);
allocate(542, "i8", ALLOC_NONE, 5271036);
allocate(542, "i8", ALLOC_NONE, 5271580);
allocate(640, "i8", ALLOC_NONE, 5272124);
allocate(640, "i8", ALLOC_NONE, 5272764);
allocate(4, "i8", ALLOC_NONE, 5273404);
allocate(12, "i8", ALLOC_NONE, 5273408);
allocate(4, "i8", ALLOC_NONE, 5273420);
allocate(4, "i8", ALLOC_NONE, 5273424);
allocate(8, "i8", ALLOC_NONE, 5273428);
allocate(8, "i8", ALLOC_NONE, 5273436);
allocate(8, "i8", ALLOC_NONE, 5273444);
allocate(8, "i8", ALLOC_NONE, 5273452);
allocate(8, "i8", ALLOC_NONE, 5273460);
allocate(8, "i8", ALLOC_NONE, 5273468);
allocate(8, "i8", ALLOC_NONE, 5273476);
allocate(8, "i8", ALLOC_NONE, 5273484);
allocate(8, "i8", ALLOC_NONE, 5273492);
allocate(8, "i8", ALLOC_NONE, 5273500);
allocate(8, "i8", ALLOC_NONE, 5273508);
allocate(8, "i8", ALLOC_NONE, 5273516);
allocate(8, "i8", ALLOC_NONE, 5273524);
allocate(8, "i8", ALLOC_NONE, 5273532);
allocate(8, "i8", ALLOC_NONE, 5273540);
allocate(8, "i8", ALLOC_NONE, 5273548);
allocate(8, "i8", ALLOC_NONE, 5273556);
allocate(8, "i8", ALLOC_NONE, 5273564);
allocate(8, "i8", ALLOC_NONE, 5273572);
allocate(8, "i8", ALLOC_NONE, 5273580);
allocate(8, "i8", ALLOC_NONE, 5273588);
allocate(8, "i8", ALLOC_NONE, 5273596);
allocate(8, "i8", ALLOC_NONE, 5273604);
allocate(8, "i8", ALLOC_NONE, 5273612);
allocate(8, "i8", ALLOC_NONE, 5273620);
allocate(8, "i8", ALLOC_NONE, 5273628);
allocate(8, "i8", ALLOC_NONE, 5273636);
allocate(8, "i8", ALLOC_NONE, 5273644);
allocate(8, "i8", ALLOC_NONE, 5273652);
allocate(8, "i8", ALLOC_NONE, 5273660);
allocate(8, "i8", ALLOC_NONE, 5273668);
allocate(8, "i8", ALLOC_NONE, 5273676);
allocate(8, "i8", ALLOC_NONE, 5273684);
allocate(8, "i8", ALLOC_NONE, 5273692);
allocate(8, "i8", ALLOC_NONE, 5273700);
allocate(8, "i8", ALLOC_NONE, 5273708);
allocate(8, "i8", ALLOC_NONE, 5273716);
allocate(8, "i8", ALLOC_NONE, 5273724);
allocate(8, "i8", ALLOC_NONE, 5273732);
allocate(8, "i8", ALLOC_NONE, 5273740);
allocate(8, "i8", ALLOC_NONE, 5273748);
allocate(8, "i8", ALLOC_NONE, 5273756);
allocate(8, "i8", ALLOC_NONE, 5273764);
allocate(8, "i8", ALLOC_NONE, 5273772);
HEAP32[((5244980)>>2)]=((5249408)|0);
HEAP32[((5244984)>>2)]=((5253452)|0);
HEAP32[((5244988)>>2)]=((5252640)|0);
HEAP32[((5244992)>>2)]=((5251988)|0);
HEAP32[((5244996)>>2)]=((5251276)|0);
HEAP32[((5245000)>>2)]=((5250592)|0);
HEAP32[((5245004)>>2)]=((5249792)|0);
HEAP32[((5245008)>>2)]=((5249272)|0);
HEAP32[((5245012)>>2)]=((5248568)|0);
HEAP32[((5245016)>>2)]=((5247828)|0);
HEAP32[((5245020)>>2)]=((5255844)|0);
HEAP32[((5245024)>>2)]=((5255048)|0);
HEAP32[((5245028)>>2)]=((5254372)|0);
HEAP32[((5245032)>>2)]=((5254104)|0);
HEAP32[((5245036)>>2)]=((5253820)|0);
HEAP32[((5245040)>>2)]=((5253692)|0);
HEAP32[((5245044)>>2)]=((5253608)|0);
HEAP32[((5245048)>>2)]=((5253396)|0);
HEAP32[((5245052)>>2)]=((5253284)|0);
HEAP32[((5245056)>>2)]=((5253208)|0);
HEAP32[((5245060)>>2)]=((5253116)|0);
HEAP32[((5245064)>>2)]=((5252952)|0);
HEAP32[((5245068)>>2)]=((5252868)|0);
HEAP32[((5245072)>>2)]=((5252820)|0);
HEAP32[((5245076)>>2)]=((5252776)|0);
HEAP32[((5245080)>>2)]=((5252736)|0);
HEAP32[((5245084)>>2)]=((5252688)|0);
HEAP32[((5245088)>>2)]=((5252600)|0);
HEAP32[((5245092)>>2)]=((5252540)|0);
HEAP32[((5245096)>>2)]=((5252496)|0);
HEAP32[((5245100)>>2)]=((5252424)|0);
HEAP32[((5245104)>>2)]=((5252268)|0);
HEAP32[((5245108)>>2)]=((5252236)|0);
HEAP32[((5245112)>>2)]=((5252176)|0);
HEAP32[((5245116)>>2)]=((5252136)|0);
HEAP32[((5245120)>>2)]=((5252080)|0);
HEAP32[((5245124)>>2)]=((5252044)|0);
HEAP32[((5245128)>>2)]=((5251964)|0);
HEAP32[((5245132)>>2)]=((5251852)|0);
HEAP32[((5245136)>>2)]=((5251804)|0);
HEAP32[((5245140)>>2)]=((5251744)|0);
HEAP32[((5245144)>>2)]=((5251632)|0);
HEAP32[((5245148)>>2)]=((5251568)|0);
HEAP32[((5245152)>>2)]=((5251528)|0);
HEAP32[((5245156)>>2)]=((5251484)|0);
HEAP32[((5245160)>>2)]=((5251396)|0);
HEAP32[((5245164)>>2)]=((5251308)|0);
HEAP32[((5245168)>>2)]=((5251236)|0);
HEAP32[((5245172)>>2)]=((5251200)|0);
HEAP32[((5245176)>>2)]=((5251152)|0);
HEAP32[((5245180)>>2)]=((5251080)|0);
HEAP32[((5245184)>>2)]=((5250980)|0);
HEAP32[((5245188)>>2)]=((5250916)|0);
HEAP32[((5245192)>>2)]=((5250820)|0);
HEAP32[((5245196)>>2)]=((5250760)|0);
HEAP32[((5245200)>>2)]=((5250692)|0);
HEAP32[((5245204)>>2)]=((5250640)|0);
HEAP32[((5245208)>>2)]=((5250544)|0);
HEAP32[((5245212)>>2)]=((5250468)|0);
HEAP32[((5245216)>>2)]=((5250428)|0);
HEAP32[((5245220)>>2)]=((5250348)|0);
HEAP32[((5245224)>>2)]=((5250200)|0);
HEAP32[((5245228)>>2)]=((5250068)|0);
HEAP32[((5245232)>>2)]=((5250012)|0);
HEAP32[((5245236)>>2)]=((5249916)|0);
HEAP32[((5245240)>>2)]=((5249880)|0);
HEAP32[((5245244)>>2)]=((5249824)|0);
HEAP32[((5245248)>>2)]=((5249760)|0);
HEAP32[((5245252)>>2)]=((5249704)|0);
HEAP32[((5245256)>>2)]=((5249660)|0);
HEAP32[((5245260)>>2)]=((5249616)|0);
HEAP32[((5245264)>>2)]=((5249500)|0);
HEAP32[((5245268)>>2)]=((5249456)|0);
HEAP32[((5245272)>>2)]=((5249432)|0);
HEAP32[((5245276)>>2)]=((5249388)|0);
HEAP32[((5245280)>>2)]=((5249332)|0);
HEAP32[((5245284)>>2)]=((5249316)|0);
HEAP32[((5245288)>>2)]=((5249208)|0);
HEAP32[((5245292)>>2)]=((5249128)|0);
HEAP32[((5245296)>>2)]=((5249072)|0);
HEAP32[((5245300)>>2)]=((5248984)|0);
HEAP32[((5245304)>>2)]=((5248896)|0);
HEAP32[((5245308)>>2)]=((5248864)|0);
HEAP32[((5245312)>>2)]=((5248820)|0);
HEAP32[((5245316)>>2)]=((5248760)|0);
HEAP32[((5245320)>>2)]=((5248704)|0);
HEAP32[((5245324)>>2)]=((5248656)|0);
HEAP32[((5245328)>>2)]=((5248552)|0);
HEAP32[((5245332)>>2)]=((5248512)|0);
HEAP32[((5245336)>>2)]=((5248436)|0);
HEAP32[((5245340)>>2)]=((5248356)|0);
HEAP32[((5245344)>>2)]=((5248216)|0);
HEAP32[((5245348)>>2)]=((5248140)|0);
HEAP32[((5245352)>>2)]=((5248068)|0);
HEAP32[((5245356)>>2)]=((5248004)|0);
HEAP32[((5245360)>>2)]=((5247928)|0);
HEAP32[((5245364)>>2)]=((5247876)|0);
HEAP32[((5245368)>>2)]=((5247804)|0);
HEAP32[((5245372)>>2)]=((5247752)|0);
HEAP32[((5245376)>>2)]=((5247696)|0);
HEAP32[((5245380)>>2)]=((5256260)|0);
HEAP32[((5245384)>>2)]=((5256136)|0);
HEAP32[((5245388)>>2)]=((5256060)|0);
HEAP32[((5245392)>>2)]=((5256012)|0);
HEAP32[((5245396)>>2)]=((5255980)|0);
HEAP32[((5245400)>>2)]=((5255932)|0);
HEAP32[((5245404)>>2)]=((5255884)|0);
HEAP32[((5245408)>>2)]=((5255812)|0);
HEAP32[((5245412)>>2)]=((5255784)|0);
HEAP32[((5245416)>>2)]=((5255748)|0);
HEAP32[((5245420)>>2)]=((5255576)|0);
HEAP32[((5245424)>>2)]=((5255460)|0);
HEAP32[((5245428)>>2)]=((5255284)|0);
HEAP32[((5245432)>>2)]=((5255228)|0);
HEAP32[((5245436)>>2)]=((5255200)|0);
HEAP32[((5245440)>>2)]=((5255132)|0);
HEAP32[((5245444)>>2)]=((5255084)|0);
HEAP32[((5245448)>>2)]=((5255008)|0);
HEAP32[((5245452)>>2)]=((5254904)|0);
HEAP32[((5245456)>>2)]=((5254832)|0);
HEAP32[((5245460)>>2)]=((5254740)|0);
HEAP32[((5245464)>>2)]=((5254688)|0);
HEAP32[((5245468)>>2)]=((5254604)|0);
HEAP32[((5245472)>>2)]=((5254564)|0);
HEAP32[((5245476)>>2)]=((5254504)|0);
HEAP32[((5245480)>>2)]=((5254444)|0);
HEAP32[((5245484)>>2)]=((5254396)|0);
HEAP32[((5260924)>>2)]=(110);
HEAP32[((5260928)>>2)]=(576);
HEAP32[((5260932)>>2)]=(724);
HEAP32[((5260948)>>2)]=(954);
HEAP32[((5260952)>>2)]=(768);
HEAP32[((5260956)>>2)]=(366);
HEAP32[((5260972)>>2)]=(334);
HEAP32[((5260976)>>2)]=(1344);
HEAP32[((5260980)>>2)]=(386);
HEAP32[((5260996)>>2)]=(444);
HEAP32[((5261000)>>2)]=(88);
HEAP32[((5261004)>>2)]=(1078);
HEAP32[((5261020)>>2)]=(444);
HEAP32[((5261024)>>2)]=(24);
HEAP32[((5261028)>>2)]=(1078);
HEAP32[((5261044)>>2)]=(444);
HEAP32[((5261048)>>2)]=(68);
HEAP32[((5261052)>>2)]=(1078);
HEAP32[((5261068)>>2)]=(778);
HEAP32[((5261072)>>2)]=(392);
HEAP32[((5261076)>>2)]=(210);
HEAP32[((5261080)>>2)]=(848);
HEAP32[((5261084)>>2)]=(80);
HEAP32[((5261100)>>2)]=(1214);
HEAP32[((5261104)>>2)]=(868);
HEAP32[((5261108)>>2)]=(210);
HEAP32[((5261112)>>2)]=(1262);
HEAP32[((5261116)>>2)]=(170);
HEAP32[((5261132)>>2)]=(808);
HEAP32[((5261136)>>2)]=(874);
HEAP32[((5261140)>>2)]=(210);
HEAP32[((5261144)>>2)]=(852);
HEAP32[((5261148)>>2)]=(1294);
HEAP32[((5261164)>>2)]=(752);
HEAP32[((5261168)>>2)]=(678);
HEAP32[((5261172)>>2)]=(210);
HEAP32[((5261176)>>2)]=(834);
HEAP32[((5261180)>>2)]=(970);
HEAP32[((5261196)>>2)]=(1310);
HEAP32[((5261200)>>2)]=(62);
HEAP32[((5261204)>>2)]=(210);
HEAP32[((5261208)>>2)]=(216);
HEAP32[((5261224)>>2)]=(762);
HEAP32[((5261228)>>2)]=(544);
HEAP32[((5261232)>>2)]=(210);
HEAP32[((5261236)>>2)]=(316);
HEAP32[((5261252)>>2)]=(154);
HEAP32[((5261256)>>2)]=(546);
HEAP32[((5261260)>>2)]=(210);
HEAP32[((5261264)>>2)]=(1162);
HEAP32[((5261268)>>2)]=(34);
HEAP32[((5261272)>>2)]=(876);
HEAP32[((5261276)>>2)]=(52);
HEAP32[((5261280)>>2)]=(360);
HEAP32[((5261284)>>2)]=(1166);
HEAP32[((5261288)>>2)]=(410);
HEAP32[((5261300)>>2)]=(192);
HEAP32[((5261304)>>2)]=(74);
HEAP32[((5261308)>>2)]=(324);
HEAP32[((5261312)>>2)]=(140);
HEAP32[((5261316)>>2)]=(14);
HEAP32[((5261320)>>2)]=(308);
HEAP32[((5261324)>>2)]=(1222);
HEAP32[((5261340)>>2)]=(1282);
HEAP32[((5261344)>>2)]=(1178);
HEAP32[((5261348)>>2)]=(210);
HEAP32[((5261352)>>2)]=(186);
HEAP32[((5261356)>>2)]=(20);
HEAP32[((5261360)>>2)]=(1224);
HEAP32[((5261364)>>2)]=(696);
HEAP32[((5261368)>>2)]=(306);
HEAP32[((5261372)>>2)]=(22);
HEAP32[((5261376)>>2)]=(1124);
HEAP32[((5261388)>>2)]=(654);
HEAP32[((5261392)>>2)]=(1034);
HEAP32[((5261396)>>2)]=(1128);
HEAP32[((5261400)>>2)]=(1190);
HEAP32[((5261404)>>2)]=(968);
HEAP32[((5261408)>>2)]=(432);
HEAP32[((5261412)>>2)]=(492);
HEAP32[((5261428)>>2)]=(376);
HEAP32[((5261432)>>2)]=(886);
HEAP32[((5261436)>>2)]=(210);
HEAP32[((5261440)>>2)]=(464);
HEAP32[((5261444)>>2)]=(406);
HEAP32[((5261448)>>2)]=(204);
HEAP32[((5261452)>>2)]=(658);
HEAP32[((5261456)>>2)]=(800);
HEAP32[((5261472)>>2)]=(280);
HEAP32[((5261476)>>2)]=(318);
HEAP32[((5261480)>>2)]=(210);
HEAP32[((5261484)>>2)]=(422);
HEAP32[((5261488)>>2)]=(18);
HEAP32[((5261492)>>2)]=(290);
HEAP32[((5261496)>>2)]=(840);
HEAP32[((5261500)>>2)]=(10);
HEAP32[((5261516)>>2)]=(1286);
HEAP32[((5261520)>>2)]=(2);
HEAP32[((5261524)>>2)]=(210);
HEAP32[((5261528)>>2)]=(714);
HEAP32[((5261532)>>2)]=(1316);
HEAP32[((5261536)>>2)]=(1002);
HEAP32[((5261552)>>2)]=(188);
HEAP32[((5261556)>>2)]=(364);
HEAP32[((5261560)>>2)]=(210);
HEAP32[((5261564)>>2)]=(1174);
HEAP32[((5261568)>>2)]=(372);
HEAP32[((5261572)>>2)]=(328);
HEAP32[((5261588)>>2)]=(1152);
HEAP32[((5261592)>>2)]=(568);
HEAP32[((5261608)>>2)]=(102);
HEAP32[((5261612)>>2)]=(676);
HEAP32[((5261616)>>2)]=(386);
HEAP32[((5261632)>>2)]=(228);
HEAP32[((5261636)>>2)]=(786);
HEAP32[((5261640)>>2)]=(210);
HEAP32[((5261644)>>2)]=(978);
HEAP32[((5261648)>>2)]=(152);
HEAP32[((5261652)>>2)]=(144);
HEAP32[((5261656)>>2)]=(150);
HEAP32[((5261660)>>2)]=(142);
HEAP32[((5261664)>>2)]=(160);
HEAP32[((5261668)>>2)]=(158);
HEAP32[((5261672)>>2)]=(272);
HEAP32[((5261688)>>2)]=(134);
HEAP32[((5261692)>>2)]=(64);
HEAP32[((5261696)>>2)]=(210);
HEAP32[((5261700)>>2)]=(490);
HEAP32[((5261704)>>2)]=(950);
HEAP32[((5261708)>>2)]=(938);
HEAP32[((5261712)>>2)]=(948);
HEAP32[((5261716)>>2)]=(936);
HEAP32[((5261720)>>2)]=(942);
HEAP32[((5261724)>>2)]=(940);
HEAP32[((5261728)>>2)]=(796);
HEAP32[((5261744)>>2)]=(156);
HEAP32[((5261748)>>2)]=(78);
HEAP32[((5261752)>>2)]=(210);
HEAP32[((5261756)>>2)]=(606);
HEAP32[((5261760)>>2)]=(1046);
HEAP32[((5261764)>>2)]=(888);
HEAP32[((5261768)>>2)]=(1036);
HEAP32[((5261772)>>2)]=(858);
HEAP32[((5261776)>>2)]=(976);
HEAP32[((5261780)>>2)]=(1028);
HEAP32[((5261784)>>2)]=(1056);
HEAP32[((5261788)>>2)]=(1054);
HEAP32[((5261792)>>2)]=(1052);
HEAP32[((5261796)>>2)]=(634);
HEAP32[((5261812)>>2)]=(894);
HEAP32[((5261816)>>2)]=(8);
HEAP32[((5261820)>>2)]=(210);
HEAP32[((5261824)>>2)]=(790);
HEAP32[((5261828)>>2)]=(1260);
HEAP32[((5261832)>>2)]=(1250);
HEAP32[((5261836)>>2)]=(1252);
HEAP32[((5261840)>>2)]=(1210);
HEAP32[((5261844)>>2)]=(1258);
HEAP32[((5261848)>>2)]=(690);
HEAP32[((5261852)>>2)]=(1268);
HEAP32[((5261856)>>2)]=(1266);
HEAP32[((5261860)>>2)]=(1264);
HEAP32[((5261864)>>2)]=(1040);
HEAP32[((5261880)>>2)]=(358);
HEAP32[((5261884)>>2)]=(434);
HEAP32[((5261888)>>2)]=(210);
HEAP32[((5261892)>>2)]=(626);
HEAP32[((5261896)>>2)]=(934);
HEAP32[((5261900)>>2)]=(550);
HEAP32[((5261916)>>2)]=(100);
HEAP32[((5261920)>>2)]=(802);
HEAP32[((5261924)>>2)]=(210);
HEAP32[((5261928)>>2)]=(916);
HEAP32[((5261932)>>2)]=(1098);
HEAP32[((5261936)>>2)]=(70);
HEAP32[((5261952)>>2)]=(448);
HEAP32[((5261956)>>2)]=(58);
HEAP32[((5261960)>>2)]=(210);
HEAP32[((5261964)>>2)]=(402);
HEAP32[((5261968)>>2)]=(250);
HEAP32[((5261972)>>2)]=(914);
HEAP32[((5261976)>>2)]=(164);
HEAP32[((5261980)>>2)]=(582);
HEAP32[((5261984)>>2)]=(178);
HEAP32[((5261988)>>2)]=(704);
HEAP32[((5262004)>>2)]=(822);
HEAP32[((5262008)>>2)]=(288);
HEAP32[((5262012)>>2)]=(210);
HEAP32[((5262016)>>2)]=(90);
HEAP32[((5262020)>>2)]=(656);
HEAP32[((5262024)>>2)]=(310);
HEAP32[((5262028)>>2)]=(1060);
HEAP32[((5262032)>>2)]=(1000);
HEAP32[((5262036)>>2)]=(836);
HEAP32[((5262040)>>2)]=(662);
HEAP32[((5262056)>>2)]=(822);
HEAP32[((5262060)>>2)]=(652);
HEAP32[((5262064)>>2)]=(210);
HEAP32[((5262068)>>2)]=(1314);
HEAP32[((5262072)>>2)]=(254);
HEAP32[((5262076)>>2)]=(120);
HEAP32[((5262080)>>2)]=(1324);
HEAP32[((5262084)>>2)]=(438);
HEAP32[((5262088)>>2)]=(442);
HEAP32[((5262092)>>2)]=(174);
HEAP32[((5262108)>>2)]=(822);
HEAP32[((5262112)>>2)]=(722);
HEAP32[((5262116)>>2)]=(210);
HEAP32[((5262120)>>2)]=(608);
HEAP32[((5262124)>>2)]=(612);
HEAP32[((5262128)>>2)]=(1066);
HEAP32[((5262132)>>2)]=(344);
HEAP32[((5262136)>>2)]=(698);
HEAP32[((5262140)>>2)]=(262);
HEAP32[((5262144)>>2)]=(610);
HEAP32[((5262160)>>2)]=(822);
HEAP32[((5262164)>>2)]=(126);
HEAP32[((5262168)>>2)]=(210);
HEAP32[((5262184)>>2)]=(264);
HEAP32[((5262188)>>2)]=(740);
HEAP32[((5262192)>>2)]=(210);
HEAP32[((5262208)>>2)]=(822);
HEAP32[((5262212)>>2)]=(384);
HEAP32[((5262216)>>2)]=(210);
HEAP32[((5262220)>>2)]=(1326);
HEAP32[((5262224)>>2)]=(332);
HEAP32[((5262228)>>2)]=(604);
HEAP32[((5262232)>>2)]=(1304);
HEAP32[((5262236)>>2)]=(336);
HEAP32[((5262240)>>2)]=(972);
HEAP32[((5262244)>>2)]=(896);
HEAP32[((5262248)>>2)]=(94);
HEAP32[((5262252)>>2)]=(214);
HEAP32[((5262256)>>2)]=(1134);
HEAP32[((5262260)>>2)]=(496);
HEAP32[((5262264)>>2)]=(340);
HEAP32[((5262280)>>2)]=(1342);
HEAP32[((5262284)>>2)]=(146);
HEAP32[((5262288)>>2)]=(210);
HEAP32[((5262292)>>2)]=(42);
HEAP32[((5262296)>>2)]=(700);
HEAP32[((5262300)>>2)]=(638);
HEAP32[((5262304)>>2)]=(1116);
HEAP32[((5262308)>>2)]=(258);
HEAP32[((5262312)>>2)]=(644);
HEAP32[((5262316)>>2)]=(770);
HEAP32[((5262320)>>2)]=(750);
HEAP32[((5262336)>>2)]=(322);
HEAP32[((5262340)>>2)]=(1168);
HEAP32[((5262344)>>2)]=(744);
HEAP32[((5262348)>>2)]=(980);
HEAP32[((5262352)>>2)]=(592);
HEAP32[((5262356)>>2)]=(480);
HEAP32[((5262360)>>2)]=(1082);
HEAP32[((5262380)>>2)]=(986);
HEAP32[((5262384)>>2)]=(1336);
HEAP32[((5262400)>>2)]=(1204);
HEAP32[((5262404)>>2)]=(278);
HEAP32[((5262420)>>2)]=(1044);
HEAP32[((5262424)>>2)]=(1006);
HEAP32[((5262440)>>2)]=(822);
HEAP32[((5262444)>>2)]=(398);
HEAP32[((5262448)>>2)]=(210);
HEAP32[((5262452)>>2)]=(608);
HEAP32[((5262456)>>2)]=(612);
HEAP32[((5262460)>>2)]=(1066);
HEAP32[((5262464)>>2)]=(344);
HEAP32[((5262468)>>2)]=(698);
HEAP32[((5262472)>>2)]=(262);
HEAP32[((5262476)>>2)]=(610);
HEAP32[((5262492)>>2)]=(822);
HEAP32[((5262496)>>2)]=(774);
HEAP32[((5262500)>>2)]=(210);
HEAP32[((5262504)>>2)]=(608);
HEAP32[((5262508)>>2)]=(612);
HEAP32[((5262512)>>2)]=(1066);
HEAP32[((5262516)>>2)]=(344);
HEAP32[((5262520)>>2)]=(698);
HEAP32[((5262524)>>2)]=(262);
HEAP32[((5262528)>>2)]=(610);
HEAP32[((5262544)>>2)]=(212);
HEAP32[((5262548)>>2)]=(1146);
HEAP32[((5262552)>>2)]=(998);
HEAP32[((5262556)>>2)]=(474);
HEAP32[((5262560)>>2)]=(956);
HEAP32[((5262564)>>2)]=(66);
HEAP32[((5262568)>>2)]=(256);
HEAP32[((5262572)>>2)]=(872);
HEAP32[((5262576)>>2)]=(632);
HEAP32[((5262580)>>2)]=(370);
HEAP32[((5262584)>>2)]=(96);
HEAP32[((5262588)>>2)]=(274);
HEAP32[((5262592)>>2)]=(598);
HEAP32[((5262596)>>2)]=(412);
HEAP32[((5262612)>>2)]=(622);
HEAP32[((5262616)>>2)]=(1234);
HEAP32[((5262620)>>2)]=(1172);
HEAP32[((5262624)>>2)]=(710);
HEAP32[((5262628)>>2)]=(446);
HEAP32[((5262632)>>2)]=(846);
HEAP32[((5262636)>>2)]=(298);
HEAP32[((5262640)>>2)]=(1018);
HEAP32[((5262644)>>2)]=(1100);
HEAP32[((5262648)>>2)]=(266);
HEAP32[((5262652)>>2)]=(236);
HEAP32[((5262656)>>2)]=(224);
HEAP32[((5262660)>>2)]=(32);
HEAP32[((5262664)>>2)]=(878);
HEAP32[((5262680)>>2)]=(30);
HEAP32[((5262684)>>2)]=(580);
HEAP32[((5262688)>>2)]=(998);
HEAP32[((5262692)>>2)]=(474);
HEAP32[((5262696)>>2)]=(1188);
HEAP32[((5262700)>>2)]=(552);
HEAP32[((5262704)>>2)]=(256);
HEAP32[((5262708)>>2)]=(872);
HEAP32[((5262712)>>2)]=(632);
HEAP32[((5262716)>>2)]=(56);
HEAP32[((5262720)>>2)]=(96);
HEAP32[((5262724)>>2)]=(1238);
HEAP32[((5262728)>>2)]=(598);
HEAP32[((5262732)>>2)]=(1186);
HEAP32[((5262752)>>2)]=(616);
HEAP32[((5262756)>>2)]=(1070);
HEAP32[((5262772)>>2)]=(506);
HEAP32[((5262776)>>2)]=(104);
HEAP32[((5262796)>>2)]=(172);
HEAP32[((5262800)>>2)]=(1092);
HEAP32[((5262816)>>2)]=(686);
HEAP32[((5262820)>>2)]=(620);
HEAP32[((5262840)>>2)]=(1154);
HEAP32[((5262844)>>2)]=(1240);
HEAP32[((5262860)>>2)]=(542);
HEAP32[((5262864)>>2)]=(974);
HEAP32[((5262884)>>2)]=(414);
HEAP32[((5262888)>>2)]=(1346);
HEAP32[((5262904)>>2)]=(824);
HEAP32[((5262908)>>2)]=(1230);
HEAP32[((5262928)>>2)]=(536);
HEAP32[((5262932)>>2)]=(1026);
HEAP32[((5262948)>>2)]=(196);
HEAP32[((5262952)>>2)]=(232);
HEAP32[((5262968)>>2)]=(1120);
HEAP32[((5262972)>>2)]=(294);
HEAP32[((5262976)>>2)]=(720);
HEAP32[((5262980)>>2)]=(738);
HEAP32[((5262984)>>2)]=(614);
HEAP32[((5262988)>>2)]=(716);
HEAP32[((5262992)>>2)]=(458);
HEAP32[((5262996)>>2)]=(872);
HEAP32[((5263000)>>2)]=(632);
HEAP32[((5263004)>>2)]=(1232);
HEAP32[((5263008)>>2)]=(96);
HEAP32[((5263012)>>2)]=(600);
HEAP32[((5263016)>>2)]=(598);
HEAP32[((5263020)>>2)]=(1208);
HEAP32[((5263036)>>2)]=(1010);
HEAP32[((5263040)>>2)]=(826);
HEAP32[((5263044)>>2)]=(386);
HEAP32[((5263060)>>2)]=(1288);
HEAP32[((5263064)>>2)]=(194);
HEAP32[((5263068)>>2)]=(326);
HEAP32[((5263072)>>2)]=(710);
HEAP32[((5263076)>>2)]=(446);
HEAP32[((5263080)>>2)]=(846);
HEAP32[((5263084)>>2)]=(512);
HEAP32[((5263088)>>2)]=(1018);
HEAP32[((5263092)>>2)]=(1100);
HEAP32[((5263096)>>2)]=(266);
HEAP32[((5263100)>>2)]=(236);
HEAP32[((5263104)>>2)]=(224);
HEAP32[((5263108)>>2)]=(32);
HEAP32[((5263112)>>2)]=(1246);
HEAP32[((5263128)>>2)]=(730);
HEAP32[((5263132)>>2)]=(828);
HEAP32[((5263136)>>2)]=(556);
HEAP32[((5263140)>>2)]=(474);
HEAP32[((5263144)>>2)]=(1188);
HEAP32[((5263148)>>2)]=(552);
HEAP32[((5263152)>>2)]=(906);
HEAP32[((5263156)>>2)]=(872);
HEAP32[((5263160)>>2)]=(632);
HEAP32[((5263164)>>2)]=(56);
HEAP32[((5263168)>>2)]=(96);
HEAP32[((5263172)>>2)]=(1238);
HEAP32[((5263176)>>2)]=(598);
HEAP32[((5263180)>>2)]=(320);
HEAP32[((5263196)>>2)]=(1170);
HEAP32[((5263200)>>2)]=(684);
HEAP32[((5263204)>>2)]=(210);
HEAP32[((5263208)>>2)]=(650);
HEAP32[((5263212)>>2)]=(1136);
HEAP32[((5263216)>>2)]=(688);
HEAP32[((5263220)>>2)]=(1308);
HEAP32[((5263224)>>2)]=(92);
HEAP32[((5263228)>>2)]=(484);
HEAP32[((5263232)>>2)]=(482);
HEAP32[((5263236)>>2)]=(378);
HEAP32[((5263240)>>2)]=(640);
HEAP32[((5263256)>>2)]=(518);
HEAP32[((5263260)>>2)]=(260);
HEAP32[((5263264)>>2)]=(210);
HEAP32[((5263268)>>2)]=(1270);
HEAP32[((5263272)>>2)]=(1112);
HEAP32[((5263276)>>2)]=(1014);
HEAP32[((5263280)>>2)]=(350);
HEAP32[((5263284)>>2)]=(1206);
HEAP32[((5263288)>>2)]=(426);
HEAP32[((5263292)>>2)]=(1104);
HEAP32[((5263296)>>2)]=(1038);
HEAP32[((5263300)>>2)]=(240);
HEAP32[((5263316)>>2)]=(1180);
HEAP32[((5263320)>>2)]=(570);
HEAP32[((5263324)>>2)]=(210);
HEAP32[((5263328)>>2)]=(162);
HEAP32[((5263332)>>2)]=(806);
HEAP32[((5263336)>>2)]=(760);
HEAP32[((5263340)>>2)]=(736);
HEAP32[((5263344)>>2)]=(1328);
HEAP32[((5263348)>>2)]=(1062);
HEAP32[((5263352)>>2)]=(964);
HEAP32[((5263356)>>2)]=(844);
HEAP32[((5263360)>>2)]=(532);
HEAP32[((5263376)>>2)]=(368);
HEAP32[((5263380)>>2)]=(784);
HEAP32[((5263384)>>2)]=(210);
HEAP32[((5263388)>>2)]=(1024);
HEAP32[((5263392)>>2)]=(1064);
HEAP32[((5263396)>>2)]=(476);
HEAP32[((5263400)>>2)]=(1132);
HEAP32[((5263404)>>2)]=(436);
HEAP32[((5263408)>>2)]=(354);
HEAP32[((5263412)>>2)]=(748);
HEAP32[((5263416)>>2)]=(1086);
HEAP32[((5263420)>>2)]=(1068);
HEAP32[((5263436)>>2)]=(928);
HEAP32[((5263440)>>2)]=(60);
HEAP32[((5263444)>>2)]=(864);
HEAP32[((5263448)>>2)]=(710);
HEAP32[((5263452)>>2)]=(446);
HEAP32[((5263456)>>2)]=(846);
HEAP32[((5263460)>>2)]=(298);
HEAP32[((5263464)>>2)]=(1018);
HEAP32[((5263468)>>2)]=(1100);
HEAP32[((5263472)>>2)]=(670);
HEAP32[((5263476)>>2)]=(838);
HEAP32[((5263480)>>2)]=(538);
HEAP32[((5263484)>>2)]=(32);
HEAP32[((5263488)>>2)]=(878);
HEAP32[((5263504)>>2)]=(50);
HEAP32[((5263508)>>2)]=(1160);
HEAP32[((5263512)>>2)]=(1008);
HEAP32[((5263516)>>2)]=(474);
HEAP32[((5263520)>>2)]=(1188);
HEAP32[((5263524)>>2)]=(552);
HEAP32[((5263528)>>2)]=(256);
HEAP32[((5263532)>>2)]=(872);
HEAP32[((5263536)>>2)]=(632);
HEAP32[((5263540)>>2)]=(166);
HEAP32[((5263544)>>2)]=(222);
HEAP32[((5263548)>>2)]=(54);
HEAP32[((5263552)>>2)]=(598);
HEAP32[((5263556)>>2)]=(1186);
HEAP32[((5263572)>>2)]=(1306);
HEAP32[((5263576)>>2)]=(1202);
HEAP32[((5263592)>>2)]=(346);
HEAP32[((5263596)>>2)]=(1220);
HEAP32[((5263612)>>2)]=(520);
HEAP32[((5263616)>>2)]=(910);
HEAP32[((5263632)>>2)]=(454);
HEAP32[((5263636)>>2)]=(12);
HEAP32[((5263652)>>2)]=(1114);
HEAP32[((5263656)>>2)]=(646);
HEAP32[((5263672)>>2)]=(526);
HEAP32[((5263676)>>2)]=(452);
HEAP32[((5263692)>>2)]=(962);
HEAP32[((5263696)>>2)]=(418);
HEAP32[((5263700)>>2)]=(1030);
HEAP32[((5263704)>>2)]=(514);
HEAP32[((5263708)>>2)]=(1290);
HEAP32[((5263712)>>2)]=(564);
HEAP32[((5263716)>>2)]=(902);
HEAP32[((5263720)>>2)]=(890);
HEAP32[((5263724)>>2)]=(6);
HEAP32[((5263740)>>2)]=(794);
HEAP32[((5263744)>>2)]=(1278);
HEAP32[((5263748)>>2)]=(1030);
HEAP32[((5263752)>>2)]=(128);
HEAP32[((5263756)>>2)]=(116);
HEAP32[((5263760)>>2)]=(1102);
HEAP32[((5263764)>>2)]=(902);
HEAP32[((5263768)>>2)]=(890);
HEAP32[((5263772)>>2)]=(450);
HEAP32[((5263788)>>2)]=(226);
HEAP32[((5263792)>>2)]=(408);
HEAP32[((5263796)>>2)]=(1030);
HEAP32[((5263800)>>2)]=(882);
HEAP32[((5263804)>>2)]=(882);
HEAP32[((5263808)>>2)]=(882);
HEAP32[((5263812)>>2)]=(902);
HEAP32[((5263816)>>2)]=(890);
HEAP32[((5263820)>>2)]=(40);
HEAP32[((5263836)>>2)]=(1042);
HEAP32[((5263840)>>2)]=(960);
HEAP32[((5263844)>>2)]=(292);
HEAP32[((5263848)>>2)]=(706);
HEAP32[((5263852)>>2)]=(362);
HEAP32[((5263856)>>2)]=(108);
HEAP32[((5263860)>>2)]=(1142);
HEAP32[((5263864)>>2)]=(488);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(8))>>2)]=(1042);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(12))>>2)]=(624);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(16))>>2)]=(292);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(20))>>2)]=(706);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(24))>>2)]=(362);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(28))>>2)]=(168);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(32))>>2)]=(428);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(36))>>2)]=(478);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(8))>>2)]=(1042);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(12))>>2)]=(1284);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(16))>>2)]=(292);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(20))>>2)]=(706);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(24))>>2)]=(362);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(28))>>2)]=(990);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(32))>>2)]=(472);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(36))>>2)]=(742);
HEAP32[((5263880)>>2)]=(1012);
HEAP32[((5263884)>>2)]=(98);
HEAP32[((5263888)>>2)]=(244);
HEAP32[((5263892)>>2)]=(1156);
HEAP32[((5263896)>>2)]=(884);
HEAP32[((5263900)>>2)]=(1058);
HEAP32[((5263904)>>2)]=(330);
HEAP32[((5263908)>>2)]=(674);
HEAP32[((5263912)>>2)]=(424);
HEAP32[((5263916)>>2)]=(636);
HEAP32[((5263920)>>2)]=(1312);
HEAP32[((5263924)>>2)]=(468);
HEAP32[((5263928)>>2)]=(1254);
HEAP32[((5263932)>>2)]=(430);
HEAP32[((5263936)>>2)]=(1182);
HEAP32[((5263952)>>2)]=(282);
HEAP32[((5263956)>>2)]=(252);
HEAP32[((5263960)>>2)]=(882);
HEAP32[((5263964)>>2)]=(694);
HEAP32[((5263968)>>2)]=(884);
HEAP32[((5263972)>>2)]=(882);
HEAP32[((5263976)>>2)]=(330);
HEAP32[((5263980)>>2)]=(674);
HEAP32[((5263984)>>2)]=(566);
HEAP32[((5263988)>>2)]=(1292);
HEAP32[((5263992)>>2)]=(456);
HEAP32[((5263996)>>2)]=(1196);
HEAP32[((5264000)>>2)]=(394);
HEAP32[((5264004)>>2)]=(312);
HEAP32[((5264008)>>2)]=(516);
HEAP32[((5267500)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5267504)>>2)]=((5264016)|0);
HEAP32[((5267508)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5267512)>>2)]=((5264032)|0);
HEAP32[((5267516)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5267520)>>2)]=((5264048)|0);
HEAP32[((5267528)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5267532)>>2)]=((5264064)|0);
HEAP32[((5267540)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5267544)>>2)]=((5264076)|0);
HEAP32[((5267552)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5267556)>>2)]=((5264096)|0);
HEAP32[((5267564)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5267568)>>2)]=((5264116)|0);
HEAP32[((5267576)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5267580)>>2)]=((5264136)|0);
HEAP32[((5267588)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5267592)>>2)]=((5264152)|0);
HEAP32[((5267596)>>2)]=(((5263836)|0));
HEAP32[((5267600)>>2)]=((5264172)|0);
HEAP32[((5267628)>>2)]=(((5263836)|0));
HEAP32[((5267632)>>2)]=((5264244)|0);
HEAP32[((5267660)>>2)]=(((5263836)|0));
HEAP32[((5267664)>>2)]=((5264316)|0);
HEAP32[((5267692)>>2)]=(((5263836)|0));
HEAP32[((5267696)>>2)]=((5264388)|0);
HEAP32[((5267724)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5267728)>>2)]=((5264460)|0);
HEAP32[((5267736)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5267740)>>2)]=((5264504)|0);
HEAP32[((5267748)>>2)]=(((5263836)|0));
HEAP32[((5267752)>>2)]=((5264548)|0);
HEAP32[((5267772)>>2)]=(((5263836)|0));
HEAP32[((5267776)>>2)]=((5264572)|0);
HEAP32[((5267796)>>2)]=(((5263836)|0));
HEAP32[((5267800)>>2)]=((5264596)|0);
HEAP32[((5267820)>>2)]=(((5263836)|0));
HEAP32[((5267824)>>2)]=((5264620)|0);
HEAP32[((5267844)>>2)]=(((5263836)|0));
HEAP32[((5267848)>>2)]=((5264644)|0);
HEAP32[((5267876)>>2)]=(((5263836)|0));
HEAP32[((5267880)>>2)]=((5264716)|0);
HEAP32[((5267908)>>2)]=(((5263836)|0));
HEAP32[((5267912)>>2)]=((5264788)|0);
HEAP32[((5267948)>>2)]=(((5263836)|0));
HEAP32[((5267952)>>2)]=((5264860)|0);
HEAP32[((5267988)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5267992)>>2)]=((5264932)|0);
HEAP32[((5268000)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268004)>>2)]=((5264956)|0);
HEAP32[((5268012)>>2)]=(((5263836)|0));
HEAP32[((5268016)>>2)]=((5264980)|0);
HEAP32[((5268044)>>2)]=(((5263836)|0));
HEAP32[((5268048)>>2)]=((5265004)|0);
HEAP32[((5268076)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268080)>>2)]=((5265028)|0);
HEAP32[((5268084)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268088)>>2)]=((5265080)|0);
HEAP32[((5268092)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268096)>>2)]=((5265100)|0);
HEAP32[((5268104)>>2)]=(((5263836)|0));
HEAP32[((5268108)>>2)]=((5265128)|0);
HEAP32[((5268136)>>2)]=(((5263836)|0));
HEAP32[((5268140)>>2)]=((5265196)|0);
HEAP32[((5268168)>>2)]=(((5263836)|0));
HEAP32[((5268172)>>2)]=((5265264)|0);
HEAP32[((5268200)>>2)]=(((5263836)|0));
HEAP32[((5268204)>>2)]=((5265332)|0);
HEAP32[((5268232)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268236)>>2)]=((5265400)|0);
HEAP32[((5268244)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268248)>>2)]=((5265420)|0);
HEAP32[((5268256)>>2)]=(((5263836)|0));
HEAP32[((5268260)>>2)]=((5265440)|0);
HEAP32[((5268288)>>2)]=(((5263836)|0));
HEAP32[((5268292)>>2)]=((5265476)|0);
HEAP32[((5268320)>>2)]=(((5263836)|0));
HEAP32[((5268324)>>2)]=((5265512)|0);
HEAP32[((5268352)>>2)]=(((5263836)|0));
HEAP32[((5268356)>>2)]=((5265548)|0);
HEAP32[((5268384)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268388)>>2)]=((5265584)|0);
HEAP32[((5268396)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268400)>>2)]=((5265608)|0);
HEAP32[((5268408)>>2)]=(((5263836)|0));
HEAP32[((5268412)>>2)]=((5265632)|0);
HEAP32[((5268440)>>2)]=(((5263836)|0));
HEAP32[((5268444)>>2)]=((5265652)|0);
HEAP32[((5268472)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268476)>>2)]=((5265672)|0);
HEAP32[((5268480)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268484)>>2)]=((5265708)|0);
HEAP32[((5268488)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268492)>>2)]=((5265744)|0);
HEAP32[((5268500)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268504)>>2)]=((5265776)|0);
HEAP32[((5268512)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268516)>>2)]=((5265848)|0);
HEAP32[((5268524)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268528)>>2)]=((5265884)|0);
HEAP32[((5268536)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268540)>>2)]=((5265920)|0);
HEAP32[((5268548)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268552)>>2)]=((5265988)|0);
HEAP32[((5268556)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268560)>>2)]=((5266040)|0);
HEAP32[((5268564)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268568)>>2)]=((5266092)|0);
HEAP32[((5268572)>>2)]=(((5263836)|0));
HEAP32[((5268576)>>2)]=((5266120)|0);
HEAP32[((5268604)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268608)>>2)]=((5266168)|0);
HEAP32[((5268616)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268620)>>2)]=((5266216)|0);
HEAP32[((5268624)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268628)>>2)]=((5266244)|0);
HEAP32[((5268632)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268636)>>2)]=((5266272)|0);
HEAP32[((5268640)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268644)>>2)]=((5266300)|0);
HEAP32[((5268648)>>2)]=(((5263836)|0));
HEAP32[((5268652)>>2)]=((5266324)|0);
HEAP32[((5268672)>>2)]=(((5263836)|0));
HEAP32[((5268676)>>2)]=((5266372)|0);
HEAP32[((5268696)>>2)]=(((5263836)|0));
HEAP32[((5268700)>>2)]=((5266420)|0);
HEAP32[((5268720)>>2)]=(((5263836)|0));
HEAP32[((5268724)>>2)]=((5266468)|0);
HEAP32[((5268744)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268748)>>2)]=((5266516)|0);
HEAP32[((5268756)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268760)>>2)]=((5266564)|0);
HEAP32[((5268768)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268772)>>2)]=((5266588)|0);
HEAP32[((5268776)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268780)>>2)]=((5266612)|0);
HEAP32[((5268788)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268792)>>2)]=((5266636)|0);
HEAP32[((5268800)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5268804)>>2)]=((5266664)|0);
HEAP32[((5268812)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268816)>>2)]=((5266692)|0);
HEAP32[((5268820)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268824)>>2)]=((5266720)|0);
HEAP32[((5268828)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268832)>>2)]=((5266748)|0);
HEAP32[((5268836)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268840)>>2)]=((5266776)|0);
HEAP32[((5268844)>>2)]=(((5263836)|0));
HEAP32[((5268848)>>2)]=((5266804)|0);
HEAP32[((5268876)>>2)]=(((5263836)|0));
HEAP32[((5268880)>>2)]=((5266832)|0);
HEAP32[((5268908)>>2)]=(((5263836)|0));
HEAP32[((5268912)>>2)]=((5266860)|0);
HEAP32[((5268940)>>2)]=(((5263836)|0));
HEAP32[((5268944)>>2)]=((5266888)|0);
HEAP32[((5268972)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268976)>>2)]=((5266916)|0);
HEAP32[((5268980)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268984)>>2)]=((5266940)|0);
HEAP32[((5268988)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5268992)>>2)]=((5266964)|0);
HEAP32[((5268996)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269000)>>2)]=((5266988)|0);
HEAP32[((5269008)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269012)>>2)]=((5267012)|0);
HEAP32[((5269020)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5269024)>>2)]=((5267036)|0);
HEAP32[((5269028)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5269032)>>2)]=((5267068)|0);
HEAP32[((5269036)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5269040)>>2)]=((5267100)|0);
HEAP32[((5269044)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5269048)>>2)]=((5267136)|0);
HEAP32[((5269052)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269056)>>2)]=((5267172)|0);
HEAP32[((5269064)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269068)>>2)]=((5267208)|0);
HEAP32[((5269076)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269080)>>2)]=((5267244)|0);
HEAP32[((5269088)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269092)>>2)]=((5267268)|0);
HEAP32[((5269100)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5269104)>>2)]=((5267292)|0);
HEAP32[((5269108)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269112)>>2)]=((5267320)|0);
HEAP32[((5269120)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269124)>>2)]=((5267360)|0);
HEAP32[((5269132)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269136)>>2)]=((5267400)|0);
HEAP32[((5269144)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269148)>>2)]=((5267436)|0);
HEAP32[((5269156)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5269160)>>2)]=((5267472)|0);
HEAP32[((5269168)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5269172)>>2)]=((5267484)|0);
HEAP32[((5269188)>>2)]=(536);
HEAP32[((5269192)>>2)]=(1026);
HEAP32[((5269208)>>2)]=(196);
HEAP32[((5269212)>>2)]=(232);
HEAP32[((5269228)>>2)]=(536);
HEAP32[((5269232)>>2)]=(1026);
HEAP32[((5269248)>>2)]=(196);
HEAP32[((5269252)>>2)]=(232);
  function ___gxx_personality_v0() {
    }
  function ___cxa_call_unexpected(exception) {
      Module.printErr('Unexpected exception thrown, this is not properly supported - aborting');
      ABORT = true;
      throw exception;
    }
  function _memcpy(dest, src, num) {
      dest = dest|0; src = src|0; num = num|0;
      var ret = 0;
      ret = dest|0;
      if ((dest&3) == (src&3)) {
        while (dest & 3) {
          if ((num|0) == 0) return ret|0;
          HEAP8[(dest)]=HEAP8[(src)];
          dest = (dest+1)|0;
          src = (src+1)|0;
          num = (num-1)|0;
        }
        while ((num|0) >= 4) {
          HEAP32[((dest)>>2)]=HEAP32[((src)>>2)];
          dest = (dest+4)|0;
          src = (src+4)|0;
          num = (num-4)|0;
        }
      }
      while ((num|0) > 0) {
        HEAP8[(dest)]=HEAP8[(src)];
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      return ret|0;
    }var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;
  function ___assert_func(filename, line, func, condition) {
      throw 'Assertion failed: ' + (condition ? Pointer_stringify(condition) : 'unknown condition') + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + new Error().stack;
    }
  function _round(x) {
      return (x < 0) ? -Math.round(-x) : Math.round(x);
    }var _lround=_round;
  var _fabs=Math.abs;
  function _strlen(ptr) {
      ptr = ptr|0;
      var curr = 0;
      curr = ptr;
      while (HEAP8[(curr)]|0 != 0) {
        curr = (curr + 1)|0;
      }
      return (curr - ptr)|0;
    }
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = (HEAP32[((tempDoublePtr)>>2)]=HEAP32[(((varargs)+(argIndex))>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((varargs)+((argIndex)+(4)))>>2)],HEAPF64[(tempDoublePtr)>>3]);
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+4))>>2)]];
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Runtime.getNativeFieldSize(type);
        return ret;
      }
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[(textIndex)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)|0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          }
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)|0)];
            }
          }
          // Handle precision.
          var precisionSet = false;
          if (next == 46) {
            var precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)|0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)|0)];
          } else {
            var precision = 6; // Standard default.
          }
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)|0)];
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = flagAlternative ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
              // Add sign if needed
              if (flagAlwaysSigned) {
                if (currArg < 0) {
                  prefix = '-' + prefix;
                } else {
                  prefix = '+' + prefix;
                }
              }
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
                // Add sign.
                if (flagAlwaysSigned && currArg >= 0) {
                  argText = '+' + argText;
                }
              }
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*') || nullString;
              var argLength = _strlen(arg);
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              for (var i = 0; i < argLength; i++) {
                ret.push(HEAPU8[((arg++)|0)]);
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[(i)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _snprintf(s, n, format, varargs) {
      // int snprintf(char *restrict s, size_t n, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var limit = (n === undefined) ? result.length
                                    : Math.min(result.length, Math.max(n - 1, 0));
      if (s < 0) {
        s = -s;
        var buf = _malloc(limit+1);
        HEAP32[((s)>>2)]=buf;
        s = buf;
      }
      for (var i = 0; i < limit; i++) {
        HEAP8[(((s)+(i))|0)]=result[i];
      }
      if (limit < n || (n === undefined)) HEAP8[(((s)+(i))|0)]=0;
      return result.length;
    }function _sprintf(s, format, varargs) {
      // int sprintf(char *restrict s, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      return _snprintf(s, undefined, format, varargs);
    }
  function _memcmp(p1, p2, num) {
      p1 = p1|0; p2 = p2|0; num = num|0;
      var i = 0, v1 = 0, v2 = 0;
      while ((i|0) < (num|0)) {
        var v1 = HEAPU8[(((p1)+(i))|0)];
        var v2 = HEAPU8[(((p2)+(i))|0)];
        if ((v1|0) != (v2|0)) return ((v1|0) > (v2|0) ? 1 : -1)|0;
        i = (i+1)|0;
      }
      return 0;
    }
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }function ___cxa_begin_catch(ptr) {
      __ZSt18uncaught_exceptionv.uncaught_exception--;
      return ptr;
    }
  function _llvm_eh_exception() {
      return HEAP32[((_llvm_eh_exception.buf)>>2)];
    }
  function ___cxa_free_exception(ptr) {
      return _free(ptr);
    }function ___cxa_end_catch() {
      if (___cxa_end_catch.rethrown) {
        ___cxa_end_catch.rethrown = false;
        return;
      }
      // Clear state flag.
      __THREW__ = 0;
      // Clear type.
      HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)]=0
      // Call destructor if one is registered then clear it.
      var ptr = HEAP32[((_llvm_eh_exception.buf)>>2)];
      var destructor = HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)];
      if (destructor) {
        Runtime.dynCall('vi', destructor, [ptr]);
        HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)]=0
      }
      // Free ptr if it isn't null.
      if (ptr) {
        ___cxa_free_exception(ptr);
        HEAP32[((_llvm_eh_exception.buf)>>2)]=0
      }
    }
  function _memset(ptr, value, num) {
      ptr = ptr|0; value = value|0; num = num|0;
      var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
      stop = (ptr + num)|0;
      if ((num|0) >= 20) {
        // This is unaligned, but quite large, so work hard to get to aligned settings
        value = value & 0xff;
        unaligned = ptr & 3;
        value4 = value | (value << 8) | (value << 16) | (value << 24);
        stop4 = stop & ~3;
        if (unaligned) {
          unaligned = (ptr + 4 - unaligned)|0;
          while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
            HEAP8[(ptr)]=value;
            ptr = (ptr+1)|0;
          }
        }
        while ((ptr|0) < (stop4|0)) {
          HEAP32[((ptr)>>2)]=value4;
          ptr = (ptr+4)|0;
        }
      }
      while ((ptr|0) < (stop|0)) {
        HEAP8[(ptr)]=value;
        ptr = (ptr+1)|0;
      }
    }var _llvm_memset_p0i8_i32=_memset;
  function _memmove(dest, src, num) {
      dest = dest|0; src = src|0; num = num|0;
      if (((src|0) < (dest|0)) & ((dest|0) < ((src + num)|0))) {
        // Unlikely case: Copy backwards in a safe manner
        src = (src + num)|0;
        dest = (dest + num)|0;
        while ((num|0) > 0) {
          dest = (dest - 1)|0;
          src = (src - 1)|0;
          num = (num - 1)|0;
          HEAP8[(dest)]=HEAP8[(src)];
        }
      } else {
        _memcpy(dest, src, num);
      }
    }var _llvm_memmove_p0i8_p0i8_i32=_memmove;
  function _isprint(chr) {
      return 0x1F < chr && chr < 0x7F;
    }
  function ___cxa_pure_virtual() {
      ABORT = true;
      throw 'Pure virtual function called!';
    }
  function _strcpy(pdest, psrc) {
      pdest = pdest|0; psrc = psrc|0;
      var i = 0;
      do {
        HEAP8[(((pdest+i)|0)|0)]=HEAP8[(((psrc+i)|0)|0)];
        i = (i+1)|0;
      } while ((HEAP8[(((psrc)+(i-1))|0)])|0 != 0);
      return pdest|0;
    }
  function _memchr(ptr, chr, num) {
      chr = unSign(chr);
      for (var i = 0; i < num; i++) {
        if (HEAP8[(ptr)] == chr) return ptr;
        ptr++;
      }
      return 0;
    }
  var _vsnprintf=_snprintf;
  function _llvm_va_end() {}
  function _abort() {
      ABORT = true;
      throw 'abort() at ' + (new Error().stack);
    }
  var ERRNO_CODES={E2BIG:7,EACCES:13,EADDRINUSE:98,EADDRNOTAVAIL:99,EAFNOSUPPORT:97,EAGAIN:11,EALREADY:114,EBADF:9,EBADMSG:74,EBUSY:16,ECANCELED:125,ECHILD:10,ECONNABORTED:103,ECONNREFUSED:111,ECONNRESET:104,EDEADLK:35,EDESTADDRREQ:89,EDOM:33,EDQUOT:122,EEXIST:17,EFAULT:14,EFBIG:27,EHOSTUNREACH:113,EIDRM:43,EILSEQ:84,EINPROGRESS:115,EINTR:4,EINVAL:22,EIO:5,EISCONN:106,EISDIR:21,ELOOP:40,EMFILE:24,EMLINK:31,EMSGSIZE:90,EMULTIHOP:72,ENAMETOOLONG:36,ENETDOWN:100,ENETRESET:102,ENETUNREACH:101,ENFILE:23,ENOBUFS:105,ENODATA:61,ENODEV:19,ENOENT:2,ENOEXEC:8,ENOLCK:37,ENOLINK:67,ENOMEM:12,ENOMSG:42,ENOPROTOOPT:92,ENOSPC:28,ENOSR:63,ENOSTR:60,ENOSYS:38,ENOTCONN:107,ENOTDIR:20,ENOTEMPTY:39,ENOTRECOVERABLE:131,ENOTSOCK:88,ENOTSUP:95,ENOTTY:25,ENXIO:6,EOVERFLOW:75,EOWNERDEAD:130,EPERM:1,EPIPE:32,EPROTO:71,EPROTONOSUPPORT:93,EPROTOTYPE:91,ERANGE:34,EROFS:30,ESPIPE:29,ESRCH:3,ESTALE:116,ETIME:62,ETIMEDOUT:110,ETXTBSY:26,EWOULDBLOCK:11,EXDEV:18};
  function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      if (!___setErrNo.ret) ___setErrNo.ret = allocate([0], 'i32', ALLOC_STATIC);
      HEAP32[((___setErrNo.ret)>>2)]=value
      return value;
    }
  var _stdin=allocate(1, "i32*", ALLOC_STACK);
  var _stdout=allocate(1, "i32*", ALLOC_STACK);
  var _stderr=allocate(1, "i32*", ALLOC_STACK);
  var __impure_ptr=allocate(1, "i32*", ALLOC_STACK);var FS={currentPath:"/",nextInode:2,streams:[null],ignorePermissions:true,joinPath:function (parts, forceRelative) {
        var ret = parts[0];
        for (var i = 1; i < parts.length; i++) {
          if (ret[ret.length-1] != '/') ret += '/';
          ret += parts[i];
        }
        if (forceRelative && ret[0] == '/') ret = ret.substr(1);
        return ret;
      },absolutePath:function (relative, base) {
        if (typeof relative !== 'string') return null;
        if (base === undefined) base = FS.currentPath;
        if (relative && relative[0] == '/') base = '';
        var full = base + '/' + relative;
        var parts = full.split('/').reverse();
        var absolute = [''];
        while (parts.length) {
          var part = parts.pop();
          if (part == '' || part == '.') {
            // Nothing.
          } else if (part == '..') {
            if (absolute.length > 1) absolute.pop();
          } else {
            absolute.push(part);
          }
        }
        return absolute.length == 1 ? '/' : absolute.join('/');
      },analyzePath:function (path, dontResolveLastLink, linksVisited) {
        var ret = {
          isRoot: false,
          exists: false,
          error: 0,
          name: null,
          path: null,
          object: null,
          parentExists: false,
          parentPath: null,
          parentObject: null
        };
        path = FS.absolutePath(path);
        if (path == '/') {
          ret.isRoot = true;
          ret.exists = ret.parentExists = true;
          ret.name = '/';
          ret.path = ret.parentPath = '/';
          ret.object = ret.parentObject = FS.root;
        } else if (path !== null) {
          linksVisited = linksVisited || 0;
          path = path.slice(1).split('/');
          var current = FS.root;
          var traversed = [''];
          while (path.length) {
            if (path.length == 1 && current.isFolder) {
              ret.parentExists = true;
              ret.parentPath = traversed.length == 1 ? '/' : traversed.join('/');
              ret.parentObject = current;
              ret.name = path[0];
            }
            var target = path.shift();
            if (!current.isFolder) {
              ret.error = ERRNO_CODES.ENOTDIR;
              break;
            } else if (!current.read) {
              ret.error = ERRNO_CODES.EACCES;
              break;
            } else if (!current.contents.hasOwnProperty(target)) {
              ret.error = ERRNO_CODES.ENOENT;
              break;
            }
            current = current.contents[target];
            if (current.link && !(dontResolveLastLink && path.length == 0)) {
              if (linksVisited > 40) { // Usual Linux SYMLOOP_MAX.
                ret.error = ERRNO_CODES.ELOOP;
                break;
              }
              var link = FS.absolutePath(current.link, traversed.join('/'));
              ret = FS.analyzePath([link].concat(path).join('/'),
                                   dontResolveLastLink, linksVisited + 1);
              return ret;
            }
            traversed.push(target);
            if (path.length == 0) {
              ret.exists = true;
              ret.path = traversed.join('/');
              ret.object = current;
            }
          }
        }
        return ret;
      },findObject:function (path, dontResolveLastLink) {
        FS.ensureRoot();
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },createObject:function (parent, name, properties, canRead, canWrite) {
        if (!parent) parent = '/';
        if (typeof parent === 'string') parent = FS.findObject(parent);
        if (!parent) {
          ___setErrNo(ERRNO_CODES.EACCES);
          throw new Error('Parent path must exist.');
        }
        if (!parent.isFolder) {
          ___setErrNo(ERRNO_CODES.ENOTDIR);
          throw new Error('Parent must be a folder.');
        }
        if (!parent.write && !FS.ignorePermissions) {
          ___setErrNo(ERRNO_CODES.EACCES);
          throw new Error('Parent folder must be writeable.');
        }
        if (!name || name == '.' || name == '..') {
          ___setErrNo(ERRNO_CODES.ENOENT);
          throw new Error('Name must not be empty.');
        }
        if (parent.contents.hasOwnProperty(name)) {
          ___setErrNo(ERRNO_CODES.EEXIST);
          throw new Error("Can't overwrite object.");
        }
        parent.contents[name] = {
          read: canRead === undefined ? true : canRead,
          write: canWrite === undefined ? false : canWrite,
          timestamp: Date.now(),
          inodeNumber: FS.nextInode++
        };
        for (var key in properties) {
          if (properties.hasOwnProperty(key)) {
            parent.contents[name][key] = properties[key];
          }
        }
        return parent.contents[name];
      },createFolder:function (parent, name, canRead, canWrite) {
        var properties = {isFolder: true, isDevice: false, contents: {}};
        return FS.createObject(parent, name, properties, canRead, canWrite);
      },createPath:function (parent, path, canRead, canWrite) {
        var current = FS.findObject(parent);
        if (current === null) throw new Error('Invalid parent.');
        path = path.split('/').reverse();
        while (path.length) {
          var part = path.pop();
          if (!part) continue;
          if (!current.contents.hasOwnProperty(part)) {
            FS.createFolder(current, part, canRead, canWrite);
          }
          current = current.contents[part];
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        properties.isFolder = false;
        return FS.createObject(parent, name, properties, canRead, canWrite);
      },createDataFile:function (parent, name, data, canRead, canWrite) {
        if (typeof data === 'string') {
          var dataArray = new Array(data.length);
          for (var i = 0, len = data.length; i < len; ++i) dataArray[i] = data.charCodeAt(i);
          data = dataArray;
        }
        var properties = {
          isDevice: false,
          contents: data.subarray ? data.subarray(0) : data // as an optimization, create a new array wrapper (not buffer) here, to help JS engines understand this object
        };
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          var LazyUint8Array = function(chunkSize, length) {
            this.length = length;
            this.chunkSize = chunkSize;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % chunkSize;
            var chunkNum = Math.floor(idx / chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function(getter) {
            this.getter = getter;
          }
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
          if (!hasByteServing) chunkSize = datalength;
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = new LazyUint8Array(chunkSize, datalength);
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * lazyArray.chunkSize;
            var end = (chunkNum+1) * lazyArray.chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile) {
        Browser.init();
        var fullname = FS.joinPath([parent, name], true);
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },createLink:function (parent, name, target, canRead, canWrite) {
        var properties = {isDevice: false, link: target};
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createDevice:function (parent, name, input, output) {
        if (!(input || output)) {
          throw new Error('A device must have at least one callback defined.');
        }
        var ops = {isDevice: true, input: input, output: output};
        return FS.createFile(parent, name, ops, Boolean(input), Boolean(output));
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },ensureRoot:function () {
        if (FS.root) return;
        // The main file system tree. All the contents are inside this.
        FS.root = {
          read: true,
          write: true,
          isFolder: true,
          isDevice: false,
          timestamp: Date.now(),
          inodeNumber: 1,
          contents: {}
        };
      },init:function (input, output, error) {
        // Make sure we initialize only once.
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
        FS.ensureRoot();
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input = input || Module['stdin'];
        output = output || Module['stdout'];
        error = error || Module['stderr'];
        // Default handlers.
        var stdinOverridden = true, stdoutOverridden = true, stderrOverridden = true;
        if (!input) {
          stdinOverridden = false;
          input = function() {
            if (!input.cache || !input.cache.length) {
              var result;
              if (typeof window != 'undefined' &&
                  typeof window.prompt == 'function') {
                // Browser.
                result = window.prompt('Input: ');
                if (result === null) result = String.fromCharCode(0); // cancel ==> EOF
              } else if (typeof readline == 'function') {
                // Command line.
                result = readline();
              }
              if (!result) result = '';
              input.cache = intArrayFromString(result + '\n', true);
            }
            return input.cache.shift();
          };
        }
        var utf8 = new Runtime.UTF8Processor();
        function simpleOutput(val) {
          if (val === null || val === 10) {
            output.printer(output.buffer.join(''));
            output.buffer = [];
          } else {
            output.buffer.push(utf8.processCChar(val));
          }
        }
        if (!output) {
          stdoutOverridden = false;
          output = simpleOutput;
        }
        if (!output.printer) output.printer = Module['print'];
        if (!output.buffer) output.buffer = [];
        if (!error) {
          stderrOverridden = false;
          error = simpleOutput;
        }
        if (!error.printer) error.printer = Module['print'];
        if (!error.buffer) error.buffer = [];
        // Create the temporary folder, if not already created
        try {
          FS.createFolder('/', 'tmp', true, true);
        } catch(e) {}
        // Create the I/O devices.
        var devFolder = FS.createFolder('/', 'dev', true, true);
        var stdin = FS.createDevice(devFolder, 'stdin', input);
        var stdout = FS.createDevice(devFolder, 'stdout', null, output);
        var stderr = FS.createDevice(devFolder, 'stderr', null, error);
        FS.createDevice(devFolder, 'tty', input, output);
        // Create default streams.
        FS.streams[1] = {
          path: '/dev/stdin',
          object: stdin,
          position: 0,
          isRead: true,
          isWrite: false,
          isAppend: false,
          isTerminal: !stdinOverridden,
          error: false,
          eof: false,
          ungotten: []
        };
        FS.streams[2] = {
          path: '/dev/stdout',
          object: stdout,
          position: 0,
          isRead: false,
          isWrite: true,
          isAppend: false,
          isTerminal: !stdoutOverridden,
          error: false,
          eof: false,
          ungotten: []
        };
        FS.streams[3] = {
          path: '/dev/stderr',
          object: stderr,
          position: 0,
          isRead: false,
          isWrite: true,
          isAppend: false,
          isTerminal: !stderrOverridden,
          error: false,
          eof: false,
          ungotten: []
        };
        assert(Math.max(_stdin, _stdout, _stderr) < 128); // make sure these are low, we flatten arrays with these
        HEAP32[((_stdin)>>2)]=1;
        HEAP32[((_stdout)>>2)]=2;
        HEAP32[((_stderr)>>2)]=3;
        // Other system paths
        FS.createPath('/', 'dev/shm/tmp', true, true); // temp files
        // Newlib initialization
        for (var i = FS.streams.length; i < Math.max(_stdin, _stdout, _stderr) + 4; i++) {
          FS.streams[i] = null; // Make sure to keep FS.streams dense
        }
        FS.streams[_stdin] = FS.streams[1];
        FS.streams[_stdout] = FS.streams[2];
        FS.streams[_stderr] = FS.streams[3];
        allocate([ allocate(
          [0, 0, 0, 0, _stdin, 0, 0, 0, _stdout, 0, 0, 0, _stderr, 0, 0, 0],
          'void*', ALLOC_STATIC) ], 'void*', ALLOC_NONE, __impure_ptr);
      },quit:function () {
        if (!FS.init.initialized) return;
        // Flush any partially-printed lines in stdout and stderr. Careful, they may have been closed
        if (FS.streams[2] && FS.streams[2].object.output.buffer.length > 0) FS.streams[2].object.output(10);
        if (FS.streams[3] && FS.streams[3].object.output.buffer.length > 0) FS.streams[3].object.output(10);
      },standardizePath:function (path) {
        if (path.substr(0, 2) == './') path = path.substr(2);
        return path;
      },deleteFile:function (path) {
        path = FS.analyzePath(path);
        if (!path.parentExists || !path.exists) {
          throw 'Invalid path ' + path;
        }
        delete path.parentObject.contents[path.name];
      }};
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.streams[fildes];
      if (!stream || stream.object.isDevice) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isWrite) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (stream.object.isFolder) {
        ___setErrNo(ERRNO_CODES.EISDIR);
        return -1;
      } else if (nbyte < 0 || offset < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        var contents = stream.object.contents;
        while (contents.length < offset) contents.push(0);
        for (var i = 0; i < nbyte; i++) {
          contents[offset + i] = HEAPU8[(((buf)+(i))|0)];
        }
        stream.object.timestamp = Date.now();
        return i;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.streams[fildes];
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isWrite) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (nbyte < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        if (stream.object.isDevice) {
          if (stream.object.output) {
            for (var i = 0; i < nbyte; i++) {
              try {
                stream.object.output(HEAP8[(((buf)+(i))|0)]);
              } catch (e) {
                ___setErrNo(ERRNO_CODES.EIO);
                return -1;
              }
            }
            stream.object.timestamp = Date.now();
            return i;
          } else {
            ___setErrNo(ERRNO_CODES.ENXIO);
            return -1;
          }
        } else {
          var bytesWritten = _pwrite(fildes, buf, nbyte, stream.position);
          if (bytesWritten != -1) stream.position += bytesWritten;
          return bytesWritten;
        }
      }
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var bytesWritten = _write(stream, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        if (FS.streams[stream]) FS.streams[stream].error = true;
        return 0;
      } else {
        return Math.floor(bytesWritten / size);
      }
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }
  function _longjmp(env, value) {
      throw { longjmp: true, id: HEAP32[((env)>>2)], value: value || 1 };
    }
  function _pread(fildes, buf, nbyte, offset) {
      // ssize_t pread(int fildes, void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/read.html
      var stream = FS.streams[fildes];
      if (!stream || stream.object.isDevice) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isRead) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (stream.object.isFolder) {
        ___setErrNo(ERRNO_CODES.EISDIR);
        return -1;
      } else if (nbyte < 0 || offset < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        var bytesRead = 0;
        while (stream.ungotten.length && nbyte > 0) {
          HEAP8[((buf++)|0)]=stream.ungotten.pop()
          nbyte--;
          bytesRead++;
        }
        var contents = stream.object.contents;
        var size = Math.min(contents.length - offset, nbyte);
        if (contents.subarray) { // typed array
          HEAPU8.set(contents.subarray(offset, offset+size), buf);
        } else
        if (contents.slice) { // normal array
          for (var i = 0; i < size; i++) {
            HEAP8[(((buf)+(i))|0)]=contents[offset + i]
          }
        } else {
          for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
            HEAP8[(((buf)+(i))|0)]=contents.get(offset + i)
          }
        }
        bytesRead += size;
        return bytesRead;
      }
    }function _read(fildes, buf, nbyte) {
      // ssize_t read(int fildes, void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/read.html
      var stream = FS.streams[fildes];
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isRead) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (nbyte < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        var bytesRead;
        if (stream.object.isDevice) {
          if (stream.object.input) {
            bytesRead = 0;
            while (stream.ungotten.length && nbyte > 0) {
              HEAP8[((buf++)|0)]=stream.ungotten.pop()
              nbyte--;
              bytesRead++;
            }
            for (var i = 0; i < nbyte; i++) {
              try {
                var result = stream.object.input();
              } catch (e) {
                ___setErrNo(ERRNO_CODES.EIO);
                return -1;
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              HEAP8[(((buf)+(i))|0)]=result
            }
            return bytesRead;
          } else {
            ___setErrNo(ERRNO_CODES.ENXIO);
            return -1;
          }
        } else {
          var ungotSize = stream.ungotten.length;
          bytesRead = _pread(fildes, buf, nbyte, stream.position);
          if (bytesRead != -1) {
            stream.position += (stream.ungotten.length - ungotSize) + bytesRead;
          }
          return bytesRead;
        }
      }
    }function _fread(ptr, size, nitems, stream) {
      // size_t fread(void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fread.html
      var bytesToRead = nitems * size;
      if (bytesToRead == 0) return 0;
      var bytesRead = _read(stream, ptr, bytesToRead);
      var streamObj = FS.streams[stream];
      if (bytesRead == -1) {
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        if (bytesRead < bytesToRead) streamObj.eof = true;
        return Math.floor(bytesRead / size);
      }
    }
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      var flush = function(filedes) {
        // Right now we write all data directly, except for output devices.
        if (FS.streams[filedes] && FS.streams[filedes].object.output) {
          if (!FS.streams[filedes].isTerminal) { // don't flush terminals, it would cause a \n to also appear
            FS.streams[filedes].object.output(null);
          }
        }
      };
      try {
        if (stream === 0) {
          for (var i = 0; i < FS.streams.length; i++) if (FS.streams[i]) flush(i);
        } else {
          flush(stream);
        }
        return 0;
      } catch (e) {
        ___setErrNo(ERRNO_CODES.EIO);
        return -1;
      }
    }
  function _tolower(chr) {
      chr = chr|0;
      if ((chr|0) < 65) return chr|0;
      if ((chr|0) > 90) return chr|0;
      return (chr - 65 + 97)|0;
    }
  function _strncpy(pdest, psrc, num) {
      pdest = pdest|0; psrc = psrc|0; num = num|0;
      var padding = 0, curr = 0, i = 0;
      while ((i|0) < (num|0)) {
        curr = padding ? 0 : HEAP8[(((psrc)+(i))|0)];
        HEAP8[(((pdest)+(i))|0)]=curr
        padding = padding ? 1 : (HEAP8[(((psrc)+(i))|0)] == 0);
        i = (i+1)|0;
      }
      return pdest|0;
    }
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      function ExitStatus() {
        this.name = "ExitStatus";
        this.message = "Program terminated with exit(" + status + ")";
        this.status = status;
        Module.print('Exit Status: ' + status);
      };
      ExitStatus.prototype = new Error();
      ExitStatus.prototype.constructor = ExitStatus;
      exitRuntime();
      ABORT = true;
      throw new ExitStatus();
    }function _exit(status) {
      __exit(status);
    }
  var _environ=allocate(1, "i32*", ALLOC_STACK);var ___environ=_environ;function ___buildEnvironment(env) {
      // WARNING: Arbitrary limit!
      var MAX_ENV_VALUES = 64;
      var TOTAL_ENV_SIZE = 1024;
      // Statically allocate memory for the environment.
      var poolPtr;
      var envPtr;
      if (!___buildEnvironment.called) {
        ___buildEnvironment.called = true;
        // Set default values. Use string keys for Closure Compiler compatibility.
        ENV['USER'] = 'root';
        ENV['PATH'] = '/';
        ENV['PWD'] = '/';
        ENV['HOME'] = '/home/emscripten';
        ENV['LANG'] = 'en_US.UTF-8';
        ENV['_'] = './this.program';
        // Allocate memory.
        poolPtr = allocate(TOTAL_ENV_SIZE, 'i8', ALLOC_STATIC);
        envPtr = allocate(MAX_ENV_VALUES * 4,
                          'i8*', ALLOC_STATIC);
        HEAP32[((envPtr)>>2)]=poolPtr
        HEAP32[((_environ)>>2)]=envPtr;
      } else {
        envPtr = HEAP32[((_environ)>>2)];
        poolPtr = HEAP32[((envPtr)>>2)];
      }
      // Collect key=value lines.
      var strings = [];
      var totalSize = 0;
      for (var key in env) {
        if (typeof env[key] === 'string') {
          var line = key + '=' + env[key];
          strings.push(line);
          totalSize += line.length;
        }
      }
      if (totalSize > TOTAL_ENV_SIZE) {
        throw new Error('Environment size exceeded TOTAL_ENV_SIZE!');
      }
      // Make new.
      var ptrSize = 4;
      for (var i = 0; i < strings.length; i++) {
        var line = strings[i];
        for (var j = 0; j < line.length; j++) {
          HEAP8[(((poolPtr)+(j))|0)]=line.charCodeAt(j);
        }
        HEAP8[(((poolPtr)+(j))|0)]=0;
        HEAP32[(((envPtr)+(i * ptrSize))>>2)]=poolPtr;
        poolPtr += line.length + 1;
      }
      HEAP32[(((envPtr)+(strings.length * ptrSize))>>2)]=0;
    }var ENV={};function _getenv(name) {
      // char *getenv(const char *name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/getenv.html
      if (name === 0) return 0;
      name = Pointer_stringify(name);
      if (!ENV.hasOwnProperty(name)) return 0;
      if (_getenv.ret) _free(_getenv.ret);
      _getenv.ret = allocate(intArrayFromString(ENV[name]), 'i8', ALLOC_NORMAL);
      return _getenv.ret;
    }
  function __isFloat(text) {
      return !!(/^[+-]?[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?$/.exec(text));
    }function __scanString(format, get, unget, varargs) {
      if (!__scanString.whiteSpace) {
        __scanString.whiteSpace = {};
        __scanString.whiteSpace[32] = 1;
        __scanString.whiteSpace[9] = 1;
        __scanString.whiteSpace[10] = 1;
        __scanString.whiteSpace[' '] = 1;
        __scanString.whiteSpace['\t'] = 1;
        __scanString.whiteSpace['\n'] = 1;
      }
      // Supports %x, %4x, %d.%d, %lld, %s, %f, %lf.
      // TODO: Support all format specifiers.
      format = Pointer_stringify(format);
      var soFar = 0;
      if (format.indexOf('%n') >= 0) {
        // need to track soFar
        var _get = get;
        get = function() {
          soFar++;
          return _get();
        }
        var _unget = unget;
        unget = function() {
          soFar--;
          return _unget();
        }
      }
      var formatIndex = 0;
      var argsi = 0;
      var fields = 0;
      var argIndex = 0;
      var next;
      mainLoop:
      for (var formatIndex = 0; formatIndex < format.length;) {
        if (format[formatIndex] === '%' && format[formatIndex+1] == 'n') {
          var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
          argIndex += Runtime.getNativeFieldSize('void*');
          HEAP32[((argPtr)>>2)]=soFar;
          formatIndex += 2;
          continue;
        }
        // TODO: Support strings like "%5c" etc.
        if (format[formatIndex] === '%' && format[formatIndex+1] == 'c') {
          var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
          argIndex += Runtime.getNativeFieldSize('void*');
          fields++;
          next = get();
          HEAP8[(argPtr)]=next
          formatIndex += 2;
          continue;
        }
        // remove whitespace
        while (1) {
          next = get();
          if (next == 0) return fields;
          if (!(next in __scanString.whiteSpace)) break;
        }
        unget();
        if (format[formatIndex] === '%') {
          formatIndex++;
          var maxSpecifierStart = formatIndex;
          while (format[formatIndex].charCodeAt(0) >= 48 &&
                 format[formatIndex].charCodeAt(0) <= 57) {
            formatIndex++;
          }
          var max_;
          if (formatIndex != maxSpecifierStart) {
            max_ = parseInt(format.slice(maxSpecifierStart, formatIndex), 10);
          }
          var long_ = false;
          var half = false;
          var longLong = false;
          if (format[formatIndex] == 'l') {
            long_ = true;
            formatIndex++;
            if(format[formatIndex] == 'l') {
              longLong = true;
              formatIndex++;
            }
          } else if (format[formatIndex] == 'h') {
            half = true;
            formatIndex++;
          }
          var type = format[formatIndex];
          formatIndex++;
          var curr = 0;
          var buffer = [];
          // Read characters according to the format. floats are trickier, they may be in an unfloat state in the middle, then be a valid float later
          if (type == 'f' || type == 'e' || type == 'g' || type == 'E') {
            var last = 0;
            next = get();
            while (next > 0) {
              buffer.push(String.fromCharCode(next));
              if (__isFloat(buffer.join(''))) {
                last = buffer.length;
              }
              next = get();
            }
            for (var i = 0; i < buffer.length - last + 1; i++) {
              unget();
            }
            buffer.length = last;
          } else {
            next = get();
            var first = true;
            while ((curr < max_ || isNaN(max_)) && next > 0) {
              if (!(next in __scanString.whiteSpace) && // stop on whitespace
                  (type == 's' ||
                   ((type === 'd' || type == 'u' || type == 'i') && ((next >= 48 && next <= 57) ||
                                                                     (first && next == 45))) ||
                   (type === 'x' && (next >= 48 && next <= 57 ||
                                     next >= 97 && next <= 102 ||
                                     next >= 65 && next <= 70))) &&
                  (formatIndex >= format.length || next !== format[formatIndex].charCodeAt(0))) { // Stop when we read something that is coming up
                buffer.push(String.fromCharCode(next));
                next = get();
                curr++;
                first = false;
              } else {
                break;
              }
            }
            unget();
          }
          if (buffer.length === 0) return 0;  // Failure.
          var text = buffer.join('');
          var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
          argIndex += Runtime.getNativeFieldSize('void*');
          switch (type) {
            case 'd': case 'u': case 'i':
              if (half) {
                HEAP16[((argPtr)>>1)]=parseInt(text, 10);
              } else if(longLong) {
                (tempI64 = [parseInt(text, 10)>>>0,Math.min(Math.floor((parseInt(text, 10))/4294967296), 4294967295)>>>0],HEAP32[((argPtr)>>2)]=tempI64[0],HEAP32[(((argPtr)+(4))>>2)]=tempI64[1]);
              } else {
                HEAP32[((argPtr)>>2)]=parseInt(text, 10);
              }
              break;
            case 'x':
              HEAP32[((argPtr)>>2)]=parseInt(text, 16)
              break;
            case 'f':
            case 'e':
            case 'g':
            case 'E':
              // fallthrough intended
              if (long_) {
                (HEAPF64[(tempDoublePtr)>>3]=parseFloat(text),HEAP32[((argPtr)>>2)]=HEAP32[((tempDoublePtr)>>2)],HEAP32[(((argPtr)+(4))>>2)]=HEAP32[(((tempDoublePtr)+(4))>>2)])
              } else {
                HEAPF32[((argPtr)>>2)]=parseFloat(text)
              }
              break;
            case 's':
              var array = intArrayFromString(text);
              for (var j = 0; j < array.length; j++) {
                HEAP8[(((argPtr)+(j))|0)]=array[j]
              }
              break;
          }
          fields++;
        } else if (format[formatIndex] in __scanString.whiteSpace) {
          next = get();
          while (next in __scanString.whiteSpace) {
            if (next <= 0) break mainLoop;  // End of input.
            next = get();
          }
          unget(next);
          formatIndex++;
        } else {
          // Not a specifier.
          next = get();
          if (format[formatIndex].charCodeAt(0) !== next) {
            unget(next);
            break mainLoop;
          }
          formatIndex++;
        }
      }
      return fields;
    }function _sscanf(s, format, varargs) {
      // int sscanf(const char *restrict s, const char *restrict format, ... );
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/scanf.html
      var index = 0;
      var get = function() { return HEAP8[(((s)+(index++))|0)]; };
      var unget = function() { index--; };
      return __scanString(format, get, unget, varargs);
    }
  function _fgetc(stream) {
      // int fgetc(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fgetc.html
      if (!FS.streams[stream]) return -1;
      var streamObj = FS.streams[stream];
      if (streamObj.eof || streamObj.error) return -1;
      var ret = _read(stream, _fgetc.ret, 1);
      if (ret == 0) {
        streamObj.eof = true;
        return -1;
      } else if (ret == -1) {
        streamObj.error = true;
        return -1;
      } else {
        return HEAPU8[((_fgetc.ret)|0)];
      }
    }var _getc=_fgetc;
  var ___dirent_struct_layout={__size__:1040,d_ino:0,d_name:4,d_off:1028,d_reclen:1032,d_type:1036};function _open(path, oflag, varargs) {
      // int open(const char *path, int oflag, ...);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/open.html
      // NOTE: This implementation tries to mimic glibc rather than strictly
      // following the POSIX standard.
      var mode = HEAP32[((varargs)>>2)];
      // Simplify flags.
      var accessMode = oflag & 3;
      var isWrite = accessMode != 0;
      var isRead = accessMode != 1;
      var isCreate = Boolean(oflag & 512);
      var isExistCheck = Boolean(oflag & 2048);
      var isTruncate = Boolean(oflag & 1024);
      var isAppend = Boolean(oflag & 8);
      // Verify path.
      var origPath = path;
      path = FS.analyzePath(Pointer_stringify(path));
      if (!path.parentExists) {
        ___setErrNo(path.error);
        return -1;
      }
      var target = path.object || null;
      var finalPath;
      // Verify the file exists, create if needed and allowed.
      if (target) {
        if (isCreate && isExistCheck) {
          ___setErrNo(ERRNO_CODES.EEXIST);
          return -1;
        }
        if ((isWrite || isCreate || isTruncate) && target.isFolder) {
          ___setErrNo(ERRNO_CODES.EISDIR);
          return -1;
        }
        if (isRead && !target.read || isWrite && !target.write) {
          ___setErrNo(ERRNO_CODES.EACCES);
          return -1;
        }
        if (isTruncate && !target.isDevice) {
          target.contents = [];
        } else {
          if (!FS.forceLoadFile(target)) {
            ___setErrNo(ERRNO_CODES.EIO);
            return -1;
          }
        }
        finalPath = path.path;
      } else {
        if (!isCreate) {
          ___setErrNo(ERRNO_CODES.ENOENT);
          return -1;
        }
        if (!path.parentObject.write) {
          ___setErrNo(ERRNO_CODES.EACCES);
          return -1;
        }
        target = FS.createDataFile(path.parentObject, path.name, [],
                                   mode & 0x100, mode & 0x80);  // S_IRUSR, S_IWUSR.
        finalPath = path.parentPath + '/' + path.name;
      }
      // Actually create an open stream.
      var id = FS.streams.length; // Keep dense
      if (target.isFolder) {
        var entryBuffer = 0;
        if (___dirent_struct_layout) {
          entryBuffer = _malloc(___dirent_struct_layout.__size__);
        }
        var contents = [];
        for (var key in target.contents) contents.push(key);
        FS.streams[id] = {
          path: finalPath,
          object: target,
          // An index into contents. Special values: -2 is ".", -1 is "..".
          position: -2,
          isRead: true,
          isWrite: false,
          isAppend: false,
          error: false,
          eof: false,
          ungotten: [],
          // Folder-specific properties:
          // Remember the contents at the time of opening in an array, so we can
          // seek between them relying on a single order.
          contents: contents,
          // Each stream has its own area for readdir() returns.
          currentEntry: entryBuffer
        };
      } else {
        FS.streams[id] = {
          path: finalPath,
          object: target,
          position: 0,
          isRead: isRead,
          isWrite: isWrite,
          isAppend: isAppend,
          error: false,
          eof: false,
          ungotten: []
        };
      }
      return id;
    }function _fopen(filename, mode) {
      // FILE *fopen(const char *restrict filename, const char *restrict mode);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fopen.html
      var flags;
      mode = Pointer_stringify(mode);
      if (mode[0] == 'r') {
        if (mode.indexOf('+') != -1) {
          flags = 2;
        } else {
          flags = 0;
        }
      } else if (mode[0] == 'w') {
        if (mode.indexOf('+') != -1) {
          flags = 2;
        } else {
          flags = 1;
        }
        flags |= 512;
        flags |= 1024;
      } else if (mode[0] == 'a') {
        if (mode.indexOf('+') != -1) {
          flags = 2;
        } else {
          flags = 1;
        }
        flags |= 512;
        flags |= 8;
      } else {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return 0;
      }
      var ret = _open(filename, flags, allocate([0x1FF, 0, 0, 0], 'i32', ALLOC_STACK));  // All creation permissions.
      return (ret == -1) ? 0 : ret;
    }
  function _close(fildes) {
      // int close(int fildes);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/close.html
      if (FS.streams[fildes]) {
        if (FS.streams[fildes].currentEntry) {
          _free(FS.streams[fildes].currentEntry);
        }
        FS.streams[fildes] = null;
        return 0;
      } else {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
    }
  function _fsync(fildes) {
      // int fsync(int fildes);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fsync.html
      if (FS.streams[fildes]) {
        // We write directly to the file system, so there's nothing to do here.
        return 0;
      } else {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
    }function _fclose(stream) {
      // int fclose(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fclose.html
      _fsync(stream);
      return _close(stream);
    }
  function _isspace(chr) {
      return chr in { 32: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0 };
    }
  function _ungetc(c, stream) {
      // int ungetc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/ungetc.html
      if (FS.streams[stream]) {
        c = unSign(c & 0xFF);
        FS.streams[stream].ungotten.push(c);
        return c;
      } else {
        return -1;
      }
    }
  function _fmod(x, y) {
      return x % y;
    }
  var _cos=Math.cos;
  var _sin=Math.sin;
  function _atexit(func, arg) {
      __ATEXIT__.unshift({ func: func, arg: arg });
    }var ___cxa_atexit=_atexit;
  function _lseek(fildes, offset, whence) {
      // off_t lseek(int fildes, off_t offset, int whence);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/lseek.html
      if (FS.streams[fildes] && !FS.streams[fildes].object.isDevice) {
        var stream = FS.streams[fildes];
        var position = offset;
        if (whence === 1) {  // SEEK_CUR.
          position += stream.position;
        } else if (whence === 2) {  // SEEK_END.
          position += stream.object.contents.length;
        }
        if (position < 0) {
          ___setErrNo(ERRNO_CODES.EINVAL);
          return -1;
        } else {
          stream.ungotten = [];
          stream.position = position;
          return position;
        }
      } else {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
    }function _fseek(stream, offset, whence) {
      // int fseek(FILE *stream, long offset, int whence);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fseek.html
      var ret = _lseek(stream, offset, whence);
      if (ret == -1) {
        return -1;
      } else {
        FS.streams[stream].eof = false;
        return 0;
      }
    }var _fseeko=_fseek;
  function _ftell(stream) {
      // long ftell(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/ftell.html
      if (FS.streams[stream]) {
        stream = FS.streams[stream];
        if (stream.object.isDevice) {
          ___setErrNo(ERRNO_CODES.ESPIPE);
          return -1;
        } else {
          return stream.position;
        }
      } else {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
    }var _ftello=_ftell;
  function _pthread_mutex_lock() {}
  function _pthread_mutex_unlock() {}
  function ___cxa_guard_acquire(variable) {
      if (!HEAP8[(variable)]) { // ignore SAFE_HEAP stuff because llvm mixes i64 and i8 here
        HEAP8[(variable)]=1;
        return 1;
      }
      return 0;
    }
  function ___cxa_guard_abort() {}
  function ___cxa_guard_release() {}
  function _pthread_cond_broadcast() {
      return 0;
    }
  function _pthread_cond_wait() {
      return 0;
    }
  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }
  function ___cxa_is_number_type(type) {
      var isNumber = false;
      try { if (type == __ZTIi) isNumber = true } catch(e){}
      try { if (type == __ZTIj) isNumber = true } catch(e){}
      try { if (type == __ZTIl) isNumber = true } catch(e){}
      try { if (type == __ZTIm) isNumber = true } catch(e){}
      try { if (type == __ZTIx) isNumber = true } catch(e){}
      try { if (type == __ZTIy) isNumber = true } catch(e){}
      try { if (type == __ZTIf) isNumber = true } catch(e){}
      try { if (type == __ZTId) isNumber = true } catch(e){}
      try { if (type == __ZTIe) isNumber = true } catch(e){}
      try { if (type == __ZTIc) isNumber = true } catch(e){}
      try { if (type == __ZTIa) isNumber = true } catch(e){}
      try { if (type == __ZTIh) isNumber = true } catch(e){}
      try { if (type == __ZTIs) isNumber = true } catch(e){}
      try { if (type == __ZTIt) isNumber = true } catch(e){}
      return isNumber;
    }function ___cxa_does_inherit(definiteType, possibilityType, possibility) {
      if (possibility == 0) return false;
      if (possibilityType == 0 || possibilityType == definiteType)
        return true;
      var possibility_type_info;
      if (___cxa_is_number_type(possibilityType)) {
        possibility_type_info = possibilityType;
      } else {
        var possibility_type_infoAddr = HEAP32[((possibilityType)>>2)] - 8;
        possibility_type_info = HEAP32[((possibility_type_infoAddr)>>2)];
      }
      switch (possibility_type_info) {
      case 0: // possibility is a pointer
        // See if definite type is a pointer
        var definite_type_infoAddr = HEAP32[((definiteType)>>2)] - 8;
        var definite_type_info = HEAP32[((definite_type_infoAddr)>>2)];
        if (definite_type_info == 0) {
          // Also a pointer; compare base types of pointers
          var defPointerBaseAddr = definiteType+8;
          var defPointerBaseType = HEAP32[((defPointerBaseAddr)>>2)];
          var possPointerBaseAddr = possibilityType+8;
          var possPointerBaseType = HEAP32[((possPointerBaseAddr)>>2)];
          return ___cxa_does_inherit(defPointerBaseType, possPointerBaseType, possibility);
        } else
          return false; // one pointer and one non-pointer
      case 1: // class with no base class
        return false;
      case 2: // class with base class
        var parentTypeAddr = possibilityType + 8;
        var parentType = HEAP32[((parentTypeAddr)>>2)];
        return ___cxa_does_inherit(definiteType, parentType, possibility);
      default:
        return false; // some unencountered type
      }
    }function ___cxa_find_matching_catch(thrown, throwntype, typeArray) {
      // If throwntype is a pointer, this means a pointer has been
      // thrown. When a pointer is thrown, actually what's thrown
      // is a pointer to the pointer. We'll dereference it.
      if (throwntype != 0 && !___cxa_is_number_type(throwntype)) {
        var throwntypeInfoAddr= HEAP32[((throwntype)>>2)] - 8;
        var throwntypeInfo= HEAP32[((throwntypeInfoAddr)>>2)];
        if (throwntypeInfo == 0)
          thrown = HEAP32[((thrown)>>2)];
      }
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (___cxa_does_inherit(typeArray[i], throwntype, thrown))
          return tempRet0 = typeArray[i],thrown;
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      return tempRet0 = throwntype,thrown;
    }function ___cxa_throw(ptr, type, destructor) {
      if (!___cxa_throw.initialized) {
        try {
          HEAP32[((__ZTVN10__cxxabiv119__pointer_type_infoE)>>2)]=0; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv117__class_type_infoE)>>2)]=1; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv120__si_class_type_infoE)>>2)]=2; // Workaround for libcxxabi integration bug
        } catch(e){}
        ___cxa_throw.initialized = true;
      }
      HEAP32[((_llvm_eh_exception.buf)>>2)]=ptr
      HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)]=type
      HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)]=destructor
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";;
    }
  function ___errno_location() {
      return ___setErrNo.ret;
    }var ___errno=___errno_location;
  var ERRNO_MESSAGES={1:"Operation not permitted",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"Input/output error",6:"No such device or address",8:"Exec format error",9:"Bad file descriptor",10:"No child processes",11:"Resource temporarily unavailable",12:"Cannot allocate memory",13:"Permission denied",14:"Bad address",16:"Device or resource busy",17:"File exists",18:"Invalid cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Inappropriate ioctl for device",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read-only file system",31:"Too many links",32:"Broken pipe",33:"Numerical argument out of domain",34:"Numerical result out of range",35:"Resource deadlock avoided",36:"File name too long",37:"No locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many levels of symbolic links",42:"No message of desired type",43:"Identifier removed",60:"Device not a stream",61:"No data available",62:"Timer expired",63:"Out of streams resources",67:"Link has been severed",71:"Protocol error",72:"Multihop attempted",74:"Bad message",75:"Value too large for defined data type",84:"Invalid or incomplete multibyte or wide character",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Protocol not supported",95:"Operation not supported",97:"Address family not supported by protocol",98:"Address already in use",99:"Cannot assign requested address",100:"Network is down",101:"Network is unreachable",102:"Network dropped connection on reset",103:"Software caused connection abort",104:"Connection reset by peer",105:"No buffer space available",106:"Transport endpoint is already connected",107:"Transport endpoint is not connected",110:"Connection timed out",111:"Connection refused",113:"No route to host",114:"Operation already in progress",115:"Operation now in progress",116:"Stale NFS file handle",122:"Disk quota exceeded",125:"Operation canceled",130:"Owner died",131:"State not recoverable"};function _strerror_r(errnum, strerrbuf, buflen) {
      if (errnum in ERRNO_MESSAGES) {
        if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
          return ___setErrNo(ERRNO_CODES.ERANGE);
        } else {
          var msg = ERRNO_MESSAGES[errnum];
          for (var i = 0; i < msg.length; i++) {
            HEAP8[(((strerrbuf)+(i))|0)]=msg.charCodeAt(i)
          }
          HEAP8[(((strerrbuf)+(i))|0)]=0
          return 0;
        }
      } else {
        return ___setErrNo(ERRNO_CODES.EINVAL);
      }
    }function _strerror(errnum) {
      if (!_strerror.buffer) _strerror.buffer = _malloc(256);
      _strerror_r(errnum, _strerror.buffer, 256);
      return _strerror.buffer;
    }
  function ___cxa_rethrow() {
      ___cxa_end_catch.rethrown = true;
      throw HEAP32[((_llvm_eh_exception.buf)>>2)] + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";;
    }
  function _wmemmove() { throw 'wmemmove not implemented' }
  function _wmemset() { throw 'wmemset not implemented' }
  function _wmemcpy() { throw 'wmemcpy not implemented' }
  function _wcslen() { throw 'wcslen not implemented' }
  function _isxdigit(chr) {
      return (chr >= 48 && chr <= 57) ||
             (chr >= 97 && chr <= 102) ||
             (chr >= 65 && chr <= 70);
    }var _isxdigit_l=_isxdigit;
  function _isdigit(chr) {
      return chr >= 48 && chr <= 57;
    }var _isdigit_l=_isdigit;
  function __Z7catopenPKci() { throw 'catopen not implemented' }
  function __Z7catgetsP8_nl_catdiiPKc() { throw 'catgets not implemented' }
  function __Z8catcloseP8_nl_catd() { throw 'catclose not implemented' }
  function _newlocale(mask, locale, base) {
      return 0;
    }
  function _freelocale(locale) {}
  function ___ctype_b_loc() {
      // http://refspecs.freestandards.org/LSB_3.0.0/LSB-Core-generic/LSB-Core-generic/baselib---ctype-b-loc.html
      var me = ___ctype_b_loc;
      if (!me.ret) {
        var values = [
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,8195,8194,8194,8194,8194,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,24577,49156,49156,49156,
          49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,55304,55304,55304,55304,55304,55304,55304,55304,
          55304,55304,49156,49156,49156,49156,49156,49156,49156,54536,54536,54536,54536,54536,54536,50440,50440,50440,50440,50440,
          50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,49156,49156,49156,49156,49156,
          49156,54792,54792,54792,54792,54792,54792,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,
          50696,50696,50696,50696,50696,50696,50696,49156,49156,49156,49156,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        ];
        var i16size = 2;
        var arr = _malloc(values.length * i16size);
        for (var i = 0; i < values.length; i++) {
          HEAP16[(((arr)+(i * i16size))>>1)]=values[i]
        }
        me.ret = allocate([arr + 128 * i16size], 'i16*', ALLOC_NORMAL);
      }
      return me.ret;
    }
  function ___ctype_tolower_loc() {
      // http://refspecs.freestandards.org/LSB_3.1.1/LSB-Core-generic/LSB-Core-generic/libutil---ctype-tolower-loc.html
      var me = ___ctype_tolower_loc;
      if (!me.ret) {
        var values = [
          128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,
          158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,
          188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,
          218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,
          248,249,250,251,252,253,254,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,
          33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,97,98,99,100,101,102,103,
          104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,91,92,93,94,95,96,97,98,99,100,101,102,103,
          104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,
          134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,
          164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,
          194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,
          224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,
          254,255
        ];
        var i32size = 4;
        var arr = _malloc(values.length * i32size);
        for (var i = 0; i < values.length; i++) {
          HEAP32[(((arr)+(i * i32size))>>2)]=values[i]
        }
        me.ret = allocate([arr + 128 * i32size], 'i32*', ALLOC_NORMAL);
      }
      return me.ret;
    }
  function ___ctype_toupper_loc() {
      // http://refspecs.freestandards.org/LSB_3.1.1/LSB-Core-generic/LSB-Core-generic/libutil---ctype-toupper-loc.html
      var me = ___ctype_toupper_loc;
      if (!me.ret) {
        var values = [
          128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,
          158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,
          188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,
          218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,
          248,249,250,251,252,253,254,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,
          33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,
          73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,
          81,82,83,84,85,86,87,88,89,90,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,
          145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,
          175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,
          205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,
          235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255
        ];
        var i32size = 4;
        var arr = _malloc(values.length * i32size);
        for (var i = 0; i < values.length; i++) {
          HEAP32[(((arr)+(i * i32size))>>2)]=values[i]
        }
        me.ret = allocate([arr + 128 * i32size], 'i32*', ALLOC_NORMAL);
      }
      return me.ret;
    }
  function _strftime(s, maxsize, format, timeptr) {
      // size_t strftime(char *restrict s, size_t maxsize, const char *restrict format, const struct tm *restrict timeptr);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/strftime.html
      // TODO: Implement.
      return 0;
    }var _strftime_l=_strftime;
  function __parseInt64(str, endptr, base, min, max, unsign) {
      var start = str;
      // Skip space.
      while (_isspace(HEAP8[(str)])) str++;
      // Check for a plus/minus sign.
      if (HEAP8[(str)] == 45) {
        str++;
      } else if (HEAP8[(str)] == 43) {
        str++;
      }
      // Find base.
      var ok = false;
      var finalBase = base;
      if (!finalBase) {
        if (HEAP8[(str)] == 48) {
          if (HEAP8[((str+1)|0)] == 120 ||
              HEAP8[((str+1)|0)] == 88) {
            finalBase = 16;
            str += 2;
          } else {
            finalBase = 8;
            str++;
            ok = true; // we saw an initial zero, perhaps the entire thing is just "0"
          }
        }
      }
      if (!finalBase) finalBase = 10;
      // Get digits.
      var chr;
      while ((chr = HEAP8[(str)]) != 0) {
        var digit = parseInt(String.fromCharCode(chr), finalBase);
        if (isNaN(digit)) {
          break;
        } else {
          str++;
          ok = true;
        }
      }
      if (!ok) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return tempRet0 = 0,0;
      }
      // Set end pointer.
      if (endptr) {
        HEAP32[((endptr)>>2)]=str
      }
      try {
        i64Math.fromString(Pointer_stringify(start, str - start), finalBase, min, max, unsign);
      } catch(e) {
        ___setErrNo(ERRNO_CODES.ERANGE); // not quite correct
      }
      return tempRet0 = HEAP32[(((tempDoublePtr)+(4))>>2)],HEAP32[((tempDoublePtr)>>2)];
    }function _strtoull(str, endptr, base) {
      return __parseInt64(str, endptr, base, 0, '18446744073709551615', true);  // ULONG_MAX.
    }var _strtoull_l=_strtoull;
  function _strtoll(str, endptr, base) {
      return __parseInt64(str, endptr, base, '-9223372036854775808', '9223372036854775807');  // LLONG_MIN, LLONG_MAX.
    }var _strtoll_l=_strtoll;
  function _uselocale(locale) {
      return 0;
    }
  function _mbsrtowcs() { throw 'mbsrtowcs not implemented' }
  function _mbrlen() { throw 'mbrlen not implemented' }
  function ___locale_mb_cur_max() { throw '__locale_mb_cur_max not implemented' }
  function _mbtowc(pwc, pmb, maxx) {
      // XXX doesn't really handle multibyte at all
      if (!pmb) return 0;
      maxx = Math.min(85, maxx);
      var i;
      for (i = 0; i < maxx; i++) {
        var curr = HEAP8[(pmb)];
        if (pwc) {
          HEAP8[(pwc)]=curr;
          HEAP8[(((pwc)+(1))|0)]=0;
          pwc += 2;
        }
        pmb++;
        if (!curr) break;
      }
      return i;
    }
  function _mbrtowc() { throw 'mbrtowc not implemented' }
  function _mbsnrtowcs() { throw 'mbsnrtowcs not implemented' }
  function _wcrtomb(s, wc, ps) {
      // XXX doesn't really handle multibyte at all
      if (s) {
        HEAP8[(s)]=wc;
      }
      return 1;
    }
  function _wcsnrtombs() { throw 'wcsnrtombs not implemented' }
  function _asprintf(s, format, varargs) {
      return _sprintf(-s, format, varargs);
    }var _vasprintf=_asprintf;
  var _vsprintf=_sprintf;
  var _vsscanf=_sscanf;
  var _llvm_memset_p0i8_i64=_memset;
  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 8: return PAGE_SIZE;
        case 54:
        case 56:
        case 21:
        case 61:
        case 63:
        case 22:
        case 67:
        case 23:
        case 24:
        case 25:
        case 26:
        case 27:
        case 69:
        case 28:
        case 101:
        case 70:
        case 71:
        case 29:
        case 30:
        case 199:
        case 75:
        case 76:
        case 32:
        case 43:
        case 44:
        case 80:
        case 46:
        case 47:
        case 45:
        case 48:
        case 49:
        case 42:
        case 82:
        case 33:
        case 7:
        case 108:
        case 109:
        case 107:
        case 112:
        case 119:
        case 121:
          return 200809;
        case 13:
        case 104:
        case 94:
        case 95:
        case 34:
        case 35:
        case 77:
        case 81:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 91:
        case 94:
        case 95:
        case 110:
        case 111:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 120:
        case 40:
        case 16:
        case 79:
        case 19:
          return -1;
        case 92:
        case 93:
        case 5:
        case 72:
        case 6:
        case 74:
        case 92:
        case 93:
        case 96:
        case 97:
        case 98:
        case 99:
        case 102:
        case 103:
        case 105:
          return 1;
        case 38:
        case 66:
        case 50:
        case 51:
        case 4:
          return 1024;
        case 15:
        case 64:
        case 41:
          return 32;
        case 55:
        case 37:
        case 17:
          return 2147483647;
        case 18:
        case 1:
          return 47839;
        case 59:
        case 57:
          return 99;
        case 68:
        case 58:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 14: return 32768;
        case 73: return 32767;
        case 39: return 16384;
        case 60: return 1000;
        case 106: return 700;
        case 52: return 256;
        case 62: return 255;
        case 2: return 100;
        case 65: return 64;
        case 36: return 20;
        case 100: return 16;
        case 20: return 6;
        case 53: return 4;
        case 10: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }
  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret
      }
      return ret;
    }
  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We need to make sure no one else allocates unfreeable memory!
      // We must control this entirely. So we don't even need to do
      // unfreeable allocations - the HEAP is ours, from STATICTOP up.
      // TODO: We could in theory slice off the top of the HEAP when
      //       sbrk gets a negative increment in |bytes|...
      var self = _sbrk;
      if (!self.called) {
        STATICTOP = alignMemoryPage(STATICTOP); // make sure we start out aligned
        self.called = true;
        _sbrk.DYNAMIC_START = STATICTOP;
      }
      var ret = STATICTOP;
      if (bytes != 0) Runtime.staticAlloc(bytes);
      return ret;  // Previous break location.
    }
  function _llvm_bswap_i32(x) {
      return ((x&0xff)<<24) | (((x>>8)&0xff)<<16) | (((x>>16)&0xff)<<8) | (x>>>24);
    }
  function _llvm_bswap_i16(x) {
      return ((x&0xff)<<8) | ((x>>8)&0xff);
    }
  function _llvm_lifetime_start() {}
  function _llvm_lifetime_end() {}
  function _llvm_uadd_with_overflow_i32(x, y) {
      x = x>>>0;
      y = y>>>0;
      return tempRet0 = x+y > 4294967295,(x+y)>>>0;
    }
  var _floorf=Math.floor;
  var Browser={mainLoop:{scheduler:null,shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (Browser.initted) return;
        Browser.initted = true;
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : console.log("warning: cannot create object URLs");
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
        function getMimetype(name) {
          return {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'bmp': 'image/bmp',
            'ogg': 'audio/ogg',
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg'
          }[name.substr(-3)];
          return ret;
        }
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
        var imagePlugin = {};
        imagePlugin['canHandle'] = function(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/.exec(name);
        };
        imagePlugin['handle'] = function(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: getMimetype(name) });
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
        var audioPlugin = {};
        audioPlugin['canHandle'] = function(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            setTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
        // Canvas event setup
        var canvas = Module['canvas'];
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'];
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'];
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule) {
        var ctx;
        try {
          if (useWebGL) {
            ctx = canvas.getContext('experimental-webgl', {
              alpha: false
            });
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas - ' + e);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        this.lockPointer = lockPointer;
        this.resizeCanvas = resizeCanvas;
        if (typeof this.lockPointer === 'undefined') this.lockPointer = true;
        if (typeof this.resizeCanvas === 'undefined') this.resizeCanvas = false;
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'];
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else if (Browser.resizeCanvas){
            Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
        }
        if (!this.fullScreenHandlersInstalled) {
          this.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen(); 
      },requestAnimationFrame:function (func) {
        if (!window.requestAnimationFrame) {
          window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                         window['mozRequestAnimationFrame'] ||
                                         window['webkitRequestAnimationFrame'] ||
                                         window['msRequestAnimationFrame'] ||
                                         window['oRequestAnimationFrame'] ||
                                         window['setTimeout'];
        }
        window.requestAnimationFrame(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          if (xhr.status == 200) {
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        var canvas = Module['canvas'];
        this.windowedWidth = canvas.width;
        this.windowedHeight = canvas.height;
        canvas.width = screen.width;
        canvas.height = screen.height;
        var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        Browser.updateResizeListeners();
      }};
_llvm_eh_exception.buf = allocate(12, "void*", ALLOC_STATIC);
__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___setErrNo(0);
___buildEnvironment(ENV);
_fgetc.ret = allocate([0], "i8", ALLOC_STATIC);
Module["requestFullScreen"] = function(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function(func) { Browser.requestAnimationFrame(func) };
  Module["pauseMainLoop"] = function() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function() { Browser.mainLoop.resume() };
var FUNCTION_TABLE = [0,0,__ZNSt3__18messagesIwED0Ev,0,_jpeg_fdct_8x4,0,__ZN7Utility8ArgumentIiE13InterruptImplEv,0,__ZNSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,0,__ZNKSt3__18numpunctIcE12do_falsenameEv
,0,__ZN9BarDecode15BarcodeIteratorILb0EED0Ev,0,__ZNKSt3__120__time_get_c_storageIwE3__rEv,0,_rgb_gray_convert,0,__ZNKSt3__18numpunctIcE16do_thousands_sepEv,0,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE11do_get_timeES4_S4_RNS_8ios_baseERjP2tm
,0,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE11do_get_yearES4_S4_RNS_8ios_baseERjP2tm,0,__ZNSt12length_errorD0Ev,0,_fullsize_smooth_downsample,0,_process_data_context_main,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEED1Ev
,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE6xsputnEPKwi,0,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE11do_get_timeES4_S4_RNS_8ios_baseERjP2tm,0,_encode_mcu_gather,0,_jpeg_fdct_9x9,0,__ZN7Utility13BasicArgument13InterruptImplEv
,0,__ZNKSt3__15ctypeIcE10do_toupperEc,0,_start_pass_huff_decoder,0,_start_pass_huff,0,__ZNSt3__16locale2id6__initEv,0,__ZNSt3__110__stdinbufIcED1Ev
,0,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE14do_get_weekdayES4_S4_RNS_8ios_baseERjP2tm,0,__ZNSt3__110__stdinbufIcE9pbackfailEi,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE9underflowEv,0,__ZNSt3__17codecvtIwc10_mbstate_tED0Ev,0,__ZNSt3__110__stdinbufIwED0Ev
,0,__ZNSt3__18time_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,0,__ZNSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,0,__ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE7seekposENS_4fposI10_mbstate_tEEj,0,__ZNSt11logic_errorD0Ev,0,__ZNKSt3__17collateIcE7do_hashEPKcS3_
,0,_jpeg_fdct_1x1,0,__ZNKSt3__120__time_get_c_storageIwE8__monthsEv,0,_jpeg_fdct_1x2,0,__ZNSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,0,__ZNKSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_bRNS_8ios_baseEwRKNS_12basic_stringIwS3_NS_9allocatorIwEEEE
,0,_decode_mcu_DC_refine712,0,_start_pass_fdctmgr,0,_null_convert708,0,__ZNSt12out_of_rangeD0Ev,0,__ZNKSt3__17codecvtIcc10_mbstate_tE6do_outERS1_PKcS5_RS5_PcS7_RS7_
,0,__ZNKSt3__110moneypunctIwLb1EE16do_positive_signEv,0,__ZNKSt3__15ctypeIwE10do_tolowerEPwPKw,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE5uflowEv,0,__ZN9JPEGCodecD0Ev,0,__ZNSt3__17collateIcED1Ev
,0,__ZNSt3__18ios_base7failureD2Ev,0,__ZTv0_n12_NSt3__114basic_ifstreamIcNS_11char_traitsIcEEED0Ev,0,_jpeg_idct_6x12,0,__ZNK10__cxxabiv121__vmi_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,0,__ZNSt9bad_allocD2Ev
,0,_compress_first_pass,0,_rgb_gray_convert706,0,__ZN7Utility8ArgumentIbE4ReadEv,0,_jpeg_idct_13x13,0,__ZNKSt3__17codecvtIDsc10_mbstate_tE10do_unshiftERS1_PcS4_RS4_
,0,_fullsize_downsample,0,_start_pass_prep,0,__ZNSt3__16locale5facetD0Ev,0,__ZN7Utility8ArgumentIbE5StartEv,0,_jpeg_fdct_ifast
,0,_encode_mcu_AC_refine680,0,__ZNSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,0,_jpeg_fdct_5x10,0,_encode_mcu_huff,0,__ZNKSt3__120__time_get_c_storageIwE3__cEv
,0,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwy,0,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwx,0,__ZNSt3__15ctypeIcED0Ev,0,_new_color_map_2_quant,0,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwm
,0,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwl,0,__ZNSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,0,__ZNSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,0,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwe,0,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwd
,0,__ZNKSt3__110moneypunctIcLb1EE16do_decimal_pointEv,0,__ZNKSt3__17codecvtIwc10_mbstate_tE11do_encodingEv,0,__ZNSt3__110__stdinbufIcE9underflowEv,0,__ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,0,__ZNKSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_bRNS_8ios_baseEcRKNS_12basic_stringIcS3_NS_9allocatorIcEEEE
,0,__ZNSt3__113basic_ostreamIwNS_11char_traitsIwEEED1Ev,0,__ZNKSt3__17codecvtIDsc10_mbstate_tE13do_max_lengthEv,0,_jpeg_idct_3x6,0,__ZNKSt3__17codecvtIwc10_mbstate_tE9do_lengthERS1_PKcS5_j,0,_jpeg_idct_3x3
,0,_reset_input_controller,0,_alloc_large,0,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE13do_date_orderEv,0,__ZNSt3__18messagesIcED1Ev,0,_jpeg_idct_1x1
,0,__ZNKSt3__120__time_get_c_storageIwE7__weeksEv,0,__ZNSt3__111__stdoutbufIwED0Ev,0,__ZTv0_n12_NSt3__113basic_istreamIcNS_11char_traitsIcEEED1Ev,0,_finish_pass1,0,_start_pass709
,0,_int_downsample,0,__ZNKSt3__18numpunctIwE11do_groupingEv,0,_prepare_for_pass,0,_error_exit,0,__ZNSt3__16locale5facet16__on_zero_sharedEv
,0,__ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev,0,__ZNKSt3__15ctypeIwE8do_widenEc,0,__ZNKSt3__18time_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwPK2tmcc,0,_jpeg_fdct_3x3,0,_jpeg_resync_to_restart
,0,__ZNSt3__110__stdinbufIcE5uflowEv,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE9pbackfailEj,0,__ZN7Utility13BasicArgumentD2Ev,0,__ZNSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,0,_jpeg_fdct_12x12
,0,__ZTv0_n12_NSt3__113basic_istreamIcNS_11char_traitsIcEEED0Ev,0,_start_pass_main,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE5uflowEv,0,_compress_data,0,__ZNKSt3__110moneypunctIwLb0EE13do_neg_formatEv
,0,_decode_mcu_DC_refine,0,__ZN9JPEGCodec5getIDEv,0,_decompress_data,0,_encode_mcu,0,__ZNKSt3__17codecvtIwc10_mbstate_tE5do_inERS1_PKcS5_RS5_PwS7_RS7_
,0,__ZN10ImageCodecD0Ev,0,__ZNKSt3__17codecvtIDsc10_mbstate_tE5do_inERS1_PKcS5_RS5_PDsS7_RS7_,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE4syncEv,0,__ZNKSt3__15ctypeIcE8do_widenEc,0,__ZNSt3__110moneypunctIwLb0EED0Ev
,0,__ZNKSt3__17codecvtIDic10_mbstate_tE9do_lengthERS1_PKcS5_j,0,__ZNSt3__16locale5__impD2Ev,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE9underflowEv,0,_jpeg_idct_8x16,0,_jpeg_idct_14x7
,0,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwPKv,0,__ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE9pbackfailEi,0,_finish_pass2,0,__ZThn8_NSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED0Ev,0,__ZNSt3__18numpunctIcED2Ev
,0,__ZN10ImageCodecD2Ev,0,_decode_mcu_DC_first710,0,_rgb_rgb1_convert,0,__ZNSt3__17codecvtIcc10_mbstate_tED0Ev,0,__ZNKSt3__18numpunctIcE11do_groupingEv
,0,__ZNK10__cxxabiv116__shim_type_info5noop1Ev,0,__ZNSt3__113basic_filebufIcNS_11char_traitsIcEEED0Ev,0,_jpeg_fdct_float,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE4syncEv,0,_reset_error_mgr
,0,_h2v2_merged_upsample,0,_start_pass_dcolor,0,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE16do_get_monthnameES4_S4_RNS_8ios_baseERjP2tm,0,__ZNKSt3__120__time_get_c_storageIwE3__xEv,0,__ZNKSt3__17codecvtIcc10_mbstate_tE10do_unshiftERS1_PcS4_RS4_
,0,__ZN10ImageCodec6toGrayER5Image,0,_jpeg_idct_4x2,0,__ZNKSt3__18time_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcPK2tmcc,0,__ZNSt3__18numpunctIcED0Ev,0,__ZNSt3__111__stdoutbufIcE8overflowEi
,0,__ZNSt3__119__iostream_categoryD1Ev,0,__ZNKSt3__120__time_get_c_storageIwE7__am_pmEv,0,__ZNSt3__111__stdoutbufIwE5imbueERKNS_6localeE,0,__ZNKSt3__18messagesIcE8do_closeEi,0,__ZN10ImageCodec19instanciateForWriteEPNSt3__113basic_ostreamIcNS0_11char_traitsIcEEEE
,0,__ZNKSt3__15ctypeIwE5do_isEPKwS3_Pt,0,__ZNSt13runtime_errorD2Ev,0,__ZNKSt3__15ctypeIwE10do_toupperEw,0,_rgb_convert,0,__ZNKSt3__15ctypeIwE9do_narrowEPKwS3_cPc
,0,_pre_process_data,0,__ZNKSt3__17codecvtIDic10_mbstate_tE11do_encodingEv,0,__ZN9BarDecode9TokenizerILb0EED1Ev,0,__ZL11init_sourceP22jpeg_decompress_struct,0,__ZNKSt3__110moneypunctIwLb0EE14do_curr_symbolEv
,0,_decode_mcu_AC_refine713,0,__ZNKSt3__110moneypunctIcLb0EE16do_negative_signEv,0,_write_marker_byte,0,__ZNSt3__17collateIwED1Ev,0,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE16do_get_monthnameES4_S4_RNS_8ios_baseERjP2tm
,0,__ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv,0,__ZNSt3__18messagesIcED0Ev,0,__ZNKSt8bad_cast4whatEv,0,__ZNSt3__110moneypunctIcLb0EED1Ev,0,__ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE9underflowEv
,0,__ZNKSt3__18messagesIcE6do_getEiiiRKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEE,0,_pre_process_context,0,__ZNSt3__18numpunctIwED2Ev,0,__ZNKSt3__110moneypunctIwLb1EE13do_pos_formatEv,0,_realize_virt_arrays
,0,_decode_mcu_AC_refine,0,__ZNSt3__15ctypeIwED0Ev,0,__ZNKSt13runtime_error4whatEv,0,_free,0,_jpeg_idct_10x5
,0,__ZNSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,0,__ZN10ImageCodec4cropER5Imagejjjj,0,_jpeg_idct_16x16,0,__ZNSt3__117__widen_from_utf8ILj32EED0Ev,0,_fullsize_upsample
,0,__ZNKSt3__17codecvtIwc10_mbstate_tE6do_outERS1_PKwS5_RS5_PcS7_RS7_,0,_jpeg_fdct_5x5,0,__ZNKSt3__18numpunctIwE16do_thousands_sepEv,0,__ZN7Utility13BasicArgumentD0Ev,0,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjP2tmcc
,0,__ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE8overflowEi,0,__ZNSt3__113basic_istreamIwNS_11char_traitsIwEEED1Ev,0,_start_pass,0,__ZN7Utility8ArgumentIiED0Ev,0,_decode_mcu_AC_first711
,0,__ZNKSt3__18numpunctIcE16do_decimal_pointEv,0,__ZN9JPEGCodec9decodeNowEP5Image,0,__ZNKSt3__110moneypunctIwLb0EE16do_negative_signEv,0,__ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,0,__ZN9JPEGCodec6toGrayER5Image
,0,__ZNKSt3__120__time_get_c_storageIcE3__xEv,0,__ZNSt3__17collateIwED0Ev,0,__ZNKSt3__110moneypunctIcLb0EE16do_positive_signEv,0,__ZNKSt3__17codecvtIDsc10_mbstate_tE16do_always_noconvEv,0,_jpeg_idct_4x8
,0,__ZNKSt3__17codecvtIDsc10_mbstate_tE9do_lengthERS1_PKcS5_j,0,__ZNSt11logic_errorD2Ev,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE7seekoffExNS_8ios_base7seekdirEj,0,__ZNSt3__17codecvtIwc10_mbstate_tED2Ev,0,__ZN7Utility8ArgumentIbE13InterruptImplEv
,0,__ZN9BarDecode13PixelIteratorILb0EED0Ev,0,__ZN9BarDecode15BarcodeIteratorILb0EED1Ev,0,__ZN10ImageCodec5flipYER5Image,0,__ZNSt3__113basic_filebufIcNS_11char_traitsIcEEE4syncEv,0,_start_pass_coef
,0,_jpeg_fdct_11x11,0,__ZNKSt3__18numpunctIwE16do_decimal_pointEv,0,_jpeg_idct_11x11,0,__ZN9JPEGCodec6rotateER5Imaged,0,_jpeg_fdct_14x14
,0,__ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE6setbufEPci,0,__ZNKSt3__110moneypunctIcLb0EE11do_groupingEv,0,__ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,0,__ZNKSt3__114error_category10equivalentERKNS_10error_codeEi
,0,__ZNKSt3__110moneypunctIwLb1EE14do_frac_digitsEv,0,__ZNKSt3__110moneypunctIwLb1EE16do_negative_signEv,0,_forward_DCT,0,__ZNK10__cxxabiv121__vmi_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,0,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcb
,0,__ZNKSt3__120__time_get_c_storageIcE3__XEv,0,_jpeg_idct_7x7,0,__ZNKSt3__15ctypeIwE9do_narrowEwc,0,__Z17fill_input_bufferP22jpeg_decompress_struct,0,_start_input_pass718
,0,_dummy_consume_data,0,_forward_DCT_float,0,__ZTv0_n12_NSt3__114basic_ifstreamIcNS_11char_traitsIcEEED1Ev,0,__Z16term_destinationP20jpeg_compress_struct,0,_write_file_header
,0,__ZNSt3__111__stdoutbufIwE4syncEv,0,__ZN7Utility8ArgumentIiE5StartEv,0,__ZN10ImageCodec5scaleER5Imagedd,0,__ZNSt3__110moneypunctIwLb0EED1Ev,0,__ZN9BarDecode15BarcodeIteratorILb1EED1Ev
,0,_merged_1v_upsample,0,_start_input_pass,0,__ZN9BarDecode13PixelIteratorILb0EED1Ev,0,_consume_markers,0,_jpeg_idct_12x6
,0,__ZNKSt3__110moneypunctIcLb1EE13do_neg_formatEv,0,_request_virt_sarray,0,__ZNSt3__113basic_istreamIcNS_11char_traitsIcEEED1Ev,0,__ZNSt3__110__stdinbufIwE9pbackfailEj,0,_jpeg_fdct_7x7
,0,__ZTv0_n12_NSt3__113basic_ostreamIcNS_11char_traitsIcEEED1Ev,0,__ZNSt3__18time_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,0,__ZNSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,0,_color_quantize,0,__ZNKSt3__17collateIwE7do_hashEPKwS3_
,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE7seekposENS_4fposI10_mbstate_tEEj,0,_jpeg_idct_7x14,0,__ZNSt3__111__stdoutbufIcE5imbueERKNS_6localeE,0,___cxx_global_array_dtor147,0,_alloc_barray
,0,_sep_upsample,0,__ZN7Utility8ArgumentIiE4ReadERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE,0,__ZN10ImageCodec9decodeNowEP5Image,0,__ZNSt3__18ios_baseD0Ev,0,__ZNSt3__110moneypunctIcLb1EED0Ev
,0,_jpeg_idct_14x14,0,_skip_variable,0,__ZNSt9bad_allocD0Ev,0,_jpeg_idct_islow,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEED0Ev
,0,__ZNKSt3__17codecvtIwc10_mbstate_tE16do_always_noconvEv,0,_jpeg_fdct_12x6,0,_ycc_rgb_convert,0,_decompress_onepass,0,_jpeg_fdct_6x12
,0,__ZNKSt3__114error_category10equivalentEiRKNS_15error_conditionE,0,_rgb_convert707,0,_quantize_ord_dither,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE6xsputnEPKci,0,__ZNSt3__113basic_filebufIcNS_11char_traitsIcEEE9pbackfailEi
,0,_h2v2_upsample,0,__ZNKSt3__15ctypeIwE10do_scan_isEtPKwS3_,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRb,0,__ZNKSt3__17codecvtIDic10_mbstate_tE6do_outERS1_PKDiS5_RS5_PcS7_RS7_,0,__ZNKSt3__17codecvtIDic10_mbstate_tE13do_max_lengthEv
,0,__ZNKSt3__17codecvtIDic10_mbstate_tE5do_inERS1_PKcS5_RS5_PDiS7_RS7_,0,__ZNSt3__113basic_filebufIcNS_11char_traitsIcEEE7seekoffExNS_8ios_base7seekdirEj,0,__ZNSt3__114basic_ifstreamIcNS_11char_traitsIcEEED1Ev,0,_start_output_pass,0,__ZTv0_n12_NSt3__113basic_ostreamIwNS_11char_traitsIwEEED0Ev
,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEED1Ev,0,__ZN10__cxxabiv120__si_class_type_infoD0Ev,0,__ZNKSt3__17collateIwE10do_compareEPKwS3_S3_S3_,0,_new_color_map_1_quant,0,__Z15skip_input_dataP22jpeg_decompress_structl
,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE6xsgetnEPci,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRPv,0,__ZN9JPEGCodec5flipXER5Image,0,__ZNKSt3__15ctypeIcE10do_tolowerEc,0,__ZNKSt3__110moneypunctIwLb1EE13do_neg_formatEv
,0,_start_pass_2_quant,0,__ZNKSt3__15ctypeIcE8do_widenEPKcS3_Pc,0,__ZN9BarDecode13PixelIteratorILb1EED0Ev,0,_write_scan_header,0,__ZNKSt3__110moneypunctIwLb1EE16do_decimal_pointEv
,0,__ZNSt3__17codecvtIDsc10_mbstate_tED0Ev,0,__ZNKSt3__120__time_get_c_storageIcE7__weeksEv,0,__ZNKSt3__17codecvtIcc10_mbstate_tE5do_inERS1_PKcS5_RS5_PcS7_RS7_,0,__ZNKSt3__18numpunctIwE11do_truenameEv,0,_write_tables_only
,0,__ZNKSt3__17codecvtIcc10_mbstate_tE13do_max_lengthEv,0,_decode_mcu_AC_first,0,_free_pool,0,_decompress_smooth_data,0,__ZNSt3__110__stdinbufIwE9underflowEv
,0,_emit_message,0,__ZN10ImageCodec5WriteER5ImageiRKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEi,0,__ZNSt3__18ios_base7failureD0Ev,0,__ZNSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,0,__ZNSt3__18ios_base4InitD2Ev
,0,_jpeg_idct_9x9,0,__ZNSt3__110moneypunctIwLb1EED0Ev,0,__ZTv0_n12_NSt3__113basic_ostreamIwNS_11char_traitsIwEEED1Ev,0,__ZNKSt3__110moneypunctIwLb1EE11do_groupingEv,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRy
,0,_sep_downsample,0,__ZN10ImageCodec9readImageEPNSt3__113basic_istreamIcNS0_11char_traitsIcEEEER5ImageRKNS0_12basic_stringIcS3_NS0_9allocatorIcEEEE,0,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE14do_get_weekdayES4_S4_RNS_8ios_baseERjP2tm,0,__ZNKSt3__17codecvtIDic10_mbstate_tE16do_always_noconvEv,0,__ZNKSt3__15ctypeIcE10do_toupperEPcPKc
,0,_jpeg_idct_8x4,0,__ZNKSt3__17codecvtIwc10_mbstate_tE13do_max_lengthEv,0,__ZNK10__cxxabiv116__shim_type_info5noop2Ev,0,_decode_mcu,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE6setbufEPwi
,0,___cxx_global_array_dtor108,0,__ZNKSt3__18messagesIwE7do_openERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERKNS_6localeE,0,__ZNSt3__113basic_filebufIcNS_11char_traitsIcEEE7seekposENS_4fposI10_mbstate_tEEj,0,_jpeg_fdct_10x5,0,__ZNSt3__113basic_filebufIcNS_11char_traitsIcEEE5imbueERKNS_6localeE
,0,__ZNSt3__17codecvtIDic10_mbstate_tED0Ev,0,__ZNKSt9bad_alloc4whatEv,0,_encode_mcu_DC_first,0,_jpeg_idct_float,0,__ZNSt3__111__stdoutbufIcED1Ev
,0,_rgb1_gray_convert,0,_jpeg_fdct_16x16,0,__ZNKSt3__110moneypunctIcLb1EE14do_curr_symbolEv,0,__ZNSt3__113basic_filebufIcNS_11char_traitsIcEEE6setbufEPci,0,__ZNSt3__16locale5__impD0Ev
,0,__ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,0,__ZNKSt3__119__iostream_category4nameEv,0,_finish_output_pass,0,__ZNKSt3__110moneypunctIcLb0EE14do_frac_digitsEv,0,__ZNKSt3__15ctypeIcE9do_narrowEPKcS3_cPc
,0,__ZNSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,0,_jpeg_idct_1x2,0,_null_method,0,_grayscale_convert705,0,__ZNKSt3__110moneypunctIcLb1EE11do_groupingEv
,0,__ZNSt3__18time_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,0,_start_pass_dpost,0,__ZNSt3__117__call_once_proxyINS_12_GLOBAL__N_111__fake_bindEEEvPv,0,__ZNSt8bad_castD0Ev,0,__ZNKSt3__15ctypeIcE9do_narrowEcc
,0,_rgb_ycc_start,0,__ZNSt3__116__narrow_to_utf8ILj32EED0Ev,0,__ZNSt3__112__do_nothingEPv,0,__ZNSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,0,_decode_mcu714
,0,___cxx_global_array_dtor80,0,__ZNSt3__110moneypunctIcLb0EED0Ev,0,__ZNSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,0,_grayscale_convert,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRb
,0,_encode_mcu_AC_first678,0,__ZN7Utility8ArgumentIbED1Ev,0,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcPKv,0,_quantize3_ord_dither,0,__ZNKSt3__18numpunctIwE12do_falsenameEv
,0,__ZNSt3__17collateIcED0Ev,0,_finish_pass_huff,0,__ZNKSt3__110moneypunctIcLb1EE16do_thousands_sepEv,0,__ZNSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev,0,_jpeg_idct_2x4
,0,_jpeg_idct_2x2,0,_jpeg_idct_2x1,0,__ZN8TextlineD1Ev,0,_access_virt_barray,0,_alloc_sarray
,0,__ZNSt3__16locale5facetD2Ev,0,__ZTv0_n12_NSt3__113basic_istreamIwNS_11char_traitsIwEEED1Ev,0,__ZNSt3__112system_errorD0Ev,0,__ZNSt3__111__stdoutbufIcED0Ev,0,_jpeg_idct_5x10
,0,__Z16init_destinationP20jpeg_compress_struct,0,__ZNKSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_bRNS_8ios_baseERjRe,0,__ZNKSt3__17codecvtIcc10_mbstate_tE9do_lengthERS1_PKcS5_j,0,__ZNSt3__110__stdinbufIwE5uflowEv,0,__ZNKSt3__18numpunctIcE11do_truenameEv
,0,_prescan_quantize,0,__ZNKSt3__110moneypunctIcLb1EE13do_pos_formatEv,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE7seekposENS_4fposI10_mbstate_tEEj,0,__ZNKSt3__19money_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_bRNS_8ios_baseEwe,0,_int_upsample
,0,__ZNKSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_bRNS_8ios_baseERjRe,0,_jpeg_fdct_2x4,0,_merged_2v_upsample,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjS8_,0,_jpeg_fdct_2x1
,0,_finish_pass,0,__ZNSt3__110__stdinbufIwE5imbueERKNS_6localeE,0,_rgb1_rgb_convert,0,__ZNSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,0,_start_pass_1_quant
,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE9showmanycEv,0,__ZNSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEED0Ev,0,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE11do_get_dateES4_S4_RNS_8ios_baseERjP2tm,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE8overflowEj,0,_h2v2_downsample
,0,___cxa_pure_virtual,0,__ZN10ImageCodec9readImageEPNSt3__113basic_istreamIcNS0_11char_traitsIcEEEER5ImageRKNS0_12basic_stringIcS3_NS0_9allocatorIcEEEEi,0,__ZNSt3__18numpunctIwED0Ev,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRx,0,__ZN7Utility13BasicArgument8FinalizeEv
,0,___cxx_global_array_dtor83,0,__ZNSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,0,__ZNKSt3__15ctypeIwE10do_tolowerEw,0,_ycck_cmyk_convert,0,_compress_output
,0,__ZN7Utility13BasicArgument9InterruptEv,0,_start_pass_coef700,0,__ZNSt3__111__stdoutbufIcE4syncEv,0,__ZNSt3__112basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED1Ev,0,__ZN9BarDecode15BarcodeIteratorILb1EED0Ev
,0,_reset_marker_reader,0,__ZNKSt3__17codecvtIwc10_mbstate_tE10do_unshiftERS1_PcS4_RS4_,0,__ZNKSt3__17collateIcE10do_compareEPKcS3_S3_S3_,0,_start_pass_merged_upsample,0,_jpeg_fdct_16x8
,0,_jpeg_fdct_13x13,0,___cxx_global_array_dtor132,0,_write_marker_header,0,__ZNSt3__110__stdinbufIwED1Ev,0,_jpeg_idct_4x4
,0,_write_frame_header,0,__ZNKSt3__17collateIwE12do_transformEPKwS3_,0,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcy,0,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcx,0,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEce
,0,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcd,0,_rgb_ycc_convert,0,_null_convert,0,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcm,0,__ZNKSt3__17num_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_RNS_8ios_baseEcl
,0,_jpeg_fdct_15x15,0,__ZNSt8bad_castD2Ev,0,__ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE7seekoffExNS_8ios_base7seekdirEj,0,_encode_mcu_AC_first,0,__ZN10__cxxabiv121__vmi_class_type_infoD0Ev
,0,__ZN7Utility8ArgumentIiED1Ev,0,__ZNKSt3__110moneypunctIcLb1EE14do_frac_digitsEv,0,__Z11term_sourceP22jpeg_decompress_struct,0,__ZNKSt3__120__time_get_c_storageIcE3__rEv,0,__ZNKSt3__19money_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_bRNS_8ios_baseERjRNS_12basic_stringIcS3_NS_9allocatorIcEEEE
,0,__ZNKSt3__15ctypeIwE10do_toupperEPwPKw,0,__ZTv0_n12_NSt3__113basic_ostreamIcNS_11char_traitsIcEEED0Ev,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRm,0,__ZNKSt3__17num_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_putES4_RNS_8ios_baseEwb,0,__ZNKSt3__114error_category23default_error_conditionEi
,0,_jpeg_fdct_4x2,0,_jpeg_fdct_4x4,0,__ZNSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev,0,_jpeg_fdct_4x8,0,__ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib
,0,_gray_rgb_convert,0,_start_pass_upsample,0,_quantize_fs_dither,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE5imbueERKNS_6localeE,0,__ZNKSt3__17codecvtIcc10_mbstate_tE16do_always_noconvEv
,0,__ZNKSt3__18messagesIwE8do_closeEi,0,_pass2_no_dither,0,__ZTv0_n12_NSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED0Ev,0,__ZNSt3__110__stdinbufIcE5imbueERKNS_6localeE,0,__ZNSt3__112system_errorD2Ev
,0,__ZN9JPEGCodecD1Ev,0,__ZNKSt3__110moneypunctIwLb0EE11do_groupingEv,0,_finish_pass_master,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE9showmanycEv,0,_color_quantize3
,0,_start_pass_main721,0,__ZNKSt3__110moneypunctIcLb0EE16do_decimal_pointEv,0,__ZNSt3__113basic_istreamIcNS_11char_traitsIcEEED0Ev,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRy,0,__ZN7Utility13BasicArgument5ProbeEv
,0,_process_data_crank_post,0,__ZNKSt3__120__time_get_c_storageIcE8__monthsEv,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRt,0,__ZNKSt3__110moneypunctIwLb0EE13do_pos_formatEv,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRPv
,0,__ZN10__cxxabiv116__shim_type_infoD2Ev,0,__ZTv0_n12_NSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRl,0,_self_destruct,0,_consume_data
,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRe,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRd,0,__ZNKSt3__17num_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_RNS_8ios_baseERjRf,0,__ZN9JPEGCodec10writeImageEPNSt3__113basic_ostreamIcNS0_11char_traitsIcEEEER5ImageiRKNS0_12basic_stringIcS3_NS0_9allocatorIcEEEE,0,__ZNKSt3__17codecvtIcc10_mbstate_tE11do_encodingEv
,0,__ZNKSt3__110moneypunctIcLb1EE16do_negative_signEv,0,__ZNKSt3__110moneypunctIcLb0EE16do_thousands_sepEv,0,__ZNKSt3__17codecvtIDic10_mbstate_tE10do_unshiftERS1_PcS4_RS4_,0,__ZNKSt3__110moneypunctIcLb0EE13do_neg_formatEv,0,__ZNSt3__114basic_ifstreamIcNS_11char_traitsIcEEED0Ev
,0,_jpeg_fdct_islow,0,_encode_mcu_DC_refine679,0,_noop_upsample,0,__ZNKSt11logic_error4whatEv,0,_start_pass703
,0,__ZNKSt3__119__iostream_category7messageEi,0,_process_data_simple_main722,0,__ZNKSt3__110moneypunctIcLb0EE13do_pos_formatEv,0,_alloc_small,0,_encode_mcu_DC_refine
,0,__ZNSt3__113basic_ostreamIwNS_11char_traitsIwEEED0Ev,0,_jpeg_fdct_14x7,0,_post_process_2pass,0,__ZNKSt3__17collateIcE12do_transformEPKcS3_,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE6xsgetnEPwi
,0,__ZN7Utility8ArgumentIbE4ReadERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE,0,__ZNKSt3__110moneypunctIwLb0EE14do_frac_digitsEv,0,_jpeg_idct_ifast,0,_h2v1_downsample,0,__Z19empty_output_bufferP20jpeg_compress_struct
,0,__ZNKSt3__110moneypunctIwLb0EE16do_thousands_sepEv,0,__ZN9BarDecode13PixelIteratorILb1EED1Ev,0,__ZNKSt3__15ctypeIcE10do_tolowerEPcPKc,0,_jpeg_idct_16x8,0,__ZNSt3__113basic_filebufIcNS_11char_traitsIcEEED1Ev
,0,_pass2_fs_dither,0,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjP2tmcc,0,_get_interesting_appn,0,__ZNKSt3__120__time_get_c_storageIcE7__am_pmEv,0,_cmyk_ycck_convert
,0,__ZNKSt3__110moneypunctIcLb0EE14do_curr_symbolEv,0,__ZNKSt3__15ctypeIwE8do_widenEPKcS3_Pw,0,__ZNKSt3__110moneypunctIwLb1EE16do_thousands_sepEv,0,_jpeg_fdct_7x14,0,_h2v1_upsample
,0,__ZNK10__cxxabiv121__vmi_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,0,_prepare_for_output_pass,0,__ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEED0Ev,0,_post_process_prepass,0,_jpeg_idct_10x10
,0,__ZNSt3__18ios_baseD2Ev,0,__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEED1Ev,0,__ZN9JPEGCodec9readImageEPNSt3__113basic_istreamIcNS0_11char_traitsIcEEEER5ImageRKNS0_12basic_stringIcS3_NS0_9allocatorIcEEEE,0,_encode_mcu_DC_first677,0,__ZNSt3__110__stdinbufIcED0Ev
,0,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE13do_date_orderEv,0,_jpeg_fdct_8x16,0,__ZNKSt3__18time_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE11do_get_yearES4_S4_RNS_8ios_baseERjP2tm,0,__ZNSt3__119__iostream_categoryD0Ev,0,__ZNSt3__110moneypunctIwLb1EED1Ev
,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEE5imbueERKNS_6localeE,0,__ZNKSt3__18messagesIcE7do_openERKNS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERKNS_6localeE,0,_jpeg_idct_12x12,0,__ZNSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED0Ev,0,__ZNSt3__110moneypunctIcLb1EED1Ev
,0,__ZN9JPEGCodec5scaleER5Imagedd,0,_jpeg_idct_5x5,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE8overflowEi,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE7seekoffExNS_8ios_base7seekdirEj,0,__ZNKSt3__120__time_get_c_storageIcE3__cEv
,0,_output_message,0,_jpeg_idct_6x3,0,__ZN10ImageCodec6rotateER5Imaged,0,_jpeg_idct_6x6,0,_finish_pass_1_quant
,0,__ZN9BarDecode9TokenizerILb1EED0Ev,0,__ZThn8_NSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev,0,__ZNKSt3__110moneypunctIwLb0EE16do_positive_signEv,0,__ZNSt3__113basic_filebufIcNS_11char_traitsIcEEE8overflowEi,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjS8_
,0,_access_virt_sarray,0,__ZNSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,0,_read_restart_marker,0,_decode_mcu_sub,0,__ZN9BarDecode9TokenizerILb0EED0Ev
,0,__ZNKSt3__120__time_get_c_storageIwE3__XEv,0,__ZNKSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE11do_get_dateES4_S4_RNS_8ios_baseERjP2tm,0,_finish_pass_gather,0,_decode_mcu_DC_first,0,__ZTv0_n12_NSt3__113basic_istreamIwNS_11char_traitsIwEEED0Ev
,0,__ZNSt3__113basic_filebufIcNS_11char_traitsIcEEE9underflowEv,0,__ZNSt3__115basic_streambufIwNS_11char_traitsIwEEED0Ev,0,_format_message,0,__ZNSt3__115basic_streambufIcNS_11char_traitsIcEEE9pbackfailEi,0,__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEED0Ev
,0,_finish_input_pass,0,_jpeg_fdct_6x3,0,__ZNSt3__111__stdoutbufIwE8overflowEj,0,_jpeg_fdct_6x6,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRx
,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRt,0,__ZN9JPEGCodec4cropER5Imagejjjj,0,_post_process_1pass,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRm,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRl
,0,__ZNKSt3__19money_putIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_putES4_bRNS_8ios_baseEce,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRe,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRd,0,__ZNKSt3__17num_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEE6do_getES4_S4_RNS_8ios_baseERjRf,0,__ZNKSt3__110moneypunctIwLb0EE16do_decimal_pointEv
,0,_encode_mcu_AC_refine,0,___cxx_global_array_dtor,0,_write_file_trailer,0,__ZN7Utility8ArgumentIbED0Ev,0,_h2v1_merged_upsample
,0,__ZNSt3__18time_getIcNS_19istreambuf_iteratorIcNS_11char_traitsIcEEEEED1Ev,0,__ZN10__cxxabiv117__class_type_infoD0Ev,0,__ZNSt3__18messagesIwED1Ev,0,__ZNSt3__111__stdoutbufIwED1Ev,0,__ZN7Utility8ArgumentIiE4ReadEv
,0,__ZN10ImageCodec5flipXER5Image,0,__ZNKSt3__19money_getIwNS_19istreambuf_iteratorIwNS_11char_traitsIwEEEEE6do_getES4_S4_bRNS_8ios_baseERjRNS_12basic_stringIwS3_NS_9allocatorIwEEEE,0,_jpeg_idct_15x15,0,_request_virt_barray,0,_jpeg_fdct_3x6
,0,_jpeg_fdct_10x10,0,__ZNKSt3__15ctypeIwE11do_scan_notEtPKwS3_,0,__ZN9BarDecode9TokenizerILb1EED1Ev,0,__ZNKSt3__110moneypunctIwLb1EE14do_curr_symbolEv,0,__ZNSt3__18time_putIwNS_19ostreambuf_iteratorIwNS_11char_traitsIwEEEEED1Ev
,0,__ZN9JPEGCodec5flipYER5Image,0,__ZNKSt3__17codecvtIDsc10_mbstate_tE6do_outERS1_PKDsS5_RS5_PcS7_RS7_,0,__ZNKSt3__18messagesIwE6do_getEiiiRKNS_12basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEEE,0,_read_markers,0,_start_pass_downsample
,0,__ZL13my_error_exitP18jpeg_common_struct,0,__ZNKSt3__17codecvtIDsc10_mbstate_tE11do_encodingEv,0,__ZNKSt3__15ctypeIwE5do_isEtw,0,__ZNKSt3__110moneypunctIcLb1EE16do_positive_signEv,0,_compress_output701
,0,_process_data_simple_main,0,_h2v2_smooth_downsample,0,__ZNSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED0Ev,0,_pass_startup,0,__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev,0,__ZNSt3__15ctypeIcED2Ev,0,__ZNSt13runtime_errorD0Ev,0,__ZNSt3__113basic_istreamIwNS_11char_traitsIwEEED0Ev,0,_jpeg_fdct_2x2,0];
// EMSCRIPTEN_START_FUNCS
function _main(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66,r67,r68,r69,r70,r71,r72,r73,r74,r75,r76,r77,r78,r79,r80,r81,r82,r83,r84,r85,r86,r87,r88,r89,r90,r91,r92,r93,r94,r95,r96,r97,r98,r99,r100,r101,r102,r103,r104,r105,r106,r107,r108,r109,r110,r111,r112,r113,r114,r115,r116,r117,r118,r119,r120,r121,r122,r123,r124,r125,r126,r127,r128,r129,r130,r131,r132,r133,r134,r135,r136,r137,r138,r139,r140,r141,r142,r143,r144,r145,r146,r147,r148,r149,r150,r151,r152,r153,r154,r155,r156,r157,r158,r159,r160,r161,r162,r163,r164,r165,r166,r167,r168,r169,r170,r171,r172,r173,r174,r175,r176,r177,r178,r179,r180,r181,r182,r183,r184,r185,r186,r187,r188;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+1120|0;r5=r4;r6=r4+12;r7=r4+24,r8=r7>>2;r9=r4+36,r10=r9>>2;r11=r4+48,r12=r11>>2;r13=r4+60,r14=r13>>2;r15=r4+72,r16=r15>>2;r17=r4+112,r18=r17>>2;r19=r4+188;r20=r4+200;r21=r4+212;r22=r4+224,r23=r22>>2;r24=r4+300;r25=r4+312;r26=r4+324;r27=r4+336;r28=r4+340,r29=r28>>2;r30=r4+416;r31=r4+428;r32=r4+440;r33=r4+452;r34=r4+456,r35=r34>>2;r36=r4+532;r37=r4+544;r38=r4+556;r39=r4+568;r40=r4+572,r41=r40>>2;r42=r4+648;r43=r4+660;r44=r4+672;r45=r4+684;r46=r4+688;r47=r4+736;r48=r4+748;r49=r4+760;r50=r4+772;r51=r4+912;r52=r4+940;r53=r4+1080;r54=r4+1108;r55=r15+4|0;HEAP32[r55>>2]=0;HEAP32[r16+2]=0;HEAP32[r16]=r55;r55=r15+16|0;HEAP32[r55>>2]=0;HEAP32[r16+5]=0;HEAP32[r16+3]=r55;r55=(r15+24|0)>>2;HEAP32[r55]=0;r56=(r15+28|0)>>2;HEAP32[r56]=0;HEAP32[r16+8]=0;HEAP8[r15+36|0]=1;r16=r19;r57=r19;HEAP8[r57]=2;HEAP8[r16+1|0]=104;HEAP8[r16+2|0]=0;r16=r20;r58=r20;HEAP8[r58]=8;r59=r16+1|0;tempBigInt=1886152040;HEAP8[r59]=tempBigInt&255;tempBigInt=tempBigInt>>8;HEAP8[r59+1|0]=tempBigInt&255;tempBigInt=tempBigInt>>8;HEAP8[r59+2|0]=tempBigInt&255;tempBigInt=tempBigInt>>8;HEAP8[r59+3|0]=tempBigInt&255;HEAP8[r16+5|0]=0;r16=__Znwj(32);r59=r21+8|0;HEAP32[r59>>2]=r16;HEAP32[r21>>2]=33;HEAP32[r21+4>>2]=31;_memcpy(r16,5251120,31);HEAP8[r16+31|0]=0;__ZN7Utility8ArgumentIbEC2ERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEESA_SA_iibb(r17,r19,r20,r21,0,0,0,0);if((HEAP8[r21]&1)<<24>>24!=0){__ZdlPv(HEAP32[r59>>2])}if((HEAP8[r58]&1)<<24>>24!=0){__ZdlPv(HEAP32[r20+8>>2])}if((HEAP8[r57]&1)<<24>>24!=0){__ZdlPv(HEAP32[r19+8>>2])}r19=r24;r57=r24;HEAP8[r57]=2;HEAP8[r19+1|0]=116;HEAP8[r19+2|0]=0;r19=r25;r20=r25;HEAP8[r20]=18;_memcpy(r19+1|0,5249648,9);HEAP8[r19+10|0]=0;r19=__Znwj(32);r58=r26+8|0;HEAP32[r58>>2]=r19;HEAP32[r26>>2]=33;HEAP32[r26+4>>2]=24;_memcpy(r19,5249044,24);HEAP8[r19+24|0]=0;HEAP32[r27>>2]=150;__ZN7Utility8ArgumentIiEC2ERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEESA_SA_RKiiibb(r22,r24,r25,r26,r27,0,1,0,0);if((HEAP8[r26]&1)<<24>>24!=0){__ZdlPv(HEAP32[r58>>2])}if((HEAP8[r20]&1)<<24>>24!=0){__ZdlPv(HEAP32[r25+8>>2])}if((HEAP8[r57]&1)<<24>>24!=0){__ZdlPv(HEAP32[r24+8>>2])}r24=r30;r57=r30;HEAP8[r57]=2;HEAP8[r24+1|0]=99;HEAP8[r24+2|0]=0;r24=__Znwj(32);r25=r31+8|0;HEAP32[r25>>2]=r24;HEAP32[r31>>2]=33;HEAP32[r31+4>>2]=16;_memcpy(r24,5256292,16);HEAP8[r24+16|0]=0;r24=__Znwj(48);r20=r32+8|0;HEAP32[r20>>2]=r24;HEAP32[r32>>2]=49;HEAP32[r32+4>>2]=45;_memcpy(r24,5255700,45);HEAP8[r24+45|0]=0;HEAP32[r33>>2]=4;__ZN7Utility8ArgumentIiEC2ERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEESA_SA_RKiiibb(r28,r30,r31,r32,r33,0,1,0,0);if((HEAP8[r32]&1)<<24>>24!=0){__ZdlPv(HEAP32[r20>>2])}if((HEAP8[r31]&1)<<24>>24!=0){__ZdlPv(HEAP32[r25>>2])}if((HEAP8[r57]&1)<<24>>24!=0){__ZdlPv(HEAP32[r30+8>>2])}r30=r36;r57=r36;HEAP8[r57]=2;HEAP8[r30+1|0]=115;HEAP8[r30+2|0]=0;r30=r37;r25=r37;HEAP8[r25]=18;_memcpy(r30+1|0,5254352,9);HEAP8[r30+10|0]=0;r30=__Znwj(48);r31=r38+8|0;HEAP32[r31>>2]=r30;HEAP32[r38>>2]=49;HEAP32[r38+4>>2]=32;_memcpy(r30,5254004,32);HEAP8[r30+32|0]=0;HEAP32[r39>>2]=8;__ZN7Utility8ArgumentIiEC2ERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEESA_SA_RKiiibb(r34,r36,r37,r38,r39,0,1,0,0);if((HEAP8[r38]&1)<<24>>24!=0){__ZdlPv(HEAP32[r31>>2])}if((HEAP8[r25]&1)<<24>>24!=0){__ZdlPv(HEAP32[r37+8>>2])}if((HEAP8[r57]&1)<<24>>24!=0){__ZdlPv(HEAP32[r36+8>>2])}r36=r42;r57=r42;HEAP8[r57]=2;HEAP8[r36+1|0]=100;HEAP8[r36+2|0]=0;r36=r43;r37=r43;HEAP8[r37]=20;_memcpy(r36+1|0,5253672,10);HEAP8[r36+11|0]=0;r36=__Znwj(112);r25=r44+8|0;HEAP32[r25>>2]=r36;HEAP32[r44>>2]=113;HEAP32[r44+4>>2]=109;_memcpy(r36,5253496,109);HEAP8[r36+109|0]=0;HEAP32[r45>>2]=15;__ZN7Utility8ArgumentIiEC2ERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEESA_SA_RKiiibb(r40,r42,r43,r44,r45,0,1,0,0);if((HEAP8[r44]&1)<<24>>24!=0){__ZdlPv(HEAP32[r25>>2])}if((HEAP8[r37]&1)<<24>>24!=0){__ZdlPv(HEAP32[r43+8>>2])}if((HEAP8[r57]&1)<<24>>24!=0){__ZdlPv(HEAP32[r42+8>>2])}r42=r17|0;r57=r15|0;r43=r17+4|0;HEAP32[__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r57,r43)>>2]=r42;r37=r15+12|0;r25=r17+16|0;HEAP32[__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r37,r25)>>2]=r42;r42=r22|0;r44=r22+4|0;HEAP32[__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r57,r44)>>2]=r42;r45=r22+16|0;HEAP32[__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r37,r45)>>2]=r42;r42=r40|0;r36=r40+4|0;HEAP32[__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r57,r36)>>2]=r42;r31=r40+16|0;HEAP32[__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r37,r31)>>2]=r42;r42=r28|0;r38=r28+4|0;HEAP32[__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r57,r38)>>2]=r42;r39=r28+16|0;HEAP32[__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r37,r39)>>2]=r42;r42=r34|0;r30=r34+4|0;HEAP32[__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r57,r30)>>2]=r42;r57=r34+16|0;HEAP32[__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r37,r57)>>2]=r42;do{if(__ZN7Utility12ArgumentList4ReadEiPPc(r15,r1,r2)){if(__ZNK7Utility8ArgumentIbE3GetEj(r17,0)){r3=56;break}HEAP8[r46|0]=0;HEAP8[r46+1|0]=0;_memset(r46+4|0,0,44);r42=HEAP32[r56];r37=HEAP32[r55];r20=((r42-r37|0)/12&-1)>>>0>1;do{if((r37|0)==(r42|0)){r60=r46+24|0;r61=0}else{r32=r47,r33=r32>>2;r24=r48;r58=r48+1|0;r26=r6;r27=r6|0;r19=r6+4|0;r59=r6+8|0;r21=r49+4|0;r16=r21|0;r62=r49+8|0;r63=r21;r64=r49|0;r65=r49|0;r66=r49+4|0;r67=r54,r68=r67>>2;r69=r54+1|0;r70=r54+4|0;r71=(r54+8|0)>>2;r72=r54|0;r73=r5;r74=r5|0;r75=r5+4|0;r76=r5+8|0;r77=r52+20|0;r78=(r52+28|0)>>2;r79=r52+16|0;r80=r53|0;r81=r52+84|0;r82=r53+4|0;r83=r52+88|0;r84=r53+8|0;r85=r52+92|0,r86=r85>>2;r87=r84,r88=r87>>2;r89=r53+20|0;r90=r52+104|0;r91=r53+24|0;r92=r52+108|0;r93=r53+16|0;r94=r52+100|0;r95=r52+96|0;r96=r84+1|0;r97=r84|0;r84=r53+12|0;r98=r52|0;r99=r52+112|0;r100=r52+4|0;r101=r52+12|0;r102=r52+32|0;r103=r52+116|0;r104=r50+20|0;r105=(r50+28|0)>>2;r106=r50+16|0;r107=r51|0;r108=r50+84|0;r109=r51+4|0;r110=r50+88|0;r111=r51+8|0;r112=r50+92|0,r113=r112>>2;r114=r111,r115=r114>>2;r116=r51+20|0;r117=r50+104|0;r118=r51+24|0;r119=r50+108|0;r120=r51+16|0;r121=r50+100|0;r122=r50+96|0;r123=r111+1|0;r124=r111|0;r111=r51+12|0;r125=r50|0;r126=r50+112|0;r127=r50+4|0;r128=r50+12|0;r129=r50+32|0;r130=r50+116|0;r131=r47+8|0;r132=r48+8|0;r133=r47+1|0;r134=r47|0;r135=r47+4|0;r136=r37;r137=0;L75:while(1){r138=r136,r139=r138>>2;if((HEAP8[r138]&1)<<24>>24==0){HEAP32[r33]=HEAP32[r139];HEAP32[r33+1]=HEAP32[r139+1];HEAP32[r33+2]=HEAP32[r139+2]}else{r139=HEAP32[r136+8>>2];r138=HEAP32[r136+4>>2];if((r138|0)==-1){r3=157;break}if(r138>>>0<11){HEAP8[r32]=r138<<1&255;r140=r133}else{r141=r138+16&-16;r142=__Znwj(r141);HEAP32[r131>>2]=r142;HEAP32[r134>>2]=r141|1;HEAP32[r135>>2]=r138;r140=r142}_memcpy(r140,r139,r138);HEAP8[r140+r138|0]=0}HEAP8[r24]=0;HEAP8[r58]=0;r138=(__ZN10ImageCodec4ReadENSt3__112basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEER5ImageRKS6_i(r47,r46,r48,0)|0)==0;if((HEAP8[r24]&1)<<24>>24!=0){__ZdlPv(HEAP32[r132>>2])}if((HEAP8[r32]&1)<<24>>24!=0){__ZdlPv(HEAP32[r131>>2])}if(r138){r138=__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5252852),r136);r139=HEAP32[r138+HEAP32[HEAP32[r138>>2]-12>>2]+28>>2],r142=r139>>2;r141=(r139+4|0)>>2;tempValue=HEAP32[r141],HEAP32[r141]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r27>>2]=5270024;HEAP32[r19>>2]=48;HEAP32[r59>>2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r26,766)}r143=HEAP32[1317507]-1|0;r144=HEAP32[r142+5];if(HEAP32[r142+6]-r144>>2>>>0<=r143>>>0){r3=176;break}r145=HEAP32[r144+(r143<<2)>>2];if((r145|0)==0){r3=176;break}r143=FUNCTION_TABLE[HEAP32[HEAP32[r145>>2]+28>>2]](r145,10);if(((tempValue=HEAP32[r141],HEAP32[r141]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r142]+8>>2]](r139)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r138,r143);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r138);r146=r137+1|0}else{r138=__ZNK7Utility8ArgumentIiE3GetEj(r22,0);r143=__ZNK7Utility8ArgumentIiE3GetEj(r40,0);r139=__ZNK7Utility8ArgumentIiE3GetEj(r28,0);r142=__ZNK7Utility8ArgumentIiE3GetEj(r34,0);HEAP32[r16>>2]=0;HEAP32[r62>>2]=0;HEAP32[r64>>2]=r63;do{if((r143&5|0)!=0){__ZN9BarDecode15BarcodeIteratorILb0EEC2EPK5ImageijNS_12directions_tEii(r50,r46,r138,631,r143,r139,r142);while(1){r141=HEAP32[r104>>2]-1|0;r145=HEAP32[r105]>>2;r144=HEAP32[r106>>2];__ZNK5Image4TypeEv(r144);r147=r144+32|0;r148=HEAP32[r147>>2];r149=r144+44|0;r150=r144+40|0;r151=r144+28|0;r152=HEAP32[r151>>2];do{if((r152|0)==0){r153=HEAP32[r144+24>>2];if((r153|0)==0){r154=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r153>>2]+32>>2]](r153,r144);r153=HEAP32[r151>>2];if((r153|0)==0){r154=0;break}HEAP8[r144|0]=0;r154=r153}else{r154=r152}}while(0);r152=HEAP32[r144+36>>2];r151=r154+Math.imul((Math.imul(Math.imul(HEAP32[r149>>2],HEAP32[r147>>2]),HEAP32[r150>>2])+7|0)/8&-1,r152)|0;r152=(HEAP32[((r141*44&-1)+36>>2)+r145]|0)!=(r151|0);r151=(HEAP32[((r141*44&-1)+4>>2)+r145]-1|0)>>>0>2;if(r151|r152^1){if(!(r151&r152)){break}}else{if((HEAP32[((r141*44&-1)+16>>2)+r145]|0)==(r148|0)){break}}HEAP8[r107]=HEAP8[r108]&1;HEAP32[r109>>2]=HEAP32[r110>>2];if((HEAP8[r112]&1)<<24>>24==0){HEAP32[r115]=HEAP32[r113];HEAP32[r115+1]=HEAP32[r113+1];HEAP32[r115+2]=HEAP32[r113+2]}else{r152=HEAP32[r121>>2];r151=HEAP32[r122>>2];if((r151|0)==-1){r3=213;break L75}if(r151>>>0<11){HEAP8[r114]=r151<<1&255;r155=r123}else{r153=r151+16&-16;r156=__Znwj(r153);HEAP32[r120>>2]=r156;HEAP32[r124>>2]=r153|1;HEAP32[r111>>2]=r151;r155=r156}_memcpy(r155,r152,r151);HEAP8[r155+r151|0]=0}HEAP32[r116>>2]=HEAP32[r117>>2];HEAP32[r118>>2]=HEAP32[r119>>2];r151=__ZNSt3__13mapIN9BarDecode16scanner_result_tEiN12_GLOBAL__N_14compENS_9allocatorINS_4pairIKS2_iEEEEEixERS7_(r49,r51);HEAP32[r151>>2]=HEAP32[r151>>2]+1|0;if((HEAP8[r114]&1)<<24>>24!=0){__ZdlPv(HEAP32[r120>>2])}r151=HEAP32[r104>>2]-1|0;r152=HEAP32[r105]>>2;r156=HEAP32[r106>>2];__ZNK5Image4TypeEv(r156);r153=r156+32|0;r157=HEAP32[r153>>2];r158=r156+44|0;r159=r156+40|0;r160=r156+28|0;r161=HEAP32[r160>>2];do{if((r161|0)==0){r162=HEAP32[r156+24>>2];if((r162|0)==0){r163=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r162>>2]+32>>2]](r162,r156);r162=HEAP32[r160>>2];if((r162|0)==0){r163=0;break}HEAP8[r156|0]=0;r163=r162}else{r163=r161}}while(0);r161=HEAP32[r156+36>>2];r160=r163+Math.imul((Math.imul(Math.imul(HEAP32[r158>>2],HEAP32[r153>>2]),HEAP32[r159>>2])+7|0)/8&-1,r161)|0;r161=(HEAP32[((r151*44&-1)+36>>2)+r152]|0)!=(r160|0);r160=(HEAP32[((r151*44&-1)+4>>2)+r152]-1|0)>>>0>2;do{if(r160|r161^1){if(r160&r161){break}else{r3=232;break}}else{if((HEAP32[((r151*44&-1)+16>>2)+r152]|0)==(r157|0)){r3=232;break}else{break}}}while(0);if(r3==232){r3=0;___assert_func(5252516,149,5258144,5252448)}__ZN9BarDecode15BarcodeIteratorILb0EE4nextEv(r50)}HEAP32[r125>>2]=5263632;r157=HEAP32[r126>>2];if((r157|0)!=0){HEAP32[r130>>2]=r157;__ZdlPv(r157|0)}if((HEAP8[r112]&1)<<24>>24!=0){__ZdlPv(HEAP32[r121>>2])}HEAP32[r127>>2]=5263592;HEAP32[r128>>2]=5263672;r157=HEAP32[r105];if((r157|0)==0){break}HEAP32[r129>>2]=r157;__ZdlPv(r157)}}while(0);r157=r143&10;do{if((r157|0)!=0){__ZN9BarDecode15BarcodeIteratorILb1EEC2EPK5ImageijNS_12directions_tEii(r52,r46,r138,631,r157>>>1,r139,r142);while(1){r152=HEAP32[r77>>2]-1|0;r151=HEAP32[r78]>>2;r161=HEAP32[r79>>2];__ZNK5Image4TypeEv(r161);r160=r161+32|0;r159=HEAP32[r160>>2];r153=r161+44|0;r158=r161+40|0;r156=r161+28|0;r148=HEAP32[r156>>2];do{if((r148|0)==0){r145=HEAP32[r161+24>>2];if((r145|0)==0){r164=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r145>>2]+32>>2]](r145,r161);r145=HEAP32[r156>>2];if((r145|0)==0){r164=0;break}HEAP8[r161|0]=0;r164=r145}else{r164=r148}}while(0);r148=HEAP32[r161+36>>2];r156=r164+Math.imul((Math.imul(Math.imul(HEAP32[r153>>2],HEAP32[r160>>2]),HEAP32[r158>>2])+7|0)/8&-1,r148)|0;r148=(HEAP32[((r152*44&-1)+36>>2)+r151]|0)!=(r156|0);r156=(HEAP32[((r152*44&-1)+4>>2)+r151]-1|0)>>>0>2;if(r156|r148^1){if(!(r156&r148)){break}}else{if((HEAP32[((r152*44&-1)+16>>2)+r151]|0)==(r159|0)){break}}HEAP8[r80]=HEAP8[r81]&1;HEAP32[r82>>2]=HEAP32[r83>>2];if((HEAP8[r85]&1)<<24>>24==0){HEAP32[r88]=HEAP32[r86];HEAP32[r88+1]=HEAP32[r86+1];HEAP32[r88+2]=HEAP32[r86+2]}else{r148=HEAP32[r94>>2];r156=HEAP32[r95>>2];if((r156|0)==-1){r3=268;break L75}if(r156>>>0<11){HEAP8[r87]=r156<<1&255;r165=r96}else{r145=r156+16&-16;r141=__Znwj(r145);HEAP32[r93>>2]=r141;HEAP32[r97>>2]=r145|1;HEAP32[r84>>2]=r156;r165=r141}_memcpy(r165,r148,r156);HEAP8[r165+r156|0]=0}HEAP32[r89>>2]=HEAP32[r90>>2];HEAP32[r91>>2]=HEAP32[r92>>2];r156=__ZNSt3__13mapIN9BarDecode16scanner_result_tEiN12_GLOBAL__N_14compENS_9allocatorINS_4pairIKS2_iEEEEEixERS7_(r49,r53);HEAP32[r156>>2]=HEAP32[r156>>2]+1|0;if((HEAP8[r87]&1)<<24>>24!=0){__ZdlPv(HEAP32[r93>>2])}r156=HEAP32[r77>>2]-1|0;r148=HEAP32[r78]>>2;r141=HEAP32[r79>>2];__ZNK5Image4TypeEv(r141);r145=r141+32|0;r150=HEAP32[r145>>2];r147=r141+44|0;r149=r141+40|0;r144=r141+28|0;r162=HEAP32[r144>>2];do{if((r162|0)==0){r166=HEAP32[r141+24>>2];if((r166|0)==0){r167=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r166>>2]+32>>2]](r166,r141);r166=HEAP32[r144>>2];if((r166|0)==0){r167=0;break}HEAP8[r141|0]=0;r167=r166}else{r167=r162}}while(0);r162=HEAP32[r141+36>>2];r144=r167+Math.imul((Math.imul(Math.imul(HEAP32[r147>>2],HEAP32[r145>>2]),HEAP32[r149>>2])+7|0)/8&-1,r162)|0;r162=(HEAP32[((r156*44&-1)+36>>2)+r148]|0)!=(r144|0);r144=(HEAP32[((r156*44&-1)+4>>2)+r148]-1|0)>>>0>2;do{if(r144|r162^1){if(r144&r162){break}else{r3=287;break}}else{if((HEAP32[((r156*44&-1)+16>>2)+r148]|0)==(r150|0)){r3=287;break}else{break}}}while(0);if(r3==287){r3=0;___assert_func(5252516,149,5258004,5252448)}__ZN9BarDecode15BarcodeIteratorILb1EE4nextEv(r52)}HEAP32[r98>>2]=5263612;r150=HEAP32[r99>>2];if((r150|0)!=0){HEAP32[r103>>2]=r150;__ZdlPv(r150|0)}if((HEAP8[r85]&1)<<24>>24!=0){__ZdlPv(HEAP32[r94>>2])}HEAP32[r100>>2]=5263572;HEAP32[r101>>2]=5263652;r150=HEAP32[r78];if((r150|0)==0){break}HEAP32[r102>>2]=r150;__ZdlPv(r150)}}while(0);r142=HEAP32[r64>>2];L216:do{if((r142|0)!=(r63|0)){r139=r142,r157=r139>>2;while(1){r138=r139+20|0;do{if((HEAP32[r138>>2]&55|0)==0){if((HEAP32[r157+11]|0)>1){r3=309;break}else{break}}else{r3=309}}while(0);do{if(r3==309){r3=0;if(r20){__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(5270120,r136),5254816)}r143=r139+24|0;HEAP32[r68]=0;HEAP32[r68+1]=0;HEAP32[r68+2]=0;r150=r143;r148=r143+1|0;r143=r139+32|0;r156=r139+28|0;r162=0;r144=0;while(1){r149=HEAP8[r150];r145=r149&255;if((r145&1|0)==0){r168=r145>>>1}else{r168=HEAP32[r156>>2]}if(r162>>>0>=r168>>>0){break}if((r149&1)<<24>>24==0){r169=r148}else{r169=HEAP32[r143>>2]}do{if((_isprint(HEAP8[r169+r162|0]<<24>>24)|0)==0){r170=r144}else{if((HEAP8[r150]&1)<<24>>24==0){r171=r148}else{r171=HEAP32[r143>>2]}r149=HEAP8[r171+r162|0];if((r144&1)<<24>>24==0){r172=10;r173=r144}else{r145=HEAP32[r72>>2];r172=(r145&-2)-1|0;r173=r145&255}r145=r173&255;r147=(r145&1|0)==0?r145>>>1:HEAP32[r70>>2];if((r147|0)==(r172|0)){if((r172|0)==-3){r3=328;break L75}r145=(HEAP8[r67]&1)<<24>>24==0?r69:HEAP32[r71];do{if(r172>>>0<2147483631){r141=r172+1|0;r159=r172<<1;r151=r141>>>0<r159>>>0?r159:r141;if(r151>>>0<11){r174=11;break}r174=r151+16&-16}else{r174=-2}}while(0);r151=__Znwj(r174);_memcpy(r151,r145,r172);if((r172|0)!=10){__ZdlPv(r145)}HEAP32[r71]=r151;r141=r174|1;HEAP32[r72>>2]=r141;r175=r141&255;r176=r151}else{r175=r173;r176=HEAP32[r71]}r151=(r175&1)<<24>>24==0?r69:r176;HEAP8[r151+r147|0]=r149;r141=r147+1|0;HEAP8[r151+r141|0]=0;r151=HEAP8[r67];if((r151&1)<<24>>24==0){r159=r141<<1&255;HEAP8[r67]=r159;r170=r159;break}else{HEAP32[r70>>2]=r141;r170=r151;break}}}while(0);r162=r162+1|0;r144=r170}r144=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZN9BarDecodelsERNSt3__113basic_ostreamIcNS0_11char_traitsIcEEEERKNS_6code_tE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(5270120,r54),5252764),r138),5252728),HEAP32[r157+9]),5252684),HEAP32[r157+10]),5252596);r162=HEAP32[r144+HEAP32[HEAP32[r144>>2]-12>>2]+28>>2],r143=r162>>2;r148=(r162+4|0)>>2;tempValue=HEAP32[r148],HEAP32[r148]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r74>>2]=5270024;HEAP32[r75>>2]=48;HEAP32[r76>>2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r73,766)}r150=HEAP32[1317507]-1|0;r156=HEAP32[r143+5];if(HEAP32[r143+6]-r156>>2>>>0<=r150>>>0){r3=357;break L75}r151=HEAP32[r156+(r150<<2)>>2];if((r151|0)==0){r3=357;break L75}r150=FUNCTION_TABLE[HEAP32[HEAP32[r151>>2]+28>>2]](r151,10);if(((tempValue=HEAP32[r148],HEAP32[r148]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r143]+8>>2]](r162)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r144,r150);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r144);if((HEAP8[r67]&1)<<24>>24==0){break}__ZdlPv(HEAP32[r71])}}while(0);r138=HEAP32[r157+1];L285:do{if((r138|0)==0){r144=r139|0;while(1){r150=HEAP32[r144+8>>2];if((r144|0)==(HEAP32[r150>>2]|0)){r177=r150;break L285}else{r144=r150}}}else{r144=r138;while(1){r150=HEAP32[r144>>2];if((r150|0)==0){r177=r144;break L285}else{r144=r150}}}}while(0);if((r177|0)==(r21|0)){break L216}else{r139=r177,r157=r139>>2}}}}while(0);r142=((HEAP32[r62>>2]|0)==0&1)+r137|0;__ZNSt3__16__treeINS_4pairIN9BarDecode16scanner_result_tEiEENS_19__map_value_compareIS3_iN12_GLOBAL__N_14compELb1EEENS_9allocatorIS4_EEE7destroyEPNS_11__tree_nodeIS4_PvEE(r65,HEAP32[r66>>2]);r146=r142}r142=r136+12|0;if((r142|0)==(HEAP32[r56]|0)){r3=381;break}else{r136=r142;r137=r146}}if(r3==157){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r3==176){r137=___cxa_allocate_exception(4);HEAP32[r137>>2]=5260948;___cxa_throw(r137,5267528,954)}else if(r3==213){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r3==268){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r3==328){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r3==357){r137=___cxa_allocate_exception(4);HEAP32[r137>>2]=5260948;___cxa_throw(r137,5267528,954)}else if(r3==381){r137=r46+24|0;r136=HEAP32[r137>>2];if((r136|0)==0){r60=r137;r61=r146;break}FUNCTION_TABLE[HEAP32[HEAP32[r136>>2]+4>>2]](r136);r60=r137;r61=r146;break}}}while(0);HEAP32[r60>>2]=0;r20=r46+28|0;r37=HEAP32[r20>>2];if((r37|0)!=0){_free(r37)}HEAP32[r20>>2]=0;if((HEAP8[r46+12|0]&1)<<24>>24==0){r178=r61;break}__ZdlPv(HEAP32[r46+20>>2]);r178=r61;break}else{r3=56}}while(0);L314:do{if(r3==56){r61=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5253340);r46=HEAP32[r61+HEAP32[HEAP32[r61>>2]-12>>2]+28>>2],r60=r46>>2;r146=(r46+4|0)>>2;tempValue=HEAP32[r146],HEAP32[r146]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r14]=5270024;HEAP32[r14+1]=48;HEAP32[r14+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r13,766)}r177=HEAP32[1317507]-1|0;r54=HEAP32[r60+5];do{if(HEAP32[r60+6]-r54>>2>>>0>r177>>>0){r170=HEAP32[r54+(r177<<2)>>2];if((r170|0)==0){break}r176=FUNCTION_TABLE[HEAP32[HEAP32[r170>>2]+28>>2]](r170,10);if(((tempValue=HEAP32[r146],HEAP32[r146]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r60]+8>>2]](r46)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r61,r176);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r61);r176=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(r61,5253232);r170=HEAP32[r176+HEAP32[HEAP32[r176>>2]-12>>2]+28>>2],r175=r170>>2;r173=(r170+4|0)>>2;tempValue=HEAP32[r173],HEAP32[r173]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r12]=5270024;HEAP32[r12+1]=48;HEAP32[r12+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r11,766)}r174=HEAP32[1317507]-1|0;r172=HEAP32[r175+5];do{if(HEAP32[r175+6]-r172>>2>>>0>r174>>>0){r171=HEAP32[r172+(r174<<2)>>2];if((r171|0)==0){break}r169=FUNCTION_TABLE[HEAP32[HEAP32[r171>>2]+28>>2]](r171,10);if(((tempValue=HEAP32[r173],HEAP32[r173]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r175]+8>>2]](r170)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r176,r169);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r176);r169=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(r176,5253148);r171=HEAP32[r169+HEAP32[HEAP32[r169>>2]-12>>2]+28>>2],r168=r171>>2;r52=(r171+4|0)>>2;tempValue=HEAP32[r52],HEAP32[r52]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r10]=5270024;HEAP32[r10+1]=48;HEAP32[r10+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r9,766)}r167=HEAP32[1317507]-1|0;r53=HEAP32[r168+5];do{if(HEAP32[r168+6]-r53>>2>>>0>r167>>>0){r49=HEAP32[r53+(r167<<2)>>2];if((r49|0)==0){break}r165=FUNCTION_TABLE[HEAP32[HEAP32[r49>>2]+28>>2]](r49,10);if(((tempValue=HEAP32[r52],HEAP32[r52]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r168]+8>>2]](r171)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r169,r165);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r169);r165=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(r169,5253108);r49=HEAP32[r165+HEAP32[HEAP32[r165>>2]-12>>2]+28>>2],r164=r49>>2;r50=(r49+4|0)>>2;tempValue=HEAP32[r50],HEAP32[r50]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r8]=5270024;HEAP32[r8+1]=48;HEAP32[r8+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r7,766)}r163=HEAP32[1317507]-1|0;r51=HEAP32[r164+5];do{if(HEAP32[r164+6]-r51>>2>>>0>r163>>>0){r155=HEAP32[r51+(r163<<2)>>2];if((r155|0)==0){break}r154=FUNCTION_TABLE[HEAP32[HEAP32[r155>>2]+28>>2]](r155,10);if(((tempValue=HEAP32[r50],HEAP32[r50]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r164]+8>>2]](r49)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r165,r154);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r165);__ZNK7Utility12ArgumentList5UsageERNSt3__113basic_ostreamIcNS1_11char_traitsIcEEEE(r15,5270288);r178=1;break L314}}while(0);r165=___cxa_allocate_exception(4);HEAP32[r165>>2]=5260948;___cxa_throw(r165,5267528,954)}}while(0);r169=___cxa_allocate_exception(4);HEAP32[r169>>2]=5260948;___cxa_throw(r169,5267528,954)}}while(0);r176=___cxa_allocate_exception(4);HEAP32[r176>>2]=5260948;___cxa_throw(r176,5267528,954)}}while(0);r61=___cxa_allocate_exception(4);HEAP32[r61>>2]=5260948;___cxa_throw(r61,5267528,954)}}while(0);r7=r40|0;HEAP32[r7>>2]=5263692;r8=HEAP32[r41+15];if((r8|0)!=0){HEAP32[r41+16]=r8;__ZdlPv(r8)}HEAP32[r7>>2]=5263788;if((HEAP8[r40+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r41+9])}if((HEAP8[r31]&1)<<24>>24!=0){__ZdlPv(HEAP32[r41+6])}if((HEAP8[r36]&1)<<24>>24!=0){__ZdlPv(HEAP32[r41+3])}r41=r34|0;HEAP32[r41>>2]=5263692;r36=HEAP32[r35+15];if((r36|0)!=0){HEAP32[r35+16]=r36;__ZdlPv(r36)}HEAP32[r41>>2]=5263788;if((HEAP8[r34+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r35+9])}if((HEAP8[r57]&1)<<24>>24!=0){__ZdlPv(HEAP32[r35+6])}if((HEAP8[r30]&1)<<24>>24!=0){__ZdlPv(HEAP32[r35+3])}r35=r28|0;HEAP32[r35>>2]=5263692;r30=HEAP32[r29+15];if((r30|0)!=0){HEAP32[r29+16]=r30;__ZdlPv(r30)}HEAP32[r35>>2]=5263788;if((HEAP8[r28+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r29+9])}if((HEAP8[r39]&1)<<24>>24!=0){__ZdlPv(HEAP32[r29+6])}if((HEAP8[r38]&1)<<24>>24!=0){__ZdlPv(HEAP32[r29+3])}r29=r22|0;HEAP32[r29>>2]=5263692;r38=HEAP32[r23+15];if((r38|0)!=0){HEAP32[r23+16]=r38;__ZdlPv(r38)}HEAP32[r29>>2]=5263788;if((HEAP8[r22+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r23+9])}if((HEAP8[r45]&1)<<24>>24!=0){__ZdlPv(HEAP32[r23+6])}if((HEAP8[r44]&1)<<24>>24!=0){__ZdlPv(HEAP32[r23+3])}r23=r17|0;HEAP32[r23>>2]=5263740;r44=HEAP32[r18+15];if((r44|0)!=0){__ZdlPv(r44)}HEAP32[r23>>2]=5263788;if((HEAP8[r17+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r18+9])}if((HEAP8[r25]&1)<<24>>24!=0){__ZdlPv(HEAP32[r18+6])}if((HEAP8[r43]&1)<<24>>24!=0){__ZdlPv(HEAP32[r18+3])}r18=HEAP32[r55];if((r18|0)==0){r179=r15+12|0;r180=r15+16|0;r181=HEAP32[r180>>2];r182=r181;__ZNSt3__16__treeINS_4pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentEEENS_19__map_value_compareIS7_SA_NS_4lessIS7_EELb1EEENS5_ISB_EEE7destroyEPNS_11__tree_nodeISB_PvEE(r179,r182);r183=r15|0;r184=r15+4|0;r185=HEAP32[r184>>2];r186=r185;__ZNSt3__16__treeINS_4pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentEEENS_19__map_value_compareIS7_SA_NS_4lessIS7_EELb1EEENS5_ISB_EEE7destroyEPNS_11__tree_nodeISB_PvEE(r183,r186);STACKTOP=r4;return r178}r43=HEAP32[r56];if(r18>>>0<r43>>>0){r25=r43;while(1){r43=r25-12|0;HEAP32[r56]=r43;if((HEAP8[r43]&1)<<24>>24==0){r187=r43}else{__ZdlPv(HEAP32[r25-12+8>>2]);r187=HEAP32[r56]}if(r18>>>0<r187>>>0){r25=r187}else{break}}r188=HEAP32[r55]}else{r188=r18}__ZdlPv(r188);r179=r15+12|0;r180=r15+16|0;r181=HEAP32[r180>>2];r182=r181;__ZNSt3__16__treeINS_4pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentEEENS_19__map_value_compareIS7_SA_NS_4lessIS7_EELb1EEENS5_ISB_EEE7destroyEPNS_11__tree_nodeISB_PvEE(r179,r182);r183=r15|0;r184=r15+4|0;r185=HEAP32[r184>>2];r186=r185;__ZNSt3__16__treeINS_4pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentEEENS_19__map_value_compareIS7_SA_NS_4lessIS7_EELb1EEENS5_ISB_EEE7destroyEPNS_11__tree_nodeISB_PvEE(r183,r186);STACKTOP=r4;return r178}function __ZNK7Utility8ArgumentIbE3GetEj(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10;r3=STACKTOP;STACKTOP=STACKTOP+12|0;r4=r3,r5=r4>>2;if(HEAP32[r1+64>>2]>>>0>r2>>>0){r6=(HEAP32[HEAP32[r1+60>>2]+(r2>>>5<<2)>>2]&1<<(r2&31)|0)!=0;STACKTOP=r3;return r6}r7=__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEj(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5251048),r2),5250956),r1+16|0);r1=HEAP32[r7+HEAP32[HEAP32[r7>>2]-12>>2]+28>>2],r2=r1>>2;r8=(r1+4|0)>>2;tempValue=HEAP32[r8],HEAP32[r8]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r5]=5270024;HEAP32[r5+1]=48;HEAP32[r5+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r4,766)}r4=HEAP32[1317507]-1|0;r5=HEAP32[r2+5];do{if(HEAP32[r2+6]-r5>>2>>>0>r4>>>0){r9=HEAP32[r5+(r4<<2)>>2];if((r9|0)==0){break}r10=FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]+28>>2]](r9,10);if(((tempValue=HEAP32[r8],HEAP32[r8]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r2]+8>>2]](r1)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r7,r10);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r7);r6=0;STACKTOP=r3;return r6}}while(0);r6=___cxa_allocate_exception(4);HEAP32[r6>>2]=5260948;___cxa_throw(r6,5267528,954)}function __ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14;r3=STACKTOP;STACKTOP=STACKTOP+16|0;r4=r3;r5=r3+8;r6=r3+12;r7=r4|0;HEAP8[r7]=0;HEAP32[r4+4>>2]=r1;r8=r1>>2;r9=HEAP32[HEAP32[r8]-12>>2];r10=r1,r11=r10>>2;do{if((HEAP32[(r9+16>>2)+r11]|0)==0){r12=HEAP32[(r9+72>>2)+r11];if((r12|0)!=0){__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r12)}HEAP8[r7]=1;r12=_strlen(r2);r13=HEAP32[HEAP32[r8]-12>>2];HEAP32[r5>>2]=HEAP32[(r13+24>>2)+r11];r14=r2+r12|0;__ZNSt3__116__pad_and_outputIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEEET0_S5_PKT_S8_S8_RNS_8ios_baseES6_(r6,r5,r2,(HEAP32[(r13+4>>2)+r11]&176|0)==32?r14:r2,r14,r10+r13|0,HEAP8[r13+(r10+76)|0]);if((HEAP32[r6>>2]|0)!=0){break}r13=HEAP32[HEAP32[r8]-12>>2];__ZNSt3__18ios_base5clearEj(r10+r13|0,HEAP32[(r13+16>>2)+r11]|5)}}while(0);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE6sentryD2Ev(r4);STACKTOP=r3;return r1}function __ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23;r3=r2>>2;r4=0;r5=STACKTOP;STACKTOP=STACKTOP+16|0;r6=r5;r7=r5+8;r8=r5+12;r9=r6|0;HEAP8[r9]=0;HEAP32[r6+4>>2]=r1;r10=r1>>2;r11=HEAP32[HEAP32[r10]-12>>2];r12=r1,r13=r12>>2;do{if((HEAP32[(r11+16>>2)+r13]|0)==0){r14=HEAP32[(r11+72>>2)+r13];if((r14|0)!=0){__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r14)}HEAP8[r9]=1;r14=r2;r15=HEAP8[r2];r16=r15&255;if((r16&1|0)==0){r17=r16>>>1}else{r17=HEAP32[r3+1]}r16=HEAP32[HEAP32[r10]-12>>2];HEAP32[r7>>2]=HEAP32[(r16+24>>2)+r13];r18=(r15&1)<<24>>24==0;if(r18){r19=r14+1|0}else{r19=HEAP32[r3+2]}do{if((HEAP32[(r16+4>>2)+r13]&176|0)==32){if(r18){r20=r14+(r17+1)|0;r4=548;break}else{r21=HEAP32[r3+2]+r17|0;r4=547;break}}else{if(r18){r20=r14+1|0;r4=548;break}else{r21=HEAP32[r3+2];r4=547;break}}}while(0);if(r4==547){r22=HEAP32[r3+2];r23=r21}else if(r4==548){r22=r14+1|0;r23=r20}__ZNSt3__116__pad_and_outputIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEEET0_S5_PKT_S8_S8_RNS_8ios_baseES6_(r8,r7,r19,r23,r22+r17|0,r12+r16|0,HEAP8[r16+(r12+76)|0]);if((HEAP32[r8>>2]|0)!=0){break}r18=HEAP32[HEAP32[r10]-12>>2];__ZNSt3__18ios_base5clearEj(r12+r18|0,HEAP32[(r18+16>>2)+r13]|5)}}while(0);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE6sentryD2Ev(r6);STACKTOP=r5;return r1}function __ZNK7Utility8ArgumentIiE3GetEj(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10;r3=STACKTOP;STACKTOP=STACKTOP+12|0;r4=r3,r5=r4>>2;r6=HEAP32[r1+60>>2];if(HEAP32[r1+64>>2]-r6>>2>>>0>r2>>>0){r7=HEAP32[r6+(r2<<2)>>2];STACKTOP=r3;return r7}r6=__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEj(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5251048),r2),5250956),r1+16|0);r1=HEAP32[r6+HEAP32[HEAP32[r6>>2]-12>>2]+28>>2],r2=r1>>2;r8=(r1+4|0)>>2;tempValue=HEAP32[r8],HEAP32[r8]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r5]=5270024;HEAP32[r5+1]=48;HEAP32[r5+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r4,766)}r4=HEAP32[1317507]-1|0;r5=HEAP32[r2+5];do{if(HEAP32[r2+6]-r5>>2>>>0>r4>>>0){r9=HEAP32[r5+(r4<<2)>>2];if((r9|0)==0){break}r10=FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]+28>>2]](r9,10);if(((tempValue=HEAP32[r8],HEAP32[r8]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r2]+8>>2]](r1)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r6,r10);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r6);r7=0;STACKTOP=r3;return r7}}while(0);r7=___cxa_allocate_exception(4);HEAP32[r7>>2]=5260948;___cxa_throw(r7,5267528,954)}function __ZN9BarDecode15BarcodeIteratorILb0EED1Ev(r1){var r2,r3;r2=r1>>2;HEAP32[r2]=5263632;r3=HEAP32[r2+28];if((r3|0)!=0){HEAP32[r2+29]=r3;__ZdlPv(r3|0)}if((HEAP8[r1+92|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+25])}HEAP32[r2+1]=5263592;HEAP32[r2+3]=5263672;r1=HEAP32[r2+7];if((r1|0)==0){return}HEAP32[r2+8]=r1;__ZdlPv(r1);return}function __ZN9BarDecode15BarcodeIteratorILb1EED1Ev(r1){var r2,r3;r2=r1>>2;HEAP32[r2]=5263612;r3=HEAP32[r2+28];if((r3|0)!=0){HEAP32[r2+29]=r3;__ZdlPv(r3|0)}if((HEAP8[r1+92|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+25])}HEAP32[r2+1]=5263572;HEAP32[r2+3]=5263652;r1=HEAP32[r2+7];if((r1|0)==0){return}HEAP32[r2+8]=r1;__ZdlPv(r1);return}function __ZN7Utility8ArgumentIiED1Ev(r1){var r2,r3,r4;r2=r1>>2;r3=r1|0;HEAP32[r3>>2]=5263692;r4=HEAP32[r2+15];if((r4|0)!=0){HEAP32[r2+16]=r4;__ZdlPv(r4)}HEAP32[r3>>2]=5263788;if((HEAP8[r1+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+9])}if((HEAP8[r1+16|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+6])}if((HEAP8[r1+4|0]&1)<<24>>24==0){return}__ZdlPv(HEAP32[r2+3]);return}function __ZN7Utility8ArgumentIbED1Ev(r1){var r2,r3;r2=r1|0;HEAP32[r2>>2]=5263740;r3=HEAP32[r1+60>>2];if((r3|0)!=0){__ZdlPv(r3)}HEAP32[r2>>2]=5263788;if((HEAP8[r1+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+36>>2])}if((HEAP8[r1+16|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+24>>2])}if((HEAP8[r1+4|0]&1)<<24>>24==0){return}__ZdlPv(HEAP32[r1+12>>2]);return}function __ZNSt3__13mapIN9BarDecode16scanner_result_tEiN12_GLOBAL__N_14compENS_9allocatorINS_4pairIKS2_iEEEEEixERS7_(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43;r3=r2>>2;r4=0;r5=STACKTOP;STACKTOP=STACKTOP+4|0;r6=r5,r7=r6>>2;r8=r1+4|0;r9=r8|0;r10=HEAP32[r9>>2];do{if((r10|0)==0){r11=r8;HEAP32[r7]=r11;r12=r9,r13=r12>>2;r14=r11}else{r11=HEAP32[r3+1];r15=r2+8|0;r16=r15;r17=r15+1|0;r15=r2+16|0;r18=r2+12|0;r19=r10,r20=r19>>2;L579:while(1){r21=HEAP32[r20+5];L581:do{if((r11|0)>=(r21|0)){do{if((r11|0)<=(r21|0)){r22=HEAP8[r16];r23=r22&255;r24=(r23&1|0)==0;if(r24){r25=r23>>>1}else{r25=HEAP32[r18>>2]}r26=r19+24|0;r27=r26;r28=HEAP8[r26];r26=r28&255;r29=(r26&1|0)==0;if(r29){r30=r26>>>1}else{r30=HEAP32[r20+7]}r31=(r22&1)<<24>>24==0;if(r31){r32=r17}else{r32=HEAP32[r15>>2]}r22=(r28&1)<<24>>24==0;if(r22){r33=r27+1|0}else{r33=HEAP32[r20+8]}r28=_memcmp(r32,r33,r30>>>0<r25>>>0?r30:r25);if((r28|0)==0){if(r25>>>0<r30>>>0){break L581}}else{if((r28|0)<0){break L581}}if(r29){r34=r26>>>1}else{r34=HEAP32[r20+7]}if(r24){r35=r23>>>1}else{r35=HEAP32[r18>>2]}if(r22){r36=r27+1|0}else{r36=HEAP32[r20+8]}if(r31){r37=r17}else{r37=HEAP32[r15>>2]}r31=_memcmp(r36,r37,r35>>>0<r34>>>0?r35:r34);if((r31|0)==0){if(r34>>>0<r35>>>0){break}else{r4=657;break L579}}else{if((r31|0)<0){break}else{r4=657;break L579}}}}while(0);r38=r19+4|0;r31=HEAP32[r38>>2];if((r31|0)==0){r4=656;break L579}else{r19=r31,r20=r19>>2;continue L579}}}while(0);r39=r19|0;r21=HEAP32[r39>>2];if((r21|0)==0){r4=640;break}else{r19=r21,r20=r19>>2}}if(r4==640){HEAP32[r7]=r19;r12=r39,r13=r12>>2;r14=r19;break}else if(r4==656){HEAP32[r7]=r19;r12=r38,r13=r12>>2;r14=r19;break}else if(r4==657){HEAP32[r7]=r19;r12=r6,r13=r12>>2;r14=r19;break}}}while(0);r6=HEAP32[r13];if((r6|0)!=0){r40=r6;r41=r40+44|0;STACKTOP=r5;return r41}r6=__Znwj(48),r7=r6>>2;r4=r6;r38=r6+16|0;if((r38|0)!=0){HEAP8[r38]=HEAP8[r2|0]&1;HEAP32[r7+5]=HEAP32[r3+1];r38=r6+24|0,r39=r38>>2;r35=r2+8|0,r2=r35>>2;if((HEAP8[r35]&1)<<24>>24==0){HEAP32[r39]=HEAP32[r2];HEAP32[r39+1]=HEAP32[r2+1];HEAP32[r39+2]=HEAP32[r2+2]}else{r2=HEAP32[r3+4];r35=HEAP32[r3+3];if((r35|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r35>>>0<11){HEAP8[r38]=r35<<1&255;r42=r6+25|0}else{r38=r35+16&-16;r34=__Znwj(r38);HEAP32[r7+8]=r34;HEAP32[r39]=r38|1;HEAP32[r7+7]=r35;r42=r34}_memcpy(r42,r2,r35);HEAP8[r42+r35|0]=0}HEAP32[r7+9]=HEAP32[r3+5];HEAP32[r7+10]=HEAP32[r3+6]}r3=r6+44|0;if((r3|0)!=0){HEAP32[r3>>2]=0}r3=r6;HEAP32[r7]=0;HEAP32[r7+1]=0;HEAP32[r7+2]=r14;HEAP32[r13]=r3;r14=r1|0;r7=HEAP32[HEAP32[r14>>2]>>2];if((r7|0)==0){r43=r3}else{HEAP32[r14>>2]=r7;r43=HEAP32[r13]}__ZNSt3__127__tree_balance_after_insertIPNS_16__tree_node_baseIPvEEEEvT_S5_(HEAP32[r1+4>>2],r43);r43=r1+8|0;HEAP32[r43>>2]=HEAP32[r43>>2]+1|0;r40=r4;r41=r40+44|0;STACKTOP=r5;return r41}function __ZN9BarDecode15BarcodeIteratorILb1EE4nextEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66,r67,r68,r69,r70,r71,r72,r73,r74,r75,r76,r77,r78,r79,r80,r81,r82,r83,r84,r85,r86,r87,r88,r89,r90,r91,r92,r93,r94,r95,r96,r97,r98,r99,r100,r101,r102,r103,r104,r105,r106,r107,r108,r109,r110,r111,r112,r113,r114,r115,r116,r117,r118,r119,r120,r121,r122,r123,r124,r125,r126,r127,r128,r129,r130,r131,r132,r133,r134,r135,r136,r137,r138,r139,r140,r141;r2=r1>>2;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+252|0;r5=r4;r6=r4+28;r7=r4+56;r8=r4+60;r9=r4+88;r10=r4+92;r11=r4+120;r12=r4+124;r13=r4+152;r14=r4+156;r15=r4+184;r16=r4+188;r17=r4+216;r18=r4+220;r19=r4+248;r20=r1+20|0;r21=HEAP32[r20>>2]-1|0;r22=r1+28|0;r23=HEAP32[r22>>2]>>2;r24=r1+16|0;r25=HEAP32[r24>>2];__ZNK5Image4TypeEv(r25);r26=r25+32|0;r27=HEAP32[r26>>2];r28=r25+44|0;r29=r25+40|0;r30=r25+28|0;r31=HEAP32[r30>>2];do{if((r31|0)==0){r32=HEAP32[r25+24>>2];if((r32|0)==0){r33=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r32>>2]+32>>2]](r32,r25);r32=HEAP32[r30>>2];if((r32|0)==0){r33=0;break}HEAP8[r25|0]=0;r33=r32}else{r33=r31}}while(0);r31=HEAP32[r25+36>>2];r25=r33+Math.imul((Math.imul(Math.imul(HEAP32[r28>>2],HEAP32[r26>>2]),HEAP32[r29>>2])+7|0)/8&-1,r31)|0;r31=(HEAP32[((r21*44&-1)+36>>2)+r23]|0)!=(r25|0);r25=(HEAP32[((r21*44&-1)+4>>2)+r23]-1|0)>>>0>2;do{if(r25|r31^1){if(r25&r31){break}else{r3=690;break}}else{if((HEAP32[((r21*44&-1)+16>>2)+r23]|0)==(r27|0)){r3=690;break}else{break}}}while(0);if(r3==690){___assert_func(5252400,44,5258080,5252448)}r27=(r1+128|0)>>2;r23=(r1+124|0)>>2;r21=r1+132|0;r31=(r21|0)>>2;r25=(r1+136|0)>>2;r29=r1+4|0;r26=r1+44|0;r28=r1+112|0;r33=r28|0;r30=(r1+132|0)>>2;r32=r1+116|0;r34=r5|0;r35=(r5+4|0)>>2;r36=r5+8|0;r37=r36;r38=r36+1|0;r39=(r5+20|0)>>2;r40=(r5+24|0)>>2;r41=(r1+80|0)>>2;r42=(r5+16|0)>>2;r5=(r1+76|0)>>2;r43=r19|0;r44=r18|0;r45=r18+4|0;r46=r18+8|0;r47=r18+20|0;r48=r18+24|0;r49=r46;r50=r18+16|0;r51=r17|0;r52=r16|0;r53=r16+4|0;r54=r16+8|0;r55=r16+20|0;r56=r16+24|0;r57=r54;r58=r16+16|0;r59=r15|0;r60=r14|0;r61=r14+4|0;r62=r14+8|0;r63=r14+20|0;r64=r14+24|0;r65=r62;r66=r14+16|0;r67=r13|0;r68=r12|0;r69=r12+4|0;r70=r12+8|0;r71=r12+20|0;r72=r12+24|0;r73=r70;r74=r12+16|0;r75=r11|0;r76=r10|0;r77=r10+4|0;r78=r10+8|0;r79=r10+20|0;r80=r10+24|0;r81=r78;r82=r10+16|0;r83=r9|0;r84=r8|0;r85=r8+4|0;r86=r8+8|0;r87=r8+20|0;r88=r8+24|0;r89=r86;r90=r8+16|0;r91=r7|0;r92=r6|0;r93=r6+4|0;r94=r6+8|0;r95=r6+20|0;r96=r6+24|0;r97=r94;r98=r6+16|0;L668:while(1){r99=HEAP32[r20>>2]-1|0;r100=HEAP32[r22>>2]>>2;r101=HEAP32[r24>>2];__ZNK5Image4TypeEv(r101);r102=r101+32|0;r103=HEAP32[r102>>2];r104=r101+44|0;r105=r101+40|0;r106=r101+28|0;r107=HEAP32[r106>>2];do{if((r107|0)==0){r108=HEAP32[r101+24>>2];if((r108|0)==0){r109=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r108>>2]+32>>2]](r108,r101);r108=HEAP32[r106>>2];if((r108|0)==0){r109=0;break}HEAP8[r101|0]=0;r109=r108}else{r109=r107}}while(0);r107=HEAP32[r101+36>>2];r106=r109+Math.imul((Math.imul(Math.imul(HEAP32[r104>>2],HEAP32[r102>>2]),HEAP32[r105>>2])+7|0)/8&-1,r107)|0;r107=(HEAP32[((r99*44&-1)+36>>2)+r100]|0)!=(r106|0);r106=(HEAP32[((r99*44&-1)+4>>2)+r100]-1|0)>>>0>2;if(r106|r107^1){if(!(r106&r107)){r3=828;break}}else{if((HEAP32[((r99*44&-1)+16>>2)+r100]|0)==(r103|0)){r3=827;break}}r107=HEAP32[r31];r106=HEAP32[r25];if((r107|0)==(r106|0)){HEAP32[r27]=0;HEAP32[r23]=HEAP32[r26>>2];__ZN9BarDecode9TokenizerILb1EE9next_lineERNSt3__16vectorINS2_4pairIbjEENS2_9allocatorIS5_EEEE(r29,r28);r108=HEAP32[r33>>2];HEAP32[r30]=r108;r110=HEAP32[r32>>2];HEAP32[r25]=r110;r111=r108;r112=r110}else{r111=r107;r112=r106}r106=r111+8|0;if((r106|0)==(r112|0)){HEAP32[r31]=r112;continue}r107=HEAP32[r111+4>>2];r110=HEAP8[r106|0]&1;r106=HEAP32[r111+12>>2];r108=(HEAP8[r111|0]&1)<<24>>24==0;L685:do{if(r107>>>0<7|r110<<24>>24!=0&r108^1){r113=r107;r114=r110;r115=r106;r116=r108;r117=r111;while(1){r118=r117+8|0;HEAP32[r31]=r118;if((r117+16|0)==(r112|0)){r119=r113;r120=r115;r121=r116;r122=r118;break L685}HEAP32[r27]=HEAP32[r27]+r113|0;r123=HEAP8[r117+16|0]&1;r124=HEAP32[r117+20>>2];r125=r114<<24>>24==0;if(r115>>>0<7|r123<<24>>24!=0&r125^1){r113=r115;r114=r123;r115=r124;r116=r125;r117=r118}else{r119=r115;r120=r124;r121=r125;r122=r118;break L685}}}else{r119=r107;r120=r106;r121=r108;r122=r111}}while(0);if((r122+8|0)==(r112|0)){HEAP32[r31]=r112;continue}if(r121){r126=r112;r127=r122,r128=r127>>2}else{___assert_func(5252400,72,5258080,5252256);r126=HEAP32[r25];r127=HEAP32[r31],r128=r127>>2}if((r126-r127|0)<192){HEAP32[r31]=r126;continue}if((r120*3&-1)>>>0>r119>>>0){HEAP32[r27]=HEAP32[r27]+r119|0;HEAP32[r31]=r127+8|0;continue}HEAP8[r34]=0;HEAP32[r35]=0;HEAP8[r37]=0;HEAP8[r38]=0;HEAP32[r39]=0;HEAP32[r40]=0;r108=HEAP32[r41];do{if((r108&1|0)==0){r129=r108}else{if((HEAP32[r5]&64|0)==0){r129=r108;break}HEAP32[r91>>2]=r126;__ZNK9BarDecode8code39_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r6,5272764,r21,r7,HEAP32[r128+1]+HEAP32[r23]|0,HEAP32[r27],r119);HEAP8[r34]=HEAP8[r92]&1;HEAP32[r35]=HEAP32[r93>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r94);HEAP32[r39]=HEAP32[r95>>2];HEAP32[r40]=HEAP32[r96>>2];r106=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r97]&1)<<24>>24!=0){__ZdlPv(HEAP32[r98>>2])}if(!r106){r3=722;break L668}r129=HEAP32[r41]}}while(0);do{if((r129&4|0)==0){r130=r129}else{if((HEAP32[r5]&64|0)==0){r130=r129;break}HEAP32[r30]=r127;HEAP32[r83>>2]=HEAP32[r25];__ZNK9BarDecode8code39_t12reverse_scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r8,5272764,r21,r9,HEAP32[r128+1]+HEAP32[r23]|0,HEAP32[r27],r119);HEAP8[r34]=HEAP8[r84]&1;HEAP32[r35]=HEAP32[r85>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r86);HEAP32[r39]=HEAP32[r87>>2];HEAP32[r40]=HEAP32[r88>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r89]&1)<<24>>24!=0){__ZdlPv(HEAP32[r90>>2])}if(!r108){r3=740;break L668}r130=HEAP32[r41]}}while(0);do{if((r130&1|0)==0){r131=r130}else{if((HEAP32[r5]&512|0)==0){r131=r130;break}HEAP32[r30]=r127;HEAP32[r75>>2]=HEAP32[r25];__ZNK9BarDecode9code25i_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r10,5271008,r21,r11,HEAP32[r128+1]+HEAP32[r23]|0,HEAP32[r27],r119);HEAP8[r34]=HEAP8[r76]&1;HEAP32[r35]=HEAP32[r77>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r78);HEAP32[r39]=HEAP32[r79>>2];HEAP32[r40]=HEAP32[r80>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r81]&1)<<24>>24!=0){__ZdlPv(HEAP32[r82>>2])}if(!r108){r3=755;break L668}r131=HEAP32[r41]}}while(0);do{if((r131&4|0)==0){r132=r131}else{if((HEAP32[r5]&512|0)==0){r132=r131;break}HEAP32[r30]=r127;HEAP32[r67>>2]=HEAP32[r25];__ZNK9BarDecode9code25i_t12reverse_scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r12,5271008,r21,r13,HEAP32[r128+1]+HEAP32[r23]|0,HEAP32[r27],r119);HEAP8[r34]=HEAP8[r68]&1;HEAP32[r35]=HEAP32[r69>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r70);HEAP32[r39]=HEAP32[r71>>2];HEAP32[r40]=HEAP32[r72>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r73]&1)<<24>>24!=0){__ZdlPv(HEAP32[r74>>2])}if(!r108){r3=770;break L668}r132=HEAP32[r41]}}while(0);do{if((r132&1|0)==0){r133=r132}else{if((HEAP32[r5]&16|0)==0){r133=r132;break}HEAP32[r30]=r127;HEAP32[r59>>2]=HEAP32[r25];__ZNK9BarDecode9code128_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r14,5271580,r21,r15,HEAP32[r128+1]+HEAP32[r23]|0,HEAP32[r27],r119);HEAP8[r34]=HEAP8[r60]&1;HEAP32[r35]=HEAP32[r61>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r62);HEAP32[r39]=HEAP32[r63>>2];HEAP32[r40]=HEAP32[r64>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r65]&1)<<24>>24!=0){__ZdlPv(HEAP32[r66>>2])}if(!r108){r3=785;break L668}r133=HEAP32[r41]}}while(0);do{if((r133&4|0)==0){r134=r133}else{if((HEAP32[r5]&16|0)==0){r134=r133;break}HEAP32[r30]=r127;HEAP32[r51>>2]=HEAP32[r25];__ZNK9BarDecode9code128_t12reverse_scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r16,5271580,r21,r17,HEAP32[r128+1]+HEAP32[r23]|0,HEAP32[r27],r119);HEAP8[r34]=HEAP8[r52]&1;HEAP32[r35]=HEAP32[r53>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r54);HEAP32[r39]=HEAP32[r55>>2];HEAP32[r40]=HEAP32[r56>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r57]&1)<<24>>24!=0){__ZdlPv(HEAP32[r58>>2])}if(!r108){r3=800;break L668}r134=HEAP32[r41]}}while(0);do{if((r134&5|0)!=0){if((HEAP32[r5]&7|0)==0){break}HEAP32[r30]=r127;HEAP32[r43>>2]=HEAP32[r25];__ZN9BarDecode5ean_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iijNS_12directions_tE(r18,5270756,r21,r19,HEAP32[r128+1]+HEAP32[r23]|0,HEAP32[r27],r119,r134);HEAP8[r34]=HEAP8[r44]&1;HEAP32[r35]=HEAP32[r45>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r46);HEAP32[r39]=HEAP32[r47>>2];HEAP32[r40]=HEAP32[r48>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r49]&1)<<24>>24!=0){__ZdlPv(HEAP32[r50>>2])}if(!r108){r3=814;break L668}}}while(0);HEAP32[r27]=HEAP32[r27]+HEAP32[r128+1]|0;HEAP32[r30]=r127+8|0;if((HEAP8[r37]&1)<<24>>24==0){continue}__ZdlPv(HEAP32[r42])}if(r3==827){STACKTOP=r4;return}else if(r3==828){STACKTOP=r4;return}else if(r3==740){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r30=HEAP32[r31];L777:do{if((r127|0)==(r30|0)){r135=0}else{r128=0;r50=r127;while(1){r49=r50+8|0;r48=HEAP32[r50+4>>2]+r128|0;if((r49|0)==(r30|0)){r135=r48;break L777}else{r128=r48;r50=r49}}}}while(0);HEAP32[r27]=HEAP32[r27]+r135|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==770){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r135=HEAP32[r31];L787:do{if((r127|0)==(r135|0)){r136=0}else{r30=0;r50=r127;while(1){r128=r50+8|0;r49=HEAP32[r50+4>>2]+r30|0;if((r128|0)==(r135|0)){r136=r49;break L787}else{r30=r49;r50=r128}}}}while(0);HEAP32[r27]=HEAP32[r27]+r136|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==755){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r136=HEAP32[r31];L797:do{if((r127|0)==(r136|0)){r137=0}else{r135=0;r50=r127;while(1){r30=r50+8|0;r128=HEAP32[r50+4>>2]+r135|0;if((r30|0)==(r136|0)){r137=r128;break L797}else{r135=r128;r50=r30}}}}while(0);HEAP32[r27]=HEAP32[r27]+r137|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==785){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r137=HEAP32[r31];L807:do{if((r127|0)==(r137|0)){r138=0}else{r136=0;r50=r127;while(1){r135=r50+8|0;r30=HEAP32[r50+4>>2]+r136|0;if((r135|0)==(r137|0)){r138=r30;break L807}else{r136=r30;r50=r135}}}}while(0);HEAP32[r27]=HEAP32[r27]+r138|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==800){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r138=HEAP32[r31];L817:do{if((r127|0)==(r138|0)){r139=0}else{r137=0;r50=r127;while(1){r136=r50+8|0;r135=HEAP32[r50+4>>2]+r137|0;if((r136|0)==(r138|0)){r139=r135;break L817}else{r137=r135;r50=r136}}}}while(0);HEAP32[r27]=HEAP32[r27]+r139|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==814){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r139=HEAP32[r31];L827:do{if((r127|0)==(r139|0)){r140=0}else{r138=0;r50=r127;while(1){r137=r50+8|0;r136=HEAP32[r50+4>>2]+r138|0;if((r137|0)==(r139|0)){r140=r136;break L827}else{r138=r136;r50=r137}}}}while(0);HEAP32[r27]=HEAP32[r27]+r140|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==722){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r40=HEAP32[r31];L837:do{if((r127|0)==(r40|0)){r141=0}else{r31=0;r2=r127;while(1){r39=r2+8|0;r36=HEAP32[r2+4>>2]+r31|0;if((r39|0)==(r40|0)){r141=r36;break L837}else{r31=r36;r2=r39}}}}while(0);HEAP32[r27]=HEAP32[r27]+r141|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}}function __ZN9BarDecode9TokenizerILb1EE9next_lineERNSt3__16vectorINS2_4pairIbjEENS2_9allocatorIS5_EEEE(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66,r67,r68,r69,r70,r71,r72,r73,r74;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+20|0;r5=r4;r6=(r1+16|0)>>2;r7=HEAP32[r6]-1|0;r8=(r1+24|0)>>2;r9=HEAP32[r8]>>2;r10=(r1+12|0)>>2;r11=HEAP32[r10];__ZNK5Image4TypeEv(r11);r12=r11+32|0;r13=HEAP32[r12>>2];r14=r11+44|0;r15=r11+40|0;r16=r11+28|0;r17=HEAP32[r16>>2];do{if((r17|0)==0){r18=HEAP32[r11+24>>2];if((r18|0)==0){r19=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r18>>2]+32>>2]](r18,r11);r18=HEAP32[r16>>2];if((r18|0)==0){r19=0;break}HEAP8[r11|0]=0;r19=r18}else{r19=r17}}while(0);r17=HEAP32[r11+36>>2];r11=r19+Math.imul((Math.imul(Math.imul(HEAP32[r14>>2],HEAP32[r12>>2]),HEAP32[r15>>2])+7|0)/8&-1,r17)|0;r17=(HEAP32[((r7*44&-1)+36>>2)+r9]|0)!=(r11|0);r11=(HEAP32[((r7*44&-1)+4>>2)+r9]-1|0)>>>0>2;do{if(r11|r17^1){if(r11&r17){break}else{r3=850;break}}else{if((HEAP32[((r7*44&-1)+16>>2)+r9]|0)==(r13|0)){r3=850;break}else{break}}}while(0);if(r3==850){___assert_func(5251460,55,5257640,5252448)}r13=r1+8|0;if((HEAP32[r1+44>>2]|0)!=0){___assert_func(5251460,56,5257640,5251348)}r9=(r2|0)>>2;r7=(r2+4|0)>>2;HEAP32[r7]=HEAP32[r9];r17=HEAP32[r1+68>>2];r11=r1+57|0;HEAP8[r11]=0;r15=(r1+36|0)>>2;HEAP32[r15]=r17;r12=HEAP32[r6];if((r12|0)>0){r14=0;r19=0;while(1){r20=r14+(__ZNK5Image14const_iterator4getLEv(HEAP32[r8]+(r19*44&-1)|0)&65535|0);r16=r19+1|0;r21=HEAP32[r6];if((r16|0)<(r21|0)){r14=r20;r19=r16}else{break}}r22=r20;r23=r21;r24=HEAP32[r15]}else{r22=0;r23=r12;r24=r17}r17=r22/(r23|0);r23=r1+48|0;HEAPF64[tempDoublePtr>>3]=r17,HEAP32[r23>>2]=HEAP32[tempDoublePtr>>2],HEAP32[r23+4>>2]=HEAP32[tempDoublePtr+4>>2];r23=r17<(r24|0)&1;HEAP8[r1+56|0]=r23;HEAP8[r11]=1;if((HEAP32[HEAP32[r10]+36>>2]|0)<=0){STACKTOP=r4;return}r24=r1+48|0;r17=(r1+48|0)>>2;r22=r1+56|0;r12=r1+60|0;r1=r2+8|0;r21=r1|0;r20=r1;r1=(r5+12|0)>>2;r19=r5+16|0;r14=(r5|0)>>2;r16=(r5+8|0)>>2;r18=(r5+4|0)>>2;r25=r2+8|0;r2=r23;r23=1;r26=0;r27=(HEAP32[tempDoublePtr>>2]=HEAP32[r24>>2],HEAP32[tempDoublePtr+4>>2]=HEAP32[r24+4>>2],HEAPF64[tempDoublePtr>>3]);r24=0;r28=1;L868:while(1){if((r28&1)<<24>>24==0){r29=HEAP32[r6];L873:do{if((r29|0)>0){r30=0;r31=0;while(1){r32=r30+(__ZNK5Image14const_iterator4getLEv(HEAP32[r8]+(r31*44&-1)|0)&65535|0);r33=r31+1|0;r34=HEAP32[r6];if((r33|0)<(r34|0)){r30=r32;r31=r33}else{r35=r32;r36=r34;break L873}}}else{r35=0;r36=r29}}while(0);r29=r35/(r36|0);HEAPF64[tempDoublePtr>>3]=r29,HEAP32[r17]=HEAP32[tempDoublePtr>>2],HEAP32[r17+1]=HEAP32[tempDoublePtr+4>>2];HEAP8[r22]=r29<(HEAP32[r15]|0)&1;HEAP8[r11]=1;r37=r29;r38=1}else{r37=(HEAP32[tempDoublePtr>>2]=HEAP32[r17],HEAP32[tempDoublePtr+4>>2]=HEAP32[r17+1],HEAPF64[tempDoublePtr>>3]);r38=r28}r29=r26+r37;r31=r29/r23;r30=(r2&1)<<24>>24!=0;r34=HEAP32[r15];r32=r34|0;L878:do{if(r30){r33=r37<r32;do{if(r33){r39=r31+30;if(r37>r39){r40=_round(r39<80?80:r39);HEAP8[r11]=0;HEAP32[r15]=r40;r41=r2;r42=r40;r3=882;break L878}if(!r30){r3=883;break L878}if(!(r33&r27!=0)){break}r40=r27+40;if(r37<=r40){break}r39=_round(r40<80?80:r40);HEAP8[r11]=0;HEAP32[r15]=r39;r41=r2;r42=r39;r3=882;break L878}}while(0);if(!(r30&r23>20&r33)){r3=883;break}r39=r31-30;if(r37<r39){r40=_round(r39);HEAP8[r11]=0;HEAP32[r15]=r40;r41=0;r42=r40;r3=882;break}r40=r27-40;if(r37>=r40){r3=883;break}r39=_round(r40);HEAP8[r11]=0;HEAP32[r15]=r39;r41=0;r42=r39;r3=882;break}else{r39=r37>r32;if(!r39){r3=883;break}r40=r31-30;if(r37<r40){r43=_round(r40>220?220:r40);HEAP8[r11]=0;HEAP32[r15]=r43;r41=r2;r42=r43;r3=882;break}if(!(r39&r27!=0)){r3=883;break}r39=r27-40;if(r37>=r39){r3=883;break}r43=_round(r39>220?220:r39);HEAP8[r11]=0;HEAP32[r15]=r43;r41=r2;r42=r43;r3=882;break}}while(0);do{if(r3==882){r3=0;r32=r41&1;r44=r42;r45=r41;r46=r32;r47=r32<<24>>24==0;r3=884;break}else if(r3==883){r3=0;r32=r2&1;r30=r32<<24>>24==0;if((r38&1)<<24>>24==0){r44=r34;r45=r2;r46=r32;r47=r30;r3=884;break}r48=HEAP8[r22];r49=r2;r50=r32;r51=r30;break}}while(0);if(r3==884){r3=0;r34=HEAP32[r6];if((r34|0)>0){r30=0;r32=0;while(1){r52=r30+(__ZNK5Image14const_iterator4getLEv(HEAP32[r8]+(r32*44&-1)|0)&65535|0);r43=r32+1|0;r53=HEAP32[r6];if((r43|0)<(r53|0)){r30=r52;r32=r43}else{break}}r54=r52;r55=r53;r56=HEAP32[r15]}else{r54=0;r55=r34;r56=r44}r32=r54/(r55|0);HEAPF64[tempDoublePtr>>3]=r32,HEAP32[r17]=HEAP32[tempDoublePtr>>2],HEAP32[r17+1]=HEAP32[tempDoublePtr+4>>2];r30=r32<(r56|0)&1;HEAP8[r22]=r30;HEAP8[r11]=1;r48=r30;r49=r45;r50=r46;r51=r47}do{if(r50<<24>>24==(r48&1)<<24>>24){if((r24|0)==(HEAP32[HEAP32[r10]+36>>2]-1|0)){r3=891;break}else{r57=r29;r58=r23;r59=r49;break}}else{r3=891}}while(0);if(r3==891){r3=0;r29=r37/255;if(r51){r60=r29}else{r60=1-r29}r29=_round(r23-(HEAP32[tempDoublePtr>>2]=HEAP32[r12>>2],HEAP32[tempDoublePtr+4>>2]=HEAP32[r12+4>>2],HEAPF64[tempDoublePtr>>3])+r60);r34=HEAP32[r7];r30=HEAP32[r21>>2];do{if(r34>>>0<r30>>>0){if((r34|0)==0){r61=0}else{HEAP8[r34|0]=r50;HEAP32[r34+4>>2]=r29;r61=HEAP32[r7]}HEAP32[r7]=r61+8|0}else{r32=HEAP32[r9];r43=r34-r32|0;r39=r43>>3;r40=r39+1|0;if(r40>>>0>536870911){r3=898;break L868}r62=r30-r32|0;do{if(r62>>3>>>0>268435454){HEAP32[r1]=0;HEAP32[r19>>2]=r20;r63=536870911;r3=902;break}else{r32=r62>>2;r64=r32>>>0<r40>>>0?r40:r32;HEAP32[r1]=0;HEAP32[r19>>2]=r20;if((r64|0)==0){r65=0;r66=0;break}else{r63=r64;r3=902;break}}}while(0);if(r3==902){r3=0;r65=__Znwj(r63<<3);r66=r63}HEAP32[r14]=r65;r40=(r39<<3)+r65|0;HEAP32[r16]=r40;HEAP32[r18]=r40;HEAP32[r1]=(r66<<3)+r65|0;do{if((r39|0)==(r66|0)){if((r43|0)>0){r62=(r43+8>>3|0)/-2&-1;r33=(r39+r62<<3)+r65|0;HEAP32[r16]=r33;HEAP32[r18]=(r39+r62<<3)+r65|0;r67=r33;break}r33=r43>>2;r62=(r33|0)==0?1:r33;r33=__Znwj(r62<<3);r64=(r62>>>2<<3)+r33|0;HEAP32[r14]=r33;HEAP32[r18]=r64;HEAP32[r16]=r64;HEAP32[r1]=(r62<<3)+r33|0;if((r65|0)==0){r67=r64;break}__ZdlPv(r65|0);r67=r64}else{r67=r40}}while(0);if((r67|0)==0){r68=0}else{HEAP8[r67|0]=r50;HEAP32[r67+4>>2]=r29;r68=HEAP32[r16]}r40=r68+8|0;HEAP32[r16]=r40;r43=HEAP32[r7];r39=HEAP32[r9];if(r39>>>0<r43>>>0){r64=r43;while(1){r43=r64-8|0;__ZNSt3__114__split_bufferINS_4pairIbjEERNS_9allocatorIS2_EEE10push_frontERKS2_(r5,r43);r69=HEAP32[r9];if(r69>>>0<r43>>>0){r64=r43}else{break}}r70=r69;r71=HEAP32[r16]}else{r70=r39;r71=r40}HEAP32[r9]=HEAP32[r18];HEAP32[r18]=r70;HEAP32[r7]=r71;r64=HEAP32[r25>>2];HEAP32[r25>>2]=HEAP32[r1];HEAP32[r1]=r64;HEAP32[r14]=r70;HEAP32[r16]=r70;if((r70|0)==0){break}__ZdlPv(r70|0)}}while(0);if((HEAP8[r11]&1)<<24>>24==0){r29=HEAP32[r6];L954:do{if((r29|0)>0){r30=0;r34=0;while(1){r64=r30+(__ZNK5Image14const_iterator4getLEv(HEAP32[r8]+(r34*44&-1)|0)&65535|0);r43=r34+1|0;r33=HEAP32[r6];if((r43|0)<(r33|0)){r30=r64;r34=r43}else{r72=r64;r73=r33;break L954}}}else{r72=0;r73=r29}}while(0);r29=r72/(r73|0);HEAPF64[tempDoublePtr>>3]=r29,HEAP32[r17]=HEAP32[tempDoublePtr>>2],HEAP32[r17+1]=HEAP32[tempDoublePtr+4>>2];r34=r29<(HEAP32[r15]|0)&1;HEAP8[r22]=r34;HEAP8[r11]=1;r74=r34}else{r74=HEAP8[r22]}r57=0;r58=0;r59=r74&1}r34=r24+1|0;__ZN9BarDecode13PixelIteratorILb1EEppEv(r13);if((r34|0)>=(HEAP32[HEAP32[r10]+36>>2]|0)){r3=932;break}r2=r59;r23=r58+1;r26=r57;r27=r31;r24=r34;r28=HEAP8[r11]}if(r3==898){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}else if(r3==932){STACKTOP=r4;return}}function __ZNK9BarDecode8code39_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41;r8=r1>>2;r9=0;r10=STACKTOP;STACKTOP=STACKTOP+40|0;r11=r4;r4=STACKTOP;STACKTOP=STACKTOP+4|0;HEAP32[r4>>2]=HEAP32[r11>>2];r11=r10;r12=r10+24;r13=r10+36;r14=(r11|0)>>2;HEAP32[r14]=0;r15=(r11+4|0)>>2;HEAP32[r15]=0;r16=r11+8|0;HEAP32[r16>>2]=0;r17=__Znwj(72);r18=r17;HEAP32[r15]=r18;HEAP32[r14]=r18;HEAP32[r16>>2]=r17+72|0;if((r17|0)==0){r19=0}else{HEAP8[r17]=0;HEAP32[r17+4>>2]=0;r19=r18}r18=r19+8|0;HEAP32[r15]=r18;if((r18|0)==0){r20=0}else{HEAP8[r18|0]=0;HEAP32[r19+12>>2]=0;r20=HEAP32[r15]}r19=r20+8|0;HEAP32[r15]=r19;if((r19|0)==0){r21=0}else{HEAP8[r19|0]=0;HEAP32[r20+12>>2]=0;r21=HEAP32[r15]}r20=r21+8|0;HEAP32[r15]=r20;if((r20|0)==0){r22=0}else{HEAP8[r20|0]=0;HEAP32[r21+12>>2]=0;r22=HEAP32[r15]}r21=r22+8|0;HEAP32[r15]=r21;if((r21|0)==0){r23=0}else{HEAP8[r21|0]=0;HEAP32[r22+12>>2]=0;r23=HEAP32[r15]}r22=r23+8|0;HEAP32[r15]=r22;if((r22|0)==0){r24=0}else{HEAP8[r22|0]=0;HEAP32[r23+12>>2]=0;r24=HEAP32[r15]}r23=r24+8|0;HEAP32[r15]=r23;if((r23|0)==0){r25=0}else{HEAP8[r23|0]=0;HEAP32[r24+12>>2]=0;r25=HEAP32[r15]}r24=r25+8|0;HEAP32[r15]=r24;if((r24|0)==0){r26=0}else{HEAP8[r24|0]=0;HEAP32[r25+12>>2]=0;r26=HEAP32[r15]}r25=r26+8|0;HEAP32[r15]=r25;if((r25|0)==0){r27=0}else{HEAP8[r25|0]=0;HEAP32[r26+12>>2]=0;r27=HEAP32[r15]}HEAP32[r15]=r27+8|0;HEAP32[r11+12>>2]=0;HEAP32[r11+16>>2]=0;r27=(r11+20|0)>>2;HEAP32[r27]=0;r26=HEAP32[r4>>2];L994:do{if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r26,r11,2)|0)==2){r4=HEAP32[r14];r25=HEAP32[r4+4>>2]>>>0;r24=HEAP32[r4+12>>2]>>>0;if(r25>r24*.8){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}if(r24>r25*3.5){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r25=r1+8|0;HEAP8[r25]=0;HEAP8[r25+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r26,r11,7)|0)!=7){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r25=r1+8|0;HEAP8[r25]=0;HEAP8[r25+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}r25=HEAP32[r14];if((HEAP32[r15]-r25|0)==72){r28=r25}else{___assert_func(5251548,220,5257456,5251512);r28=HEAP32[r14]}do{if((HEAP8[r28|0]&1)<<24>>24!=0){if((HEAP8[r28+64|0]&1)<<24>>24==0){break}r25=HEAP32[r27]>>>0;if(r7>>>0<r25*.4){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r24=r1+8|0;HEAP8[r24]=0;HEAP8[r24+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break L994}r24=r25/30;r4=r25*.125;r23=r25/7.9;if((HEAP32[r15]-r28|0)==72){r29=r28}else{___assert_func(5251548,181,5257372,5251512);r29=HEAP32[r14]}r22=0;r21=0;while(1){r20=r22<<1;r19=HEAP32[r29+(r21<<3)+4>>2]>>>0;if(r23>r19|r19>r25){if(r24>r19|r19>r4){break}else{r30=r20}}else{r30=r20|1}r20=r21+1|0;if(r20>>>0<9){r22=r30;r21=r20}else{r9=962;break}}do{if(r9==962){if(r30<<16>>16==0){break}if(HEAP8[r2+(r30&65535)|0]<<24>>24!=-2){break}r21=r12,r22=r21>>2;HEAP8[r21]=0;r4=r12+1|0;HEAP8[r4]=0;r24=r13|0;r25=(r12+8|0)>>2;r23=r12|0;r20=(r12+4|0)>>2;L1031:while(1){r19=HEAP32[r27];HEAP32[r24>>2]=r26;if(!__ZNK9BarDecode8code39_t8expect_nINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEEbRT_S9_j(0,r3,r13,r19)){r9=968;break}if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r26,r11,9)|0)!=9){r9=975;break}if((HEAP32[r15]-HEAP32[r14]|0)!=72){___assert_func(5251548,220,5257456,5251512)}if((r19|0)!=0){if(Math.abs(HEAP32[r27]-r19|0)>=(r19>>>0)*.5){r9=982;break}}r19=HEAP32[r14];if((HEAP8[r19|0]&1)<<24>>24==0){r9=982;break}if((HEAP8[r19+64|0]&1)<<24>>24==0){r9=982;break}r18=HEAP32[r27]>>>0;r17=r18/30;r16=r18*.125;r31=r18/7.9;if((HEAP32[r15]-r19|0)==72){r32=r19}else{___assert_func(5251548,181,5257372,5251512);r32=HEAP32[r14]}r19=0;r33=0;while(1){r34=r19<<1;r35=HEAP32[r32+(r33<<3)+4>>2]>>>0;if(r31>r35|r35>r18){if(r17>r35|r35>r16){r9=992;break L1031}else{r36=r34}}else{r36=r34|1}r34=r33+1|0;if(r34>>>0<9){r19=r36;r33=r34}else{break}}if(r36<<16>>16==0){r9=992;break}r33=HEAP8[r2+(r36&65535)|0];r19=r33&255;if((r19|0)==255){r9=994;break}else if((r19|0)==254){r9=1011;break}r19=HEAP8[r21];if((r19&1)<<24>>24==0){r37=10;r38=r19}else{r19=HEAP32[r23>>2];r37=(r19&-2)-1|0;r38=r19&255}r19=r38&255;r16=(r19&1|0)==0?r19>>>1:HEAP32[r20];if((r16|0)==(r37|0)){if((r37|0)==-3){r9=999;break}r19=(r38&1)<<24>>24==0?r4:HEAP32[r25];do{if(r37>>>0<2147483631){r17=r37+1|0;r18=r37<<1;r31=r17>>>0<r18>>>0?r18:r17;if(r31>>>0<11){r39=11;break}r39=r31+16&-16}else{r39=-2}}while(0);r31=__Znwj(r39);_memcpy(r31,r19,r37);if((r37|0)!=10){__ZdlPv(r19)}HEAP32[r25]=r31;r31=r39|1;HEAP32[r23>>2]=r31;r40=r31&255}else{r40=r38}r31=(r40&1)<<24>>24==0?r4:HEAP32[r25];HEAP8[r31+r16|0]=r33;r17=r16+1|0;HEAP8[r31+r17|0]=0;if((HEAP8[r21]&1)<<24>>24==0){HEAP8[r21]=r17<<1&255;continue}else{HEAP32[r20]=r17;continue}}if(r9==968){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==975){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==982){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==992){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==994){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==999){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r9==1011){r4=HEAP8[r21];HEAP8[r1|0]=1;HEAP32[r8+1]=64;r23=r1+8|0;if((r4&1)<<24>>24==0){r4=r23>>2;HEAP32[r4]=HEAP32[r22];HEAP32[r4+1]=HEAP32[r22+1];HEAP32[r4+2]=HEAP32[r22+2]}else{r4=HEAP32[r25];r24=HEAP32[r20];if((r24|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r24>>>0<11){HEAP8[r23]=r24<<1&255;r41=r23+1|0}else{r17=r24+16&-16;r31=__Znwj(r17);HEAP32[r8+4]=r31;HEAP32[r23>>2]=r17|1;HEAP32[r8+3]=r24;r41=r31}_memcpy(r41,r4,r24);HEAP8[r41+r24|0]=0}HEAP32[r8+5]=r5;HEAP32[r8+6]=r6}if((HEAP8[r21]&1)<<24>>24==0){break L994}__ZdlPv(HEAP32[r25]);break L994}}while(0);HEAP8[r1|0]=0;HEAP32[r8+1]=0;r24=r1+8|0;HEAP8[r24]=0;HEAP8[r24+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break L994}}while(0);HEAP8[r1|0]=0;HEAP32[r8+1]=0;r24=r1+8|0;HEAP8[r24]=0;HEAP8[r24+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else{HEAP8[r1|0]=0;HEAP32[r8+1]=0;r24=r1+8|0;HEAP8[r24]=0;HEAP8[r24+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}}while(0);r8=HEAP32[r14];if((r8|0)==0){STACKTOP=r10;return}HEAP32[r15]=r8;__ZdlPv(r8|0);STACKTOP=r10;return}function __ZNK9BarDecode8code39_t12reverse_scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45;r8=r1>>2;r9=0;r10=STACKTOP;STACKTOP=STACKTOP+52|0;r11=r4;r4=STACKTOP;STACKTOP=STACKTOP+4|0;HEAP32[r4>>2]=HEAP32[r11>>2];r11=r10;r12=r10+24;r13=r10+36;r14=r10+40,r15=r14>>2;r16=(r11|0)>>2;HEAP32[r16]=0;r17=(r11+4|0)>>2;HEAP32[r17]=0;r18=r11+8|0;HEAP32[r18>>2]=0;r19=__Znwj(72);r20=r19;HEAP32[r17]=r20;HEAP32[r16]=r20;HEAP32[r18>>2]=r19+72|0;if((r19|0)==0){r21=0}else{HEAP8[r19]=0;HEAP32[r19+4>>2]=0;r21=r20}r20=r21+8|0;HEAP32[r17]=r20;if((r20|0)==0){r22=0}else{HEAP8[r20|0]=0;HEAP32[r21+12>>2]=0;r22=HEAP32[r17]}r21=r22+8|0;HEAP32[r17]=r21;if((r21|0)==0){r23=0}else{HEAP8[r21|0]=0;HEAP32[r22+12>>2]=0;r23=HEAP32[r17]}r22=r23+8|0;HEAP32[r17]=r22;if((r22|0)==0){r24=0}else{HEAP8[r22|0]=0;HEAP32[r23+12>>2]=0;r24=HEAP32[r17]}r23=r24+8|0;HEAP32[r17]=r23;if((r23|0)==0){r25=0}else{HEAP8[r23|0]=0;HEAP32[r24+12>>2]=0;r25=HEAP32[r17]}r24=r25+8|0;HEAP32[r17]=r24;if((r24|0)==0){r26=0}else{HEAP8[r24|0]=0;HEAP32[r25+12>>2]=0;r26=HEAP32[r17]}r25=r26+8|0;HEAP32[r17]=r25;if((r25|0)==0){r27=0}else{HEAP8[r25|0]=0;HEAP32[r26+12>>2]=0;r27=HEAP32[r17]}r26=r27+8|0;HEAP32[r17]=r26;if((r26|0)==0){r28=0}else{HEAP8[r26|0]=0;HEAP32[r27+12>>2]=0;r28=HEAP32[r17]}r27=r28+8|0;HEAP32[r17]=r27;if((r27|0)==0){r29=0}else{HEAP8[r27|0]=0;HEAP32[r28+12>>2]=0;r29=HEAP32[r17]}HEAP32[r17]=r29+8|0;HEAP32[r11+12>>2]=0;HEAP32[r11+16>>2]=0;r29=(r11+20|0)>>2;HEAP32[r29]=0;r28=HEAP32[r4>>2];L1136:do{if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r28,r11,2)|0)==2){r4=HEAP32[r16];r27=HEAP32[r4+4>>2]>>>0;r26=HEAP32[r4+12>>2]>>>0;if(r27>r26*1.8){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}if(r26>r27*1.8){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r27=r1+8|0;HEAP8[r27]=0;HEAP8[r27+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r28,r11,7)|0)!=7){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r27=r1+8|0;HEAP8[r27]=0;HEAP8[r27+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}r27=HEAP32[r16];if((HEAP32[r17]-r27|0)==72){r30=r27}else{___assert_func(5251548,220,5257456,5251512);r30=HEAP32[r16]}do{if((HEAP8[r30|0]&1)<<24>>24!=0){if((HEAP8[r30+64|0]&1)<<24>>24==0){break}r27=HEAP32[r29]>>>0;if(r7>>>0<r27*.4){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r26=r1+8|0;HEAP8[r26]=0;HEAP8[r26+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break L1136}r26=r27/30;r4=r27*.125;r25=r27/7.9;if((HEAP32[r17]-r30|0)==72){r31=r30}else{___assert_func(5251548,205,5257548,5251512);r31=HEAP32[r16]}r24=0;r23=8;while(1){r22=r24<<1;r21=HEAP32[r31+(r23<<3)+4>>2]>>>0;if(r25>r21|r21>r27){if(r26>r21|r21>r4){break}else{r32=r22}}else{r32=r22|1}if((r23|0)>0){r24=r32;r23=r23-1|0}else{r9=1077;break}}do{if(r9==1077){if(r32<<16>>16==0){break}if(HEAP8[r2+(r32&65535)|0]<<24>>24!=-2){break}r23=r12;HEAP8[r23]=0;r24=r12+1|0;HEAP8[r24]=0;r4=r13|0;r26=(r12+8|0)>>2;r27=r12|0;r25=(r12+4|0)>>2;L1173:while(1){r22=HEAP32[r29];HEAP32[r4>>2]=r28;if(!__ZNK9BarDecode8code39_t8expect_nINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEEbRT_S9_j(0,r3,r13,r22)){r9=1083;break}if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r28,r11,9)|0)!=9){r9=1089;break}if((HEAP32[r17]-HEAP32[r16]|0)!=72){___assert_func(5251548,220,5257456,5251512)}if((r22|0)!=0){if(Math.abs(HEAP32[r29]-r22|0)>=(r22>>>0)*.5){r9=1096;break}}r22=HEAP32[r16];if((HEAP8[r22|0]&1)<<24>>24==0){r9=1096;break}if((HEAP8[r22+64|0]&1)<<24>>24==0){r9=1096;break}r21=HEAP32[r29]>>>0;r20=r21/30;r19=r21*.125;r18=r21/7.9;if((HEAP32[r17]-r22|0)==72){r33=r22}else{___assert_func(5251548,205,5257548,5251512);r33=HEAP32[r16]}r22=0;r34=8;while(1){r35=r22<<1;r36=HEAP32[r33+(r34<<3)+4>>2]>>>0;if(r18>r36|r36>r21){if(r20>r36|r36>r19){r9=1106;break L1173}else{r37=r35}}else{r37=r35|1}if((r34|0)>0){r22=r37;r34=r34-1|0}else{break}}if(r37<<16>>16==0){r9=1106;break}r34=HEAP8[r2+(r37&65535)|0];r22=r34&255;if((r22|0)==255){r9=1108;break}else if((r22|0)==254){r9=1125;break}r22=HEAP8[r23];if((r22&1)<<24>>24==0){r38=10;r39=r22}else{r22=HEAP32[r27>>2];r38=(r22&-2)-1|0;r39=r22&255}r22=r39&255;r19=(r22&1|0)==0?r22>>>1:HEAP32[r25];if((r19|0)==(r38|0)){if((r38|0)==-3){r9=1113;break}r22=(r39&1)<<24>>24==0?r24:HEAP32[r26];do{if(r38>>>0<2147483631){r20=r38+1|0;r21=r38<<1;r18=r20>>>0<r21>>>0?r21:r20;if(r18>>>0<11){r40=11;break}r40=r18+16&-16}else{r40=-2}}while(0);r18=__Znwj(r40);_memcpy(r18,r22,r38);if((r38|0)!=10){__ZdlPv(r22)}HEAP32[r26]=r18;r18=r40|1;HEAP32[r27>>2]=r18;r41=r18&255}else{r41=r39}r18=(r41&1)<<24>>24==0?r24:HEAP32[r26];HEAP8[r18+r19|0]=r34;r20=r19+1|0;HEAP8[r18+r20|0]=0;if((HEAP8[r23]&1)<<24>>24==0){HEAP8[r23]=r20<<1&255;continue}else{HEAP32[r25]=r20;continue}}do{if(r9==1083){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r27=r1+8|0;HEAP8[r27]=0;HEAP8[r27+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1089){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r27=r1+8|0;HEAP8[r27]=0;HEAP8[r27+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1096){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r27=r1+8|0;HEAP8[r27]=0;HEAP8[r27+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1106){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r27=r1+8|0;HEAP8[r27]=0;HEAP8[r27+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1108){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r27=r1+8|0;HEAP8[r27]=0;HEAP8[r27+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1113){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r9==1125){r27=HEAP8[r23];r4=(r27&1)<<24>>24==0;r20=r27&255;r27=(r4?r24:HEAP32[r26])+((r20&1|0)==0?r20>>>1:HEAP32[r25])|0;r20=r4?r24:HEAP32[r26];r4=r27;r18=r4-r20|0;if((r18|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r18>>>0<11){HEAP8[r14]=r18<<1&255;r42=r14+1|0}else{r21=r18+16&-16;r35=__Znwj(r21);HEAP32[r15+2]=r35;HEAP32[r15]=r21|1;HEAP32[r15+1]=r18;r42=r35}L1236:do{if((r27|0)==(r20|0)){r43=r42}else{r35=r42;r18=r4;r21=r27;while(1){HEAP8[r35]=HEAP8[r18-1|0];r36=r21-1|0;r44=r35+1|0;if((r36|0)==(r20|0)){r43=r44;break L1236}else{r35=r44;r18=r36;r21=r36}}}}while(0);HEAP8[r43]=0;HEAP8[r1|0]=1;HEAP32[r8+1]=64;r20=r1+8|0;r27=r14,r4=r27>>2;r19=(HEAP8[r27]&1)<<24>>24==0;if(r19){r27=r20>>2;HEAP32[r27]=HEAP32[r4];HEAP32[r27+1]=HEAP32[r4+1];HEAP32[r27+2]=HEAP32[r4+2];HEAP32[r8+5]=r5;HEAP32[r8+6]=r6;break}r4=HEAP32[r15+2];r27=HEAP32[r15+1];if((r27|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r27>>>0<11){HEAP8[r20]=r27<<1&255;r45=r20+1|0}else{r34=r27+16&-16;r22=__Znwj(r34);HEAP32[r8+4]=r22;HEAP32[r20>>2]=r34|1;HEAP32[r8+3]=r27;r45=r22}_memcpy(r45,r4,r27);HEAP8[r45+r27|0]=0;HEAP32[r8+5]=r5;HEAP32[r8+6]=r6;if(r19){break}__ZdlPv(HEAP32[r15+2])}}while(0);if((HEAP8[r23]&1)<<24>>24==0){break L1136}__ZdlPv(HEAP32[r26]);break L1136}}while(0);HEAP8[r1|0]=0;HEAP32[r8+1]=0;r24=r1+8|0;HEAP8[r24]=0;HEAP8[r24+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break L1136}}while(0);HEAP8[r1|0]=0;HEAP32[r8+1]=0;r24=r1+8|0;HEAP8[r24]=0;HEAP8[r24+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else{HEAP8[r1|0]=0;HEAP32[r8+1]=0;r24=r1+8|0;HEAP8[r24]=0;HEAP8[r24+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}}while(0);r8=HEAP32[r16];if((r8|0)==0){STACKTOP=r10;return}HEAP32[r17]=r8;__ZdlPv(r8|0);STACKTOP=r10;return}function __ZNK9BarDecode9code25i_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52;r8=r1>>2;r9=0;r10=STACKTOP;STACKTOP=STACKTOP+36|0;r11=r4;r4=STACKTOP;STACKTOP=STACKTOP+4|0;HEAP32[r4>>2]=HEAP32[r11>>2];r11=r10;r12=r10+24;r13=r12,r14=r13>>2;r15=STACKTOP;STACKTOP=STACKTOP+4|0;r16=(r11|0)>>2;HEAP32[r16]=0;r17=(r11+4|0)>>2;HEAP32[r17]=0;r18=r11+8|0;HEAP32[r18>>2]=0;r19=__Znwj(32);r20=r19;HEAP32[r17]=r20;HEAP32[r16]=r20;HEAP32[r18>>2]=r19+32|0;if((r19|0)==0){r21=0}else{HEAP8[r19]=0;HEAP32[r19+4>>2]=0;r21=r20}r20=r21+8|0;HEAP32[r17]=r20;if((r20|0)==0){r22=0}else{HEAP8[r20|0]=0;HEAP32[r21+12>>2]=0;r22=HEAP32[r17]}r21=r22+8|0;HEAP32[r17]=r21;if((r21|0)==0){r23=0}else{HEAP8[r21|0]=0;HEAP32[r22+12>>2]=0;r23=HEAP32[r17]}r22=r23+8|0;HEAP32[r17]=r22;if((r22|0)==0){r24=0}else{HEAP8[r22|0]=0;HEAP32[r23+12>>2]=0;r24=HEAP32[r17]}HEAP32[r17]=r24+8|0;r24=(r11+12|0)>>2;HEAP32[r24]=0;r23=r11+16|0;HEAP32[r23>>2]=0;r22=(r11+20|0)>>2;HEAP32[r22]=0;r21=HEAP32[r4>>2];do{if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r21,r11,2)|0)==2){r4=HEAP32[r16];r20=HEAP32[r4+4>>2];r19=HEAP32[r4+12>>2];if(r20>>>0<(r19>>>0)*.7|r20>>>0>(r19*3&-1)>>>0){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}if(r7>>>0<((r19+r20|0)>>>0)*5*.5){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r20=r1+8|0;HEAP8[r20]=0;HEAP8[r20+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r21,r11,2)|0)!=2){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r20=r1+8|0;HEAP8[r20]=0;HEAP8[r20+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}r20=HEAP32[r16]>>2;r19=HEAP32[r20+1]>>>0;r4=HEAP32[r20+5]>>>0;if(r19<r4*.7|r19>r4*1.3){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}r4=HEAP32[r20+3]>>>0;r19=HEAP32[r20+7]>>>0;if(r4<r19*.7|r4>r19*1.3){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r19=r1+8|0;HEAP8[r19]=0;HEAP8[r19+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}r19=HEAP32[r23>>2];r4=(HEAP32[r22]>>>0)*.5;r20=HEAP32[r24]>>>0;HEAP32[r14]=0;HEAP32[r14+1]=0;HEAP32[r14+2]=0;r18=(r19>>>0)/r4;r19=r20/r4;r4=r3|0;r20=r15|0;r25=r15+2|0;r26=r12+1|0;r27=(r12+8|0)>>2;r28=(r12|0)>>2;r29=(r12+4|0)>>2;r30=0;r31=0;L1295:while(1){if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r21,r11,3)|0)!=3){r9=1194;break}r32=HEAP32[r16]>>2;r33=HEAP32[r32+1]>>>0;r34=HEAP32[r32+5];do{if(r33<(r34>>>0)*3.1*1.3){if(r33<=(r34<<1>>>0)*.7){break}r35=HEAP32[r32+3]>>>0;r36=HEAP32[r22]>>>0;if(r35>=r18*r36*.25*1.2){break}if(r35<=r18*r36*.18*.8){break}if(HEAP32[HEAP32[r4>>2]+12>>2]>>>0>r36*1.3){r9=1255;break L1295}}}while(0);if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r21,r11,7)|0)!=7){r9=1206;break}if((HEAP32[r17]-HEAP32[r16]|0)!=80){___assert_func(5251720,161,5257172,5251616)}r32=HEAP32[r22];if((r30|0)!=0){if(Math.abs(r32-r30|0)>=(r30>>>0)*.5){r9=1214;break}}r34=HEAP32[r24]>>>0;r33=r19*(r32>>>0)*.5;if(r34<r33*.8|r34>r33*1.2){r9=1214;break}r33=HEAP32[r16];if((HEAP8[r33|0]&1)<<24>>24==0){r9=1214;break}if((HEAP8[r33+72|0]&1)<<24>>24!=0){r9=1214;break}__ZNK9BarDecode9code25i_t8get_keysERKNS_12bar_vector_tE(r15,0,r11);r33=HEAP16[r20>>1];if(r33<<16>>16==0){r9=1218;break}r34=HEAP16[r25>>1];if(r34<<16>>16==0){r9=1218;break}r36=HEAP8[r2+(r33&65535)|0];if(r36<<24>>24==0){r9=1220;break}r33=HEAP8[r13];if((r33&1)<<24>>24==0){r37=10;r38=r33}else{r33=HEAP32[r28];r37=(r33&-2)-1|0;r38=r33&255}r33=r38&255;r35=(r33&1|0)==0?r33>>>1:HEAP32[r29];if((r35|0)==(r37|0)){if((r37|0)==-3){r9=1225;break}r33=(r38&1)<<24>>24==0?r26:HEAP32[r27];do{if(r37>>>0<2147483631){r39=r37+1|0;r40=r37<<1;r41=r39>>>0<r40>>>0?r40:r39;if(r41>>>0<11){r42=11;break}r42=r41+16&-16}else{r42=-2}}while(0);r41=__Znwj(r42);_memcpy(r41,r33,r37);if((r37|0)!=10){__ZdlPv(r33)}HEAP32[r27]=r41;r41=r42|1;HEAP32[r28]=r41;r43=r41&255}else{r43=r38}r41=(r43&1)<<24>>24==0?r26:HEAP32[r27];HEAP8[r41+r35|0]=r36;r39=r35+1|0;HEAP8[r41+r39|0]=0;r41=HEAP8[r13];if((r41&1)<<24>>24==0){r40=r39<<1&255;HEAP8[r13]=r40;r44=r40}else{HEAP32[r29]=r39;r44=r41}r41=HEAP8[r2+(r34&65535)|0];if(r41<<24>>24==0){r9=1238;break}if((r44&1)<<24>>24==0){r45=10;r46=r44}else{r39=HEAP32[r28];r45=(r39&-2)-1|0;r46=r39&255}r39=r46&255;r40=(r39&1|0)==0?r39>>>1:HEAP32[r29];if((r40|0)==(r45|0)){if((r45|0)==-3){r9=1243;break}r39=(r46&1)<<24>>24==0?r26:HEAP32[r27];do{if(r45>>>0<2147483631){r47=r45+1|0;r48=r45<<1;r49=r47>>>0<r48>>>0?r48:r47;if(r49>>>0<11){r50=11;break}r50=r49+16&-16}else{r50=-2}}while(0);r34=__Znwj(r50);_memcpy(r34,r39,r45);if((r45|0)!=10){__ZdlPv(r39)}HEAP32[r27]=r34;r34=r50|1;HEAP32[r28]=r34;r51=r34&255}else{r51=r46}r34=(r51&1)<<24>>24==0?r26:HEAP32[r27];HEAP8[r34+r40|0]=r41;r35=r40+1|0;HEAP8[r34+r35|0]=0;r34=HEAP8[r13];if((r34&1)<<24>>24==0){r36=r35<<1&255;HEAP8[r13]=r36;r30=r32;r31=r36;continue}else{HEAP32[r29]=r35;r30=r32;r31=r34;continue}}do{if(r9==1194){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r30=r1+8|0;HEAP8[r30]=0;HEAP8[r30+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1206){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r30=r1+8|0;HEAP8[r30]=0;HEAP8[r30+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1214){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r30=r1+8|0;HEAP8[r30]=0;HEAP8[r30+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1218){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r30=r1+8|0;HEAP8[r30]=0;HEAP8[r30+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1220){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r30=r1+8|0;HEAP8[r30]=0;HEAP8[r30+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1225){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r9==1238){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r30=r1+8|0;HEAP8[r30]=0;HEAP8[r30+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1243){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r9==1255){r30=r31&255;r26=r1|0;if((((r30&1|0)==0?r30>>>1:HEAP32[r29])|0)==0){HEAP8[r26]=0;HEAP32[r8+1]=0;r30=r1+8|0;HEAP8[r30]=0;HEAP8[r30+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}HEAP8[r26]=1;HEAP32[r8+1]=512;r26=r1+8|0;if((r31&1)<<24>>24==0){r30=r26>>2;HEAP32[r30]=HEAP32[r14];HEAP32[r30+1]=HEAP32[r14+1];HEAP32[r30+2]=HEAP32[r14+2]}else{r30=HEAP32[r27];r28=HEAP32[r29];if((r28|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r28>>>0<11){HEAP8[r26]=r28<<1&255;r52=r26+1|0}else{r25=r28+16&-16;r20=__Znwj(r25);HEAP32[r8+4]=r20;HEAP32[r26>>2]=r25|1;HEAP32[r8+3]=r28;r52=r20}_memcpy(r52,r30,r28);HEAP8[r52+r28|0]=0}HEAP32[r8+5]=r5;HEAP32[r8+6]=r6}}while(0);if((HEAP8[r13]&1)<<24>>24==0){break}__ZdlPv(HEAP32[r27])}else{HEAP8[r1|0]=0;HEAP32[r8+1]=0;r29=r1+8|0;HEAP8[r29]=0;HEAP8[r29+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}}while(0);r8=HEAP32[r16];if((r8|0)==0){STACKTOP=r10;return}HEAP32[r17]=r8;__ZdlPv(r8|0);STACKTOP=r10;return}function __ZNK9BarDecode9code25i_t12reverse_scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54;r8=r1>>2;r9=0;r10=STACKTOP;STACKTOP=STACKTOP+52|0;r11=r4;r4=STACKTOP;STACKTOP=STACKTOP+4|0;HEAP32[r4>>2]=HEAP32[r11>>2];r11=r10;r12=r10+24;r13=r10+36;r14=r10+40,r15=r14>>2;r16=(r11|0)>>2;HEAP32[r16]=0;r17=(r11+4|0)>>2;HEAP32[r17]=0;r18=r11+8|0;HEAP32[r18>>2]=0;r19=__Znwj(24);r20=r19;HEAP32[r17]=r20;HEAP32[r16]=r20;HEAP32[r18>>2]=r19+24|0;if((r19|0)==0){r21=0}else{HEAP8[r19]=0;HEAP32[r19+4>>2]=0;r21=r20}r20=r21+8|0;HEAP32[r17]=r20;if((r20|0)==0){r22=0}else{HEAP8[r20|0]=0;HEAP32[r21+12>>2]=0;r22=HEAP32[r17]}r21=r22+8|0;HEAP32[r17]=r21;if((r21|0)==0){r23=0}else{HEAP8[r21|0]=0;HEAP32[r22+12>>2]=0;r23=HEAP32[r17]}HEAP32[r17]=r23+8|0;r23=(r11+12|0)>>2;HEAP32[r23]=0;r22=r11+16|0;HEAP32[r22>>2]=0;r21=(r11+20|0)>>2;HEAP32[r21]=0;r20=HEAP32[r4>>2];do{if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r20,r11,2)|0)==2){r4=HEAP32[r16];r19=HEAP32[r4+4>>2];r18=HEAP32[r4+12>>2];if(r19>>>0<(r18>>>0)*.7|r19>>>0>(r18*3&-1)>>>0){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}if(r7>>>0<((r18+r19|0)>>>0)*5*.5){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r19=r1+8|0;HEAP8[r19]=0;HEAP8[r19+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r20,r11,1)|0)!=1){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r19=r1+8|0;HEAP8[r19]=0;HEAP8[r19+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}r19=HEAP32[r16];r18=HEAP32[r19+4>>2]>>>0;r4=HEAP32[r19+20>>2]>>>0;if(r18<r4*.21|r18>r4*.65){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}r4=(HEAP32[r23]>>>0)/((HEAP32[r21]>>>0)*.75);r18=r12;HEAP8[r18]=0;r19=r12+1|0;HEAP8[r19]=0;r24=r3|0;r25=r13|0;r26=r13+2|0;r27=(r12+8|0)>>2;r28=(r12|0)>>2;r29=(r12+4|0)>>2;r30=0;r31=0;L1420:while(1){if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r20,r11,4)|0)!=4){r9=1302;break}r32=HEAP32[r23]>>>0;r33=HEAP32[r21];r34=r4*(r33>>>0)*.5;do{if(r32>r34*.8&r32<r34*1.2){r35=HEAP32[r16]>>2;r36=r32/(HEAP32[r35+7]>>>0);if(!(r36>1.4&r36<2.6)){break}r36=HEAP32[r22>>2]>>>0;r37=r36/(HEAP32[r35+5]>>>0);if(!(r37>1.4&r37<2.6)){break}r37=r32/(HEAP32[r35+3]>>>0);if(!(r37>1.4&r37<2.6)){break}r37=r36/(HEAP32[r35+1]>>>0);if(!(r37>1.4&r37<2.6)){break}if(HEAP32[HEAP32[r24>>2]+12>>2]>>>0>r33>>>0){r9=1363;break L1420}}}while(0);if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r20,r11,6)|0)!=6){r9=1314;break}if((HEAP32[r17]-HEAP32[r16]|0)!=80){___assert_func(5251720,185,5256944,5251616)}r33=HEAP32[r21];if((r30|0)!=0){if(Math.abs(r33-r30|0)>=(r30>>>0)*.5){r9=1322;break}}r32=HEAP32[r23]>>>0;r34=r4*(r33>>>0)*.5;if(r32<r34*.8|r32>r34*1.2){r9=1322;break}r34=HEAP32[r16];if((HEAP8[r34|0]&1)<<24>>24!=0){r9=1322;break}if((HEAP8[r34+72|0]&1)<<24>>24==0){r9=1322;break}__ZNK9BarDecode9code25i_t16reverse_get_keysERKNS_12bar_vector_tE(r13,0,r11);r34=HEAP16[r25>>1];if(r34<<16>>16==0){r9=1326;break}r32=HEAP16[r26>>1];if(r32<<16>>16==0){r9=1326;break}r37=HEAP8[r2+(r34&65535)|0];if(r37<<24>>24==0){r9=1328;break}r34=HEAP8[r18];if((r34&1)<<24>>24==0){r38=10;r39=r34}else{r34=HEAP32[r28];r38=(r34&-2)-1|0;r39=r34&255}r34=r39&255;r35=(r34&1|0)==0?r34>>>1:HEAP32[r29];if((r35|0)==(r38|0)){if((r38|0)==-3){r9=1333;break}r34=(r39&1)<<24>>24==0?r19:HEAP32[r27];do{if(r38>>>0<2147483631){r36=r38+1|0;r40=r38<<1;r41=r36>>>0<r40>>>0?r40:r36;if(r41>>>0<11){r42=11;break}r42=r41+16&-16}else{r42=-2}}while(0);r41=__Znwj(r42);_memcpy(r41,r34,r38);if((r38|0)!=10){__ZdlPv(r34)}HEAP32[r27]=r41;r41=r42|1;HEAP32[r28]=r41;r43=r41&255}else{r43=r39}r41=(r43&1)<<24>>24==0?r19:HEAP32[r27];HEAP8[r41+r35|0]=r37;r36=r35+1|0;HEAP8[r41+r36|0]=0;r41=HEAP8[r18];if((r41&1)<<24>>24==0){r40=r36<<1&255;HEAP8[r18]=r40;r44=r40}else{HEAP32[r29]=r36;r44=r41}r41=HEAP8[r2+(r32&65535)|0];if(r41<<24>>24==0){r9=1346;break}if((r44&1)<<24>>24==0){r45=10;r46=r44}else{r36=HEAP32[r28];r45=(r36&-2)-1|0;r46=r36&255}r36=r46&255;r40=(r36&1|0)==0?r36>>>1:HEAP32[r29];if((r40|0)==(r45|0)){if((r45|0)==-3){r9=1351;break}r36=(r46&1)<<24>>24==0?r19:HEAP32[r27];do{if(r45>>>0<2147483631){r47=r45+1|0;r48=r45<<1;r49=r47>>>0<r48>>>0?r48:r47;if(r49>>>0<11){r50=11;break}r50=r49+16&-16}else{r50=-2}}while(0);r32=__Znwj(r50);_memcpy(r32,r36,r45);if((r45|0)!=10){__ZdlPv(r36)}HEAP32[r27]=r32;r32=r50|1;HEAP32[r28]=r32;r51=r32&255}else{r51=r46}r32=(r51&1)<<24>>24==0?r19:HEAP32[r27];HEAP8[r32+r40|0]=r41;r35=r40+1|0;HEAP8[r32+r35|0]=0;r32=HEAP8[r18];if((r32&1)<<24>>24==0){r37=r35<<1&255;HEAP8[r18]=r37;r30=r33;r31=r37;continue}else{HEAP32[r29]=r35;r30=r33;r31=r32;continue}}do{if(r9==1346){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r30=r1+8|0;HEAP8[r30]=0;HEAP8[r30+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1302){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r30=r1+8|0;HEAP8[r30]=0;HEAP8[r30+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1333){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r9==1351){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r9==1363){r30=r31&255;r28=(r30&1|0)==0;if(((r28?r30>>>1:HEAP32[r29])|0)==0){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r26=r1+8|0;HEAP8[r26]=0;HEAP8[r26+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}r26=(r31&1)<<24>>24==0;r25=HEAP32[r27];r4=(r26?r19:r25)+(r28?r30>>>1:HEAP32[r29])|0;r30=r26?r19:r25;r25=r4;r26=r25-r30|0;if((r26|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r26>>>0<11){HEAP8[r14]=r26<<1&255;r52=r14+1|0}else{r28=r26+16&-16;r24=__Znwj(r28);HEAP32[r15+2]=r24;HEAP32[r15]=r28|1;HEAP32[r15+1]=r26;r52=r24}L1504:do{if((r4|0)==(r30|0)){r53=r52}else{r24=r52;r26=r25;r28=r4;while(1){HEAP8[r24]=HEAP8[r26-1|0];r32=r28-1|0;r35=r24+1|0;if((r32|0)==(r30|0)){r53=r35;break L1504}else{r24=r35;r26=r32;r28=r32}}}}while(0);HEAP8[r53]=0;HEAP8[r1|0]=1;HEAP32[r8+1]=512;r30=r1+8|0;r4=r14,r25=r4>>2;r33=(HEAP8[r4]&1)<<24>>24==0;if(r33){r4=r30>>2;HEAP32[r4]=HEAP32[r25];HEAP32[r4+1]=HEAP32[r25+1];HEAP32[r4+2]=HEAP32[r25+2];HEAP32[r8+5]=r5;HEAP32[r8+6]=r6;break}r25=HEAP32[r15+2];r4=HEAP32[r15+1];if((r4|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r4>>>0<11){HEAP8[r30]=r4<<1&255;r54=r30+1|0}else{r40=r4+16&-16;r41=__Znwj(r40);HEAP32[r8+4]=r41;HEAP32[r30>>2]=r40|1;HEAP32[r8+3]=r4;r54=r41}_memcpy(r54,r25,r4);HEAP8[r54+r4|0]=0;HEAP32[r8+5]=r5;HEAP32[r8+6]=r6;if(r33){break}__ZdlPv(HEAP32[r15+2])}else if(r9==1314){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r33=r1+8|0;HEAP8[r33]=0;HEAP8[r33+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1322){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r33=r1+8|0;HEAP8[r33]=0;HEAP8[r33+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1326){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r33=r1+8|0;HEAP8[r33]=0;HEAP8[r33+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1328){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r33=r1+8|0;HEAP8[r33]=0;HEAP8[r33+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}}while(0);if((HEAP8[r18]&1)<<24>>24==0){break}__ZdlPv(HEAP32[r27])}else{HEAP8[r1|0]=0;HEAP32[r8+1]=0;r19=r1+8|0;HEAP8[r19]=0;HEAP8[r19+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}}while(0);r8=HEAP32[r16];if((r8|0)==0){STACKTOP=r10;return}HEAP32[r17]=r8;__ZdlPv(r8|0);STACKTOP=r10;return}function __ZNK9BarDecode9code128_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33;r8=r1>>2;r9=0;r10=STACKTOP;STACKTOP=STACKTOP+44|0;r11=r4;r4=STACKTOP;STACKTOP=STACKTOP+4|0;HEAP32[r4>>2]=HEAP32[r11>>2];r11=r10;r12=r10+24;r13=r10+32;r14=(r11|0)>>2;HEAP32[r14]=0;r15=(r11+4|0)>>2;HEAP32[r15]=0;r16=r11+8|0;HEAP32[r16>>2]=0;r17=__Znwj(48);r18=r17;HEAP32[r15]=r18;HEAP32[r14]=r18;HEAP32[r16>>2]=r17+48|0;if((r17|0)==0){r19=0}else{HEAP8[r17]=0;HEAP32[r17+4>>2]=0;r19=r18}r18=r19+8|0;HEAP32[r15]=r18;if((r18|0)==0){r20=0}else{HEAP8[r18|0]=0;HEAP32[r19+12>>2]=0;r20=HEAP32[r15]}r19=r20+8|0;HEAP32[r15]=r19;if((r19|0)==0){r21=0}else{HEAP8[r19|0]=0;HEAP32[r20+12>>2]=0;r21=HEAP32[r15]}r20=r21+8|0;HEAP32[r15]=r20;if((r20|0)==0){r22=0}else{HEAP8[r20|0]=0;HEAP32[r21+12>>2]=0;r22=HEAP32[r15]}r21=r22+8|0;HEAP32[r15]=r21;if((r21|0)==0){r23=0}else{HEAP8[r21|0]=0;HEAP32[r22+12>>2]=0;r23=HEAP32[r15]}r22=r23+8|0;HEAP32[r15]=r22;if((r22|0)==0){r24=0}else{HEAP8[r22|0]=0;HEAP32[r23+12>>2]=0;r24=HEAP32[r15]}HEAP32[r15]=r24+8|0;HEAP32[r11+12>>2]=0;HEAP32[r11+16>>2]=0;r24=r11+20|0;HEAP32[r24>>2]=0;r23=HEAP32[r4>>2];L1552:do{if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r23,r11,2)|0)==2){r4=HEAP32[r14];r22=HEAP32[r4+4>>2];r21=HEAP32[r4+12>>2];do{if(r22>>>0<=(r21*3&-1)>>>0){if(r22>>>0<(r21>>>0)*1.2){break}if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r23,r11,4)|0)!=4){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break L1552}r4=(HEAP32[r24>>2]>>>0)/11;HEAPF64[tempDoublePtr>>3]=r4,HEAP32[r12>>2]=HEAP32[tempDoublePtr>>2],HEAP32[r12+4>>2]=HEAP32[tempDoublePtr+4>>2];if(r4>(Math.floor((r7>>>0)/5)>>>0)*1.35){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break L1552}r4=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities24get_module_word_adjust_uERKNS_12bar_vector_tERdj(r11,r12,11);if((r4&1025)<<16>>16==1024){r25=(r4&65535)>>>1&511}else{r25=0}r4=r2+(r25&65535)|0;r20=HEAP8[r4];r19=r20<<24>>24;do{if(r20<<24>>24==106){r26=11}else if(r20<<24>>24==-1){r26=0}else{if(r20<<24>>24<64){r26=r20+32&255;break}if(r20<<24>>24<96){r26=r20-64&255;break}else{r26=HEAP8[r19-96+r2+512|0];break}}}while(0);if(((r26<<24>>24)-8|0)>>>0>=3){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r19=r1+8|0;HEAP8[r19]=0;HEAP8[r19+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break L1552}r19=(r13|0)>>2;r20=r13;HEAP32[r19]=r20;r18=r13+4|0;HEAP32[r18>>2]=r20;r17=(r13+8|0)>>2;HEAP32[r17]=0;r16=__Znwj(12);r27=r16;r28=r16+8|0;if((r28|0)!=0){HEAP16[r28>>1]=r25}HEAP32[HEAP32[r19]+4>>2]=r27;HEAP32[r16>>2]=HEAP32[r19];HEAP32[r19]=r27;HEAP32[r16+4>>2]=r20;HEAP32[r17]=HEAP32[r17]+1|0;L1586:do{if(HEAP8[r4]<<24>>24==106){r29=r27;r9=1449}else{while(1){if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r23,r11,6)|0)!=6){r9=1434;break}r16=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities24get_module_word_adjust_uERKNS_12bar_vector_tERdj(r11,r12,11);if((r16&1025)<<16>>16!=1024){r9=1444;break}r28=(r16&65535)>>>1&511;if(r28<<16>>16==0){r9=1444;break}r16=r2+(r28&65535)|0;if(HEAP8[r16]<<24>>24==-1){r9=1444;break}r30=__Znwj(12);r31=r30;r32=r30+8|0;if((r32|0)!=0){HEAP16[r32>>1]=r28}HEAP32[HEAP32[r19]+4>>2]=r31;HEAP32[r30>>2]=HEAP32[r19];HEAP32[r19]=r31;HEAP32[r30+4>>2]=r20;HEAP32[r17]=HEAP32[r17]+1|0;if(HEAP8[r16]<<24>>24==106){r29=r31;r9=1449;break L1586}}if(r9==1444){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r31=r1+8|0;HEAP8[r31]=0;HEAP8[r31+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}else if(r9==1434){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r31=r1+8|0;HEAP8[r31]=0;HEAP8[r31+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}}}while(0);do{if(r9==1449){r27=r29+4|0;r4=r29|0;HEAP32[HEAP32[r4>>2]+4>>2]=HEAP32[r27>>2];HEAP32[HEAP32[r27>>2]>>2]=HEAP32[r4>>2];HEAP32[r17]=HEAP32[r17]-1|0;__ZdlPv(r29);if(HEAP32[r17]>>>0<2){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}else{__ZNK9BarDecode9code128_t15decode_key_listERKNSt3__14listItNS1_9allocatorItEEEEii(r1,r2,r13,r5,r6);break}}}while(0);if((HEAP32[r17]|0)==0){break L1552}r4=HEAP32[r18>>2];r27=HEAP32[r19]+4|0;r31=r4|0;HEAP32[HEAP32[r31>>2]+4>>2]=HEAP32[r27>>2];HEAP32[HEAP32[r27>>2]>>2]=HEAP32[r31>>2];HEAP32[r17]=0;if((r4|0)==(r20|0)){break L1552}else{r33=r4}while(1){r4=HEAP32[r33+4>>2];__ZdlPv(r33);if((r4|0)==(r20|0)){break L1552}else{r33=r4}}}}while(0);HEAP8[r1|0]=0;HEAP32[r8+1]=0;r21=r1+8|0;HEAP8[r21]=0;HEAP8[r21+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else{HEAP8[r1|0]=0;HEAP32[r8+1]=0;r21=r1+8|0;HEAP8[r21]=0;HEAP8[r21+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}}while(0);r8=HEAP32[r14];if((r8|0)==0){STACKTOP=r10;return}HEAP32[r15]=r8;__ZdlPv(r8|0);STACKTOP=r10;return}function __ZNK9BarDecode9code128_t12reverse_scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66;r8=r1>>2;r9=0;r10=STACKTOP;STACKTOP=STACKTOP+84|0;r11=r4;r4=STACKTOP;STACKTOP=STACKTOP+4|0;HEAP32[r4>>2]=HEAP32[r11>>2];r11=r10;r12=r10+24;r13=r10+48;r14=r10+72;r15=(r13|0)>>2;HEAP32[r15]=0;r16=(r13+4|0)>>2;HEAP32[r16]=0;r17=r13+8|0;HEAP32[r17>>2]=0;r18=__Znwj(56);r19=r18;HEAP32[r16]=r19;HEAP32[r15]=r19;HEAP32[r17>>2]=r18+56|0;if((r18|0)==0){r20=0}else{HEAP8[r18]=0;HEAP32[r18+4>>2]=0;r20=r19}r19=r20+8|0;HEAP32[r16]=r19;if((r19|0)==0){r21=0}else{HEAP8[r19|0]=0;HEAP32[r20+12>>2]=0;r21=HEAP32[r16]}r20=r21+8|0;HEAP32[r16]=r20;if((r20|0)==0){r22=0}else{HEAP8[r20|0]=0;HEAP32[r21+12>>2]=0;r22=HEAP32[r16]}r21=r22+8|0;HEAP32[r16]=r21;if((r21|0)==0){r23=0}else{HEAP8[r21|0]=0;HEAP32[r22+12>>2]=0;r23=HEAP32[r16]}r22=r23+8|0;HEAP32[r16]=r22;if((r22|0)==0){r24=0}else{HEAP8[r22|0]=0;HEAP32[r23+12>>2]=0;r24=HEAP32[r16]}r23=r24+8|0;HEAP32[r16]=r23;if((r23|0)==0){r25=0}else{HEAP8[r23|0]=0;HEAP32[r24+12>>2]=0;r25=HEAP32[r16]}r24=r25+8|0;HEAP32[r16]=r24;if((r24|0)==0){r26=0}else{HEAP8[r24|0]=0;HEAP32[r25+12>>2]=0;r26=HEAP32[r16]}HEAP32[r16]=r26+8|0;r26=(r13+12|0)>>2;HEAP32[r26]=0;r25=(r13+16|0)>>2;HEAP32[r25]=0;r24=(r13+20|0)>>2;HEAP32[r24]=0;r23=r4|0;r4=HEAP32[r23>>2];L1640:do{if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r4,r13,2)|0)==2){r22=HEAP32[r15];r21=HEAP32[r22+4>>2];r20=HEAP32[r22+12>>2];do{if(r21>>>0<=(r20*3&-1)>>>0){if(r21>>>0<(r20>>>0)*1.2){break}if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r4,r13,5)|0)!=5){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r22=r1+8|0;HEAP8[r22]=0;HEAP8[r22+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break L1640}r22=(HEAP32[r24]>>>0)/13;if(r22>(Math.floor((r7>>>0)/5)>>>0)*1.35){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r19=r1+8|0;HEAP8[r19]=0;HEAP8[r19+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break L1640}r19=HEAP32[r15];r18=r19+8|0;r17=HEAP32[r16];if((r18|0)==(r17|0)){r27=r19}else{r28=(r17-16+ -r19|0)>>>3;r29=r19;r30=r18;while(1){HEAP8[r29|0]=HEAP8[r30|0]&1;HEAP32[r29+4>>2]=HEAP32[r30+4>>2];r18=r30+8|0;if((r18|0)==(r17|0)){break}else{r29=r29+8|0;r30=r18}}r27=(r28+1<<3)+r19|0}HEAP32[r16]=r27;r30=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities23reverse_get_module_wordERKNS_12bar_vector_tEdj(r13,r22);if((r30&1025)<<16>>16==1024){r31=(r30&65535)>>>1&511}else{r31=0}if(HEAP8[r2+r31|0]<<24>>24!=106){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r30=r1+8|0;HEAP8[r30]=0;HEAP8[r30+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break L1640}r30=r14|0;r29=r14;HEAP32[r30>>2]=r29;r17=(r14+4|0)>>2;HEAP32[r17]=r29;r18=(r14+8|0)>>2;HEAP32[r18]=0;r32=(r11|0)>>2;r33=(r11+4|0)>>2;r34=r11+8|0;r35=r11+12|0;r36=r11+16|0;r37=r11+20|0;r38=(r12|0)>>2;r39=(r12+4|0)>>2;r40=r12+8|0;r41=r12+12|0;r42=r12+16|0;r43=r12+20|0;r44=r22;L1666:while(1){if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,HEAP32[r23>>2],r13,6)|0)!=6){r9=1499;break}r45=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities23reverse_get_module_wordERKNS_12bar_vector_tEdj(r13,r44);do{if(r45<<16>>16==0){r46=(HEAP32[r24]>>>0)/11;if(r46!=r44){if(Math.abs(r46-r44)>r44*.4){r9=1554;break L1666}r47=(r44+r46*2)/3;r46=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r13,r47,11);if(r46<<16>>16==0){r48=r47}else{r49=r46;r50=r47;break}}else{r48=r44}r47=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r13,r48*.75,11);if(r47<<16>>16!=0){r49=r47;r50=r48;break}r47=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r13,r48*1.25,11);if(r47<<16>>16!=0){r49=r47;r50=r48;break}HEAP32[r32]=0;HEAP32[r33]=0;HEAP32[r34>>2]=0;r47=HEAP32[r16]-HEAP32[r15]|0;r46=r47>>3;L1682:do{if((r46|0)==0){r51=0;r52=0}else{if(r46>>>0>536870911){r9=1517;break L1666}r53=__Znwj(r47);HEAP32[r33]=r53;HEAP32[r32]=r53;HEAP32[r34>>2]=(r46<<3)+r53|0;r54=HEAP32[r15];r55=HEAP32[r16];if((r54|0)==(r55|0)){r51=r53;r52=r53;break}else{r56=r54;r57=r53}while(1){if((r57|0)==0){r58=0}else{HEAP8[r57|0]=HEAP8[r56|0]&1;HEAP32[r57+4>>2]=HEAP32[r56+4>>2];r58=r57}r54=r58+8|0;HEAP32[r33]=r54;r59=r56+8|0;if((r59|0)==(r55|0)){r51=r54;r52=r53;break L1682}else{r56=r59;r57=r54}}}}while(0);HEAP32[r35>>2]=HEAP32[r26];HEAP32[r36>>2]=HEAP32[r25];HEAP32[r37>>2]=HEAP32[r24];L1692:do{if((r51|0)!=(r52|0)){r46=r51-r52>>3;r47=0;while(1){r53=(r47<<3)+r52+4|0;HEAP32[r53>>2]=((HEAP8[(r47<<3)+r52|0]&1)<<24>>24==0?-1:1)+HEAP32[r53>>2]|0;r53=r47+1|0;if(r53>>>0<r46>>>0){r47=r53}else{break L1692}}}}while(0);r47=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r11,r48,11);r46=HEAP32[r32];if((r46|0)!=0){HEAP32[r33]=r46;__ZdlPv(r46|0)}if(r47<<16>>16!=0){r49=r47;r50=r48;break}HEAP32[r38]=0;HEAP32[r39]=0;HEAP32[r40>>2]=0;r47=HEAP32[r16]-HEAP32[r15]|0;r46=r47>>3;L1702:do{if((r46|0)==0){r60=0;r61=0}else{if(r46>>>0>536870911){r9=1535;break L1666}r53=__Znwj(r47);HEAP32[r39]=r53;HEAP32[r38]=r53;HEAP32[r40>>2]=(r46<<3)+r53|0;r55=HEAP32[r15];r54=HEAP32[r16];if((r55|0)==(r54|0)){r60=r53;r61=r53;break}else{r62=r55;r63=r53}while(1){if((r63|0)==0){r64=0}else{HEAP8[r63|0]=HEAP8[r62|0]&1;HEAP32[r63+4>>2]=HEAP32[r62+4>>2];r64=r63}r55=r64+8|0;HEAP32[r39]=r55;r59=r62+8|0;if((r59|0)==(r54|0)){r60=r55;r61=r53;break L1702}else{r62=r59;r63=r55}}}}while(0);HEAP32[r41>>2]=HEAP32[r26];HEAP32[r42>>2]=HEAP32[r25];HEAP32[r43>>2]=HEAP32[r24];L1712:do{if((r60|0)!=(r61|0)){r46=r60-r61>>3;r47=0;while(1){r53=(r47<<3)+r61+4|0;HEAP32[r53>>2]=((HEAP8[(r47<<3)+r61|0]&1)<<24>>24==0?1:-1)+HEAP32[r53>>2]|0;r53=r47+1|0;if(r53>>>0<r46>>>0){r47=r53}else{break L1712}}}}while(0);r47=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r12,r48,11);r46=HEAP32[r38];if((r46|0)==0){r49=r47;r50=r48;break}HEAP32[r39]=r46;__ZdlPv(r46|0);r49=r47;r50=r48}else{r49=r45;r50=r44}}while(0);if((r49&1025)<<16>>16!=1024){r9=1554;break}r45=(r49&65535)>>>1&511;if(r45<<16>>16==0){r9=1554;break}r47=r2+(r45&65535)|0;if(HEAP8[r47]<<24>>24==-1){r9=1554;break}r46=__Znwj(12);r53=r46;r54=r46+8|0;if((r54|0)!=0){HEAP16[r54>>1]=r45}r45=HEAP32[r17];r54=(r45|0)>>2;HEAP32[HEAP32[r54]+4>>2]=r53;HEAP32[r46>>2]=HEAP32[r54];HEAP32[r54]=r53;HEAP32[r46+4>>2]=r45;r65=HEAP32[r18]+1|0;HEAP32[r18]=r65;if((HEAP8[r47]-103&255)<3){r9=1559;break}else{r44=r50}}do{if(r9==1554){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r44=r1+8|0;HEAP8[r44]=0;HEAP8[r44+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1559){if(r65>>>0<2){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r44=r1+8|0;HEAP8[r44]=0;HEAP8[r44+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;break}else{__ZNK9BarDecode9code128_t15decode_key_listERKNSt3__14listItNS1_9allocatorItEEEEii(r1,r2,r14,r5,r6);break}}else if(r9==1535){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}else if(r9==1499){HEAP8[r1|0]=0;HEAP32[r8+1]=0;r44=r1+8|0;HEAP8[r44]=0;HEAP8[r44+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else if(r9==1517){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}}while(0);if((HEAP32[r18]|0)==0){break L1640}r44=HEAP32[r17];r39=HEAP32[r30>>2]+4|0;r38=r44|0;HEAP32[HEAP32[r38>>2]+4>>2]=HEAP32[r39>>2];HEAP32[HEAP32[r39>>2]>>2]=HEAP32[r38>>2];HEAP32[r18]=0;if((r44|0)==(r29|0)){break L1640}else{r66=r44}while(1){r44=HEAP32[r66+4>>2];__ZdlPv(r66);if((r44|0)==(r29|0)){break L1640}else{r66=r44}}}}while(0);HEAP8[r1|0]=0;HEAP32[r8+1]=0;r20=r1+8|0;HEAP8[r20]=0;HEAP8[r20+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}else{HEAP8[r1|0]=0;HEAP32[r8+1]=0;r20=r1+8|0;HEAP8[r20]=0;HEAP8[r20+1|0]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0}}while(0);r8=HEAP32[r15];if((r8|0)==0){STACKTOP=r10;return}HEAP32[r16]=r8;__ZdlPv(r8|0);STACKTOP=r10;return}function __ZN9BarDecode5ean_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iijNS_12directions_tE(r1,r2,r3,r4,r5,r6,r7,r8){var r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66,r67,r68,r69,r70,r71,r72,r73,r74,r75,r76,r77,r78,r79,r80;r9=r1>>2;r10=0;r11=STACKTOP;STACKTOP=STACKTOP+80|0;r12=r4;r4=STACKTOP;STACKTOP=STACKTOP+4|0;HEAP32[r4>>2]=HEAP32[r12>>2];r12=r11;r13=r11+24,r14=r13>>2;r15=r11+32;r16=r11+44,r17=r16>>2;r18=r11+56;r19=r11+68;r20=(r8&4|0)==0;r21=(r8&1|0)==0;r8=(r12|0)>>2;HEAP32[r8]=0;r22=(r12+4|0)>>2;HEAP32[r22]=0;r23=r12+8|0;HEAP32[r23>>2]=0;r24=__Znwj(24);r25=r24;HEAP32[r22]=r25;HEAP32[r8]=r25;HEAP32[r23>>2]=r24+24|0;if((r24|0)==0){r26=0}else{HEAP8[r24]=0;HEAP32[r24+4>>2]=0;r26=r25}r25=r26+8|0;HEAP32[r22]=r25;if((r25|0)==0){r27=0}else{HEAP8[r25|0]=0;HEAP32[r26+12>>2]=0;r27=HEAP32[r22]}r26=r27+8|0;HEAP32[r22]=r26;if((r26|0)==0){r28=0}else{HEAP8[r26|0]=0;HEAP32[r27+12>>2]=0;r28=HEAP32[r22]}HEAP32[r22]=r28+8|0;HEAP32[r12+12>>2]=0;HEAP32[r12+16>>2]=0;r28=r12+20|0;HEAP32[r28>>2]=0;r27=HEAP32[r4>>2];L1759:do{if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r27,r12,2)|0)==2){r4=r12|0;r26=HEAP32[r8];r25=HEAP32[r26+4>>2];r24=HEAP32[r26+12>>2];do{if(r25>>>0<=r24<<1>>>0){if(r25>>>0<(r24>>>0)*.5){break}if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r27,r12,1)|0)!=1){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r26=r1+8|0;HEAP8[r26]=0;HEAP8[r26+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1759}r26=(HEAP32[r28>>2]>>>0)/3;HEAPF64[tempDoublePtr>>3]=r26,HEAP32[r14]=HEAP32[tempDoublePtr>>2],HEAP32[r14+1]=HEAP32[tempDoublePtr+4>>2];if(r26>(Math.floor((r7>>>0)/5)>>>0)*1.35){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r26=r1+8|0;HEAP8[r26]=0;HEAP8[r26+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1759}r26=HEAP8[(__ZN9BarDecode12_GLOBAL__N_117scanner_utilities24get_module_word_adjust_uERKNS_12bar_vector_tERdj(r12,r13,3)&65535)+r2+192|0];r23=r15,r29=r23>>2;HEAP8[r23]=0;r30=r15+1|0;HEAP8[r30]=0;L1773:do{if(r26<<24>>24==1){r31=HEAP32[r8];r32=HEAP32[r22]-r31>>3;do{if(r32>>>0<4){__ZNSt3__16vectorINS_4pairIbjEENS_9allocatorIS2_EEE8__appendEj(r4,4-r32|0)}else{if(r32>>>0<=4){break}HEAP32[r22]=r31+32|0}}while(0);r31=(r15+8|0)>>2;r32=(r15|0)>>2;r33=(r15+4|0)>>2;r34=0;r35=0;r36=0;L1781:while(1){if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r27,r12,4)|0)!=4){r10=1613;break}if((r35|0)==4){if(__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r12,(HEAP32[tempDoublePtr>>2]=HEAP32[r14],HEAP32[tempDoublePtr+4>>2]=HEAP32[r14+1],HEAPF64[tempDoublePtr>>3]),4)<<16>>16!=0){r37=4;r38=0;r10=1649;break}}else if((r35|0)==6){r37=6;r38=1;r10=1649;break}r39=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities24get_module_word_adjust_uERKNS_12bar_vector_tERdj(r12,r13,7);if(r39<<16>>16==0){r10=1619;break}r40=HEAP8[r2+(r39&65535)|0];if(r40<<24>>24==0){r10=1621;break}do{if((r35|0)==0){r41=0;r42=r39;while(1){r43=r42&65535;r44=(r42&65535)>>>1;if(r44<<16>>16==0){break}else{r41=(r43&1)+r41|0;r42=r44}}if((r43+r41&1|0)==0){if(r20){r10=1626;break L1781}else{r45=r36;r46=1;r47=1;break}}else{if(r21){r10=1628;break L1781}else{r10=1629;break}}}else{r10=1629}}while(0);do{if(r10==1629){r10=0;r42=r35+1|0;if((r34&1)<<24>>24!=0){r45=r36;r46=r34;r47=r42;break}r44=r36<<1;r48=0;r49=r39;while(1){r50=r49&65535;r51=(r49&65535)>>>1;if(r51<<16>>16==0){break}else{r48=(r50&1)+r48|0;r49=r51}}r45=r50+r48&1|r44;r46=r34;r47=r42}}while(0);r39=HEAP8[r23];if((r39&1)<<24>>24==0){r52=10;r53=r39}else{r39=HEAP32[r32];r52=(r39&-2)-1|0;r53=r39&255}r39=r53&255;r49=(r39&1|0)==0?r39>>>1:HEAP32[r33];if((r49|0)==(r52|0)){if((r52|0)==-3){r10=1637;break}r39=(r53&1)<<24>>24==0?r30:HEAP32[r31];do{if(r52>>>0<2147483631){r41=r52+1|0;r51=r52<<1;r54=r41>>>0<r51>>>0?r51:r41;if(r54>>>0<11){r55=11;break}r55=r54+16&-16}else{r55=-2}}while(0);r54=__Znwj(r55);_memcpy(r54,r39,r52);if((r52|0)!=10){__ZdlPv(r39)}HEAP32[r31]=r54;r54=r55|1;HEAP32[r32]=r54;r56=r54&255}else{r56=r53}r54=(r56&1)<<24>>24==0?r30:HEAP32[r31];HEAP8[r54+r49|0]=r40;r41=r49+1|0;HEAP8[r54+r41|0]=0;if((HEAP8[r23]&1)<<24>>24==0){HEAP8[r23]=r41<<1&255;r34=r46;r35=r47;r36=r45;continue}else{HEAP32[r33]=r41;r34=r46;r35=r47;r36=r45;continue}}if(r10==1628){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r35=r1+8|0;HEAP8[r35]=0;HEAP8[r35+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break}else if(r10==1613){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r35=r1+8|0;HEAP8[r35]=0;HEAP8[r35+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break}else if(r10==1619){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r35=r1+8|0;HEAP8[r35]=0;HEAP8[r35+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break}else if(r10==1621){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r35=r1+8|0;HEAP8[r35]=0;HEAP8[r35+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break}else if(r10==1637){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r10==1626){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r35=r1+8|0;HEAP8[r35]=0;HEAP8[r35+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break}else if(r10==1649){if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r27,r12,1)|0)!=1){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r35=r1+8|0;HEAP8[r35]=0;HEAP8[r35+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break}r35=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities24get_module_word_adjust_uERKNS_12bar_vector_tERdj(r12,r13,5);do{if(r35<<16>>16!=0){if(HEAP8[(r35&65535)+r2+192|0]<<24>>24!=2){break}if(!((r37|0)==6|(r37|0)==4)){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r41=r1+8|0;HEAP8[r41]=0;HEAP8[r41+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1773}r41=(r34&1)<<24>>24!=0;r54=r36;r51=0;while(1){if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r27,r12,4)|0)!=4){r10=1661;break}r57=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities24get_module_word_adjust_uERKNS_12bar_vector_tERdj(r12,r13,7);if(r57<<16>>16==0){r10=1664;break}r58=r57&65535;if(r41){r59=r58&63^63}else{r59=r58}r58=HEAP8[r2+r59|0];if(r58<<24>>24==0){r10=1668;break}r60=HEAP8[r23];if((r60&1)<<24>>24==0){r61=10;r62=r60}else{r60=HEAP32[r32];r61=(r60&-2)-1|0;r62=r60&255}r60=r62&255;r63=(r60&1|0)==0?r60>>>1:HEAP32[r33];if((r63|0)==(r61|0)){if((r61|0)==-3){r10=1673;break}r60=(r62&1)<<24>>24==0?r30:HEAP32[r31];do{if(r61>>>0<2147483631){r64=r61+1|0;r65=r61<<1;r66=r64>>>0<r65>>>0?r65:r64;if(r66>>>0<11){r67=11;break}r67=r66+16&-16}else{r67=-2}}while(0);r42=__Znwj(r67);_memcpy(r42,r60,r61);if((r61|0)!=10){__ZdlPv(r60)}HEAP32[r31]=r42;r42=r67|1;HEAP32[r32]=r42;r68=r42&255}else{r68=r62}r42=(r68&1)<<24>>24==0?r30:HEAP32[r31];HEAP8[r42+r63|0]=r58;r44=r63+1|0;HEAP8[r42+r44|0]=0;if((HEAP8[r23]&1)<<24>>24==0){HEAP8[r23]=r44<<1&255}else{HEAP32[r33]=r44}if(r41){r44=(r54&65535)>>>1;r42=r57&63;if(r42<<16>>16==63){r69=0}else{r48=0;r66=r42^63;while(1){r70=r66&65535;r42=(r66&65535)>>>1;if(r42<<16>>16==0){break}else{r48=(r70&1)+r48|0;r66=r42}}r69=(r70+r48&1|0)!=0}r71=(r69&1)<<5^32|r44}else{r71=r54}r66=r51+1|0;if(r66>>>0<r37>>>0){r54=r71;r51=r66}else{r10=1692;break}}if(r10==1664){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r51=r1+8|0;HEAP8[r51]=0;HEAP8[r51+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1773}else if(r10==1692){if((__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r3,r27,r12,3)|0)!=3){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r51=r1+8|0;HEAP8[r51]=0;HEAP8[r51+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1773}r51=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities24get_module_word_adjust_uERKNS_12bar_vector_tERdj(r12,r13,3);if(r51<<16>>16==0){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r54=r1+8|0;HEAP8[r54]=0;HEAP8[r54+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1773}r54=HEAP8[(r51&65535)+r2+192|0];if(r54<<24>>24==4){___assert_func(5252216,232,5257816,5252160)}else if(r54<<24>>24!=1){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r54=r1+8|0;HEAP8[r54]=0;HEAP8[r54+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1773}do{if((r34&1)<<24>>24!=0){r54=HEAP8[r23];r51=(r54&1)<<24>>24==0;r41=r54&255;r54=(r51?r30:HEAP32[r31])+((r41&1|0)==0?r41>>>1:HEAP32[r33])|0;r41=r51?r30:HEAP32[r31];r51=r54;r49=r51-r41|0;if((r49|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r49>>>0<11){HEAP8[r16]=r49<<1&255;r72=r16+1|0}else{r40=r49+16&-16;r39=__Znwj(r40);HEAP32[r17+2]=r39;HEAP32[r17]=r40|1;HEAP32[r17+1]=r49;r72=r39}L1908:do{if((r54|0)==(r41|0)){r73=r72}else{r39=r72;r49=r51;r40=r54;while(1){HEAP8[r39]=HEAP8[r49-1|0];r66=r40-1|0;r57=r39+1|0;if((r66|0)==(r41|0)){r73=r57;break L1908}else{r39=r57;r49=r66;r40=r66}}}}while(0);HEAP8[r73]=0;__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r15,r16);if((HEAP8[r16]&1)<<24>>24==0){break}__ZdlPv(HEAP32[r17+2])}}while(0);do{if(r38){r41=HEAP8[(r71&65535)+r2+128|0];if(r41<<24>>24==48){r74=4;break}else if(r41<<24>>24==0){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r54=r1+8|0;HEAP8[r54]=0;HEAP8[r54+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1773}r54=r19;r51=r19;HEAP8[r51]=2;_memset(r54+1|0,r41,1);HEAP8[r54+2|0]=0;__ZNSt3__1plIcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EERKS9_SB_(r18,r19,r15);__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r15,r18);if((HEAP8[r18]&1)<<24>>24!=0){__ZdlPv(HEAP32[r18+8>>2])}if((HEAP8[r51]&1)<<24>>24==0){r74=2;break}__ZdlPv(HEAP32[r19+8>>2]);r74=2}else{r74=1}}while(0);r51=HEAP8[r23];r54=r51&255;r41=(r54&1|0)==0;r44=(r51&1)<<24>>24==0;r51=(HEAP8[(r44?r30:HEAP32[r31])+((r41?r54>>>1:HEAP32[r33])-1)|0]<<24>>24)-48|0;if(r41){r75=r54>>>1;r76=r54>>>1}else{r54=HEAP32[r33];r75=r54;r76=r54}r54=r76-1|0;if(r75>>>0<r54>>>0){__ZNKSt3__121__basic_string_commonILb1EE20__throw_out_of_rangeEv(0)}if(r44){HEAP8[r23]=r54<<1&255;r77=r30}else{r44=HEAP32[r31];HEAP32[r33]=r54;r77=r44}HEAP8[r77+r54|0]=0;r54=HEAP8[r23];r44=r54&255;r41=(r44&1|0)==0?r44>>>1:HEAP32[r33];if((r41|0)>0){r44=(r54&1)<<24>>24==0;r48=HEAP32[r31];r40=0;r49=3;r39=r41;while(1){r41=r39-1|0;r78=Math.imul((HEAP8[(r44?r30:r48)+r41|0]<<24>>24)-48|0,r49)+r40|0;if((r41|0)>0){r40=r78;r49=(r49|0)==1?3:1;r39=r41}else{break}}r79=(r78|0)%10}else{r79=0}r39=r1|0;if((10-r79|0)!=(r51|0)){HEAP8[r39]=0;HEAP32[r9+1]=0;r49=r1+8|0;HEAP8[r49]=0;HEAP8[r49+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1773}HEAP8[r39]=1;HEAP32[r9+1]=r74;r39=r1+8|0;if((r54&1)<<24>>24==0){r49=r39>>2;HEAP32[r49]=HEAP32[r29];HEAP32[r49+1]=HEAP32[r29+1];HEAP32[r49+2]=HEAP32[r29+2]}else{r49=HEAP32[r31];r40=HEAP32[r33];if((r40|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r40>>>0<11){HEAP8[r39]=r40<<1&255;r80=r39+1|0}else{r48=r40+16&-16;r44=__Znwj(r48);HEAP32[r9+4]=r44;HEAP32[r39>>2]=r48|1;HEAP32[r9+3]=r40;r80=r44}_memcpy(r80,r49,r40);HEAP8[r80+r40|0]=0}HEAP32[r9+5]=r5;HEAP32[r9+6]=r6;break L1773}else if(r10==1661){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r40=r1+8|0;HEAP8[r40]=0;HEAP8[r40+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1773}else if(r10==1668){HEAP8[r1|0]=0;HEAP32[r9+1]=0;r40=r1+8|0;HEAP8[r40]=0;HEAP8[r40+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break L1773}else if(r10==1673){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}}}while(0);HEAP8[r1|0]=0;HEAP32[r9+1]=0;r33=r1+8|0;HEAP8[r33]=0;HEAP8[r33+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0;break}}else{HEAP8[r1|0]=0;HEAP32[r9+1]=0;r33=r1+8|0;HEAP8[r33]=0;HEAP8[r33+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0}}while(0);if((HEAP8[r23]&1)<<24>>24==0){break L1759}__ZdlPv(HEAP32[r15+8>>2]);break L1759}}while(0);HEAP8[r1|0]=0;HEAP32[r9+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0}else{HEAP8[r1|0]=0;HEAP32[r9+1]=0;r4=r1+8|0;HEAP8[r4]=0;HEAP8[r4+1|0]=0;HEAP32[r9+5]=0;HEAP32[r9+6]=0}}while(0);r9=HEAP32[r8];if((r9|0)==0){STACKTOP=r11;return}HEAP32[r22]=r9;__ZdlPv(r9|0);STACKTOP=r11;return}function __ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18;r5=0;r6=r3|0;r7=(r3+4|0)>>2;r8=(r3|0)>>2;r9=HEAP32[r8];r10=HEAP32[r7]-r9>>3;do{if(r10>>>0<r4>>>0){__ZNSt3__16vectorINS_4pairIbjEENS_9allocatorIS2_EEE8__appendEj(r6,r4-r10|0)}else{if(r10>>>0<=r4>>>0){break}HEAP32[r7]=(r4<<3)+r9|0}}while(0);r9=(r3+12|0)>>2;HEAP32[r9]=0;r10=(r3+16|0)>>2;HEAP32[r10]=0;do{if((r4|0)==0){r11=0;r12=0}else{r13=r1|0;r14=0;while(1){r15=HEAP32[r13>>2];if((r15|0)==(r2|0)){break}r16=HEAP32[r8];r17=r15+8|0;HEAP32[r13>>2]=r17;HEAP8[(r14<<3)+r16|0]=HEAP8[r17|0]&1;HEAP32[r16+(r14<<3)+4>>2]=HEAP32[r15+12>>2];r15=HEAP32[r8];r16=HEAP32[r15+(r14<<3)+4>>2];if((HEAP8[(r14<<3)+r15|0]&1)<<24>>24==0){HEAP32[r10]=HEAP32[r10]+r16|0}else{HEAP32[r9]=HEAP32[r9]+r16|0}r16=r14+1|0;if(r16>>>0<r4>>>0){r14=r16}else{r5=1788;break}}if(r5==1788){r11=HEAP32[r9];r12=HEAP32[r10];break}r13=HEAP32[r8];r16=HEAP32[r7]-r13>>3;do{if(r16>>>0<r14>>>0){__ZNSt3__16vectorINS_4pairIbjEENS_9allocatorIS2_EEE8__appendEj(r6,r14-r16|0)}else{if(r16>>>0<=r14>>>0){break}HEAP32[r7]=(r14<<3)+r13|0}}while(0);HEAP32[r3+20>>2]=HEAP32[r10]+HEAP32[r9]|0;r18=r14;return r18}}while(0);HEAP32[r3+20>>2]=r12+r11|0;r18=r4;return r18}function __ZN9BarDecode12_GLOBAL__N_117scanner_utilities8add_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21;r5=r3|0;r6=(r3+4|0)>>2;r7=(r3|0)>>2;r8=HEAP32[r7];r9=HEAP32[r6]-r8>>3;r10=_llvm_uadd_with_overflow_i32(r9,r4);r11=tempRet0;r12=r10;do{if(r9>>>0<r12>>>0){__ZNSt3__16vectorINS_4pairIbjEENS_9allocatorIS2_EEE8__appendEj(r5,r4)}else{if(!r11){break}HEAP32[r6]=(r12<<3)+r8|0}}while(0);L2006:do{if((r4|0)==0){r13=r3+12|0;r14=r3+16|0}else{r8=r1|0;r12=r3+16|0,r11=r12>>2;r10=r3+12|0,r15=r10>>2;r16=0;while(1){r17=HEAP32[r8>>2];r18=r16+r9|0;if((r17|0)==(r2|0)){break}r19=HEAP32[r7];r20=r17+8|0;HEAP32[r8>>2]=r20;HEAP8[(r18<<3)+r19|0]=HEAP8[r20|0]&1;HEAP32[r19+(r18<<3)+4>>2]=HEAP32[r17+12>>2];r17=HEAP32[r7];r19=HEAP32[r17+(r18<<3)+4>>2];if((HEAP8[(r18<<3)+r17|0]&1)<<24>>24==0){HEAP32[r11]=HEAP32[r11]+r19|0}else{HEAP32[r15]=HEAP32[r15]+r19|0}r19=r16+1|0;if(r19>>>0<r4>>>0){r16=r19}else{r13=r10;r14=r12;break L2006}}r12=HEAP32[r7];r10=HEAP32[r6]-r12>>3;do{if(r10>>>0<r18>>>0){__ZNSt3__16vectorINS_4pairIbjEENS_9allocatorIS2_EEE8__appendEj(r5,r18-r10|0)}else{if(r10>>>0<=r18>>>0){break}HEAP32[r6]=(r18<<3)+r12|0}}while(0);HEAP32[r3+20>>2]=HEAP32[r11]+HEAP32[r15]|0;r21=r16;return r21}}while(0);HEAP32[r3+20>>2]=HEAP32[r14>>2]+HEAP32[r13>>2]|0;r21=r4;return r21}function __ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26;r4=(r1+4|0)>>2;r5=HEAP32[r4];r6=(r1|0)>>2;r1=HEAP32[r6];L2026:do{if((r5|0)==(r1|0)){r7=0;r8=0;r9=r5;r10=r5}else{r11=0;r12=0;r13=0;r14=r1;while(1){r15=_round((HEAP32[r14+(r13<<3)+4>>2]>>>0)/r2);r16=r15+r11|0;if(!(r15>>>0<5&(r15|0)!=0)){r17=0;break}r18=(r12&65535)<<r15;r19=r18&65535;r20=HEAP32[r6];do{if((HEAP8[(r13<<3)+r20|0]&1)<<24>>24==0){r21=r19;r22=r20}else{if((r15|0)==1){r21=(r18|1)&65535;r22=r20;break}else if((r15|0)==2){r21=(r18|3)&65535;r22=r20;break}else if((r15|0)==3){r21=(r18|7)&65535;r22=r20;break}else if((r15|0)==4){r21=(r18|15)&65535;r22=r20;break}else{___assert_func(5252108,153,5258428,5250804);r21=r19;r22=HEAP32[r6];break}}}while(0);r19=r13+1|0;r20=HEAP32[r4];if(r19>>>0<r20-r22>>3>>>0){r11=r16;r12=r21;r13=r19;r14=r22}else{r7=r16;r8=r21;r9=r20;r10=r22;break L2026}}return r17}}while(0);if((r7|0)!=(r3|0)){r17=0;return r17}if((r9|0)==(r10|0)){r17=r8;return r17}else{r23=0;r24=0;r25=r10}while(1){r26=_round((HEAP32[r25+(r24<<3)+4>>2]>>>0)/r2)+r23|0;r10=r24+1|0;r9=HEAP32[r6];if(r10>>>0<HEAP32[r4]-r9>>3>>>0){r23=r26;r24=r10;r25=r9}else{break}}if(r26>>>0<17){r17=r8;return r17}___assert_func(5252108,159,5258428,5252016);r17=r8;return r17}function __ZN9BarDecode12_GLOBAL__N_117scanner_utilities24get_module_word_adjust_uERKNS_12bar_vector_tERdj(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31;r4=r2>>2;r2=STACKTOP;STACKTOP=STACKTOP+48|0;r5=r2,r6=r5>>2;r7=r2+24,r8=r7>>2;r9=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r1,(HEAP32[tempDoublePtr>>2]=HEAP32[r4],HEAP32[tempDoublePtr+4>>2]=HEAP32[r4+1],HEAPF64[tempDoublePtr>>3]),r3);if(r9<<16>>16!=0){r10=r9;STACKTOP=r2;return r10}r9=(r1+20|0)>>2;r11=(HEAP32[r9]>>>0)/(r3>>>0);r12=(HEAP32[tempDoublePtr>>2]=HEAP32[r4],HEAP32[tempDoublePtr+4>>2]=HEAP32[r4+1],HEAPF64[tempDoublePtr>>3]);do{if(r11!=r12){if(Math.abs(r11-r12)>r12*.4){r10=0;STACKTOP=r2;return r10}r13=(r11*2+r12)/3;HEAPF64[tempDoublePtr>>3]=r13,HEAP32[r4]=HEAP32[tempDoublePtr>>2],HEAP32[r4+1]=HEAP32[tempDoublePtr+4>>2];r14=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r1,r13,r3);if(r14<<16>>16==0){r15=(HEAP32[tempDoublePtr>>2]=HEAP32[r4],HEAP32[tempDoublePtr+4>>2]=HEAP32[r4+1],HEAPF64[tempDoublePtr>>3]);break}else{r10=r14;STACKTOP=r2;return r10}}else{r15=r12}}while(0);r12=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r1,r15*.75,r3);if(r12<<16>>16!=0){r10=r12;STACKTOP=r2;return r10}r12=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r1,(HEAP32[tempDoublePtr>>2]=HEAP32[r4],HEAP32[tempDoublePtr+4>>2]=HEAP32[r4+1],HEAPF64[tempDoublePtr>>3])*1.25,r3);if(r12<<16>>16!=0){r10=r12;STACKTOP=r2;return r10}r12=(r5|0)>>2;HEAP32[r12]=0;r15=(r5+4|0)>>2;HEAP32[r15]=0;r11=r5+8|0;HEAP32[r11>>2]=0;r14=(r1+4|0)>>2;r13=(r1|0)>>2;r16=HEAP32[r14]-HEAP32[r13]|0;r17=r16>>3;L2072:do{if((r17|0)==0){r18=0;r19=0}else{if(r17>>>0>536870911){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}r20=__Znwj(r16);HEAP32[r15]=r20;HEAP32[r12]=r20;HEAP32[r11>>2]=(r17<<3)+r20|0;r21=HEAP32[r13];r22=HEAP32[r14];if((r21|0)==(r22|0)){r18=r20;r19=r20;break}else{r23=r21;r24=r20}while(1){if((r24|0)==0){r25=0}else{HEAP8[r24|0]=HEAP8[r23|0]&1;HEAP32[r24+4>>2]=HEAP32[r23+4>>2];r25=r24}r21=r25+8|0;HEAP32[r15]=r21;r26=r23+8|0;if((r26|0)==(r22|0)){r18=r21;r19=r20;break L2072}else{r23=r26;r24=r21}}}}while(0);r24=r1+12|0;HEAP32[r6+3]=HEAP32[r24>>2];r23=r1+16|0;HEAP32[r6+4]=HEAP32[r23>>2];HEAP32[r6+5]=HEAP32[r9];L2083:do{if((r18|0)!=(r19|0)){r6=r18-r19>>3;r1=0;while(1){r25=(r1<<3)+r19+4|0;HEAP32[r25>>2]=HEAP32[r25>>2]+((HEAP8[(r1<<3)+r19|0]&1)<<24>>24==0?-1:1)|0;r25=r1+1|0;if(r25>>>0<r6>>>0){r1=r25}else{break L2083}}}}while(0);r19=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r5,(HEAP32[tempDoublePtr>>2]=HEAP32[r4],HEAP32[tempDoublePtr+4>>2]=HEAP32[r4+1],HEAPF64[tempDoublePtr>>3]),r3);r5=HEAP32[r12];if((r5|0)!=0){HEAP32[r15]=r5;__ZdlPv(r5|0)}if(r19<<16>>16!=0){r10=r19;STACKTOP=r2;return r10}r19=(r7|0)>>2;HEAP32[r19]=0;r5=(r7+4|0)>>2;HEAP32[r5]=0;r15=r7+8|0;HEAP32[r15>>2]=0;r12=HEAP32[r14]-HEAP32[r13]|0;r18=r12>>3;L2095:do{if((r18|0)==0){r27=0;r28=0}else{if(r18>>>0>536870911){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}r1=__Znwj(r12);HEAP32[r5]=r1;HEAP32[r19]=r1;HEAP32[r15>>2]=(r18<<3)+r1|0;r6=HEAP32[r13];r25=HEAP32[r14];if((r6|0)==(r25|0)){r27=r1;r28=r1;break}else{r29=r6;r30=r1}while(1){if((r30|0)==0){r31=0}else{HEAP8[r30|0]=HEAP8[r29|0]&1;HEAP32[r30+4>>2]=HEAP32[r29+4>>2];r31=r30}r6=r31+8|0;HEAP32[r5]=r6;r17=r29+8|0;if((r17|0)==(r25|0)){r27=r6;r28=r1;break L2095}else{r29=r17;r30=r6}}}}while(0);HEAP32[r8+3]=HEAP32[r24>>2];HEAP32[r8+4]=HEAP32[r23>>2];HEAP32[r8+5]=HEAP32[r9];L2106:do{if((r27|0)!=(r28|0)){r9=r27-r28>>3;r8=0;while(1){r23=(r8<<3)+r28+4|0;HEAP32[r23>>2]=HEAP32[r23>>2]+((HEAP8[(r8<<3)+r28|0]&1)<<24>>24==0?1:-1)|0;r23=r8+1|0;if(r23>>>0<r9>>>0){r8=r23}else{break L2106}}}}while(0);r28=__ZN9BarDecode12_GLOBAL__N_117scanner_utilities15get_module_wordERKNS_12bar_vector_tEdj(r7,(HEAP32[tempDoublePtr>>2]=HEAP32[r4],HEAP32[tempDoublePtr+4>>2]=HEAP32[r4+1],HEAPF64[tempDoublePtr>>3]),r3);r3=HEAP32[r19];if((r3|0)==0){r10=r28;STACKTOP=r2;return r10}HEAP32[r5]=r3;__ZdlPv(r3|0);r10=r28;STACKTOP=r2;return r10}function __ZNSt3__1plIcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EERKS9_SB_(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12;r4=r1,r5=r4>>2;HEAP32[r5]=0;HEAP32[r5+1]=0;HEAP32[r5+2]=0;r5=HEAP8[r2];r6=r5&255;if((r6&1|0)==0){r7=r6>>>1}else{r7=HEAP32[r2+4>>2]}r6=r3;r8=HEAPU8[r6];if((r8&1|0)==0){r9=r8>>>1}else{r9=HEAP32[r3+4>>2]}if((r5&1)<<24>>24==0){r10=r2+1|0}else{r10=HEAP32[r2+8>>2]}r2=r9+r7|0;if((r2|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r2>>>0<11){HEAP8[r4]=r7<<1&255;r11=r1+1|0}else{r4=r2+16&-16;r2=__Znwj(r4);HEAP32[r1+8>>2]=r2;HEAP32[r1>>2]=r4|1;HEAP32[r1+4>>2]=r7;r11=r2}_memcpy(r11,r10,r7);HEAP8[r11+r7|0]=0;if((HEAP8[r6]&1)<<24>>24==0){r12=r3+1|0}else{r12=HEAP32[r3+8>>2]}__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcj(r1,r12,r9);return}function __ZNSt3__114__split_bufferINS_4pairIbjEERNS_9allocatorIS2_EEE10push_frontERKS2_(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28;r3=(r1+4|0)>>2;r4=HEAP32[r3];r5=r4;r6=(r1|0)>>2;do{if((r4|0)==(HEAP32[r6]|0)){r7=(r1+8|0)>>2;r8=HEAP32[r7];r9=r1+12|0;r10=HEAP32[r9>>2];r11=r10;if(r8>>>0<r10>>>0){r10=(r11-r8+8>>3|0)/2&-1;r12=(r10<<3)+r8|0;if((r4|0)==(r8|0)){r13=r12;r14=r4}else{r15=r10-1-((r8-8+ -r5|0)>>>3)|0;r16=r12;r12=r8;while(1){r17=r16-8|0;r18=r12-8|0;HEAP8[r17|0]=HEAP8[r18|0]&1;HEAP32[r16-8+4>>2]=HEAP32[r12-8+4>>2];if((r4|0)==(r18|0)){break}else{r16=r17;r12=r18}}r13=(r15<<3)+r8|0;r14=HEAP32[r7]}HEAP32[r3]=r13;HEAP32[r7]=(r10<<3)+r14|0;r19=r13;break}r12=r11-r5>>2;r16=(r12|0)==0?1:r12;r12=__Znwj(r16<<3);r18=((r16+3|0)>>>2<<3)+r12|0;r17=(r16<<3)+r12|0;r16=HEAP32[r3];r20=HEAP32[r7];L2155:do{if((r16|0)==(r20|0)){r21=r18}else{r22=r16;r23=r18;while(1){if((r23|0)==0){r24=0}else{HEAP8[r23|0]=HEAP8[r22|0]&1;HEAP32[r23+4>>2]=HEAP32[r22+4>>2];r24=r23}r25=r24+8|0;r26=r22+8|0;if((r26|0)==(r20|0)){r21=r25;break L2155}else{r22=r26;r23=r25}}}}while(0);r20=HEAP32[r6];HEAP32[r6]=r12;HEAP32[r3]=r18;HEAP32[r7]=r21;HEAP32[r9>>2]=r17;if((r20|0)==0){r19=r18;break}__ZdlPv(r20|0);r19=HEAP32[r3]}else{r19=r4}}while(0);r4=r19-8|0;if((r4|0)==0){r27=r19;r28=r27-8|0;HEAP32[r3]=r28;return}HEAP8[r4]=HEAP8[r2|0]&1;HEAP32[r4+4>>2]=HEAP32[r2+4>>2];r27=HEAP32[r3];r28=r27-8|0;HEAP32[r3]=r28;return}function __ZN9BarDecode12_GLOBAL__N_117scanner_utilities23reverse_get_module_wordERKNS_12bar_vector_tEdj(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19;r3=0;r4=(r1+4|0)>>2;r5=(r1|0)>>2;r1=HEAP32[r5];r6=HEAP32[r4]-r1|0;if((r6|0)<=0){r7=0;return r7}r8=0;r9=0;r10=r6>>3;r6=r1;while(1){r1=r10-1|0;r11=_round((HEAP32[r6+(r1<<3)+4>>2]>>>0)/r2);r12=r11+r8|0;if(!(r11>>>0<5&(r11|0)!=0)){r7=0;r3=1948;break}r13=(r9&65535)<<r11;r14=r13&65535;do{if((HEAP8[(r1<<3)+HEAP32[r5]|0]&1)<<24>>24==0){r15=r14}else{if((r11|0)==3){r15=(r13|7)&65535;break}else if((r11|0)==4){r15=(r13|15)&65535;break}else if((r11|0)==1){r15=(r13|1)&65535;break}else if((r11|0)==2){r15=(r13|3)&65535;break}else{___assert_func(5252108,180,5258288,5250804);r15=r14;break}}}while(0);if((r1|0)<=0){break}r8=r12;r9=r15;r10=r1;r6=HEAP32[r5]}if(r3==1948){return r7}if((r12|0)!=11){r7=0;return r7}r12=HEAP32[r5];if((HEAP32[r4]|0)==(r12|0)){r7=r15;return r7}else{r16=0;r17=0;r18=r12}while(1){r19=_round((HEAP32[r18+(r17<<3)+4>>2]>>>0)/r2)+r16|0;r12=r17+1|0;r3=HEAP32[r5];if(r12>>>0<HEAP32[r4]-r3>>3>>>0){r16=r19;r17=r12;r18=r3}else{break}}if(r19>>>0<17){r7=r15;return r7}___assert_func(5252108,186,5258288,5252016);r7=r15;return r7}function __ZNSt3__16vectorINS_4pairIbjEENS_9allocatorIS2_EEE8__appendEj(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+20|0;r5=r4;r6=r1+8|0;r7=(r1+4|0)>>2;r8=HEAP32[r7];r9=HEAP32[r6>>2];r10=r8;if(r9-r10>>3>>>0>=r2>>>0){r11=r2;r12=r8;while(1){if((r12|0)==0){r13=0}else{HEAP8[r12|0]=0;HEAP32[r12+4>>2]=0;r13=HEAP32[r7]}r8=r13+8|0;HEAP32[r7]=r8;r14=r11-1|0;if((r14|0)==0){break}else{r11=r14;r12=r8}}STACKTOP=r4;return}r12=r6;r6=(r1|0)>>2;r11=HEAP32[r6];r13=r10-r11>>3;r10=r13+r2|0;if(r10>>>0>536870911){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}r8=r9-r11|0;do{if(r8>>3>>>0>268435454){r11=r5+12|0;HEAP32[r11>>2]=0;HEAP32[r5+16>>2]=r12;r15=536870911;r16=r11;r3=1958;break}else{r11=r8>>2;r9=r11>>>0<r10>>>0?r10:r11;r11=r5+12|0;HEAP32[r11>>2]=0;HEAP32[r5+16>>2]=r12;if((r9|0)==0){r17=0;r18=0;r19=r11,r20=r19>>2;break}else{r15=r9;r16=r11;r3=1958;break}}}while(0);if(r3==1958){r17=__Znwj(r15<<3);r18=r15;r19=r16,r20=r19>>2}r19=r5|0;HEAP32[r19>>2]=r17;r16=(r13<<3)+r17|0;r13=(r5+8|0)>>2;HEAP32[r13]=r16;r15=(r5+4|0)>>2;HEAP32[r15]=r16;HEAP32[r20]=(r18<<3)+r17|0;r17=r2;r2=r16;while(1){if((r2|0)==0){r21=0}else{HEAP8[r2|0]=0;HEAP32[r2+4>>2]=0;r21=HEAP32[r13]}r22=r21+8|0;HEAP32[r13]=r22;r18=r17-1|0;if((r18|0)==0){break}else{r17=r18;r2=r22}}r2=HEAP32[r7];r17=HEAP32[r6];if(r17>>>0<r2>>>0){r21=r2;while(1){r18=r21-8|0;__ZNSt3__114__split_bufferINS_4pairIbjEERNS_9allocatorIS2_EEE10push_frontERKS2_(r5,r18);r23=HEAP32[r6];if(r23>>>0<r18>>>0){r21=r18}else{break}}r24=r23;r25=HEAP32[r15];r26=HEAP32[r7];r27=HEAP32[r13]}else{r24=r17;r25=r16;r26=r2;r27=r22}HEAP32[r6]=r25;HEAP32[r15]=r24;HEAP32[r7]=r27;HEAP32[r13]=r26;r26=r1+8|0;r1=HEAP32[r26>>2];HEAP32[r26>>2]=HEAP32[r20];HEAP32[r20]=r1;HEAP32[r19>>2]=r24;HEAP32[r13]=r24;if((r24|0)==0){STACKTOP=r4;return}__ZdlPv(r24|0);STACKTOP=r4;return}function __ZNK9BarDecode9code25i_t16reverse_get_keysERKNS_12bar_vector_tE(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18;r2=r1>>1;r1=0;r4=r3|0;r5=HEAP32[r4>>2];if((HEAP32[r3+4>>2]-r5|0)==80){r6=r5}else{___assert_func(5251720,118,5257052,5251616);r6=HEAP32[r4>>2]}r4=HEAP32[r3+12>>2]>>>0;r5=r4/15;r7=r4/5.3;r8=r4/5.2;r9=r4/1.5;r4=HEAP32[r3+16>>2]>>>0;r3=r4/15;r10=r4/5.3;r11=r4/5.2;r12=r4/1.5;r4=0;r13=0;r14=9;while(1){r15=r4<<1;r16=HEAP32[r6+(r14<<3)+4>>2]>>>0;if(r8>r16|r16>r9){if(r5>r16|r16>r7){r1=1982;break}else{r17=r15}}else{r17=r15|1}r15=r13<<1;r16=HEAP32[r6+(r14-1<<3)+4>>2]>>>0;if(r11>r16|r16>r12){if(r3>r16|r16>r10){r1=1986;break}else{r18=r15}}else{r18=r15|1}r15=r14-2|0;if((r15|0)>-1){r4=r17;r13=r18;r14=r15}else{r1=1988;break}}if(r1==1982){HEAP16[r2]=0;HEAP16[r2+1]=0;return}else if(r1==1986){HEAP16[r2]=0;HEAP16[r2+1]=0;return}else if(r1==1988){HEAP16[r2]=r18;HEAP16[r2+1]=r17;return}}function __ZNK9BarDecode9code25i_t8get_keysERKNS_12bar_vector_tE(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18;r2=r1>>1;r1=0;r4=r3|0;r5=HEAP32[r4>>2];if((HEAP32[r3+4>>2]-r5|0)==80){r6=r5}else{___assert_func(5251720,77,5256832,5251616);r6=HEAP32[r4>>2]}r4=HEAP32[r3+12>>2]>>>0;r5=r4/15;r7=r4/5.3;r8=r4/5.2;r9=r4/1.5;r4=HEAP32[r3+16>>2]>>>0;r3=r4/15;r10=r4/5.3;r11=r4/5.2;r12=r4/1.5;r4=0;r13=0;r14=0;while(1){r15=r4<<1;r16=HEAP32[r6+(r14<<3)+4>>2]>>>0;if(r8>r16|r16>r9){if(r5>r16|r16>r7){r1=1999;break}else{r17=r15}}else{r17=r15|1}r15=r13<<1;r16=HEAP32[r6+((r14|1)<<3)+4>>2]>>>0;if(r11>r16|r16>r12){if(r3>r16|r16>r10){r1=2003;break}else{r18=r15}}else{r18=r15|1}r15=r14+2|0;if(r15>>>0<10){r4=r17;r13=r18;r14=r15}else{r1=2005;break}}if(r1==1999){HEAP16[r2]=0;HEAP16[r2+1]=0;return}else if(r1==2005){HEAP16[r2]=r17;HEAP16[r2+1]=r18;return}else if(r1==2003){HEAP16[r2]=0;HEAP16[r2+1]=0;return}}function __ZNK9BarDecode9code128_t15decode_key_listERKNSt3__14listItNS1_9allocatorItEEEEii(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66,r67,r68,r69;r6=0;r7=STACKTOP;STACKTOP=STACKTOP+36|0;r8=r7;r9=r7+12;r10=r7+24;r11=HEAP32[r3+4>>2];r12=HEAP8[r2+HEAPU16[r11+8>>1]|0]<<24>>24;r13=r9,r14=r13>>2;HEAP8[r13]=0;r15=r9+1|0;HEAP8[r15]=0;r16=r3|0;r3=r10;r17=r1|0;r18=(r1+4|0)>>2;r19=r1+8|0;r20=r19,r21=r20>>2;r22=r19+1|0;r23=(r1+20|0)>>2;r24=(r1+24|0)>>2;r25=(r10+8|0)>>2;r26=r10+1|0;r27=(r10+4|0)>>2;r28=(r9+8|0)>>2;r29=r9|0;r30=(r9+4|0)>>2;r31=r8;r32=r8|0;r33=r8+4|0;r34=r8+8|0;r8=r12;r12=0;r35=0;r36=16;r37=0;r38=r11;L2277:while(1){if((r38|0)==(HEAP32[r16>>2]|0)){r6=2072;break}r11=r38+8|0;do{if((r35&1)<<24>>24==0){r39=r12}else{if((r12|0)==1){r39=0;break}else if((r12|0)==0){r39=1;break}else{r39=r12;break}}}while(0);__ZNK9BarDecode9code128_t9decode128ENS0_10code_set_tEt(r10,r2,r39,HEAP16[r11>>1]);r40=HEAP8[r3];r41=r40&255;r42=(r41&1|0)==0;r43=r42?r41>>>1:HEAP32[r27];do{if((r43|0)==1){r44=(r40&1)<<24>>24==0;r45=HEAP8[r44?r26:HEAP32[r25]]<<24>>24;if((r45|0)==0){if((r37|0)==1){r46=r12;r47=0;r48=32;r6=2067;break}r49=HEAP8[r13];if((r49&1)<<24>>24==0){r50=10;r51=r49}else{r49=HEAP32[r29>>2];r50=(r49&-2)-1|0;r51=r49&255}r49=r51&255;r52=(r49&1|0)==0?r49>>>1:HEAP32[r30];if((r52|0)==(r50|0)){if((r50|0)==-3){r6=2037;break L2277}r49=(r51&1)<<24>>24==0?r15:HEAP32[r28];do{if(r50>>>0<2147483631){r53=r50+1|0;r54=r50<<1;r55=r53>>>0<r54>>>0?r54:r53;if(r55>>>0<11){r56=11;break}r56=r55+16&-16}else{r56=-2}}while(0);r55=__Znwj(r56);_memcpy(r55,r49,r50);if((r50|0)!=10){__ZdlPv(r49)}HEAP32[r28]=r55;r55=r56|1;HEAP32[r29>>2]=r55;r57=r55&255}else{r57=r51}r55=(r57&1)<<24>>24==0?r15:HEAP32[r28];HEAP8[r55+r52|0]=29;r53=r52+1|0;HEAP8[r55+r53|0]=0;if((HEAP8[r13]&1)<<24>>24==0){HEAP8[r13]=r53<<1&255;r46=r12;r47=0;r48=r36;r6=2067;break}else{HEAP32[r30]=r53;r46=r12;r47=0;r48=r36;r6=2067;break}}else if((r45|0)==10|(r45|0)==7){r46=2;r47=0;r48=r36;r6=2067;break}else if((r45|0)==4){r46=r12;r47=1;r48=r36;r6=2067;break}else if((r45|0)==9|(r45|0)==6){r46=1;r47=0;r48=r36;r6=2067;break}else if((r45|0)==1|(r45|0)==2|(r45|0)==3){r53=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5251900);r55=HEAP32[r53+HEAP32[HEAP32[r53>>2]-12>>2]+28>>2],r54=r55>>2;r58=(r55+4|0)>>2;tempValue=HEAP32[r58],HEAP32[r58]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r32>>2]=5270024;HEAP32[r33>>2]=48;HEAP32[r34>>2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r31,766)}r59=HEAP32[1317507]-1|0;r60=HEAP32[r54+5];if(HEAP32[r54+6]-r60>>2>>>0<=r59>>>0){r6=2054;break L2277}r61=HEAP32[r60+(r59<<2)>>2];if((r61|0)==0){r6=2054;break L2277}r59=FUNCTION_TABLE[HEAP32[HEAP32[r61>>2]+28>>2]](r61,10);if(((tempValue=HEAP32[r58],HEAP32[r58]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r54]+8>>2]](r55)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r53,r59);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r53);r46=r12;r47=0;r48=r36;r6=2067;break}else if((r45|0)==8|(r45|0)==5){r46=0;r47=0;r48=r36;r6=2067;break}else if((r45|0)==11){HEAP8[r17]=0;HEAP32[r18]=0;HEAP8[r20]=0;HEAP8[r22]=0;HEAP32[r23]=0;HEAP32[r24]=0;r62=1;r63=r8;r64=r12;r65=0;r66=r36;r67=r37;r68=r40;break}else{__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcj(r9,r44?r26:HEAP32[r25],r42?r41>>>1:HEAP32[r27]);r46=r12;r47=0;r48=r36;r6=2067;break}}else if((r43|0)==2){__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcj(r9,(r40&1)<<24>>24==0?r26:HEAP32[r25],r42?r41>>>1:HEAP32[r27]);r46=r12;r47=0;r48=r36;r6=2067;break}else if((r43|0)==0){HEAP8[r17]=0;HEAP32[r18]=0;HEAP8[r20]=0;HEAP8[r22]=0;HEAP32[r23]=0;HEAP32[r24]=0;r62=1;r63=r8;r64=r12;r65=0;r66=r36;r67=r37;r68=r40;break}else{HEAP8[r17]=0;HEAP32[r18]=0;HEAP8[r20]=0;HEAP8[r22]=0;HEAP32[r23]=0;HEAP32[r24]=0;r62=1;r63=r8;r64=r12;r65=0;r66=r36;r67=r37;r68=r40;break}}while(0);if(r6==2067){r6=0;r62=0;r63=Math.imul(HEAP8[r2+HEAPU16[r11>>1]|0]<<24>>24,r37)+r8|0;r64=r46;r65=r47;r66=r48;r67=r37+1|0;r68=HEAP8[r3]}if((r68&1)<<24>>24!=0){__ZdlPv(HEAP32[r25])}if((r62|0)!=0){break}r8=r63;r12=r64;r35=r65;r36=r66;r37=r67;r38=HEAP32[r38+4>>2]}do{if(r6==2037){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r6==2054){r67=___cxa_allocate_exception(4);HEAP32[r67>>2]=5260948;___cxa_throw(r67,5267528,954)}else if(r6==2072){if(((r8|0)%103|0)!=(HEAP8[r2+HEAPU16[r38+8>>1]|0]<<24>>24|0)){HEAP8[r17]=0;HEAP32[r18]=0;HEAP8[r20]=0;HEAP8[r22]=0;HEAP32[r23]=0;HEAP32[r24]=0;break}HEAP8[r17]=1;HEAP32[r18]=r36;if((HEAP8[r13]&1)<<24>>24==0){HEAP32[r21]=HEAP32[r14];HEAP32[r21+1]=HEAP32[r14+1];HEAP32[r21+2]=HEAP32[r14+2]}else{r67=HEAP32[r28];r37=HEAP32[r30];if((r37|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r37>>>0<11){HEAP8[r20]=r37<<1&255;r69=r22}else{r66=r37+16&-16;r65=__Znwj(r66);HEAP32[r1+16>>2]=r65;HEAP32[r19>>2]=r66|1;HEAP32[r1+12>>2]=r37;r69=r65}_memcpy(r69,r67,r37);HEAP8[r69+r37|0]=0}HEAP32[r23]=r4;HEAP32[r24]=r5}}while(0);if((HEAP8[r13]&1)<<24>>24==0){STACKTOP=r7;return}__ZdlPv(HEAP32[r28]);STACKTOP=r7;return}function __ZNK9BarDecode9code128_t9decode128ENS0_10code_set_tEt(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10;r5=STACKTOP;STACKTOP=STACKTOP+4|0;r6=r5;r7=HEAP8[r2+(r4&65535)|0];r4=r7<<24>>24;if(r7<<24>>24==106){r8=r1;HEAP8[r1]=2;HEAP8[r8+1|0]=11;HEAP8[r8+2|0]=0;STACKTOP=r5;return}else if(r7<<24>>24==-1){HEAP8[r1]=0;HEAP8[r1+1|0]=0;STACKTOP=r5;return}else{if((r3|0)==0){if(r7<<24>>24<64){r8=r1;HEAP8[r1]=2;_memset(r8+1|0,r7+32&255,1);HEAP8[r8+2|0]=0;STACKTOP=r5;return}if(r7<<24>>24<96){r8=r1;HEAP8[r1]=2;_memset(r8+1|0,r7-64&255,1);HEAP8[r8+2|0]=0;STACKTOP=r5;return}else{r8=HEAP8[r4-96+r2+512|0];r9=r1;HEAP8[r1]=2;_memset(r9+1|0,r8,1);HEAP8[r9+2|0]=0;STACKTOP=r5;return}}else if((r3|0)==1){if(r7<<24>>24<96){r9=r1;HEAP8[r1]=2;_memset(r9+1|0,r7+32&255,1);HEAP8[r9+2|0]=0;STACKTOP=r5;return}else{r9=HEAP8[r4-96+r2+522|0];r8=r1;HEAP8[r1]=2;_memset(r8+1|0,r9,1);HEAP8[r8+2|0]=0;STACKTOP=r5;return}}else if((r3|0)==2){if(r7<<24>>24>=100){r7=HEAP8[r4-96+r2+532|0];r2=r1;HEAP8[r1]=2;_memset(r2+1|0,r7,1);HEAP8[r2+2|0]=0;STACKTOP=r5;return}r2=r6|0;_sprintf(r2,5251844,(tempInt=STACKTOP,STACKTOP=STACKTOP+4|0,HEAP32[tempInt>>2]=r4,tempInt));r4=_strlen(r2);if((r4|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r4>>>0<11){HEAP8[r1]=r4<<1&255;r10=r1+1|0}else{r6=r4+16&-16;r7=__Znwj(r6);HEAP32[r1+8>>2]=r7;HEAP32[r1>>2]=r6|1;HEAP32[r1+4>>2]=r4;r10=r7}_memcpy(r10,r2,r4);HEAP8[r10+r4|0]=0;STACKTOP=r5;return}else{___assert_func(5251780,262,5257272,5250804);HEAP8[r1]=0;HEAP8[r1+1|0]=0;STACKTOP=r5;return}}}function __ZNK9BarDecode8code39_t8expect_nINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEEbRT_S9_j(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16;r1=0;r5=STACKTOP;STACKTOP=STACKTOP+24|0;r6=r3;r3=STACKTOP;STACKTOP=STACKTOP+4|0;HEAP32[r3>>2]=HEAP32[r6>>2];r6=r5,r7=r6>>2;r8=(r6|0)>>2;HEAP32[r8]=0;r9=(r6+4|0)>>2;HEAP32[r9]=0;r10=r6+8|0;HEAP32[r10>>2]=0;r11=__Znwj(8);r12=r11;HEAP32[r9]=r12;HEAP32[r8]=r12;HEAP32[r10>>2]=r11+8|0;if((r11|0)==0){r13=0}else{HEAP8[r11]=0;HEAP32[r11+4>>2]=0;r13=r12}HEAP32[r9]=r13+8|0;HEAP32[r7+3]=0;HEAP32[r7+4]=0;HEAP32[r7+5]=0;r7=(__ZN9BarDecode12_GLOBAL__N_117scanner_utilities8get_barsINSt3__111__wrap_iterIPKNS3_4pairIbjEEEEEEjRT_SA_RNS_12bar_vector_tEjj(r2,HEAP32[r3>>2],r6,1)|0)==1;r6=HEAP32[r8];do{if(r7){if((HEAP8[r6|0]&1)<<24>>24!=0){r14=0;r1=2134;break}r8=r4>>>0;r3=HEAP32[r6+4>>2]>>>0;if(r8/30>r3){r15=0;break}r14=r3<=r8/7;r1=2134;break}else{r14=0;r1=2134}}while(0);do{if(r1==2134){if((r6|0)==0){r16=r14}else{r15=r14;break}STACKTOP=r5;return r16}}while(0);HEAP32[r9]=r6;__ZdlPv(r6|0);r16=r15;STACKTOP=r5;return r16}function __ZN9BarDecode13PixelIteratorILb1EEppEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24;r2=STACKTOP;STACKTOP=STACKTOP+104|0;r3=r2;r4=r2+44;r5=r2+60;HEAP8[r1+49|0]=0;r6=(r1+36|0)>>2;r7=HEAP32[r6];r8=r1+4|0;r9=HEAP32[r8>>2];r10=r9+36|0;if((r7|0)<(HEAP32[r10>>2]-1|0)){HEAP32[r6]=r7+1|0;r7=r1+8|0;if((HEAP32[r7>>2]|0)<=0){STACKTOP=r2;return r1}r11=r1+16|0;r12=0;while(1){__ZN5Image14const_iterator4downEv(HEAP32[r11>>2]+(r12*44&-1)|0);__ZN5Image14const_iteratordeEv(HEAP32[r11>>2]+(r12*44&-1)|0);r13=r12+1|0;if((r13|0)<(HEAP32[r7>>2]|0)){r12=r13}else{break}}STACKTOP=r2;return r1}HEAP32[r6]=0;r12=(r9+32|0)>>2;r7=(r1+32|0)>>2;r11=HEAP32[r7];r13=HEAP32[r12]-1-r11|0;r14=HEAP32[r1+12>>2];r15=(r1+8|0)>>2;r16=HEAP32[r15];r17=r16-1|0;if((r13|0)>(r17+r14|0)){r18=r14+r11|0;HEAP32[r7]=r18;if((r16|0)<=0){STACKTOP=r2;return r1}r19=r1+16|0;r20=r3;r21=0;r22=r18;r18=0;while(1){r23=HEAP32[r19>>2]+(r21*44&-1)|0;__ZN5Image14const_iterator2atEii(r3,r23,r22+r21|0,r18);_memcpy(r23,r20,44);__ZN5Image14const_iteratordeEv(HEAP32[r19>>2]+(r21*44&-1)|0);r23=r21+1|0;if((r23|0)>=(HEAP32[r15]|0)){break}r21=r23;r22=HEAP32[r7];r18=HEAP32[r6]}STACKTOP=r2;return r1}if((r13|0)>(r14|0)){r13=r14+r11|0;HEAP32[r7]=r13;if((r16|0)<=0){STACKTOP=r2;return r1}r16=r1+16|0;r11=r5;r14=0;r18=r13;r13=r9;r22=0;while(1){r21=HEAP32[r16>>2]+(r14*44&-1)|0;r19=r18+r14|0;r20=HEAP32[r13+32>>2]-1|0;__ZN5Image14const_iterator2atEii(r5,r21,(r20|0)<(r19|0)?r20:r19,r22);_memcpy(r21,r11,44);__ZN5Image14const_iteratordeEv(HEAP32[r16>>2]+(r14*44&-1)|0);r21=r14+1|0;if((r21|0)>=(HEAP32[r15]|0)){break}r14=r21;r18=HEAP32[r7];r13=HEAP32[r8>>2];r22=HEAP32[r6]}STACKTOP=r2;return r1}else{r6=HEAP32[r1+16>>2],r22=r6>>2;r8=__ZNK5Image4TypeEv(r9);r13=HEAP32[r12];r7=r9+44|0;r18=r9+40|0;r14=(Math.imul(Math.imul(HEAP32[r7>>2],r13),HEAP32[r18>>2])+7|0)/8&-1;r15=r9+28|0;r16=HEAP32[r15>>2];do{if((r16|0)==0){r11=HEAP32[r9+24>>2];if((r11|0)==0){r24=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]+32>>2]](r11,r9);r11=HEAP32[r15>>2];if((r11|0)==0){r24=0;break}HEAP8[r9|0]=0;r24=r11}else{r24=r16}}while(0);r16=HEAP32[r10>>2];r10=r24+Math.imul((Math.imul(Math.imul(HEAP32[r7>>2],HEAP32[r12]),HEAP32[r18>>2])+7|0)/8&-1,r16)|0;HEAP32[((r17*44&-1)>>2)+r22]=r9;HEAP32[((r17*44&-1)+4>>2)+r22]=r8;HEAP32[((r17*44&-1)+8>>2)+r22]=r14;HEAP32[((r17*44&-1)+12>>2)+r22]=r13;HEAP32[((r17*44&-1)+16>>2)+r22]=r13;r13=(r6+(r17*44&-1)+20|0)>>2;r6=r4>>2;HEAP32[r13]=HEAP32[r6];HEAP32[r13+1]=HEAP32[r6+1];HEAP32[r13+2]=HEAP32[r6+2];HEAP32[r13+3]=HEAP32[r6+3];HEAP32[((r17*44&-1)+36>>2)+r22]=r10;STACKTOP=r2;return r1}}function __ZN5Image14const_iterator4downEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47;r2=STACKTOP;STACKTOP=STACKTOP+12|0;r3=r2,r4=r3>>2;r5=HEAP32[r1+4>>2];if((r5|0)==7){r6=(r1+36|0)>>2;r7=(r1+8|0)>>2;r8=HEAP32[r6]+HEAP32[r7]|0;r9=(r1|0)>>2;r10=HEAP32[r9],r11=r10>>2;r12=r10+28|0;r13=HEAP32[r12>>2];do{if((r13|0)==0){r14=HEAP32[r11+6];if((r14|0)==0){r15=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r14>>2]+32>>2]](r14,r10);r14=HEAP32[r12>>2];if((r14|0)==0){r15=0;break}HEAP8[r10|0]=0;r15=r14}else{r15=r13}}while(0);r13=HEAP32[r11+9];r10=r8>>>0<(r15+Math.imul((Math.imul(Math.imul(HEAP32[r11+11],HEAP32[r11+8]),HEAP32[r11+10])+7|0)/8&-1,r13)|0)>>>0;r13=HEAP32[r6];if(r10){HEAP32[r6]=r13+HEAP32[r7]|0;STACKTOP=r2;return r1}r10=r13+4|0;r13=HEAP32[r9],r11=r13>>2;r15=r13+28|0;r8=HEAP32[r15>>2];do{if((r8|0)==0){r12=HEAP32[r11+6];if((r12|0)==0){r16=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r12>>2]+32>>2]](r12,r13);r12=HEAP32[r15>>2];if((r12|0)==0){r16=0;break}HEAP8[r13|0]=0;r16=r12}else{r16=r8}}while(0);r8=HEAP32[r11+9];r13=r10>>>0<(r16+Math.imul((Math.imul(Math.imul(HEAP32[r11+11],HEAP32[r11+8]),HEAP32[r11+10])+7|0)/8&-1,r8)|0)>>>0;r8=HEAP32[r9],r9=r8>>2;r11=(r8+28|0)>>2;r16=HEAP32[r11];if(r13){r13=HEAP32[r7];do{if((r16|0)==0){r7=HEAP32[r9+6];if((r7|0)==0){r17=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]+32>>2]](r7,r8);r7=HEAP32[r11];if((r7|0)==0){r17=0;break}HEAP8[r8|0]=0;r17=r7}else{r17=r16}}while(0);r7=HEAP32[r9+9];r10=r17+Math.imul((Math.imul(Math.imul(HEAP32[r9+11],HEAP32[r9+8]),HEAP32[r9+10])+7|0)/8&-1,r7)|0;HEAP32[r6]=r16+(r13+HEAP32[r6]+4-r10)|0;STACKTOP=r2;return r1}else{do{if((r16|0)==0){r10=HEAP32[r9+6];if((r10|0)==0){r18=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r10>>2]+32>>2]](r10,r8);r10=HEAP32[r11];if((r10|0)==0){r18=0;break}HEAP8[r8|0]=0;r18=r10}else{r18=r16}}while(0);r16=HEAP32[r9+9];HEAP32[r6]=r18+Math.imul((Math.imul(Math.imul(HEAP32[r9+11],HEAP32[r9+8]),HEAP32[r9+10])+7|0)/8&-1,r16)|0;STACKTOP=r2;return r1}}else if((r5|0)==3){r16=(r1+36|0)>>2;r9=(r1+8|0)>>2;r18=HEAP32[r16]+HEAP32[r9]|0;r6=(r1|0)>>2;r8=HEAP32[r6],r11=r8>>2;r10=r8+28|0;r13=HEAP32[r10>>2];do{if((r13|0)==0){r7=HEAP32[r11+6];if((r7|0)==0){r19=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]+32>>2]](r7,r8);r7=HEAP32[r10>>2];if((r7|0)==0){r19=0;break}HEAP8[r8|0]=0;r19=r7}else{r19=r13}}while(0);r13=HEAP32[r11+9];if(r18>>>0<(r19+Math.imul((Math.imul(Math.imul(HEAP32[r11+11],HEAP32[r11+8]),HEAP32[r11+10])+7|0)/8&-1,r13)|0)>>>0){HEAP32[r16]=HEAP32[r16]+HEAP32[r9]|0;STACKTOP=r2;return r1}r13=HEAP32[r6],r11=r13>>2;r19=r13+28|0;r18=HEAP32[r19>>2];r8=HEAP32[r9];do{if((r18|0)==0){r9=HEAP32[r11+6];if((r9|0)==0){r20=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]+32>>2]](r9,r13);r9=HEAP32[r19>>2];if((r9|0)==0){r20=0;break}HEAP8[r13|0]=0;r20=r9}else{r20=r18}}while(0);r13=HEAP32[r11+9];r19=r20+Math.imul((Math.imul(Math.imul(HEAP32[r11+11],HEAP32[r11+8]),HEAP32[r11+10])+7|0)/8&-1,r13)|0;r13=HEAP32[r16]+r8-r19|0;HEAP32[r16]=r18+r13|0;r19=(r1+40|0)>>2;r8=HEAP32[r19]-4|0;HEAP32[r19]=r8;r11=r1+16|0;r20=HEAP32[r11>>2]+1|0;HEAP32[r11>>2]=r20;if((r8|0)<0){HEAP32[r19]=7;HEAP32[r16]=r13+(r18+1)|0;STACKTOP=r2;return r1}if((r20|0)!=(HEAP32[r1+12>>2]|0)){STACKTOP=r2;return r1}r20=HEAP32[r6],r6=r20>>2;r18=r20+28|0;r13=HEAP32[r18>>2];do{if((r13|0)==0){r19=HEAP32[r6+6];if((r19|0)==0){r21=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r19>>2]+32>>2]](r19,r20);r19=HEAP32[r18>>2];if((r19|0)==0){r21=0;break}HEAP8[r20|0]=0;r21=r19}else{r21=r13}}while(0);r13=HEAP32[r6+9];HEAP32[r16]=r21+Math.imul((Math.imul(Math.imul(HEAP32[r6+11],HEAP32[r6+8]),HEAP32[r6+10])+7|0)/8&-1,r13)|0;STACKTOP=r2;return r1}else if((r5|0)==8){r13=(r1+36|0)>>2;r6=(r1+8|0)>>2;r21=HEAP32[r13]+HEAP32[r6]|0;r16=(r1|0)>>2;r20=HEAP32[r16],r18=r20>>2;r19=r20+28|0;r8=HEAP32[r19>>2];do{if((r8|0)==0){r11=HEAP32[r18+6];if((r11|0)==0){r22=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]+32>>2]](r11,r20);r11=HEAP32[r19>>2];if((r11|0)==0){r22=0;break}HEAP8[r20|0]=0;r22=r11}else{r22=r8}}while(0);r8=HEAP32[r18+9];r20=r21>>>0<(r22+Math.imul((Math.imul(Math.imul(HEAP32[r18+11],HEAP32[r18+8]),HEAP32[r18+10])+7|0)/8&-1,r8)|0)>>>0;r8=HEAP32[r13];if(r20){HEAP32[r13]=r8+HEAP32[r6]|0;STACKTOP=r2;return r1}r20=r8+6|0;r8=HEAP32[r16],r18=r8>>2;r22=r8+28|0;r21=HEAP32[r22>>2];do{if((r21|0)==0){r19=HEAP32[r18+6];if((r19|0)==0){r23=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r19>>2]+32>>2]](r19,r8);r19=HEAP32[r22>>2];if((r19|0)==0){r23=0;break}HEAP8[r8|0]=0;r23=r19}else{r23=r21}}while(0);r21=HEAP32[r18+9];r8=r20>>>0<(r23+Math.imul((Math.imul(Math.imul(HEAP32[r18+11],HEAP32[r18+8]),HEAP32[r18+10])+7|0)/8&-1,r21)|0)>>>0;r21=HEAP32[r16],r16=r21>>2;r18=(r21+28|0)>>2;r23=HEAP32[r18];if(r8){r8=HEAP32[r6];do{if((r23|0)==0){r6=HEAP32[r16+6];if((r6|0)==0){r24=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]+32>>2]](r6,r21);r6=HEAP32[r18];if((r6|0)==0){r24=0;break}HEAP8[r21|0]=0;r24=r6}else{r24=r23}}while(0);r6=HEAP32[r16+9];r20=r24+Math.imul((Math.imul(Math.imul(HEAP32[r16+11],HEAP32[r16+8]),HEAP32[r16+10])+7|0)/8&-1,r6)|0;HEAP32[r13]=r23+(r8+HEAP32[r13]+6-r20)|0;STACKTOP=r2;return r1}else{do{if((r23|0)==0){r20=HEAP32[r16+6];if((r20|0)==0){r25=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r20>>2]+32>>2]](r20,r21);r20=HEAP32[r18];if((r20|0)==0){r25=0;break}HEAP8[r21|0]=0;r25=r20}else{r25=r23}}while(0);r23=HEAP32[r16+9];HEAP32[r13]=r25+Math.imul((Math.imul(Math.imul(HEAP32[r16+11],HEAP32[r16+8]),HEAP32[r16+10])+7|0)/8&-1,r23)|0;STACKTOP=r2;return r1}}else if((r5|0)==6|(r5|0)==10){r23=(r1+36|0)>>2;r16=(r1+8|0)>>2;r25=HEAP32[r23]+HEAP32[r16]|0;r13=(r1|0)>>2;r21=HEAP32[r13],r18=r21>>2;r20=r21+28|0;r8=HEAP32[r20>>2];do{if((r8|0)==0){r6=HEAP32[r18+6];if((r6|0)==0){r26=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]+32>>2]](r6,r21);r6=HEAP32[r20>>2];if((r6|0)==0){r26=0;break}HEAP8[r21|0]=0;r26=r6}else{r26=r8}}while(0);r8=HEAP32[r18+9];r21=r25>>>0<(r26+Math.imul((Math.imul(Math.imul(HEAP32[r18+11],HEAP32[r18+8]),HEAP32[r18+10])+7|0)/8&-1,r8)|0)>>>0;r8=HEAP32[r23];if(r21){HEAP32[r23]=r8+HEAP32[r16]|0;STACKTOP=r2;return r1}r21=r8+3|0;r8=HEAP32[r13],r18=r8>>2;r26=r8+28|0;r25=HEAP32[r26>>2];do{if((r25|0)==0){r20=HEAP32[r18+6];if((r20|0)==0){r27=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r20>>2]+32>>2]](r20,r8);r20=HEAP32[r26>>2];if((r20|0)==0){r27=0;break}HEAP8[r8|0]=0;r27=r20}else{r27=r25}}while(0);r25=HEAP32[r18+9];r8=r21>>>0<(r27+Math.imul((Math.imul(Math.imul(HEAP32[r18+11],HEAP32[r18+8]),HEAP32[r18+10])+7|0)/8&-1,r25)|0)>>>0;r25=HEAP32[r13],r13=r25>>2;r18=(r25+28|0)>>2;r27=HEAP32[r18];if(r8){r8=HEAP32[r16];do{if((r27|0)==0){r16=HEAP32[r13+6];if((r16|0)==0){r28=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r16>>2]+32>>2]](r16,r25);r16=HEAP32[r18];if((r16|0)==0){r28=0;break}HEAP8[r25|0]=0;r28=r16}else{r28=r27}}while(0);r16=HEAP32[r13+9];r21=r28+Math.imul((Math.imul(Math.imul(HEAP32[r13+11],HEAP32[r13+8]),HEAP32[r13+10])+7|0)/8&-1,r16)|0;HEAP32[r23]=r27+(r8+HEAP32[r23]+3-r21)|0;STACKTOP=r2;return r1}else{do{if((r27|0)==0){r21=HEAP32[r13+6];if((r21|0)==0){r29=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r21>>2]+32>>2]](r21,r25);r21=HEAP32[r18];if((r21|0)==0){r29=0;break}HEAP8[r25|0]=0;r29=r21}else{r29=r27}}while(0);r27=HEAP32[r13+9];HEAP32[r23]=r29+Math.imul((Math.imul(Math.imul(HEAP32[r13+11],HEAP32[r13+8]),HEAP32[r13+10])+7|0)/8&-1,r27)|0;STACKTOP=r2;return r1}}else if((r5|0)==5){r27=(r1+36|0)>>2;r13=(r1+8|0)>>2;r29=HEAP32[r27]+HEAP32[r13]|0;r23=(r1|0)>>2;r25=HEAP32[r23],r18=r25>>2;r21=r25+28|0;r8=HEAP32[r21>>2];do{if((r8|0)==0){r16=HEAP32[r18+6];if((r16|0)==0){r30=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r16>>2]+32>>2]](r16,r25);r16=HEAP32[r21>>2];if((r16|0)==0){r30=0;break}HEAP8[r25|0]=0;r30=r16}else{r30=r8}}while(0);r8=HEAP32[r18+9];r25=r29>>>0<(r30+Math.imul((Math.imul(Math.imul(HEAP32[r18+11],HEAP32[r18+8]),HEAP32[r18+10])+7|0)/8&-1,r8)|0)>>>0;r8=HEAP32[r27];if(r25){HEAP32[r27]=r8+HEAP32[r13]|0;STACKTOP=r2;return r1}r25=r8+2|0;r8=HEAP32[r23],r18=r8>>2;r30=r8+28|0;r29=HEAP32[r30>>2];do{if((r29|0)==0){r21=HEAP32[r18+6];if((r21|0)==0){r31=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r21>>2]+32>>2]](r21,r8);r21=HEAP32[r30>>2];if((r21|0)==0){r31=0;break}HEAP8[r8|0]=0;r31=r21}else{r31=r29}}while(0);r29=HEAP32[r18+9];r8=r25>>>0<(r31+Math.imul((Math.imul(Math.imul(HEAP32[r18+11],HEAP32[r18+8]),HEAP32[r18+10])+7|0)/8&-1,r29)|0)>>>0;r29=HEAP32[r23],r23=r29>>2;r18=(r29+28|0)>>2;r31=HEAP32[r18];if(r8){r8=HEAP32[r13];do{if((r31|0)==0){r13=HEAP32[r23+6];if((r13|0)==0){r32=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r13>>2]+32>>2]](r13,r29);r13=HEAP32[r18];if((r13|0)==0){r32=0;break}HEAP8[r29|0]=0;r32=r13}else{r32=r31}}while(0);r13=HEAP32[r23+9];r25=r32+Math.imul((Math.imul(Math.imul(HEAP32[r23+11],HEAP32[r23+8]),HEAP32[r23+10])+7|0)/8&-1,r13)|0;HEAP32[r27]=r31+(r8+HEAP32[r27]+2-r25)|0;STACKTOP=r2;return r1}else{do{if((r31|0)==0){r25=HEAP32[r23+6];if((r25|0)==0){r33=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r25>>2]+32>>2]](r25,r29);r25=HEAP32[r18];if((r25|0)==0){r33=0;break}HEAP8[r29|0]=0;r33=r25}else{r33=r31}}while(0);r31=HEAP32[r23+9];HEAP32[r27]=r33+Math.imul((Math.imul(Math.imul(HEAP32[r23+11],HEAP32[r23+8]),HEAP32[r23+10])+7|0)/8&-1,r31)|0;STACKTOP=r2;return r1}}else if((r5|0)==9){r31=(r1+36|0)>>2;r23=(r1+8|0)>>2;r33=HEAP32[r31]+HEAP32[r23]|0;r27=(r1|0)>>2;r29=HEAP32[r27],r18=r29>>2;r25=r29+28|0;r8=HEAP32[r25>>2];do{if((r8|0)==0){r13=HEAP32[r18+6];if((r13|0)==0){r34=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r13>>2]+32>>2]](r13,r29);r13=HEAP32[r25>>2];if((r13|0)==0){r34=0;break}HEAP8[r29|0]=0;r34=r13}else{r34=r8}}while(0);r8=HEAP32[r18+9];r29=r33>>>0<(r34+Math.imul((Math.imul(Math.imul(HEAP32[r18+11],HEAP32[r18+8]),HEAP32[r18+10])+7|0)/8&-1,r8)|0)>>>0;r8=HEAP32[r31];if(r29){HEAP32[r31]=r8+HEAP32[r23]|0;STACKTOP=r2;return r1}r29=r8+4|0;r8=HEAP32[r27],r18=r8>>2;r34=r8+28|0;r33=HEAP32[r34>>2];do{if((r33|0)==0){r25=HEAP32[r18+6];if((r25|0)==0){r35=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r25>>2]+32>>2]](r25,r8);r25=HEAP32[r34>>2];if((r25|0)==0){r35=0;break}HEAP8[r8|0]=0;r35=r25}else{r35=r33}}while(0);r33=HEAP32[r18+9];r8=r29>>>0<(r35+Math.imul((Math.imul(Math.imul(HEAP32[r18+11],HEAP32[r18+8]),HEAP32[r18+10])+7|0)/8&-1,r33)|0)>>>0;r33=HEAP32[r27],r27=r33>>2;r18=(r33+28|0)>>2;r35=HEAP32[r18];if(r8){r8=HEAP32[r23];do{if((r35|0)==0){r23=HEAP32[r27+6];if((r23|0)==0){r36=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r23>>2]+32>>2]](r23,r33);r23=HEAP32[r18];if((r23|0)==0){r36=0;break}HEAP8[r33|0]=0;r36=r23}else{r36=r35}}while(0);r23=HEAP32[r27+9];r29=r36+Math.imul((Math.imul(Math.imul(HEAP32[r27+11],HEAP32[r27+8]),HEAP32[r27+10])+7|0)/8&-1,r23)|0;HEAP32[r31]=r35+(r8+HEAP32[r31]+4-r29)|0;STACKTOP=r2;return r1}else{do{if((r35|0)==0){r29=HEAP32[r27+6];if((r29|0)==0){r37=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r29>>2]+32>>2]](r29,r33);r29=HEAP32[r18];if((r29|0)==0){r37=0;break}HEAP8[r33|0]=0;r37=r29}else{r37=r35}}while(0);r35=HEAP32[r27+9];HEAP32[r31]=r37+Math.imul((Math.imul(Math.imul(HEAP32[r27+11],HEAP32[r27+8]),HEAP32[r27+10])+7|0)/8&-1,r35)|0;STACKTOP=r2;return r1}}else if((r5|0)==1){r35=(r1+36|0)>>2;r27=(r1+8|0)>>2;r37=HEAP32[r35]+HEAP32[r27]|0;r31=(r1|0)>>2;r33=HEAP32[r31],r18=r33>>2;r29=r33+28|0;r8=HEAP32[r29>>2];do{if((r8|0)==0){r23=HEAP32[r18+6];if((r23|0)==0){r38=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r23>>2]+32>>2]](r23,r33);r23=HEAP32[r29>>2];if((r23|0)==0){r38=0;break}HEAP8[r33|0]=0;r38=r23}else{r38=r8}}while(0);r8=HEAP32[r18+9];if(r37>>>0<(r38+Math.imul((Math.imul(Math.imul(HEAP32[r18+11],HEAP32[r18+8]),HEAP32[r18+10])+7|0)/8&-1,r8)|0)>>>0){HEAP32[r35]=HEAP32[r35]+HEAP32[r27]|0;STACKTOP=r2;return r1}r8=HEAP32[r31],r18=r8>>2;r38=r8+28|0;r37=HEAP32[r38>>2];r33=HEAP32[r27];do{if((r37|0)==0){r27=HEAP32[r18+6];if((r27|0)==0){r39=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r27>>2]+32>>2]](r27,r8);r27=HEAP32[r38>>2];if((r27|0)==0){r39=0;break}HEAP8[r8|0]=0;r39=r27}else{r39=r37}}while(0);r8=HEAP32[r18+9];r38=r39+Math.imul((Math.imul(Math.imul(HEAP32[r18+11],HEAP32[r18+8]),HEAP32[r18+10])+7|0)/8&-1,r8)|0;r8=HEAP32[r35]+r33-r38|0;HEAP32[r35]=r37+r8|0;r38=(r1+40|0)>>2;r33=HEAP32[r38]-1|0;HEAP32[r38]=r33;r18=r1+16|0;r39=HEAP32[r18>>2]+1|0;HEAP32[r18>>2]=r39;if((r33|0)<0){HEAP32[r38]=7;HEAP32[r35]=r8+(r37+1)|0;STACKTOP=r2;return r1}if((r39|0)!=(HEAP32[r1+12>>2]|0)){STACKTOP=r2;return r1}r39=HEAP32[r31],r31=r39>>2;r37=r39+28|0;r8=HEAP32[r37>>2];do{if((r8|0)==0){r38=HEAP32[r31+6];if((r38|0)==0){r40=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r38>>2]+32>>2]](r38,r39);r38=HEAP32[r37>>2];if((r38|0)==0){r40=0;break}HEAP8[r39|0]=0;r40=r38}else{r40=r8}}while(0);r8=HEAP32[r31+9];HEAP32[r35]=r40+Math.imul((Math.imul(Math.imul(HEAP32[r31+11],HEAP32[r31+8]),HEAP32[r31+10])+7|0)/8&-1,r8)|0;STACKTOP=r2;return r1}else if((r5|0)==4){r8=(r1+36|0)>>2;r31=(r1+8|0)>>2;r40=HEAP32[r8]+HEAP32[r31]|0;r35=(r1|0)>>2;r39=HEAP32[r35],r37=r39>>2;r38=r39+28|0;r33=HEAP32[r38>>2];do{if((r33|0)==0){r18=HEAP32[r37+6];if((r18|0)==0){r41=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r18>>2]+32>>2]](r18,r39);r18=HEAP32[r38>>2];if((r18|0)==0){r41=0;break}HEAP8[r39|0]=0;r41=r18}else{r41=r33}}while(0);r33=HEAP32[r37+9];r39=r40>>>0<(r41+Math.imul((Math.imul(Math.imul(HEAP32[r37+11],HEAP32[r37+8]),HEAP32[r37+10])+7|0)/8&-1,r33)|0)>>>0;r33=HEAP32[r8];if(r39){HEAP32[r8]=r33+HEAP32[r31]|0;STACKTOP=r2;return r1}r39=r33+1|0;r33=HEAP32[r35],r37=r33>>2;r41=r33+28|0;r40=HEAP32[r41>>2];do{if((r40|0)==0){r38=HEAP32[r37+6];if((r38|0)==0){r42=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r38>>2]+32>>2]](r38,r33);r38=HEAP32[r41>>2];if((r38|0)==0){r42=0;break}HEAP8[r33|0]=0;r42=r38}else{r42=r40}}while(0);r40=HEAP32[r37+9];r33=r39>>>0<(r42+Math.imul((Math.imul(Math.imul(HEAP32[r37+11],HEAP32[r37+8]),HEAP32[r37+10])+7|0)/8&-1,r40)|0)>>>0;r40=HEAP32[r35],r35=r40>>2;r37=(r40+28|0)>>2;r42=HEAP32[r37];if(r33){r33=HEAP32[r31];do{if((r42|0)==0){r31=HEAP32[r35+6];if((r31|0)==0){r43=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r31>>2]+32>>2]](r31,r40);r31=HEAP32[r37];if((r31|0)==0){r43=0;break}HEAP8[r40|0]=0;r43=r31}else{r43=r42}}while(0);r31=HEAP32[r35+9];r39=r43+Math.imul((Math.imul(Math.imul(HEAP32[r35+11],HEAP32[r35+8]),HEAP32[r35+10])+7|0)/8&-1,r31)|0;HEAP32[r8]=r42+(r33+HEAP32[r8]+1-r39)|0;STACKTOP=r2;return r1}else{do{if((r42|0)==0){r39=HEAP32[r35+6];if((r39|0)==0){r44=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r39>>2]+32>>2]](r39,r40);r39=HEAP32[r37];if((r39|0)==0){r44=0;break}HEAP8[r40|0]=0;r44=r39}else{r44=r42}}while(0);r42=HEAP32[r35+9];HEAP32[r8]=r44+Math.imul((Math.imul(Math.imul(HEAP32[r35+11],HEAP32[r35+8]),HEAP32[r35+10])+7|0)/8&-1,r42)|0;STACKTOP=r2;return r1}}else if((r5|0)==2){r5=(r1+36|0)>>2;r42=(r1+8|0)>>2;r35=HEAP32[r5]+HEAP32[r42]|0;r44=(r1|0)>>2;r8=HEAP32[r44],r40=r8>>2;r37=r8+28|0;r39=HEAP32[r37>>2];do{if((r39|0)==0){r33=HEAP32[r40+6];if((r33|0)==0){r45=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r33>>2]+32>>2]](r33,r8);r33=HEAP32[r37>>2];if((r33|0)==0){r45=0;break}HEAP8[r8|0]=0;r45=r33}else{r45=r39}}while(0);r39=HEAP32[r40+9];if(r35>>>0<(r45+Math.imul((Math.imul(Math.imul(HEAP32[r40+11],HEAP32[r40+8]),HEAP32[r40+10])+7|0)/8&-1,r39)|0)>>>0){HEAP32[r5]=HEAP32[r5]+HEAP32[r42]|0;STACKTOP=r2;return r1}r39=HEAP32[r44],r40=r39>>2;r45=r39+28|0;r35=HEAP32[r45>>2];r8=HEAP32[r42];do{if((r35|0)==0){r42=HEAP32[r40+6];if((r42|0)==0){r46=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r42>>2]+32>>2]](r42,r39);r42=HEAP32[r45>>2];if((r42|0)==0){r46=0;break}HEAP8[r39|0]=0;r46=r42}else{r46=r35}}while(0);r39=HEAP32[r40+9];r45=r46+Math.imul((Math.imul(Math.imul(HEAP32[r40+11],HEAP32[r40+8]),HEAP32[r40+10])+7|0)/8&-1,r39)|0;r39=HEAP32[r5]+r8-r45|0;HEAP32[r5]=r35+r39|0;r45=(r1+40|0)>>2;r8=HEAP32[r45]-2|0;HEAP32[r45]=r8;r40=r1+16|0;r46=HEAP32[r40>>2]+1|0;HEAP32[r40>>2]=r46;if((r8|0)<0){HEAP32[r45]=7;HEAP32[r5]=r39+(r35+1)|0;STACKTOP=r2;return r1}if((r46|0)!=(HEAP32[r1+12>>2]|0)){STACKTOP=r2;return r1}r46=HEAP32[r44],r44=r46>>2;r35=r46+28|0;r39=HEAP32[r35>>2];do{if((r39|0)==0){r45=HEAP32[r44+6];if((r45|0)==0){r47=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r45>>2]+32>>2]](r45,r46);r45=HEAP32[r35>>2];if((r45|0)==0){r47=0;break}HEAP8[r46|0]=0;r47=r45}else{r47=r39}}while(0);r39=HEAP32[r44+9];HEAP32[r5]=r47+Math.imul((Math.imul(Math.imul(HEAP32[r44+11],HEAP32[r44+8]),HEAP32[r44+10])+7|0)/8&-1,r39)|0;STACKTOP=r2;return r1}else{r39=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5254792),5255404),5253096),562);r44=HEAP32[r39+HEAP32[HEAP32[r39>>2]-12>>2]+28>>2],r47=r44>>2;r5=(r44+4|0)>>2;tempValue=HEAP32[r5],HEAP32[r5]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r4]=5270024;HEAP32[r4+1]=48;HEAP32[r4+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r3,766)}r3=HEAP32[1317507]-1|0;r4=HEAP32[r47+5];do{if(HEAP32[r47+6]-r4>>2>>>0>r3>>>0){r46=HEAP32[r4+(r3<<2)>>2];if((r46|0)==0){break}r35=FUNCTION_TABLE[HEAP32[HEAP32[r46>>2]+28>>2]](r46,10);if(((tempValue=HEAP32[r5],HEAP32[r5]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r47]+8>>2]](r44)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r39,r35);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r39);STACKTOP=r2;return r1}}while(0);r1=___cxa_allocate_exception(4);HEAP32[r1>>2]=5260948;___cxa_throw(r1,5267528,954)}}function __ZN9BarDecode9TokenizerILb1EED1Ev(r1){var r2;HEAP32[r1>>2]=5263572;HEAP32[r1+8>>2]=5263652;r2=HEAP32[r1+24>>2];if((r2|0)==0){return}HEAP32[r1+28>>2]=r2;__ZdlPv(r2);return}function __ZN5Image14const_iteratordeEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10;r2=r1>>2;r3=STACKTOP;STACKTOP=STACKTOP+12|0;r4=r3,r5=r4>>2;r6=HEAP32[r2+1];if((r6|0)==7){r7=HEAP32[r2+9];HEAP32[r2+5]=HEAPU8[r7];r8=r7;HEAP32[r2+6]=HEAPU8[r8+1|0];HEAP32[r2+7]=HEAPU8[r7+2|0];HEAP32[r2+8]=HEAPU8[r8+3|0];STACKTOP=r3;return r1}else if((r6|0)==8){r8=HEAP32[r2+9]>>1;HEAP32[r2+5]=HEAPU16[r8];HEAP32[r2+6]=HEAPU16[r8+1];HEAP32[r2+7]=HEAPU16[r8+2];STACKTOP=r3;return r1}else if((r6|0)==2){HEAP32[r2+5]=Math.floor((((HEAPU8[HEAP32[r2+9]]>>>((HEAP32[r2+10]-1|0)>>>0)&3)*255&-1)>>>0)/3);STACKTOP=r3;return r1}else if((r6|0)==3){HEAP32[r2+5]=Math.floor((((HEAPU8[HEAP32[r2+9]]>>>((HEAP32[r2+10]-3|0)>>>0)&15)*255&-1)>>>0)/15);STACKTOP=r3;return r1}else if((r6|0)==5){HEAP32[r2+5]=HEAPU16[HEAP32[r2+9]>>1];STACKTOP=r3;return r1}else if((r6|0)==10){r8=HEAP32[r2+9];HEAP32[r2+5]=HEAPU8[r8];HEAP32[r2+6]=HEAPU8[r8+1|0];HEAP32[r2+7]=HEAPU8[r8+2|0];STACKTOP=r3;return r1}else if((r6|0)==9){r8=HEAP32[r2+9];HEAP32[r2+5]=HEAPU8[r8];r7=r8;HEAP32[r2+6]=HEAPU8[r7+1|0];HEAP32[r2+7]=HEAPU8[r8+2|0];HEAP32[r2+8]=HEAPU8[r7+3|0];STACKTOP=r3;return r1}else if((r6|0)==1){HEAP32[r2+5]=-(HEAPU8[HEAP32[r2+9]]>>>(HEAP32[r2+10]>>>0)&1)&255;STACKTOP=r3;return r1}else if((r6|0)==4){HEAP32[r2+5]=HEAPU8[HEAP32[r2+9]];STACKTOP=r3;return r1}else if((r6|0)==6){r6=HEAP32[r2+9];HEAP32[r2+5]=HEAPU8[r6];HEAP32[r2+6]=HEAPU8[r6+1|0];HEAP32[r2+7]=HEAPU8[r6+2|0];STACKTOP=r3;return r1}else{r6=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5254792),5255404),5253096),160);r2=HEAP32[r6+HEAP32[HEAP32[r6>>2]-12>>2]+28>>2],r7=r2>>2;r8=(r2+4|0)>>2;tempValue=HEAP32[r8],HEAP32[r8]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r5]=5270024;HEAP32[r5+1]=48;HEAP32[r5+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r4,766)}r4=HEAP32[1317507]-1|0;r5=HEAP32[r7+5];do{if(HEAP32[r7+6]-r5>>2>>>0>r4>>>0){r9=HEAP32[r5+(r4<<2)>>2];if((r9|0)==0){break}r10=FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]+28>>2]](r9,10);if(((tempValue=HEAP32[r8],HEAP32[r8]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r7]+8>>2]](r2)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r6,r10);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r6);STACKTOP=r3;return r1}}while(0);r1=___cxa_allocate_exception(4);HEAP32[r1>>2]=5260948;___cxa_throw(r1,5267528,954)}}function __ZN5Image14const_iterator2atEii(r1,r2,r3,r4){var r5,r6,r7,r8,r9;r5=r2>>2;r6=r1>>2;r7=STACKTOP;STACKTOP=STACKTOP+12|0;r8=r7,r9=r8>>2;_memcpy(r1,r2,44);r2=HEAP32[r5+1];if((r2|0)==3){HEAP32[r6+9]=HEAP32[HEAP32[r5]+28>>2]+Math.imul(HEAP32[r5+2],r4)+((r3|0)/2&-1)|0;HEAP32[r6+10]=7-((r3|0)%2<<2)|0;HEAP32[r6+4]=r3;STACKTOP=r7;return}else if((r2|0)==2){HEAP32[r6+9]=HEAP32[HEAP32[r5]+28>>2]+Math.imul(HEAP32[r5+2],r4)+((r3|0)/4&-1)|0;HEAP32[r6+10]=7-((r3|0)%4<<1)|0;HEAP32[r6+4]=r3;STACKTOP=r7;return}else if((r2|0)==8){HEAP32[r6+9]=HEAP32[HEAP32[r5]+28>>2]+Math.imul(HEAP32[r5+2],r4)+(r3*6&-1)|0;STACKTOP=r7;return}else if((r2|0)==7){HEAP32[r6+9]=HEAP32[HEAP32[r5]+28>>2]+(r3<<2)+Math.imul(HEAP32[r5+2],r4)|0;STACKTOP=r7;return}else if((r2|0)==5){HEAP32[r6+9]=HEAP32[HEAP32[r5]+28>>2]+(r3<<1)+Math.imul(HEAP32[r5+2],r4)|0;STACKTOP=r7;return}else if((r2|0)==1){HEAP32[r6+9]=HEAP32[HEAP32[r5]+28>>2]+Math.imul(HEAP32[r5+2],r4)+((r3|0)/8&-1)|0;HEAP32[r6+10]=7-(r3|0)%8|0;HEAP32[r6+4]=r3;STACKTOP=r7;return}else if((r2|0)==9){HEAP32[r6+9]=HEAP32[HEAP32[r5]+28>>2]+(r3<<2)+Math.imul(HEAP32[r5+2],r4)|0;STACKTOP=r7;return}else if((r2|0)==6|(r2|0)==10){HEAP32[r6+9]=HEAP32[HEAP32[r5]+28>>2]+Math.imul(HEAP32[r5+2],r4)+(r3*3&-1)|0;STACKTOP=r7;return}else if((r2|0)==4){HEAP32[r6+9]=HEAP32[HEAP32[r5]+28>>2]+Math.imul(HEAP32[r5+2],r4)+r3|0;STACKTOP=r7;return}else{r3=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5254792),5255404),5253096),110);r4=HEAP32[r3+HEAP32[HEAP32[r3>>2]-12>>2]+28>>2],r5=r4>>2;r6=(r4+4|0)>>2;tempValue=HEAP32[r6],HEAP32[r6]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r9]=5270024;HEAP32[r9+1]=48;HEAP32[r9+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r8,766)}r8=HEAP32[1317507]-1|0;r9=HEAP32[r5+5];do{if(HEAP32[r5+6]-r9>>2>>>0>r8>>>0){r2=HEAP32[r9+(r8<<2)>>2];if((r2|0)==0){break}r1=FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]+28>>2]](r2,10);if(((tempValue=HEAP32[r6],HEAP32[r6]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r5]+8>>2]](r4)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r3,r1);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r3);STACKTOP=r7;return}}while(0);r7=___cxa_allocate_exception(4);HEAP32[r7>>2]=5260948;___cxa_throw(r7,5267528,954)}}function __ZNK5Image4TypeEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10;r2=STACKTOP;STACKTOP=STACKTOP+12|0;r3=r2,r4=r3>>2;r5=Math.imul(HEAP32[r1+40>>2],HEAP32[r1+44>>2]);if((r5|0)==8){r1=4;STACKTOP=r2;return r1}else if((r5|0)==1|(r5|0)==2){r1=r5;STACKTOP=r2;return r1}else if((r5|0)==16){r1=5;STACKTOP=r2;return r1}else if((r5|0)==32){r1=7;STACKTOP=r2;return r1}else if((r5|0)==4){r1=3;STACKTOP=r2;return r1}else if((r5|0)==24){r1=6;STACKTOP=r2;return r1}else if((r5|0)==48){r1=8;STACKTOP=r2;return r1}else{r5=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5254792),5251220),5253096),262);r6=HEAP32[r5+HEAP32[HEAP32[r5>>2]-12>>2]+28>>2],r7=r6>>2;r8=(r6+4|0)>>2;tempValue=HEAP32[r8],HEAP32[r8]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r4]=5270024;HEAP32[r4+1]=48;HEAP32[r4+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r3,766)}r3=HEAP32[1317507]-1|0;r4=HEAP32[r7+5];do{if(HEAP32[r7+6]-r4>>2>>>0>r3>>>0){r9=HEAP32[r4+(r3<<2)>>2];if((r9|0)==0){break}r10=FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]+28>>2]](r9,10);if(((tempValue=HEAP32[r8],HEAP32[r8]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r7]+8>>2]](r6)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r5,r10);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r5);r1=0;STACKTOP=r2;return r1}}while(0);r1=___cxa_allocate_exception(4);HEAP32[r1>>2]=5260948;___cxa_throw(r1,5267528,954)}}function __ZNK5Image14const_iterator4getLEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10;r2=r1>>2;r1=STACKTOP;STACKTOP=STACKTOP+12|0;r3=r1,r4=r3>>2;r5=HEAP32[r2+1];if((r5|0)==9){r6=HEAP32[r2+8]&65535;STACKTOP=r1;return r6}else if((r5|0)==6|(r5|0)==8){r7=(HEAP32[r2+5]|0)*.21267+(HEAP32[r2+6]|0)*.71516+(HEAP32[r2+7]|0)*.07217;r6=r7>=0?Math.floor(r7):Math.ceil(r7);STACKTOP=r1;return r6}else if((r5|0)==1|(r5|0)==2|(r5|0)==3|(r5|0)==4|(r5|0)==5){r6=HEAP32[r2+5]&65535;STACKTOP=r1;return r6}else if((r5|0)==7){r7=(HEAP32[r2+5]|0)*.21267+(HEAP32[r2+6]|0)*.71516+(HEAP32[r2+7]|0)*.07217;r6=r7>=0?Math.floor(r7):Math.ceil(r7);STACKTOP=r1;return r6}else if((r5|0)==10){r6=HEAP32[r2+5]&65535;STACKTOP=r1;return r6}else{r2=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5254792),5255404),5253096),633);r5=HEAP32[r2+HEAP32[HEAP32[r2>>2]-12>>2]+28>>2],r7=r5>>2;r8=(r5+4|0)>>2;tempValue=HEAP32[r8],HEAP32[r8]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r4]=5270024;HEAP32[r4+1]=48;HEAP32[r4+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r3,766)}r3=HEAP32[1317507]-1|0;r4=HEAP32[r7+5];do{if(HEAP32[r7+6]-r4>>2>>>0>r3>>>0){r9=HEAP32[r4+(r3<<2)>>2];if((r9|0)==0){break}r10=FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]+28>>2]](r9,10);if(((tempValue=HEAP32[r8],HEAP32[r8]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r7]+8>>2]](r5)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r2,r10);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r2);r6=0;STACKTOP=r1;return r6}}while(0);r6=___cxa_allocate_exception(4);HEAP32[r6>>2]=5260948;___cxa_throw(r6,5267528,954)}}function __ZN9BarDecode15BarcodeIteratorILb1EED0Ev(r1){var r2,r3,r4;r2=r1>>2;HEAP32[r2]=5263612;r3=HEAP32[r2+28];if((r3|0)!=0){HEAP32[r2+29]=r3;__ZdlPv(r3|0)}if((HEAP8[r1+92|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+25])}HEAP32[r2+1]=5263572;HEAP32[r2+3]=5263652;r3=HEAP32[r2+7];if((r3|0)==0){r4=r1;__ZdlPv(r4);return}HEAP32[r2+8]=r3;__ZdlPv(r3);r4=r1;__ZdlPv(r4);return}function __ZN9BarDecode13PixelIteratorILb1EED1Ev(r1){var r2;HEAP32[r1>>2]=5263652;r2=HEAP32[r1+16>>2];if((r2|0)==0){return}HEAP32[r1+20>>2]=r2;__ZdlPv(r2);return}function __ZN9BarDecode9TokenizerILb1EED0Ev(r1){var r2,r3;HEAP32[r1>>2]=5263572;HEAP32[r1+8>>2]=5263652;r2=HEAP32[r1+24>>2];if((r2|0)==0){r3=r1;__ZdlPv(r3);return}HEAP32[r1+28>>2]=r2;__ZdlPv(r2);r3=r1;__ZdlPv(r3);return}function __ZN9BarDecode13PixelIteratorILb1EED0Ev(r1){var r2,r3;HEAP32[r1>>2]=5263652;r2=HEAP32[r1+16>>2];if((r2|0)==0){r3=r1;__ZdlPv(r3);return}HEAP32[r1+20>>2]=r2;__ZdlPv(r2);r3=r1;__ZdlPv(r3);return}function __ZN9BarDecode15BarcodeIteratorILb1EEC2EPK5ImageijNS_12directions_tEii(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12;r8=r1>>2;HEAP32[r8]=5263612;HEAP32[r8+1]=5263572;HEAP32[r8+2]=r2;__ZN9BarDecode13PixelIteratorILb1EEC2EPK5Imageiii(r1+12|0,r2,r6,r7,r3);r7=r1+64|0;HEAPF64[tempDoublePtr>>3]=0,HEAP32[r7>>2]=HEAP32[tempDoublePtr>>2],HEAP32[r7+4>>2]=HEAP32[tempDoublePtr+4>>2];HEAP32[r8+18]=r3;HEAP32[r8+19]=r4;HEAP32[r8+20]=r5;HEAP8[r1+84|0]=0;HEAP32[r8+22]=0;r5=r1+92|0;HEAP8[r5]=0;HEAP8[r5+1|0]=0;r5=(r1+104|0)>>2;HEAP32[r5]=0;HEAP32[r5+1]=0;HEAP32[r5+2]=0;HEAP32[r5+3]=0;HEAP32[r5+4]=0;HEAP32[r5+5]=0;HEAP32[r5+6]=0;r5=HEAP32[r8+5]-1|0;r4=HEAP32[r8+7]>>2;r3=HEAP32[r8+4];__ZNK5Image4TypeEv(r3);r8=r3+32|0;r7=HEAP32[r8>>2];r6=r3+44|0;r2=r3+40|0;r9=r3+28|0;r10=HEAP32[r9>>2];do{if((r10|0)==0){r11=HEAP32[r3+24>>2];if((r11|0)==0){r12=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]+32>>2]](r11,r3);r11=HEAP32[r9>>2];if((r11|0)==0){r12=0;break}HEAP8[r3|0]=0;r12=r11}else{r12=r10}}while(0);r10=HEAP32[r3+36>>2];r3=r12+Math.imul((Math.imul(Math.imul(HEAP32[r6>>2],HEAP32[r8>>2]),HEAP32[r2>>2])+7|0)/8&-1,r10)|0;r10=(HEAP32[((r5*44&-1)+36>>2)+r4]|0)!=(r3|0);r3=(HEAP32[((r5*44&-1)+4>>2)+r4]-1|0)>>>0>2;do{if(r3|r10^1){if(r3&r10){break}return}else{if((HEAP32[((r5*44&-1)+16>>2)+r4]|0)!=(r7|0)){break}return}}while(0);__ZN9BarDecode15BarcodeIteratorILb1EE4nextEv(r1);return}function __ZN9BarDecode13PixelIteratorILb1EEC2EPK5Imageiii(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26;r6=STACKTOP;STACKTOP=STACKTOP+88|0;r7=r6;r8=r6+44;HEAP32[r1>>2]=5263652;HEAP32[r1+4>>2]=r2;r9=(r1+8|0)>>2;HEAP32[r9]=r3;HEAP32[r1+12>>2]=r4;r4=(r1+16|0)>>2;HEAP32[r4]=0;r10=r1+20|0;HEAP32[r10>>2]=0;r11=r1+24|0;HEAP32[r11>>2]=0;do{if((r3|0)==0){r12=0;r13=0}else{if(r3>>>0>97612893){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}else{r14=__Znwj(r3*44&-1);HEAP32[r4]=r14;r15=r14+(r3*44&-1)|0;HEAP32[r11>>2]=r15;HEAP32[r10>>2]=r15;r12=(HEAP32[r9]|0)>0;r13=r14;break}}}while(0);HEAP32[r1+28>>2]=r5;HEAP8[r1+49|0]=0;r5=(r1+32|0)>>2;HEAP32[r5]=0;HEAP32[r5+1]=0;HEAP32[r5+2]=0;HEAP32[r5+3]=0;if(!r12){STACKTOP=r6;return}r12=r8|0;r5=r8+4|0;r1=r8+8|0;r10=r2+32|0;r11=r2+44|0;r3=r2+40|0;r14=r8+12|0;r15=r2+28|0;r16=r2+24|0;r17=r2|0;r18=r8+36|0;r19=r8+16|0;r20=r8+40|0;r21=r7;r22=0;r23=r13;while(1){r13=r23+(r22*44&-1)|0;HEAP32[r12>>2]=r2;HEAP32[r5>>2]=__ZNK5Image4TypeEv(r2);r24=HEAP32[r10>>2];HEAP32[r1>>2]=(Math.imul(Math.imul(HEAP32[r11>>2],r24),HEAP32[r3>>2])+7|0)/8&-1;HEAP32[r14>>2]=r24;r24=HEAP32[r15>>2];do{if((r24|0)==0){r25=HEAP32[r16>>2];if((r25|0)==0){r26=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r25>>2]+32>>2]](r25,r2);r25=HEAP32[r15>>2];if((r25|0)==0){r26=0;break}HEAP8[r17]=0;r26=r25}else{r26=r24}}while(0);HEAP32[r18>>2]=r26;HEAP32[r19>>2]=0;HEAP32[r20>>2]=7;r24=HEAP32[r10>>2]-1|0;__ZN5Image14const_iterator2atEii(r7,r8,(r24|0)<(r22|0)?r24:r22,0);_memcpy(r13,r21,44);__ZN5Image14const_iteratordeEv(HEAP32[r4]+(r22*44&-1)|0);r24=r22+1|0;if((r24|0)>=(HEAP32[r9]|0)){break}r22=r24;r23=HEAP32[r4]}STACKTOP=r6;return}function __ZN9BarDecode15BarcodeIteratorILb0EE4nextEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66,r67,r68,r69,r70,r71,r72,r73,r74,r75,r76,r77,r78,r79,r80,r81,r82,r83,r84,r85,r86,r87,r88,r89,r90,r91,r92,r93,r94,r95,r96,r97,r98,r99,r100,r101,r102,r103,r104,r105,r106,r107,r108,r109,r110,r111,r112,r113,r114,r115,r116,r117,r118,r119,r120,r121,r122,r123,r124,r125,r126,r127,r128,r129,r130,r131,r132,r133,r134,r135,r136,r137,r138,r139,r140,r141;r2=r1>>2;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+252|0;r5=r4;r6=r4+28;r7=r4+56;r8=r4+60;r9=r4+88;r10=r4+92;r11=r4+120;r12=r4+124;r13=r4+152;r14=r4+156;r15=r4+184;r16=r4+188;r17=r4+216;r18=r4+220;r19=r4+248;r20=r1+20|0;r21=HEAP32[r20>>2]-1|0;r22=r1+28|0;r23=HEAP32[r22>>2]>>2;r24=r1+16|0;r25=HEAP32[r24>>2];__ZNK5Image4TypeEv(r25);r26=r25+32|0;r27=HEAP32[r26>>2];r28=r25+44|0;r29=r25+40|0;r30=r25+28|0;r31=HEAP32[r30>>2];do{if((r31|0)==0){r32=HEAP32[r25+24>>2];if((r32|0)==0){r33=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r32>>2]+32>>2]](r32,r25);r32=HEAP32[r30>>2];if((r32|0)==0){r33=0;break}HEAP8[r25|0]=0;r33=r32}else{r33=r31}}while(0);r31=HEAP32[r25+36>>2];r25=r33+Math.imul((Math.imul(Math.imul(HEAP32[r28>>2],HEAP32[r26>>2]),HEAP32[r29>>2])+7|0)/8&-1,r31)|0;r31=(HEAP32[((r21*44&-1)+36>>2)+r23]|0)!=(r25|0);r25=(HEAP32[((r21*44&-1)+4>>2)+r23]-1|0)>>>0>2;do{if(r25|r31^1){if(r25&r31){break}else{r3=2602;break}}else{if((HEAP32[((r21*44&-1)+16>>2)+r23]|0)==(r27|0)){r3=2602;break}else{break}}}while(0);if(r3==2602){___assert_func(5252400,44,5258220,5252448)}r27=(r1+124|0)>>2;r23=(r1+128|0)>>2;r21=r1+132|0;r31=(r21|0)>>2;r25=(r1+136|0)>>2;r29=r1+4|0;r26=r1+48|0;r28=r1+112|0;r33=r28|0;r30=(r1+132|0)>>2;r32=r1+116|0;r34=r5|0;r35=(r5+4|0)>>2;r36=r5+8|0;r37=r36;r38=r36+1|0;r39=(r5+20|0)>>2;r40=(r5+24|0)>>2;r41=(r1+80|0)>>2;r42=(r5+16|0)>>2;r5=(r1+76|0)>>2;r43=r19|0;r44=r18|0;r45=r18+4|0;r46=r18+8|0;r47=r18+20|0;r48=r18+24|0;r49=r46;r50=r18+16|0;r51=r17|0;r52=r16|0;r53=r16+4|0;r54=r16+8|0;r55=r16+20|0;r56=r16+24|0;r57=r54;r58=r16+16|0;r59=r15|0;r60=r14|0;r61=r14+4|0;r62=r14+8|0;r63=r14+20|0;r64=r14+24|0;r65=r62;r66=r14+16|0;r67=r13|0;r68=r12|0;r69=r12+4|0;r70=r12+8|0;r71=r12+20|0;r72=r12+24|0;r73=r70;r74=r12+16|0;r75=r11|0;r76=r10|0;r77=r10+4|0;r78=r10+8|0;r79=r10+20|0;r80=r10+24|0;r81=r78;r82=r10+16|0;r83=r9|0;r84=r8|0;r85=r8+4|0;r86=r8+8|0;r87=r8+20|0;r88=r8+24|0;r89=r86;r90=r8+16|0;r91=r7|0;r92=r6|0;r93=r6+4|0;r94=r6+8|0;r95=r6+20|0;r96=r6+24|0;r97=r94;r98=r6+16|0;L2941:while(1){r99=HEAP32[r20>>2]-1|0;r100=HEAP32[r22>>2]>>2;r101=HEAP32[r24>>2];__ZNK5Image4TypeEv(r101);r102=r101+32|0;r103=HEAP32[r102>>2];r104=r101+44|0;r105=r101+40|0;r106=r101+28|0;r107=HEAP32[r106>>2];do{if((r107|0)==0){r108=HEAP32[r101+24>>2];if((r108|0)==0){r109=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r108>>2]+32>>2]](r108,r101);r108=HEAP32[r106>>2];if((r108|0)==0){r109=0;break}HEAP8[r101|0]=0;r109=r108}else{r109=r107}}while(0);r107=HEAP32[r101+36>>2];r106=r109+Math.imul((Math.imul(Math.imul(HEAP32[r104>>2],HEAP32[r102>>2]),HEAP32[r105>>2])+7|0)/8&-1,r107)|0;r107=(HEAP32[((r99*44&-1)+36>>2)+r100]|0)!=(r106|0);r106=(HEAP32[((r99*44&-1)+4>>2)+r100]-1|0)>>>0>2;if(r106|r107^1){if(!(r106&r107)){r3=2751;break}}else{if((HEAP32[((r99*44&-1)+16>>2)+r100]|0)==(r103|0)){r3=2746;break}}r107=HEAP32[r31];r106=HEAP32[r25];if((r107|0)==(r106|0)){HEAP32[r27]=0;HEAP32[r23]=HEAP32[r26>>2];__ZN9BarDecode9TokenizerILb0EE9next_lineERNSt3__16vectorINS2_4pairIbjEENS2_9allocatorIS5_EEEE(r29,r28);r108=HEAP32[r33>>2];HEAP32[r30]=r108;r110=HEAP32[r32>>2];HEAP32[r25]=r110;r111=r108;r112=r110}else{r111=r107;r112=r106}r106=r111+8|0;if((r106|0)==(r112|0)){HEAP32[r31]=r112;continue}r107=HEAP32[r111+4>>2];r110=HEAP8[r106|0]&1;r106=HEAP32[r111+12>>2];r108=(HEAP8[r111|0]&1)<<24>>24==0;L2958:do{if(r107>>>0<7|r110<<24>>24!=0&r108^1){r113=r107;r114=r110;r115=r106;r116=r108;r117=r111;while(1){r118=r117+8|0;HEAP32[r31]=r118;if((r117+16|0)==(r112|0)){r119=r113;r120=r115;r121=r116;r122=r118;break L2958}HEAP32[r27]=HEAP32[r27]+r113|0;r123=HEAP8[r117+16|0]&1;r124=HEAP32[r117+20>>2];r125=r114<<24>>24==0;if(r115>>>0<7|r123<<24>>24!=0&r125^1){r113=r115;r114=r123;r115=r124;r116=r125;r117=r118}else{r119=r115;r120=r124;r121=r125;r122=r118;break L2958}}}else{r119=r107;r120=r106;r121=r108;r122=r111}}while(0);if((r122+8|0)==(r112|0)){HEAP32[r31]=r112;continue}if(r121){r126=r112;r127=r122,r128=r127>>2}else{___assert_func(5252400,72,5258220,5252256);r126=HEAP32[r25];r127=HEAP32[r31],r128=r127>>2}if((r126-r127|0)<192){HEAP32[r31]=r126;continue}if((r120*3&-1)>>>0>r119>>>0){HEAP32[r27]=HEAP32[r27]+r119|0;HEAP32[r31]=r127+8|0;continue}HEAP8[r34]=0;HEAP32[r35]=0;HEAP8[r37]=0;HEAP8[r38]=0;HEAP32[r39]=0;HEAP32[r40]=0;r108=HEAP32[r41];do{if((r108&1|0)==0){r129=r108}else{if((HEAP32[r5]&64|0)==0){r129=r108;break}HEAP32[r91>>2]=r126;__ZNK9BarDecode8code39_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r6,5272764,r21,r7,HEAP32[r128+1]+HEAP32[r27]|0,HEAP32[r23],r119);HEAP8[r34]=HEAP8[r92]&1;HEAP32[r35]=HEAP32[r93>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r94);HEAP32[r39]=HEAP32[r95>>2];HEAP32[r40]=HEAP32[r96>>2];r106=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r97]&1)<<24>>24!=0){__ZdlPv(HEAP32[r98>>2])}if(!r106){r3=2634;break L2941}r129=HEAP32[r41]}}while(0);do{if((r129&4|0)==0){r130=r129}else{if((HEAP32[r5]&64|0)==0){r130=r129;break}HEAP32[r30]=r127;HEAP32[r83>>2]=HEAP32[r25];__ZNK9BarDecode8code39_t12reverse_scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r8,5272764,r21,r9,HEAP32[r128+1]+HEAP32[r27]|0,HEAP32[r23],r119);HEAP8[r34]=HEAP8[r84]&1;HEAP32[r35]=HEAP32[r85>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r86);HEAP32[r39]=HEAP32[r87>>2];HEAP32[r40]=HEAP32[r88>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r89]&1)<<24>>24!=0){__ZdlPv(HEAP32[r90>>2])}if(!r108){r3=2652;break L2941}r130=HEAP32[r41]}}while(0);do{if((r130&1|0)==0){r131=r130}else{if((HEAP32[r5]&512|0)==0){r131=r130;break}HEAP32[r30]=r127;HEAP32[r75>>2]=HEAP32[r25];__ZNK9BarDecode9code25i_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r10,5271008,r21,r11,HEAP32[r128+1]+HEAP32[r27]|0,HEAP32[r23],r119);HEAP8[r34]=HEAP8[r76]&1;HEAP32[r35]=HEAP32[r77>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r78);HEAP32[r39]=HEAP32[r79>>2];HEAP32[r40]=HEAP32[r80>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r81]&1)<<24>>24!=0){__ZdlPv(HEAP32[r82>>2])}if(!r108){r3=2667;break L2941}r131=HEAP32[r41]}}while(0);do{if((r131&4|0)==0){r132=r131}else{if((HEAP32[r5]&512|0)==0){r132=r131;break}HEAP32[r30]=r127;HEAP32[r67>>2]=HEAP32[r25];__ZNK9BarDecode9code25i_t12reverse_scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r12,5271008,r21,r13,HEAP32[r128+1]+HEAP32[r27]|0,HEAP32[r23],r119);HEAP8[r34]=HEAP8[r68]&1;HEAP32[r35]=HEAP32[r69>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r70);HEAP32[r39]=HEAP32[r71>>2];HEAP32[r40]=HEAP32[r72>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r73]&1)<<24>>24!=0){__ZdlPv(HEAP32[r74>>2])}if(!r108){r3=2682;break L2941}r132=HEAP32[r41]}}while(0);do{if((r132&1|0)==0){r133=r132}else{if((HEAP32[r5]&16|0)==0){r133=r132;break}HEAP32[r30]=r127;HEAP32[r59>>2]=HEAP32[r25];__ZNK9BarDecode9code128_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r14,5271580,r21,r15,HEAP32[r128+1]+HEAP32[r27]|0,HEAP32[r23],r119);HEAP8[r34]=HEAP8[r60]&1;HEAP32[r35]=HEAP32[r61>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r62);HEAP32[r39]=HEAP32[r63>>2];HEAP32[r40]=HEAP32[r64>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r65]&1)<<24>>24!=0){__ZdlPv(HEAP32[r66>>2])}if(!r108){r3=2697;break L2941}r133=HEAP32[r41]}}while(0);do{if((r133&4|0)==0){r134=r133}else{if((HEAP32[r5]&16|0)==0){r134=r133;break}HEAP32[r30]=r127;HEAP32[r51>>2]=HEAP32[r25];__ZNK9BarDecode9code128_t12reverse_scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iij(r16,5271580,r21,r17,HEAP32[r128+1]+HEAP32[r27]|0,HEAP32[r23],r119);HEAP8[r34]=HEAP8[r52]&1;HEAP32[r35]=HEAP32[r53>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r54);HEAP32[r39]=HEAP32[r55>>2];HEAP32[r40]=HEAP32[r56>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r57]&1)<<24>>24!=0){__ZdlPv(HEAP32[r58>>2])}if(!r108){r3=2712;break L2941}r134=HEAP32[r41]}}while(0);do{if((r134&5|0)!=0){if((HEAP32[r5]&7|0)==0){break}HEAP32[r30]=r127;HEAP32[r43>>2]=HEAP32[r25];__ZN9BarDecode5ean_t4scanINSt3__111__wrap_iterIPKNS2_4pairIbjEEEEEENS_16scanner_result_tERT_SA_iijNS_12directions_tE(r18,5270756,r21,r19,HEAP32[r128+1]+HEAP32[r27]|0,HEAP32[r23],r119,r134);HEAP8[r34]=HEAP8[r44]&1;HEAP32[r35]=HEAP32[r45>>2];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r36,r46);HEAP32[r39]=HEAP32[r47>>2];HEAP32[r40]=HEAP32[r48>>2];r108=(HEAP8[r34]&1)<<24>>24==0;if((HEAP8[r49]&1)<<24>>24!=0){__ZdlPv(HEAP32[r50>>2])}if(!r108){r3=2726;break L2941}}}while(0);HEAP32[r27]=HEAP32[r27]+HEAP32[r128+1]|0;HEAP32[r30]=r127+8|0;if((HEAP8[r37]&1)<<24>>24==0){continue}__ZdlPv(HEAP32[r42])}if(r3==2751){STACKTOP=r4;return}else if(r3==2712){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r30=HEAP32[r31];L3049:do{if((r127|0)==(r30|0)){r135=0}else{r128=0;r50=r127;while(1){r49=r50+8|0;r48=HEAP32[r50+4>>2]+r128|0;if((r49|0)==(r30|0)){r135=r48;break L3049}else{r128=r48;r50=r49}}}}while(0);HEAP32[r27]=HEAP32[r27]+r135|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==2682){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r135=HEAP32[r31];L3059:do{if((r127|0)==(r135|0)){r136=0}else{r30=0;r50=r127;while(1){r128=r50+8|0;r49=HEAP32[r50+4>>2]+r30|0;if((r128|0)==(r135|0)){r136=r49;break L3059}else{r30=r49;r50=r128}}}}while(0);HEAP32[r27]=HEAP32[r27]+r136|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==2667){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r136=HEAP32[r31];L3069:do{if((r127|0)==(r136|0)){r137=0}else{r135=0;r50=r127;while(1){r30=r50+8|0;r128=HEAP32[r50+4>>2]+r135|0;if((r30|0)==(r136|0)){r137=r128;break L3069}else{r135=r128;r50=r30}}}}while(0);HEAP32[r27]=HEAP32[r27]+r137|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==2746){STACKTOP=r4;return}else if(r3==2652){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r137=HEAP32[r31];L3080:do{if((r127|0)==(r137|0)){r138=0}else{r136=0;r50=r127;while(1){r135=r50+8|0;r30=HEAP32[r50+4>>2]+r136|0;if((r135|0)==(r137|0)){r138=r30;break L3080}else{r136=r30;r50=r135}}}}while(0);HEAP32[r27]=HEAP32[r27]+r138|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==2634){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r138=HEAP32[r31];L3090:do{if((r127|0)==(r138|0)){r139=0}else{r137=0;r50=r127;while(1){r136=r50+8|0;r135=HEAP32[r50+4>>2]+r137|0;if((r136|0)==(r138|0)){r139=r135;break L3090}else{r137=r135;r50=r136}}}}while(0);HEAP32[r27]=HEAP32[r27]+r139|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==2726){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r139=HEAP32[r31];L3100:do{if((r127|0)==(r139|0)){r140=0}else{r138=0;r50=r127;while(1){r137=r50+8|0;r136=HEAP32[r50+4>>2]+r138|0;if((r137|0)==(r139|0)){r140=r136;break L3100}else{r138=r136;r50=r137}}}}while(0);HEAP32[r27]=HEAP32[r27]+r140|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}else if(r3==2697){HEAP8[r1+84|0]=HEAP8[r34]&1;HEAP32[r2+22]=HEAP32[r35];__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+92|0,r36);HEAP32[r2+26]=HEAP32[r39];HEAP32[r2+27]=HEAP32[r40];r40=HEAP32[r31];L3110:do{if((r127|0)==(r40|0)){r141=0}else{r31=0;r2=r127;while(1){r39=r2+8|0;r36=HEAP32[r2+4>>2]+r31|0;if((r39|0)==(r40|0)){r141=r36;break L3110}else{r31=r36;r2=r39}}}}while(0);HEAP32[r27]=HEAP32[r27]+r141|0;if((HEAP8[r37]&1)<<24>>24==0){STACKTOP=r4;return}__ZdlPv(HEAP32[r42]);STACKTOP=r4;return}}function __ZN9BarDecode13PixelIteratorILb0EEppEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24;r2=STACKTOP;STACKTOP=STACKTOP+104|0;r3=r2;r4=r2+44;r5=r2+60;HEAP8[r1+49|0]=0;r6=(r1+32|0)>>2;r7=HEAP32[r6];r8=r1+4|0;r9=HEAP32[r8>>2];r10=(r9+32|0)>>2;if((r7|0)<(HEAP32[r10]-1|0)){HEAP32[r6]=r7+1|0;r7=r1+8|0;if((HEAP32[r7>>2]|0)<=0){STACKTOP=r2;return r1}r11=r1+16|0;r12=0;while(1){__ZN5Image14const_iteratorppEv(HEAP32[r11>>2]+(r12*44&-1)|0);__ZN5Image14const_iteratordeEv(HEAP32[r11>>2]+(r12*44&-1)|0);r13=r12+1|0;if((r13|0)<(HEAP32[r7>>2]|0)){r12=r13}else{break}}STACKTOP=r2;return r1}HEAP32[r6]=0;r12=r9+36|0;r7=(r1+36|0)>>2;r11=HEAP32[r7];r13=HEAP32[r12>>2]-1-r11|0;r14=HEAP32[r1+12>>2];r15=(r1+8|0)>>2;r16=HEAP32[r15];r17=r16-1|0;if((r13|0)>(r17+r14|0)){r18=r14+r11|0;HEAP32[r7]=r18;if((r16|0)<=0){STACKTOP=r2;return r1}r19=r1+16|0;r20=r3;r21=0;r22=0;r23=r18;while(1){r18=HEAP32[r19>>2]+(r21*44&-1)|0;__ZN5Image14const_iterator2atEii(r3,r18,r22,r23+r21|0);_memcpy(r18,r20,44);__ZN5Image14const_iteratordeEv(HEAP32[r19>>2]+(r21*44&-1)|0);r18=r21+1|0;if((r18|0)>=(HEAP32[r15]|0)){break}r21=r18;r22=HEAP32[r6];r23=HEAP32[r7]}STACKTOP=r2;return r1}if((r13|0)>(r14|0)){r13=r14+r11|0;HEAP32[r7]=r13;if((r16|0)<=0){STACKTOP=r2;return r1}r16=r1+16|0;r11=r5;r14=0;r23=0;r22=r13;r13=r9;while(1){r21=HEAP32[r16>>2]+(r14*44&-1)|0;r19=r22+r14|0;r20=HEAP32[r13+36>>2]-1|0;__ZN5Image14const_iterator2atEii(r5,r21,r23,(r20|0)<(r19|0)?r20:r19);_memcpy(r21,r11,44);__ZN5Image14const_iteratordeEv(HEAP32[r16>>2]+(r14*44&-1)|0);r21=r14+1|0;if((r21|0)>=(HEAP32[r15]|0)){break}r14=r21;r23=HEAP32[r6];r22=HEAP32[r7];r13=HEAP32[r8>>2]}STACKTOP=r2;return r1}else{r8=HEAP32[r1+16>>2],r13=r8>>2;r7=__ZNK5Image4TypeEv(r9);r22=HEAP32[r10];r6=r9+44|0;r23=r9+40|0;r14=(Math.imul(Math.imul(HEAP32[r6>>2],r22),HEAP32[r23>>2])+7|0)/8&-1;r15=r9+28|0;r16=HEAP32[r15>>2];do{if((r16|0)==0){r11=HEAP32[r9+24>>2];if((r11|0)==0){r24=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]+32>>2]](r11,r9);r11=HEAP32[r15>>2];if((r11|0)==0){r24=0;break}HEAP8[r9|0]=0;r24=r11}else{r24=r16}}while(0);r16=HEAP32[r12>>2];r12=r24+Math.imul((Math.imul(Math.imul(HEAP32[r6>>2],HEAP32[r10]),HEAP32[r23>>2])+7|0)/8&-1,r16)|0;HEAP32[((r17*44&-1)>>2)+r13]=r9;HEAP32[((r17*44&-1)+4>>2)+r13]=r7;HEAP32[((r17*44&-1)+8>>2)+r13]=r14;HEAP32[((r17*44&-1)+12>>2)+r13]=r22;HEAP32[((r17*44&-1)+16>>2)+r13]=r22;r22=(r8+(r17*44&-1)+20|0)>>2;r8=r4>>2;HEAP32[r22]=HEAP32[r8];HEAP32[r22+1]=HEAP32[r8+1];HEAP32[r22+2]=HEAP32[r8+2];HEAP32[r22+3]=HEAP32[r8+3];HEAP32[((r17*44&-1)+36>>2)+r13]=r12;STACKTOP=r2;return r1}}function __ZN9BarDecode9TokenizerILb0EE9next_lineERNSt3__16vectorINS2_4pairIbjEENS2_9allocatorIS5_EEEE(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66,r67,r68,r69,r70,r71,r72,r73,r74;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+20|0;r5=r4;r6=(r1+16|0)>>2;r7=HEAP32[r6]-1|0;r8=(r1+24|0)>>2;r9=HEAP32[r8]>>2;r10=(r1+12|0)>>2;r11=HEAP32[r10];__ZNK5Image4TypeEv(r11);r12=r11+32|0;r13=HEAP32[r12>>2];r14=r11+44|0;r15=r11+40|0;r16=r11+28|0;r17=HEAP32[r16>>2];do{if((r17|0)==0){r18=HEAP32[r11+24>>2];if((r18|0)==0){r19=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r18>>2]+32>>2]](r18,r11);r18=HEAP32[r16>>2];if((r18|0)==0){r19=0;break}HEAP8[r11|0]=0;r19=r18}else{r19=r17}}while(0);r17=HEAP32[r11+36>>2];r11=r19+Math.imul((Math.imul(Math.imul(HEAP32[r14>>2],HEAP32[r12>>2]),HEAP32[r15>>2])+7|0)/8&-1,r17)|0;r17=(HEAP32[((r7*44&-1)+36>>2)+r9]|0)!=(r11|0);r11=(HEAP32[((r7*44&-1)+4>>2)+r9]-1|0)>>>0>2;do{if(r11|r17^1){if(r11&r17){break}else{r3=2789;break}}else{if((HEAP32[((r7*44&-1)+16>>2)+r9]|0)==(r13|0)){r3=2789;break}else{break}}}while(0);if(r3==2789){___assert_func(5251460,55,5257728,5252448)}r13=r1+8|0;if((HEAP32[r1+40>>2]|0)!=0){___assert_func(5251460,56,5257728,5251348)}r9=(r2|0)>>2;r7=(r2+4|0)>>2;HEAP32[r7]=HEAP32[r9];r17=HEAP32[r1+68>>2];r11=r1+57|0;HEAP8[r11]=0;r15=(r1+36|0)>>2;HEAP32[r15]=r17;r12=HEAP32[r6];if((r12|0)>0){r14=0;r19=0;while(1){r20=r14+(__ZNK5Image14const_iterator4getLEv(HEAP32[r8]+(r19*44&-1)|0)&65535|0);r16=r19+1|0;r21=HEAP32[r6];if((r16|0)<(r21|0)){r14=r20;r19=r16}else{break}}r22=r20;r23=r21;r24=HEAP32[r15]}else{r22=0;r23=r12;r24=r17}r17=r22/(r23|0);r23=r1+48|0;HEAPF64[tempDoublePtr>>3]=r17,HEAP32[r23>>2]=HEAP32[tempDoublePtr>>2],HEAP32[r23+4>>2]=HEAP32[tempDoublePtr+4>>2];r23=r17<(r24|0)&1;HEAP8[r1+56|0]=r23;HEAP8[r11]=1;if((HEAP32[HEAP32[r10]+32>>2]|0)<=0){STACKTOP=r4;return}r24=r1+48|0;r17=(r1+48|0)>>2;r22=r1+56|0;r12=r1+60|0;r1=r2+8|0;r21=r1|0;r20=r1;r1=(r5+12|0)>>2;r19=r5+16|0;r14=(r5|0)>>2;r16=(r5+8|0)>>2;r18=(r5+4|0)>>2;r25=r2+8|0;r2=r23;r23=1;r26=0;r27=(HEAP32[tempDoublePtr>>2]=HEAP32[r24>>2],HEAP32[tempDoublePtr+4>>2]=HEAP32[r24+4>>2],HEAPF64[tempDoublePtr>>3]);r24=0;r28=1;L3177:while(1){if((r28&1)<<24>>24==0){r29=HEAP32[r6];L3181:do{if((r29|0)>0){r30=0;r31=0;while(1){r32=r30+(__ZNK5Image14const_iterator4getLEv(HEAP32[r8]+(r31*44&-1)|0)&65535|0);r33=r31+1|0;r34=HEAP32[r6];if((r33|0)<(r34|0)){r30=r32;r31=r33}else{r35=r32;r36=r34;break L3181}}}else{r35=0;r36=r29}}while(0);r29=r35/(r36|0);HEAPF64[tempDoublePtr>>3]=r29,HEAP32[r17]=HEAP32[tempDoublePtr>>2],HEAP32[r17+1]=HEAP32[tempDoublePtr+4>>2];HEAP8[r22]=r29<(HEAP32[r15]|0)&1;HEAP8[r11]=1;r37=r29;r38=1}else{r37=(HEAP32[tempDoublePtr>>2]=HEAP32[r17],HEAP32[tempDoublePtr+4>>2]=HEAP32[r17+1],HEAPF64[tempDoublePtr>>3]);r38=r28}r29=r26+r37;r31=r29/r23;r30=(r2&1)<<24>>24!=0;r34=HEAP32[r15];r32=r34|0;L3187:do{if(r30){r33=r37<r32;do{if(r33){r39=r31+30;if(r37>r39){r40=_round(r39<80?80:r39);HEAP8[r11]=0;HEAP32[r15]=r40;r41=r2;r42=r40;r3=2821;break L3187}if(!r30){r3=2822;break L3187}if(!(r33&r27!=0)){break}r40=r27+40;if(r37<=r40){break}r39=_round(r40<80?80:r40);HEAP8[r11]=0;HEAP32[r15]=r39;r41=r2;r42=r39;r3=2821;break L3187}}while(0);if(!(r30&r23>20&r33)){r3=2822;break}r39=r31-30;if(r37<r39){r40=_round(r39);HEAP8[r11]=0;HEAP32[r15]=r40;r41=0;r42=r40;r3=2821;break}r40=r27-40;if(r37>=r40){r3=2822;break}r39=_round(r40);HEAP8[r11]=0;HEAP32[r15]=r39;r41=0;r42=r39;r3=2821;break}else{r39=r37>r32;if(!r39){r3=2822;break}r40=r31-30;if(r37<r40){r43=_round(r40>220?220:r40);HEAP8[r11]=0;HEAP32[r15]=r43;r41=r2;r42=r43;r3=2821;break}if(!(r39&r27!=0)){r3=2822;break}r39=r27-40;if(r37>=r39){r3=2822;break}r43=_round(r39>220?220:r39);HEAP8[r11]=0;HEAP32[r15]=r43;r41=r2;r42=r43;r3=2821;break}}while(0);do{if(r3==2821){r3=0;r32=r41&1;r44=r42;r45=r41;r46=r32;r47=r32<<24>>24==0;r3=2823;break}else if(r3==2822){r3=0;r32=r2&1;r30=r32<<24>>24==0;if((r38&1)<<24>>24==0){r44=r34;r45=r2;r46=r32;r47=r30;r3=2823;break}r48=HEAP8[r22];r49=r2;r50=r32;r51=r30;break}}while(0);if(r3==2823){r3=0;r34=HEAP32[r6];if((r34|0)>0){r30=0;r32=0;while(1){r52=r30+(__ZNK5Image14const_iterator4getLEv(HEAP32[r8]+(r32*44&-1)|0)&65535|0);r43=r32+1|0;r53=HEAP32[r6];if((r43|0)<(r53|0)){r30=r52;r32=r43}else{break}}r54=r52;r55=r53;r56=HEAP32[r15]}else{r54=0;r55=r34;r56=r44}r32=r54/(r55|0);HEAPF64[tempDoublePtr>>3]=r32,HEAP32[r17]=HEAP32[tempDoublePtr>>2],HEAP32[r17+1]=HEAP32[tempDoublePtr+4>>2];r30=r32<(r56|0)&1;HEAP8[r22]=r30;HEAP8[r11]=1;r48=r30;r49=r45;r50=r46;r51=r47}do{if(r50<<24>>24==(r48&1)<<24>>24){if((r24|0)==(HEAP32[HEAP32[r10]+32>>2]-1|0)){r3=2830;break}else{r57=r29;r58=r23;r59=r49;break}}else{r3=2830}}while(0);if(r3==2830){r3=0;r29=r37/255;if(r51){r60=r29}else{r60=1-r29}r29=_round(r23-(HEAP32[tempDoublePtr>>2]=HEAP32[r12>>2],HEAP32[tempDoublePtr+4>>2]=HEAP32[r12+4>>2],HEAPF64[tempDoublePtr>>3])+r60);r34=HEAP32[r7];r30=HEAP32[r21>>2];do{if(r34>>>0<r30>>>0){if((r34|0)==0){r61=0}else{HEAP8[r34|0]=r50;HEAP32[r34+4>>2]=r29;r61=HEAP32[r7]}HEAP32[r7]=r61+8|0}else{r32=HEAP32[r9];r43=r34-r32|0;r39=r43>>3;r40=r39+1|0;if(r40>>>0>536870911){r3=2837;break L3177}r62=r30-r32|0;do{if(r62>>3>>>0>268435454){HEAP32[r1]=0;HEAP32[r19>>2]=r20;r63=536870911;r3=2841;break}else{r32=r62>>2;r64=r32>>>0<r40>>>0?r40:r32;HEAP32[r1]=0;HEAP32[r19>>2]=r20;if((r64|0)==0){r65=0;r66=0;break}else{r63=r64;r3=2841;break}}}while(0);if(r3==2841){r3=0;r65=__Znwj(r63<<3);r66=r63}HEAP32[r14]=r65;r40=(r39<<3)+r65|0;HEAP32[r16]=r40;HEAP32[r18]=r40;HEAP32[r1]=(r66<<3)+r65|0;do{if((r39|0)==(r66|0)){if((r43|0)>0){r62=(r43+8>>3|0)/-2&-1;r33=(r39+r62<<3)+r65|0;HEAP32[r16]=r33;HEAP32[r18]=(r39+r62<<3)+r65|0;r67=r33;break}r33=r43>>2;r62=(r33|0)==0?1:r33;r33=__Znwj(r62<<3);r64=(r62>>>2<<3)+r33|0;HEAP32[r14]=r33;HEAP32[r18]=r64;HEAP32[r16]=r64;HEAP32[r1]=(r62<<3)+r33|0;if((r65|0)==0){r67=r64;break}__ZdlPv(r65|0);r67=r64}else{r67=r40}}while(0);if((r67|0)==0){r68=0}else{HEAP8[r67|0]=r50;HEAP32[r67+4>>2]=r29;r68=HEAP32[r16]}r40=r68+8|0;HEAP32[r16]=r40;r43=HEAP32[r7];r39=HEAP32[r9];if(r39>>>0<r43>>>0){r64=r43;while(1){r43=r64-8|0;__ZNSt3__114__split_bufferINS_4pairIbjEERNS_9allocatorIS2_EEE10push_frontERKS2_(r5,r43);r69=HEAP32[r9];if(r69>>>0<r43>>>0){r64=r43}else{break}}r70=r69;r71=HEAP32[r16]}else{r70=r39;r71=r40}HEAP32[r9]=HEAP32[r18];HEAP32[r18]=r70;HEAP32[r7]=r71;r64=HEAP32[r25>>2];HEAP32[r25>>2]=HEAP32[r1];HEAP32[r1]=r64;HEAP32[r14]=r70;HEAP32[r16]=r70;if((r70|0)==0){break}__ZdlPv(r70|0)}}while(0);if((HEAP8[r11]&1)<<24>>24==0){r29=HEAP32[r6];L3264:do{if((r29|0)>0){r30=0;r34=0;while(1){r64=r30+(__ZNK5Image14const_iterator4getLEv(HEAP32[r8]+(r34*44&-1)|0)&65535|0);r43=r34+1|0;r33=HEAP32[r6];if((r43|0)<(r33|0)){r30=r64;r34=r43}else{r72=r64;r73=r33;break L3264}}}else{r72=0;r73=r29}}while(0);r29=r72/(r73|0);HEAPF64[tempDoublePtr>>3]=r29,HEAP32[r17]=HEAP32[tempDoublePtr>>2],HEAP32[r17+1]=HEAP32[tempDoublePtr+4>>2];r34=r29<(HEAP32[r15]|0)&1;HEAP8[r22]=r34;HEAP8[r11]=1;r74=r34}else{r74=HEAP8[r22]}r57=0;r58=0;r59=r74&1}r34=r24+1|0;__ZN9BarDecode13PixelIteratorILb0EEppEv(r13);if((r34|0)>=(HEAP32[HEAP32[r10]+32>>2]|0)){r3=2870;break}r2=r59;r23=r58+1;r26=r57;r27=r31;r24=r34;r28=HEAP8[r11]}if(r3==2837){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}else if(r3==2870){STACKTOP=r4;return}}function __ZNSt3__127__tree_balance_after_insertIPNS_16__tree_node_baseIPvEEEEvT_S5_(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17;r3=0;r4=(r2|0)==(r1|0);HEAP8[r2+12|0]=r4&1;if(r4){return}else{r5=r2}while(1){r6=(r5+8|0)>>2;r7=HEAP32[r6];r2=r7+12|0;if((HEAP8[r2]&1)<<24>>24!=0){r3=2912;break}r8=(r7+8|0)>>2;r9=HEAP32[r8];r4=HEAP32[r9>>2];if((r7|0)==(r4|0)){r10=HEAP32[r9+4>>2];if((r10|0)==0){r3=2878;break}r11=r10+12|0;if((HEAP8[r11]&1)<<24>>24!=0){r3=2878;break}HEAP8[r2]=1;HEAP8[r9+12|0]=(r9|0)==(r1|0)&1;HEAP8[r11]=1}else{if((r4|0)==0){r3=2895;break}r11=r4+12|0;if((HEAP8[r11]&1)<<24>>24!=0){r3=2895;break}HEAP8[r2]=1;HEAP8[r9+12|0]=(r9|0)==(r1|0)&1;HEAP8[r11]=1}if((r9|0)==(r1|0)){r3=2910;break}else{r5=r9}}if(r3==2895){r1=r7|0;if((r5|0)==(HEAP32[r1>>2]|0)){r11=r5+4|0;r2=HEAP32[r11>>2];HEAP32[r1>>2]=r2;if((r2|0)==0){r12=r9}else{HEAP32[r2+8>>2]=r7;r12=HEAP32[r8]}HEAP32[r6]=r12;r12=HEAP32[r8];r2=r12|0;if((HEAP32[r2>>2]|0)==(r7|0)){HEAP32[r2>>2]=r5}else{HEAP32[r12+4>>2]=r5}HEAP32[r11>>2]=r7;HEAP32[r8]=r5;r13=r5;r14=HEAP32[r6]}else{r13=r7;r14=r9}HEAP8[r13+12|0]=1;HEAP8[r14+12|0]=0;r13=r14+4|0;r6=HEAP32[r13>>2];r11=r6|0;r12=HEAP32[r11>>2];HEAP32[r13>>2]=r12;if((r12|0)!=0){HEAP32[r12+8>>2]=r14}r12=(r14+8|0)>>2;HEAP32[r6+8>>2]=HEAP32[r12];r13=HEAP32[r12];r2=r13|0;if((HEAP32[r2>>2]|0)==(r14|0)){HEAP32[r2>>2]=r6}else{HEAP32[r13+4>>2]=r6}HEAP32[r11>>2]=r14;HEAP32[r12]=r6;return}else if(r3==2910){return}else if(r3==2878){if((r5|0)==(HEAP32[r7>>2]|0)){r15=r7;r16=r9}else{r5=r7+4|0;r6=HEAP32[r5>>2];r12=r6|0;r14=HEAP32[r12>>2];HEAP32[r5>>2]=r14;if((r14|0)==0){r17=r9}else{HEAP32[r14+8>>2]=r7;r17=HEAP32[r8]}r14=r6+8|0;HEAP32[r14>>2]=r17;r17=HEAP32[r8];r9=r17|0;if((HEAP32[r9>>2]|0)==(r7|0)){HEAP32[r9>>2]=r6}else{HEAP32[r17+4>>2]=r6}HEAP32[r12>>2]=r7;HEAP32[r8]=r6;r15=r6;r16=HEAP32[r14>>2]}HEAP8[r15+12|0]=1;HEAP8[r16+12|0]=0;r15=r16|0;r14=HEAP32[r15>>2];r6=r14+4|0;r8=HEAP32[r6>>2];HEAP32[r15>>2]=r8;if((r8|0)!=0){HEAP32[r8+8>>2]=r16}r8=(r16+8|0)>>2;HEAP32[r14+8>>2]=HEAP32[r8];r15=HEAP32[r8];r7=r15|0;if((HEAP32[r7>>2]|0)==(r16|0)){HEAP32[r7>>2]=r14}else{HEAP32[r15+4>>2]=r14}HEAP32[r6>>2]=r16;HEAP32[r8]=r14;return}else if(r3==2912){return}}function __ZN9BarDecode9TokenizerILb0EED1Ev(r1){var r2;HEAP32[r1>>2]=5263592;HEAP32[r1+8>>2]=5263672;r2=HEAP32[r1+24>>2];if((r2|0)==0){return}HEAP32[r1+28>>2]=r2;__ZdlPv(r2);return}function __ZN9BarDecode15BarcodeIteratorILb0EED0Ev(r1){var r2,r3,r4;r2=r1>>2;HEAP32[r2]=5263632;r3=HEAP32[r2+28];if((r3|0)!=0){HEAP32[r2+29]=r3;__ZdlPv(r3|0)}if((HEAP8[r1+92|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+25])}HEAP32[r2+1]=5263592;HEAP32[r2+3]=5263672;r3=HEAP32[r2+7];if((r3|0)==0){r4=r1;__ZdlPv(r4);return}HEAP32[r2+8]=r3;__ZdlPv(r3);r4=r1;__ZdlPv(r4);return}function __ZN9BarDecode13PixelIteratorILb0EED1Ev(r1){var r2;HEAP32[r1>>2]=5263672;r2=HEAP32[r1+16>>2];if((r2|0)==0){return}HEAP32[r1+20>>2]=r2;__ZdlPv(r2);return}function __ZN9BarDecode9TokenizerILb0EED0Ev(r1){var r2,r3;HEAP32[r1>>2]=5263592;HEAP32[r1+8>>2]=5263672;r2=HEAP32[r1+24>>2];if((r2|0)==0){r3=r1;__ZdlPv(r3);return}HEAP32[r1+28>>2]=r2;__ZdlPv(r2);r3=r1;__ZdlPv(r3);return}function __ZN9BarDecode13PixelIteratorILb0EED0Ev(r1){var r2,r3;HEAP32[r1>>2]=5263672;r2=HEAP32[r1+16>>2];if((r2|0)==0){r3=r1;__ZdlPv(r3);return}HEAP32[r1+20>>2]=r2;__ZdlPv(r2);r3=r1;__ZdlPv(r3);return}function __ZN9BarDecode15BarcodeIteratorILb0EEC2EPK5ImageijNS_12directions_tEii(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12;r8=r1>>2;HEAP32[r8]=5263632;HEAP32[r8+1]=5263592;HEAP32[r8+2]=r2;__ZN9BarDecode13PixelIteratorILb0EEC2EPK5Imageiii(r1+12|0,r2,r6,r7,r3);r7=r1+64|0;HEAPF64[tempDoublePtr>>3]=0,HEAP32[r7>>2]=HEAP32[tempDoublePtr>>2],HEAP32[r7+4>>2]=HEAP32[tempDoublePtr+4>>2];HEAP32[r8+18]=r3;HEAP32[r8+19]=r4;HEAP32[r8+20]=r5;HEAP8[r1+84|0]=0;HEAP32[r8+22]=0;r5=r1+92|0;HEAP8[r5]=0;HEAP8[r5+1|0]=0;r5=(r1+104|0)>>2;HEAP32[r5]=0;HEAP32[r5+1]=0;HEAP32[r5+2]=0;HEAP32[r5+3]=0;HEAP32[r5+4]=0;HEAP32[r5+5]=0;HEAP32[r5+6]=0;r5=HEAP32[r8+5]-1|0;r4=HEAP32[r8+7]>>2;r3=HEAP32[r8+4];__ZNK5Image4TypeEv(r3);r8=r3+32|0;r7=HEAP32[r8>>2];r6=r3+44|0;r2=r3+40|0;r9=r3+28|0;r10=HEAP32[r9>>2];do{if((r10|0)==0){r11=HEAP32[r3+24>>2];if((r11|0)==0){r12=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]+32>>2]](r11,r3);r11=HEAP32[r9>>2];if((r11|0)==0){r12=0;break}HEAP8[r3|0]=0;r12=r11}else{r12=r10}}while(0);r10=HEAP32[r3+36>>2];r3=r12+Math.imul((Math.imul(Math.imul(HEAP32[r6>>2],HEAP32[r8>>2]),HEAP32[r2>>2])+7|0)/8&-1,r10)|0;r10=(HEAP32[((r5*44&-1)+36>>2)+r4]|0)!=(r3|0);r3=(HEAP32[((r5*44&-1)+4>>2)+r4]-1|0)>>>0>2;do{if(r3|r10^1){if(r3&r10){break}return}else{if((HEAP32[((r5*44&-1)+16>>2)+r4]|0)!=(r7|0)){break}return}}while(0);__ZN9BarDecode15BarcodeIteratorILb0EE4nextEv(r1);return}function __ZN5Image14const_iteratorppEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13;r2=STACKTOP;STACKTOP=STACKTOP+12|0;r3=r2,r4=r3>>2;r5=HEAP32[r1+4>>2];if((r5|0)==8){r6=r1+36|0;HEAP32[r6>>2]=HEAP32[r6>>2]+6|0;STACKTOP=r2;return r1}else if((r5|0)==5){r6=r1+36|0;HEAP32[r6>>2]=HEAP32[r6>>2]+2|0;STACKTOP=r2;return r1}else if((r5|0)==7){r6=r1+36|0;HEAP32[r6>>2]=HEAP32[r6>>2]+4|0;STACKTOP=r2;return r1}else if((r5|0)==9){r6=r1+36|0;HEAP32[r6>>2]=HEAP32[r6>>2]+4|0;STACKTOP=r2;return r1}else if((r5|0)==2){r6=(r1+40|0)>>2;r7=HEAP32[r6]-2|0;HEAP32[r6]=r7;r8=(r1+16|0)>>2;r9=HEAP32[r8]+1|0;HEAP32[r8]=r9;r10=HEAP32[r1+12>>2];do{if((r7|0)<0){r11=r10}else{if((r9|0)==(r10|0)){r11=r9;break}STACKTOP=r2;return r1}}while(0);HEAP32[r6]=7;if((r9|0)==(r11|0)){HEAP32[r8]=0}r8=r1+36|0;HEAP32[r8>>2]=HEAP32[r8>>2]+1|0;STACKTOP=r2;return r1}else if((r5|0)==4){r8=r1+36|0;HEAP32[r8>>2]=HEAP32[r8>>2]+1|0;STACKTOP=r2;return r1}else if((r5|0)==6|(r5|0)==10){r8=r1+36|0;HEAP32[r8>>2]=HEAP32[r8>>2]+3|0;STACKTOP=r2;return r1}else if((r5|0)==1){r8=(r1+40|0)>>2;r11=HEAP32[r8]-1|0;HEAP32[r8]=r11;r9=(r1+16|0)>>2;r6=HEAP32[r9]+1|0;HEAP32[r9]=r6;r10=HEAP32[r1+12>>2];do{if((r11|0)<0){r12=r10}else{if((r6|0)==(r10|0)){r12=r6;break}STACKTOP=r2;return r1}}while(0);HEAP32[r8]=7;if((r6|0)==(r12|0)){HEAP32[r9]=0}r9=r1+36|0;HEAP32[r9>>2]=HEAP32[r9>>2]+1|0;STACKTOP=r2;return r1}else if((r5|0)==3){r5=(r1+40|0)>>2;r9=HEAP32[r5]-4|0;HEAP32[r5]=r9;r12=(r1+16|0)>>2;r6=HEAP32[r12]+1|0;HEAP32[r12]=r6;r8=HEAP32[r1+12>>2];do{if((r9|0)<0){r13=r8}else{if((r6|0)==(r8|0)){r13=r6;break}STACKTOP=r2;return r1}}while(0);HEAP32[r5]=7;if((r6|0)==(r13|0)){HEAP32[r12]=0}r12=r1+36|0;HEAP32[r12>>2]=HEAP32[r12>>2]+1|0;STACKTOP=r2;return r1}else{r12=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5254792),5255404),5253096),463);r13=HEAP32[r12+HEAP32[HEAP32[r12>>2]-12>>2]+28>>2],r6=r13>>2;r5=(r13+4|0)>>2;tempValue=HEAP32[r5],HEAP32[r5]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r4]=5270024;HEAP32[r4+1]=48;HEAP32[r4+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r3,766)}r3=HEAP32[1317507]-1|0;r4=HEAP32[r6+5];do{if(HEAP32[r6+6]-r4>>2>>>0>r3>>>0){r8=HEAP32[r4+(r3<<2)>>2];if((r8|0)==0){break}r9=FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]+28>>2]](r8,10);if(((tempValue=HEAP32[r5],HEAP32[r5]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r6]+8>>2]](r13)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r12,r9);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r12);STACKTOP=r2;return r1}}while(0);r1=___cxa_allocate_exception(4);HEAP32[r1>>2]=5260948;___cxa_throw(r1,5267528,954)}}function __ZN7Utility8ArgumentIiE5StartEv(r1){if((HEAP8[r1+48|0]&1)<<24>>24!=0){return}if((HEAP8[r1+50|0]&1)<<24>>24==0){return}HEAP32[r1+64>>2]=HEAP32[r1+60>>2];HEAP32[r1+52>>2]=0;return}function __ZNSt3__116__pad_and_outputIcNS_19ostreambuf_iteratorIcNS_11char_traitsIcEEEEEET0_S5_PKT_S8_S8_RNS_8ios_baseES6_(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25;r8=STACKTOP;r9=r2;r2=STACKTOP;STACKTOP=STACKTOP+4|0;HEAP32[r2>>2]=HEAP32[r9>>2];r9=r5-r3|0;r10=(r6+12|0)>>2;r6=HEAP32[r10];r11=(r6|0)>(r9|0)?r6-r9|0:0;L3439:do{if(r3>>>0<r4>>>0){r9=r2|0;r6=r3;r12=HEAP32[r9>>2];while(1){r13=HEAP8[r6];do{if((r12|0)==0){r14=0}else{r15=r12+24|0;r16=HEAP32[r15>>2];if((r16|0)!=(HEAP32[r12+28>>2]|0)){HEAP32[r15>>2]=r16+1|0;HEAP8[r16]=r13;r14=r12;break}if((FUNCTION_TABLE[HEAP32[HEAP32[r12>>2]+52>>2]](r12,r13&255)|0)!=-1){r14=r12;break}HEAP32[r9>>2]=0;r14=0}}while(0);r13=r6+1|0;if((r13|0)==(r4|0)){r17=r4;break L3439}else{r6=r13;r12=r14}}}else{r17=r3}}while(0);L3451:do{if((r11|0)!=0){r3=r2|0;r14=r7&255;r4=r11;r12=HEAP32[r3>>2];while(1){do{if((r12|0)==0){r18=0}else{r6=r12+24|0;r9=HEAP32[r6>>2];if((r9|0)!=(HEAP32[r12+28>>2]|0)){HEAP32[r6>>2]=r9+1|0;HEAP8[r9]=r7;r18=r12;break}if((FUNCTION_TABLE[HEAP32[HEAP32[r12>>2]+52>>2]](r12,r14)|0)!=-1){r18=r12;break}HEAP32[r3>>2]=0;r18=0}}while(0);r9=r4-1|0;if((r9|0)==0){break L3451}else{r4=r9;r12=r18}}}}while(0);r18=r2|0;r2=HEAP32[r18>>2];if(r17>>>0<r5>>>0){r19=r17;r20=r2;r21=r2}else{r22=r2;HEAP32[r10]=0;r23=r1|0;HEAP32[r23>>2]=r22;STACKTOP=r8;return}while(1){r2=HEAP8[r19];do{if((r20|0)==0){r24=0;r25=r21}else{r17=r20+24|0;r7=HEAP32[r17>>2];if((r7|0)!=(HEAP32[r20+28>>2]|0)){HEAP32[r17>>2]=r7+1|0;HEAP8[r7]=r2;r24=r20;r25=r21;break}if((FUNCTION_TABLE[HEAP32[HEAP32[r20>>2]+52>>2]](r20,r2&255)|0)!=-1){r24=r20;r25=r21;break}HEAP32[r18>>2]=0;r24=0;r25=0}}while(0);r2=r19+1|0;if((r2|0)==(r5|0)){r22=r25;break}else{r19=r2;r20=r24;r21=r25}}HEAP32[r10]=0;r23=r1|0;HEAP32[r23>>2]=r22;STACKTOP=r8;return}function __ZN7Utility8ArgumentIiED0Ev(r1){var r2,r3,r4,r5;r2=r1>>2;r3=r1|0;HEAP32[r3>>2]=5263692;r4=HEAP32[r2+15];if((r4|0)!=0){HEAP32[r2+16]=r4;__ZdlPv(r4)}HEAP32[r3>>2]=5263788;if((HEAP8[r1+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+9])}if((HEAP8[r1+16|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+6])}if((HEAP8[r1+4|0]&1)<<24>>24==0){r5=r1;__ZdlPv(r5);return}__ZdlPv(HEAP32[r2+3]);r5=r1;__ZdlPv(r5);return}function __ZN9BarDecode13PixelIteratorILb0EEC2EPK5Imageiii(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27;r6=STACKTOP;STACKTOP=STACKTOP+88|0;r7=r6;r8=r6+44;HEAP32[r1>>2]=5263672;HEAP32[r1+4>>2]=r2;r9=(r1+8|0)>>2;HEAP32[r9]=r3;HEAP32[r1+12>>2]=r4;r4=(r1+16|0)>>2;HEAP32[r4]=0;r10=r1+20|0;HEAP32[r10>>2]=0;r11=r1+24|0;HEAP32[r11>>2]=0;do{if((r3|0)==0){r12=0;r13=0}else{if(r3>>>0>97612893){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}else{r14=__Znwj(r3*44&-1);HEAP32[r4]=r14;r15=r14+(r3*44&-1)|0;HEAP32[r11>>2]=r15;HEAP32[r10>>2]=r15;r12=(HEAP32[r9]|0)>0;r13=r14;break}}}while(0);HEAP32[r1+28>>2]=r5;HEAP8[r1+49|0]=0;r5=(r1+32|0)>>2;HEAP32[r5]=0;HEAP32[r5+1]=0;HEAP32[r5+2]=0;HEAP32[r5+3]=0;if(!r12){STACKTOP=r6;return}r12=r8|0;r5=r8+4|0;r1=r8+8|0;r10=r2+32|0;r11=r2+44|0;r3=r2+40|0;r14=r8+12|0;r15=r2+28|0;r16=r2+24|0;r17=r2|0;r18=r8+36|0;r19=r8+16|0;r20=r8+40|0;r21=r2+36|0;r22=r7;r23=0;r24=r13;while(1){r13=r24+(r23*44&-1)|0;HEAP32[r12>>2]=r2;HEAP32[r5>>2]=__ZNK5Image4TypeEv(r2);r25=HEAP32[r10>>2];HEAP32[r1>>2]=(Math.imul(Math.imul(HEAP32[r11>>2],r25),HEAP32[r3>>2])+7|0)/8&-1;HEAP32[r14>>2]=r25;r25=HEAP32[r15>>2];do{if((r25|0)==0){r26=HEAP32[r16>>2];if((r26|0)==0){r27=0;break}FUNCTION_TABLE[HEAP32[HEAP32[r26>>2]+32>>2]](r26,r2);r26=HEAP32[r15>>2];if((r26|0)==0){r27=0;break}HEAP8[r17]=0;r27=r26}else{r27=r25}}while(0);HEAP32[r18>>2]=r27;HEAP32[r19>>2]=0;HEAP32[r20>>2]=7;r25=HEAP32[r21>>2]-1|0;__ZN5Image14const_iterator2atEii(r7,r8,0,(r25|0)<(r23|0)?r25:r23);_memcpy(r13,r22,44);__ZN5Image14const_iteratordeEv(HEAP32[r4]+(r23*44&-1)|0);r25=r23+1|0;if((r25|0)>=(HEAP32[r9]|0)){break}r23=r25;r24=HEAP32[r4]}STACKTOP=r6;return}function __ZN7Utility8ArgumentIiEC2ERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEESA_SA_RKiiibb(r1,r2,r3,r4,r5,r6,r7,r8,r9){var r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34;r10=0;r11=STACKTOP;STACKTOP=STACKTOP+40|0;r12=r11;r13=r11+20;r14=r1|0;HEAP32[r14>>2]=5263788;_memset(r1+4|0,0,36);HEAP8[r1+51|0]=1;HEAP32[r1+52>>2]=0;HEAP32[r1+56>>2]=0;__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+4|0,r2);__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+16|0,r3);__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+28|0,r4);HEAP32[r1+40>>2]=r6;r4=r1+44|0;HEAP32[r4>>2]=r7;HEAP8[r1+49|0]=r8&1;HEAP8[r1+50|0]=r9&1;if((r6|0)>(r7|0)){HEAP32[r4>>2]=r6;r15=r6}else{r15=r7}r7=r1+48|0;HEAP8[r7]=(r15|0)==0&1;HEAP32[r14>>2]=5263692;r14=r1+60|0,r15=r14>>2;r6=(r1+64|0)>>2;r4=r1+68|0;r9=r4|0;r8=r14>>2;HEAP32[r8]=0;HEAP32[r8+1]=0;HEAP32[r8+2]=0;HEAP32[r8+3]=0;r8=(r13+12|0)>>2;HEAP32[r8]=0;HEAP32[r13+16>>2]=r4;r14=__Znwj(4);r3=r14;r2=r13|0;HEAP32[r2>>2]=r3;r16=(r13+8|0)>>2;HEAP32[r16]=r3;r17=(r13+4|0)>>2;HEAP32[r17]=r3;HEAP32[r8]=r14+4|0;if((r14|0)==0){r18=0}else{HEAP32[r3>>2]=HEAP32[r5>>2];r18=HEAP32[r16]}r5=r18+4|0;HEAP32[r16]=r5;r18=HEAP32[r6];r3=HEAP32[r15];if(r3>>>0<r18>>>0){r14=r18;while(1){r18=r14-4|0;__ZNSt3__114__split_bufferIiRNS_9allocatorIiEEE10push_frontERKi(r13,r18);r19=HEAP32[r15];if(r19>>>0<r18>>>0){r14=r18}else{break}}r20=r19;r21=HEAP32[r16]}else{r20=r3;r21=r5}HEAP32[r15]=HEAP32[r17];HEAP32[r17]=r20;HEAP32[r6]=r21;r21=r1+68|0;r17=HEAP32[r21>>2];HEAP32[r21>>2]=HEAP32[r8];HEAP32[r8]=r17;HEAP32[r2>>2]=r20;HEAP32[r16]=r20;if((r20|0)!=0){__ZdlPv(r20)}if((HEAP8[r7]&1)<<24>>24==0){STACKTOP=r11;return}r7=HEAP32[r6];r20=HEAP32[r9>>2];if(r7>>>0<r20>>>0){if((r7|0)==0){r22=0}else{HEAP32[r7>>2]=0;r22=HEAP32[r6]}HEAP32[r6]=r22+4|0;STACKTOP=r11;return}r22=r4;r4=HEAP32[r15];r9=r7-r4|0;r7=r9>>2;r16=r7+1|0;if(r16>>>0>1073741823){r2=___cxa_allocate_exception(8);HEAP32[r2>>2]=5261044;r17=r2+4|0;if((r17|0)!=0){r8=__Znaj(19),r21=r8>>2;HEAP32[r21+1]=6;HEAP32[r21]=6;r5=r8+12|0;HEAP32[r17>>2]=r5;HEAP32[r21+2]=0;HEAP8[r5]=HEAP8[5252100];HEAP8[r5+1|0]=HEAP8[5252101|0];HEAP8[r5+2|0]=HEAP8[5252102|0];HEAP8[r5+3|0]=HEAP8[5252103|0];HEAP8[r5+4|0]=HEAP8[5252104|0];HEAP8[r5+5|0]=HEAP8[5252105|0];HEAP8[r5+6|0]=HEAP8[5252106|0]}HEAP32[r2>>2]=5261020;___cxa_throw(r2,5267564,444)}r2=r20-r4|0;do{if(r2>>2>>>0>536870910){r4=r12+12|0;HEAP32[r4>>2]=0;HEAP32[r12+16>>2]=r22;r23=1073741823;r24=r4;r10=3122;break}else{r4=r2>>1;r20=r4>>>0<r16>>>0?r16:r4;r4=r12+12|0;HEAP32[r4>>2]=0;HEAP32[r12+16>>2]=r22;if((r20|0)==0){r25=0;r26=0;r27=r4,r28=r27>>2;break}else{r23=r20;r24=r4;r10=3122;break}}}while(0);if(r10==3122){r25=__Znwj(r23<<2);r26=r23;r27=r24,r28=r27>>2}r27=(r12|0)>>2;HEAP32[r27]=r25;r24=(r7<<2)+r25|0;r23=(r12+8|0)>>2;HEAP32[r23]=r24;r10=(r12+4|0)>>2;HEAP32[r10]=r24;HEAP32[r28]=(r26<<2)+r25|0;do{if((r7|0)==(r26|0)){if((r9|0)>0){r22=(r7+((r9+4>>2|0)/-2&-1)<<2)+r25|0;HEAP32[r23]=r22;HEAP32[r10]=r22;r29=r22;break}r22=r9>>1;r16=(r22|0)==0?1:r22;r22=__Znwj(r16<<2);r2=(r16>>>2<<2)+r22|0;HEAP32[r27]=r22;HEAP32[r10]=r2;HEAP32[r23]=r2;HEAP32[r28]=(r16<<2)+r22|0;if((r25|0)==0){r29=r2;break}__ZdlPv(r25);r29=r2}else{r29=r24}}while(0);if((r29|0)==0){r30=0}else{HEAP32[r29>>2]=0;r30=HEAP32[r23]}r29=r30+4|0;HEAP32[r23]=r29;r30=HEAP32[r6];r24=HEAP32[r15];if(r24>>>0<r30>>>0){r25=r30;while(1){r9=r25-4|0;__ZNSt3__114__split_bufferIiRNS_9allocatorIiEEE10push_frontERKi(r12,r9);r31=HEAP32[r15];if(r31>>>0<r9>>>0){r25=r9}else{break}}r32=r31;r33=HEAP32[r6];r34=HEAP32[r23]}else{r32=r24;r33=r30;r34=r29}HEAP32[r15]=HEAP32[r10];HEAP32[r10]=r32;HEAP32[r6]=r34;HEAP32[r23]=r33;r33=r1+68|0;r1=HEAP32[r33>>2];HEAP32[r33>>2]=HEAP32[r28];HEAP32[r28]=r1;HEAP32[r27]=r32;HEAP32[r23]=r32;if((r32|0)==0){STACKTOP=r11;return}__ZdlPv(r32);STACKTOP=r11;return}function __ZN7Utility8ArgumentIiE13InterruptImplEv(r1){var r2,r3;r2=HEAP32[r1+72>>2];if((r2|0)==0){r3=1;return r3}r3=FUNCTION_TABLE[r2](r1);return r3}function __ZNSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev(r1){var r2,r3,r4;r2=r1>>2;HEAP32[r2]=5262380;HEAP32[r2+16]=5262420;HEAP32[r2+2]=5262400;r3=r1+12|0;HEAP32[r3>>2]=5262544;if((HEAP8[r1+44|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+13])}HEAP32[r3>>2]=5262680;r3=HEAP32[r2+4];r2=r3+4|0;if(((tempValue=HEAP32[r2>>2],HEAP32[r2>>2]=tempValue+ -1,tempValue)|0)!=0){r4=r1+64|0;__ZNSt3__18ios_baseD2Ev(r4);return}FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]+8>>2]](r3|0);r4=r1+64|0;__ZNSt3__18ios_baseD2Ev(r4);return}function __ZThn8_NSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev(r1){var r2,r3,r4,r5;r2=r1-144+136|0,r1=r2>>2;HEAP32[r1]=5262380;r3=r2+64|0;HEAP32[r3>>2]=5262420;HEAP32[r1+2]=5262400;r4=r2+12|0;HEAP32[r4>>2]=5262544;if((HEAP8[r2+44|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+13])}HEAP32[r4>>2]=5262680;r4=HEAP32[r1+4];r1=r4+4|0;if(((tempValue=HEAP32[r1>>2],HEAP32[r1>>2]=tempValue+ -1,tempValue)|0)!=0){r5=r3;__ZNSt3__18ios_baseD2Ev(r5);return}FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]+8>>2]](r4);r5=r3;__ZNSt3__18ios_baseD2Ev(r5);return}function __ZTv0_n12_NSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev(r1){var r2,r3,r4,r5,r6,r7;r2=r1,r3=r2>>2;r4=HEAP32[HEAP32[r1>>2]-12>>2],r1=r4>>2;HEAP32[r3+r1]=5262380;r5=r4+(r2+64)|0;HEAP32[r5>>2]=5262420;HEAP32[r1+(r3+2)]=5262400;r6=r4+(r2+12)|0;HEAP32[r6>>2]=5262544;if((HEAP8[r4+(r2+44)|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+(r3+13)])}HEAP32[r6>>2]=5262680;r6=HEAP32[r1+(r3+4)];r3=r6+4|0;if(((tempValue=HEAP32[r3>>2],HEAP32[r3>>2]=tempValue+ -1,tempValue)|0)!=0){r7=r5;__ZNSt3__18ios_baseD2Ev(r7);return}FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]+8>>2]](r6|0);r7=r5;__ZNSt3__18ios_baseD2Ev(r7);return}function __ZN7Utility8ArgumentIiE4ReadEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11;r2=STACKTOP;STACKTOP=STACKTOP+12|0;r3=r2,r4=r3>>2;r5=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5250672),r1+16|0),5250616);r1=HEAP32[r5+HEAP32[HEAP32[r5>>2]-12>>2]+28>>2],r6=r1>>2;r7=(r1+4|0)>>2;tempValue=HEAP32[r7],HEAP32[r7]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r4]=5270024;HEAP32[r4+1]=48;HEAP32[r4+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r3,766)}r3=HEAP32[1317507]-1|0;r4=HEAP32[r6+5];do{if(HEAP32[r6+6]-r4>>2>>>0>r3>>>0){r8=HEAP32[r4+(r3<<2)>>2];if((r8|0)==0){break}r9=FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]+28>>2]](r8,10);if(((tempValue=HEAP32[r7],HEAP32[r7]=tempValue+ -1,tempValue)|0)!=0){r10=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r5,r9);r11=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r5);STACKTOP=r2;return 0}FUNCTION_TABLE[HEAP32[HEAP32[r6]+8>>2]](r1);r10=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r5,r9);r11=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r5);STACKTOP=r2;return 0}}while(0);r2=___cxa_allocate_exception(4);HEAP32[r2>>2]=5260948;___cxa_throw(r2,5267528,954)}function __ZN7Utility8ArgumentIiE4ReadERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+32|0;r5=r4,r6=r5>>2;r7=r4+12;r8=(r1+52|0)>>2;r9=r1+44|0;if((HEAP32[r8]|0)>=(HEAP32[r9>>2]|0)){r10=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5250876),r1+16|0),5250812),HEAP32[r9>>2]),5251708);r9=HEAP32[r10+HEAP32[HEAP32[r10>>2]-12>>2]+28>>2],r11=r9>>2;r12=(r9+4|0)>>2;tempValue=HEAP32[r12],HEAP32[r12]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r6]=5270024;HEAP32[r6+1]=48;HEAP32[r6+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r5,766)}r5=HEAP32[1317507]-1|0;r6=HEAP32[r11+5];do{if(HEAP32[r11+6]-r6>>2>>>0>r5>>>0){r13=HEAP32[r6+(r5<<2)>>2];if((r13|0)==0){break}r14=FUNCTION_TABLE[HEAP32[HEAP32[r13>>2]+28>>2]](r13,10);if(((tempValue=HEAP32[r12],HEAP32[r12]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r11]+8>>2]](r9)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r10,r14);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r10);r15=0;STACKTOP=r4;return r15}}while(0);r10=___cxa_allocate_exception(4);HEAP32[r10>>2]=5260948;___cxa_throw(r10,5267528,954)}r10=__ZN7Utility8ArgumentIiE8ReadImplERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE(0,r2);r2=HEAP32[r1+64>>2];do{if((HEAP32[r8]|0)==0){r9=HEAP32[r1+60>>2];if((r2|0)==(r9|0)){r3=3215;break}HEAP32[r9>>2]=r10;break}else{r3=3215}}while(0);do{if(r3==3215){r9=(r1+64|0)>>2;r11=r1+68|0;r12=HEAP32[r11>>2];if(r2>>>0<r12>>>0){if((r2|0)==0){r16=0}else{HEAP32[r2>>2]=r10;r16=HEAP32[r9]}HEAP32[r9]=r16+4|0;break}r5=r11;r11=(r1+60|0)>>2;r6=HEAP32[r11];r14=r2-r6|0;r13=r14>>2;r17=r13+1|0;if(r17>>>0>1073741823){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}r18=r12-r6|0;do{if(r18>>2>>>0>536870910){r6=r7+12|0;HEAP32[r6>>2]=0;HEAP32[r7+16>>2]=r5;r19=1073741823;r20=r6;r3=3224;break}else{r6=r18>>1;r12=r6>>>0<r17>>>0?r17:r6;r6=r7+12|0;HEAP32[r6>>2]=0;HEAP32[r7+16>>2]=r5;if((r12|0)==0){r21=0;r22=0;r23=r6,r24=r23>>2;break}else{r19=r12;r20=r6;r3=3224;break}}}while(0);if(r3==3224){r21=__Znwj(r19<<2);r22=r19;r23=r20,r24=r23>>2}r5=(r7|0)>>2;HEAP32[r5]=r21;r17=(r13<<2)+r21|0;r18=(r7+8|0)>>2;HEAP32[r18]=r17;r6=(r7+4|0)>>2;HEAP32[r6]=r17;HEAP32[r24]=(r22<<2)+r21|0;do{if((r13|0)==(r22|0)){if((r14|0)>0){r12=(r13+((r14+4>>2|0)/-2&-1)<<2)+r21|0;HEAP32[r18]=r12;HEAP32[r6]=r12;r25=r12;break}r12=r14>>1;r26=(r12|0)==0?1:r12;r12=__Znwj(r26<<2);r27=(r26>>>2<<2)+r12|0;HEAP32[r5]=r12;HEAP32[r6]=r27;HEAP32[r18]=r27;HEAP32[r24]=(r26<<2)+r12|0;if((r21|0)==0){r25=r27;break}__ZdlPv(r21);r25=r27}else{r25=r17}}while(0);if((r25|0)==0){r28=0}else{HEAP32[r25>>2]=r10;r28=HEAP32[r18]}r17=r28+4|0;HEAP32[r18]=r17;r14=HEAP32[r9];r13=HEAP32[r11];if(r13>>>0<r14>>>0){r27=r14;while(1){r12=r27-4|0;__ZNSt3__114__split_bufferIiRNS_9allocatorIiEEE10push_frontERKi(r7,r12);r29=HEAP32[r11];if(r29>>>0<r12>>>0){r27=r12}else{break}}r30=r29;r31=HEAP32[r9];r32=HEAP32[r18]}else{r30=r13;r31=r14;r32=r17}HEAP32[r11]=HEAP32[r6];HEAP32[r6]=r30;HEAP32[r9]=r32;HEAP32[r18]=r31;r27=r1+68|0;r12=HEAP32[r27>>2];HEAP32[r27>>2]=HEAP32[r24];HEAP32[r24]=r12;HEAP32[r5]=r30;HEAP32[r18]=r30;if((r30|0)==0){break}__ZdlPv(r30)}}while(0);HEAP32[r8]=HEAP32[r8]+1|0;r8=r1+56|0;HEAP32[r8>>2]=HEAP32[r8>>2]+1|0;r15=1;STACKTOP=r4;return r15}function __ZN7Utility8ArgumentIiE8ReadImplERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20;r1=STACKTOP;STACKTOP=STACKTOP+160|0;r3=r1,r4=r3>>2;r5=r1+12,r6=r5>>2;r7=r1+156;r8=r5+64|0;r9=(r5|0)>>2;r10=r5+8|0;HEAP32[r10>>2]=5262400;r11=r5+12|0;HEAP32[r9]=5269188;r12=r5+64|0;HEAP32[r12>>2]=5269208;HEAP32[r6+1]=0;HEAP32[r6+22]=r11;HEAP32[r6+20]=0;HEAP32[r6+21]=0;HEAP32[r6+17]=4098;HEAP32[r6+19]=0;HEAP32[r6+18]=6;r13=r5+92|0;_memset(r5+96|0,0,40);r14=HEAP32[__ZNSt3__16locale8__globalEv()>>2];HEAP32[r13>>2]=r14;r15=r14+4|0;tempValue=HEAP32[r15>>2],HEAP32[r15>>2]=tempValue+1,tempValue;HEAP32[r6+34]=0;r15=HEAP32[r13>>2],r13=r15>>2;r14=(r15+4|0)>>2;tempValue=HEAP32[r14],HEAP32[r14]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r4]=5270024;HEAP32[r4+1]=48;HEAP32[r4+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r3,766)}r3=HEAP32[1317507]-1|0;r4=HEAP32[r13+5];do{if(HEAP32[r13+6]-r4>>2>>>0>r3>>>0){r16=HEAP32[r4+(r3<<2)>>2];if((r16|0)==0){break}r17=FUNCTION_TABLE[HEAP32[HEAP32[r16>>2]+28>>2]](r16,32);if(((tempValue=HEAP32[r14],HEAP32[r14]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r13]+8>>2]](r15)}HEAP8[r5+140|0]=r17;HEAP32[r9]=5262380;HEAP32[r8>>2]=5262420;HEAP32[r10>>2]=5262400;r17=r11|0;HEAP32[r17>>2]=5262680;r16=r5+16|0;r18=HEAP32[__ZNSt3__16locale8__globalEv()>>2];HEAP32[r16>>2]=r18;r19=r18+4|0;tempValue=HEAP32[r19>>2],HEAP32[r19>>2]=tempValue+1,tempValue;r19=(r5+20|0)>>2;HEAP32[r19]=0;HEAP32[r19+1]=0;HEAP32[r19+2]=0;HEAP32[r19+3]=0;HEAP32[r19+4]=0;HEAP32[r19+5]=0;HEAP32[r17>>2]=5262544;r17=(r5+44|0)>>2;HEAP32[r17]=0;HEAP32[r17+1]=0;HEAP32[r17+2]=0;HEAP32[r17+3]=0;HEAP32[r6+15]=24;__ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE3strERKNS_12basic_stringIcS2_S4_EE(r11,r2);__ZNSt3__113basic_istreamIcNS_11char_traitsIcEEErsERi(r5,r7);r17=HEAP32[r7>>2];HEAP32[r9]=5262380;HEAP32[r12>>2]=5262420;HEAP32[r6+2]=5262400;r19=r5+12|0;HEAP32[r19>>2]=5262544;if((HEAP8[r5+44|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r6+13])}HEAP32[r19>>2]=5262680;r19=HEAP32[r16>>2];r16=r19+4|0;if(((tempValue=HEAP32[r16>>2],HEAP32[r16>>2]=tempValue+ -1,tempValue)|0)!=0){r20=r5+64|0;__ZNSt3__18ios_baseD2Ev(r20);STACKTOP=r1;return r17}FUNCTION_TABLE[HEAP32[HEAP32[r19>>2]+8>>2]](r19|0);r20=r5+64|0;__ZNSt3__18ios_baseD2Ev(r20);STACKTOP=r1;return r17}}while(0);r1=___cxa_allocate_exception(4);HEAP32[r1>>2]=5260948;___cxa_throw(r1,5267528,954)}function __ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE7seekoffExNS_8ios_base7seekdirEj(r1,r2,r3,r4,r5,r6){var r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17;r7=r2>>2;r8=0;r9=r2+44|0;r10=HEAP32[r9>>2];r11=r2+24|0;r12=HEAP32[r11>>2];if(r10>>>0<r12>>>0){HEAP32[r9>>2]=r12;r13=r12}else{r13=r10}r10=r6&24;do{if((r10|0)==24){if((r5|0)==2){r8=3297;break}else if((r5|0)==0){r14=0;r15=0;break}else if((r5|0)!=1){r8=3301;break}r9=r1;HEAP32[r9>>2]=0;HEAP32[r9+4>>2]=0;r9=r1+8|0;HEAP32[r9>>2]=-1;HEAP32[r9+4>>2]=-1;return}else if((r10|0)==0){r9=r1;HEAP32[r9>>2]=0;HEAP32[r9+4>>2]=0;r9=r1+8|0;HEAP32[r9>>2]=-1;HEAP32[r9+4>>2]=-1;return}else{if((r5|0)==2){r8=3297;break}else if((r5|0)==0){r14=0;r15=0;break}else if((r5|0)!=1){r8=3301;break}if((r6&8|0)==0){r9=r12-HEAP32[r7+5]|0;r14=(r9|0)<0?-1:0;r15=r9;break}else{r9=HEAP32[r7+3]-HEAP32[r7+2]|0;r14=(r9|0)<0?-1:0;r15=r9;break}}}while(0);if(r8==3301){r5=r1;HEAP32[r5>>2]=0;HEAP32[r5+4>>2]=0;r5=r1+8|0;HEAP32[r5>>2]=-1;HEAP32[r5+4>>2]=-1;return}if(r8==3297){r8=r2+32|0;if((HEAP8[r8]&1)<<24>>24==0){r16=r8+1|0}else{r16=HEAP32[r7+10]}r8=r13-r16|0;r14=(r8|0)<0?-1:0;r15=r8}r8=_i64Add(r15,r14,r3,r4);r4=tempRet0;r3=0;do{if(!((r4|0)<(r3|0)|(r4|0)==(r3|0)&r8>>>0<0>>>0)){r14=r2+32|0;if((HEAP8[r14]&1)<<24>>24==0){r17=r14+1|0}else{r17=HEAP32[r7+10]}r14=r13-r17|0;r15=(r14|0)<0?-1:0;if((r15|0)<(r4|0)|(r15|0)==(r4|0)&r14>>>0<r8>>>0){break}r14=r6&8;do{if(!((r8|0)==0&(r4|0)==0)){do{if((r14|0)!=0){if((HEAP32[r7+3]|0)!=0){break}r15=r1;HEAP32[r15>>2]=0;HEAP32[r15+4>>2]=0;r15=r1+8|0;HEAP32[r15>>2]=-1;HEAP32[r15+4>>2]=-1;return}}while(0);if(!((r6&16|0)!=0&(r12|0)==0)){break}r15=r1;HEAP32[r15>>2]=0;HEAP32[r15+4>>2]=0;r15=r1+8|0;HEAP32[r15>>2]=-1;HEAP32[r15+4>>2]=-1;return}}while(0);if((r14|0)!=0){HEAP32[r7+3]=HEAP32[r7+2]+r8|0;HEAP32[r7+4]=r13}if((r6&16|0)!=0){HEAP32[r11>>2]=HEAP32[r7+5]+r8|0}r15=r1;HEAP32[r15>>2]=0;HEAP32[r15+4>>2]=0;r15=r1+8|0;HEAP32[r15>>2]=r8;HEAP32[r15+4>>2]=r4;return}}while(0);r4=r1;HEAP32[r4>>2]=0;HEAP32[r4+4>>2]=0;r4=r1+8|0;HEAP32[r4>>2]=-1;HEAP32[r4+4>>2]=-1;return}function __ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE9underflowEv(r1){var r2,r3,r4,r5,r6,r7;r2=r1+44|0;r3=HEAP32[r2>>2];r4=HEAP32[r1+24>>2];if(r3>>>0<r4>>>0){HEAP32[r2>>2]=r4;r5=r4}else{r5=r3}if((HEAP32[r1+48>>2]&8|0)==0){r6=-1;return r6}r3=r1+16|0;r4=HEAP32[r3>>2];r2=HEAP32[r1+12>>2];if(r4>>>0<r5>>>0){HEAP32[r3>>2]=r5;r7=r5}else{r7=r4}if(r2>>>0>=r7>>>0){r6=-1;return r6}r6=HEAPU8[r2];return r6}function __ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE9pbackfailEi(r1,r2){var r3,r4,r5,r6,r7,r8,r9;r3=r1+44|0;r4=HEAP32[r3>>2];r5=HEAP32[r1+24>>2];if(r4>>>0<r5>>>0){HEAP32[r3>>2]=r5;r6=r5}else{r6=r4}r4=(r1+8|0)>>2;r5=HEAP32[r4];r3=(r1+12|0)>>2;r7=HEAP32[r3];if(r5>>>0>=r7>>>0){r8=-1;return r8}if((r2|0)==-1){HEAP32[r4]=r5;HEAP32[r3]=r7-1|0;HEAP32[r1+16>>2]=r6;r8=0;return r8}r9=r7-1|0;do{if((HEAP32[r1+48>>2]&16|0)==0){if((r2<<24>>24|0)==(HEAP8[r9]<<24>>24|0)){break}else{r8=-1}return r8}}while(0);HEAP32[r4]=r5;HEAP32[r3]=r9;HEAP32[r1+16>>2]=r6;HEAP8[r9]=r2&255;r8=r2;return r8}function __ZNSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED0Ev(r1){var r2,r3;r2=r1>>2;HEAP32[r2]=5262380;HEAP32[r2+16]=5262420;HEAP32[r2+2]=5262400;r3=r1+12|0;HEAP32[r3>>2]=5262544;if((HEAP8[r1+44|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+13])}HEAP32[r3>>2]=5262680;r3=HEAP32[r2+4];r2=r3+4|0;if(((tempValue=HEAP32[r2>>2],HEAP32[r2>>2]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]+8>>2]](r3|0)}__ZNSt3__18ios_baseD2Ev(r1+64|0);__ZdlPv(r1);return}function __ZThn8_NSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED0Ev(r1){var r2,r3,r4;r2=r1-144+136|0,r1=r2>>2;HEAP32[r1]=5262380;r3=r2+64|0;HEAP32[r3>>2]=5262420;HEAP32[r1+2]=5262400;r4=r2+12|0;HEAP32[r4>>2]=5262544;if((HEAP8[r2+44|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+13])}HEAP32[r4>>2]=5262680;r4=HEAP32[r1+4];r1=r4+4|0;if(((tempValue=HEAP32[r1>>2],HEAP32[r1>>2]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]+8>>2]](r4)}__ZNSt3__18ios_baseD2Ev(r3);__ZdlPv(r2);return}function __ZTv0_n12_NSt3__118basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEED0Ev(r1){var r2,r3,r4,r5,r6,r7;r2=r1,r3=r2>>2;r4=HEAP32[HEAP32[r1>>2]-12>>2],r1=r4>>2;r5=r2+r4|0;HEAP32[r5>>2]=5262380;r6=r4+(r2+64)|0;HEAP32[r6>>2]=5262420;HEAP32[r1+(r3+2)]=5262400;r7=r4+(r2+12)|0;HEAP32[r7>>2]=5262544;if((HEAP8[r4+(r2+44)|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+(r3+13)])}HEAP32[r7>>2]=5262680;r7=HEAP32[r1+(r3+4)];r3=r7+4|0;if(((tempValue=HEAP32[r3>>2],HEAP32[r3>>2]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]+8>>2]](r7|0)}__ZNSt3__18ios_baseD2Ev(r6);__ZdlPv(r5);return}function __ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev(r1){var r2;r2=r1|0;HEAP32[r2>>2]=5262544;if((HEAP8[r1+32|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+40>>2])}HEAP32[r2>>2]=5262680;r2=HEAP32[r1+4>>2];r1=r2+4|0;if(((tempValue=HEAP32[r1>>2],HEAP32[r1>>2]=tempValue+ -1,tempValue)|0)!=0){return}FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]+8>>2]](r2|0);return}function __ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEED0Ev(r1){var r2,r3,r4;r2=r1|0;HEAP32[r2>>2]=5262544;if((HEAP8[r1+32|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+40>>2])}HEAP32[r2>>2]=5262680;r2=HEAP32[r1+4>>2];r3=r2+4|0;if(((tempValue=HEAP32[r3>>2],HEAP32[r3>>2]=tempValue+ -1,tempValue)|0)!=0){r4=r1;__ZdlPv(r4);return}FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]+8>>2]](r2|0);r4=r1;__ZdlPv(r4);return}function __ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE7seekposENS_4fposI10_mbstate_tEEj(r1,r2,r3,r4){var r5,r6;r5=STACKTOP;r6=r3>>2;r3=STACKTOP;STACKTOP=STACKTOP+16|0;HEAP32[r3>>2]=HEAP32[r6];HEAP32[r3+4>>2]=HEAP32[r6+1];HEAP32[r3+8>>2]=HEAP32[r6+2];HEAP32[r3+12>>2]=HEAP32[r6+3];r6=r3+8|0;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]+16>>2]](r1,r2,HEAP32[r6>>2],HEAP32[r6+4>>2],0,r4);STACKTOP=r5;return}function __ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE8overflowEi(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37;r3=r1>>2;if((r2|0)==-1){r4=0;return r4}r5=r1|0;r6=r1+12|0;r7=r1+8|0;r8=HEAP32[r6>>2]-HEAP32[r7>>2]|0;r9=(r1+24|0)>>2;r10=HEAP32[r9];r11=r1+28|0;r12=HEAP32[r11>>2];if((r10|0)==(r12|0)){r13=r1+48|0;if((HEAP32[r13>>2]&16|0)==0){r4=-1;return r4}r14=r1+20|0;r15=HEAP32[r14>>2];r16=r10-r15|0;r17=r1+44|0;r18=HEAP32[r17>>2]-r15|0;r15=r1+32|0;r19=r15;r20=r15;r21=HEAP8[r20];if((r21&1)<<24>>24==0){r22=10;r23=r21}else{r21=HEAP32[r15>>2];r22=(r21&-2)-1|0;r23=r21&255}r21=r23&255;if((r21&1|0)==0){r24=r21>>>1}else{r24=HEAP32[r3+9]}if((r24|0)==(r22|0)){__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEjjjjjj(r15,r22,1,r22,r22,0,0);r25=HEAP8[r20]}else{r25=r23}if((r25&1)<<24>>24==0){r26=r19+1|0}else{r26=HEAP32[r3+10]}HEAP8[r26+r24|0]=0;r25=r24+1|0;HEAP8[r26+r25|0]=0;r26=HEAP8[r20];if((r26&1)<<24>>24==0){r24=r25<<1&255;HEAP8[r20]=r24;r27=r24}else{HEAP32[r3+9]=r25;r27=r26}if((r27&1)<<24>>24==0){r28=10;r29=r27}else{r27=HEAP32[r15>>2];r28=(r27&-2)-1|0;r29=r27&255}r27=r29&255;if((r27&1|0)==0){r30=r27>>>1}else{r30=HEAP32[r3+9]}do{if(r30>>>0<r28>>>0){__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEjc(r15,r28-r30|0,0)}else{if((r29&1)<<24>>24==0){HEAP8[r19+(r28+1)|0]=0;HEAP8[r20]=r28<<1&255;break}else{HEAP8[HEAP32[r3+10]+r28|0]=0;HEAP32[r3+9]=r28;break}}}while(0);r28=HEAP8[r20];if((r28&1)<<24>>24==0){r31=r19+1|0}else{r31=HEAP32[r3+10]}r19=r28&255;if((r19&1|0)==0){r32=r19>>>1}else{r32=HEAP32[r3+9]}r19=r31+r32|0;HEAP32[r14>>2]=r31;HEAP32[r11>>2]=r19;r11=r31+r16|0;HEAP32[r9]=r11;r16=r31+r18|0;HEAP32[r17>>2]=r16;r33=r11;r34=r19;r35=r16;r36=r13}else{r33=r10;r34=r12;r35=HEAP32[r3+11];r36=r1+48|0}r12=r33+1|0;r10=r12>>>0<r35>>>0?r35:r12;HEAP32[r3+11]=r10;if((HEAP32[r36>>2]&8|0)!=0){r36=r1+32|0;if((HEAP8[r36]&1)<<24>>24==0){r37=r36+1|0}else{r37=HEAP32[r3+10]}HEAP32[r7>>2]=r37;HEAP32[r6>>2]=r37+r8|0;HEAP32[r3+4]=r10}if((r33|0)==(r34|0)){r4=FUNCTION_TABLE[HEAP32[HEAP32[r3]+52>>2]](r5,r2&255);return r4}else{HEAP32[r9]=r12;HEAP8[r33]=r2&255;r4=r2&255;return r4}}function __ZN7Utility8ArgumentIbE5StartEv(r1){if((HEAP8[r1+48|0]&1)<<24>>24!=0){return}if((HEAP8[r1+50|0]&1)<<24>>24==0){return}HEAP32[r1+64>>2]=0;HEAP32[r1+52>>2]=0;return}function __ZNSt3__115basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE3strERKNS_12basic_stringIcS2_S4_EE(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21;r3=r1>>2;r4=r1+32|0;__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r4,r2);r2=(r1+44|0)>>2;HEAP32[r2]=0;r5=r1+48|0;r6=HEAP32[r5>>2];if((r6&8|0)!=0){r7=r4;r8=HEAP8[r4];r9=(r8&1)<<24>>24==0;if(r9){r10=r7+1|0}else{r10=HEAP32[r3+10]}r11=r8&255;if((r11&1|0)==0){r12=r11>>>1}else{r12=HEAP32[r3+9]}r11=r10+r12|0;HEAP32[r2]=r11;if(r9){r13=r7+1|0;r14=r7+1|0}else{r7=HEAP32[r3+10];r13=r7;r14=r7}HEAP32[r3+2]=r14;HEAP32[r3+3]=r13;HEAP32[r3+4]=r11}if((r6&16|0)==0){return}r6=r4;r11=r4;r13=HEAP8[r11];r14=r13&255;if((r14&1|0)==0){r15=r14>>>1}else{r15=HEAP32[r3+9]}if((r13&1)<<24>>24==0){HEAP32[r2]=r6+(r15+1)|0;r16=10;r17=r13}else{HEAP32[r2]=HEAP32[r3+10]+r15|0;r2=HEAP32[r4>>2];r16=(r2&-2)-1|0;r17=r2&255}r2=r17&255;if((r2&1|0)==0){r18=r2>>>1}else{r18=HEAP32[r3+9]}do{if(r18>>>0<r16>>>0){__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEjc(r4,r16-r18|0,0)}else{if((r17&1)<<24>>24==0){HEAP8[r6+(r16+1)|0]=0;HEAP8[r11]=r16<<1&255;break}else{HEAP8[HEAP32[r3+10]+r16|0]=0;HEAP32[r3+9]=r16;break}}}while(0);r16=HEAP8[r11];if((r16&1)<<24>>24==0){r19=r6+1|0;r20=r6+1|0}else{r6=HEAP32[r3+10];r19=r6;r20=r6}r6=r16&255;if((r6&1|0)==0){r21=r6>>>1}else{r21=HEAP32[r3+9]}r6=r1+24|0;HEAP32[r6>>2]=r20;HEAP32[r3+5]=r20;HEAP32[r3+7]=r19+r21|0;if((HEAP32[r5>>2]&3|0)==0){return}HEAP32[r6>>2]=r20+r15|0;return}function __ZNSt3__114__split_bufferIiRNS_9allocatorIiEEE10push_frontERKi(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21;r3=(r1+4|0)>>2;r4=HEAP32[r3];r5=(r1|0)>>2;do{if((r4|0)==(HEAP32[r5]|0)){r6=(r1+8|0)>>2;r7=HEAP32[r6];r8=r1+12|0;r9=HEAP32[r8>>2];r10=r9;if(r7>>>0<r9>>>0){r9=r7;r11=(r10-r9+4>>2|0)/2&-1;r12=r9-r4|0;r9=(r11-(r12>>2)<<2)+r7|0;_memmove(r9,r4,r12,4,0);HEAP32[r3]=r9;HEAP32[r6]=(r11<<2)+HEAP32[r6]|0;r13=r9;break}r9=r10-r4>>1;r10=(r9|0)==0?1:r9;r9=__Znwj(r10<<2);r11=((r10+3|0)>>>2<<2)+r9|0;r12=(r10<<2)+r9|0;r10=HEAP32[r3];r7=HEAP32[r6];L3954:do{if((r10|0)==(r7|0)){r14=r11}else{r15=r10;r16=r11;while(1){if((r16|0)==0){r17=0}else{HEAP32[r16>>2]=HEAP32[r15>>2];r17=r16}r18=r17+4|0;r19=r15+4|0;if((r19|0)==(r7|0)){r14=r18;break L3954}else{r15=r19;r16=r18}}}}while(0);r7=HEAP32[r5];HEAP32[r5]=r9;HEAP32[r3]=r11;HEAP32[r6]=r14;HEAP32[r8>>2]=r12;if((r7|0)==0){r13=r11;break}__ZdlPv(r7);r13=HEAP32[r3]}else{r13=r4}}while(0);r4=r13-4|0;if((r4|0)==0){r20=r13;r21=r20-4|0;HEAP32[r3]=r21;return}HEAP32[r4>>2]=HEAP32[r2>>2];r20=HEAP32[r3];r21=r20-4|0;HEAP32[r3]=r21;return}function __ZN7Utility8ArgumentIbEC2ERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEESA_SA_iibb(r1,r2,r3,r4,r5,r6,r7,r8){var r9,r10;r9=r1|0;HEAP32[r9>>2]=5263788;_memset(r1+4|0,0,36);HEAP8[r1+51|0]=1;HEAP32[r1+52>>2]=0;HEAP32[r1+56>>2]=0;__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+4|0,r2);__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+16|0,r3);__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r1+28|0,r4);HEAP32[r1+40>>2]=r5;r4=r1+44|0;HEAP32[r4>>2]=r6;HEAP8[r1+49|0]=r7&1;HEAP8[r1+50|0]=r8&1;if((r5|0)>(r6|0)){HEAP32[r4>>2]=r5;r10=r5}else{r10=r6}r6=(r10|0)==0;HEAP8[r1+48|0]=r6&1;HEAP32[r9>>2]=5263740;r9=r1+60|0;r10=r1+64|0;r1=r9>>2;HEAP32[r1]=0;HEAP32[r1+1]=0;HEAP32[r1+2]=0;HEAP32[r1+3]=0;if(!r6){return}__ZNSt3__16vectorIbNS_9allocatorIbEEE7reserveEj(r9,32);r6=HEAP32[r10>>2];r1=HEAP32[r9>>2];HEAP32[r10>>2]=r6+1|0;r10=(r6>>>5<<2)+r1|0;HEAP32[r10>>2]=HEAP32[r10>>2]&(1<<(r6&31)^-1);return}function __ZN7Utility8ArgumentIbED0Ev(r1){var r2,r3,r4;r2=r1|0;HEAP32[r2>>2]=5263740;r3=HEAP32[r1+60>>2];if((r3|0)!=0){__ZdlPv(r3)}HEAP32[r2>>2]=5263788;if((HEAP8[r1+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+36>>2])}if((HEAP8[r1+16|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+24>>2])}if((HEAP8[r1+4|0]&1)<<24>>24==0){r4=r1;__ZdlPv(r4);return}__ZdlPv(HEAP32[r1+12>>2]);r4=r1;__ZdlPv(r4);return}function __ZN7Utility8ArgumentIbE13InterruptImplEv(r1){var r2,r3;r2=HEAP32[r1+72>>2];if((r2|0)==0){r3=1;return r3}r3=FUNCTION_TABLE[r2](r1);return r3}function __ZNSt3__114__copy_alignedINS_6vectorIbNS_9allocatorIbEEEELb0EEENS_14__bit_iteratorIT_Lb0EEENS5_IS6_XT0_EEES8_S7_(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24;r5=(r2|0)>>2;r6=HEAP32[r5];r7=HEAP32[r2+4>>2];r2=(HEAP32[r3>>2]-r6<<3)+(HEAP32[r3+4>>2]-r7)|0;if((r2|0)<=0){r8=r4|0,r9=r8>>2;r10=r1|0,r11=r10>>2;r12=HEAP32[r9];HEAP32[r11]=r12;r13=r1+4|0,r14=r13>>2;r15=r4+4|0,r16=r15>>2;r17=HEAP32[r16];HEAP32[r14]=r17;return}if((r7|0)==0){r18=r2;r19=r6;r20=r4|0,r21=r20>>2}else{r3=32-r7|0;r22=(r2|0)<(r3|0)?r2:r3;r23=-1>>>((r3-r22|0)>>>0)&-1<<r7;r7=HEAP32[r6>>2]&r23;r6=r4|0,r3=r6>>2;r24=HEAP32[r3];HEAP32[r24>>2]=HEAP32[r24>>2]&(r23^-1);r23=HEAP32[r3];HEAP32[r23>>2]=HEAP32[r23>>2]|r7;r7=r4+4|0;r23=HEAP32[r7>>2]+r22|0;HEAP32[r3]=(r23>>>5<<2)+HEAP32[r3]|0;HEAP32[r7>>2]=r23&31;r23=HEAP32[r5]+4|0;HEAP32[r5]=r23;r18=r2-r22|0;r19=r23;r20=r6,r21=r20>>2}r6=r18>>>5;_memmove(HEAP32[r21],r19,r6<<2,4,0);r19=r18-(r6<<5)|0;HEAP32[r21]=(r6<<2)+HEAP32[r21]|0;if((r19|0)<=0){r8=r20,r9=r8>>2;r10=r1|0,r11=r10>>2;r12=HEAP32[r9];HEAP32[r11]=r12;r13=r1+4|0,r14=r13>>2;r15=r4+4|0,r16=r15>>2;r17=HEAP32[r16];HEAP32[r14]=r17;return}r18=(r6<<2)+HEAP32[r5]|0;HEAP32[r5]=r18;r5=-1>>>((32-r19|0)>>>0);r6=HEAP32[r18>>2]&r5;r18=HEAP32[r21];HEAP32[r18>>2]=HEAP32[r18>>2]&(r5^-1);r5=HEAP32[r21];HEAP32[r5>>2]=HEAP32[r5>>2]|r6;HEAP32[r4+4>>2]=r19;r8=r20,r9=r8>>2;r10=r1|0,r11=r10>>2;r12=HEAP32[r9];HEAP32[r11]=r12;r13=r1+4|0,r14=r13>>2;r15=r4+4|0,r16=r15>>2;r17=HEAP32[r16];HEAP32[r14]=r17;return}function __ZNSt3__16__treeINS_4pairIN9BarDecode16scanner_result_tEiEENS_19__map_value_compareIS3_iN12_GLOBAL__N_14compELb1EEENS_9allocatorIS4_EEE7destroyEPNS_11__tree_nodeIS4_PvEE(r1,r2){if((r2|0)==0){return}__ZNSt3__16__treeINS_4pairIN9BarDecode16scanner_result_tEiEENS_19__map_value_compareIS3_iN12_GLOBAL__N_14compELb1EEENS_9allocatorIS4_EEE7destroyEPNS_11__tree_nodeIS4_PvEE(r1,HEAP32[r2>>2]);__ZNSt3__16__treeINS_4pairIN9BarDecode16scanner_result_tEiEENS_19__map_value_compareIS3_iN12_GLOBAL__N_14compELb1EEENS_9allocatorIS4_EEE7destroyEPNS_11__tree_nodeIS4_PvEE(r1,HEAP32[r2+4>>2]);r1=r2+16|0;if((HEAP8[r1+8|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+16>>2])}__ZdlPv(r2);return}function __ZNSt3__16vectorIbNS_9allocatorIbEEE7reserveEj(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13;r3=STACKTOP;STACKTOP=STACKTOP+32|0;r4=r3;r5=r3+8;r6=r3+16;r7=r1+8|0;if(HEAP32[r7>>2]<<5>>>0>=r2>>>0){STACKTOP=r3;return}if((r2|0)<0){__ZNKSt3__120__vector_base_commonILb1EE20__throw_length_errorEv(0)}r8=((r2-1|0)>>>5)+1|0;r2=__Znwj(r8<<2);r9=(r1|0)>>2;r10=HEAP32[r9];r11=r1+4|0;r1=HEAP32[r11>>2];r12=r1>>>5;r13=r1&31;HEAP32[r4>>2]=r10;HEAP32[r4+4>>2]=0;HEAP32[r5>>2]=(r12<<2)+r10|0;HEAP32[r5+4>>2]=r13;HEAP32[r6>>2]=r2;HEAP32[r6+4>>2]=0;__ZNSt3__114__copy_alignedINS_6vectorIbNS_9allocatorIbEEEELb0EEENS_14__bit_iteratorIT_Lb0EEENS5_IS6_XT0_EEES8_S7_(r3+24,r4,r5,r6);r6=HEAP32[r9];HEAP32[r9]=r2;HEAP32[r11>>2]=r12<<5|r13;HEAP32[r7>>2]=r8;if((r6|0)==0){STACKTOP=r3;return}__ZdlPv(r6);STACKTOP=r3;return}function __ZN7Utility8ArgumentIbE4ReadEv(r1){var r2;r2=HEAP32[r1+60>>2];HEAP32[r2>>2]=HEAP32[r2>>2]|1;r2=r1+52|0;HEAP32[r2>>2]=HEAP32[r2>>2]+1|0;return 1}function __ZN7Utility13BasicArgument5ProbeEv(r1){return(HEAP32[r1+52>>2]|0)<(HEAP32[r1+44>>2]|0)}function __ZN9BarDecode9code128_tC2Ev(r1){var r2;_memset(r1|0,-1,512);HEAP8[r1+358|0]=0;HEAP8[r1+310|0]=1;HEAP8[r1+307|0]=2;HEAP8[r1+76|0]=3;HEAP8[r1+70|0]=4;HEAP8[r1+38|0]=5;HEAP8[r1+100|0]=6;HEAP8[r1+98|0]=7;HEAP8[r1+50|0]=8;HEAP8[r1+292|0]=9;HEAP8[r1+290|0]=10;HEAP8[r1+274|0]=11;HEAP8[r1+206|0]=12;HEAP8[r1+110|0]=13;HEAP8[r1+103|0]=14;HEAP8[r1+230|0]=15;HEAP8[r1+118|0]=16;HEAP8[r1+115|0]=17;HEAP8[r1+313|0]=18;HEAP8[r1+302|0]=19;HEAP8[r1+295|0]=20;HEAP8[r1+370|0]=21;HEAP8[r1+314|0]=22;HEAP8[r1+439|0]=23;HEAP8[r1+422|0]=24;HEAP8[r1+406|0]=25;HEAP8[r1+403|0]=26;HEAP8[r1+434|0]=27;HEAP8[r1+410|0]=28;HEAP8[r1+409|0]=29;HEAP8[r1+364|0]=30;HEAP8[r1+355|0]=31;HEAP8[r1+283|0]=32;HEAP8[r1+140|0]=33;HEAP8[r1+44|0]=34;HEAP8[r1+35|0]=35;HEAP8[r1+196|0]=36;HEAP8[r1+52|0]=37;HEAP8[r1+49|0]=38;HEAP8[r1+324|0]=39;HEAP8[r1+276|0]=40;HEAP8[r1+273|0]=41;HEAP8[r1+220|0]=42;HEAP8[r1+199|0]=43;HEAP8[r1+55|0]=44;HEAP8[r1+236|0]=45;HEAP8[r1+227|0]=46;HEAP8[r1+59|0]=47;HEAP8[r1+443|0]=48;HEAP8[r1+327|0]=49;HEAP8[r1+279|0]=50;HEAP8[r1+372|0]=51;HEAP8[r1+369|0]=52;HEAP8[r1+375|0]=53;HEAP8[r1+428|0]=54;HEAP8[r1+419|0]=55;HEAP8[r1+395|0]=56;HEAP8[r1+436|0]=57;HEAP8[r1+433|0]=58;HEAP8[r1+397|0]=59;HEAP8[r1+445|0]=60;HEAP8[r1+289|0]=61;HEAP8[r1+453|0]=62;HEAP8[r1+152|0]=63;HEAP8[r1+134|0]=64;HEAP8[r1+88|0]=65;HEAP8[r1+67|0]=66;HEAP8[r1+22|0]=67;HEAP8[r1+19|0]=68;HEAP8[r1+200|0]=69;HEAP8[r1+194|0]=70;HEAP8[r1+104|0]=71;HEAP8[r1+97|0]=72;HEAP8[r1+26|0]=73;HEAP8[r1+25|0]=74;HEAP8[r1+265|0]=75;HEAP8[r1+296|0]=76;HEAP8[r1+477|0]=77;HEAP8[r1+266|0]=78;HEAP8[r1+61|0]=79;HEAP8[r1+158|0]=80;HEAP8[r1+94|0]=81;HEAP8[r1+79|0]=82;HEAP8[r1+242|0]=83;HEAP8[r1+122|0]=84;HEAP8[r1+121|0]=85;HEAP8[r1+466|0]=86;HEAP8[r1+458|0]=87;HEAP8[r1+457|0]=88;HEAP8[r1+367|0]=89;HEAP8[r1+379|0]=90;HEAP8[r1+475|0]=91;HEAP8[r1+188|0]=92;HEAP8[r1+143|0]=93;HEAP8[r1+47|0]=94;HEAP8[r1+244|0]=95;HEAP8[r1+241|0]=96;HEAP8[r1+468|0]=97;HEAP8[r1+465|0]=98;HEAP8[r1+239|0]=99;HEAP8[r1+247|0]=100;HEAP8[r1+431|0]=101;HEAP8[r1+471|0]=102;HEAP8[r1+322|0]=103;HEAP8[r1+328|0]=104;HEAP8[r1+334|0]=105;HEAP8[r1+285|0]=106;r2=r1+512|0;_memset(r2,-1,9);HEAP8[r2]=2;HEAP8[r1+513|0]=1;HEAP8[r1+514|0]=4;HEAP8[r1+515|0]=7;HEAP8[r1+516|0]=6;HEAP8[r1+517|0]=3;HEAP8[r1+518|0]=0;HEAP8[r1+519|0]=8;HEAP8[r1+520|0]=9;HEAP8[r1+521|0]=10;r2=r1+522|0;_memset(r2,-1,9);HEAP8[r2]=2;HEAP8[r1+523|0]=1;HEAP8[r1+524|0]=4;HEAP8[r1+525|0]=7;HEAP8[r1+526|0]=3;HEAP8[r1+527|0]=5;HEAP8[r1+528|0]=0;HEAP8[r1+529|0]=8;HEAP8[r1+530|0]=9;HEAP8[r1+531|0]=10;_memset(r1+532|0,-1,9);HEAP8[r1+536|0]=6;HEAP8[r1+537|0]=5;HEAP8[r1+538|0]=0;HEAP8[r1+539|0]=8;HEAP8[r1+540|0]=9;HEAP8[r1+541|0]=10;return}function __GLOBAL__I_a(){_memset(5270756,0,128);HEAP8[5270769]=48;HEAP8[5270781]=49;HEAP8[5270775]=50;HEAP8[5270817]=51;HEAP8[5270791]=52;HEAP8[5270805]=53;HEAP8[5270803]=54;HEAP8[5270815]=55;HEAP8[5270811]=56;HEAP8[5270767]=57;HEAP8[5270795]=48;HEAP8[5270807]=49;HEAP8[5270783]=50;HEAP8[5270789]=51;HEAP8[5270785]=52;HEAP8[5270813]=53;HEAP8[5270761]=54;HEAP8[5270773]=55;HEAP8[5270765]=56;HEAP8[5270779]=57;HEAP8[5270870]=48;HEAP8[5270858]=49;HEAP8[5270864]=50;HEAP8[5270822]=51;HEAP8[5270848]=52;HEAP8[5270834]=53;HEAP8[5270836]=54;HEAP8[5270824]=55;HEAP8[5270828]=56;HEAP8[5270872]=57;_memset(5270948,0,32);HEAP8[5270953]=1;HEAP8[5270958]=2;HEAP8[5270969]=3;HEAP8[5270959]=4;HEAP8[5270949]=5;_memset(5270884,0,63);HEAP8[5270947]=48;HEAP8[5270936]=49;HEAP8[5270934]=50;HEAP8[5270933]=51;HEAP8[5270928]=52;HEAP8[5270922]=53;HEAP8[5270919]=54;HEAP8[5270926]=55;HEAP8[5270925]=56;HEAP8[5270921]=57;__ZN9BarDecode9code128_tC2Ev(5271580);_memset(5272764,-1,512);HEAP8[5272816]=48;HEAP8[5273053]=49;HEAP8[5272861]=50;HEAP8[5273116]=51;HEAP8[5272813]=52;HEAP8[5273068]=53;HEAP8[5272876]=54;HEAP8[5272801]=55;HEAP8[5273056]=56;HEAP8[5272864]=57;HEAP8[5273029]=65;HEAP8[5272837]=66;HEAP8[5273092]=67;HEAP8[5272789]=68;HEAP8[5273044]=69;HEAP8[5272852]=70;HEAP8[5272777]=71;HEAP8[5273032]=72;HEAP8[5272840]=73;HEAP8[5272792]=74;HEAP8[5273023]=75;HEAP8[5272831]=76;HEAP8[5273086]=77;HEAP8[5272783]=78;HEAP8[5273038]=79;HEAP8[5272846]=80;HEAP8[5272771]=81;HEAP8[5273026]=82;HEAP8[5272834]=83;HEAP8[5272786]=84;HEAP8[5273149]=85;HEAP8[5272957]=86;HEAP8[5273212]=87;HEAP8[5272909]=88;HEAP8[5273164]=89;HEAP8[5272972]=90;HEAP8[5272897]=45;HEAP8[5273152]=46;HEAP8[5272960]=32;HEAP8[5272932]=36;HEAP8[5272926]=47;HEAP8[5272902]=43;HEAP8[5272806]=37;HEAP8[5272912]=-2;_memset(5273276,-1,128);HEAP8[5273324]=0;HEAP8[5273325]=1;HEAP8[5273326]=2;HEAP8[5273327]=3;HEAP8[5273328]=4;HEAP8[5273329]=5;HEAP8[5273330]=6;HEAP8[5273331]=7;HEAP8[5273332]=8;HEAP8[5273333]=9;HEAP8[5273341]=10;HEAP8[5273342]=11;HEAP8[5273343]=12;HEAP8[5273344]=13;HEAP8[5273345]=14;HEAP8[5273346]=15;HEAP8[5273347]=16;HEAP8[5273348]=17;HEAP8[5273349]=18;HEAP8[5273350]=19;HEAP8[5273351]=20;HEAP8[5273352]=21;HEAP8[5273353]=22;HEAP8[5273354]=23;HEAP8[5273355]=24;HEAP8[5273356]=25;HEAP8[5273357]=26;HEAP8[5273358]=27;HEAP8[5273359]=28;HEAP8[5273360]=29;HEAP8[5273361]=30;HEAP8[5273362]=31;HEAP8[5273363]=32;HEAP8[5273364]=33;HEAP8[5273365]=34;HEAP8[5273366]=35;HEAP8[5273321]=36;HEAP8[5273322]=37;HEAP8[5273308]=38;HEAP8[5273312]=39;HEAP8[5273323]=40;HEAP8[5273319]=41;HEAP8[5273313]=42;_memset(5271008,0,24);HEAP8[5271014]=48;HEAP8[5271025]=49;HEAP8[5271017]=50;HEAP8[5271032]=51;HEAP8[5271013]=52;HEAP8[5271028]=53;HEAP8[5271020]=54;HEAP8[5271011]=55;HEAP8[5271026]=56;HEAP8[5271018]=57;return}function __ZN7Utility13BasicArgumentD0Ev(r1){var r2;HEAP32[r1>>2]=5263788;if((HEAP8[r1+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+36>>2])}if((HEAP8[r1+16|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+24>>2])}if((HEAP8[r1+4|0]&1)<<24>>24==0){r2=r1;__ZdlPv(r2);return}__ZdlPv(HEAP32[r1+12>>2]);r2=r1;__ZdlPv(r2);return}function __ZN7Utility13BasicArgumentD2Ev(r1){HEAP32[r1>>2]=5263788;if((HEAP8[r1+28|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+36>>2])}if((HEAP8[r1+16|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r1+24>>2])}if((HEAP8[r1+4|0]&1)<<24>>24==0){return}__ZdlPv(HEAP32[r1+12>>2]);return}function __ZN7Utility8ArgumentIbE4ReadERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11;r2=STACKTOP;STACKTOP=STACKTOP+12|0;r1=r2,r3=r1>>2;r4=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5256312);r5=HEAP32[r4+HEAP32[HEAP32[r4>>2]-12>>2]+28>>2],r6=r5>>2;r7=(r5+4|0)>>2;tempValue=HEAP32[r7],HEAP32[r7]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r3]=5270024;HEAP32[r3+1]=48;HEAP32[r3+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r1,766)}r1=HEAP32[1317507]-1|0;r3=HEAP32[r6+5];do{if(HEAP32[r6+6]-r3>>2>>>0>r1>>>0){r8=HEAP32[r3+(r1<<2)>>2];if((r8|0)==0){break}r9=FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]+28>>2]](r8,10);if(((tempValue=HEAP32[r7],HEAP32[r7]=tempValue+ -1,tempValue)|0)!=0){r10=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r4,r9);r11=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r4);STACKTOP=r2;return 0}FUNCTION_TABLE[HEAP32[HEAP32[r6]+8>>2]](r5);r10=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r4,r9);r11=__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r4);STACKTOP=r2;return 0}}while(0);r2=___cxa_allocate_exception(4);HEAP32[r2>>2]=5260948;___cxa_throw(r2,5267528,954)}function __ZN7Utility13BasicArgument9InterruptEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23;r2=r1>>2;r3=STACKTOP;STACKTOP=STACKTOP+36|0;r4=r3,r5=r4>>2;r6=r3+12,r7=r6>>2;r8=r3+24,r9=r8>>2;do{if((HEAP8[r1+48|0]&1)<<24>>24==0){if((HEAP32[r2+14]|0)!=0){break}r10=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5255664),r1+16|0),5253196);r11=HEAP32[r10+HEAP32[HEAP32[r10>>2]-12>>2]+28>>2],r12=r11>>2;r13=(r11+4|0)>>2;tempValue=HEAP32[r13],HEAP32[r13]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r9]=5270024;HEAP32[r9+1]=48;HEAP32[r9+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r8,766)}r14=HEAP32[1317507]-1|0;r15=HEAP32[r12+5];do{if(HEAP32[r12+6]-r15>>2>>>0>r14>>>0){r16=HEAP32[r15+(r14<<2)>>2];if((r16|0)==0){break}r17=FUNCTION_TABLE[HEAP32[HEAP32[r16>>2]+28>>2]](r16,10);if(((tempValue=HEAP32[r13],HEAP32[r13]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r12]+8>>2]](r11)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r10,r17);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r10);r18=0;STACKTOP=r3;return r18}}while(0);r10=___cxa_allocate_exception(4);HEAP32[r10>>2]=5260948;___cxa_throw(r10,5267528,954)}}while(0);do{if((HEAP8[r1+49|0]&1)<<24>>24==0){r8=r1+40|0;if((HEAP32[r2+13]|0)>=(HEAP32[r8>>2]|0)){break}r9=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5252456),r1+16|0),5251708);r10=HEAP32[r9+HEAP32[HEAP32[r9>>2]-12>>2]+28>>2],r11=r10>>2;r12=(r10+4|0)>>2;tempValue=HEAP32[r12],HEAP32[r12]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r7]=5270024;HEAP32[r7+1]=48;HEAP32[r7+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r6,766)}r13=HEAP32[1317507]-1|0;r14=HEAP32[r11+5];do{if(HEAP32[r11+6]-r14>>2>>>0>r13>>>0){r15=HEAP32[r14+(r13<<2)>>2];if((r15|0)==0){break}r17=FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]+28>>2]](r15,10);if(((tempValue=HEAP32[r12],HEAP32[r12]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r11]+8>>2]](r10)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r9,r17);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r9);r17=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(r9,5251028),HEAP32[r8>>2]),5250248);r15=HEAP32[r17+HEAP32[HEAP32[r17>>2]-12>>2]+28>>2],r16=r15>>2;r19=(r15+4|0)>>2;tempValue=HEAP32[r19],HEAP32[r19]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r5]=5270024;HEAP32[r5+1]=48;HEAP32[r5+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r4,766)}r20=HEAP32[1317507]-1|0;r21=HEAP32[r16+5];do{if(HEAP32[r16+6]-r21>>2>>>0>r20>>>0){r22=HEAP32[r21+(r20<<2)>>2];if((r22|0)==0){break}r23=FUNCTION_TABLE[HEAP32[HEAP32[r22>>2]+28>>2]](r22,10);if(((tempValue=HEAP32[r19],HEAP32[r19]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r16]+8>>2]](r15)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r17,r23);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r17);HEAP32[r2+14]=0;r18=0;STACKTOP=r3;return r18}}while(0);r17=___cxa_allocate_exception(4);HEAP32[r17>>2]=5260948;___cxa_throw(r17,5267528,954)}}while(0);r8=___cxa_allocate_exception(4);HEAP32[r8>>2]=5260948;___cxa_throw(r8,5267528,954)}}while(0);HEAP32[r2+14]=0;r18=FUNCTION_TABLE[HEAP32[HEAP32[r2]+32>>2]](r1);STACKTOP=r3;return r18}function __ZN7Utility13BasicArgument8FinalizeEv(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10;r2=STACKTOP;STACKTOP=STACKTOP+12|0;r3=r2,r4=r3>>2;r5=r1+40|0;if((HEAP32[r1+52>>2]|0)>=(HEAP32[r5>>2]|0)){r6=1;STACKTOP=r2;return r6}r7=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEElsEi(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5249536),r1+16|0),5248936),HEAP32[r5>>2]),5248264);r5=HEAP32[r7+HEAP32[HEAP32[r7>>2]-12>>2]+28>>2],r1=r5>>2;r8=(r5+4|0)>>2;tempValue=HEAP32[r8],HEAP32[r8]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r4]=5270024;HEAP32[r4+1]=48;HEAP32[r4+2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r3,766)}r3=HEAP32[1317507]-1|0;r4=HEAP32[r1+5];do{if(HEAP32[r1+6]-r4>>2>>>0>r3>>>0){r9=HEAP32[r4+(r3<<2)>>2];if((r9|0)==0){break}r10=FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]+28>>2]](r9,10);if(((tempValue=HEAP32[r8],HEAP32[r8]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r1]+8>>2]](r5)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r7,r10);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r7);r6=0;STACKTOP=r2;return r6}}while(0);r6=___cxa_allocate_exception(4);HEAP32[r6>>2]=5260948;___cxa_throw(r6,5267528,954)}function __ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEEixERSD_(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18;r3=STACKTOP;STACKTOP=STACKTOP+4|0;r4=r3;r5=__ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEE16__find_equal_keyERPNS_16__tree_node_baseIPvEERSD_(r1,r4,r2)>>2;r6=HEAP32[r5];if((r6|0)!=0){r7=r6;r8=r7+28|0;STACKTOP=r3;return r8}r6=__Znwj(32),r9=r6>>2;r10=r6;r11=r6+16|0,r12=r11>>2;do{if((r11|0)!=0){r13=r2,r14=r13>>2;if((HEAP8[r13]&1)<<24>>24==0){HEAP32[r12]=HEAP32[r14];HEAP32[r12+1]=HEAP32[r14+1];HEAP32[r12+2]=HEAP32[r14+2];break}r14=HEAP32[r2+8>>2];r13=HEAP32[r2+4>>2];if((r13|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r13>>>0<11){HEAP8[r11]=r13<<1&255;r15=r6+17|0}else{r16=r13+16&-16;r17=__Znwj(r16);HEAP32[r9+6]=r17;HEAP32[r12]=r16|1;HEAP32[r9+5]=r13;r15=r17}_memcpy(r15,r14,r13);HEAP8[r15+r13|0]=0}}while(0);r15=r6+28|0;if((r15|0)!=0){HEAP32[r15>>2]=0}r15=HEAP32[r4>>2];r4=r6;HEAP32[r9]=0;HEAP32[r9+1]=0;HEAP32[r9+2]=r15;HEAP32[r5]=r4;r15=r1|0;r9=HEAP32[HEAP32[r15>>2]>>2];if((r9|0)==0){r18=r4}else{HEAP32[r15>>2]=r9;r18=HEAP32[r5]}__ZNSt3__127__tree_balance_after_insertIPNS_16__tree_node_baseIPvEEEEvT_S5_(HEAP32[r1+4>>2],r18);r18=r1+8|0;HEAP32[r18>>2]=HEAP32[r18>>2]+1|0;r7=r10;r8=r7+28|0;STACKTOP=r3;return r8}function __ZN7Utility12ArgumentList4ReadEiPPc(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66,r67,r68,r69,r70,r71,r72,r73,r74,r75,r76,r77,r78,r79,r80,r81,r82,r83,r84,r85,r86,r87,r88,r89,r90,r91,r92,r93,r94,r95,r96,r97,r98,r99,r100,r101;r4=0;r5=STACKTOP;STACKTOP=STACKTOP+76|0;r6=r5;r7=r5+12;r8=r5+24;r9=r5+44;r10=r5+48;r11=r5+52;r12=r5+64;r13=(r2<<2)+r3|0;do{if((r2|0)==1){r14=0}else{r15=r11,r16=r15>>2;r17=r11+1|0;r18=r12,r19=r18>>2;r20=r1+36|0;r21=r6;r22=r6|0;r23=r6+4|0;r24=r6+8|0;r25=(r11+8|0)>>2;r26=(r12+8|0)>>2;r27=(r1+28|0)>>2;r28=r1+32|0;r29=r28|0;r30=(r11+4|0)>>2;r31=r7;r32=r7|0;r33=r7+4|0;r34=r7+8|0;r35=r28;r28=(r1+24|0)>>2;r36=(r8+12|0)>>2;r37=r8+16|0;r38=(r8|0)>>2;r39=(r8+8|0)>>2;r40=(r8+4|0)>>2;r41=r1+32|0;r42=r12+1|0;r43=r1+12|0;r44=r10|0;r45=r1+16|0;r46=(r12+4|0)>>2;r47=r1|0;r48=r9|0;r49=r1+4|0;r50=r12|0;r51=r11|0;r52=0;r53=0,r54=r53>>2;r55=0;r56=r3+4|0;L4164:while(1){r57=HEAP32[r56>>2];r58=_strlen(r57);if((r58|0)==-1){r4=3692;break}if(r58>>>0<11){r59=r58<<1&255;HEAP8[r15]=r59;r60=r17;r61=r59}else{r59=r58+16&-16;r62=__Znwj(r59);HEAP32[r25]=r62;r63=r59|1;HEAP32[r51>>2]=r63;HEAP32[r30]=r58;r60=r62;r61=r63&255}_memcpy(r60,r57,r58);HEAP8[r60+r58|0]=0;if((r61&1)<<24>>24==0){HEAP32[r19]=HEAP32[r16];HEAP32[r19+1]=HEAP32[r16+1];HEAP32[r19+2]=HEAP32[r16+2];r64=r61}else{r58=HEAP32[r25];r57=HEAP32[r30];if((r57|0)==-1){r4=3699;break}if(r57>>>0<11){HEAP8[r18]=r57<<1&255;r65=r42;r66=r61}else{r63=r57+16&-16;r62=__Znwj(r63);HEAP32[r26]=r62;HEAP32[r50>>2]=r63|1;HEAP32[r46]=r57;r65=r62;r66=HEAP8[r15]}_memcpy(r65,r58,r57);HEAP8[r65+r57|0]=0;r64=r66}r57=r64&255;L4181:do{if((((r57&1|0)==0?r57>>>1:HEAP32[r30])|0)==0){r4=3730}else{if(HEAP8[(r64&1)<<24>>24==0?r17:HEAP32[r25]]<<24>>24!=45){r4=3730;break}r58=r64&255;do{if(((r58&1|0)==0?r58>>>1:HEAP32[r30])>>>0>1){if(HEAP8[(r64&1)<<24>>24==0?r17:HEAP32[r25]]<<24>>24!=45){r4=3724;break}if(HEAP8[((r64&1)<<24>>24==0?r17:HEAP32[r25])+1|0]<<24>>24!=45){r4=3724;break}r62=HEAP8[r18];r63=r62&255;r59=(r63&1|0)==0?r63>>>1:HEAP32[r46];r63=(r62&1)<<24>>24==0;r62=r63?r42:HEAP32[r26];r67=r59>>>0<2?r59:2;r68=r59-r67|0;if((r59|0)!=(r67|0)){_memmove(r62,r62+r67|0,r68,1,0)}if(r63){HEAP8[r18]=r68<<1&255}else{HEAP32[r46]=r68}HEAP8[r62+r68|0]=0;__ZNSt3__16__treeINS_4pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentEEENS_19__map_value_compareIS7_SA_NS_4lessIS7_EELb1EEENS5_ISB_EEE4findIS7_EENS_15__tree_iteratorISB_PNS_11__tree_nodeISB_PvEEiEERKT_(r10,r43,r12);r68=HEAP32[r44>>2];if((r68|0)==(r45|0)){r4=3730;break L4181}else{r69=r68;break}}else{r4=3724}}while(0);if(r4==3724){r4=0;r58=HEAP8[r18];r68=r58&255;r62=(r68&1|0)==0?r68>>>1:HEAP32[r46];r68=(r58&1)<<24>>24==0;r58=r68?r42:HEAP32[r26];r63=(r62|0)!=0&1;r67=r62-r63|0;if((r62|0)!=(r63|0)){_memmove(r58,r58+r63|0,r67,1,0)}if(r68){HEAP8[r18]=r67<<1&255}else{HEAP32[r46]=r67}HEAP8[r58+r67|0]=0;__ZNSt3__16__treeINS_4pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentEEENS_19__map_value_compareIS7_SA_NS_4lessIS7_EELb1EEENS5_ISB_EEE4findIS7_EENS_15__tree_iteratorISB_PNS_11__tree_nodeISB_PvEEiEERKT_(r9,r47,r12);r67=HEAP32[r48>>2];if((r67|0)==(r49|0)){r4=3730;break}else{r69=r67}}r67=HEAP32[r69+28>>2];r58=(r53|0)!=0;if((r67|0)==0){r68=(HEAP8[r20]&1)<<24>>24!=0;if(r58){r70=r68;r4=3737;break}else{r71=r68;r4=3742;break}}if(r58){r72=(FUNCTION_TABLE[HEAP32[HEAP32[r54]+24>>2]](r53)&1^1)+r52|0}else{r72=r52}FUNCTION_TABLE[HEAP32[HEAP32[r67>>2]+12>>2]](r67);r73=r55;r74=r67;r75=r72;r4=3743;break}}while(0);do{if(r4==3730){r4=0;r57=(HEAP8[r20]&1)<<24>>24!=0;if((r53|0)==0){r71=r57;r4=3742;break}else{r70=r57;r4=3737;break}}}while(0);do{if(r4==3742){r4=0;r73=r71?1:r55;r74=r71?0:r53;r75=r52;r4=3743;break}else if(r4==3737){r4=0;if(r70){if(!FUNCTION_TABLE[HEAP32[HEAP32[r54]+8>>2]](r53)){r76=1;r77=r52;r78=0;r4=3748;break}}r73=r55;r74=r53;r75=(FUNCTION_TABLE[HEAP32[HEAP32[r54]+20>>2]](r53,r11)&1^1)+r52|0;r4=3743;break}}while(0);do{if(r4==3743){r4=0;do{if((r74|0)==0){r79=0;r80=r75}else{if((HEAP8[r74+48|0]&1)<<24>>24==0){r79=r74;r80=r75;break}r57=FUNCTION_TABLE[HEAP32[HEAP32[r74>>2]+16>>2]](r74);r79=r57?r74:0;r80=(r57&1^1)+r75|0}}while(0);if((r73&1)<<24>>24!=0){r76=r73;r77=r80;r78=r79;r4=3748;break}if((r79|0)!=0){r81=r80;r82=r73;r83=r79;break}r57=__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5254656),r11);r67=HEAP32[r57+HEAP32[HEAP32[r57>>2]-12>>2]+28>>2],r58=r67>>2;r68=(r67+4|0)>>2;tempValue=HEAP32[r68],HEAP32[r68]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r22>>2]=5270024;HEAP32[r23>>2]=48;HEAP32[r24>>2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r21,766)}r63=HEAP32[1317507]-1|0;r62=HEAP32[r58+5];if(HEAP32[r58+6]-r62>>2>>>0<=r63>>>0){r4=3839;break L4164}r59=HEAP32[r62+(r63<<2)>>2];if((r59|0)==0){r4=3839;break L4164}r63=FUNCTION_TABLE[HEAP32[HEAP32[r59>>2]+28>>2]](r59,10);if(((tempValue=HEAP32[r68],HEAP32[r68]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r58]+8>>2]](r67)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r57,r63);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r57);r81=r80+1|0;r82=r73;r83=0;break}}while(0);do{if(r4==3748){r4=0;r57=HEAP32[r27],r63=r57>>2;r67=HEAP32[r29>>2];do{if(r57>>>0<r67>>>0){do{if((r57|0)!=0){if((HEAP8[r15]&1)<<24>>24==0){r58=r57>>2;HEAP32[r58]=HEAP32[r16];HEAP32[r58+1]=HEAP32[r16+1];HEAP32[r58+2]=HEAP32[r16+2];break}r58=HEAP32[r25];r68=HEAP32[r30];if((r68|0)==-1){r4=3753;break L4164}if(r68>>>0<11){HEAP8[r57]=r68<<1&255;r84=r57+1|0}else{r59=r68+16&-16;r62=__Znwj(r59);HEAP32[r63+2]=r62;HEAP32[r63]=r59|1;HEAP32[r63+1]=r68;r84=r62}_memcpy(r84,r58,r68);HEAP8[r84+r68|0]=0}}while(0);HEAP32[r27]=HEAP32[r27]+12|0}else{r68=HEAP32[r28];r58=r57-r68|0;r62=(r58|0)/12&-1;r59=r62+1|0;if(r59>>>0>357913941){r4=3762;break L4164}r85=(r67-r68|0)/12&-1;do{if(r85>>>0>178956969){HEAP32[r36]=0;HEAP32[r37>>2]=r35;r86=357913941;r4=3771;break}else{r68=r85<<1;r87=r68>>>0<r59>>>0?r59:r68;HEAP32[r36]=0;HEAP32[r37>>2]=r35;if((r87|0)==0){r88=0;r89=0;break}else{r86=r87;r4=3771;break}}}while(0);if(r4==3771){r4=0;r88=__Znwj(r86*12&-1);r89=r86}HEAP32[r38]=r88;r59=r88+(r62*12&-1)|0;HEAP32[r39]=r59;HEAP32[r40]=r59;HEAP32[r36]=r88+(r89*12&-1)|0;do{if((r62|0)==(r89|0)){r85=(r58|0)/12&-1;if((r58|0)>0){r87=r88+((r62+((r85+1|0)/-2&-1))*12&-1)|0;HEAP32[r39]=r87;HEAP32[r40]=r87;r90=r87,r91=r90>>2;break}r87=r85<<1;r85=(r87|0)==0?1:r87;r87=__Znwj(r85*12&-1);r68=r87+((r85>>>2)*12&-1)|0;HEAP32[r38]=r87;HEAP32[r40]=r68;HEAP32[r39]=r68;HEAP32[r36]=r87+(r85*12&-1)|0;L4275:do{if(0){while(1){if(!0){break L4275}}}}while(0);if((r88|0)==0){r90=r68,r91=r90>>2;break}__ZdlPv(r88);r90=r68,r91=r90>>2}else{r90=r59,r91=r90>>2}}while(0);do{if((r90|0)!=0){if((HEAP8[r15]&1)<<24>>24==0){r59=r90>>2;HEAP32[r59]=HEAP32[r16];HEAP32[r59+1]=HEAP32[r16+1];HEAP32[r59+2]=HEAP32[r16+2];break}r59=HEAP32[r25];r62=HEAP32[r30];if((r62|0)==-1){r4=3787;break L4164}if(r62>>>0<11){HEAP8[r90]=r62<<1&255;r92=r90+1|0}else{r58=r62+16&-16;r85=__Znwj(r58);HEAP32[r91+2]=r85;HEAP32[r91]=r58|1;HEAP32[r91+1]=r62;r92=r85}_memcpy(r92,r59,r62);HEAP8[r92+r62|0]=0}}while(0);r62=HEAP32[r39]+12|0;HEAP32[r39]=r62;r59=HEAP32[r27];r85=HEAP32[r28];if(r85>>>0<r59>>>0){r58=r59;while(1){r87=r58-12|0;__ZNSt3__114__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE10push_frontERKS6_(r8,r87);r93=HEAP32[r28];if(r93>>>0<r87>>>0){r58=r87}else{break}}r94=r93;r95=HEAP32[r27];r96=HEAP32[r39]}else{r94=r85;r95=r59;r96=r62}HEAP32[r28]=HEAP32[r40];HEAP32[r40]=r94;HEAP32[r27]=r96;HEAP32[r39]=r95;r58=HEAP32[r41>>2];HEAP32[r41>>2]=HEAP32[r36];HEAP32[r36]=r58;HEAP32[r38]=r94;L4302:do{if(r94>>>0<r95>>>0){r58=r95;while(1){r87=r58-12|0;HEAP32[r39]=r87;if((HEAP8[r87]&1)<<24>>24!=0){__ZdlPv(HEAP32[r58-12+8>>2])}if(r94>>>0<r87>>>0){r58=r87}else{break L4302}}}}while(0);if((r94|0)==0){break}__ZdlPv(r94)}}while(0);if((r78|0)==0){r81=r77;r82=r76;r83=0;break}r67=__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(5270288,5256196),r11),5255520);r57=HEAP32[r67+HEAP32[HEAP32[r67>>2]-12>>2]+28>>2],r63=r57>>2;r62=(r57+4|0)>>2;tempValue=HEAP32[r62],HEAP32[r62]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r32>>2]=5270024;HEAP32[r33>>2]=48;HEAP32[r34>>2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r31,766)}r59=HEAP32[1317507]-1|0;r85=HEAP32[r63+5];if(HEAP32[r63+6]-r85>>2>>>0<=r59>>>0){r4=3821;break L4164}r58=HEAP32[r85+(r59<<2)>>2];if((r58|0)==0){r4=3821;break L4164}r59=FUNCTION_TABLE[HEAP32[HEAP32[r58>>2]+28>>2]](r58,10);if(((tempValue=HEAP32[r62],HEAP32[r62]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r63]+8>>2]](r57)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r67,r59);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r67);r81=r77;r82=r76;r83=r78}}while(0);if((HEAP8[r18]&1)<<24>>24!=0){__ZdlPv(HEAP32[r26])}if((HEAP8[r15]&1)<<24>>24!=0){__ZdlPv(HEAP32[r25])}r67=r56+4|0;if((r67|0)==(r13|0)){r4=3858;break}else{r52=r81;r53=r83,r54=r53>>2;r55=r82;r56=r67}}if(r4==3839){r56=___cxa_allocate_exception(4);HEAP32[r56>>2]=5260948;___cxa_throw(r56,5267528,954)}else if(r4==3692){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r4==3821){r56=___cxa_allocate_exception(4);HEAP32[r56>>2]=5260948;___cxa_throw(r56,5267528,954)}else if(r4==3762){r56=___cxa_allocate_exception(8);HEAP32[r56>>2]=5261044;r55=r56+4|0;if((r55|0)!=0){r53=__Znaj(19),r54=r53>>2;HEAP32[r54+1]=6;HEAP32[r54]=6;r52=r53+12|0;HEAP32[r55>>2]=r52;HEAP32[r54+2]=0;HEAP8[r52]=HEAP8[5252100];HEAP8[r52+1|0]=HEAP8[5252101|0];HEAP8[r52+2|0]=HEAP8[5252102|0];HEAP8[r52+3|0]=HEAP8[5252103|0];HEAP8[r52+4|0]=HEAP8[5252104|0];HEAP8[r52+5|0]=HEAP8[5252105|0];HEAP8[r52+6|0]=HEAP8[5252106|0]}HEAP32[r56>>2]=5261020;___cxa_throw(r56,5267564,444)}else if(r4==3699){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r4==3787){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}else if(r4==3858){if((r83|0)==0){r14=r81;break}r14=(FUNCTION_TABLE[HEAP32[HEAP32[r83>>2]+24>>2]](r83)&1^1)+r81|0;break}else if(r4==3753){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}}}while(0);r4=HEAP32[r1+12>>2];r81=r1+16|0;if((r4|0)==(r81|0)){r97=r14;r98=(r97|0)==0;STACKTOP=r5;return r98}else{r99=r4;r100=r14}while(1){r14=HEAP32[r99+28>>2];r4=(FUNCTION_TABLE[HEAP32[HEAP32[r14>>2]+28>>2]](r14)&1^1)+r100|0;r14=HEAP32[r99+4>>2];L4357:do{if((r14|0)==0){r1=r99|0;while(1){r83=HEAP32[r1+8>>2];if((r1|0)==(HEAP32[r83>>2]|0)){r101=r83;break L4357}else{r1=r83}}}else{r1=r14;while(1){r83=HEAP32[r1>>2];if((r83|0)==0){r101=r1;break L4357}else{r1=r83}}}}while(0);if((r101|0)==(r81|0)){r97=r4;break}else{r99=r101;r100=r4}}r98=(r97|0)==0;STACKTOP=r5;return r98}function __ZN7Utility13BasicArgument13InterruptImplEv(r1){return 1}function __ZNSt3__16__treeINS_4pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentEEENS_19__map_value_compareIS7_SA_NS_4lessIS7_EELb1EEENS5_ISB_EEE4findIS7_EENS_15__tree_iteratorISB_PNS_11__tree_nodeISB_PvEEiEERKT_(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27;r4=r2+4|0;r2=r4;r5=HEAP32[r4>>2];do{if((r5|0)!=0){r4=HEAP8[r3];r6=r4&255;r7=(r6&1|0)==0;r8=r6>>>1;r6=(r4&1)<<24>>24==0;r4=r3+1|0;r9=r3+8|0;r10=r3+4|0;r11=r5;r12=r2;L4369:while(1){r13=r11,r14=r13>>2;while(1){r15=r13;r16=r13+16|0;r17=HEAP8[r16];r18=r17&255;if((r18&1|0)==0){r19=r18>>>1}else{r19=HEAP32[r14+5]}if(r7){r20=r8}else{r20=HEAP32[r10>>2]}if((r17&1)<<24>>24==0){r21=r16+1|0}else{r21=HEAP32[r14+6]}if(r6){r22=r4}else{r22=HEAP32[r9>>2]}r16=_memcmp(r21,r22,r20>>>0<r19>>>0?r20:r19);if((r16|0)==0){if(r19>>>0>=r20>>>0){break}}else{if((r16|0)>=0){break}}r16=HEAP32[r14+1];if((r16|0)==0){r23=r12;break L4369}else{r13=r16,r14=r13>>2}}r13=HEAP32[r14];if((r13|0)==0){r23=r15;break}else{r11=r13;r12=r15}}if((r23|0)==(r2|0)){break}if(r7){r24=r8}else{r24=HEAP32[r10>>2]}r12=r23+16|0;r11=HEAP8[r12];r13=r11&255;if((r13&1|0)==0){r25=r13>>>1}else{r25=HEAP32[r23+20>>2]}if(r6){r26=r4}else{r26=HEAP32[r9>>2]}if((r11&1)<<24>>24==0){r27=r12+1|0}else{r27=HEAP32[r23+24>>2]}r12=_memcmp(r26,r27,r25>>>0<r24>>>0?r25:r24);if((r12|0)==0){if(r24>>>0<r25>>>0){break}}else{if((r12|0)<0){break}}HEAP32[r1>>2]=r23;return}}while(0);HEAP32[r1>>2]=r2;return}function __ZNK7Utility12ArgumentList5UsageERNSt3__113basic_ostreamIcNS1_11char_traitsIcEEEE(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+24|0;r5=r4;r6=r4+12;r7=HEAP32[r1+12>>2];r8=r1+16|0;if((r7|0)==(r8|0)){STACKTOP=r4;return}r1=r6;r9=r5;r10=r5|0;r11=r5+4|0;r12=r5+8|0;r5=r6|0;r13=r6+4|0;r14=r6+8|0;r6=r7;while(1){r7=(r6+28|0)>>2;r15=HEAP32[r7];if((HEAP8[r15+51|0]&1)<<24>>24!=0){r16=HEAPU8[r15+4|0];if((r16&1|0)==0){r17=r16>>>1}else{r17=HEAP32[r15+8>>2]}if((r17|0)==0){__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(r2,5253764)}else{__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(r2,5254332),HEAP32[r7]+4|0),5248324)}r15=__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(r2,5253644),HEAP32[r7]+16|0);r16=HEAP32[r15+HEAP32[HEAP32[r15>>2]-12>>2]+28>>2],r18=r16>>2;r19=(r16+4|0)>>2;tempValue=HEAP32[r19],HEAP32[r19]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r5>>2]=5270024;HEAP32[r13>>2]=48;HEAP32[r14>>2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r1,766)}r20=HEAP32[1317507]-1|0;r21=HEAP32[r18+5];if(HEAP32[r18+6]-r21>>2>>>0<=r20>>>0){r3=3921;break}r22=HEAP32[r21+(r20<<2)>>2];if((r22|0)==0){r3=3921;break}r20=FUNCTION_TABLE[HEAP32[HEAP32[r22>>2]+28>>2]](r22,10);if(((tempValue=HEAP32[r19],HEAP32[r19]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r18]+8>>2]](r16)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r15,r20);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r15);r20=__ZNSt3__1lsIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS_13basic_ostreamIT_T0_EES9_RKNS_12basic_stringIS6_S7_T1_EE(__ZNSt3__1lsINS_11char_traitsIcEEEERNS_13basic_ostreamIcT_EES6_PKc(r15,5253492),HEAP32[r7]+28|0);r7=HEAP32[r20+HEAP32[HEAP32[r20>>2]-12>>2]+28>>2],r15=r7>>2;r16=(r7+4|0)>>2;tempValue=HEAP32[r16],HEAP32[r16]=tempValue+1,tempValue;if((HEAP32[1317506]|0)!=-1){HEAP32[r10>>2]=5270024;HEAP32[r11>>2]=48;HEAP32[r12>>2]=0;__ZNSt3__111__call_onceERVmPvPFvS2_E(5270024,r9,766)}r18=HEAP32[1317507]-1|0;r19=HEAP32[r15+5];if(HEAP32[r15+6]-r19>>2>>>0<=r18>>>0){r3=3935;break}r22=HEAP32[r19+(r18<<2)>>2];if((r22|0)==0){r3=3935;break}r18=FUNCTION_TABLE[HEAP32[HEAP32[r22>>2]+28>>2]](r22,10);if(((tempValue=HEAP32[r16],HEAP32[r16]=tempValue+ -1,tempValue)|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r15]+8>>2]](r7)}__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE3putEc(r20,r18);__ZNSt3__113basic_ostreamIcNS_11char_traitsIcEEE5flushEv(r20)}r20=HEAP32[r6+4>>2];L4450:do{if((r20|0)==0){r18=r6|0;while(1){r7=HEAP32[r18+8>>2];if((r18|0)==(HEAP32[r7>>2]|0)){r23=r7;break L4450}else{r18=r7}}}else{r18=r20;while(1){r7=HEAP32[r18>>2];if((r7|0)==0){r23=r18;break L4450}else{r18=r7}}}}while(0);if((r23|0)==(r8|0)){r3=3953;break}else{r6=r23}}if(r3==3935){r23=___cxa_allocate_exception(4);HEAP32[r23>>2]=5260948;___cxa_throw(r23,5267528,954)}else if(r3==3953){STACKTOP=r4;return}else if(r3==3921){r3=___cxa_allocate_exception(4);HEAP32[r3>>2]=5260948;___cxa_throw(r3,5267528,954)}}function __ZNSt3__114__split_bufferINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEERNS4_IS6_EEE10push_frontERKS6_(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34;r3=0;r4=(r1+4|0)>>2;r5=HEAP32[r4];r6=r5;r7=(r1|0)>>2;do{if((r5|0)==(HEAP32[r7]|0)){r8=(r1+8|0)>>2;r9=HEAP32[r8];r10=(r1+12|0)>>2;r11=HEAP32[r10];r12=r11;if(r9>>>0<r11>>>0){r11=(((r12-r9|0)/12&-1)+1|0)/2&-1;r13=r9+(r11*12&-1)|0;if((r5|0)==(r9|0)){r14=r13;r15=r5}else{r16=r11-1-Math.floor(((r9-12+ -r6|0)>>>0)/12)|0;r17=r13;r13=r9;while(1){r18=r17-12|0;r19=r13-12|0;__ZNSt3__112basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSERKS5_(r18,r19);if((r5|0)==(r19|0)){break}else{r17=r18;r13=r19}}r14=r9+(r16*12&-1)|0;r15=HEAP32[r8]}HEAP32[r4]=r14;HEAP32[r8]=r15+(r11*12&-1)|0;break}r13=((r12-r6|0)/12&-1)<<1;r17=(r13|0)==0?1:r13;r13=__Znwj(r17*12&-1);r19=r13+(((r17+3|0)>>>2)*12&-1)|0;r18=r13+(r17*12&-1)|0;r17=HEAP32[r4];r20=HEAP32[r8];L4475:do{if((r17|0)==(r20|0)){r21=HEAP32[r7];HEAP32[r7]=r13;HEAP32[r4]=r19;HEAP32[r8]=r19;HEAP32[r10]=r18;r22=r21}else{r21=r17;r23=r19,r24=r23>>2;L4476:while(1){do{if((r23|0)!=0){r25=r21,r26=r25>>2;if((HEAP8[r25]&1)<<24>>24==0){r25=r23>>2;HEAP32[r25]=HEAP32[r26];HEAP32[r25+1]=HEAP32[r26+1];HEAP32[r25+2]=HEAP32[r26+2];break}r26=HEAP32[r21+8>>2];r25=HEAP32[r21+4>>2];if((r25|0)==-1){r3=3967;break L4476}if(r25>>>0<11){HEAP8[r23]=r25<<1&255;r27=r23+1|0}else{r28=r25+16&-16;r29=__Znwj(r28);HEAP32[r24+2]=r29;HEAP32[r24]=r28|1;HEAP32[r24+1]=r25;r27=r29}_memcpy(r27,r26,r25);HEAP8[r27+r25|0]=0}}while(0);r30=r23+12|0;r25=r21+12|0;if((r25|0)==(r20|0)){break}else{r21=r25;r23=r30,r24=r23>>2}}if(r3==3967){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}r23=HEAP32[r4];r24=HEAP32[r8];r21=HEAP32[r7];HEAP32[r7]=r13;HEAP32[r4]=r19;HEAP32[r8]=r30;HEAP32[r10]=r18;if(r23>>>0<r24>>>0){r31=r24}else{r22=r21;break}while(1){r24=r31-12|0;if((HEAP8[r24]&1)<<24>>24!=0){__ZdlPv(HEAP32[r31-12+8>>2])}if(r23>>>0<r24>>>0){r31=r24}else{r22=r21;break L4475}}}}while(0);if((r22|0)==0){break}__ZdlPv(r22)}}while(0);r22=HEAP32[r4];r31=r22-12|0;if((r31|0)==0){r32=HEAP32[r4];r33=r32-12|0;HEAP32[r4]=r33;return}r30=r2,r7=r30>>2;if((HEAP8[r30]&1)<<24>>24==0){r30=r31>>2;HEAP32[r30]=HEAP32[r7];HEAP32[r30+1]=HEAP32[r7+1];HEAP32[r30+2]=HEAP32[r7+2];r32=HEAP32[r4];r33=r32-12|0;HEAP32[r4]=r33;return}r7=HEAP32[r2+8>>2];r30=HEAP32[r2+4>>2];if((r30|0)==-1){__ZNKSt3__121__basic_string_commonILb1EE20__throw_length_errorEv(0)}if(r30>>>0<11){HEAP8[r31]=r30<<1&255;r34=r31+1|0}else{r2=r30+16&-16;r3=__Znwj(r2);HEAP32[r22-12+8>>2]=r3;HEAP32[r31>>2]=r2|1;HEAP32[r22-12+4>>2]=r30;r34=r3}_memcpy(r34,r7,r30);HEAP8[r34+r30|0]=0;r32=HEAP32[r4];r33=r32-12|0;HEAP32[r4]=r33;return}function _jpeg_suppress_tables(r1,r2){var r3;r3=r1>>2;r1=HEAP32[r3+21];if((r1|0)!=0){HEAP32[r1+128>>2]=r2}r1=HEAP32[r3+22];if((r1|0)!=0){HEAP32[r1+128>>2]=r2}r1=HEAP32[r3+23];if((r1|0)!=0){HEAP32[r1+128>>2]=r2}r1=HEAP32[r3+24];if((r1|0)!=0){HEAP32[r1+128>>2]=r2}r1=HEAP32[r3+29];if((r1|0)!=0){HEAP32[r1+276>>2]=r2}r1=HEAP32[r3+33];if((r1|0)!=0){HEAP32[r1+276>>2]=r2}r1=HEAP32[r3+30];if((r1|0)!=0){HEAP32[r1+276>>2]=r2}r1=HEAP32[r3+34];if((r1|0)!=0){HEAP32[r1+276>>2]=r2}r1=HEAP32[r3+31];if((r1|0)!=0){HEAP32[r1+276>>2]=r2}r1=HEAP32[r3+35];if((r1|0)!=0){HEAP32[r1+276>>2]=r2}r1=HEAP32[r3+32];if((r1|0)!=0){HEAP32[r1+276>>2]=r2}r1=HEAP32[r3+36];if((r1|0)==0){return}HEAP32[r1+276>>2]=r2;return}function __ZNSt3__13mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentENS_4lessIS6_EENS4_INS_4pairIKS6_S9_EEEEE16__find_equal_keyERPNS_16__tree_node_baseIPvEERSD_(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39;r4=0;r5=r1+4|0;r1=r5|0;r6=HEAP32[r1>>2];if((r6|0)==0){HEAP32[r2>>2]=r5;r7=r1;return r7}r1=HEAP8[r3];r5=r1&255;r8=r5>>>1;r9=(r1&1)<<24>>24==0;r1=r3+1|0;r10=(r3+8|0)>>2;r11=r3+4|0;L4561:do{if((r5&1|0)==0){r3=r6,r12=r3>>2;while(1){r13=r3+16|0;r14=r13;r15=HEAP8[r13];r13=r15&255;r16=(r13&1|0)==0;if(r16){r17=r13>>>1}else{r17=HEAP32[r12+5]}if(r9){r18=r1}else{r18=HEAP32[r10]}r19=(r15&1)<<24>>24==0;if(r19){r20=r14+1|0}else{r20=HEAP32[r12+6]}r15=_memcmp(r18,r20,r17>>>0<r8>>>0?r17:r8);do{if((r15|0)==0){if(r8>>>0<r17>>>0){r4=4055;break}else{break}}else{if((r15|0)<0){r4=4055;break}else{break}}}while(0);if(r4==4055){r4=0;r15=r3|0;r21=HEAP32[r15>>2];if((r21|0)==0){r22=r3;r23=r15;r4=4068;break L4561}else{r3=r21,r12=r3>>2;continue}}if(r16){r24=r13>>>1}else{r24=HEAP32[r12+5]}if(r19){r25=r14+1|0}else{r25=HEAP32[r12+6]}if(r9){r26=r1}else{r26=HEAP32[r10]}r21=_memcmp(r25,r26,r8>>>0<r24>>>0?r8:r24);if((r21|0)==0){if(r24>>>0>=r8>>>0){r27=r3;r4=4082;break L4561}}else{if((r21|0)>=0){r27=r3;r4=4082;break L4561}}r21=r3+4|0;r15=HEAP32[r21>>2];if((r15|0)==0){r28=r3;r29=r21;r4=4081;break L4561}else{r3=r15,r12=r3>>2}}}else{r3=r6,r12=r3>>2;while(1){r15=r3+16|0;r21=HEAP32[r11>>2];r30=r15;r31=HEAP8[r15];r15=r31&255;r32=(r15&1|0)==0;if(r32){r33=r15>>>1}else{r33=HEAP32[r12+5]}if(r9){r34=r1}else{r34=HEAP32[r10]}r35=(r31&1)<<24>>24==0;if(r35){r36=r30+1|0}else{r36=HEAP32[r12+6]}r31=_memcmp(r34,r36,r33>>>0<r21>>>0?r33:r21);do{if((r31|0)==0){if(r21>>>0<r33>>>0){r4=4067;break}else{break}}else{if((r31|0)<0){r4=4067;break}else{break}}}while(0);if(r4==4067){r4=0;r31=r3|0;r21=HEAP32[r31>>2];if((r21|0)==0){r22=r3;r23=r31;r4=4068;break L4561}else{r3=r21,r12=r3>>2;continue}}if(r32){r37=r15>>>1}else{r37=HEAP32[r12+5]}r21=HEAP32[r11>>2];if(r35){r38=r30+1|0}else{r38=HEAP32[r12+6]}if(r9){r39=r1}else{r39=HEAP32[r10]}r31=_memcmp(r38,r39,r21>>>0<r37>>>0?r21:r37);if((r31|0)==0){if(r37>>>0>=r21>>>0){r27=r3;r4=4082;break L4561}}else{if((r31|0)>=0){r27=r3;r4=4082;break L4561}}r31=r3+4|0;r21=HEAP32[r31>>2];if((r21|0)==0){r28=r3;r29=r31;r4=4081;break L4561}else{r3=r21,r12=r3>>2}}}}while(0);if(r4==4068){HEAP32[r2>>2]=r22;r7=r23;return r7}else if(r4==4081){HEAP32[r2>>2]=r28;r7=r29;return r7}else if(r4==4082){HEAP32[r2>>2]=r27;r7=r2;return r7}}function __ZNSt3__16__treeINS_4pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentEEENS_19__map_value_compareIS7_SA_NS_4lessIS7_EELb1EEENS5_ISB_EEE7destroyEPNS_11__tree_nodeISB_PvEE(r1,r2){if((r2|0)==0){return}__ZNSt3__16__treeINS_4pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentEEENS_19__map_value_compareIS7_SA_NS_4lessIS7_EELb1EEENS5_ISB_EEE7destroyEPNS_11__tree_nodeISB_PvEE(r1,HEAP32[r2>>2]);__ZNSt3__16__treeINS_4pairINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEPN7Utility13BasicArgumentEEENS_19__map_value_compareIS7_SA_NS_4lessIS7_EELb1EEENS5_ISB_EEE7destroyEPNS_11__tree_nodeISB_PvEE(r1,HEAP32[r2+4>>2]);if((HEAP8[r2+16|0]&1)<<24>>24!=0){__ZdlPv(HEAP32[r2+24>>2])}__ZdlPv(r2);return}function _jpeg_finish_compress(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13;r2=r1>>2;r3=(r1+20|0)>>2;r4=HEAP32[r3];if((r4|0)==101|(r4|0)==102){if(HEAP32[r2+65]>>>0<HEAP32[r2+8]>>>0){r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=69;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}FUNCTION_TABLE[HEAP32[HEAP32[r2+97]+8>>2]](r1)}else if((r4|0)!=103){r4=(r1|0)>>2;HEAP32[HEAP32[r4]+20>>2]=21;HEAP32[HEAP32[r4]+24>>2]=HEAP32[r3];FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r1)}r4=(r1+388|0)>>2;r5=HEAP32[r4];L4653:do{if((HEAP32[r5+16>>2]|0)==0){r6=(r1+284|0)>>2;r7=(r1+8|0)>>2;r8=r1+400|0;r9=r1|0;r10=r1;r11=r5;while(1){FUNCTION_TABLE[HEAP32[r11>>2]](r1);L4657:do{if((HEAP32[r6]|0)!=0){r12=0;while(1){r13=HEAP32[r7];if((r13|0)!=0){HEAP32[r13+4>>2]=r12;HEAP32[HEAP32[r7]+8>>2]=HEAP32[r6];FUNCTION_TABLE[HEAP32[HEAP32[r7]>>2]](r10)}if((FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]+4>>2]](r1,0)|0)==0){HEAP32[HEAP32[r9>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r10)}r13=r12+1|0;if(r13>>>0<HEAP32[r6]>>>0){r12=r13}else{break L4657}}}}while(0);FUNCTION_TABLE[HEAP32[HEAP32[r4]+8>>2]](r1);r12=HEAP32[r4];if((HEAP32[r12+16>>2]|0)==0){r11=r12}else{break L4653}}}}while(0);FUNCTION_TABLE[HEAP32[HEAP32[r2+101]+12>>2]](r1);FUNCTION_TABLE[HEAP32[HEAP32[r2+6]+16>>2]](r1);r4=HEAP32[r2+1];if((r4|0)==0){return}FUNCTION_TABLE[HEAP32[r4+36>>2]](r1,1);if((HEAP32[r2+4]|0)==0){HEAP32[r3]=100;return}else{HEAP32[r3]=200;HEAP32[r2+78]=0;return}}function _jpeg_write_scanlines(r1,r2,r3){var r4,r5,r6,r7,r8,r9;r4=STACKTOP;STACKTOP=STACKTOP+4|0;r5=r4;r6=r1+20|0;if((HEAP32[r6>>2]|0)!=101){r7=(r1|0)>>2;HEAP32[HEAP32[r7]+20>>2]=21;HEAP32[HEAP32[r7]+24>>2]=HEAP32[r6>>2];FUNCTION_TABLE[HEAP32[HEAP32[r7]>>2]](r1)}r7=(r1+260|0)>>2;r6=(r1+32|0)>>2;if(HEAP32[r7]>>>0>=HEAP32[r6]>>>0){r8=r1|0;HEAP32[HEAP32[r8>>2]+20>>2]=126;FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]+4>>2]](r1,-1)}r8=(r1+8|0)>>2;r9=HEAP32[r8];if((r9|0)!=0){HEAP32[r9+4>>2]=HEAP32[r7];HEAP32[HEAP32[r8]+8>>2]=HEAP32[r6];FUNCTION_TABLE[HEAP32[HEAP32[r8]>>2]](r1)}r8=HEAP32[r1+388>>2];if((HEAP32[r8+12>>2]|0)!=0){FUNCTION_TABLE[HEAP32[r8+4>>2]](r1)}r8=HEAP32[r6]-HEAP32[r7]|0;HEAP32[r5>>2]=0;FUNCTION_TABLE[HEAP32[HEAP32[r1+392>>2]+4>>2]](r1,r2,r5,r8>>>0<r3>>>0?r8:r3);r3=HEAP32[r5>>2];HEAP32[r7]=HEAP32[r7]+r3|0;STACKTOP=r4;return r3}function _start_pass(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32;r3=r1>>2;r4=HEAP32[r3+105];if((r2|0)!=0){r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=49;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}do{if((HEAP32[r3+66]|0)==0){HEAP32[r4+4>>2]=248}else{r2=(HEAP32[r3+90]|0)==0;r5=(r4+4|0)>>2;if((HEAP32[r3+92]|0)==0){if(r2){HEAP32[r5]=726;break}else{HEAP32[r5]=958;break}}else{if(r2){HEAP32[r5]=1090;break}else{HEAP32[r5]=1272;break}}}}while(0);r5=r1+288|0;if((HEAP32[r5>>2]|0)<=0){r6=r4+12|0;HEAP32[r6>>2]=0;r7=r4+16|0;HEAP32[r7>>2]=65536;r8=r4+20|0;HEAP32[r8>>2]=0;r9=r4+24|0;HEAP32[r9>>2]=0;r10=r4+28|0;HEAP32[r10>>2]=11;r11=r4+32|0;HEAP32[r11>>2]=-1;r12=r1+232|0;r13=HEAP32[r12>>2];r14=r4+68|0;r15=r13;HEAP32[r14>>2]=r15;r16=r4+72|0;HEAP32[r16>>2]=0;return}r2=r1+360|0;r17=r1+368|0;r18=(r1|0)>>2;r19=r1;r20=r4+76|0;r21=r1+4|0;r22=r4+36|0;r23=r4+52|0;r24=r1+364|0;r25=r4+140|0;r26=0;while(1){r27=HEAP32[((r26<<2)+292>>2)+r3];do{if((HEAP32[r2>>2]|0)==0){if((HEAP32[r17>>2]|0)!=0){break}r28=HEAP32[r27+20>>2];if(r28>>>0>15){HEAP32[HEAP32[r18]+20>>2]=50;HEAP32[HEAP32[r18]+24>>2]=r28;FUNCTION_TABLE[HEAP32[HEAP32[r18]>>2]](r19)}r29=(r28<<2)+r20|0;r28=HEAP32[r29>>2];if((r28|0)==0){r30=FUNCTION_TABLE[HEAP32[HEAP32[r21>>2]>>2]](r19,1,64);HEAP32[r29>>2]=r30;r31=r30}else{r31=r28}_memset(r31,0,64);HEAP32[r22+(r26<<2)>>2]=0;HEAP32[r23+(r26<<2)>>2]=0}}while(0);if((HEAP32[r24>>2]|0)!=0){r28=HEAP32[r27+24>>2];if(r28>>>0>15){HEAP32[HEAP32[r18]+20>>2]=50;HEAP32[HEAP32[r18]+24>>2]=r28;FUNCTION_TABLE[HEAP32[HEAP32[r18]>>2]](r19)}r30=(r28<<2)+r25|0;r28=HEAP32[r30>>2];if((r28|0)==0){r29=FUNCTION_TABLE[HEAP32[HEAP32[r21>>2]>>2]](r19,1,256);HEAP32[r30>>2]=r29;r32=r29}else{r32=r28}_memset(r32,0,256)}r28=r26+1|0;if((r28|0)<(HEAP32[r5>>2]|0)){r26=r28}else{break}}r6=r4+12|0;HEAP32[r6>>2]=0;r7=r4+16|0;HEAP32[r7>>2]=65536;r8=r4+20|0;HEAP32[r8>>2]=0;r9=r4+24|0;HEAP32[r9>>2]=0;r10=r4+28|0;HEAP32[r10>>2]=11;r11=r4+32|0;HEAP32[r11>>2]=-1;r12=r1+232|0;r13=HEAP32[r12>>2];r14=r4+68|0;r15=r13;HEAP32[r14>>2]=r15;r16=r4+72|0;HEAP32[r16>>2]=0;return}function _finish_pass(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21;r2=HEAP32[r1+420>>2];r3=r2+12|0,r4=r3>>2;r5=r3>>2;r3=HEAP32[r5];r6=HEAP32[r2+16>>2]-1+r3&-65536;if((r6|0)<(r3|0)){r3=r6|32768;HEAP32[r4]=r3;r7=r3}else{HEAP32[r4]=r6;r7=r6}r6=r7<<HEAP32[r2+28>>2];HEAP32[r4]=r6;r4=(r2+32|0)>>2;r7=HEAP32[r4];L4736:do{if(r6>>>0>134217727){r3=r2+24|0;r8=r3>>2;do{if((r7|0)>-1){r9=(r1+24|0)>>2;if((HEAP32[r8]|0)==0){r10=r7}else{r11=r1|0;r12=r1;r13=r3|0;while(1){r14=HEAP32[r9];r15=r14|0;r16=HEAP32[r15>>2];HEAP32[r15>>2]=r16+1|0;HEAP8[r16]=0;r16=r14+4|0;r15=HEAP32[r16>>2]-1|0;HEAP32[r16>>2]=r15;do{if((r15|0)==0){if((FUNCTION_TABLE[HEAP32[r14+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r11>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]>>2]](r12)}}while(0);r14=HEAP32[r8]-1|0;HEAP32[r13>>2]=r14;if((r14|0)==0){break}}r10=HEAP32[r4]}r13=HEAP32[r9];r12=r13|0;r11=HEAP32[r12>>2];HEAP32[r12>>2]=r11+1|0;HEAP8[r11]=r10+1&255;r11=r13+4|0;r12=HEAP32[r11>>2]-1|0;HEAP32[r11>>2]=r12;do{if((r12|0)==0){if((FUNCTION_TABLE[HEAP32[r13+12>>2]](r1)|0)!=0){break}r11=r1|0;HEAP32[HEAP32[r11>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]>>2]](r1)}}while(0);if((HEAP32[r4]|0)!=254){break}r13=HEAP32[r9];r12=r13|0;r11=HEAP32[r12>>2];HEAP32[r12>>2]=r11+1|0;HEAP8[r11]=0;r11=r13+4|0;r12=HEAP32[r11>>2]-1|0;HEAP32[r11>>2]=r12;if((r12|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r13+12>>2]](r1)|0)!=0){break}r13=r1|0;HEAP32[HEAP32[r13>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r13>>2]>>2]](r1)}}while(0);r13=r2+20|0;HEAP32[r3>>2]=HEAP32[r8]+HEAP32[r13>>2]|0;HEAP32[r13>>2]=0}else{do{if((r7|0)==0){r13=r2+24|0;HEAP32[r13>>2]=HEAP32[r13>>2]+1|0}else{if((r7|0)<=-1){break}r13=r2+24|0;r12=r13;r11=r1+24|0;if((HEAP32[r12>>2]|0)==0){r17=r7}else{r14=r1|0;r15=r1;r16=r13|0;while(1){r13=HEAP32[r11>>2];r18=r13|0;r19=HEAP32[r18>>2];HEAP32[r18>>2]=r19+1|0;HEAP8[r19]=0;r19=r13+4|0;r18=HEAP32[r19>>2]-1|0;HEAP32[r19>>2]=r18;do{if((r18|0)==0){if((FUNCTION_TABLE[HEAP32[r13+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14>>2]>>2]](r15)}}while(0);r13=HEAP32[r12>>2]-1|0;HEAP32[r16>>2]=r13;if((r13|0)==0){break}}r17=HEAP32[r4]}r16=HEAP32[r11>>2];r12=r16|0;r15=HEAP32[r12>>2];HEAP32[r12>>2]=r15+1|0;HEAP8[r15]=r17&255;r15=r16+4|0;r12=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r12;if((r12|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r16+12>>2]](r1)|0)!=0){break}r16=r1|0;HEAP32[HEAP32[r16>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r16>>2]>>2]](r1)}}while(0);r8=r2+20|0;r3=r8;if((HEAP32[r3>>2]|0)==0){break}r16=r2+24|0;r12=r16;r15=(r1+24|0)>>2;r14=(r1|0)>>2;r9=r1;L4756:do{if((HEAP32[r12>>2]|0)!=0){r13=r16|0;while(1){r18=HEAP32[r15];r19=r18|0;r20=HEAP32[r19>>2];HEAP32[r19>>2]=r20+1|0;HEAP8[r20]=0;r20=r18+4|0;r19=HEAP32[r20>>2]-1|0;HEAP32[r20>>2]=r19;do{if((r19|0)==0){if((FUNCTION_TABLE[HEAP32[r18+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r9)}}while(0);r18=HEAP32[r12>>2]-1|0;HEAP32[r13>>2]=r18;if((r18|0)==0){break L4756}}}}while(0);while(1){r12=HEAP32[r15];r16=r12|0;r13=HEAP32[r16>>2];HEAP32[r16>>2]=r13+1|0;HEAP8[r13]=-1;r13=r12+4|0;r16=HEAP32[r13>>2]-1|0;HEAP32[r13>>2]=r16;do{if((r16|0)==0){if((FUNCTION_TABLE[HEAP32[r12+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r9)}}while(0);r12=HEAP32[r15];r16=r12|0;r13=HEAP32[r16>>2];HEAP32[r16>>2]=r13+1|0;HEAP8[r13]=0;r13=r12+4|0;r16=HEAP32[r13>>2]-1|0;HEAP32[r13>>2]=r16;do{if((r16|0)==0){if((FUNCTION_TABLE[HEAP32[r12+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r9)}}while(0);r12=HEAP32[r3>>2]-1|0;HEAP32[r8>>2]=r12;if((r12|0)==0){break L4736}}}}while(0);r17=HEAP32[r5];if((r17&134215680|0)==0){return}r4=r2+24|0;r2=r4;r7=(r1+24|0)>>2;if((HEAP32[r2>>2]|0)==0){r21=r17}else{r17=r1|0;r10=r1;r6=r4|0;while(1){r4=HEAP32[r7];r8=r4|0;r3=HEAP32[r8>>2];HEAP32[r8>>2]=r3+1|0;HEAP8[r3]=0;r3=r4+4|0;r8=HEAP32[r3>>2]-1|0;HEAP32[r3>>2]=r8;do{if((r8|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r17>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r17>>2]>>2]](r10)}}while(0);r4=HEAP32[r2>>2]-1|0;HEAP32[r6>>2]=r4;if((r4|0)==0){break}}r21=HEAP32[r5]}r6=HEAP32[r7];r2=r6|0;r10=HEAP32[r2>>2];HEAP32[r2>>2]=r10+1|0;HEAP8[r10]=r21>>>19&255;r21=r6+4|0;r10=HEAP32[r21>>2]-1|0;HEAP32[r21>>2]=r10;do{if((r10|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r21=r1|0;HEAP32[HEAP32[r21>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r21>>2]>>2]](r1)}}while(0);do{if((HEAP32[r5]&133693440|0)==133693440){r6=HEAP32[r7];r10=r6|0;r21=HEAP32[r10>>2];HEAP32[r10>>2]=r21+1|0;HEAP8[r21]=0;r21=r6+4|0;r10=HEAP32[r21>>2]-1|0;HEAP32[r21>>2]=r10;if((r10|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}}while(0);r6=HEAP32[r5];if((r6&522240|0)==0){return}r10=HEAP32[r7];r21=r10|0;r2=HEAP32[r21>>2];HEAP32[r21>>2]=r2+1|0;HEAP8[r2]=r6>>>11&255;r6=r10+4|0;r2=HEAP32[r6>>2]-1|0;HEAP32[r6>>2]=r2;do{if((r2|0)==0){if((FUNCTION_TABLE[HEAP32[r10+12>>2]](r1)|0)!=0){break}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}}while(0);if((HEAP32[r5]&522240|0)!=522240){return}r5=HEAP32[r7];r7=r5|0;r10=HEAP32[r7>>2];HEAP32[r7>>2]=r10+1|0;HEAP8[r10]=0;r10=r5+4|0;r7=HEAP32[r10>>2]-1|0;HEAP32[r10>>2]=r7;if((r7|0)!=0){return}if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){return}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1);return}function _encode_mcu_DC_first(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32;r3=HEAP32[r1+420>>2];r4=r1+232|0;if((HEAP32[r4>>2]|0)!=0){r5=(r3+68|0)>>2;r6=HEAP32[r5];if((r6|0)==0){r7=r3+72|0;r8=r7;_emit_restart(r1,HEAP32[r8>>2]);r9=HEAP32[r4>>2];HEAP32[r5]=r9;HEAP32[r7>>2]=HEAP32[r8>>2]+1&7;r10=r9}else{r10=r6}HEAP32[r5]=r10-1|0}r10=r1+316|0;if((HEAP32[r10>>2]|0)<=0){return 1}r5=r1+372|0;r6=r3+76|0;r9=r3+52|0;r8=r3+36|0;r3=0;while(1){r7=HEAP32[r1+(r3<<2)+320>>2];r4=HEAP32[HEAP32[r1+(r7<<2)+292>>2]+20>>2];r11=HEAP16[HEAP32[r2+(r3<<2)>>2]>>1]<<16>>16>>HEAP32[r5>>2];r12=(r4<<2)+r6|0;r13=HEAP32[r12>>2];r14=((r7<<2)+r9|0)>>2;r15=HEAP32[r14];r16=r13+r15|0;r17=(r7<<2)+r8|0;r7=HEAP32[r17>>2];r18=r11-r7|0;L4848:do{if((r11|0)==(r7|0)){_arith_encode(r1,r16,0);HEAP32[r14]=0}else{HEAP32[r17>>2]=r11;_arith_encode(r1,r16,1);if((r18|0)>0){_arith_encode(r1,r15+(r13+1)|0,0);r19=r18;r20=r15+2|0;r21=4}else{_arith_encode(r1,r15+(r13+1)|0,1);r19=-r18|0;r20=r15+3|0;r21=8}r22=r13+r20|0;HEAP32[r14]=r21;r23=r19-1|0;L4854:do{if((r23|0)==0){r24=0;r25=r22}else{_arith_encode(r1,r22,1);r26=HEAP32[r12>>2]+20|0;r27=r23>>1;if((r27|0)==0){r24=1;r25=r26;break}else{r28=r26;r29=1;r30=r27}while(1){_arith_encode(r1,r28,1);r27=r29<<1;r26=r28+1|0;r31=r30>>1;if((r31|0)==0){r24=r27;r25=r26;break L4854}else{r28=r26;r29=r27;r30=r31}}}}while(0);_arith_encode(r1,r25,0);do{if((r24|0)<(1<<HEAPU8[r1+(r4+148)|0]>>1|0)){HEAP32[r14]=0}else{if((r24|0)<=(1<<HEAPU8[r1+(r4+164)|0]>>1|0)){break}HEAP32[r14]=HEAP32[r14]+8|0}}while(0);r22=r25+14|0;r31=r24>>1;if((r31|0)==0){break}else{r32=r31}while(1){_arith_encode(r1,r22,(r32&r23|0)!=0&1);r31=r32>>1;if((r31|0)==0){break L4848}else{r32=r31}}}}while(0);r14=r3+1|0;if((r14|0)<(HEAP32[r10>>2]|0)){r3=r14}else{break}}return 1}function _encode_mcu_AC_first(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32;r3=0;r4=HEAP32[r1+420>>2];r5=r1+232|0;if((HEAP32[r5>>2]|0)!=0){r6=(r4+68|0)>>2;r7=HEAP32[r6];if((r7|0)==0){r8=r4+72|0;r9=r8;_emit_restart(r1,HEAP32[r9>>2]);r10=HEAP32[r5>>2];HEAP32[r6]=r10;HEAP32[r8>>2]=HEAP32[r9>>2]+1&7;r11=r10}else{r11=r7}HEAP32[r6]=r11-1|0}r11=HEAP32[r1+380>>2];r6=HEAP32[r2>>2];r2=HEAP32[HEAP32[r1+292>>2]+24>>2];r7=r1+364|0;r10=HEAP32[r7>>2];r9=(r1+372|0)>>2;r8=r10;while(1){r5=HEAP16[r6+(HEAP32[r11+(r8<<2)>>2]<<1)>>1];r12=r5<<16>>16;if(r5<<16>>16>-1){if((r12>>HEAP32[r9]|0)!=0){r13=r8;break}}else{if((-r12>>HEAP32[r9]|0)!=0){r13=r8;break}}r12=r8-1|0;if((r12|0)==0){r13=0;break}else{r8=r12}}r8=HEAP32[r1+360>>2]-1|0;if((r8|0)<(r13|0)){r12=(r2<<2)+r4+140|0;r5=r4+204|0;r14=r1+(r2+180)|0;r15=r8;while(1){r16=HEAP32[r12>>2]+(r15*3&-1)|0;_arith_encode(r1,r16,0);r17=r16;r16=r15;while(1){r18=r16+1|0;r19=HEAP16[r6+(HEAP32[r11+(r18<<2)>>2]<<1)>>1];r20=r19<<16>>16;if(r19<<16>>16>-1){r21=r20>>HEAP32[r9];if((r21|0)!=0){r3=4274;break}}else{r22=-r20>>HEAP32[r9];if((r22|0)!=0){r3=4276;break}}_arith_encode(r1,r17+1|0,0);r17=r17+3|0;r16=r18}if(r3==4276){r3=0;_arith_encode(r1,r17+1|0,1);_arith_encode(r1,r5,1);r23=r22}else if(r3==4274){r3=0;_arith_encode(r1,r17+1|0,1);_arith_encode(r1,r5,0);r23=r21}r16=r17+2|0;r20=r23-1|0;L4897:do{if((r20|0)==0){r24=r16;r25=0}else{_arith_encode(r1,r16,1);if(r20>>>0<2){r24=r16;r25=1;break}_arith_encode(r1,r16,1);r19=HEAP32[r12>>2]+((r18|0)<=(HEAPU8[r14]|0)?189:217)|0;r26=r20>>2;if((r26|0)==0){r24=r19;r25=2;break}else{r27=2;r28=r19;r29=r26}while(1){_arith_encode(r1,r28,1);r26=r27<<1;r19=r28+1|0;r30=r29>>1;if((r30|0)==0){r24=r19;r25=r26;break L4897}else{r27=r26;r28=r19;r29=r30}}}}while(0);_arith_encode(r1,r24,0);r16=r24+14|0;r17=r25>>1;L4903:do{if((r17|0)!=0){r30=r17;while(1){_arith_encode(r1,r16,(r30&r20|0)!=0&1);r19=r30>>1;if((r19|0)==0){break L4903}else{r30=r19}}}}while(0);if((r18|0)<(r13|0)){r15=r18}else{break}}r31=r18;r32=HEAP32[r7>>2]}else{r31=r8;r32=r10}if((r31|0)>=(r32|0)){return 1}_arith_encode(r1,HEAP32[r4+(r2<<2)+140>>2]+(r31*3&-1)|0,1);return 1}function _encode_mcu_DC_refine(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11;r3=HEAP32[r1+420>>2];r4=r1+232|0;if((HEAP32[r4>>2]|0)!=0){r5=(r3+68|0)>>2;r6=HEAP32[r5];if((r6|0)==0){r7=r3+72|0;r8=r7;_emit_restart(r1,HEAP32[r8>>2]);r9=HEAP32[r4>>2];HEAP32[r5]=r9;HEAP32[r7>>2]=HEAP32[r8>>2]+1&7;r10=r9}else{r10=r6}HEAP32[r5]=r10-1|0}r10=r3+204|0;r3=HEAP32[r1+372>>2];r5=r1+316|0;if((HEAP32[r5>>2]|0)>0){r11=0}else{return 1}while(1){_arith_encode(r1,r10,HEAP16[HEAP32[r2+(r11<<2)>>2]>>1]<<16>>16>>>(r3>>>0)&1);r6=r11+1|0;if((r6|0)<(HEAP32[r5>>2]|0)){r11=r6}else{break}}return 1}function _encode_mcu_AC_refine(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24;r3=0;r4=HEAP32[r1+420>>2];r5=r1+232|0;if((HEAP32[r5>>2]|0)!=0){r6=(r4+68|0)>>2;r7=HEAP32[r6];if((r7|0)==0){r8=r4+72|0;r9=r8;_emit_restart(r1,HEAP32[r9>>2]);r10=HEAP32[r5>>2];HEAP32[r6]=r10;HEAP32[r8>>2]=HEAP32[r9>>2]+1&7;r11=r10}else{r11=r7}HEAP32[r6]=r11-1|0}r11=HEAP32[r1+380>>2]>>2;r6=HEAP32[r2>>2]>>1;r2=HEAP32[HEAP32[r1+292>>2]+24>>2];r7=r1+364|0;r10=HEAP32[r7>>2];r9=(r1+372|0)>>2;r8=r10;while(1){r5=HEAP16[(HEAP32[(r8<<2>>2)+r11]<<1>>1)+r6];r12=r5<<16>>16;if(r5<<16>>16>-1){if((r12>>HEAP32[r9]|0)!=0){r3=4308;break}}else{if((-r12>>HEAP32[r9]|0)!=0){r3=4308;break}}r12=r8-1|0;if((r12|0)==0){r13=0;r14=0;break}else{r8=r12}}L4938:do{if(r3==4308){r12=r1+368|0;if((r8|0)>0){r15=r8}else{r13=r8;r14=r8;break}while(1){r5=HEAP16[(HEAP32[(r15<<2>>2)+r11]<<1>>1)+r6];r16=r5<<16>>16;if(r5<<16>>16>-1){if((r16>>HEAP32[r12>>2]|0)!=0){r13=r15;r14=r8;break L4938}}else{if((-r16>>HEAP32[r12>>2]|0)!=0){r13=r15;r14=r8;break L4938}}r16=r15-1|0;if((r16|0)>0){r15=r16}else{r13=r16;r14=r8;break L4938}}}}while(0);r8=HEAP32[r1+360>>2]-1|0;if((r8|0)<(r14|0)){r15=(r2<<2)+r4+140|0;r12=r4+204|0;r16=r8;while(1){r5=HEAP32[r15>>2]+(r16*3&-1)|0;do{if((r16|0)<(r13|0)){r17=r5;r18=r16}else{_arith_encode(r1,r5,0);r17=r5;r18=r16;break}}while(0);while(1){r19=r18+1|0;r5=HEAP16[(HEAP32[(r19<<2>>2)+r11]<<1>>1)+r6];r20=r5<<16>>16;if(r5<<16>>16>-1){r21=r20>>HEAP32[r9];if((r21|0)!=0){r3=4319;break}}else{r22=-r20>>HEAP32[r9];if((r22|0)!=0){r3=4323;break}}_arith_encode(r1,r17+1|0,0);r17=r17+3|0;r18=r19}do{if(r3==4323){r3=0;if(r22>>>0>1){_arith_encode(r1,r17+2|0,r22&1);break}else{_arith_encode(r1,r17+1|0,1);_arith_encode(r1,r12,1);break}}else if(r3==4319){r3=0;if(r21>>>0>1){_arith_encode(r1,r17+2|0,r21&1);break}else{_arith_encode(r1,r17+1|0,1);_arith_encode(r1,r12,0);break}}}while(0);if((r19|0)<(r14|0)){r16=r19}else{break}}r23=r19;r24=HEAP32[r7>>2]}else{r23=r8;r24=r10}if((r23|0)>=(r24|0)){return 1}_arith_encode(r1,HEAP32[r4+(r2<<2)+140>>2]+(r23*3&-1)|0,1);return 1}function _encode_mcu(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52;r3=0;r4=HEAP32[r1+420>>2];r5=r1+232|0;if((HEAP32[r5>>2]|0)!=0){r6=(r4+68|0)>>2;r7=HEAP32[r6];if((r7|0)==0){r8=r4+72|0;r9=r8;_emit_restart(r1,HEAP32[r9>>2]);r10=HEAP32[r5>>2];HEAP32[r6]=r10;HEAP32[r8>>2]=HEAP32[r9>>2]+1&7;r11=r10}else{r11=r7}HEAP32[r6]=r11-1|0}r11=HEAP32[r1+380>>2]>>2;r6=r1+316|0;if((HEAP32[r6>>2]|0)<=0){return 1}r7=r4+76|0;r10=r4+52|0;r9=r4+36|0;r8=r1+384|0;r5=r4+140|0;r12=r4+204|0;r4=0;while(1){r13=HEAP32[r2+(r4<<2)>>2]>>1;r14=HEAP32[r1+(r4<<2)+320>>2];r15=HEAP32[r1+(r14<<2)+292>>2];r16=HEAP32[r15+20>>2];r17=(r16<<2)+r7|0;r18=HEAP32[r17>>2];r19=((r14<<2)+r10|0)>>2;r20=HEAP32[r19];r21=r18+r20|0;r22=HEAP16[r13]<<16>>16;r23=(r14<<2)+r9|0;r14=HEAP32[r23>>2];r24=r22-r14|0;L4987:do{if((r22|0)==(r14|0)){_arith_encode(r1,r21,0);HEAP32[r19]=0}else{HEAP32[r23>>2]=r22;_arith_encode(r1,r21,1);if((r24|0)>0){_arith_encode(r1,r20+(r18+1)|0,0);r25=r20+2|0;r26=r24;r27=4}else{_arith_encode(r1,r20+(r18+1)|0,1);r25=r20+3|0;r26=-r24|0;r27=8}r28=r18+r25|0;HEAP32[r19]=r27;r29=r26-1|0;L4993:do{if((r29|0)==0){r30=r28;r31=0}else{_arith_encode(r1,r28,1);r32=HEAP32[r17>>2]+20|0;r33=r29>>1;if((r33|0)==0){r30=r32;r31=1;break}else{r34=1;r35=r32;r36=r33}while(1){_arith_encode(r1,r35,1);r33=r34<<1;r32=r35+1|0;r37=r36>>1;if((r37|0)==0){r30=r32;r31=r33;break L4993}else{r34=r33;r35=r32;r36=r37}}}}while(0);_arith_encode(r1,r30,0);do{if((r31|0)<(1<<HEAPU8[r1+(r16+148)|0]>>1|0)){HEAP32[r19]=0}else{if((r31|0)<=(1<<HEAPU8[r1+(r16+164)|0]>>1|0)){break}HEAP32[r19]=HEAP32[r19]+8|0}}while(0);r28=r30+14|0;r37=r31>>1;if((r37|0)==0){break}else{r38=r37}while(1){_arith_encode(r1,r28,(r38&r29|0)!=0&1);r37=r38>>1;if((r37|0)==0){break L4987}else{r38=r37}}}}while(0);r19=HEAP32[r8>>2];do{if((r19|0)!=0){r16=HEAP32[r15+24>>2];r17=r19;while(1){if(HEAP16[(HEAP32[(r17<<2>>2)+r11]<<1>>1)+r13]<<16>>16!=0){r3=4358;break}r18=r17-1|0;if((r18|0)==0){r39=0;r40=r19;break}else{r17=r18}}do{if(r3==4358){r3=0;if((r17|0)<=0){r39=0;r40=r19;break}r18=(r16<<2)+r5|0;r24=r1+(r16+180)|0;r20=0;while(1){r21=HEAP32[r18>>2];r22=r20*3&-1;r23=r21+r22|0;_arith_encode(r1,r23,0);r14=r20+1|0;r29=HEAP16[(HEAP32[(r14<<2>>2)+r11]<<1>>1)+r13];r28=r22+(r21+1)|0;L5017:do{if(r29<<16>>16==0){r21=r23;r22=r14;r37=r28;while(1){_arith_encode(r1,r37,0);r32=r21+3|0;r33=r22+1|0;r41=HEAP16[(HEAP32[(r33<<2>>2)+r11]<<1>>1)+r13];r42=r21+4|0;if(r41<<16>>16==0){r21=r32;r22=r33;r37=r42}else{r43=r32;r44=r33;r45=r41;r46=r42;break L5017}}}else{r43=r23;r44=r14;r45=r29;r46=r28}}while(0);r28=r45<<16>>16;_arith_encode(r1,r46,1);if(r45<<16>>16>0){_arith_encode(r1,r12,0);r47=r28}else{_arith_encode(r1,r12,1);r47=-r28|0}r28=r43+2|0;r29=r47-1|0;L5025:do{if((r29|0)==0){r48=r28;r49=0}else{_arith_encode(r1,r28,1);if(r29>>>0<2){r48=r28;r49=1;break}_arith_encode(r1,r28,1);r14=HEAP32[r18>>2]+((r44|0)<=(HEAPU8[r24]|0)?189:217)|0;r23=r29>>2;if((r23|0)==0){r48=r14;r49=2;break}else{r50=2;r51=r14;r52=r23}while(1){_arith_encode(r1,r51,1);r23=r50<<1;r14=r51+1|0;r37=r52>>1;if((r37|0)==0){r48=r14;r49=r23;break L5025}else{r50=r23;r51=r14;r52=r37}}}}while(0);_arith_encode(r1,r48,0);r28=r48+14|0;r37=r49>>1;L5031:do{if((r37|0)!=0){r14=r37;while(1){_arith_encode(r1,r28,(r14&r29|0)!=0&1);r23=r14>>1;if((r23|0)==0){break L5031}else{r14=r23}}}}while(0);if((r44|0)<(r17|0)){r20=r44}else{break}}r39=r44;r40=HEAP32[r8>>2]}}while(0);if((r39|0)>=(r40|0)){break}_arith_encode(r1,HEAP32[r5+(r16<<2)>>2]+(r39*3&-1)|0,1)}}while(0);r13=r4+1|0;if((r13|0)<(HEAP32[r6>>2]|0)){r4=r13}else{break}}return 1}function _emit_restart(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19;r3=HEAP32[r1+420>>2];_finish_pass(r1);r4=r1+24|0;r5=HEAP32[r4>>2];r6=r5|0;r7=HEAP32[r6>>2];HEAP32[r6>>2]=r7+1|0;HEAP8[r7]=-1;r7=r5+4|0;r6=HEAP32[r7>>2]-1|0;HEAP32[r7>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r7=r1|0;HEAP32[HEAP32[r7>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r1)}}while(0);r5=HEAP32[r4>>2];r4=r5|0;r6=HEAP32[r4>>2];HEAP32[r4>>2]=r6+1|0;HEAP8[r6]=r2+208&255;r2=r5+4|0;r6=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r5=r1+288|0;if((HEAP32[r5>>2]|0)<=0){r8=r3+12|0;HEAP32[r8>>2]=0;r9=r3+16|0;HEAP32[r9>>2]=65536;r10=r3+20|0;HEAP32[r10>>2]=0;r11=r3+24|0;HEAP32[r11>>2]=0;r12=r3+28|0;HEAP32[r12>>2]=11;r13=r3+32|0;HEAP32[r13>>2]=-1;return}r6=r1+360|0;r2=r1+368|0;r4=r3+76|0;r7=r3+36|0;r14=r3+52|0;r15=r1+364|0;r16=r3+140|0;r17=0;while(1){r18=HEAP32[r1+(r17<<2)+292>>2];do{if((HEAP32[r6>>2]|0)==0){if((HEAP32[r2>>2]|0)!=0){break}_memset(HEAP32[r4+(HEAP32[r18+20>>2]<<2)>>2],0,64);HEAP32[r7+(r17<<2)>>2]=0;HEAP32[r14+(r17<<2)>>2]=0}}while(0);if((HEAP32[r15>>2]|0)!=0){_memset(HEAP32[r16+(HEAP32[r18+24>>2]<<2)>>2],0,256)}r19=r17+1|0;if((r19|0)<(HEAP32[r5>>2]|0)){r17=r19}else{break}}r8=r3+12|0;HEAP32[r8>>2]=0;r9=r3+16|0;HEAP32[r9>>2]=65536;r10=r3+20|0;HEAP32[r10>>2]=0;r11=r3+24|0;HEAP32[r11>>2]=0;r12=r3+28|0;HEAP32[r12>>2]=11;r13=r3+32|0;HEAP32[r13>>2]=-1;return}function _arith_encode(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32;r4=HEAP32[r1+420>>2];r5=HEAPU8[r2];r6=HEAP32[((r5&127)<<2)+5246904>>2];r7=r6>>>8;r8=r6>>16;r9=r4+16|0,r10=r9>>2;r11=r9>>2;r9=HEAP32[r11]-r8|0;HEAP32[r10]=r9;if((r5>>>7|0)==(r3|0)){if((r9|0)>32767){return}if((r9|0)<(r8|0)){r3=r4+12|0;HEAP32[r3>>2]=HEAP32[r3>>2]+r9|0;HEAP32[r10]=r8}r12=r5&128^r7}else{if((r9|0)>=(r8|0)){r7=r4+12|0;HEAP32[r7>>2]=HEAP32[r7>>2]+r9|0;HEAP32[r10]=r8}r12=r5&128^r6}HEAP8[r2]=r12&255;r12=r4+12|0;r2=r12;r6=r12|0;r12=r4+28|0;r5=r12;r8=r4+32|0;r9=r8>>2;r7=r4+24|0;r3=r7>>2;r13=(r1+24|0)>>2;r14=(r1|0)>>2;r15=r1;r16=(r7|0)>>2;r7=r4+20|0,r4=r7>>2;r17=r7>>2;r7=HEAP32[r11];r18=HEAP32[r2>>2];r19=HEAP32[r5>>2];while(1){r20=r7<<1;HEAP32[r10]=r20;r21=r18<<1;HEAP32[r6>>2]=r21;r22=r19-1|0;HEAP32[r12>>2]=r22;if((r22|0)==0){r23=r21>>19;do{if((r23|0)>255){r24=HEAP32[r9];do{if((r24|0)>-1){if((HEAP32[r3]|0)==0){r25=r24}else{while(1){r26=HEAP32[r13];r27=r26|0;r28=HEAP32[r27>>2];HEAP32[r27>>2]=r28+1|0;HEAP8[r28]=0;r28=r26+4|0;r27=HEAP32[r28>>2]-1|0;HEAP32[r28>>2]=r27;do{if((r27|0)==0){if((FUNCTION_TABLE[HEAP32[r26+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r15)}}while(0);r26=HEAP32[r3]-1|0;HEAP32[r16]=r26;if((r26|0)==0){break}}r25=HEAP32[r9]}r26=HEAP32[r13];r27=r26|0;r28=HEAP32[r27>>2];HEAP32[r27>>2]=r28+1|0;HEAP8[r28]=r25+1&255;r28=r26+4|0;r27=HEAP32[r28>>2]-1|0;HEAP32[r28>>2]=r27;do{if((r27|0)==0){if((FUNCTION_TABLE[HEAP32[r26+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r15)}}while(0);if((HEAP32[r9]|0)!=254){break}r26=HEAP32[r13];r27=r26|0;r28=HEAP32[r27>>2];HEAP32[r27>>2]=r28+1|0;HEAP8[r28]=0;r28=r26+4|0;r27=HEAP32[r28>>2]-1|0;HEAP32[r28>>2]=r27;if((r27|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r26+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r15)}}while(0);HEAP32[r16]=HEAP32[r3]+HEAP32[r17]|0;HEAP32[r4]=0;HEAP32[r8>>2]=r23&255}else{if((r23|0)==255){HEAP32[r4]=HEAP32[r17]+1|0;break}r24=HEAP32[r9];do{if((r24|0)==0){HEAP32[r16]=HEAP32[r3]+1|0}else{if((r24|0)<=-1){break}if((HEAP32[r3]|0)==0){r29=r24}else{while(1){r26=HEAP32[r13];r27=r26|0;r28=HEAP32[r27>>2];HEAP32[r27>>2]=r28+1|0;HEAP8[r28]=0;r28=r26+4|0;r27=HEAP32[r28>>2]-1|0;HEAP32[r28>>2]=r27;do{if((r27|0)==0){if((FUNCTION_TABLE[HEAP32[r26+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r15)}}while(0);r26=HEAP32[r3]-1|0;HEAP32[r16]=r26;if((r26|0)==0){break}}r29=HEAP32[r9]}r26=HEAP32[r13];r27=r26|0;r28=HEAP32[r27>>2];HEAP32[r27>>2]=r28+1|0;HEAP8[r28]=r29&255;r28=r26+4|0;r27=HEAP32[r28>>2]-1|0;HEAP32[r28>>2]=r27;if((r27|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r26+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r15)}}while(0);L5121:do{if((HEAP32[r17]|0)!=0){L5123:do{if((HEAP32[r3]|0)!=0){while(1){r24=HEAP32[r13];r26=r24|0;r27=HEAP32[r26>>2];HEAP32[r26>>2]=r27+1|0;HEAP8[r27]=0;r27=r24+4|0;r26=HEAP32[r27>>2]-1|0;HEAP32[r27>>2]=r26;do{if((r26|0)==0){if((FUNCTION_TABLE[HEAP32[r24+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r15)}}while(0);r24=HEAP32[r3]-1|0;HEAP32[r16]=r24;if((r24|0)==0){break L5123}}}}while(0);while(1){r24=HEAP32[r13];r26=r24|0;r27=HEAP32[r26>>2];HEAP32[r26>>2]=r27+1|0;HEAP8[r27]=-1;r27=r24+4|0;r26=HEAP32[r27>>2]-1|0;HEAP32[r27>>2]=r26;do{if((r26|0)==0){if((FUNCTION_TABLE[HEAP32[r24+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r15)}}while(0);r24=HEAP32[r13];r26=r24|0;r27=HEAP32[r26>>2];HEAP32[r26>>2]=r27+1|0;HEAP8[r27]=0;r27=r24+4|0;r26=HEAP32[r27>>2]-1|0;HEAP32[r27>>2]=r26;do{if((r26|0)==0){if((FUNCTION_TABLE[HEAP32[r24+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r14]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r15)}}while(0);r24=HEAP32[r17]-1|0;HEAP32[r4]=r24;if((r24|0)==0){break L5121}}}}while(0);HEAP32[r8>>2]=r23&255}}while(0);r23=HEAP32[r2>>2]&524287;HEAP32[r6>>2]=r23;r24=HEAP32[r5>>2]+8|0;HEAP32[r12>>2]=r24;r30=r23;r31=r24;r32=HEAP32[r11]}else{r30=r21;r31=r22;r32=r20}if((r32|0)<32768){r7=r32;r18=r30;r19=r31}else{break}}return}function _jinit_c_coef_controller(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11;r3=(r1+4|0)>>2;r4=r1;r5=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,104),r6=r5>>2;HEAP32[r1+400>>2]=r5;HEAP32[r6]=460;if((r2|0)==0){r2=FUNCTION_TABLE[HEAP32[HEAP32[r3]+4>>2]](r4,1,1280);HEAP32[r6+6]=r2;HEAP32[r6+7]=r2+128|0;HEAP32[r6+8]=r2+256|0;HEAP32[r6+9]=r2+384|0;HEAP32[r6+10]=r2+512|0;HEAP32[r6+11]=r2+640|0;HEAP32[r6+12]=r2+768|0;HEAP32[r6+13]=r2+896|0;HEAP32[r6+14]=r2+1024|0;HEAP32[r6+15]=r2+1152|0;HEAP32[r6+16]=0;return}r6=r1+72|0;if((HEAP32[r6>>2]|0)<=0){return}r2=r5+64|0;r5=HEAP32[r1+80>>2],r1=r5>>2;r7=0;while(1){r8=HEAP32[r1+2];r9=HEAP32[r1+7]-1+r8|0;r10=HEAP32[r1+3];r11=HEAP32[r1+8]-1+r10|0;HEAP32[r2+(r7<<2)>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3]+20>>2]](r4,1,0,r9-(r9|0)%(r8|0)|0,r11-(r11|0)%(r10|0)|0,r10);r10=r7+1|0;if((r10|0)<(HEAP32[r6>>2]|0)){r5=r5+88|0,r1=r5>>2;r7=r10}else{break}}return}function _start_pass_coef(r1,r2){var r3,r4,r5;r3=r1+400|0;r4=HEAP32[r3>>2]>>2;HEAP32[r4+2]=0;r5=HEAP32[r3>>2]>>2;do{if((HEAP32[r1+288>>2]|0)>1){HEAP32[r5+5]=1}else{r3=HEAP32[r1+292>>2];if(HEAP32[r5+2]>>>0<(HEAP32[r1+284>>2]-1|0)>>>0){HEAP32[r5+5]=HEAP32[r3+12>>2];break}else{HEAP32[r5+5]=HEAP32[r3+76>>2];break}}}while(0);HEAP32[r5+3]=0;HEAP32[r5+4]=0;if((r2|0)==3){if((HEAP32[r4+16]|0)==0){r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=3;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}HEAP32[r4+1]=112;return}else if((r2|0)==2){if((HEAP32[r4+16]|0)==0){r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=3;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}HEAP32[r4+1]=900;return}else if((r2|0)==0){if((HEAP32[r4+16]|0)!=0){r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=3;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}HEAP32[r4+1]=238;return}else{r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=3;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1);return}}function _compress_data(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53;r3=0;r4=r1+400|0;r5=HEAP32[r4>>2];r6=HEAP32[r1+308>>2]-1|0;r7=r1+284|0;r8=HEAP32[r7>>2]-1|0;r9=r5+16|0;r10=HEAP32[r9>>2];r11=r5+20|0;L5182:do{if((r10|0)<(HEAP32[r11>>2]|0)){r12=(r5+12|0)>>2;r13=r1+288|0;r14=r1+420|0;r15=r5+24|0;r16=r15;r17=r1+416|0;r18=r5+8|0;r19=r18;r20=r15,r15=r20>>2;r21=r10;r22=HEAP32[r12];L5185:while(1){r23=r22;while(1){if(r23>>>0>r6>>>0){break}r24=HEAP32[r13>>2];L5190:do{if((r24|0)>0){r25=r23>>>0<r6>>>0;r26=0;r27=0;r28=r24;while(1){r29=HEAP32[r1+(r26<<2)+292>>2];r30=r29+4|0;r31=HEAP32[HEAP32[r17>>2]+(HEAP32[r30>>2]<<2)+4>>2];r32=r29+56|0,r33=r32>>2;r34=HEAP32[(r25?r32:r29+72|0)>>2];r32=Math.imul(HEAP32[r29+68>>2],r23);r35=r29+40|0;r36=r29+60|0;if((HEAP32[r36>>2]|0)>0){r37=r29+76|0;r38=0;r39=Math.imul(HEAP32[r35>>2],r21);r40=r27;while(1){L5198:do{if(HEAP32[r19>>2]>>>0<r8>>>0){r3=4496}else{if((r38+r21|0)<(HEAP32[r37>>2]|0)){r3=4496;break}_memset(HEAP32[(r40<<2>>2)+r15],0,HEAP32[r33]<<7);r41=HEAP32[r33];if((r41|0)<=0){r42=r41;break}r41=(r40-1<<2)+r20|0;r43=0;while(1){HEAP16[HEAP32[(r43+r40<<2>>2)+r15]>>1]=HEAP16[HEAP32[r41>>2]>>1];r44=r43+1|0;r45=HEAP32[r33];if((r44|0)<(r45|0)){r43=r44}else{r42=r45;break L5198}}}}while(0);L5204:do{if(r3==4496){r3=0;FUNCTION_TABLE[r31](r1,r29,HEAP32[r2+(HEAP32[r30>>2]<<2)>>2],HEAP32[(r40<<2>>2)+r15],r39,r32,r34);r43=HEAP32[r33];if((r34|0)>=(r43|0)){r42=r43;break}_memset(HEAP32[(r40+r34<<2>>2)+r15],0,r43-r34<<7);r43=HEAP32[r33];if((r34|0)<(r43|0)){r46=r34}else{r42=r43;break}while(1){r43=r46+r40|0;HEAP16[HEAP32[(r43<<2>>2)+r15]>>1]=HEAP16[HEAP32[(r43-1<<2>>2)+r15]>>1];r43=r46+1|0;r41=HEAP32[r33];if((r43|0)<(r41|0)){r46=r43}else{r42=r41;break L5204}}}}while(0);r47=r42+r40|0;r41=r38+1|0;if((r41|0)<(HEAP32[r36>>2]|0)){r38=r41;r39=HEAP32[r35>>2]+r39|0;r40=r47}else{break}}r48=r47;r49=HEAP32[r13>>2]}else{r48=r27;r49=r28}r40=r26+1|0;if((r40|0)<(r49|0)){r26=r40;r27=r48;r28=r49}else{break L5190}}}}while(0);if((FUNCTION_TABLE[HEAP32[HEAP32[r14>>2]+4>>2]](r1,r16)|0)==0){break L5185}else{r23=r23+1|0}}HEAP32[r12]=0;r24=r21+1|0;if((r24|0)<(HEAP32[r11>>2]|0)){r21=r24;r22=0}else{r50=r18;r51=r19;r52=r13;break L5182}}HEAP32[r9>>2]=r21;HEAP32[r12]=r23;r53=0;return r53}else{r13=r5+8|0;r50=r13;r51=r13;r52=r1+288|0}}while(0);HEAP32[r50>>2]=HEAP32[r51>>2]+1|0;r51=HEAP32[r4>>2]>>2;do{if((HEAP32[r52>>2]|0)>1){HEAP32[r51+5]=1}else{r4=HEAP32[r1+292>>2];if(HEAP32[r51+2]>>>0<(HEAP32[r7>>2]-1|0)>>>0){HEAP32[r51+5]=HEAP32[r4+12>>2];break}else{HEAP32[r51+5]=HEAP32[r4+76>>2];break}}}while(0);HEAP32[r51+3]=0;HEAP32[r51+4]=0;r53=1;return r53}function _compress_first_pass(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35;r3=HEAP32[r1+400>>2];r4=HEAP32[r1+284>>2]-1|0;r5=r1+72|0;if((HEAP32[r5>>2]|0)<=0){r6=_compress_output(r1,r2);return r6}r7=r1+4|0;r8=r1;r9=r3+64|0;r10=(r3+8|0)>>2;r3=r1+416|0;r11=0;r12=HEAP32[r1+80>>2],r13=r12>>2;while(1){r14=HEAP32[HEAP32[r7>>2]+32>>2];r15=HEAP32[r9+(r11<<2)>>2];r16=(r12+12|0)>>2;r17=HEAP32[r16];r18=Math.imul(r17,HEAP32[r10]);r19=FUNCTION_TABLE[r14](r8,r15,r18,r17,1)>>2;r17=HEAP32[r10];if(r17>>>0<r4>>>0){r20=HEAP32[r16]}else{r18=HEAP32[r16];r15=(HEAP32[r13+8]>>>0)%(r18>>>0);r20=(r15|0)==0?r18:r15}r15=HEAP32[r13+7];r18=HEAP32[r13+2];r14=(r15>>>0)%(r18>>>0);r21=(r14|0)>0?r18-r14|0:r14;r14=HEAP32[HEAP32[r3>>2]+(r11<<2)+4>>2];if((r20|0)>0){r22=(r11<<2)+r2|0;r23=r12+40|0;r24=(r21|0)>0;r25=r21<<7;r26=r15-1|0;r27=0;while(1){r28=HEAP32[(r27<<2>>2)+r19];r29=HEAP32[r22>>2];r30=Math.imul(HEAP32[r23>>2],r27);FUNCTION_TABLE[r14](r1,r12,r29,r28,r30,0,r15);L5239:do{if(r24){_memset((r15<<7)+r28|0,0,r25);r30=HEAP16[r28+(r26<<7)>>1];r29=0;while(1){HEAP16[r28+(r29+r15<<7)>>1]=r30;r31=r29+1|0;if((r31|0)==(r21|0)){break L5239}else{r29=r31}}}}while(0);r28=r27+1|0;if((r28|0)==(r20|0)){break}else{r27=r28}}r32=HEAP32[r10]}else{r32=r17}L5246:do{if((r32|0)==(r4|0)){r27=r21+r15|0;r26=Math.floor((r27>>>0)/(r18>>>0));if((r20|0)>=(HEAP32[r16]|0)){break}r25=r27<<7;r27=(r26|0)==0;r24=r18-1|0;r14=(r18|0)>0;r23=r20;while(1){r22=HEAP32[(r23<<2>>2)+r19];r28=HEAP32[(r23-1<<2>>2)+r19];_memset(r22,0,r25);L5251:do{if(!r27){r29=0;r30=r22;r31=r28;while(1){r33=HEAP16[r31+(r24<<7)>>1];L5254:do{if(r14){r34=0;while(1){HEAP16[r30+(r34<<7)>>1]=r33;r35=r34+1|0;if((r35|0)==(r18|0)){break L5254}else{r34=r35}}}}while(0);r33=r29+1|0;if(r33>>>0<r26>>>0){r29=r33;r30=(r18<<7)+r30|0;r31=(r18<<7)+r31|0}else{break L5251}}}}while(0);r28=r23+1|0;if((r28|0)<(HEAP32[r16]|0)){r23=r28}else{break L5246}}}}while(0);r16=r11+1|0;if((r16|0)>=(HEAP32[r5>>2]|0)){break}r11=r16;r12=r12+88|0,r13=r12>>2}r6=_compress_output(r1,r2);return r6}function _compress_output(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41;r2=STACKTOP;STACKTOP=STACKTOP+16|0;r3=r2;r4=r1+400|0;r5=HEAP32[r4>>2];r6=(r1+288|0)>>2;L5263:do{if((HEAP32[r6]|0)>0){r7=r1+4|0;r8=r1;r9=r5+64|0;r10=r5+8|0;r11=0;while(1){r12=HEAP32[r1+(r11<<2)+292>>2];r13=HEAP32[HEAP32[r7>>2]+32>>2];r14=HEAP32[r9+(HEAP32[r12+4>>2]<<2)>>2];r15=HEAP32[r12+12>>2];r12=Math.imul(r15,HEAP32[r10>>2]);HEAP32[r3+(r11<<2)>>2]=FUNCTION_TABLE[r13](r8,r14,r12,r15,0);r15=r11+1|0;if((r15|0)<(HEAP32[r6]|0)){r11=r15}else{break L5263}}}}while(0);r11=r5+16|0;r8=HEAP32[r11>>2];r10=r5+20|0;L5268:do{if((r8|0)<(HEAP32[r10>>2]|0)){r9=(r5+12|0)>>2;r7=r1+308|0;r15=r1+420|0;r12=r5+24|0;r14=r12;r13=r12;r12=r8;r16=HEAP32[r9];L5270:while(1){r17=r16;while(1){if(r17>>>0>=HEAP32[r7>>2]>>>0){break}r18=HEAP32[r6];L5275:do{if((r18|0)>0){r19=0;r20=0;r21=r18;while(1){r22=HEAP32[r1+(r20<<2)+292>>2];r23=r22+56|0;r24=HEAP32[r23>>2];r25=Math.imul(r24,r17);r26=r22+60|0;r22=HEAP32[r26>>2];if((r22|0)>0){r27=HEAP32[r3+(r20<<2)>>2];r28=r19;r29=0;r30=r24;r24=r22;while(1){if((r30|0)>0){r22=r28;r31=0;r32=(r25<<7)+HEAP32[r27+(r29+r12<<2)>>2]|0;while(1){r33=r22+1|0;HEAP32[r13+(r22<<2)>>2]=r32;r34=r31+1|0;r35=HEAP32[r23>>2];if((r34|0)<(r35|0)){r22=r33;r31=r34;r32=r32+128|0}else{break}}r36=r33;r37=r35;r38=HEAP32[r26>>2]}else{r36=r28;r37=r30;r38=r24}r32=r29+1|0;if((r32|0)<(r38|0)){r28=r36;r29=r32;r30=r37;r24=r38}else{break}}r39=r36;r40=HEAP32[r6]}else{r39=r19;r40=r21}r24=r20+1|0;if((r24|0)<(r40|0)){r19=r39;r20=r24;r21=r40}else{break L5275}}}}while(0);if((FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]+4>>2]](r1,r14)|0)==0){break L5270}else{r17=r17+1|0}}HEAP32[r9]=0;r18=r12+1|0;if((r18|0)<(HEAP32[r10>>2]|0)){r12=r18;r16=0}else{break L5268}}HEAP32[r11>>2]=r12;HEAP32[r9]=r17;r41=0;STACKTOP=r2;return r41}}while(0);r17=r5+8|0;HEAP32[r17>>2]=HEAP32[r17>>2]+1|0;r17=HEAP32[r4>>2]>>2;do{if((HEAP32[r6]|0)>1){HEAP32[r17+5]=1}else{r4=HEAP32[r1+292>>2];if(HEAP32[r17+2]>>>0<(HEAP32[r1+284>>2]-1|0)>>>0){HEAP32[r17+5]=HEAP32[r4+12>>2];break}else{HEAP32[r17+5]=HEAP32[r4+76>>2];break}}}while(0);HEAP32[r17+3]=0;HEAP32[r17+4]=0;r41=1;STACKTOP=r2;return r41}function _null_method(r1){return}function _grayscale_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14;r6=HEAP32[r1+36>>2];r7=HEAP32[r1+28>>2];if((r5|0)<=0){return}r1=(r7|0)==0;r8=r4;r4=r2;r2=r5;while(1){r5=r2-1|0;r9=r4+4|0;r10=r8+1|0;r11=HEAP32[HEAP32[r3>>2]+(r8<<2)>>2];L5310:do{if(!r1){r12=HEAP32[r4>>2];r13=0;while(1){HEAP8[r11+r13|0]=HEAP8[r12];r14=r13+1|0;if((r14|0)==(r7|0)){break L5310}else{r12=r12+r6|0;r13=r14}}}}while(0);if((r5|0)>0){r8=r10;r4=r9;r2=r5}else{break}}return}function _rgb_gray_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14;r6=HEAP32[HEAP32[r1+408>>2]+8>>2]>>2;r7=HEAP32[r1+28>>2];if((r5|0)<=0){return}r1=(r7|0)==0;r8=r4;r4=r2;r2=r5;while(1){r5=r2-1|0;r9=r4+4|0;r10=r8+1|0;r11=HEAP32[HEAP32[r3>>2]+(r8<<2)>>2];L5322:do{if(!r1){r12=HEAP32[r4>>2];r13=0;while(1){HEAP8[r11+r13|0]=(HEAP32[((HEAPU8[r12+1|0]|256)<<2>>2)+r6]+HEAP32[(HEAPU8[r12]<<2>>2)+r6]+HEAP32[((HEAPU8[r12+2|0]|512)<<2>>2)+r6]|0)>>>16&255;r14=r13+1|0;if((r14|0)==(r7|0)){break L5322}else{r12=r12+3|0;r13=r14}}}}while(0);if((r5|0)>0){r8=r10;r4=r9;r2=r5}else{break}}return}function _rgb_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17;r6=HEAP32[r1+28>>2];if((r5|0)<=0){return}r1=r3+4|0;r7=r3+8|0;r8=(r6|0)==0;r9=r4;r4=r2;r2=r5;while(1){r5=r2-1|0;r10=r4+4|0;r11=HEAP32[HEAP32[r3>>2]+(r9<<2)>>2];r12=HEAP32[HEAP32[r1>>2]+(r9<<2)>>2];r13=HEAP32[HEAP32[r7>>2]+(r9<<2)>>2];r14=r9+1|0;L5334:do{if(!r8){r15=HEAP32[r4>>2];r16=0;while(1){HEAP8[r11+r16|0]=HEAP8[r15];HEAP8[r12+r16|0]=HEAP8[r15+1|0];HEAP8[r13+r16|0]=HEAP8[r15+2|0];r17=r16+1|0;if((r17|0)==(r6|0)){break L5334}else{r15=r15+3|0;r16=r17}}}}while(0);if((r5|0)>0){r9=r14;r4=r10;r2=r5}else{break}}return}function _rgb_rgb1_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18;r6=HEAP32[r1+28>>2];if((r5|0)<=0){return}r1=r3+4|0;r7=r3+8|0;r8=(r6|0)==0;r9=r4;r4=r2;r2=r5;while(1){r5=r2-1|0;r10=r4+4|0;r11=HEAP32[HEAP32[r3>>2]+(r9<<2)>>2];r12=HEAP32[HEAP32[r1>>2]+(r9<<2)>>2];r13=HEAP32[HEAP32[r7>>2]+(r9<<2)>>2];r14=r9+1|0;L5346:do{if(!r8){r15=HEAP32[r4>>2];r16=0;while(1){r17=HEAP8[r15+1|0];r18=HEAP8[r15+2|0];HEAP8[r11+r16|0]=HEAP8[r15]-r17&255^-128;HEAP8[r12+r16|0]=r17;HEAP8[r13+r16|0]=r18-r17&255^-128;r17=r16+1|0;if((r17|0)==(r6|0)){break L5346}else{r15=r15+3|0;r16=r17}}}}while(0);if((r5|0)>0){r9=r14;r4=r10;r2=r5}else{break}}return}function _rgb_ycc_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20;r6=HEAP32[HEAP32[r1+408>>2]+8>>2]>>2;r7=HEAP32[r1+28>>2];if((r5|0)<=0){return}r1=r3+4|0;r8=r3+8|0;r9=(r7|0)==0;r10=r4;r4=r2;r2=r5;while(1){r5=r2-1|0;r11=r4+4|0;r12=HEAP32[HEAP32[r3>>2]+(r10<<2)>>2];r13=HEAP32[HEAP32[r1>>2]+(r10<<2)>>2];r14=HEAP32[HEAP32[r8>>2]+(r10<<2)>>2];r15=r10+1|0;L5358:do{if(!r9){r16=HEAP32[r4>>2];r17=0;while(1){r18=HEAPU8[r16];r19=HEAPU8[r16+1|0];r20=HEAPU8[r16+2|0];HEAP8[r12+r17|0]=(HEAP32[((r19|256)<<2>>2)+r6]+HEAP32[(r18<<2>>2)+r6]+HEAP32[((r20|512)<<2>>2)+r6]|0)>>>16&255;HEAP8[r13+r17|0]=(HEAP32[((r19|1024)<<2>>2)+r6]+HEAP32[((r18|768)<<2>>2)+r6]+HEAP32[((r20|1280)<<2>>2)+r6]|0)>>>16&255;HEAP8[r14+r17|0]=(HEAP32[((r19|1536)<<2>>2)+r6]+HEAP32[((r18|1280)<<2>>2)+r6]+HEAP32[((r20|1792)<<2>>2)+r6]|0)>>>16&255;r20=r17+1|0;if((r20|0)==(r7|0)){break L5358}else{r16=r16+3|0;r17=r20}}}}while(0);if((r5|0)>0){r10=r15;r4=r11;r2=r5}else{break}}return}function _null_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14;r6=HEAP32[r1+72>>2];r7=HEAP32[r1+28>>2];if((r5|0)<=0){return}r1=(r6|0)>0;r8=(r7|0)==0;r9=r4;r4=r2;r2=r5;while(1){r5=r2-1|0;L5370:do{if(r1){r10=0;while(1){L5373:do{if(!r8){r11=HEAP32[r4>>2]+r10|0;r12=HEAP32[HEAP32[r3+(r10<<2)>>2]+(r9<<2)>>2];r13=0;while(1){HEAP8[r12]=HEAP8[r11];r14=r13+1|0;if((r14|0)==(r7|0)){break L5373}else{r11=r11+r6|0;r12=r12+1|0;r13=r14}}}}while(0);r13=r10+1|0;if((r13|0)==(r6|0)){break L5370}else{r10=r13}}}}while(0);if((r5|0)>0){r9=r9+1|0;r4=r4+4|0;r2=r5}else{break}}return}function _cmyk_ycck_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22;r6=HEAP32[HEAP32[r1+408>>2]+8>>2]>>2;r7=HEAP32[r1+28>>2];if((r5|0)<=0){return}r1=r3+4|0;r8=r3+8|0;r9=r3+12|0;r10=(r7|0)==0;r11=r4;r4=r2;r2=r5;while(1){r5=r2-1|0;r12=r4+4|0;r13=HEAP32[HEAP32[r3>>2]+(r11<<2)>>2];r14=HEAP32[HEAP32[r1>>2]+(r11<<2)>>2];r15=HEAP32[HEAP32[r8>>2]+(r11<<2)>>2];r16=HEAP32[HEAP32[r9>>2]+(r11<<2)>>2];r17=r11+1|0;L5386:do{if(!r10){r18=HEAP32[r4>>2];r19=0;while(1){r20=HEAPU8[r18]^255;r21=HEAPU8[r18+1|0]^255;r22=HEAPU8[r18+2|0]^255;HEAP8[r16+r19|0]=HEAP8[r18+3|0];HEAP8[r13+r19|0]=(HEAP32[((r21|256)<<2>>2)+r6]+HEAP32[(r20<<2>>2)+r6]+HEAP32[((r22|512)<<2>>2)+r6]|0)>>>16&255;HEAP8[r14+r19|0]=(HEAP32[((r21|1024)<<2>>2)+r6]+HEAP32[((r20|768)<<2>>2)+r6]+HEAP32[((r22|1280)<<2>>2)+r6]|0)>>>16&255;HEAP8[r15+r19|0]=(HEAP32[((r21|1536)<<2>>2)+r6]+HEAP32[((r20|1280)<<2>>2)+r6]+HEAP32[((r22|1792)<<2>>2)+r6]|0)>>>16&255;r22=r19+1|0;if((r22|0)==(r7|0)){break L5386}else{r18=r18+4|0;r19=r22}}}}while(0);if((r5|0)>0){r11=r17;r4=r12;r2=r5}else{break}}return}function _jinit_color_converter(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10;r2=r1>>2;r3=0;r4=r1;r5=FUNCTION_TABLE[HEAP32[HEAP32[r2+1]>>2]](r4,1,12),r6=r5>>2;HEAP32[r2+102]=r5;r7=r5>>2;HEAP32[r7]=756;r5=(r1+40|0)>>2;r8=HEAP32[r5];do{if((r8|0)==2){if((HEAP32[r2+9]|0)==3){break}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=10;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}else if((r8|0)==1){if((HEAP32[r2+9]|0)==1){break}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=10;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}else if((r8|0)==4|(r8|0)==5){if((HEAP32[r2+9]|0)==4){break}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=10;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}else if((r8|0)==3){if((HEAP32[r2+9]|0)==3){break}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=10;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}else{if((HEAP32[r2+9]|0)>=1){break}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=10;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}}while(0);r8=r1+256|0;r9=r1+76|0;do{if((HEAP32[r8>>2]|0)!=0){if((HEAP32[r9>>2]|0)==2){break}r10=r1|0;HEAP32[HEAP32[r10>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r10>>2]>>2]](r4)}}while(0);r10=HEAP32[r9>>2];if((r10|0)==3){if((HEAP32[r2+18]|0)!=3){r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=11;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}r9=HEAP32[r5];if((r9|0)==3){HEAP32[r6+1]=946;return}else if((r9|0)==2){HEAP32[r7]=772;HEAP32[r6+1]=944;return}else{r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4);return}}else if((r10|0)==2){if((HEAP32[r2+18]|0)!=3){r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=11;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}if((HEAP32[r5]|0)!=2){r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4);return}r9=HEAP32[r8>>2];if((r9|0)==0){HEAP32[r6+1]=338;return}else if((r9|0)==1){HEAP32[r6+1]=286;return}else{r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4);return}}else if((r10|0)==5){if((HEAP32[r2+18]|0)!=4){r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=11;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}r9=HEAP32[r5];if((r9|0)==4){HEAP32[r7]=772;HEAP32[r6+1]=1130;return}else if((r9|0)==5){HEAP32[r6+1]=946;return}else{r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4);return}}else if((r10|0)==4){if((HEAP32[r2+18]|0)!=4){r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=11;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}if((HEAP32[r5]|0)==4){HEAP32[r6+1]=946;return}else{r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4);return}}else if((r10|0)==1){if((HEAP32[r2+18]|0)!=1){r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=11;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}r9=HEAP32[r5];if((r9|0)==2){HEAP32[r7]=772;HEAP32[r6+1]=16;return}else if((r9|0)==1|(r9|0)==3){HEAP32[r6+1]=788;return}else{r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4);return}}else{do{if((r10|0)==(HEAP32[r5]|0)){if((HEAP32[r2+18]|0)==(HEAP32[r2+9]|0)){break}else{r3=4685;break}}else{r3=4685}}while(0);if(r3==4685){r3=r1|0;HEAP32[HEAP32[r3>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]>>2]](r4)}HEAP32[r6+1]=946;return}}function _rgb_ycc_start(r1){var r2,r3;r2=HEAP32[r1+408>>2];r3=FUNCTION_TABLE[HEAP32[HEAP32[r1+4>>2]>>2]](r1,1,8192);r1=r3>>2;HEAP32[r2+8>>2]=r3;r3=0;while(1){HEAP32[(r3<<2>>2)+r1]=r3*19595&-1;HEAP32[(r3+256<<2>>2)+r1]=r3*38470&-1;HEAP32[(r3+512<<2>>2)+r1]=(r3*7471&-1)+32768|0;HEAP32[(r3+768<<2>>2)+r1]=r3*-11059&-1;HEAP32[(r3+1024<<2>>2)+r1]=r3*-21709&-1;HEAP32[(r3+1280<<2>>2)+r1]=(r3<<15)+8421375|0;HEAP32[(r3+1536<<2>>2)+r1]=r3*-27439&-1;HEAP32[(r3+1792<<2>>2)+r1]=r3*-5329&-1;r2=r3+1|0;if((r2|0)==256){break}else{r3=r2}}return}function _start_pass_fdctmgr(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28;r2=0;r3=HEAP32[r1+416>>2],r4=r3>>2;r5=r1+72|0;if((HEAP32[r5>>2]|0)<=0){return}r6=(r1|0)>>2;r7=r1;r8=r3+84|0;r9=(r1+4|0)>>2;r10=r3+140|0;r11=(r3+44|0)>>2;r12=r1+228|0;r13=r3+100|0;r3=HEAP32[r1+80>>2];r14=0;r15=0;while(1){r16=r3+36|0;r17=r3+40|0;r18=(HEAP32[r16>>2]<<8)+HEAP32[r17>>2]|0;do{if((r18|0)==3078){HEAP32[(r15<<2>>2)+r11]=584;r19=0}else if((r18|0)==2052){HEAP32[(r15<<2>>2)+r11]=4;r19=0}else if((r18|0)==3855){HEAP32[(r15<<2>>2)+r11]=952;r19=0}else if((r18|0)==1032){HEAP32[(r15<<2>>2)+r11]=988;r19=0}else if((r18|0)==1028){HEAP32[(r15<<2>>2)+r11]=984;r19=0}else if((r18|0)==2056){r20=HEAP32[r12>>2];if((r20|0)==0){HEAP32[(r15<<2>>2)+r11]=1072;r19=0;break}else if((r20|0)==1){HEAP32[(r15<<2>>2)+r11]=130;r19=1;break}else if((r20|0)==2){HEAP32[r13+(r15<<2)>>2]=296;r19=2;break}else{HEAP32[HEAP32[r6]+20>>2]=49;FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r7);r19=r14;break}}else if((r18|0)==3084){HEAP32[(r15<<2>>2)+r11]=230;r19=0}else if((r18|0)==258){HEAP32[(r15<<2>>2)+r11]=76;r19=0}else if((r18|0)==1806){HEAP32[(r15<<2>>2)+r11]=1138;r19=0}else if((r18|0)==513){HEAP32[(r15<<2>>2)+r11]=860;r19=0}else if((r18|0)==1542){HEAP32[(r15<<2>>2)+r11]=1248;r19=0}else if((r18|0)==257){HEAP32[(r15<<2>>2)+r11]=72;r19=0}else if((r18|0)==2064){HEAP32[(r15<<2>>2)+r11]=1164;r19=0}else if((r18|0)==4104){HEAP32[(r15<<2>>2)+r11]=920;r19=0}else if((r18|0)==1026){HEAP32[(r15<<2>>2)+r11]=982;r19=0}else if((r18|0)==771){HEAP32[(r15<<2>>2)+r11]=218;r19=0}else if((r18|0)==514){HEAP32[(r15<<2>>2)+r11]=1348;r19=0}else if((r18|0)==3341){HEAP32[(r15<<2>>2)+r11]=922;r19=0}else if((r18|0)==3591){HEAP32[(r15<<2>>2)+r11]=1094;r19=0}else if((r18|0)==2565){HEAP32[(r15<<2>>2)+r11]=718;r19=0}else if((r18|0)==1290){HEAP32[(r15<<2>>2)+r11]=136;r19=0}else if((r18|0)==1548){HEAP32[(r15<<2>>2)+r11]=590;r19=0}else if((r18|0)==774){HEAP32[(r15<<2>>2)+r11]=1300;r19=0}else if((r18|0)==2827){HEAP32[(r15<<2>>2)+r11]=462;r19=0}else if((r18|0)==2570){HEAP32[(r15<<2>>2)+r11]=1302;r19=0}else if((r18|0)==3598){HEAP32[(r15<<2>>2)+r11]=470;r19=0}else if((r18|0)==4112){HEAP32[(r15<<2>>2)+r11]=734;r19=0}else if((r18|0)==2313){HEAP32[(r15<<2>>2)+r11]=38;r19=0}else if((r18|0)==1799){HEAP32[(r15<<2>>2)+r11]=540;r19=0}else if((r18|0)==1539){HEAP32[(r15<<2>>2)+r11]=1244;r19=0}else if((r18|0)==1285){HEAP32[(r15<<2>>2)+r11]=404;r19=0}else if((r18|0)==516){HEAP32[(r15<<2>>2)+r11]=854;r19=0}else{HEAP32[HEAP32[r6]+20>>2]=7;HEAP32[HEAP32[r6]+24>>2]=HEAP32[r16>>2];HEAP32[HEAP32[r6]+28>>2]=HEAP32[r17>>2];FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r7);r19=r14}}while(0);r17=HEAP32[r3+16>>2];r16=(r17<<2)+r1+84|0;do{if(r17>>>0>3){r2=4749}else{r18=HEAP32[r16>>2];if((r18|0)==0){r2=4749;break}else{r21=r18,r22=r21>>1;break}}}while(0);if(r2==4749){r2=0;HEAP32[HEAP32[r6]+20>>2]=54;HEAP32[HEAP32[r6]+24>>2]=r17;FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r7);r21=HEAP32[r16>>2],r22=r21>>1}if((r19|0)==2){r18=(r17<<2)+r10|0;r20=HEAP32[r18>>2];if((r20|0)==0){r23=FUNCTION_TABLE[HEAP32[HEAP32[r9]>>2]](r7,1,256);HEAP32[r18>>2]=r23;r18=r23,r24=r18>>2}else{r18=r20,r24=r18>>2}r18=0;r20=0;while(1){r23=(r20<<3)+5243964|0;r25=(HEAP32[tempDoublePtr>>2]=HEAP32[r23>>2],HEAP32[tempDoublePtr+4>>2]=HEAP32[r23+4>>2],HEAPF64[tempDoublePtr>>3]);HEAPF32[(r18<<2>>2)+r24]=1/(HEAPU16[(r18<<1>>1)+r22]*r25*8);r23=r18|1;HEAPF32[(r23<<2>>2)+r24]=1/(HEAPU16[(r23<<1>>1)+r22]*r25*1.387039845*8);r26=r23+1|0;HEAPF32[(r26<<2>>2)+r24]=1/(HEAPU16[(r26<<1>>1)+r22]*r25*1.306562965*8);r26=r18|3;HEAPF32[(r26<<2>>2)+r24]=1/(HEAPU16[(r26<<1>>1)+r22]*r25*1.175875602*8);r23=r26+1|0;HEAPF32[(r23<<2>>2)+r24]=1/(HEAPU16[(r23<<1>>1)+r22]*r25*8);r23=r26+2|0;HEAPF32[(r23<<2>>2)+r24]=1/(HEAPU16[(r23<<1>>1)+r22]*r25*.785694958*8);r23=r26+3|0;HEAPF32[(r23<<2>>2)+r24]=1/(HEAPU16[(r23<<1>>1)+r22]*r25*.5411961*8);r23=r18|7;HEAPF32[(r23<<2>>2)+r24]=1/(HEAPU16[(r23<<1>>1)+r22]*r25*.275899379*8);r25=r20+1|0;if((r25|0)==8){break}else{r18=r18+8|0;r20=r25}}HEAP32[((r15<<2)+4>>2)+r4]=504}else if((r19|0)==0){r20=(r17<<2)+r8|0;r18=HEAP32[r20>>2];if((r18|0)==0){r16=FUNCTION_TABLE[HEAP32[HEAP32[r9]>>2]](r7,1,256);HEAP32[r20>>2]=r16;r27=r16}else{r27=r18}r18=0;while(1){HEAP32[r27+(r18<<2)>>2]=HEAPU16[(r18<<1>>1)+r22]<<3;r16=r18+1|0;if((r16|0)==64){break}else{r18=r16}}HEAP32[((r15<<2)+4>>2)+r4]=486}else if((r19|0)==1){r18=(r17<<2)+r8|0;r16=HEAP32[r18>>2];if((r16|0)==0){r20=FUNCTION_TABLE[HEAP32[HEAP32[r9]>>2]](r7,1,256);HEAP32[r18>>2]=r20;r28=r20}else{r28=r16}r16=0;while(1){HEAP32[r28+(r16<<2)>>2]=Math.imul(HEAP16[(r16<<1)+5243836>>1]<<16>>16,HEAPU16[(r16<<1>>1)+r22])+1024>>11;r20=r16+1|0;if((r20|0)==64){break}else{r16=r20}}HEAP32[((r15<<2)+4>>2)+r4]=486}else{HEAP32[HEAP32[r6]+20>>2]=49;FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r7)}r16=r15+1|0;if((r16|0)<(HEAP32[r5>>2]|0)){r3=r3+88|0;r14=r19;r15=r16}else{break}}return}function _forward_DCT(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18;r8=STACKTOP;STACKTOP=STACKTOP+256|0;r9=r8;r10=HEAP32[r1+416>>2];r1=HEAP32[r10+(HEAP32[r2+4>>2]<<2)+44>>2];r11=HEAP32[r10+(HEAP32[r2+16>>2]<<2)+84>>2];r10=(r5<<2)+r3|0;if((r7|0)==0){STACKTOP=r8;return}r3=r9|0;r5=r2+36|0;r2=0;r12=r6;while(1){FUNCTION_TABLE[r1](r3,r10,r12);r6=0;while(1){r13=HEAP32[r11+(r6<<2)>>2];r14=HEAP32[r9+(r6<<2)>>2];r15=r13>>1;do{if((r14|0)<0){r16=r15-r14|0;if((r16|0)<(r13|0)){r17=0}else{r17=(r16|0)/(r13|0)&-1}r18=-r17|0}else{r16=r14+r15|0;if((r16|0)<(r13|0)){r18=0;break}r18=(r16|0)/(r13|0)&-1}}while(0);HEAP16[r4+(r2<<7)+(r6<<1)>>1]=r18&65535;r13=r6+1|0;if((r13|0)==64){break}else{r6=r13}}r6=r2+1|0;if((r6|0)==(r7|0)){break}else{r2=r6;r12=HEAP32[r5>>2]+r12|0}}STACKTOP=r8;return}function _forward_DCT_float(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13;r8=STACKTOP;STACKTOP=STACKTOP+256|0;r9=r8;r10=HEAP32[r1+416>>2];r1=HEAP32[r10+(HEAP32[r2+4>>2]<<2)+100>>2];r11=HEAP32[r10+(HEAP32[r2+16>>2]<<2)+140>>2];r10=(r5<<2)+r3|0;if((r7|0)==0){STACKTOP=r8;return}r3=r9|0;r5=r2+36|0;r2=0;r12=r6;while(1){FUNCTION_TABLE[r1](r3,r10,r12);r6=0;while(1){HEAP16[r4+(r2<<7)+(r6<<1)>>1]=(HEAPF32[r9+(r6<<2)>>2]*HEAPF32[r11+(r6<<2)>>2]+16384.5&-1)+49152&65535;r13=r6+1|0;if((r13|0)==64){break}else{r6=r13}}r6=r2+1|0;if((r6|0)==(r7|0)){break}else{r2=r6;r12=HEAP32[r5>>2]+r12|0}}STACKTOP=r8;return}function _start_pass_huff(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31;r3=r1>>2;r4=HEAP32[r3+105],r5=r4>>2;r6=(r2|0)!=0;HEAP32[r5+2]=r6?1226:804;do{if((HEAP32[r3+66]|0)==0){r7=r4+4|0;if(r6){HEAP32[r7>>2]=36;break}else{HEAP32[r7>>2]=138;break}}else{HEAP32[r5+30]=r1;HEAP32[r5+27]=r2;r7=(HEAP32[r3+90]|0)==0;r8=(r4+4|0)>>2;do{if((HEAP32[r3+92]|0)==0){if(r7){HEAP32[r8]=1158;break}else{HEAP32[r8]=792;break}}else{if(r7){HEAP32[r8]=1074;break}HEAP32[r8]=132;r9=r4+136|0;if((HEAP32[r9>>2]|0)!=0){break}HEAP32[r9>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3+1]>>2]](r1,1,1e3)}}while(0);HEAP32[r5+31]=HEAP32[HEAP32[r3+73]+24>>2];HEAP32[r5+32]=0;HEAP32[r5+33]=0}}while(0);r5=r1+288|0;if((HEAP32[r5>>2]|0)<=0){r10=r4+12|0;HEAP32[r10>>2]=0;r11=r4+16|0;HEAP32[r11>>2]=0;r12=r1+232|0;r13=HEAP32[r12>>2];r14=r4+36|0;r15=r13;HEAP32[r14>>2]=r15;r16=r4+40|0;HEAP32[r16>>2]=0;return}r2=r1+360|0;r8=r1+368|0;r7=(r1|0)>>2;r9=r1;r17=r4+76|0;r18=r1+4|0;r19=r4+20|0;r20=r4+44|0;r21=r1+364|0;r22=r4+92|0;r23=r4+60|0;r24=0;while(1){r25=HEAP32[((r24<<2)+292>>2)+r3];do{if((HEAP32[r2>>2]|0)==0){if((HEAP32[r8>>2]|0)!=0){break}r26=HEAP32[r25+20>>2];if(r6){if(r26>>>0>3){HEAP32[HEAP32[r7]+20>>2]=52;HEAP32[HEAP32[r7]+24>>2]=r26;FUNCTION_TABLE[HEAP32[HEAP32[r7]>>2]](r9)}r27=(r26<<2)+r17|0;r28=HEAP32[r27>>2];if((r28|0)==0){r29=FUNCTION_TABLE[HEAP32[HEAP32[r18>>2]>>2]](r9,1,1028);HEAP32[r27>>2]=r29;r30=r29}else{r30=r28}_memset(r30,0,1028)}else{_jpeg_make_c_derived_tbl(r1,1,r26,(r26<<2)+r20|0)}HEAP32[r19+(r24<<2)>>2]=0}}while(0);do{if((HEAP32[r21>>2]|0)!=0){r26=HEAP32[r25+24>>2];if(!r6){_jpeg_make_c_derived_tbl(r1,0,r26,(r26<<2)+r23|0);break}if(r26>>>0>3){HEAP32[HEAP32[r7]+20>>2]=52;HEAP32[HEAP32[r7]+24>>2]=r26;FUNCTION_TABLE[HEAP32[HEAP32[r7]>>2]](r9)}r28=(r26<<2)+r22|0;r26=HEAP32[r28>>2];if((r26|0)==0){r29=FUNCTION_TABLE[HEAP32[HEAP32[r18>>2]>>2]](r9,1,1028);HEAP32[r28>>2]=r29;r31=r29}else{r31=r26}_memset(r31,0,1028)}}while(0);r25=r24+1|0;if((r25|0)<(HEAP32[r5>>2]|0)){r24=r25}else{break}}r10=r4+12|0;HEAP32[r10>>2]=0;r11=r4+16|0;HEAP32[r11>>2]=0;r12=r1+232|0;r13=HEAP32[r12>>2];r14=r4+36|0;r15=r13;HEAP32[r14>>2]=r15;r16=r4+40|0;HEAP32[r16>>2]=0;return}function _finish_pass_gather(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22;r2=STACKTOP;STACKTOP=STACKTOP+32|0;r3=r2;r4=r2+16;r5=HEAP32[r1+420>>2];if((HEAP32[r1+264>>2]|0)!=0){_emit_eobrun(r5)}r6=r3>>2;HEAP32[r6]=0;HEAP32[r6+1]=0;HEAP32[r6+2]=0;HEAP32[r6+3]=0;r6=r4>>2;HEAP32[r6]=0;HEAP32[r6+1]=0;HEAP32[r6+2]=0;HEAP32[r6+3]=0;r6=r1+288|0;if((HEAP32[r6>>2]|0)<=0){STACKTOP=r2;return}r7=r1+360|0;r8=r1+368|0;r9=r1;r10=r1+4|0;r11=r5+76|0;r12=r1+364|0;r13=r5+92|0;r5=0;while(1){r14=HEAP32[r1+(r5<<2)+292>>2];do{if((HEAP32[r7>>2]|0)==0){if((HEAP32[r8>>2]|0)!=0){break}r15=HEAP32[r14+20>>2];r16=(r15<<2)+r3|0;if((HEAP32[r16>>2]|0)!=0){break}r17=(r15<<2)+r1+116|0;r18=HEAP32[r17>>2];if((r18|0)==0){r19=FUNCTION_TABLE[HEAP32[HEAP32[r10>>2]>>2]](r9,0,280);r20=r19;HEAP32[r19+276>>2]=0;HEAP32[r17>>2]=r20;r21=r20}else{r21=r18}_jpeg_gen_optimal_table(r1,r21,HEAP32[r11+(r15<<2)>>2]);HEAP32[r16>>2]=1}}while(0);do{if((HEAP32[r12>>2]|0)!=0){r16=HEAP32[r14+24>>2];r15=(r16<<2)+r4|0;if((HEAP32[r15>>2]|0)!=0){break}r18=(r16<<2)+r1+132|0;r20=HEAP32[r18>>2];if((r20|0)==0){r17=FUNCTION_TABLE[HEAP32[HEAP32[r10>>2]>>2]](r9,0,280);r19=r17;HEAP32[r17+276>>2]=0;HEAP32[r18>>2]=r19;r22=r19}else{r22=r20}_jpeg_gen_optimal_table(r1,r22,HEAP32[r13+(r16<<2)>>2]);HEAP32[r15>>2]=1}}while(0);r14=r5+1|0;if((r14|0)<(HEAP32[r6>>2]|0)){r5=r14}else{break}}STACKTOP=r2;return}function _finish_pass_huff(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28;r2=STACKTOP;STACKTOP=STACKTOP+16|0;r3=HEAP32[r1+420>>2];r4=r3;r5=(r1+24|0)>>2;r6=HEAP32[r5];r7=HEAP32[r6>>2];if((HEAP32[r1+264>>2]|0)!=0){r8=r3+112|0;HEAP32[r8>>2]=r7;r9=r3+116|0;HEAP32[r9>>2]=HEAP32[HEAP32[r5]+4>>2];_emit_eobrun(r4);_emit_bits_e(r4,127,7);HEAP32[r3+12>>2]=0;HEAP32[r3+16>>2]=0;HEAP32[HEAP32[r5]>>2]=HEAP32[r8>>2];HEAP32[HEAP32[r5]+4>>2]=HEAP32[r9>>2];STACKTOP=r2;return}r9=HEAP32[r6+4>>2];r6=r3+12|0;r8=HEAP32[r6>>2];r4=r3+16|0;r10=HEAP32[r4>>2];r11=(r3+20|0)>>2;r3=r2>>2;HEAP32[r3]=HEAP32[r11];HEAP32[r3+1]=HEAP32[r11+1];HEAP32[r3+2]=HEAP32[r11+2];HEAP32[r3+3]=HEAP32[r11+3];L5663:do{if((r10|0)>0){r12=127<<17-r10|r8;r13=r10+7|0;r14=r7;r15=r9;L5665:while(1){r16=r12>>>16;r17=r16&255;r18=r14+1|0;HEAP8[r14]=r16&255;r16=r15-1|0;if((r16|0)==0){r19=HEAP32[r5]>>2;if((FUNCTION_TABLE[HEAP32[r19+3]](r1)|0)==0){r20=r18;break}r21=HEAP32[r19];r22=HEAP32[r19+1]}else{r21=r18;r22=r16}do{if((r17|0)==255){r16=r21+1|0;HEAP8[r21]=0;r18=r22-1|0;if((r18|0)!=0){r23=r16;r24=r18;break}r18=HEAP32[r5]>>2;if((FUNCTION_TABLE[HEAP32[r18+3]](r1)|0)==0){r20=r16;break L5665}r23=HEAP32[r18];r24=HEAP32[r18+1]}else{r23=r21;r24=r22}}while(0);r17=r13-8|0;if((r17|0)>7){r12=r12<<8;r13=r17;r14=r23;r15=r24}else{r25=r23;r26=r24;r27=0;r28=0;break L5663}}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1);r25=r20;r26=0;r27=r10;r28=r8}else{r25=r7;r26=r9;r27=0;r28=0}}while(0);HEAP32[HEAP32[r5]>>2]=r25;HEAP32[HEAP32[r5]+4>>2]=r26;HEAP32[r6>>2]=r28;HEAP32[r4>>2]=r27;HEAP32[r11]=HEAP32[r3];HEAP32[r11+1]=HEAP32[r3+1];HEAP32[r11+2]=HEAP32[r3+2];HEAP32[r11+3]=HEAP32[r3+3];STACKTOP=r2;return}function _encode_mcu_DC_first677(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24;r3=HEAP32[r1+420>>2];r4=r3;r5=HEAP32[r1+372>>2];r6=(r1+24|0)>>2;r7=r3+112|0;HEAP32[r7>>2]=HEAP32[HEAP32[r6]>>2];r8=r3+116|0;r9=r8;HEAP32[r8>>2]=HEAP32[HEAP32[r6]+4>>2];r8=r1+232|0;do{if((HEAP32[r8>>2]|0)!=0){if((HEAP32[r3+36>>2]|0)!=0){break}_emit_restart_e(r4,HEAP32[r3+40>>2])}}while(0);r10=r1+316|0;L5684:do{if((HEAP32[r10>>2]|0)>0){r11=r3+20|0;r12=r1|0;r13=r1;r14=r3+108|0;r15=0;while(1){r16=HEAP32[r1+(r15<<2)+320>>2];r17=HEAP32[r1+(r16<<2)+292>>2];r18=HEAP16[HEAP32[r2+(r15<<2)>>2]>>1]<<16>>16>>r5;r19=(r16<<2)+r11|0;r16=r18-HEAP32[r19>>2]|0;HEAP32[r19>>2]=r18;if((r16|0)<0){r20=-r16|0;r21=r16-1|0}else{r20=r16;r21=r16}do{if((r20|0)==0){r22=0}else{r16=0;r18=r20;while(1){r23=r16+1|0;r19=r18>>1;if((r19|0)==0){break}else{r16=r23;r18=r19}}if((r23|0)<=11){r22=r23;break}HEAP32[HEAP32[r12>>2]+20>>2]=6;FUNCTION_TABLE[HEAP32[HEAP32[r12>>2]>>2]](r13);r22=r23}}while(0);r18=HEAP32[r17+20>>2];if((HEAP32[r14>>2]|0)==0){r16=HEAP32[r4+(r18<<2)+44>>2];_emit_bits_e(r4,HEAP32[r16+(r22<<2)>>2],HEAP8[r16+(r22+1024)|0]<<24>>24)}else{r16=(r22<<2)+HEAP32[r4+(r18<<2)+76>>2]|0;HEAP32[r16>>2]=HEAP32[r16>>2]+1|0}if((r22|0)!=0){_emit_bits_e(r4,r21,r22)}r16=r15+1|0;if((r16|0)<(HEAP32[r10>>2]|0)){r15=r16}else{break L5684}}}}while(0);HEAP32[HEAP32[r6]>>2]=HEAP32[r7>>2];HEAP32[HEAP32[r6]+4>>2]=HEAP32[r9>>2];r9=HEAP32[r8>>2];if((r9|0)==0){return 1}r8=r3+36|0;r6=HEAP32[r8>>2];r7=r8|0;if((r6|0)==0){HEAP32[r7>>2]=r9;r8=r3+40|0;HEAP32[r8>>2]=HEAP32[r8>>2]+1&7;r24=r9}else{r24=r6}HEAP32[r7>>2]=r24-1|0;return 1}function _encode_mcu_AC_first678(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31;r3=r1>>2;r4=HEAP32[r3+105];r5=r4,r6=r5>>2;r7=(r1+24|0)>>2;r8=r4+112|0;HEAP32[r8>>2]=HEAP32[HEAP32[r7]>>2];r9=r4+116|0;r10=r9;HEAP32[r9>>2]=HEAP32[HEAP32[r7]+4>>2];r9=r1+232|0;do{if((HEAP32[r9>>2]|0)!=0){if((HEAP32[r4+36>>2]|0)!=0){break}_emit_restart_e(r5,HEAP32[r4+40>>2])}}while(0);r11=HEAP32[r3+91];r12=HEAP32[r3+93];r13=HEAP32[r3+95];r14=HEAP32[r2>>2];r2=HEAP32[r3+90];do{if((r2|0)<=(r11|0)){r3=r4+128|0;r15=r1|0;r16=r1;r17=r4+124|0;r18=r4+108|0;r19=r2;r20=0;while(1){r21=HEAP16[r14+(HEAP32[r13+(r19<<2)>>2]<<1)>>1];r22=r21<<16>>16;do{if(r21<<16>>16==0){r23=r20+1|0}else{if(r21<<16>>16<0){r24=-r22>>r12;r25=r24;r26=r24^-1}else{r24=r22>>r12;r25=r24;r26=r24}if((r25|0)==0){r23=r20+1|0;break}if((HEAP32[r3>>2]|0)!=0){_emit_eobrun(r5)}if((r20|0)>15){r24=r20;while(1){r27=HEAP32[r17>>2];if((HEAP32[r18>>2]|0)==0){r28=HEAP32[((r27<<2)+60>>2)+r6];_emit_bits_e(r5,HEAP32[r28+960>>2],HEAP8[r28+1264|0]<<24>>24)}else{r28=HEAP32[((r27<<2)+92>>2)+r6]+960|0;HEAP32[r28>>2]=HEAP32[r28>>2]+1|0}r28=r24-16|0;if((r28|0)>15){r24=r28}else{break}}r29=r20&15}else{r29=r20}r24=r25;r28=1;while(1){r27=r24>>1;if((r27|0)==0){break}else{r24=r27;r28=r28+1|0}}if((r28|0)>10){HEAP32[HEAP32[r15>>2]+20>>2]=6;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r16)}r24=HEAP32[r17>>2];r27=(r29<<4)+r28|0;if((HEAP32[r18>>2]|0)==0){r30=HEAP32[((r24<<2)+60>>2)+r6];_emit_bits_e(r5,HEAP32[r30+(r27<<2)>>2],HEAP8[r30+(r27+1024)|0]<<24>>24)}else{r30=(r27<<2)+HEAP32[((r24<<2)+92>>2)+r6]|0;HEAP32[r30>>2]=HEAP32[r30>>2]+1|0}_emit_bits_e(r5,r26,r28);r23=0}}while(0);r22=r19+1|0;if((r22|0)>(r11|0)){break}else{r19=r22;r20=r23}}if((r23|0)<=0){break}r20=r4+128|0;r19=HEAP32[r20>>2]+1|0;HEAP32[r20>>2]=r19;if((r19|0)!=32767){break}_emit_eobrun(r5)}}while(0);HEAP32[HEAP32[r7]>>2]=HEAP32[r8>>2];HEAP32[HEAP32[r7]+4>>2]=HEAP32[r10>>2];r10=HEAP32[r9>>2];if((r10|0)==0){return 1}r9=r4+36|0;r7=HEAP32[r9>>2];r8=r9|0;if((r7|0)==0){HEAP32[r8>>2]=r10;r9=r4+40|0;HEAP32[r9>>2]=HEAP32[r9>>2]+1&7;r31=r10}else{r31=r7}HEAP32[r8>>2]=r31-1|0;return 1}function _encode_mcu_DC_refine679(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12;r3=HEAP32[r1+420>>2];r4=r3;r5=HEAP32[r1+372>>2];r6=(r1+24|0)>>2;r7=r3+112|0;HEAP32[r7>>2]=HEAP32[HEAP32[r6]>>2];r8=r3+116|0;r9=r8;HEAP32[r8>>2]=HEAP32[HEAP32[r6]+4>>2];r8=r1+232|0;do{if((HEAP32[r8>>2]|0)!=0){if((HEAP32[r3+36>>2]|0)!=0){break}_emit_restart_e(r4,HEAP32[r3+40>>2])}}while(0);r10=r1+316|0;L5770:do{if((HEAP32[r10>>2]|0)>0){r1=0;while(1){_emit_bits_e(r4,HEAP16[HEAP32[r2+(r1<<2)>>2]>>1]<<16>>16>>r5,1);r11=r1+1|0;if((r11|0)<(HEAP32[r10>>2]|0)){r1=r11}else{break L5770}}}}while(0);HEAP32[HEAP32[r6]>>2]=HEAP32[r7>>2];HEAP32[HEAP32[r6]+4>>2]=HEAP32[r9>>2];r9=HEAP32[r8>>2];if((r9|0)==0){return 1}r8=r3+36|0;r6=HEAP32[r8>>2];r7=r8|0;if((r6|0)==0){HEAP32[r7>>2]=r9;r8=r3+40|0;HEAP32[r8>>2]=HEAP32[r8>>2]+1&7;r12=r9}else{r12=r6}HEAP32[r7>>2]=r12-1|0;return 1}function _encode_mcu_AC_refine680(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44;r3=r1>>2;r4=STACKTOP;STACKTOP=STACKTOP+256|0;r5=r4;r6=HEAP32[r3+105];r7=r6,r8=r7>>2;r9=(r1+24|0)>>2;r10=r6+112|0;HEAP32[r10>>2]=HEAP32[HEAP32[r9]>>2];r11=r6+116|0;r12=r11;HEAP32[r11>>2]=HEAP32[HEAP32[r9]+4>>2];r11=r1+232|0;do{if((HEAP32[r11>>2]|0)!=0){if((HEAP32[r6+36>>2]|0)!=0){break}_emit_restart_e(r7,HEAP32[r6+40>>2])}}while(0);r1=HEAP32[r3+91];r13=HEAP32[r3+93];r14=HEAP32[r3+95];r15=HEAP32[r2>>2];r2=HEAP32[r3+90];r3=(r2|0)>(r1|0);L5786:do{if(r3){r16=r6+132|0;r17=0;r18=0;r19=r16;r20=r16}else{r16=0;r21=r2;while(1){r22=HEAP16[r15+(HEAP32[r14+(r21<<2)>>2]<<1)>>1];r23=r22<<16>>16;r24=(r22<<16>>16<0?-r23|0:r23)>>r13;HEAP32[r5+(r21<<2)>>2]=r24;r25=(r24|0)==1?r21:r16;r24=r21+1|0;if((r24|0)>(r1|0)){break}else{r16=r25;r21=r24}}r21=(r6+136|0)>>2;r16=r6+132|0;r24=r16;if(r3){r17=0;r18=0;r19=r16;r20=r24;break}r23=r6+124|0;r22=(r6+108|0)>>2;r26=HEAP32[r21]+HEAP32[r24>>2]|0;r27=0;r28=r2;r29=0;while(1){r30=HEAP32[r5+(r28<<2)>>2];do{if((r30|0)==0){r31=r29+1|0;r32=r27;r33=r26}else{L5795:do{if((r29|0)<16|(r28|0)>(r25|0)){r34=r26;r35=r27;r36=r29}else{r37=r26;r38=r27;r39=r29;while(1){_emit_eobrun(r7);r40=HEAP32[r23>>2];if((HEAP32[r22]|0)==0){r41=HEAP32[((r40<<2)+60>>2)+r8];_emit_bits_e(r7,HEAP32[r41+960>>2],HEAP8[r41+1264|0]<<24>>24)}else{r41=HEAP32[((r40<<2)+92>>2)+r8]+960|0;HEAP32[r41>>2]=HEAP32[r41>>2]+1|0}r41=r39-16|0;L5802:do{if(!((HEAP32[r22]|0)!=0|(r38|0)==0)){r40=r37;r42=r38;while(1){_emit_bits_e(r7,HEAP8[r40]<<24>>24,1);r43=r42-1|0;if((r43|0)==0){break L5802}else{r40=r40+1|0;r42=r43}}}}while(0);r42=HEAP32[r21];if((r41|0)<16){r34=r42;r35=0;r36=r41;break L5795}else{r37=r42;r38=0;r39=r41}}}}while(0);if((r30|0)>1){HEAP8[r34+r35|0]=r30&1;r31=r36;r32=r35+1|0;r33=r34;break}_emit_eobrun(r7);r39=HEAP32[r23>>2];r38=r36<<4|1;if((HEAP32[r22]|0)==0){r37=HEAP32[((r39<<2)+60>>2)+r8];_emit_bits_e(r7,HEAP32[r37+(r38<<2)>>2],HEAP8[r37+(r38+1024)|0]<<24>>24)}else{r37=(r38<<2)+HEAP32[((r39<<2)+92>>2)+r8]|0;HEAP32[r37>>2]=HEAP32[r37>>2]+1|0}_emit_bits_e(r7,HEAPU16[r15+(HEAP32[r14+(r28<<2)>>2]<<1)>>1]>>>15&65535^1,1);L5814:do{if(!((HEAP32[r22]|0)!=0|(r35|0)==0)){r37=r34;r39=r35;while(1){_emit_bits_e(r7,HEAP8[r37]<<24>>24,1);r38=r39-1|0;if((r38|0)==0){break L5814}else{r37=r37+1|0;r39=r38}}}}while(0);r31=0;r32=0;r33=HEAP32[r21]}}while(0);r30=r28+1|0;if((r30|0)>(r1|0)){r17=r32;r18=r31;r19=r16;r20=r24;break L5786}else{r26=r33;r27=r32;r28=r30;r29=r31}}}}while(0);do{if(!((r18|0)<1&(r17|0)==0)){r31=r6+128|0;r32=HEAP32[r31>>2]+1|0;HEAP32[r31>>2]=r32;r31=HEAP32[r20>>2]+r17|0;HEAP32[r19>>2]=r31;if(!((r32|0)==32767|r31>>>0>937)){break}_emit_eobrun(r7)}}while(0);HEAP32[HEAP32[r9]>>2]=HEAP32[r10>>2];HEAP32[HEAP32[r9]+4>>2]=HEAP32[r12>>2];r12=HEAP32[r11>>2];if((r12|0)==0){STACKTOP=r4;return 1}r11=r6+36|0;r9=HEAP32[r11>>2];r10=r11|0;if((r9|0)==0){HEAP32[r10>>2]=r12;r11=r6+40|0;HEAP32[r11>>2]=HEAP32[r11>>2]+1&7;r44=r12}else{r44=r9}HEAP32[r10>>2]=r44-1|0;STACKTOP=r4;return 1}function _encode_mcu_gather(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30;r3=HEAP32[r1+420>>2];r4=r1+232|0;r5=HEAP32[r4>>2];if((r5|0)!=0){r6=r3+36|0;r7=HEAP32[r6>>2];if((r7|0)==0){r8=r1+288|0;if((HEAP32[r8>>2]|0)>0){r9=r3+20|0;r10=0;while(1){HEAP32[r9+(r10<<2)>>2]=0;r11=r10+1|0;if((r11|0)<(HEAP32[r8>>2]|0)){r10=r11}else{break}}r12=HEAP32[r4>>2]}else{r12=r5}r5=r6|0;HEAP32[r5>>2]=r12;r13=r12;r14=r5}else{r13=r7;r14=r6|0}HEAP32[r14>>2]=r13-1|0}r13=r1+316|0;if((HEAP32[r13>>2]|0)<=0){return 1}r14=r3+20|0;r6=r3+76|0;r7=r3+92|0;r3=r1+384|0;r5=r1+380|0;r12=(r1|0)>>2;r4=r1;r10=0;while(1){r8=HEAP32[r1+(r10<<2)+320>>2];r9=HEAP32[r1+(r8<<2)+292>>2];r11=(r10<<2)+r2|0;r15=HEAP32[r11>>2];r16=(r8<<2)+r14|0;r8=HEAP32[r6+(HEAP32[r9+20>>2]<<2)>>2];r17=HEAP32[r7+(HEAP32[r9+24>>2]<<2)>>2];r9=HEAP32[r3>>2];r18=HEAP32[r5>>2];r19=(HEAP16[r15>>1]<<16>>16)-HEAP32[r16>>2]|0;r20=(r19|0)<0?-r19|0:r19;do{if((r20|0)==0){r21=0}else{r19=0;r22=r20;while(1){r23=r19+1|0;r24=r22>>1;if((r24|0)==0){break}else{r19=r23;r22=r24}}if((r23|0)<=11){r21=r23;break}HEAP32[HEAP32[r12]+20>>2]=6;FUNCTION_TABLE[HEAP32[HEAP32[r12]>>2]](r4);r21=r23}}while(0);r20=(r21<<2)+r8|0;HEAP32[r20>>2]=HEAP32[r20>>2]+1|0;do{if((r9|0)>=1){r20=r17+960|0;r22=r9+1|0;r19=1;r24=0;while(1){r25=HEAP16[r15+(HEAP32[r18+(r19<<2)>>2]<<1)>>1];r26=r25<<16>>16;if(r25<<16>>16==0){r27=r24+1|0}else{if((r24|0)>15){r28=r24-16|0;r29=r28>>>4;HEAP32[r20>>2]=r29+HEAP32[r20>>2]+1|0;r30=r28-(r29<<4)|0}else{r30=r24}r29=r25<<16>>16<0?-r26|0:r26;r26=1;while(1){r25=r29>>1;if((r25|0)==0){break}else{r29=r25;r26=r26+1|0}}if((r26|0)>10){HEAP32[HEAP32[r12]+20>>2]=6;FUNCTION_TABLE[HEAP32[HEAP32[r12]>>2]](r4)}r29=((r30<<4)+r26<<2)+r17|0;HEAP32[r29>>2]=HEAP32[r29>>2]+1|0;r27=0}r29=r19+1|0;if((r29|0)==(r22|0)){break}else{r19=r29;r24=r27}}if((r27|0)<=0){break}HEAP32[r17>>2]=HEAP32[r17>>2]+1|0}}while(0);HEAP32[r16>>2]=HEAP16[HEAP32[r11>>2]>>1]<<16>>16;r17=r10+1|0;if((r17|0)<(HEAP32[r13>>2]|0)){r10=r17}else{break}}return 1}function _encode_mcu_huff(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+36|0;r5=r4;r6=HEAP32[r1+420>>2];r7=(r1+24|0)>>2;r8=HEAP32[r7];r9=HEAP32[r8>>2];r10=(r5|0)>>2;HEAP32[r10]=r9;r11=HEAP32[r8+4>>2];r8=(r5+4|0)>>2;HEAP32[r8]=r11;r12=(r5+8|0)>>2;r13=(r6+12|0)>>2;HEAP32[r12]=HEAP32[r13];HEAP32[r12+1]=HEAP32[r13+1];HEAP32[r12+2]=HEAP32[r13+2];HEAP32[r12+3]=HEAP32[r13+3];HEAP32[r12+4]=HEAP32[r13+4];HEAP32[r12+5]=HEAP32[r13+5];r14=(r5+32|0)>>2;HEAP32[r14]=r1;r15=r1+232|0;L5880:do{if((HEAP32[r15>>2]|0)==0){r16=r1}else{if((HEAP32[r6+36>>2]|0)!=0){r16=r1;break}r17=HEAP32[r6+40>>2];r18=r5+12|0;r19=HEAP32[r18>>2];r20=r5+8|0;do{if((r19|0)>0){r21=HEAP32[r20>>2]|127<<17-r19;r22=r19+7|0;r23=r9;r24=r11;L5885:while(1){r25=r21>>>16;r26=r25&255;r27=r23+1|0;HEAP8[r23]=r25&255;r25=r24-1|0;if((r25|0)==0){r28=HEAP32[r7]>>2;if((FUNCTION_TABLE[HEAP32[r28+3]](r1)|0)==0){r29=r27;break}r30=HEAP32[r28];r31=HEAP32[r28+1]}else{r30=r27;r31=r25}do{if((r26|0)==255){r25=r30+1|0;HEAP8[r30]=0;r27=r31-1|0;if((r27|0)!=0){r32=r25;r33=r27;break}r27=HEAP32[r7]>>2;if((FUNCTION_TABLE[HEAP32[r27+3]](r1)|0)==0){r29=r25;break L5885}r32=HEAP32[r27];r33=HEAP32[r27+1]}else{r32=r30;r33=r31}}while(0);r26=r22-8|0;if((r26|0)>7){r21=r21<<8;r22=r26;r23=r32;r24=r33}else{r3=5022;break}}if(r3==5022){HEAP32[r10]=r32;HEAP32[r8]=r33;r34=r32;break}HEAP32[r10]=r29;HEAP32[r8]=0;r35=0;STACKTOP=r4;return r35}else{r34=r9}}while(0);HEAP32[r20>>2]=0;HEAP32[r18>>2]=0;HEAP32[r10]=r34+1|0;HEAP8[r34]=-1;r19=HEAP32[r8]-1|0;HEAP32[r8]=r19;do{if((r19|0)==0){r24=HEAP32[r14];r23=HEAP32[r24+24>>2]>>2;if((FUNCTION_TABLE[HEAP32[r23+3]](r24)|0)==0){r35=0;STACKTOP=r4;return r35}else{r24=HEAP32[r23];HEAP32[r10]=r24;r22=HEAP32[r23+1];HEAP32[r8]=r22;r36=r24;r37=r22;break}}else{r36=HEAP32[r10];r37=r19}}while(0);HEAP32[r10]=r36+1|0;HEAP8[r36]=r17+208&255;r19=r37-1|0;HEAP32[r8]=r19;r18=HEAP32[r14];do{if((r19|0)==0){r20=HEAP32[r18+24>>2]>>2;if((FUNCTION_TABLE[HEAP32[r20+3]](r18)|0)==0){r35=0;STACKTOP=r4;return r35}else{HEAP32[r10]=HEAP32[r20];HEAP32[r8]=HEAP32[r20+1];break}}}while(0);if((HEAP32[r18+288>>2]|0)>0){r38=0}else{r16=r18;break}while(1){HEAP32[r5+(r38<<2)+16>>2]=0;r19=r38+1|0;r17=HEAP32[r14];if((r19|0)<(HEAP32[r17+288>>2]|0)){r38=r19}else{r16=r17;break L5880}}}}while(0);r38=r1+316|0;L5917:do{if((HEAP32[r38>>2]|0)>0){r37=r6+44|0;r36=r6+60|0;r34=0;r9=r16;L5919:while(1){r29=HEAP32[r1+(r34<<2)+320>>2];r32=HEAP32[r1+(r29<<2)+292>>2];r33=(r34<<2)+r2|0;r31=HEAP32[r33>>2];r30=(r29<<2)+r5+16|0;r29=HEAP32[r37+(HEAP32[r32+20>>2]<<2)>>2];r11=HEAP32[r36+(HEAP32[r32+24>>2]<<2)>>2];r32=HEAP32[r9+384>>2];r18=HEAP32[r9+380>>2];r17=(HEAP16[r31>>1]<<16>>16)-HEAP32[r30>>2]|0;if((r17|0)<0){r39=-r17|0;r40=r17-1|0}else{r39=r17;r40=r17}do{if((r39|0)==0){r41=0}else{r17=0;r19=r39;while(1){r42=r17+1|0;r20=r19>>1;if((r20|0)==0){break}else{r17=r42;r19=r20}}if((r42|0)<=11){r41=r42;break}r19=r9|0;HEAP32[HEAP32[r19>>2]+20>>2]=6;FUNCTION_TABLE[HEAP32[HEAP32[r19>>2]>>2]](r9);r41=r42}}while(0);if((_emit_bits_s(r5,HEAP32[r29+(r41<<2)>>2],HEAP8[r29+(r41+1024)|0]<<24>>24)|0)==0){r35=0;r3=5074;break}if((r41|0)!=0){if((_emit_bits_s(r5,r40,r41)|0)==0){r35=0;r3=5073;break}}do{if((r32|0)>=1){r19=r11+960|0;r17=r11+1264|0;r20=1;r22=0;while(1){r24=HEAP16[r31+(HEAP32[r18+(r20<<2)>>2]<<1)>>1];r23=r24<<16>>16;if(r24<<16>>16==0){r43=r22+1|0}else{r21=r22;while(1){if((r21|0)<=15){break}if((_emit_bits_s(r5,HEAP32[r19>>2],HEAP8[r17]<<24>>24)|0)==0){r35=0;r3=5072;break L5919}else{r21=r21-16|0}}if(r24<<16>>16<0){r44=-r23|0;r45=r23-1|0}else{r44=r23;r45=r23}r26=r44;r27=1;while(1){r25=r26>>1;if((r25|0)==0){break}else{r26=r25;r27=r27+1|0}}if((r27|0)>10){r26=HEAP32[r14];r23=r26|0;HEAP32[HEAP32[r23>>2]+20>>2]=6;FUNCTION_TABLE[HEAP32[HEAP32[r23>>2]>>2]](r26)}r26=(r21<<4)+r27|0;if((_emit_bits_s(r5,HEAP32[r11+(r26<<2)>>2],HEAP8[r11+(r26+1024)|0]<<24>>24)|0)==0){r35=0;r3=5071;break L5919}if((_emit_bits_s(r5,r45,r27)|0)==0){r35=0;r3=5076;break L5919}else{r43=0}}r26=r20+1|0;if((r26|0)>(r32|0)){break}else{r20=r26;r22=r43}}if((r43|0)<=0){break}if((_emit_bits_s(r5,HEAP32[r11>>2],HEAP8[r11+1024|0]<<24>>24)|0)==0){r35=0;r3=5068;break L5919}}}while(0);HEAP32[r30>>2]=HEAP16[HEAP32[r33>>2]>>1]<<16>>16;r11=r34+1|0;if((r11|0)>=(HEAP32[r38>>2]|0)){break L5917}r34=r11;r9=HEAP32[r14]}if(r3==5073){STACKTOP=r4;return r35}else if(r3==5074){STACKTOP=r4;return r35}else if(r3==5071){STACKTOP=r4;return r35}else if(r3==5072){STACKTOP=r4;return r35}else if(r3==5076){STACKTOP=r4;return r35}else if(r3==5068){STACKTOP=r4;return r35}}}while(0);HEAP32[HEAP32[r7]>>2]=HEAP32[r10];HEAP32[HEAP32[r7]+4>>2]=HEAP32[r8];HEAP32[r13]=HEAP32[r12];HEAP32[r13+1]=HEAP32[r12+1];HEAP32[r13+2]=HEAP32[r12+2];HEAP32[r13+3]=HEAP32[r12+3];HEAP32[r13+4]=HEAP32[r12+4];HEAP32[r13+5]=HEAP32[r12+5];r12=HEAP32[r15>>2];if((r12|0)==0){r35=1;STACKTOP=r4;return r35}r15=r6+36|0;r13=HEAP32[r15>>2];r8=r15|0;if((r13|0)==0){HEAP32[r8>>2]=r12;r15=r6+40|0;HEAP32[r15>>2]=HEAP32[r15>>2]+1&7;r46=r12}else{r46=r13}HEAP32[r8>>2]=r46-1|0;r35=1;STACKTOP=r4;return r35}function _jpeg_make_c_derived_tbl(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24;r5=0;r6=STACKTOP;STACKTOP=STACKTOP+1288|0;r7=r6;r8=r6+260;if(r3>>>0>3){r9=(r1|0)>>2;HEAP32[HEAP32[r9]+20>>2]=52;HEAP32[HEAP32[r9]+24>>2]=r3;FUNCTION_TABLE[HEAP32[HEAP32[r9]>>2]](r1)}r9=(r2|0)!=0;if(r9){r10=(r3<<2)+r1+116|0}else{r10=(r3<<2)+r1+132|0}r2=HEAP32[r10>>2];if((r2|0)==0){r10=(r1|0)>>2;HEAP32[HEAP32[r10]+20>>2]=52;HEAP32[HEAP32[r10]+24>>2]=r3;FUNCTION_TABLE[HEAP32[HEAP32[r10]>>2]](r1)}r10=HEAP32[r4>>2];if((r10|0)==0){r3=r1;r11=FUNCTION_TABLE[HEAP32[HEAP32[r1+4>>2]>>2]](r3,1,1280);HEAP32[r4>>2]=r11;r12=r11;r13=r3}else{r12=r10;r13=r1}r10=(r1|0)>>2;r1=1;r3=0;while(1){r11=HEAP8[r2+r1|0];r4=r11&255;r14=r4+r3|0;if((r14|0)>256){HEAP32[HEAP32[r10]+20>>2]=9;FUNCTION_TABLE[HEAP32[HEAP32[r10]>>2]](r13)}if(r11<<24>>24==0){r15=r3}else{_memset(r7+r3|0,r1&255,r4);r15=r14}r14=r1+1|0;if((r14|0)==17){break}else{r1=r14;r3=r15}}HEAP8[r7+r15|0]=0;r3=HEAP8[r7|0];L5998:do{if(r3<<24>>24!=0){r1=r3<<24>>24;r14=0;r4=0;r11=r3;while(1){L6002:do{if((r11<<24>>24|0)==(r1|0)){r16=r14;r17=r4;while(1){r18=r16+1|0;HEAP32[r8+(r16<<2)>>2]=r17;r19=r17+1|0;r20=HEAP8[r7+r18|0];if((r20<<24>>24|0)==(r1|0)){r16=r18;r17=r19}else{r21=r18;r22=r19;r23=r20;break L6002}}}else{r21=r14;r22=r4;r23=r11}}while(0);if((r22|0)>=(1<<r1|0)){HEAP32[HEAP32[r10]+20>>2]=9;FUNCTION_TABLE[HEAP32[HEAP32[r10]>>2]](r13)}if(r23<<24>>24==0){break L5998}else{r1=r1+1|0;r14=r21;r4=r22<<1;r11=r23}}}}while(0);_memset(r12+1024|0,0,256);r23=r9?15:255;if((r15|0)>0){r24=0}else{STACKTOP=r6;return}while(1){r9=HEAPU8[r2+(r24+17)|0];r22=r12+(r9+1024)|0;do{if(r9>>>0>r23>>>0){r5=5105}else{if(HEAP8[r22]<<24>>24==0){break}else{r5=5105;break}}}while(0);if(r5==5105){r5=0;HEAP32[HEAP32[r10]+20>>2]=9;FUNCTION_TABLE[HEAP32[HEAP32[r10]>>2]](r13)}HEAP32[r12+(r9<<2)>>2]=HEAP32[r8+(r24<<2)>>2];HEAP8[r22]=HEAP8[r7+r24|0];r21=r24+1|0;if((r21|0)==(r15|0)){break}else{r24=r21}}STACKTOP=r6;return}function _emit_bits_s(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16;r4=0;r5=r1+12|0;r6=HEAP32[r5>>2];if((r3|0)==0){r7=r1+32|0;HEAP32[HEAP32[HEAP32[r7>>2]>>2]+20>>2]=41;r8=HEAP32[r7>>2];FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]>>2]](r8)}r8=r6+r3|0;r6=r1+8|0;r7=HEAP32[r6>>2]|((1<<r3)-1&r2)<<24-r8;L6024:do{if((r8|0)>7){r2=(r1|0)>>2;r3=(r1+4|0)>>2;r9=r7;r10=r8;L6026:while(1){r11=r9>>>16;r12=r11&255;r13=HEAP32[r2];HEAP32[r2]=r13+1|0;HEAP8[r13]=r11&255;r11=HEAP32[r3]-1|0;HEAP32[r3]=r11;if((r11|0)==0){if((_dump_buffer_s(r1)|0)==0){r14=0;r4=5122;break}}do{if((r12|0)==255){r11=HEAP32[r2];HEAP32[r2]=r11+1|0;HEAP8[r11]=0;r11=HEAP32[r3]-1|0;HEAP32[r3]=r11;if((r11|0)!=0){break}if((_dump_buffer_s(r1)|0)==0){r14=0;r4=5123;break L6026}}}while(0);r12=r9<<8;r11=r10-8|0;if((r11|0)>7){r9=r12;r10=r11}else{r15=r12;r16=r11;break L6024}}if(r4==5122){return r14}else if(r4==5123){return r14}}else{r15=r7;r16=r8}}while(0);HEAP32[r6>>2]=r15;HEAP32[r5>>2]=r16;r14=1;return r14}function _dump_buffer_s(r1){var r2,r3,r4;r2=HEAP32[r1+32>>2];r3=HEAP32[r2+24>>2]>>2;if((FUNCTION_TABLE[HEAP32[r3+3]](r2)|0)==0){r4=0;return r4}HEAP32[r1>>2]=HEAP32[r3];HEAP32[r1+4>>2]=HEAP32[r3+1];r4=1;return r4}function _emit_restart_e(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10;r3=r1>>2;_emit_eobrun(r1);do{if((HEAP32[r3+27]|0)==0){_emit_bits_e(r1,127,7);HEAP32[r3+3]=0;HEAP32[r3+4]=0;r4=(r1+112|0)>>2;r5=HEAP32[r4];HEAP32[r4]=r5+1|0;HEAP8[r5]=-1;r5=(r1+116|0)>>2;r6=HEAP32[r5]-1|0;HEAP32[r5]=r6;if((r6|0)==0){r6=(r1+120|0)>>2;r7=HEAP32[r6];r8=HEAP32[r7+24>>2]>>2;if((FUNCTION_TABLE[HEAP32[r8+3]](r7)|0)==0){HEAP32[HEAP32[HEAP32[r6]>>2]+20>>2]=25;r7=HEAP32[r6];FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r7)}r7=HEAP32[r8];HEAP32[r4]=r7;HEAP32[r5]=HEAP32[r8+1];r9=r7}else{r9=HEAP32[r4]}HEAP32[r4]=r9+1|0;HEAP8[r9]=r2+208&255;r7=HEAP32[r5]-1|0;HEAP32[r5]=r7;if((r7|0)!=0){break}r7=(r1+120|0)>>2;r8=HEAP32[r7];r6=HEAP32[r8+24>>2]>>2;if((FUNCTION_TABLE[HEAP32[r6+3]](r8)|0)==0){HEAP32[HEAP32[HEAP32[r7]>>2]+20>>2]=25;r8=HEAP32[r7];FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]>>2]](r8)}HEAP32[r4]=HEAP32[r6];HEAP32[r5]=HEAP32[r6+1]}}while(0);r2=r1+120|0;r1=HEAP32[r2>>2];if((HEAP32[r1+360>>2]|0)!=0){HEAP32[r3+32]=0;HEAP32[r3+33]=0;return}if((HEAP32[r1+288>>2]|0)>0){r10=0}else{return}while(1){HEAP32[((r10<<2)+20>>2)+r3]=0;r1=r10+1|0;if((r1|0)<(HEAP32[HEAP32[r2>>2]+288>>2]|0)){r10=r1}else{break}}return}function _emit_eobrun(r1){var r2,r3,r4,r5,r6,r7;r2=(r1+128|0)>>2;r3=HEAP32[r2];if((r3|0)==0){return}else{r4=0;r5=r3}while(1){r3=r5>>1;if((r3|0)==0){break}else{r4=r4+1|0;r5=r3}}if((r4|0)>14){r5=r1+120|0;HEAP32[HEAP32[HEAP32[r5>>2]>>2]+20>>2]=41;r3=HEAP32[r5>>2];FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]>>2]](r3)}r3=HEAP32[r1+124>>2];r5=r4<<4;r6=r1+108|0;if((HEAP32[r6>>2]|0)==0){r7=HEAP32[r1+(r3<<2)+60>>2];_emit_bits_e(r1,HEAP32[r7+(r5<<2)>>2],HEAP8[r7+(r5+1024)|0]<<24>>24)}else{r7=(r5<<2)+HEAP32[r1+(r3<<2)+92>>2]|0;HEAP32[r7>>2]=HEAP32[r7>>2]+1|0}if((r4|0)!=0){_emit_bits_e(r1,HEAP32[r2],r4)}HEAP32[r2]=0;r2=r1+132|0;r4=HEAP32[r2>>2];L6085:do{if(!((HEAP32[r6>>2]|0)!=0|(r4|0)==0)){r7=HEAP32[r1+136>>2];r3=r4;while(1){_emit_bits_e(r1,HEAP8[r7]<<24>>24,1);r5=r3-1|0;if((r5|0)==0){break L6085}else{r7=r7+1|0;r3=r5}}}}while(0);HEAP32[r2>>2]=0;return}function _emit_bits_e(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16;r4=r1+16|0;r5=HEAP32[r4>>2];if((r3|0)==0){r6=r1+120|0;HEAP32[HEAP32[HEAP32[r6>>2]>>2]+20>>2]=41;r7=HEAP32[r6>>2];FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r7)}if((HEAP32[r1+108>>2]|0)!=0){return}r7=r5+r3|0;r6=r1+12|0;r8=HEAP32[r6>>2]|((1<<r3)-1&r2)<<24-r7;if((r7|0)>7){r2=(r1+112|0)>>2;r9=(r1+116|0)>>2;r10=(r1+120|0)>>2;r1=7-r5-r3|0;r3=r7+((r1|0)>-8?r1:-8)&-8;r1=r7;r5=r8;while(1){r11=r5>>>16;r12=r11&255;r13=HEAP32[r2];HEAP32[r2]=r13+1|0;HEAP8[r13]=r11&255;r11=HEAP32[r9]-1|0;HEAP32[r9]=r11;if((r11|0)==0){r11=HEAP32[r10];r13=HEAP32[r11+24>>2]>>2;if((FUNCTION_TABLE[HEAP32[r13+3]](r11)|0)==0){HEAP32[HEAP32[HEAP32[r10]>>2]+20>>2]=25;r11=HEAP32[r10];FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]>>2]](r11)}HEAP32[r2]=HEAP32[r13];HEAP32[r9]=HEAP32[r13+1]}do{if((r12|0)==255){r13=HEAP32[r2];HEAP32[r2]=r13+1|0;HEAP8[r13]=0;r13=HEAP32[r9]-1|0;HEAP32[r9]=r13;if((r13|0)!=0){break}r13=HEAP32[r10];r11=HEAP32[r13+24>>2]>>2;if((FUNCTION_TABLE[HEAP32[r11+3]](r13)|0)==0){HEAP32[HEAP32[HEAP32[r10]>>2]+20>>2]=25;r13=HEAP32[r10];FUNCTION_TABLE[HEAP32[HEAP32[r13>>2]>>2]](r13)}HEAP32[r2]=HEAP32[r11];HEAP32[r9]=HEAP32[r11+1]}}while(0);r14=r5<<8;r12=r1-8|0;if((r12|0)>7){r1=r12;r5=r14}else{break}}r15=r7-8-r3|0;r16=r14}else{r15=r7;r16=r8}HEAP32[r6>>2]=r16;HEAP32[r4>>2]=r15;return}function _jpeg_gen_optimal_table(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29;r4=STACKTOP;STACKTOP=STACKTOP+2092|0;r5=r4;r6=r4+36;r7=r4+1064;r8=r5|0;_memset(r8,0,33);_memset(r6,0,1028);_memset(r7,-1,1028);HEAP32[r3+1024>>2]=1;r9=1e9;r10=0;r11=-1;L6119:while(1){if((r10|0)<257){r12=HEAP32[r3+(r10<<2)>>2];r13=(r12|0)==0|(r12|0)>(r9|0);r14=r13?r11:r10;r9=r13?r9:r12;r10=r10+1|0;r11=r14;continue}else{r15=-1;r16=0;r17=1e9}while(1){r14=HEAP32[r3+(r16<<2)>>2];r12=(r14|0)==0|(r14|0)>(r17|0)|(r16|0)==(r11|0);r18=r12?r15:r16;r13=r16+1|0;if((r13|0)==257){break}else{r15=r18;r16=r13;r17=r12?r17:r14}}if((r18|0)<0){break}r14=(r18<<2)+r3|0;r12=(r11<<2)+r3|0;HEAP32[r12>>2]=HEAP32[r12>>2]+HEAP32[r14>>2]|0;HEAP32[r14>>2]=0;r14=(r11<<2)+r6|0;HEAP32[r14>>2]=HEAP32[r14>>2]+1|0;r14=(r11<<2)+r7|0;r12=HEAP32[r14>>2];L6127:do{if((r12|0)>-1){r13=r12;while(1){r19=(r13<<2)+r6|0;HEAP32[r19>>2]=HEAP32[r19>>2]+1|0;r19=(r13<<2)+r7|0;r20=HEAP32[r19>>2];if((r20|0)>-1){r13=r20}else{r21=r19;break L6127}}}else{r21=r14}}while(0);HEAP32[r21>>2]=r18;r14=(r18<<2)+r6|0;HEAP32[r14>>2]=HEAP32[r14>>2]+1|0;r14=HEAP32[r7+(r18<<2)>>2];if((r14|0)>-1){r22=r14}else{r9=1e9;r10=0;r11=-1;continue}while(1){r14=(r22<<2)+r6|0;HEAP32[r14>>2]=HEAP32[r14>>2]+1|0;r14=HEAP32[r7+(r22<<2)>>2];if((r14|0)>-1){r22=r14}else{r9=1e9;r10=0;r11=-1;continue L6119}}}r11=r1|0;r10=r1;r1=0;while(1){r9=HEAP32[r6+(r1<<2)>>2];if((r9|0)!=0){if((r9|0)>32){HEAP32[HEAP32[r11>>2]+20>>2]=40;FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]>>2]](r10)}r22=r5+r9|0;HEAP8[r22]=HEAP8[r22]+1&255}r22=r1+1|0;if((r22|0)==257){r23=32;break}else{r1=r22}}while(1){r1=r5+r23|0;r10=HEAP8[r1];L6144:do{if(r10<<24>>24==0){r24=r23-1|0}else{r11=r23-2|0;r22=r23-1|0;r9=r5+r22|0;r7=r10;while(1){r18=r11;while(1){r25=r5+r18|0;if(HEAP8[r25]<<24>>24==0){r18=r18-1|0}else{break}}HEAP8[r1]=r7-2&255;HEAP8[r9]=HEAP8[r9]+1&255;r21=r18+(r5+1)|0;HEAP8[r21]=HEAP8[r21]+2&255;HEAP8[r25]=HEAP8[r25]-1&255;r21=HEAP8[r1];if(r21<<24>>24==0){r24=r22;break L6144}else{r7=r21}}}}while(0);if((r24|0)>16){r23=r24}else{r26=16;break}}while(1){r27=r5+r26|0;r28=HEAP8[r27];if(r28<<24>>24==0){r26=r26-1|0}else{break}}HEAP8[r27]=r28-1&255;_memcpy(r2|0,r8,17);r8=0;r28=1;while(1){r27=r8;r26=0;while(1){if((HEAP32[r6+(r26<<2)>>2]|0)==(r28|0)){HEAP8[r2+(r27+17)|0]=r26&255;r29=r27+1|0}else{r29=r27}r5=r26+1|0;if((r5|0)==256){break}else{r27=r29;r26=r5}}r26=r28+1|0;if((r26|0)==33){break}else{r8=r29;r28=r26}}HEAP32[r2+276>>2]=0;STACKTOP=r4;return}function _jinit_compress_master(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14;r2=r1>>2;_jinit_c_master_control(r1,0);r3=r1+204|0;if((HEAP32[r3>>2]|0)==0){_jinit_color_converter(r1);_jinit_downsampler(r1);_jinit_c_prep_controller(r1,0)}r4=(r1+4|0)>>2;r5=r1;r6=FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r5,1,156);HEAP32[r2+104]=r6;HEAP32[r6>>2]=84;r7=(r6+84|0)>>2;r8=(r6+140|0)>>2;HEAP32[r7]=0;HEAP32[r7+1]=0;HEAP32[r7+2]=0;HEAP32[r7+3]=0;HEAP32[r8]=0;HEAP32[r8+1]=0;HEAP32[r8+2]=0;HEAP32[r8+3]=0;r8=HEAP32[HEAP32[r4]>>2];do{if((HEAP32[r2+52]|0)==0){r7=FUNCTION_TABLE[r8](r5,1,140);HEAP32[r2+105]=r7;HEAP32[r7>>2]=46;_memset(r7+44|0,0,64);if((HEAP32[r2+66]|0)==0){break}HEAP32[r7+136>>2]=0}else{r7=FUNCTION_TABLE[r8](r5,1,208);HEAP32[r2+105]=r7;HEAP32[r7>>2]=416;HEAP32[r7+8>>2]=862;_memset(r7+76|0,0,128);HEAP8[r7+204|0]=113}}while(0);if((HEAP32[r2+49]|0)>1){r9=1}else{r9=(HEAP32[r2+53]|0)!=0}_jinit_c_coef_controller(r1,r9&1);r9=FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r5,1,64);HEAP32[r2+98]=r9;HEAP32[r9>>2]=234;L6177:do{if((HEAP32[r3>>2]|0)==0){r8=r1+72|0;if((HEAP32[r8>>2]|0)<=0){break}r7=r9+24|0;r6=0;r10=HEAP32[r2+20],r11=r10>>2;while(1){r12=HEAP32[HEAP32[r4]+8>>2];r13=Math.imul(HEAP32[r11+9],HEAP32[r11+7]);r14=Math.imul(HEAP32[r11+10],HEAP32[r11+3]);HEAP32[r7+(r6<<2)>>2]=FUNCTION_TABLE[r12](r5,1,r13,r14);r14=r6+1|0;if((r14|0)<(HEAP32[r8>>2]|0)){r6=r14;r10=r10+88|0,r11=r10>>2}else{break L6177}}}}while(0);r2=FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r5,1,32),r9=r2>>2;r3=r1+404|0;HEAP32[r3>>2]=r2;HEAP32[r9]=510;HEAP32[r9+1]=932;HEAP32[r9+2]=648;HEAP32[r9+3]=1276;HEAP32[r9+4]=660;HEAP32[r9+5]=926;HEAP32[r9+6]=356;HEAP32[r9+7]=0;FUNCTION_TABLE[HEAP32[HEAP32[r4]+24>>2]](r5);FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]>>2]](r1);return}function _start_pass_main(r1,r2){var r3;r3=HEAP32[r1+392>>2]>>2;if((HEAP32[r1+204>>2]|0)!=0){return}HEAP32[r3+2]=0;HEAP32[r3+3]=0;HEAP32[r3+4]=0;HEAP32[r3+5]=r2;if((r2|0)==0){HEAP32[r3+1]=1332;return}else{r3=r1|0;HEAP32[HEAP32[r3>>2]+20>>2]=3;FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]>>2]](r1);return}}function _process_data_simple_main(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21;r5=0;r6=HEAP32[r1+392>>2];r7=r6+8|0;r8=r7;r9=r1+284|0;if(HEAP32[r8>>2]>>>0>=HEAP32[r9>>2]>>>0){return}r10=r6+12|0;r11=r10;r12=r1+280|0;r13=r1+396|0;r14=r6+24|0;r15=r1+400|0;r16=r6+16|0;r6=r16;r17=r16|0;r16=r7|0;r7=HEAP32[r11>>2];while(1){r18=HEAP32[r12>>2];if(r7>>>0<r18>>>0){FUNCTION_TABLE[HEAP32[HEAP32[r13>>2]+4>>2]](r1,r2,r3,r4,r14,r11,r18);r19=HEAP32[r11>>2];r20=HEAP32[r12>>2]}else{r19=r7;r20=r18}if((r19|0)!=(r20|0)){r5=5251;break}r18=(FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]+4>>2]](r1,r14)|0)==0;r21=(HEAP32[r6>>2]|0)!=0;if(r18){r5=5241;break}if(r21){HEAP32[r3>>2]=HEAP32[r3>>2]+1|0;HEAP32[r17>>2]=0}HEAP32[r10>>2]=0;r18=HEAP32[r8>>2]+1|0;HEAP32[r16>>2]=r18;if(r18>>>0<HEAP32[r9>>2]>>>0){r7=0}else{r5=5250;break}}if(r5==5251){return}else if(r5==5241){if(r21){return}HEAP32[r3>>2]=HEAP32[r3>>2]-1|0;HEAP32[r17>>2]=1;return}else if(r5==5250){return}}function _write_file_header(r1){var r2,r3,r4,r5,r6;r2=HEAP32[r1+404>>2];r3=(r1+24|0)>>2;r4=HEAP32[r3];r5=r4|0;r6=HEAP32[r5>>2];HEAP32[r5>>2]=r6+1|0;HEAP8[r6]=-1;r6=r4+4|0;r5=HEAP32[r6>>2]-1|0;HEAP32[r6>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}}while(0);r4=HEAP32[r3];r5=r4|0;r6=HEAP32[r5>>2];HEAP32[r5>>2]=r6+1|0;HEAP8[r6]=-40;r6=r4+4|0;r5=HEAP32[r6>>2]-1|0;HEAP32[r6>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}}while(0);HEAP32[r2+28>>2]=0;do{if((HEAP32[r1+240>>2]|0)!=0){r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=-1;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=-32;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=0;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=16;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=74;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=70;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=73;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=70;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=0;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP8[r1+244|0];r4=HEAP32[r3];r5=r4|0;r6=HEAP32[r5>>2];HEAP32[r5>>2]=r6+1|0;HEAP8[r6]=r2;r2=r4+4|0;r6=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r4=HEAP8[r1+245|0];r6=HEAP32[r3];r2=r6|0;r5=HEAP32[r2>>2];HEAP32[r2>>2]=r5+1|0;HEAP8[r5]=r4;r4=r6+4|0;r5=HEAP32[r4>>2]-1|0;HEAP32[r4>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1)}}while(0);r6=HEAP8[r1+246|0];r5=HEAP32[r3];r4=r5|0;r2=HEAP32[r4>>2];HEAP32[r4>>2]=r2+1|0;HEAP8[r2]=r6;r6=r5+4|0;r2=HEAP32[r6>>2]-1|0;HEAP32[r6>>2]=r2;do{if((r2|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}}while(0);r5=HEAP16[r1+248>>1];r2=HEAP32[r3];r6=r2|0;r4=HEAP32[r6>>2];HEAP32[r6>>2]=r4+1|0;HEAP8[r4]=(r5&65535)>>>8&255;r4=r2+4|0;r6=HEAP32[r4>>2]-1|0;HEAP32[r4>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r6=r2|0;r4=HEAP32[r6>>2];HEAP32[r6>>2]=r4+1|0;HEAP8[r4]=r5&255;r4=r2+4|0;r6=HEAP32[r4>>2]-1|0;HEAP32[r4>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1)}}while(0);r2=HEAP16[r1+250>>1];r6=HEAP32[r3];r5=r6|0;r4=HEAP32[r5>>2];HEAP32[r5>>2]=r4+1|0;HEAP8[r4]=(r2&65535)>>>8&255;r4=r6+4|0;r5=HEAP32[r4>>2]-1|0;HEAP32[r4>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r4=HEAP32[r5>>2];HEAP32[r5>>2]=r4+1|0;HEAP8[r4]=r2&255;r4=r6+4|0;r5=HEAP32[r4>>2]-1|0;HEAP32[r4>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=0;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=0;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;if((r5|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}}while(0);if((HEAP32[r1+252>>2]|0)==0){return}r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=-1;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=-18;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=0;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=14;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=65;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=100;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=111;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=98;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=101;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=0;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=100;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=0;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=0;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=0;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=0;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r6=HEAP32[r1+76>>2];if((r6|0)==3){r5=HEAP32[r3];r2=r5|0;r4=HEAP32[r2>>2];HEAP32[r2>>2]=r4+1|0;HEAP8[r4]=1;r4=r5+4|0;r2=HEAP32[r4>>2]-1|0;HEAP32[r4>>2]=r2;if((r2|0)!=0){return}if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){return}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1);return}else if((r6|0)==5){r6=HEAP32[r3];r5=r6|0;r2=HEAP32[r5>>2];HEAP32[r5>>2]=r2+1|0;HEAP8[r2]=2;r2=r6+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;if((r5|0)!=0){return}if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){return}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1);return}else{r6=HEAP32[r3];r3=r6|0;r5=HEAP32[r3>>2];HEAP32[r3>>2]=r5+1|0;HEAP8[r5]=0;r5=r6+4|0;r3=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r3;if((r3|0)!=0){return}if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){return}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1);return}}function _write_frame_header(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15;r2=0;r3=(r1+80|0)>>2;r4=(r1+72|0)>>2;r5=HEAP32[r4];L6385:do{if((r5|0)>0){r6=0;r7=0;r8=HEAP32[r3];while(1){r9=_emit_dqt(r1,HEAP32[r8+16>>2])+r7|0;r10=r6+1|0;r11=HEAP32[r4];if((r10|0)<(r11|0)){r6=r10;r7=r9;r8=r8+88|0}else{r12=r9;r13=r11;break L6385}}}else{r12=0;r13=r5}}while(0);r5=r1+208|0;r8=(r1+264|0)>>2;r7=(HEAP32[r8]|0)==0;L6390:do{if((HEAP32[r5>>2]|0)==0){L6392:do{if(r7){do{if((HEAP32[r1+68>>2]|0)==8){if((HEAP32[r1+376>>2]|0)!=8){break}L6397:do{if((r13|0)>0){r6=0;r11=1;r9=HEAP32[r3];while(1){do{if((HEAP32[r9+20>>2]|0)>1){r2=5392}else{if((HEAP32[r9+24>>2]|0)>1){r2=5392;break}else{r14=r11;break}}}while(0);if(r2==5392){r2=0;r14=0}r10=r6+1|0;if((r10|0)<(r13|0)){r6=r10;r11=r14;r9=r9+88|0}else{r15=r14;break L6397}}}else{r15=1}}while(0);if((r12|0)==0|(r15|0)==0){if((r15|0)==0){break}_emit_sof(r1,192);break L6390}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=77;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]+4>>2]](r1,0);r9=(HEAP32[r8]|0)!=0;if((HEAP32[r5>>2]|0)==0){if(r9){break L6392}else{break}}else{if(r9){r2=5397;break L6390}else{r2=5398;break L6390}}}}while(0);_emit_sof(r1,193);break L6390}}while(0);_emit_sof(r1,194);break}else{if(r7){r2=5398;break}else{r2=5397;break}}}while(0);if(r2==5398){_emit_sof(r1,201)}else if(r2==5397){_emit_sof(r1,202)}r7=HEAP32[r1+256>>2];do{if((r7|0)==1){if((HEAP32[r4]|0)<3){r2=5406;break}else{r2=5407;break}}else if((r7|0)!=0){r2=5406}}while(0);do{if(r2==5406){r7=r1|0;HEAP32[HEAP32[r7>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r1);r2=5407;break}}while(0);do{if(r2==5407){r7=(r1+24|0)>>2;r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=-1;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=-8;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=24;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=13;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=-1;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=3;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=HEAP32[HEAP32[r3]+88>>2]&255;r15=r4|0;r12=HEAP32[r15>>2];HEAP32[r15>>2]=r12+1|0;HEAP8[r12]=r5;r5=r4+4|0;r12=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r12;do{if((r12|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r12=HEAP32[HEAP32[r3]>>2]&255;r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=r12;r12=r4+4|0;r15=HEAP32[r12>>2]-1|0;HEAP32[r12>>2]=r15;do{if((r15|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r12=r1|0;HEAP32[HEAP32[r12>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r12>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r15=HEAP32[HEAP32[r3]+176>>2]&255;r12=r4|0;r5=HEAP32[r12>>2];HEAP32[r12>>2]=r5+1|0;HEAP8[r5]=r15;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=-128;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=1;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=1;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r4=HEAP32[r7];r5=r4|0;r15=HEAP32[r5>>2];HEAP32[r5>>2]=r15+1|0;HEAP8[r15]=0;r15=r4+4|0;r5=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r5;if((r5|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1)}}while(0);if((HEAP32[r8]|0)==0){return}r8=r1+376|0;if((HEAP32[r8>>2]|0)==8){return}r3=(r1+24|0)>>2;r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=-1;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=-38;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=0;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=6;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=0;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=0;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r8>>2];r8=Math.imul(r2,r2)+255|0;r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=r8&255;r8=r2+4|0;r5=HEAP32[r8>>2]-1|0;HEAP32[r8>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r8=r1|0;HEAP32[HEAP32[r8>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r3=r2|0;r5=HEAP32[r3>>2];HEAP32[r3>>2]=r5+1|0;HEAP8[r5]=0;r5=r2+4|0;r3=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r3;if((r3|0)!=0){return}if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){return}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1);return}function _write_scan_header(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20;r2=r1>>2;r3=STACKTOP;STACKTOP=STACKTOP+32|0;r4=r3;r5=r3+16;r6=HEAP32[r2+101];L6572:do{if((HEAP32[r2+52]|0)==0){r7=r1+288|0;if((HEAP32[r7>>2]|0)<=0){break}r8=r1+360|0;r9=r1+368|0;r10=r1+364|0;r11=0;while(1){r12=HEAP32[((r11<<2)+292>>2)+r2];do{if((HEAP32[r8>>2]|0)==0){if((HEAP32[r9>>2]|0)!=0){break}_emit_dht(r1,HEAP32[r12+20>>2],0)}}while(0);if((HEAP32[r10>>2]|0)!=0){_emit_dht(r1,HEAP32[r12+24>>2],1)}r13=r11+1|0;if((r13|0)<(HEAP32[r7>>2]|0)){r11=r13}else{break L6572}}}else{_memset(r5|0,0,16);_memset(r4|0,0,16);r11=HEAP32[r2+72];L6585:do{if((r11|0)>0){r7=(HEAP32[r2+90]|0)==0;r10=r1+368|0;r9=(HEAP32[r2+91]|0)==0;r8=0;while(1){r13=HEAP32[((r8<<2)+292>>2)+r2];do{if(r7){if((HEAP32[r10>>2]|0)!=0){break}HEAP8[r4+HEAP32[r13+20>>2]|0]=1}}while(0);if(!r9){HEAP8[r5+HEAP32[r13+24>>2]|0]=1}r14=r8+1|0;if((r14|0)==(r11|0)){r15=0;r16=0;break L6585}else{r8=r14}}}else{r15=0;r16=0}}while(0);while(1){r17=(HEAP8[r4+r15|0]<<24>>24)+(HEAP8[r5+r15|0]<<24>>24)+r16|0;r11=r15+1|0;if((r11|0)==16){break}else{r15=r11;r16=r17}}if((r17|0)==0){break}r11=(r1+24|0)>>2;r8=HEAP32[r11];r9=r8|0;r10=HEAP32[r9>>2];HEAP32[r9>>2]=r10+1|0;HEAP8[r10]=-1;r10=r8+4|0;r9=HEAP32[r10>>2]-1|0;HEAP32[r10>>2]=r9;do{if((r9|0)==0){if((FUNCTION_TABLE[HEAP32[r8+12>>2]](r1)|0)!=0){break}r10=r1|0;HEAP32[HEAP32[r10>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r10>>2]>>2]](r1)}}while(0);r8=HEAP32[r11];r9=r8|0;r10=HEAP32[r9>>2];HEAP32[r9>>2]=r10+1|0;HEAP8[r10]=-52;r10=r8+4|0;r9=HEAP32[r10>>2]-1|0;HEAP32[r10>>2]=r9;do{if((r9|0)==0){if((FUNCTION_TABLE[HEAP32[r8+12>>2]](r1)|0)!=0){break}r10=r1|0;HEAP32[HEAP32[r10>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r10>>2]>>2]](r1)}}while(0);r8=(r17<<1)+2|0;r9=HEAP32[r11];r10=r9|0;r7=HEAP32[r10>>2];HEAP32[r10>>2]=r7+1|0;HEAP8[r7]=r8>>>8&255;r7=r9+4|0;r10=HEAP32[r7>>2]-1|0;HEAP32[r7>>2]=r10;do{if((r10|0)==0){if((FUNCTION_TABLE[HEAP32[r9+12>>2]](r1)|0)!=0){break}r7=r1|0;HEAP32[HEAP32[r7>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r1)}}while(0);r9=HEAP32[r11];r10=r9|0;r7=HEAP32[r10>>2];HEAP32[r10>>2]=r7+1|0;HEAP8[r7]=r8&255;r7=r9+4|0;r10=HEAP32[r7>>2]-1|0;HEAP32[r7>>2]=r10;do{if((r10|0)==0){if((FUNCTION_TABLE[HEAP32[r9+12>>2]](r1)|0)!=0){break}r7=r1|0;HEAP32[HEAP32[r7>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r1)}}while(0);r9=(r1|0)>>2;r10=r1;r8=0;while(1){do{if(HEAP8[r4+r8|0]<<24>>24!=0){r7=HEAP32[r11];r12=r7|0;r14=HEAP32[r12>>2];HEAP32[r12>>2]=r14+1|0;HEAP8[r14]=r8&255;r14=r7+4|0;r12=HEAP32[r14>>2]-1|0;HEAP32[r14>>2]=r12;do{if((r12|0)==0){if((FUNCTION_TABLE[HEAP32[r7+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r9]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r9]>>2]](r10)}}while(0);r7=(HEAP8[r1+(r8+164)|0]<<4)+HEAP8[r1+(r8+148)|0]&255;r12=HEAP32[r11];r13=r12|0;r14=HEAP32[r13>>2];HEAP32[r13>>2]=r14+1|0;HEAP8[r14]=r7;r7=r12+4|0;r14=HEAP32[r7>>2]-1|0;HEAP32[r7>>2]=r14;if((r14|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r12+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r9]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r9]>>2]](r10)}}while(0);do{if(HEAP8[r5+r8|0]<<24>>24!=0){r12=HEAP32[r11];r14=r12|0;r7=HEAP32[r14>>2];HEAP32[r14>>2]=r7+1|0;HEAP8[r7]=r8+16&255;r7=r12+4|0;r14=HEAP32[r7>>2]-1|0;HEAP32[r7>>2]=r14;do{if((r14|0)==0){if((FUNCTION_TABLE[HEAP32[r12+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r9]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r9]>>2]](r10)}}while(0);r12=HEAP8[r1+(r8+180)|0];r14=HEAP32[r11];r7=r14|0;r13=HEAP32[r7>>2];HEAP32[r7>>2]=r13+1|0;HEAP8[r13]=r12;r12=r14+4|0;r13=HEAP32[r12>>2]-1|0;HEAP32[r12>>2]=r13;if((r13|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r14+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r9]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r9]>>2]](r10)}}while(0);r14=r8+1|0;if((r14|0)==16){break L6572}else{r8=r14}}}}while(0);r5=(r1+232|0)>>2;r4=r6+28|0;r6=(r1+24|0)>>2;if((HEAP32[r5]|0)!=(HEAP32[r4>>2]|0)){r17=HEAP32[r6];r16=r17|0;r15=HEAP32[r16>>2];HEAP32[r16>>2]=r15+1|0;HEAP8[r15]=-1;r15=r17+4|0;r16=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r16;do{if((r16|0)==0){if((FUNCTION_TABLE[HEAP32[r17+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r17=HEAP32[r6];r16=r17|0;r15=HEAP32[r16>>2];HEAP32[r16>>2]=r15+1|0;HEAP8[r15]=-35;r15=r17+4|0;r16=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r16;do{if((r16|0)==0){if((FUNCTION_TABLE[HEAP32[r17+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r17=HEAP32[r6];r16=r17|0;r15=HEAP32[r16>>2];HEAP32[r16>>2]=r15+1|0;HEAP8[r15]=0;r15=r17+4|0;r16=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r16;do{if((r16|0)==0){if((FUNCTION_TABLE[HEAP32[r17+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r17=HEAP32[r6];r16=r17|0;r15=HEAP32[r16>>2];HEAP32[r16>>2]=r15+1|0;HEAP8[r15]=4;r15=r17+4|0;r16=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r16;do{if((r16|0)==0){if((FUNCTION_TABLE[HEAP32[r17+12>>2]](r1)|0)!=0){break}r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r1)}}while(0);r17=HEAP32[r5];r16=HEAP32[r6];r15=r16|0;r8=HEAP32[r15>>2];HEAP32[r15>>2]=r8+1|0;HEAP8[r8]=r17>>>8&255;r8=r16+4|0;r15=HEAP32[r8>>2]-1|0;HEAP32[r8>>2]=r15;do{if((r15|0)==0){if((FUNCTION_TABLE[HEAP32[r16+12>>2]](r1)|0)!=0){break}r8=r1|0;HEAP32[HEAP32[r8>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]>>2]](r1)}}while(0);r16=HEAP32[r6];r15=r16|0;r8=HEAP32[r15>>2];HEAP32[r15>>2]=r8+1|0;HEAP8[r8]=r17&255;r17=r16+4|0;r8=HEAP32[r17>>2]-1|0;HEAP32[r17>>2]=r8;do{if((r8|0)==0){if((FUNCTION_TABLE[HEAP32[r16+12>>2]](r1)|0)!=0){break}r17=r1|0;HEAP32[HEAP32[r17>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r17>>2]>>2]](r1)}}while(0);HEAP32[r4>>2]=HEAP32[r5]}r5=HEAP32[r6];r4=r5|0;r16=HEAP32[r4>>2];HEAP32[r4>>2]=r16+1|0;HEAP8[r16]=-1;r16=r5+4|0;r4=HEAP32[r16>>2]-1|0;HEAP32[r16>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r16=r1|0;HEAP32[HEAP32[r16>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r16>>2]>>2]](r1)}}while(0);r5=HEAP32[r6];r4=r5|0;r16=HEAP32[r4>>2];HEAP32[r4>>2]=r16+1|0;HEAP8[r16]=-38;r16=r5+4|0;r4=HEAP32[r16>>2]-1|0;HEAP32[r16>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r16=r1|0;HEAP32[HEAP32[r16>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r16>>2]>>2]](r1)}}while(0);r5=(r1+288|0)>>2;r4=(HEAP32[r5]<<1)+6|0;r16=HEAP32[r6];r8=r16|0;r17=HEAP32[r8>>2];HEAP32[r8>>2]=r17+1|0;HEAP8[r17]=r4>>>8&255;r17=r16+4|0;r8=HEAP32[r17>>2]-1|0;HEAP32[r17>>2]=r8;do{if((r8|0)==0){if((FUNCTION_TABLE[HEAP32[r16+12>>2]](r1)|0)!=0){break}r17=r1|0;HEAP32[HEAP32[r17>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r17>>2]>>2]](r1)}}while(0);r16=HEAP32[r6];r8=r16|0;r17=HEAP32[r8>>2];HEAP32[r8>>2]=r17+1|0;HEAP8[r17]=r4&255;r4=r16+4|0;r17=HEAP32[r4>>2]-1|0;HEAP32[r4>>2]=r17;do{if((r17|0)==0){if((FUNCTION_TABLE[HEAP32[r16+12>>2]](r1)|0)!=0){break}r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1)}}while(0);r16=HEAP32[r6];r17=HEAP32[r5]&255;r4=r16|0;r8=HEAP32[r4>>2];HEAP32[r4>>2]=r8+1|0;HEAP8[r8]=r17;r17=r16+4|0;r8=HEAP32[r17>>2]-1|0;HEAP32[r17>>2]=r8;do{if((r8|0)==0){if((FUNCTION_TABLE[HEAP32[r16+12>>2]](r1)|0)!=0){break}r17=r1|0;HEAP32[HEAP32[r17>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r17>>2]>>2]](r1)}}while(0);L6684:do{if((HEAP32[r5]|0)>0){r16=(r1|0)>>2;r8=r1;r17=r1+360|0;r4=r1+368|0;r15=r1+364|0;r10=0;while(1){r9=HEAP32[((r10<<2)+292>>2)+r2]>>2;r11=HEAP32[r6];r14=HEAP32[r9]&255;r13=r11|0;r12=HEAP32[r13>>2];HEAP32[r13>>2]=r12+1|0;HEAP8[r12]=r14;r14=r11+4|0;r12=HEAP32[r14>>2]-1|0;HEAP32[r14>>2]=r12;do{if((r12|0)==0){if((FUNCTION_TABLE[HEAP32[r11+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r16]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r16]>>2]](r8)}}while(0);do{if((HEAP32[r17>>2]|0)==0){if((HEAP32[r4>>2]|0)!=0){r18=0;break}r18=HEAP32[r9+5]<<4}else{r18=0}}while(0);if((HEAP32[r15>>2]|0)==0){r19=0}else{r19=HEAP32[r9+6]}r11=HEAP32[r6];r12=r11|0;r14=HEAP32[r12>>2];HEAP32[r12>>2]=r14+1|0;HEAP8[r14]=r19+r18&255;r14=r11+4|0;r12=HEAP32[r14>>2]-1|0;HEAP32[r14>>2]=r12;do{if((r12|0)==0){if((FUNCTION_TABLE[HEAP32[r11+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r16]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r16]>>2]](r8)}}while(0);r11=r10+1|0;if((r11|0)<(HEAP32[r5]|0)){r10=r11}else{r20=r17;break L6684}}}else{r20=r1+360|0}}while(0);r5=HEAP32[r6];r18=HEAP32[r20>>2]&255;r20=r5|0;r19=HEAP32[r20>>2];HEAP32[r20>>2]=r19+1|0;HEAP8[r19]=r18;r18=r5+4|0;r19=HEAP32[r18>>2]-1|0;HEAP32[r18>>2]=r19;do{if((r19|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r18=r1|0;HEAP32[HEAP32[r18>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r18>>2]>>2]](r1)}}while(0);r5=HEAP32[r6];r19=HEAP32[r2+91]&255;r18=r5|0;r20=HEAP32[r18>>2];HEAP32[r18>>2]=r20+1|0;HEAP8[r20]=r19;r19=r5+4|0;r20=HEAP32[r19>>2]-1|0;HEAP32[r19>>2]=r20;do{if((r20|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r19=r1|0;HEAP32[HEAP32[r19>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r19>>2]>>2]](r1)}}while(0);r5=HEAP32[r6];r6=(HEAP32[r2+92]<<4)+HEAP32[r2+93]&255;r2=r5|0;r20=HEAP32[r2>>2];HEAP32[r2>>2]=r20+1|0;HEAP8[r20]=r6;r6=r5+4|0;r20=HEAP32[r6>>2]-1|0;HEAP32[r6>>2]=r20;if((r20|0)!=0){STACKTOP=r3;return}if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){STACKTOP=r3;return}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1);STACKTOP=r3;return}function _write_file_trailer(r1){var r2,r3,r4,r5;r2=r1+24|0;r3=HEAP32[r2>>2];r4=r3|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=-1;r5=r3+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r3+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r3=HEAP32[r2>>2];r2=r3|0;r4=HEAP32[r2>>2];HEAP32[r2>>2]=r4+1|0;HEAP8[r4]=-39;r4=r3+4|0;r2=HEAP32[r4>>2]-1|0;HEAP32[r4>>2]=r2;if((r2|0)!=0){return}if((FUNCTION_TABLE[HEAP32[r3+12>>2]](r1)|0)!=0){return}r3=r1|0;HEAP32[HEAP32[r3>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]>>2]](r1);return}function _write_tables_only(r1){var r2,r3,r4,r5,r6;r2=r1>>2;r3=(r1+24|0)>>2;r4=HEAP32[r3];r5=r4|0;r6=HEAP32[r5>>2];HEAP32[r5>>2]=r6+1|0;HEAP8[r6]=-1;r6=r4+4|0;r5=HEAP32[r6>>2]-1|0;HEAP32[r6>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}}while(0);r4=HEAP32[r3];r5=r4|0;r6=HEAP32[r5>>2];HEAP32[r5>>2]=r6+1|0;HEAP8[r6]=-40;r6=r4+4|0;r5=HEAP32[r6>>2]-1|0;HEAP32[r6>>2]=r5;do{if((r5|0)==0){if((FUNCTION_TABLE[HEAP32[r4+12>>2]](r1)|0)!=0){break}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}}while(0);if((HEAP32[r2+21]|0)!=0){_emit_dqt(r1,0)}if((HEAP32[r2+22]|0)!=0){_emit_dqt(r1,1)}if((HEAP32[r2+23]|0)!=0){_emit_dqt(r1,2)}if((HEAP32[r2+24]|0)!=0){_emit_dqt(r1,3)}do{if((HEAP32[r2+52]|0)==0){if((HEAP32[r2+29]|0)!=0){_emit_dht(r1,0,0)}if((HEAP32[r2+33]|0)!=0){_emit_dht(r1,0,1)}if((HEAP32[r2+30]|0)!=0){_emit_dht(r1,1,0)}if((HEAP32[r2+34]|0)!=0){_emit_dht(r1,1,1)}if((HEAP32[r2+31]|0)!=0){_emit_dht(r1,2,0)}if((HEAP32[r2+35]|0)!=0){_emit_dht(r1,2,1)}if((HEAP32[r2+32]|0)!=0){_emit_dht(r1,3,0)}if((HEAP32[r2+36]|0)==0){break}_emit_dht(r1,3,1)}}while(0);r2=HEAP32[r3];r4=r2|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=-1;r5=r2+4|0;r4=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r4;do{if((r4|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r2=HEAP32[r3];r3=r2|0;r4=HEAP32[r3>>2];HEAP32[r3>>2]=r4+1|0;HEAP8[r4]=-39;r4=r2+4|0;r3=HEAP32[r4>>2]-1|0;HEAP32[r4>>2]=r3;if((r3|0)!=0){return}if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){return}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1);return}function _write_marker_header(r1,r2,r3){var r4,r5,r6,r7;if(r3>>>0>65533){r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=12;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1)}r4=(r1+24|0)>>2;r5=HEAP32[r4];r6=r5|0;r7=HEAP32[r6>>2];HEAP32[r6>>2]=r7+1|0;HEAP8[r7]=-1;r7=r5+4|0;r6=HEAP32[r7>>2]-1|0;HEAP32[r7>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r7=r1|0;HEAP32[HEAP32[r7>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r1)}}while(0);r5=HEAP32[r4];r6=r5|0;r7=HEAP32[r6>>2];HEAP32[r6>>2]=r7+1|0;HEAP8[r7]=r2&255;r2=r5+4|0;r7=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r7;do{if((r7|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r5=r3+2|0;r3=HEAP32[r4];r7=r3|0;r2=HEAP32[r7>>2];HEAP32[r7>>2]=r2+1|0;HEAP8[r2]=r5>>>8&255;r2=r3+4|0;r7=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r7;do{if((r7|0)==0){if((FUNCTION_TABLE[HEAP32[r3+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r3=HEAP32[r4];r4=r3|0;r7=HEAP32[r4>>2];HEAP32[r4>>2]=r7+1|0;HEAP8[r7]=r5&255;r5=r3+4|0;r7=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r7;if((r7|0)!=0){return}if((FUNCTION_TABLE[HEAP32[r3+12>>2]](r1)|0)!=0){return}r3=r1|0;HEAP32[HEAP32[r3>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]>>2]](r1);return}function _write_marker_byte(r1,r2){var r3,r4,r5;r3=HEAP32[r1+24>>2];r4=r3|0;r5=HEAP32[r4>>2];HEAP32[r4>>2]=r5+1|0;HEAP8[r5]=r2&255;r2=r3+4|0;r5=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r5;if((r5|0)!=0){return}if((FUNCTION_TABLE[HEAP32[r3+12>>2]](r1)|0)!=0){return}r3=r1|0;HEAP32[HEAP32[r3>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]>>2]](r1);return}function _emit_dqt(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15;r3=HEAP32[r1+(r2<<2)+84>>2];if((r3|0)==0){r4=(r1|0)>>2;HEAP32[HEAP32[r4]+20>>2]=54;HEAP32[HEAP32[r4]+24>>2]=r2;FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r1)}r4=(r1+384|0)>>2;r5=HEAP32[r4];L6824:do{if((r5|0)<0){r6=0}else{r7=HEAP32[r1+380>>2];r8=0;r9=0;while(1){r10=HEAPU16[r3+(HEAP32[r7+(r8<<2)>>2]<<1)>>1]>255?1:r9;r11=r8+1|0;if((r11|0)>(r5|0)){r6=r10;break L6824}else{r8=r11;r9=r10}}}}while(0);r5=r3+128|0;if((HEAP32[r5>>2]|0)!=0){return r6}r9=(r1+24|0)>>2;r8=HEAP32[r9];r7=r8|0;r10=HEAP32[r7>>2];HEAP32[r7>>2]=r10+1|0;HEAP8[r10]=-1;r10=r8+4|0;r7=HEAP32[r10>>2]-1|0;HEAP32[r10>>2]=r7;do{if((r7|0)==0){if((FUNCTION_TABLE[HEAP32[r8+12>>2]](r1)|0)!=0){break}r10=r1|0;HEAP32[HEAP32[r10>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r10>>2]>>2]](r1)}}while(0);r8=HEAP32[r9];r7=r8|0;r10=HEAP32[r7>>2];HEAP32[r7>>2]=r10+1|0;HEAP8[r10]=-37;r10=r8+4|0;r7=HEAP32[r10>>2]-1|0;HEAP32[r10>>2]=r7;do{if((r7|0)==0){if((FUNCTION_TABLE[HEAP32[r8+12>>2]](r1)|0)!=0){break}r10=r1|0;HEAP32[HEAP32[r10>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r10>>2]>>2]](r1)}}while(0);r8=(r6|0)!=0;r7=HEAP32[r4];if(r8){r12=(r7<<1)+2|0}else{r12=r7+1|0}r7=r12+3|0;r12=HEAP32[r9];r10=r12|0;r11=HEAP32[r10>>2];HEAP32[r10>>2]=r11+1|0;HEAP8[r11]=r7>>>8&255;r11=r12+4|0;r10=HEAP32[r11>>2]-1|0;HEAP32[r11>>2]=r10;do{if((r10|0)==0){if((FUNCTION_TABLE[HEAP32[r12+12>>2]](r1)|0)!=0){break}r11=r1|0;HEAP32[HEAP32[r11>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]>>2]](r1)}}while(0);r12=HEAP32[r9];r10=r12|0;r11=HEAP32[r10>>2];HEAP32[r10>>2]=r11+1|0;HEAP8[r11]=r7&255;r7=r12+4|0;r11=HEAP32[r7>>2]-1|0;HEAP32[r7>>2]=r11;do{if((r11|0)==0){if((FUNCTION_TABLE[HEAP32[r12+12>>2]](r1)|0)!=0){break}r7=r1|0;HEAP32[HEAP32[r7>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r1)}}while(0);r12=HEAP32[r9];r11=r12|0;r7=HEAP32[r11>>2];HEAP32[r11>>2]=r7+1|0;HEAP8[r7]=(r6<<4)+r2&255;r2=r12+4|0;r7=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r7;do{if((r7|0)==0){if((FUNCTION_TABLE[HEAP32[r12+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);L6856:do{if((HEAP32[r4]|0)>=0){r12=r1+380|0;r7=(r1|0)>>2;r2=r1;r11=0;while(1){r10=HEAP16[r3+(HEAP32[HEAP32[r12>>2]+(r11<<2)>>2]<<1)>>1];do{if(r8){r13=HEAP32[r9];r14=r13|0;r15=HEAP32[r14>>2];HEAP32[r14>>2]=r15+1|0;HEAP8[r15]=(r10&65535)>>>8&255;r15=r13+4|0;r14=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r14;if((r14|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r13+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r7]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r7]>>2]](r2)}}while(0);r13=HEAP32[r9];r14=r13|0;r15=HEAP32[r14>>2];HEAP32[r14>>2]=r15+1|0;HEAP8[r15]=r10&255;r15=r13+4|0;r14=HEAP32[r15>>2]-1|0;HEAP32[r15>>2]=r14;do{if((r14|0)==0){if((FUNCTION_TABLE[HEAP32[r13+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r7]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r7]>>2]](r2)}}while(0);r13=r11+1|0;if((r13|0)>(HEAP32[r4]|0)){break L6856}else{r11=r13}}}}while(0);HEAP32[r5>>2]=1;return r6}function _emit_dht(r1,r2,r3){var r4,r5,r6,r7,r8,r9,r10,r11,r12;if((r3|0)==0){r4=(r2<<2)+r1+116|0;r5=r2}else{r4=(r2<<2)+r1+132|0;r5=r2+16|0}r2=HEAP32[r4>>2];if((r2|0)==0){r4=(r1|0)>>2;HEAP32[HEAP32[r4]+20>>2]=52;HEAP32[HEAP32[r4]+24>>2]=r5;FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r1)}r4=r2+276|0;if((HEAP32[r4>>2]|0)!=0){return}r3=(r1+24|0)>>2;r6=HEAP32[r3];r7=r6|0;r8=HEAP32[r7>>2];HEAP32[r7>>2]=r8+1|0;HEAP8[r8]=-1;r8=r6+4|0;r7=HEAP32[r8>>2]-1|0;HEAP32[r8>>2]=r7;do{if((r7|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r8=r1|0;HEAP32[HEAP32[r8>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]>>2]](r1)}}while(0);r6=HEAP32[r3];r7=r6|0;r8=HEAP32[r7>>2];HEAP32[r7>>2]=r8+1|0;HEAP8[r8]=-60;r8=r6+4|0;r7=HEAP32[r8>>2]-1|0;HEAP32[r8>>2]=r7;do{if((r7|0)==0){if((FUNCTION_TABLE[HEAP32[r6+12>>2]](r1)|0)!=0){break}r8=r1|0;HEAP32[HEAP32[r8>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]>>2]](r1)}}while(0);r6=HEAPU8[r2+16|0]+HEAPU8[r2+15|0]+HEAPU8[r2+14|0]+HEAPU8[r2+13|0]+HEAPU8[r2+12|0]+HEAPU8[r2+11|0]+HEAPU8[r2+10|0]+HEAPU8[r2+9|0]+HEAPU8[r2+8|0]+HEAPU8[r2+7|0]+HEAPU8[r2+6|0]+HEAPU8[r2+5|0]+HEAPU8[r2+4|0]+HEAPU8[r2+3|0]+HEAPU8[r2+2|0]+HEAPU8[r2+1|0]|0;r7=r6+19|0;r8=HEAP32[r3];r9=r8|0;r10=HEAP32[r9>>2];HEAP32[r9>>2]=r10+1|0;HEAP8[r10]=r7>>>8&255;r10=r8+4|0;r9=HEAP32[r10>>2]-1|0;HEAP32[r10>>2]=r9;do{if((r9|0)==0){if((FUNCTION_TABLE[HEAP32[r8+12>>2]](r1)|0)!=0){break}r10=r1|0;HEAP32[HEAP32[r10>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r10>>2]>>2]](r1)}}while(0);r8=HEAP32[r3];r9=r8|0;r10=HEAP32[r9>>2];HEAP32[r9>>2]=r10+1|0;HEAP8[r10]=r7&255;r7=r8+4|0;r10=HEAP32[r7>>2]-1|0;HEAP32[r7>>2]=r10;do{if((r10|0)==0){if((FUNCTION_TABLE[HEAP32[r8+12>>2]](r1)|0)!=0){break}r7=r1|0;HEAP32[HEAP32[r7>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r1)}}while(0);r8=HEAP32[r3];r10=r8|0;r7=HEAP32[r10>>2];HEAP32[r10>>2]=r7+1|0;HEAP8[r7]=r5&255;r5=r8+4|0;r7=HEAP32[r5>>2]-1|0;HEAP32[r5>>2]=r7;do{if((r7|0)==0){if((FUNCTION_TABLE[HEAP32[r8+12>>2]](r1)|0)!=0){break}r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1)}}while(0);r8=(r1|0)>>2;r7=r1;r5=1;while(1){r10=HEAP8[r2+r5|0];r9=HEAP32[r3];r11=r9|0;r12=HEAP32[r11>>2];HEAP32[r11>>2]=r12+1|0;HEAP8[r12]=r10;r10=r9+4|0;r12=HEAP32[r10>>2]-1|0;HEAP32[r10>>2]=r12;do{if((r12|0)==0){if((FUNCTION_TABLE[HEAP32[r9+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r8]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8]>>2]](r7)}}while(0);r9=r5+1|0;if((r9|0)==17){break}else{r5=r9}}L6909:do{if((r6|0)>0){r5=0;while(1){r9=HEAP8[r2+(r5+17)|0];r12=HEAP32[r3];r10=r12|0;r11=HEAP32[r10>>2];HEAP32[r10>>2]=r11+1|0;HEAP8[r11]=r9;r9=r12+4|0;r11=HEAP32[r9>>2]-1|0;HEAP32[r9>>2]=r11;do{if((r11|0)==0){if((FUNCTION_TABLE[HEAP32[r12+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r8]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8]>>2]](r7)}}while(0);r12=r5+1|0;if((r12|0)==(r6|0)){break L6909}else{r5=r12}}}}while(0);HEAP32[r4>>2]=1;return}function _emit_sof(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12;r3=0;r4=(r1+24|0)>>2;r5=HEAP32[r4];r6=r5|0;r7=HEAP32[r6>>2];HEAP32[r6>>2]=r7+1|0;HEAP8[r7]=-1;r7=r5+4|0;r6=HEAP32[r7>>2]-1|0;HEAP32[r7>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r7=r1|0;HEAP32[HEAP32[r7>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r1)}}while(0);r5=HEAP32[r4];r6=r5|0;r7=HEAP32[r6>>2];HEAP32[r6>>2]=r7+1|0;HEAP8[r7]=r2&255;r2=r5+4|0;r7=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r7;do{if((r7|0)==0){if((FUNCTION_TABLE[HEAP32[r5+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r5=(r1+72|0)>>2;r7=(HEAP32[r5]*3&-1)+8|0;r2=HEAP32[r4];r6=r2|0;r8=HEAP32[r6>>2];HEAP32[r6>>2]=r8+1|0;HEAP8[r8]=r7>>>8&255;r8=r2+4|0;r6=HEAP32[r8>>2]-1|0;HEAP32[r8>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r8=r1|0;HEAP32[HEAP32[r8>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]>>2]](r1)}}while(0);r2=HEAP32[r4];r6=r2|0;r8=HEAP32[r6>>2];HEAP32[r6>>2]=r8+1|0;HEAP8[r8]=r7&255;r7=r2+4|0;r8=HEAP32[r7>>2]-1|0;HEAP32[r7>>2]=r8;do{if((r8|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r7=r1|0;HEAP32[HEAP32[r7>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r1)}}while(0);r2=r1+64|0;do{if((HEAP32[r2>>2]|0)>65535){r3=5790}else{if((HEAP32[r1+60>>2]|0)>65535){r3=5790;break}else{break}}}while(0);if(r3==5790){r3=(r1|0)>>2;HEAP32[HEAP32[r3]+20>>2]=42;HEAP32[HEAP32[r3]+24>>2]=65535;FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r1)}r3=HEAP32[r4];r8=HEAP32[r1+68>>2]&255;r7=r3|0;r6=HEAP32[r7>>2];HEAP32[r7>>2]=r6+1|0;HEAP8[r6]=r8;r8=r3+4|0;r6=HEAP32[r8>>2]-1|0;HEAP32[r8>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r3+12>>2]](r1)|0)!=0){break}r8=r1|0;HEAP32[HEAP32[r8>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]>>2]](r1)}}while(0);r3=HEAP32[r2>>2];r2=HEAP32[r4];r6=r2|0;r8=HEAP32[r6>>2];HEAP32[r6>>2]=r8+1|0;HEAP8[r8]=r3>>>8&255;r8=r2+4|0;r6=HEAP32[r8>>2]-1|0;HEAP32[r8>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r8=r1|0;HEAP32[HEAP32[r8>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]>>2]](r1)}}while(0);r2=HEAP32[r4];r6=r2|0;r8=HEAP32[r6>>2];HEAP32[r6>>2]=r8+1|0;HEAP8[r8]=r3&255;r3=r2+4|0;r8=HEAP32[r3>>2]-1|0;HEAP32[r3>>2]=r8;do{if((r8|0)==0){if((FUNCTION_TABLE[HEAP32[r2+12>>2]](r1)|0)!=0){break}r3=r1|0;HEAP32[HEAP32[r3>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]>>2]](r1)}}while(0);r2=HEAP32[r1+60>>2];r8=HEAP32[r4];r3=r8|0;r6=HEAP32[r3>>2];HEAP32[r3>>2]=r6+1|0;HEAP8[r6]=r2>>>8&255;r6=r8+4|0;r3=HEAP32[r6>>2]-1|0;HEAP32[r6>>2]=r3;do{if((r3|0)==0){if((FUNCTION_TABLE[HEAP32[r8+12>>2]](r1)|0)!=0){break}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}}while(0);r8=HEAP32[r4];r3=r8|0;r6=HEAP32[r3>>2];HEAP32[r3>>2]=r6+1|0;HEAP8[r6]=r2&255;r2=r8+4|0;r6=HEAP32[r2>>2]-1|0;HEAP32[r2>>2]=r6;do{if((r6|0)==0){if((FUNCTION_TABLE[HEAP32[r8+12>>2]](r1)|0)!=0){break}r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}}while(0);r8=HEAP32[r4];r6=HEAP32[r5]&255;r2=r8|0;r3=HEAP32[r2>>2];HEAP32[r2>>2]=r3+1|0;HEAP8[r3]=r6;r6=r8+4|0;r3=HEAP32[r6>>2]-1|0;HEAP32[r6>>2]=r3;do{if((r3|0)==0){if((FUNCTION_TABLE[HEAP32[r8+12>>2]](r1)|0)!=0){break}r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}}while(0);if((HEAP32[r5]|0)<=0){return}r8=(r1|0)>>2;r3=r1;r6=0;r2=HEAP32[r1+80>>2],r7=r2>>2;while(1){r9=HEAP32[r4];r10=HEAP32[r7]&255;r11=r9|0;r12=HEAP32[r11>>2];HEAP32[r11>>2]=r12+1|0;HEAP8[r12]=r10;r10=r9+4|0;r12=HEAP32[r10>>2]-1|0;HEAP32[r10>>2]=r12;do{if((r12|0)==0){if((FUNCTION_TABLE[HEAP32[r9+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r8]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8]>>2]](r3)}}while(0);r9=HEAP32[r4];r12=(HEAP32[r7+2]<<4)+HEAP32[r7+3]&255;r10=r9|0;r11=HEAP32[r10>>2];HEAP32[r10>>2]=r11+1|0;HEAP8[r11]=r12;r12=r9+4|0;r11=HEAP32[r12>>2]-1|0;HEAP32[r12>>2]=r11;do{if((r11|0)==0){if((FUNCTION_TABLE[HEAP32[r9+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r8]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8]>>2]](r3)}}while(0);r9=HEAP32[r4];r11=HEAP32[r7+4]&255;r12=r9|0;r10=HEAP32[r12>>2];HEAP32[r12>>2]=r10+1|0;HEAP8[r10]=r11;r11=r9+4|0;r10=HEAP32[r11>>2]-1|0;HEAP32[r11>>2]=r10;do{if((r10|0)==0){if((FUNCTION_TABLE[HEAP32[r9+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r8]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r8]>>2]](r3)}}while(0);r9=r6+1|0;if((r9|0)<(HEAP32[r5]|0)){r6=r9;r2=r2+88|0,r7=r2>>2}else{break}}return}function _jpeg_calc_jpeg_dimensions(r1){var r2,r3,r4,r5,r6;r2=r1>>2;r3=0;r4=(r1+28|0)>>2;do{if(HEAP32[r4]>>>0>16777215){r3=5826}else{if(HEAP32[r2+8]>>>0>16777215){r3=5826;break}else{break}}}while(0);if(r3==5826){r3=(r1|0)>>2;HEAP32[HEAP32[r3]+20>>2]=42;HEAP32[HEAP32[r3]+24>>2]=65500;FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r1)}r1=HEAP32[r2+13];r3=HEAP32[r2+94];r5=Math.imul(r3,HEAP32[r2+14]);if(r1>>>0>=r5>>>0){HEAP32[r2+15]=Math.imul(HEAP32[r4],r3);HEAP32[r2+16]=Math.imul(r3,HEAP32[r2+8]);HEAP32[r2+69]=1;HEAP32[r2+70]=1;return}if(r1<<1>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+1|0)/2&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+1|0)/2&-1;HEAP32[r2+69]=2;HEAP32[r2+70]=2;return}if((r1*3&-1)>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+2|0)/3&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+2|0)/3&-1;HEAP32[r2+69]=3;HEAP32[r2+70]=3;return}if(r1<<2>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+3|0)/4&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+3|0)/4&-1;HEAP32[r2+69]=4;HEAP32[r2+70]=4;return}if((r1*5&-1)>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+4|0)/5&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+4|0)/5&-1;HEAP32[r2+69]=5;HEAP32[r2+70]=5;return}if((r1*6&-1)>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+5|0)/6&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+5|0)/6&-1;HEAP32[r2+69]=6;HEAP32[r2+70]=6;return}if((r1*7&-1)>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+6|0)/7&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+6|0)/7&-1;HEAP32[r2+69]=7;HEAP32[r2+70]=7;return}if(r1<<3>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+7|0)/8&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+7|0)/8&-1;HEAP32[r2+69]=8;HEAP32[r2+70]=8;return}if((r1*9&-1)>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+8|0)/9&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+8|0)/9&-1;HEAP32[r2+69]=9;HEAP32[r2+70]=9;return}if((r1*10&-1)>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+9|0)/10&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+9|0)/10&-1;HEAP32[r2+69]=10;HEAP32[r2+70]=10;return}if((r1*11&-1)>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+10|0)/11&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+10|0)/11&-1;HEAP32[r2+69]=11;HEAP32[r2+70]=11;return}if((r1*12&-1)>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+11|0)/12&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+11|0)/12&-1;HEAP32[r2+69]=12;HEAP32[r2+70]=12;return}if((r1*13&-1)>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+12|0)/13&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+12|0)/13&-1;HEAP32[r2+69]=13;HEAP32[r2+70]=13;return}if((r1*14&-1)>>>0>=r5>>>0){HEAP32[r2+15]=(Math.imul(HEAP32[r4],r3)+13|0)/14&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+13|0)/14&-1;HEAP32[r2+69]=14;HEAP32[r2+70]=14;return}r6=Math.imul(HEAP32[r4],r3);if((r1*15&-1)>>>0<r5>>>0){HEAP32[r2+15]=(r6+15|0)/16&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+15|0)/16&-1;HEAP32[r2+69]=16;HEAP32[r2+70]=16;return}else{HEAP32[r2+15]=(r6+14|0)/15&-1;HEAP32[r2+16]=(Math.imul(r3,HEAP32[r2+8])+14|0)/15&-1;HEAP32[r2+69]=15;HEAP32[r2+70]=15;return}}function _jinit_c_master_control(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55;r3=r1>>2;r4=0;r5=STACKTOP;STACKTOP=STACKTOP+2600|0;r6=r5;r7=r5+40;r8=r7;r9=r1;r10=FUNCTION_TABLE[HEAP32[HEAP32[r3+1]>>2]](r9,1,36),r11=r10>>2;HEAP32[r3+97]=r10;HEAP32[r11]=206;HEAP32[r11+1]=1338;HEAP32[r11+2]=1016;HEAP32[r11+4]=0;r12=(r2|0)==0;if(r12){_jpeg_calc_jpeg_dimensions(r1);r13=HEAP32[r3+94]}else{r2=(r1+276|0)>>2;r14=HEAP32[r2];r15=r1+280|0;if((r14|0)==(HEAP32[r15>>2]|0)){r16=r14}else{r14=(r1|0)>>2;HEAP32[HEAP32[r14]+20>>2]=7;HEAP32[HEAP32[r14]+24>>2]=HEAP32[r2];HEAP32[HEAP32[r14]+28>>2]=HEAP32[r15>>2];FUNCTION_TABLE[HEAP32[HEAP32[r14]>>2]](r9);r16=HEAP32[r2]}HEAP32[r3+94]=r16;r13=r16}r16=(r1+376|0)>>2;if((r13-1|0)>>>0>15){r2=(r1|0)>>2;HEAP32[HEAP32[r2]+20>>2]=7;HEAP32[HEAP32[r2]+24>>2]=HEAP32[r16];HEAP32[HEAP32[r2]+28>>2]=HEAP32[r16];FUNCTION_TABLE[HEAP32[HEAP32[r2]>>2]](r9);r17=HEAP32[r16]}else{r17=r13}do{if((r17|0)==4){HEAP32[r3+95]=5246124;r4=5890;break}else if((r17|0)==5){HEAP32[r3+95]=5245960;r4=5890;break}else if((r17|0)==2){HEAP32[r3+95]=5246352;r4=5890;break}else if((r17|0)==6){HEAP32[r3+95]=5245752;r4=5890;break}else if((r17|0)==7){HEAP32[r3+95]=5245492;r4=5890;break}else if((r17|0)==3){HEAP32[r3+95]=5246252;r4=5890;break}else{HEAP32[r3+95]=5246432;if((r17|0)<8){r4=5890;break}else{r18=63;break}}}while(0);if(r4==5890){r18=Math.imul(r17,r17)-1|0}r17=r1+384|0;HEAP32[r17>>2]=r18;r18=(r1+64|0)>>2;r13=HEAP32[r18];do{if((r13|0)==0){r4=5895}else{if((HEAP32[r3+15]|0)==0){r4=5895;break}if((HEAP32[r3+18]|0)<1){r4=5895;break}if((HEAP32[r3+9]|0)<1){r4=5895;break}else{r19=r13;break}}}while(0);if(r4==5895){r13=r1|0;HEAP32[HEAP32[r13>>2]+20>>2]=33;FUNCTION_TABLE[HEAP32[HEAP32[r13>>2]>>2]](r9);r19=HEAP32[r18]}do{if((r19|0)>65500){r4=5898}else{if((HEAP32[r3+15]|0)>65500){r4=5898;break}else{break}}}while(0);if(r4==5898){r19=(r1|0)>>2;HEAP32[HEAP32[r19]+20>>2]=42;HEAP32[HEAP32[r19]+24>>2]=65500;FUNCTION_TABLE[HEAP32[HEAP32[r19]>>2]](r9)}r19=r1+68|0;if((HEAP32[r19>>2]|0)!=8){r13=(r1|0)>>2;HEAP32[HEAP32[r13]+20>>2]=16;HEAP32[HEAP32[r13]+24>>2]=HEAP32[r19>>2];FUNCTION_TABLE[HEAP32[HEAP32[r13]>>2]](r9)}r13=(r1+72|0)>>2;r19=HEAP32[r13];if((r19|0)>10){r2=(r1|0)>>2;HEAP32[HEAP32[r2]+20>>2]=27;HEAP32[HEAP32[r2]+24>>2]=HEAP32[r13];HEAP32[HEAP32[r2]+28>>2]=10;FUNCTION_TABLE[HEAP32[HEAP32[r2]>>2]](r9);r20=HEAP32[r13]}else{r20=r19}r19=(r1+268|0)>>2;HEAP32[r19]=1;r2=(r1+272|0)>>2;HEAP32[r2]=1;r14=r1+80|0;do{if((r20|0)>0){r15=r1|0;r21=HEAP32[r14>>2];r22=0;r23=1;r24=1;r25=r20;while(1){r26=r21+8|0;r27=HEAP32[r26>>2];r28=r21+12|0;do{if((r27-1|0)>>>0>3){r4=5907}else{if((HEAP32[r28>>2]-1|0)>>>0>3){r4=5907;break}else{r29=r23;r30=r27;r31=r24;r32=r25;break}}}while(0);if(r4==5907){r4=0;HEAP32[HEAP32[r15>>2]+20>>2]=19;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r9);r29=HEAP32[r19];r30=HEAP32[r26>>2];r31=HEAP32[r2];r32=HEAP32[r13]}r27=(r29|0)>(r30|0)?r29:r30;HEAP32[r19]=r27;r33=HEAP32[r28>>2];r34=(r31|0)>(r33|0)?r31:r33;HEAP32[r2]=r34;r33=r22+1|0;if((r33|0)<(r32|0)){r21=r21+88|0;r22=r33;r23=r27;r24=r34;r25=r32}else{break}}if((r32|0)<=0){r35=r34;break}r25=r1+276|0;r24=r1+220|0;r23=r1+280|0;r22=r1+60|0;r21=HEAP32[r14>>2],r15=r21>>2;r27=0;while(1){HEAP32[r15+1]=r27;r33=HEAP32[r25>>2];r36=(HEAP32[r24>>2]|0)!=0?8:4;r37=r21+8|0;r38=1;while(1){r39=Math.imul(r38,r33);if((r39|0)>(r36|0)){break}r40=r38<<1;if(((HEAP32[r19]|0)%(Math.imul(HEAP32[r37>>2],r40)|0)|0)==0){r38=r40}else{break}}r38=r21+36|0;HEAP32[r38>>2]=r39;r36=HEAP32[r23>>2];r33=(HEAP32[r24>>2]|0)!=0?8:4;r28=r21+12|0;r26=1;while(1){r41=Math.imul(r26,r36);if((r41|0)>(r33|0)){break}r40=r26<<1;if(((HEAP32[r2]|0)%(Math.imul(HEAP32[r28>>2],r40)|0)|0)==0){r26=r40}else{break}}r26=r21+40|0;HEAP32[r26>>2]=r41;r33=r41<<1;do{if((r39|0)>(r33|0)){HEAP32[r38>>2]=r33;r42=r33;r43=r41}else{r36=r39<<1;if((r41|0)<=(r36|0)){r42=r39;r43=r41;break}HEAP32[r26>>2]=r36;r42=r39;r43=r36}}while(0);r26=HEAP32[r37>>2];r33=Math.imul(r26,HEAP32[r22>>2]);r38=Math.imul(HEAP32[r16],HEAP32[r19]);HEAP32[r15+7]=(r33-1+r38|0)/(r38|0)&-1;r38=HEAP32[r28>>2];r33=Math.imul(r38,HEAP32[r18]);r36=Math.imul(HEAP32[r16],HEAP32[r2]);HEAP32[r15+8]=(r33-1+r36|0)/(r36|0)&-1;r36=HEAP32[r22>>2];r33=Math.imul(Math.imul(r26,r42),r36);r36=Math.imul(HEAP32[r16],HEAP32[r19]);HEAP32[r15+11]=(r33-1+r36|0)/(r36|0)&-1;r36=HEAP32[r18];r33=Math.imul(Math.imul(r38,r43),r36);r36=Math.imul(HEAP32[r16],HEAP32[r2]);HEAP32[r15+12]=(r33-1+r36|0)/(r36|0)&-1;HEAP32[r15+13]=1;r36=r27+1|0;if((r36|0)<(HEAP32[r13]|0)){r21=r21+88|0,r15=r21>>2;r27=r36}else{break}}r35=HEAP32[r2]}else{r35=1}}while(0);r2=HEAP32[r18];r18=Math.imul(HEAP32[r16],r35);HEAP32[r3+71]=(r2-1+r18|0)/(r18|0)&-1;r18=(r1+200|0)>>2;r2=HEAP32[r18];do{if((r2|0)==0){HEAP32[r3+66]=0;HEAP32[r3+49]=1}else{r35=r6;r43=(r1+196|0)>>2;if((HEAP32[r43]|0)<1){r19=(r1|0)>>2;HEAP32[HEAP32[r19]+20>>2]=20;HEAP32[HEAP32[r19]+24>>2]=0;FUNCTION_TABLE[HEAP32[HEAP32[r19]>>2]](r9);r44=HEAP32[r18]}else{r44=r2}do{if((HEAP32[r44+20>>2]|0)==0){if((HEAP32[r44+24>>2]|0)!=63){r4=5928;break}HEAP32[r3+66]=0;r19=HEAP32[r13];if((r19|0)<=0){r45=0;r46=r19;break}_memset(r35,0,(r19|0)>1?r19<<2:4);r45=0;r46=r19;break}else{r4=5928}}while(0);do{if(r4==5928){HEAP32[r3+66]=1;r35=HEAP32[r13];if((r35|0)<=0){r45=1;r46=r35;break}_memset(r8,-1,r35<<8);r45=1;r46=r35}}while(0);if((HEAP32[r43]|0)<1){r47=r45;r48=r46}else{r35=(r1|0)>>2;r19=r1+264|0;r42=1;r39=r44,r41=r39>>2;while(1){r14=HEAP32[r41];if((r14-1|0)>>>0>3){HEAP32[HEAP32[r35]+20>>2]=27;HEAP32[HEAP32[r35]+24>>2]=r14;HEAP32[HEAP32[r35]+28>>2]=4;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9)}r34=(r14|0)>0;L7138:do{if(r34){r32=0;while(1){r31=HEAP32[((r32<<2)+4>>2)+r41];do{if((r31|0)<0){r4=5939}else{if((r31|0)<(HEAP32[r13]|0)){break}else{r4=5939;break}}}while(0);if(r4==5939){r4=0;HEAP32[HEAP32[r35]+20>>2]=20;HEAP32[HEAP32[r35]+24>>2]=r42;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9)}do{if((r32|0)>0){if((r31|0)>(HEAP32[((r32-1<<2)+4>>2)+r41]|0)){break}HEAP32[HEAP32[r35]+20>>2]=20;HEAP32[HEAP32[r35]+24>>2]=r42;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9)}}while(0);r31=r32+1|0;if((r31|0)==(r14|0)){break L7138}else{r32=r31}}}}while(0);r28=HEAP32[r41+5];r37=HEAP32[r41+6];r32=HEAP32[r41+7];r31=HEAP32[r41+8];L7151:do{if((HEAP32[r19>>2]|0)==0){if(!((r28|0)==0&(r37|0)==63&(r32|0)==0&(r31|0)==0)){HEAP32[HEAP32[r35]+20>>2]=18;HEAP32[HEAP32[r35]+24>>2]=r42;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9)}if(r34){r49=0}else{break}while(1){r30=(HEAP32[((r49<<2)+4>>2)+r41]<<2)+r6|0;if((HEAP32[r30>>2]|0)!=0){HEAP32[HEAP32[r35]+20>>2]=20;HEAP32[HEAP32[r35]+24>>2]=r42;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9)}HEAP32[r30>>2]=1;r30=r49+1|0;if((r30|0)==(r14|0)){break L7151}else{r49=r30}}}else{do{if(r28>>>0>63){r4=5947}else{if((r37|0)<(r28|0)|(r37|0)>63|r32>>>0>10|r31>>>0>10){r4=5947;break}else{break}}}while(0);if(r4==5947){r4=0;HEAP32[HEAP32[r35]+20>>2]=18;HEAP32[HEAP32[r35]+24>>2]=r42;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9)}r30=(r28|0)==0;do{if(r30){if((r37|0)==0){break}HEAP32[HEAP32[r35]+20>>2]=18;HEAP32[HEAP32[r35]+24>>2]=r42;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9)}else{if((r14|0)==1){break}HEAP32[HEAP32[r35]+20>>2]=18;HEAP32[HEAP32[r35]+24>>2]=r42;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9)}}while(0);if(!r34){break}r29=(r32|0)==0;r20=(r31|0)==(r32-1|0);r27=0;while(1){r21=HEAP32[((r27<<2)+4>>2)+r41];do{if(r30){r50=0}else{if((HEAP32[r7+(r21<<8)>>2]|0)>=0){r50=r28;break}HEAP32[HEAP32[r35]+20>>2]=18;HEAP32[HEAP32[r35]+24>>2]=r42;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9);r50=r28}}while(0);L7180:do{if((r50|0)<=(r37|0)){r15=r50;while(1){r22=(r21<<8)+(r15<<2)+r7|0;r24=HEAP32[r22>>2];do{if((r24|0)<0){if(r29){break}HEAP32[HEAP32[r35]+20>>2]=18;HEAP32[HEAP32[r35]+24>>2]=r42;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9)}else{if((r32|0)==(r24|0)&r20){break}HEAP32[HEAP32[r35]+20>>2]=18;HEAP32[HEAP32[r35]+24>>2]=r42;FUNCTION_TABLE[HEAP32[HEAP32[r35]>>2]](r9)}}while(0);HEAP32[r22>>2]=r31;r24=r15+1|0;if((r24|0)>(r37|0)){break L7180}else{r15=r24}}}}while(0);r21=r27+1|0;if((r21|0)==(r14|0)){break L7151}else{r27=r21}}}}while(0);r14=r42+1|0;if((r14|0)>(HEAP32[r43]|0)){break}else{r42=r14;r39=r39+36|0,r41=r39>>2}}r47=HEAP32[r19>>2];r48=HEAP32[r13]}r39=(r48|0)>0;L7193:do{if((r47|0)==0){if(!r39){break}r41=r1|0;r42=0;r35=r48;while(1){if((HEAP32[r6+(r42<<2)>>2]|0)==0){HEAP32[HEAP32[r41>>2]+20>>2]=46;FUNCTION_TABLE[HEAP32[HEAP32[r41>>2]>>2]](r9);r51=HEAP32[r13]}else{r51=r35}r14=r42+1|0;if((r14|0)<(r51|0)){r42=r14;r35=r51}else{break L7193}}}else{if(!r39){break}r35=r1|0;r42=0;r41=r48;while(1){if((HEAP32[r7+(r42<<8)>>2]|0)<0){HEAP32[HEAP32[r35>>2]+20>>2]=46;FUNCTION_TABLE[HEAP32[HEAP32[r35>>2]>>2]](r9);r52=HEAP32[r13]}else{r52=r41}r14=r42+1|0;if((r14|0)<(r52|0)){r42=r14;r41=r52}else{break L7193}}}}while(0);if((HEAP32[r16]|0)>=8){break}r39=HEAP32[r18];L7210:do{if((HEAP32[r43]|0)>0){r19=0;r41=0;while(1){if((r41|0)!=(r19|0)){_memcpy(r39+(r19*36&-1)|0,r39+(r41*36&-1)|0,36)}r42=HEAP32[r17>>2];if((HEAP32[r39+(r19*36&-1)+20>>2]|0)>(r42|0)){r53=r19}else{r35=r39+(r19*36&-1)+24|0;if((HEAP32[r35>>2]|0)>(r42|0)){HEAP32[r35>>2]=r42}r53=r19+1|0}r42=r41+1|0;if((r42|0)<(HEAP32[r43]|0)){r19=r53;r41=r42}else{r54=r53;break L7210}}}else{r54=0}}while(0);HEAP32[r43]=r54}}while(0);do{if((HEAP32[r3+66]|0)==0){if((HEAP32[r16]|0)<8){r4=5998;break}else{break}}else{r4=5998}}while(0);do{if(r4==5998){if((HEAP32[r3+52]|0)!=0){break}HEAP32[r3+53]=1}}while(0);do{if(r12){HEAP32[r11+5]=0;r55=r1+212|0}else{r4=r1+212|0;r16=r10+20|0;if((HEAP32[r4>>2]|0)==0){HEAP32[r16>>2]=2;r55=r4;break}else{HEAP32[r16>>2]=1;r55=r4;break}}}while(0);HEAP32[r11+8]=0;HEAP32[r11+6]=0;r10=HEAP32[r3+49];if((HEAP32[r55>>2]|0)==0){HEAP32[r11+7]=r10;STACKTOP=r5;return}else{HEAP32[r11+7]=r10<<1;STACKTOP=r5;return}}function _prepare_for_pass(r1){var r2,r3,r4,r5,r6,r7,r8,r9;r2=r1>>2;r3=0;r4=HEAP32[r2+97],r5=r4>>2;r6=r4+20|0;r7=HEAP32[r6>>2];L7243:do{if((r7|0)==0){_select_scan_parameters(r1);_per_scan_setup(r1);if((HEAP32[r2+51]|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r2+102]>>2]](r1);FUNCTION_TABLE[HEAP32[HEAP32[r2+103]>>2]](r1);FUNCTION_TABLE[HEAP32[HEAP32[r2+99]>>2]](r1,0)}FUNCTION_TABLE[HEAP32[HEAP32[r2+104]>>2]](r1);r8=r1+212|0;FUNCTION_TABLE[HEAP32[HEAP32[r2+105]>>2]](r1,HEAP32[r8>>2]);FUNCTION_TABLE[HEAP32[HEAP32[r2+100]>>2]](r1,(HEAP32[r5+7]|0)>1?3:0);FUNCTION_TABLE[HEAP32[HEAP32[r2+98]>>2]](r1,0);r9=r4+12|0;if((HEAP32[r8>>2]|0)==0){HEAP32[r9>>2]=1;break}else{HEAP32[r9>>2]=0;break}}else if((r7|0)==1){_select_scan_parameters(r1);_per_scan_setup(r1);do{if((HEAP32[r2+90]|0)==0){if((HEAP32[r2+92]|0)==0){break}HEAP32[r6>>2]=2;r9=r4+24|0;HEAP32[r9>>2]=HEAP32[r9>>2]+1|0;r3=6021;break L7243}}while(0);FUNCTION_TABLE[HEAP32[HEAP32[r2+105]>>2]](r1,1);FUNCTION_TABLE[HEAP32[HEAP32[r2+100]>>2]](r1,2);HEAP32[r5+3]=0;break}else if((r7|0)==2){r3=6021}else{r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=49;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r1);break}}while(0);if(r3==6021){if((HEAP32[r2+53]|0)==0){_select_scan_parameters(r1);_per_scan_setup(r1)}FUNCTION_TABLE[HEAP32[HEAP32[r2+105]>>2]](r1,0);FUNCTION_TABLE[HEAP32[HEAP32[r2+100]>>2]](r1,2);r2=r1+404|0;if((HEAP32[r5+8]|0)==0){FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]+4>>2]](r1)}FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]+8>>2]](r1);HEAP32[r5+3]=0}r2=HEAP32[r5+6];r3=r4+28|0;HEAP32[r5+4]=(r2|0)==(HEAP32[r3>>2]-1|0)&1;r5=r1+8|0;r1=HEAP32[r5>>2];if((r1|0)==0){return}HEAP32[r1+12>>2]=r2;HEAP32[HEAP32[r5>>2]+16>>2]=HEAP32[r3>>2];return}function _pass_startup(r1){var r2;HEAP32[HEAP32[r1+388>>2]+12>>2]=0;r2=r1+404|0;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]+4>>2]](r1);FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]+8>>2]](r1);return}function _finish_pass_master(r1){var r2,r3,r4,r5;r2=HEAP32[r1+388>>2];FUNCTION_TABLE[HEAP32[HEAP32[r1+420>>2]+8>>2]](r1);r3=(r2+20|0)>>2;r4=HEAP32[r3];do{if((r4|0)==1){HEAP32[r3]=2}else if((r4|0)==2){if((HEAP32[r1+212>>2]|0)!=0){HEAP32[r3]=1}r5=r2+32|0;HEAP32[r5>>2]=HEAP32[r5>>2]+1|0}else if((r4|0)==0){HEAP32[r3]=2;if((HEAP32[r1+212>>2]|0)!=0){break}r5=r2+32|0;HEAP32[r5>>2]=HEAP32[r5>>2]+1|0}}while(0);r1=r2+24|0;HEAP32[r1>>2]=HEAP32[r1>>2]+1|0;return}function _select_scan_parameters(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10;r2=r1>>2;r3=HEAP32[r2+50],r4=r3>>2;L7282:do{if((r3|0)==0){r5=(r1+72|0)>>2;r6=HEAP32[r5];if((r6|0)>4){r7=(r1|0)>>2;HEAP32[HEAP32[r7]+20>>2]=27;HEAP32[HEAP32[r7]+24>>2]=HEAP32[r5];HEAP32[HEAP32[r7]+28>>2]=4;FUNCTION_TABLE[HEAP32[HEAP32[r7]>>2]](r1);r8=HEAP32[r5]}else{r8=r6}HEAP32[r2+72]=r8;if((r8|0)<=0){break}r6=r1+80|0;r7=0;while(1){HEAP32[((r7<<2)+292>>2)+r2]=HEAP32[r6>>2]+(r7*88&-1)|0;r9=r7+1|0;if((r9|0)<(HEAP32[r5]|0)){r7=r9}else{break L7282}}}else{r7=HEAP32[HEAP32[r2+97]+32>>2];r5=(r3+(r7*36&-1)|0)>>2;HEAP32[r2+72]=HEAP32[r5];L7284:do{if((HEAP32[r5]|0)>0){r6=r1+80|0;r9=0;while(1){HEAP32[((r9<<2)+292>>2)+r2]=HEAP32[r6>>2]+(HEAP32[((r9<<2)+(r7*36&-1)+4>>2)+r4]*88&-1)|0;r10=r9+1|0;if((r10|0)<(HEAP32[r5]|0)){r9=r10}else{break L7284}}}}while(0);if((HEAP32[r2+66]|0)==0){break}HEAP32[r2+90]=HEAP32[((r7*36&-1)+20>>2)+r4];HEAP32[r2+91]=HEAP32[((r7*36&-1)+24>>2)+r4];HEAP32[r2+92]=HEAP32[((r7*36&-1)+28>>2)+r4];HEAP32[r2+93]=HEAP32[((r7*36&-1)+32>>2)+r4];return}}while(0);HEAP32[r2+90]=0;r4=HEAP32[r2+94];HEAP32[r2+91]=Math.imul(r4,r4)-1|0;HEAP32[r2+92]=0;HEAP32[r2+93]=0;return}function _per_scan_setup(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14;r2=r1>>2;r3=(r1+288|0)>>2;r4=HEAP32[r3];L7301:do{if((r4|0)==1){r5=HEAP32[r2+73],r6=r5>>2;HEAP32[r2+77]=HEAP32[r6+7];r7=r5+32|0;HEAP32[r2+78]=HEAP32[r7>>2];HEAP32[r6+14]=1;HEAP32[r6+15]=1;HEAP32[r6+16]=1;HEAP32[r6+17]=HEAP32[r6+9];HEAP32[r6+18]=1;r5=HEAP32[r6+3];r8=(HEAP32[r7>>2]>>>0)%(r5>>>0);HEAP32[r6+19]=(r8|0)==0?r5:r8;HEAP32[r2+79]=1;HEAP32[r2+80]=0}else{if((r4-1|0)>>>0>3){r8=(r1|0)>>2;HEAP32[HEAP32[r8]+20>>2]=27;HEAP32[HEAP32[r8]+24>>2]=HEAP32[r3];HEAP32[HEAP32[r8]+28>>2]=4;FUNCTION_TABLE[HEAP32[HEAP32[r8]>>2]](r1);r9=HEAP32[r3]}else{r9=r4}r8=HEAP32[r2+15];r5=HEAP32[r2+94];r6=Math.imul(r5,HEAP32[r2+67]);HEAP32[r2+77]=(r8-1+r6|0)/(r6|0)&-1;r6=HEAP32[r2+16];r8=Math.imul(r5,HEAP32[r2+68]);HEAP32[r2+78]=(r6-1+r8|0)/(r8|0)&-1;r8=(r1+316|0)>>2;HEAP32[r8]=0;if((r9|0)<=0){break}r6=r1|0;r5=r1;r7=0;while(1){r10=HEAP32[((r7<<2)+292>>2)+r2]>>2;r11=HEAP32[r10+2];HEAP32[r10+14]=r11;r12=HEAP32[r10+3];HEAP32[r10+15]=r12;r13=Math.imul(r11,r12);HEAP32[r10+16]=r13;HEAP32[r10+17]=Math.imul(HEAP32[r10+9],r11);r14=(HEAP32[r10+7]>>>0)%(r11>>>0);HEAP32[r10+18]=(r14|0)==0?r11:r14;r14=(HEAP32[r10+8]>>>0)%(r12>>>0);HEAP32[r10+19]=(r14|0)==0?r12:r14;if((HEAP32[r8]+r13|0)>10){HEAP32[HEAP32[r6>>2]+20>>2]=14;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r5)}L7312:do{if((r13|0)>0){r14=r13;while(1){r12=r14-1|0;r10=HEAP32[r8];HEAP32[r8]=r10+1|0;HEAP32[((r10<<2)+320>>2)+r2]=r7;if((r12|0)>0){r14=r12}else{break L7312}}}}while(0);r13=r7+1|0;if((r13|0)<(HEAP32[r3]|0)){r7=r13}else{break L7301}}}}while(0);r3=HEAP32[r2+59];if((r3|0)<=0){return}r1=Math.imul(HEAP32[r2+77],r3);HEAP32[r2+58]=(r1|0)<65535?r1:65535;return}function _jpeg_set_defaults(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25;r2=r1>>2;r3=(r1+20|0)>>2;if((HEAP32[r3]|0)!=100){r4=(r1|0)>>2;HEAP32[HEAP32[r4]+20>>2]=21;HEAP32[HEAP32[r4]+24>>2]=HEAP32[r3];FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r1)}r4=r1+80|0;if((HEAP32[r4>>2]|0)==0){HEAP32[r4>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r2+1]>>2]](r1,0,880)}HEAP32[r2+13]=1;HEAP32[r2+14]=1;r4=r1+68|0;HEAP32[r4>>2]=8;if((HEAP32[r3]|0)!=100){r5=(r1|0)>>2;HEAP32[HEAP32[r5]+20>>2]=21;HEAP32[HEAP32[r5]+24>>2]=HEAP32[r3];FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r1)}r5=(r1+84|0)>>2;r6=HEAP32[r5];do{if((r6|0)==0){r7=FUNCTION_TABLE[HEAP32[HEAP32[r2+1]>>2]](r1,0,132);r8=r7;HEAP32[r7+128>>2]=0;HEAP32[r5]=r8;r9=0;r10=r8;break}else{r9=0;r10=r6}}while(0);while(1){r6=(HEAP32[(r9<<2)+5242892>>2]*50&-1)+50|0;r8=(r6|0)<100?1:(r6|0)/100&-1;r6=(r8|0)>32767?32767:r8;HEAP16[r10+(r9<<1)>>1]=(r6|0)>255?255:r6&65535;r6=r9+1|0;r11=HEAP32[r5];if((r6|0)==64){break}else{r9=r6;r10=r11}}HEAP32[r11+128>>2]=0;if((HEAP32[r3]|0)!=100){r11=(r1|0)>>2;HEAP32[HEAP32[r11]+20>>2]=21;HEAP32[HEAP32[r11]+24>>2]=HEAP32[r3];FUNCTION_TABLE[HEAP32[HEAP32[r11]>>2]](r1)}r11=(r1+88|0)>>2;r3=HEAP32[r11];do{if((r3|0)==0){r10=FUNCTION_TABLE[HEAP32[HEAP32[r2+1]>>2]](r1,0,132);r9=r10;HEAP32[r10+128>>2]=0;HEAP32[r11]=r9;r12=0;r13=r9;break}else{r12=0;r13=r3}}while(0);while(1){r3=(HEAP32[(r12<<2)+5243580>>2]*50&-1)+50|0;r9=(r3|0)<100?1:(r3|0)/100&-1;r3=(r9|0)>32767?32767:r9;HEAP16[r13+(r12<<1)>>1]=(r3|0)>255?255:r3&65535;r3=r12+1|0;r14=HEAP32[r11];if((r3|0)==64){break}else{r12=r3;r13=r14}}HEAP32[r14+128>>2]=0;_add_huff_table(r1,r1+116|0,5243500,5243148);_add_huff_table(r1,r1+132|0,5243540,5243172);_add_huff_table(r1,r1+120|0,5243520,5243160);_add_huff_table(r1,r1+136|0,5243560,5243336);HEAP8[r1+148|0]=0;HEAP8[r1+164|0]=1;HEAP8[r1+180|0]=5;HEAP8[r1+149|0]=0;HEAP8[r1+165|0]=1;HEAP8[r1+181|0]=5;HEAP8[r1+150|0]=0;HEAP8[r1+166|0]=1;HEAP8[r1+182|0]=5;HEAP8[r1+151|0]=0;HEAP8[r1+167|0]=1;HEAP8[r1+183|0]=5;HEAP8[r1+152|0]=0;HEAP8[r1+168|0]=1;HEAP8[r1+184|0]=5;HEAP8[r1+153|0]=0;HEAP8[r1+169|0]=1;HEAP8[r1+185|0]=5;HEAP8[r1+154|0]=0;HEAP8[r1+170|0]=1;HEAP8[r1+186|0]=5;HEAP8[r1+155|0]=0;HEAP8[r1+171|0]=1;HEAP8[r1+187|0]=5;HEAP8[r1+156|0]=0;HEAP8[r1+172|0]=1;HEAP8[r1+188|0]=5;HEAP8[r1+157|0]=0;HEAP8[r1+173|0]=1;HEAP8[r1+189|0]=5;HEAP8[r1+158|0]=0;HEAP8[r1+174|0]=1;HEAP8[r1+190|0]=5;HEAP8[r1+159|0]=0;HEAP8[r1+175|0]=1;HEAP8[r1+191|0]=5;HEAP8[r1+160|0]=0;HEAP8[r1+176|0]=1;HEAP8[r1+192|0]=5;HEAP8[r1+161|0]=0;HEAP8[r1+177|0]=1;HEAP8[r1+193|0]=5;HEAP8[r1+162|0]=0;HEAP8[r1+178|0]=1;HEAP8[r1+194|0]=5;HEAP8[r1+163|0]=0;HEAP8[r1+179|0]=1;HEAP8[r1+195|0]=5;r14=(r1+196|0)>>2;HEAP32[r14]=0;HEAP32[r14+1]=0;HEAP32[r14+2]=0;HEAP32[r14+3]=0;HEAP32[r14+4]=0;if((HEAP32[r4>>2]|0)<=8){r15=r1+216|0;HEAP32[r15>>2]=0;r16=r1+220|0;HEAP32[r16>>2]=1;r17=r1+224|0;r18=r1+244|0;r19=r17,r20=r19>>2;HEAP32[r20]=0;HEAP32[r20+1]=0;HEAP32[r20+2]=0;HEAP32[r20+3]=0;HEAP8[r18]=1;r21=r1+245|0;HEAP8[r21]=1;r22=r1+246|0;HEAP8[r22]=0;r23=r1+248|0;HEAP16[r23>>1]=1;r24=r1+250|0;HEAP16[r24>>1]=1;r25=r1+256|0;HEAP32[r25>>2]=0;_jpeg_default_colorspace(r1);return}HEAP32[r2+53]=1;r15=r1+216|0;HEAP32[r15>>2]=0;r16=r1+220|0;HEAP32[r16>>2]=1;r17=r1+224|0;r18=r1+244|0;r19=r17,r20=r19>>2;HEAP32[r20]=0;HEAP32[r20+1]=0;HEAP32[r20+2]=0;HEAP32[r20+3]=0;HEAP8[r18]=1;r21=r1+245|0;HEAP8[r21]=1;r22=r1+246|0;HEAP8[r22]=0;r23=r1+248|0;HEAP16[r23>>1]=1;r24=r1+250|0;HEAP16[r24>>1]=1;r25=r1+256|0;HEAP32[r25>>2]=0;_jpeg_default_colorspace(r1);return}function _jpeg_default_colorspace(r1){var r2,r3,r4,r5,r6,r7;r2=r1>>2;r3=HEAP32[r2+10];if((r3|0)==3){r4=r1+20|0;if((HEAP32[r4>>2]|0)!=100){r5=(r1|0)>>2;HEAP32[HEAP32[r5]+20>>2]=21;HEAP32[HEAP32[r5]+24>>2]=HEAP32[r4>>2];FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r1)}HEAP32[r2+19]=3;HEAP32[r2+63]=0;HEAP32[r2+60]=1;HEAP32[r2+18]=3;r5=(r1+80|0)>>2;r4=HEAP32[r5]>>2;HEAP32[r4]=1;HEAP32[r4+2]=2;HEAP32[r4+3]=2;HEAP32[r4+4]=0;HEAP32[r4+5]=0;HEAP32[r4+6]=0;r4=HEAP32[r5]>>2;HEAP32[r4+22]=2;HEAP32[r4+24]=1;HEAP32[r4+25]=1;HEAP32[r4+26]=1;HEAP32[r4+27]=1;HEAP32[r4+28]=1;r4=HEAP32[r5]>>2;HEAP32[r4+44]=3;HEAP32[r4+46]=1;HEAP32[r4+47]=1;HEAP32[r4+48]=1;HEAP32[r4+49]=1;HEAP32[r4+50]=1;return}else if((r3|0)==0){r4=r1+20|0;if((HEAP32[r4>>2]|0)!=100){r5=(r1|0)>>2;HEAP32[HEAP32[r5]+20>>2]=21;HEAP32[HEAP32[r5]+24>>2]=HEAP32[r4>>2];FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r1)}HEAP32[r2+19]=0;HEAP32[r2+60]=0;HEAP32[r2+63]=0;r5=HEAP32[r2+9];r4=(r1+72|0)>>2;HEAP32[r4]=r5;if((r5-1|0)>>>0>9){r6=(r1|0)>>2;HEAP32[HEAP32[r6]+20>>2]=27;HEAP32[HEAP32[r6]+24>>2]=HEAP32[r4];HEAP32[HEAP32[r6]+28>>2]=10;FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r1);r7=HEAP32[r4]}else{r7=r5}if((r7|0)<=0){return}r7=r1+80|0;r5=0;while(1){r6=HEAP32[r7>>2]>>2;HEAP32[((r5*88&-1)>>2)+r6]=r5;HEAP32[((r5*88&-1)+8>>2)+r6]=1;HEAP32[((r5*88&-1)+12>>2)+r6]=1;HEAP32[((r5*88&-1)+16>>2)+r6]=0;HEAP32[((r5*88&-1)+20>>2)+r6]=0;HEAP32[((r5*88&-1)+24>>2)+r6]=0;r6=r5+1|0;if((r6|0)<(HEAP32[r4]|0)){r5=r6}else{break}}return}else if((r3|0)==4){r5=r1+20|0;if((HEAP32[r5>>2]|0)!=100){r4=(r1|0)>>2;HEAP32[HEAP32[r4]+20>>2]=21;HEAP32[HEAP32[r4]+24>>2]=HEAP32[r5>>2];FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r1)}HEAP32[r2+19]=4;HEAP32[r2+60]=0;HEAP32[r2+63]=1;HEAP32[r2+18]=4;r4=(r1+80|0)>>2;r5=HEAP32[r4]>>2;HEAP32[r5]=67;HEAP32[r5+2]=1;HEAP32[r5+3]=1;HEAP32[r5+4]=0;HEAP32[r5+5]=0;HEAP32[r5+6]=0;r5=HEAP32[r4]>>2;HEAP32[r5+22]=77;HEAP32[r5+24]=1;HEAP32[r5+25]=1;HEAP32[r5+26]=0;HEAP32[r5+27]=0;HEAP32[r5+28]=0;r5=HEAP32[r4]>>2;HEAP32[r5+44]=89;HEAP32[r5+46]=1;HEAP32[r5+47]=1;HEAP32[r5+48]=0;HEAP32[r5+49]=0;HEAP32[r5+50]=0;r5=HEAP32[r4]>>2;HEAP32[r5+66]=75;HEAP32[r5+68]=1;HEAP32[r5+69]=1;HEAP32[r5+70]=0;HEAP32[r5+71]=0;HEAP32[r5+72]=0;return}else if((r3|0)==1){r5=r1+20|0;if((HEAP32[r5>>2]|0)!=100){r4=(r1|0)>>2;HEAP32[HEAP32[r4]+20>>2]=21;HEAP32[HEAP32[r4]+24>>2]=HEAP32[r5>>2];FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r1)}HEAP32[r2+19]=1;HEAP32[r2+63]=0;HEAP32[r2+60]=1;HEAP32[r2+18]=1;r4=HEAP32[r2+20]>>2;HEAP32[r4]=1;HEAP32[r4+2]=1;HEAP32[r4+3]=1;HEAP32[r4+4]=0;HEAP32[r4+5]=0;HEAP32[r4+6]=0;return}else if((r3|0)==5){r4=r1+20|0;if((HEAP32[r4>>2]|0)!=100){r5=(r1|0)>>2;HEAP32[HEAP32[r5]+20>>2]=21;HEAP32[HEAP32[r5]+24>>2]=HEAP32[r4>>2];FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r1)}HEAP32[r2+19]=5;HEAP32[r2+60]=0;HEAP32[r2+63]=1;HEAP32[r2+18]=4;r5=(r1+80|0)>>2;r4=HEAP32[r5]>>2;HEAP32[r4]=1;HEAP32[r4+2]=2;HEAP32[r4+3]=2;HEAP32[r4+4]=0;HEAP32[r4+5]=0;HEAP32[r4+6]=0;r4=HEAP32[r5]>>2;HEAP32[r4+22]=2;HEAP32[r4+24]=1;HEAP32[r4+25]=1;HEAP32[r4+26]=1;HEAP32[r4+27]=1;HEAP32[r4+28]=1;r4=HEAP32[r5]>>2;HEAP32[r4+44]=3;HEAP32[r4+46]=1;HEAP32[r4+47]=1;HEAP32[r4+48]=1;HEAP32[r4+49]=1;HEAP32[r4+50]=1;r4=HEAP32[r5]>>2;HEAP32[r4+66]=4;HEAP32[r4+68]=2;HEAP32[r4+69]=2;HEAP32[r4+70]=0;HEAP32[r4+71]=0;HEAP32[r4+72]=0;return}else if((r3|0)==2){r3=r1+20|0;if((HEAP32[r3>>2]|0)!=100){r4=(r1|0)>>2;HEAP32[HEAP32[r4]+20>>2]=21;HEAP32[HEAP32[r4]+24>>2]=HEAP32[r3>>2];FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r1)}HEAP32[r2+19]=3;HEAP32[r2+63]=0;HEAP32[r2+60]=1;HEAP32[r2+18]=3;r2=(r1+80|0)>>2;r4=HEAP32[r2]>>2;HEAP32[r4]=1;HEAP32[r4+2]=2;HEAP32[r4+3]=2;HEAP32[r4+4]=0;HEAP32[r4+5]=0;HEAP32[r4+6]=0;r4=HEAP32[r2]>>2;HEAP32[r4+22]=2;HEAP32[r4+24]=1;HEAP32[r4+25]=1;HEAP32[r4+26]=1;HEAP32[r4+27]=1;HEAP32[r4+28]=1;r4=HEAP32[r2]>>2;HEAP32[r4+44]=3;HEAP32[r4+46]=1;HEAP32[r4+47]=1;HEAP32[r4+48]=1;HEAP32[r4+49]=1;HEAP32[r4+50]=1;return}else{r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=10;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1);return}}function _jpeg_set_colorspace(r1,r2){var r3,r4,r5,r6,r7,r8,r9;r3=r1>>2;r4=r1+20|0;if((HEAP32[r4>>2]|0)!=100){r5=(r1|0)>>2;HEAP32[HEAP32[r5]+20>>2]=21;HEAP32[HEAP32[r5]+24>>2]=HEAP32[r4>>2];FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r1)}HEAP32[r3+19]=r2;r5=(r1+240|0)>>2;HEAP32[r5]=0;r4=(r1+252|0)>>2;HEAP32[r4]=0;if((r2|0)==2){HEAP32[r4]=1;HEAP32[r3+18]=3;r6=(r1+80|0)>>2;r7=HEAP32[r6]>>2;HEAP32[r7]=82;HEAP32[r7+2]=1;HEAP32[r7+3]=1;HEAP32[r7+4]=0;HEAP32[r7+5]=0;HEAP32[r7+6]=0;r7=HEAP32[r6]>>2;HEAP32[r7+22]=71;HEAP32[r7+24]=1;HEAP32[r7+25]=1;HEAP32[r7+26]=0;r8=r1+256|0;HEAP32[r7+27]=(HEAP32[r8>>2]|0)==1&1;HEAP32[r7+28]=(HEAP32[r8>>2]|0)==1&1;r8=HEAP32[r6]>>2;HEAP32[r8+44]=66;HEAP32[r8+46]=1;HEAP32[r8+47]=1;HEAP32[r8+48]=0;HEAP32[r8+49]=0;HEAP32[r8+50]=0;return}else if((r2|0)==1){HEAP32[r5]=1;HEAP32[r3+18]=1;r8=HEAP32[r3+20]>>2;HEAP32[r8]=1;HEAP32[r8+2]=1;HEAP32[r8+3]=1;HEAP32[r8+4]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;return}else if((r2|0)==0){r8=HEAP32[r3+9];r6=(r1+72|0)>>2;HEAP32[r6]=r8;if((r8-1|0)>>>0>9){r7=(r1|0)>>2;HEAP32[HEAP32[r7]+20>>2]=27;HEAP32[HEAP32[r7]+24>>2]=HEAP32[r6];HEAP32[HEAP32[r7]+28>>2]=10;FUNCTION_TABLE[HEAP32[HEAP32[r7]>>2]](r1);r9=HEAP32[r6]}else{r9=r8}if((r9|0)<=0){return}r9=r1+80|0;r8=0;while(1){r7=HEAP32[r9>>2]>>2;HEAP32[((r8*88&-1)>>2)+r7]=r8;HEAP32[((r8*88&-1)+8>>2)+r7]=1;HEAP32[((r8*88&-1)+12>>2)+r7]=1;HEAP32[((r8*88&-1)+16>>2)+r7]=0;HEAP32[((r8*88&-1)+20>>2)+r7]=0;HEAP32[((r8*88&-1)+24>>2)+r7]=0;r7=r8+1|0;if((r7|0)<(HEAP32[r6]|0)){r8=r7}else{break}}return}else if((r2|0)==3){HEAP32[r5]=1;HEAP32[r3+18]=3;r5=(r1+80|0)>>2;r8=HEAP32[r5]>>2;HEAP32[r8]=1;HEAP32[r8+2]=2;HEAP32[r8+3]=2;HEAP32[r8+4]=0;HEAP32[r8+5]=0;HEAP32[r8+6]=0;r8=HEAP32[r5]>>2;HEAP32[r8+22]=2;HEAP32[r8+24]=1;HEAP32[r8+25]=1;HEAP32[r8+26]=1;HEAP32[r8+27]=1;HEAP32[r8+28]=1;r8=HEAP32[r5]>>2;HEAP32[r8+44]=3;HEAP32[r8+46]=1;HEAP32[r8+47]=1;HEAP32[r8+48]=1;HEAP32[r8+49]=1;HEAP32[r8+50]=1;return}else if((r2|0)==4){HEAP32[r4]=1;HEAP32[r3+18]=4;r8=(r1+80|0)>>2;r5=HEAP32[r8]>>2;HEAP32[r5]=67;HEAP32[r5+2]=1;HEAP32[r5+3]=1;HEAP32[r5+4]=0;HEAP32[r5+5]=0;HEAP32[r5+6]=0;r5=HEAP32[r8]>>2;HEAP32[r5+22]=77;HEAP32[r5+24]=1;HEAP32[r5+25]=1;HEAP32[r5+26]=0;HEAP32[r5+27]=0;HEAP32[r5+28]=0;r5=HEAP32[r8]>>2;HEAP32[r5+44]=89;HEAP32[r5+46]=1;HEAP32[r5+47]=1;HEAP32[r5+48]=0;HEAP32[r5+49]=0;HEAP32[r5+50]=0;r5=HEAP32[r8]>>2;HEAP32[r5+66]=75;HEAP32[r5+68]=1;HEAP32[r5+69]=1;HEAP32[r5+70]=0;HEAP32[r5+71]=0;HEAP32[r5+72]=0;return}else if((r2|0)==5){HEAP32[r4]=1;HEAP32[r3+18]=4;r3=(r1+80|0)>>2;r4=HEAP32[r3]>>2;HEAP32[r4]=1;HEAP32[r4+2]=2;HEAP32[r4+3]=2;HEAP32[r4+4]=0;HEAP32[r4+5]=0;HEAP32[r4+6]=0;r4=HEAP32[r3]>>2;HEAP32[r4+22]=2;HEAP32[r4+24]=1;HEAP32[r4+25]=1;HEAP32[r4+26]=1;HEAP32[r4+27]=1;HEAP32[r4+28]=1;r4=HEAP32[r3]>>2;HEAP32[r4+44]=3;HEAP32[r4+46]=1;HEAP32[r4+47]=1;HEAP32[r4+48]=1;HEAP32[r4+49]=1;HEAP32[r4+50]=1;r4=HEAP32[r3]>>2;HEAP32[r4+66]=4;HEAP32[r4+68]=2;HEAP32[r4+69]=2;HEAP32[r4+70]=0;HEAP32[r4+71]=0;HEAP32[r4+72]=0;return}else{r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=11;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1);return}}function _add_huff_table(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12;r5=r2>>2;r2=HEAP32[r5];if((r2|0)==0){r6=FUNCTION_TABLE[HEAP32[HEAP32[r1+4>>2]>>2]](r1,0,280);r7=r6;HEAP32[r6+276>>2]=0;HEAP32[r5]=r7;r8=r7}else{r8=r2}_memcpy(r8|0,r3,17);r8=HEAPU8[r3+16|0]+HEAPU8[r3+15|0]+HEAPU8[r3+14|0]+HEAPU8[r3+13|0]+HEAPU8[r3+12|0]+HEAPU8[r3+11|0]+HEAPU8[r3+10|0]+HEAPU8[r3+9|0]+HEAPU8[r3+8|0]+HEAPU8[r3+7|0]+HEAPU8[r3+6|0]+HEAPU8[r3+5|0]+HEAPU8[r3+4|0]+HEAPU8[r3+3|0]+HEAPU8[r3+2|0]+HEAPU8[r3+1|0]|0;if((r8-1|0)>>>0<=255){r9=HEAP32[r5];r10=r9+17|0;_memcpy(r10,r4,r8);r11=HEAP32[r5];r12=r11+276|0;HEAP32[r12>>2]=0;return}r3=r1|0;HEAP32[HEAP32[r3>>2]+20>>2]=9;FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]>>2]](r1);r9=HEAP32[r5];r10=r9+17|0;_memcpy(r10,r4,r8);r11=HEAP32[r5];r12=r11+276|0;HEAP32[r12>>2]=0;return}function _start_pass_downsample(r1){return}function _jinit_c_prep_controller(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20;if((r2|0)==0){r3=r1}else{r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=3;r4=r1;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r4);r3=r4}r4=(r1+4|0)>>2;r2=FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r3,1,64);r5=r1+396|0;HEAP32[r5>>2]=r2;HEAP32[r2>>2]=124;r6=r2+4|0;if((HEAP32[HEAP32[r1+412>>2]+8>>2]|0)==0){HEAP32[r6>>2]=342;r7=r1+72|0;if((HEAP32[r7>>2]|0)<=0){return}r8=r1+276|0;r9=r1+268|0;r10=r1+272|0;r11=r2+8|0;r2=0;r12=HEAP32[r1+80>>2];while(1){r13=HEAP32[HEAP32[r4]+8>>2];r14=Math.imul(Math.imul(HEAP32[r8>>2],HEAP32[r12+28>>2]),HEAP32[r9>>2]);HEAP32[r11+(r2<<2)>>2]=FUNCTION_TABLE[r13](r3,1,(r14|0)/(HEAP32[r12+8>>2]|0)&-1,HEAP32[r10>>2]);r14=r2+1|0;if((r14|0)<(HEAP32[r7>>2]|0)){r2=r14;r12=r12+88|0}else{break}}return}HEAP32[r6>>2]=374;r6=HEAP32[r5>>2];r5=HEAP32[r1+272>>2];r12=HEAP32[HEAP32[r4]>>2];r2=(r1+72|0)>>2;r7=Math.imul(r5*20&-1,HEAP32[r2]);r10=FUNCTION_TABLE[r12](r3,1,r7);if((HEAP32[r2]|0)<=0){return}r7=r1+276|0;r12=r1+268|0;r11=r5*3&-1;r9=r5*12&-1;r8=(r5|0)>0;r14=r6+8|0;r6=r5*5&-1;r13=r5<<1;r15=r5<<2;r16=HEAP32[r1+80>>2];r1=0;r17=r10;while(1){r10=HEAP32[HEAP32[r4]+8>>2];r18=Math.imul(Math.imul(HEAP32[r7>>2],HEAP32[r16+28>>2]),HEAP32[r12>>2]);r19=FUNCTION_TABLE[r10](r3,1,(r18|0)/(HEAP32[r16+8>>2]|0)&-1,r11);r18=(r5<<2)+r17|0;_memcpy(r18,r19,r9);L7446:do{if(r8){r10=0;while(1){HEAP32[r17+(r10<<2)>>2]=HEAP32[r19+(r10+r13<<2)>>2];HEAP32[r17+(r10+r15<<2)>>2]=HEAP32[r19+(r10<<2)>>2];r20=r10+1|0;if((r20|0)==(r5|0)){break L7446}else{r10=r20}}}}while(0);HEAP32[r14+(r1<<2)>>2]=r18;r19=r1+1|0;if((r19|0)<(HEAP32[r2]|0)){r16=r16+88|0;r1=r19;r17=(r6<<2)+r17|0}else{break}}return}function _start_pass_prep(r1,r2){var r3;r3=HEAP32[r1+396>>2]>>2;if((r2|0)!=0){r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=3;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}HEAP32[r3+12]=HEAP32[r1+32>>2];HEAP32[r3+13]=0;HEAP32[r3+14]=0;HEAP32[r3+15]=HEAP32[r1+272>>2]<<1;return}function _pre_process_context(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45;r8=r6>>2;r6=0;r9=HEAP32[r1+396>>2];r10=(r1+272|0)>>2;r11=HEAP32[r10]*3&-1;r12=r9+48|0;r13=r12>>2;if(HEAP32[r8]>>>0>=r7>>>0){return}r14=r9+60|0;r15=r14>>2;r16=r9+52|0,r17=r16>>2;r18=r16>>2;r16=r1+408|0;r19=r9+8|0;r20=r19;r21=r19;r19=r1+32|0;r22=r12|0;r12=(r1+72|0)>>2;r23=r1+28|0;r24=r1+412|0;r25=r9+56|0;r9=r25;r26=r25|0;L7459:while(1){r25=HEAP32[r3>>2];do{if(r25>>>0<r4>>>0){r27=r4-r25|0;r28=HEAP32[r18];r29=HEAP32[r15]-r28|0;r30=r29>>>0<r27>>>0?r29:r27;FUNCTION_TABLE[HEAP32[HEAP32[r16>>2]+4>>2]](r1,(r25<<2)+r2|0,r21,r28,r30);L7478:do{if((HEAP32[r13]|0)==(HEAP32[r19>>2]|0)){r28=HEAP32[r12];if((r28|0)<=0){break}r27=0;r29=HEAP32[r10];r31=r28;while(1){if((r29|0)<1){r32=r29;r33=r31}else{r28=(r27<<2)+r20|0;r34=1;while(1){r35=HEAP32[r28>>2];_memcpy(HEAP32[r35+(-r34<<2)>>2],HEAP32[r35>>2],HEAP32[r23>>2]);r35=r34+1|0;r36=HEAP32[r10];if((r35|0)>(r36|0)){break}else{r34=r35}}r32=r36;r33=HEAP32[r12]}r34=r27+1|0;if((r34|0)<(r33|0)){r27=r34;r29=r32;r31=r33}else{break L7478}}}}while(0);HEAP32[r3>>2]=HEAP32[r3>>2]+r30|0;r31=HEAP32[r18]+r30|0;HEAP32[r17]=r31;HEAP32[r22>>2]=HEAP32[r13]-r30|0;r37=r31;r38=HEAP32[r15];r6=6198;break}else{if((HEAP32[r13]|0)!=0){r6=6205;break L7459}r31=HEAP32[r18];r29=HEAP32[r15];if((r31|0)>=(r29|0)){r37=r31;r38=r29;r6=6198;break}r27=HEAP32[r12];if((r27|0)>0){r34=0;r28=r27;r27=r31;r31=r29;while(1){r35=HEAP32[r20+(r34<<2)>>2];r39=HEAP32[r23>>2];if((r27|0)<(r31|0)){r40=(r27-1<<2)+r35|0;r41=r27;while(1){_memcpy(HEAP32[r35+(r41<<2)>>2],HEAP32[r40>>2],r39);r42=r41+1|0;if((r42|0)==(r31|0)){break}else{r41=r42}}r43=HEAP32[r12]}else{r43=r28}r41=r34+1|0;if((r41|0)>=(r43|0)){break}r34=r41;r28=r43;r27=HEAP32[r18];r31=HEAP32[r15]}r44=HEAP32[r15]}else{r44=r29}HEAP32[r17]=r44;r6=6199;break}}while(0);do{if(r6==6198){r6=0;if((r37|0)==(r38|0)){r6=6199;break}else{break}}}while(0);if(r6==6199){r6=0;FUNCTION_TABLE[HEAP32[HEAP32[r24>>2]+4>>2]](r1,r21,HEAP32[r9>>2],r5,HEAP32[r8]);HEAP32[r8]=HEAP32[r8]+1|0;r25=HEAP32[r9>>2]+HEAP32[r10]|0;HEAP32[r26>>2]=(r25|0)<(r11|0)?r25:0;r25=HEAP32[r18];if((r25|0)<(r11|0)){r45=r25}else{HEAP32[r17]=0;r45=0}HEAP32[r14>>2]=HEAP32[r10]+r45|0}if(HEAP32[r8]>>>0>=r7>>>0){r6=6204;break}}if(r6==6204){return}else if(r6==6205){return}}function _pre_process_data(r1,r2,r3,r4,r5,r6,r7){var r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38;r8=r6>>2;r6=0;r9=HEAP32[r1+396>>2];r10=HEAP32[r3>>2];if(r10>>>0>=r4>>>0){return}r11=(r1+272|0)>>2;r12=r9+52|0,r13=r12>>2;r14=r12>>2;r12=r1+408|0;r15=r9+8|0;r16=r15;r17=r15;r15=r9+48|0;r9=r15;r18=r15|0;r15=(r1+72|0)>>2;r19=r1+28|0;r20=r1+412|0;r21=r10;while(1){if(HEAP32[r8]>>>0>=r7>>>0){r6=6236;break}r10=r4-r21|0;r22=HEAP32[r14];r23=HEAP32[r11]-r22|0;r24=r23>>>0<r10>>>0?r23:r10;FUNCTION_TABLE[HEAP32[HEAP32[r12>>2]+4>>2]](r1,(r21<<2)+r2|0,r17,r22,r24);HEAP32[r3>>2]=HEAP32[r3>>2]+r24|0;r22=HEAP32[r14]+r24|0;HEAP32[r13]=r22;r10=HEAP32[r9>>2];HEAP32[r18>>2]=r10-r24|0;do{if((r10|0)==(r24|0)){r23=HEAP32[r11];if((r22|0)>=(r23|0)){r25=r22;break}r26=HEAP32[r15];if((r26|0)>0){r27=0;r28=r26;r26=r22;r29=r23;while(1){r30=HEAP32[r16+(r27<<2)>>2];r31=HEAP32[r19>>2];if((r26|0)<(r29|0)){r32=(r26-1<<2)+r30|0;r33=r26;while(1){_memcpy(HEAP32[r30+(r33<<2)>>2],HEAP32[r32>>2],r31);r34=r33+1|0;if((r34|0)==(r29|0)){break}else{r33=r34}}r35=HEAP32[r15]}else{r35=r28}r33=r27+1|0;if((r33|0)>=(r35|0)){break}r27=r33;r28=r35;r26=HEAP32[r14];r29=HEAP32[r11]}r36=HEAP32[r11]}else{r36=r23}HEAP32[r13]=r36;r25=r36}else{r25=r22}}while(0);if((r25|0)==(HEAP32[r11]|0)){FUNCTION_TABLE[HEAP32[HEAP32[r20>>2]+4>>2]](r1,r17,0,r5,HEAP32[r8]);HEAP32[r13]=0;HEAP32[r8]=HEAP32[r8]+1|0}if((HEAP32[r9>>2]|0)==0){r37=HEAP32[r8];if(r37>>>0<r7>>>0){r6=6226;break}}r22=HEAP32[r3>>2];if(r22>>>0<r4>>>0){r21=r22}else{r6=6237;break}}if(r6==6236){return}else if(r6==6237){return}else if(r6==6226){r6=HEAP32[r15];L7534:do{if((r6|0)>0){r21=r1+280|0;r4=0;r3=HEAP32[r1+80>>2],r9=r3>>2;r13=r6;r17=r37;while(1){r20=(Math.imul(HEAP32[r9+10],HEAP32[r9+3])|0)/(HEAP32[r21>>2]|0)&-1;r11=HEAP32[r5+(r4<<2)>>2];r25=Math.imul(HEAP32[r9+9],HEAP32[r9+7]);r36=Math.imul(r17,r20);r14=Math.imul(r20,r7);if((r36|0)<(r14|0)){r20=(r36-1<<2)+r11|0;r35=r36;while(1){_memcpy(HEAP32[r11+(r35<<2)>>2],HEAP32[r20>>2],r25);r36=r35+1|0;if((r36|0)==(r14|0)){break}else{r35=r36}}r38=HEAP32[r15]}else{r38=r13}r35=r4+1|0;if((r35|0)>=(r38|0)){break L7534}r4=r35;r3=r3+88|0,r9=r3>>2;r13=r38;r17=HEAP32[r8]}}}while(0);HEAP32[r8]=r7;return}}function _jinit_downsampler(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25;r2=r1;r3=FUNCTION_TABLE[HEAP32[HEAP32[r1+4>>2]>>2]](r2,1,112);HEAP32[r1+412>>2]=r3;HEAP32[r3>>2]=1320;HEAP32[r3+4>>2]=692;r4=(r3+8|0)>>2;HEAP32[r4]=0;if((HEAP32[r1+216>>2]|0)!=0){r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=26;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r2)}r5=r1+72|0;if((HEAP32[r5>>2]|0)<=0){return}r6=r1+276|0;r7=r1+280|0;r8=r1+268|0;r9=r1+272|0;r10=r3+52|0;r11=(r1+224|0)>>2;r12=r3+12|0;r13=r1|0;r14=1;r15=HEAP32[r1+80>>2],r16=r15>>2;r17=0;while(1){r18=(Math.imul(HEAP32[r16+9],HEAP32[r16+2])|0)/(HEAP32[r6>>2]|0)&-1;r19=(Math.imul(HEAP32[r16+10],HEAP32[r16+3])|0)/(HEAP32[r7>>2]|0)&-1;r20=HEAP32[r8>>2];r21=HEAP32[r9>>2];HEAP32[r10+(r17<<2)>>2]=r19;r22=(r21|0)==(r19|0);L7556:do{if((r20|0)==(r18|0)&r22){r23=(r17<<2)+r12|0;if((HEAP32[r11]|0)==0){HEAP32[r23>>2]=122;r24=r14;break}else{HEAP32[r23>>2]=26;HEAP32[r4]=1;r24=r14;break}}else{r23=(r20|0)==(r18<<1|0);if(r23&r22){HEAP32[r12+(r17<<2)>>2]=1108;r24=0;break}do{if(r23){if((r21|0)!=(r19<<1|0)){break}r25=(r17<<2)+r12|0;if((HEAP32[r11]|0)==0){HEAP32[r25>>2]=880;r24=r14;break L7556}else{HEAP32[r25>>2]=1334;HEAP32[r4]=1;r24=r14;break L7556}}}while(0);do{if(((r20|0)%(r18|0)|0)==0){if(((r21|0)%(r19|0)|0)!=0){break}HEAP32[r12+(r17<<2)>>2]=202;HEAP8[r17+(r3+92)|0]=(r20|0)/(r18|0)&-1&255;HEAP8[r17+(r3+102)|0]=(r21|0)/(r19|0)&-1&255;r24=0;break L7556}}while(0);HEAP32[HEAP32[r13>>2]+20>>2]=39;FUNCTION_TABLE[HEAP32[HEAP32[r13>>2]>>2]](r2);r24=r14}}while(0);r19=r17+1|0;if((r19|0)<(HEAP32[r5>>2]|0)){r14=r24;r15=r15+88|0,r16=r15>>2;r17=r19}else{break}}if(!((HEAP32[r11]|0)!=0&(r24|0)==0)){return}r24=r1|0;HEAP32[HEAP32[r24>>2]+20>>2]=101;FUNCTION_TABLE[HEAP32[HEAP32[r24>>2]+4>>2]](r2,0);return}function _sep_downsample(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12;r6=HEAP32[r1+412>>2];r7=r1+72|0;if((HEAP32[r7>>2]|0)<=0){return}r8=r6+52|0;r9=r6+12|0;r6=HEAP32[r1+80>>2];r10=0;while(1){r11=(r3<<2)+HEAP32[r2+(r10<<2)>>2]|0;r12=HEAP32[r4+(r10<<2)>>2]+(Math.imul(HEAP32[r8+(r10<<2)>>2],r5)<<2)|0;FUNCTION_TABLE[HEAP32[r9+(r10<<2)>>2]](r1,r6,r11,r12);r12=r10+1|0;if((r12|0)<(HEAP32[r7>>2]|0)){r6=r6+88|0;r10=r12}else{break}}return}function _fullsize_smooth_downsample(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28;r5=Math.imul(HEAP32[r2+36>>2],HEAP32[r2+28>>2]);r2=(r1+272|0)>>2;r6=HEAP32[r2];r7=r6+2|0;r8=HEAP32[r1+28>>2];r9=r5-r8|0;if((r9|0)>0&(r7|0)>0){r10=r8-1|0;r11=0;while(1){r12=HEAP32[r3+(r11-1<<2)>>2];_memset(r12+r8|0,HEAP8[r12+r10|0],r9);r12=r11+1|0;if((r12|0)==(r7|0)){break}else{r11=r12}}r13=HEAP32[r2]}else{r13=r6}r6=HEAP32[r1+224>>2];r1=65536-(r6<<9)|0;r11=r6<<6;if((r13|0)<=0){return}r13=r5-2|0;r6=(r13|0)==0;r7=r5-1|0;r5=0;while(1){r9=HEAP32[r4+(r5<<2)>>2];r10=HEAP32[r3+(r5<<2)>>2];r8=HEAP32[r3+(r5-1<<2)>>2];r12=r5+1|0;r14=HEAP32[r3+(r12<<2)>>2];r15=r8+1|0;r16=r14+1|0;r17=HEAPU8[r14]+HEAPU8[r8]|0;r8=HEAPU8[r10];r14=r17+r8|0;r18=r10+1|0;r19=HEAPU8[r16]+HEAPU8[r15]+HEAPU8[r18]|0;HEAP8[r9]=(Math.imul(r8,r1)+Math.imul(r14+r17+r19|0,r11)+32768|0)>>>16&255;r17=r9+1|0;if(r6){r20=r18;r21=r19;r22=r14;r23=r17}else{r8=r9+r7|0;r9=r18;r18=r15;r15=r16;r16=r13;r24=r19;r19=r14;r14=r17;while(1){r17=r9+1|0;r25=HEAPU8[r9];r26=r18+1|0;r27=r15+1|0;r28=HEAPU8[r27]+HEAPU8[r26]+HEAPU8[r17]|0;HEAP8[r14]=(Math.imul(r25,r1)+Math.imul(r19+r24-r25+r28|0,r11)+32768|0)>>>16&255;r25=r16-1|0;if((r25|0)==0){break}else{r9=r17;r18=r26;r15=r27;r16=r25;r19=r24;r24=r28;r14=r14+1|0}}r20=r10+r7|0;r21=r28;r22=r24;r23=r8}r14=HEAPU8[r20];HEAP8[r23]=(Math.imul(r14,r1)+Math.imul((r21<<1)+(r22-r14)|0,r11)+32768|0)>>>16&255;if((r12|0)<(HEAP32[r2]|0)){r5=r12}else{break}}return}function _fullsize_downsample(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12;r5=r1+272|0;r6=HEAP32[r5>>2];r7=r1+28|0;r1=HEAP32[r7>>2];if((r6|0)>0){r8=r4;r9=r3;r3=r6;while(1){_memcpy(HEAP32[r8>>2],HEAP32[r9>>2],r1);r10=r3-1|0;if((r10|0)>0){r8=r8+4|0;r9=r9+4|0;r3=r10}else{break}}r11=HEAP32[r5>>2];r12=HEAP32[r7>>2]}else{r11=r6;r12=r1}r1=Math.imul(HEAP32[r2+36>>2],HEAP32[r2+28>>2])-r12|0;if(!((r1|0)>0&(r11|0)>0)){return}r2=r12-1|0;r6=0;while(1){r7=HEAP32[r4+(r6<<2)>>2];_memset(r7+r12|0,HEAP8[r7+r2|0],r1);r7=r6+1|0;if((r7|0)==(r11|0)){break}else{r6=r7}}return}function _h2v1_downsample(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13;r5=Math.imul(HEAP32[r2+36>>2],HEAP32[r2+28>>2]);r2=(r1+272|0)>>2;r6=HEAP32[r2];r7=HEAP32[r1+28>>2];r1=(r5<<1)-r7|0;if((r1|0)>0&(r6|0)>0){r8=r7-1|0;r9=0;while(1){r10=HEAP32[r3+(r9<<2)>>2];_memset(r10+r7|0,HEAP8[r10+r8|0],r1);r10=r9+1|0;if((r10|0)==(r6|0)){break}else{r9=r10}}r11=HEAP32[r2]}else{r11=r6}if((r11|0)<=0){return}r6=(r5|0)==0;r9=0;r1=r11;while(1){if(r6){r12=r1}else{r11=0;r8=HEAP32[r3+(r9<<2)>>2];r7=HEAP32[r4+(r9<<2)>>2];r10=0;while(1){HEAP8[r7]=(HEAPU8[r8]+r10+HEAPU8[r8+1|0]|0)>>>1&255;r13=r11+1|0;if((r13|0)==(r5|0)){break}else{r11=r13;r8=r8+2|0;r7=r7+1|0;r10=r10^1}}r12=HEAP32[r2]}r10=r9+1|0;if((r10|0)<(r12|0)){r9=r10;r1=r12}else{break}}return}function _h2v2_smooth_downsample(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33;r5=r3>>2;r3=Math.imul(HEAP32[r2+36>>2],HEAP32[r2+28>>2]);r2=(r1+272|0)>>2;r6=HEAP32[r2];r7=r6+2|0;r8=HEAP32[r1+28>>2];r9=(r3<<1)-r8|0;if((r9|0)>0&(r7|0)>0){r10=r8-1|0;r11=0;while(1){r12=HEAP32[(r11-1<<2>>2)+r5];_memset(r12+r8|0,HEAP8[r12+r10|0],r9);r12=r11+1|0;if((r12|0)==(r7|0)){break}else{r11=r12}}r13=HEAP32[r2]}else{r13=r6}r6=HEAP32[r1+224>>2];r1=(r6*-80&-1)+16384|0;r11=r6<<4;if((r13|0)<=0){return}r13=r3-2|0;r6=r3-1|0;r7=r3<<1;r3=0;r9=0;while(1){r10=HEAP32[r4+(r3<<2)>>2];r8=HEAP32[(r9<<2>>2)+r5];r12=HEAP32[((r9|1)<<2>>2)+r5];r14=HEAP32[(r9-1<<2>>2)+r5];r15=r9+2|0;r16=HEAP32[(r15<<2>>2)+r5];r17=HEAPU8[r8];r18=HEAPU8[r12];r19=HEAPU8[r14];r20=HEAPU8[r16];r21=r8+2|0;r22=r12+2|0;r23=r14+2|0;r24=r16+2|0;r25=(r18+r17+r19+HEAPU8[r14+1|0]+r20+HEAPU8[r16+1|0]+HEAPU8[r21]+HEAPU8[r22]<<1)+r20+r19+HEAPU8[r23]+HEAPU8[r24]|0;HEAP8[r10]=(Math.imul(HEAPU8[r8+1|0]+r17+r18+HEAPU8[r12+1|0]|0,r1)+Math.imul(r25,r11)+32768|0)>>>16&255;r25=r10+r6|0;r18=r10;r10=r24;r24=r23;r23=r22;r22=r21;r21=r13;while(1){r17=r18+1|0;r26=HEAPU8[r22+1|0];r27=HEAPU8[r23+1|0];r28=r26+HEAPU8[r22]+HEAPU8[r23]+r27|0;r29=HEAPU8[r24+1|0];r30=HEAPU8[r10+1|0];r31=r29+HEAPU8[r24]+HEAPU8[r10]+r30+HEAPU8[r22-1|0]|0;if((r21|0)==0){break}r8=r22+2|0;r19=r23+2|0;r20=r24+2|0;r32=r10+2|0;r33=(HEAPU8[r8]+r31+HEAPU8[r23-1|0]+HEAPU8[r19]<<1)+HEAPU8[r20]+HEAPU8[r24-1|0]+HEAPU8[r10-1|0]+HEAPU8[r32]|0;HEAP8[r17]=(Math.imul(r28,r1)+Math.imul(r33,r11)+32768|0)>>>16&255;r18=r17;r10=r32;r24=r20;r23=r19;r22=r8;r21=r21-1|0}r21=(r27+r26+r31+HEAPU8[r12+(r7-3)|0]<<1)+r30+r29+HEAPU8[r14+(r7-3)|0]+HEAPU8[r16+(r7-3)|0]|0;HEAP8[r25]=(Math.imul(r28,r1)+Math.imul(r21,r11)+32768|0)>>>16&255;if((r15|0)<(HEAP32[r2]|0)){r3=r3+1|0;r9=r15}else{break}}return}function _h2v2_downsample(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15;r5=Math.imul(HEAP32[r2+36>>2],HEAP32[r2+28>>2]);r2=(r1+272|0)>>2;r6=HEAP32[r2];r7=HEAP32[r1+28>>2];r1=(r5<<1)-r7|0;if((r1|0)>0&(r6|0)>0){r8=r7-1|0;r9=0;while(1){r10=HEAP32[r3+(r9<<2)>>2];_memset(r10+r7|0,HEAP8[r10+r8|0],r1);r10=r9+1|0;if((r10|0)==(r6|0)){break}else{r9=r10}}r11=HEAP32[r2]}else{r11=r6}if((r11|0)<=0){return}r6=(r5|0)==0;r9=0;r1=0;r8=r11;while(1){if(r6){r12=r8}else{r11=0;r7=HEAP32[r3+(r1<<2)>>2];r10=HEAP32[r3+((r1|1)<<2)>>2];r13=HEAP32[r4+(r9<<2)>>2];r14=1;while(1){HEAP8[r13]=(HEAPU8[r7]+r14+HEAPU8[r7+1|0]+HEAPU8[r10]+HEAPU8[r10+1|0]|0)>>>2&255;r15=r11+1|0;if((r15|0)==(r5|0)){break}else{r11=r15;r7=r7+2|0;r10=r10+2|0;r13=r13+1|0;r14=r14^3}}r12=HEAP32[r2]}r14=r1+2|0;if((r14|0)<(r12|0)){r9=r9+1|0;r1=r14;r8=r12}else{break}}return}function _int_downsample(r1,r2,r3,r4){var r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27;r5=HEAP32[r1+412>>2];r6=Math.imul(HEAP32[r2+36>>2],HEAP32[r2+28>>2]);r7=HEAP32[r2+4>>2];r2=HEAP8[r7+(r5+92)|0];r8=r2&255;r9=HEAP8[r5+(r7+102)|0];r7=r9&255;r5=Math.imul(r7,r8);r10=r5>>>1;r11=(r1+272|0)>>2;r12=HEAP32[r11];r13=HEAP32[r1+28>>2];r1=Math.imul(r8,r6)-r13|0;if((r1|0)>0&(r12|0)>0){r14=r13-1|0;r15=0;while(1){r16=HEAP32[r3+(r15<<2)>>2];_memset(r16+r13|0,HEAP8[r16+r14|0],r1);r16=r15+1|0;if((r16|0)==(r12|0)){break}else{r15=r16}}r17=HEAP32[r11]}else{r17=r12}if((r17|0)<=0){return}r12=(r6|0)==0;r15=r9<<24>>24==0;r9=r2<<24>>24==0;r2=0;r1=0;r14=r17;while(1){if(r12){r18=r14}else{r17=0;r13=0;r16=HEAP32[r4+(r2<<2)>>2];while(1){L7691:do{if(r15){r19=0}else{r20=0;r21=0;while(1){L7694:do{if(r9){r22=r21}else{r23=0;r24=HEAP32[r3+(r20+r1<<2)>>2]+r13|0;r25=r21;while(1){r26=HEAPU8[r24]+r25|0;r27=r23+1|0;if((r27|0)<(r8|0)){r23=r27;r24=r24+1|0;r25=r26}else{r22=r26;break L7694}}}}while(0);r25=r20+1|0;if((r25|0)<(r7|0)){r20=r25;r21=r22}else{r19=r22;break L7691}}}}while(0);HEAP8[r16]=(r19+r10|0)/(r5|0)&-1&255;r21=r17+1|0;if((r21|0)==(r6|0)){break}else{r17=r21;r13=r13+r8|0;r16=r16+1|0}}r18=HEAP32[r11]}r16=r1+r7|0;if((r16|0)<(r18|0)){r2=r2+1|0;r1=r16;r14=r18}else{break}}return}function _jpeg_write_coefficients(r1,r2){var r3,r4,r5,r6,r7,r8;r3=r1>>2;r4=(r1+20|0)>>2;r5=(r1|0)>>2;if((HEAP32[r4]|0)==100){r6=r1}else{HEAP32[HEAP32[r5]+20>>2]=21;HEAP32[HEAP32[r5]+24>>2]=HEAP32[r4];r7=r1;FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r7);r6=r7}_jpeg_suppress_tables(r1,0);FUNCTION_TABLE[HEAP32[HEAP32[r5]+16>>2]](r6);FUNCTION_TABLE[HEAP32[HEAP32[r3+6]+8>>2]](r1);_jinit_c_master_control(r1,1);r5=(r1+4|0)>>2;r7=HEAP32[HEAP32[r5]>>2];do{if((HEAP32[r3+52]|0)==0){r8=FUNCTION_TABLE[r7](r6,1,140);HEAP32[r3+105]=r8;HEAP32[r8>>2]=46;_memset(r8+44|0,0,64);if((HEAP32[r3+66]|0)==0){break}HEAP32[r8+136>>2]=0}else{r8=FUNCTION_TABLE[r7](r6,1,208);HEAP32[r3+105]=r8;HEAP32[r8>>2]=416;HEAP32[r8+8>>2]=862;_memset(r8+76|0,0,128);HEAP8[r8+204|0]=113}}while(0);r7=FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r6,1,68),r8=r7>>2;HEAP32[r3+100]=r7;HEAP32[r8]=904;HEAP32[r8+1]=1330;HEAP32[r8+6]=r2;r2=FUNCTION_TABLE[HEAP32[HEAP32[r5]+4>>2]](r6,1,1280);_memset(r2,0,1280);HEAP32[r8+7]=r2;HEAP32[r8+8]=r2+128|0;HEAP32[r8+9]=r2+256|0;HEAP32[r8+10]=r2+384|0;HEAP32[r8+11]=r2+512|0;HEAP32[r8+12]=r2+640|0;HEAP32[r8+13]=r2+768|0;HEAP32[r8+14]=r2+896|0;HEAP32[r8+15]=r2+1024|0;HEAP32[r8+16]=r2+1152|0;r2=FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r6,1,32),r8=r2>>2;r7=r1+404|0;HEAP32[r7>>2]=r2;HEAP32[r8]=510;HEAP32[r8+1]=932;HEAP32[r8+2]=648;HEAP32[r8+3]=1276;HEAP32[r8+4]=660;HEAP32[r8+5]=926;HEAP32[r8+6]=356;HEAP32[r8+7]=0;FUNCTION_TABLE[HEAP32[HEAP32[r5]+24>>2]](r6);FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r1);HEAP32[r3+65]=0;HEAP32[r4]=103;return}function _jpeg_copy_critical_parameters(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22;r3=0;r4=r2+20|0;if((HEAP32[r4>>2]|0)!=100){r5=(r2|0)>>2;HEAP32[HEAP32[r5]+20>>2]=21;HEAP32[HEAP32[r5]+24>>2]=HEAP32[r4>>2];FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r2)}HEAP32[r2+28>>2]=HEAP32[r1+28>>2];HEAP32[r2+32>>2]=HEAP32[r1+32>>2];r5=r1+36|0;HEAP32[r2+36>>2]=HEAP32[r5>>2];r4=r1+40|0;HEAP32[r2+40>>2]=HEAP32[r4>>2];HEAP32[r2+60>>2]=HEAP32[r1+112>>2];HEAP32[r2+64>>2]=HEAP32[r1+116>>2];HEAP32[r2+276>>2]=HEAP32[r1+324>>2];HEAP32[r2+280>>2]=HEAP32[r1+328>>2];_jpeg_set_defaults(r2);HEAP32[r2+256>>2]=HEAP32[r1+304>>2];_jpeg_set_colorspace(r2,HEAP32[r4>>2]);HEAP32[r2+68>>2]=HEAP32[r1+212>>2];HEAP32[r2+216>>2]=HEAP32[r1+308>>2];r4=r2;r6=(r2+4|0)>>2;r7=r1+164|0;r8=HEAP32[r7>>2];if((r8|0)!=0){r9=(r2+84|0)>>2;r10=HEAP32[r9];if((r10|0)==0){r11=FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r4,0,132);r12=r11;HEAP32[r11+128>>2]=0;HEAP32[r9]=r12;r13=r12;r14=HEAP32[r7>>2]}else{r13=r10;r14=r8}_memcpy(r13,r14,128);HEAP32[HEAP32[r9]+128>>2]=0}r9=r1+168|0;r14=HEAP32[r9>>2];if((r14|0)!=0){r13=(r2+88|0)>>2;r8=HEAP32[r13];if((r8|0)==0){r10=FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r4,0,132);r7=r10;HEAP32[r10+128>>2]=0;HEAP32[r13]=r7;r15=r7;r16=HEAP32[r9>>2]}else{r15=r8;r16=r14}_memcpy(r15,r16,128);HEAP32[HEAP32[r13]+128>>2]=0}r13=r1+172|0;r16=HEAP32[r13>>2];if((r16|0)!=0){r15=(r2+92|0)>>2;r14=HEAP32[r15];if((r14|0)==0){r8=FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r4,0,132);r9=r8;HEAP32[r8+128>>2]=0;HEAP32[r15]=r9;r17=r9;r18=HEAP32[r13>>2]}else{r17=r14;r18=r16}_memcpy(r17,r18,128);HEAP32[HEAP32[r15]+128>>2]=0}r15=r1+176|0;r18=HEAP32[r15>>2];if((r18|0)!=0){r17=(r2+96|0)>>2;r16=HEAP32[r17];if((r16|0)==0){r14=FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r4,0,132);r4=r14;HEAP32[r14+128>>2]=0;HEAP32[r17]=r4;r19=r4;r20=HEAP32[r15>>2]}else{r19=r16;r20=r18}_memcpy(r19,r20,128);HEAP32[HEAP32[r17]+128>>2]=0}r17=HEAP32[r5>>2];r5=(r2+72|0)>>2;HEAP32[r5]=r17;if((r17-1|0)>>>0>9){r20=(r2|0)>>2;HEAP32[HEAP32[r20]+20>>2]=27;HEAP32[HEAP32[r20]+24>>2]=HEAP32[r5];HEAP32[HEAP32[r20]+28>>2]=10;FUNCTION_TABLE[HEAP32[HEAP32[r20]>>2]](r2);r21=HEAP32[r5]}else{r21=r17}L7744:do{if((r21|0)>0){r17=(r2|0)>>2;r20=r2;r19=HEAP32[r2+80>>2],r18=r19>>2;r16=HEAP32[r1+216>>2],r15=r16>>2;r4=0;while(1){HEAP32[r18]=HEAP32[r15];HEAP32[r18+2]=HEAP32[r15+2];HEAP32[r18+3]=HEAP32[r15+3];r14=HEAP32[r15+4];HEAP32[r18+4]=r14;r6=(r14<<2)+r1+164|0;do{if(r14>>>0>3){r3=6375}else{r13=HEAP32[r6>>2];if((r13|0)==0){r3=6375;break}else{r22=r13;break}}}while(0);if(r3==6375){r3=0;HEAP32[HEAP32[r17]+20>>2]=54;HEAP32[HEAP32[r17]+24>>2]=r14;FUNCTION_TABLE[HEAP32[HEAP32[r17]>>2]](r20);r22=HEAP32[r6>>2]}r13=HEAP32[r15+20];L7753:do{if((r13|0)!=0){r9=0;while(1){if(HEAP16[r13+(r9<<1)>>1]<<16>>16!=HEAP16[r22+(r9<<1)>>1]<<16>>16){HEAP32[HEAP32[r17]+20>>2]=45;HEAP32[HEAP32[r17]+24>>2]=r14;FUNCTION_TABLE[HEAP32[HEAP32[r17]>>2]](r20)}r8=r9+1|0;if((r8|0)==64){break L7753}else{r9=r8}}}}while(0);r14=r4+1|0;if((r14|0)<(HEAP32[r5]|0)){r19=r19+88|0,r18=r19>>2;r16=r16+88|0,r15=r16>>2;r4=r14}else{break L7744}}}}while(0);if((HEAP32[r1+284>>2]|0)==0){return}if(HEAP8[r1+288|0]<<24>>24==1){HEAP8[r2+244|0]=1;HEAP8[r2+245|0]=HEAP8[r1+289|0]}HEAP8[r2+246|0]=HEAP8[r1+290|0];HEAP16[r2+248>>1]=HEAP16[r1+292>>1];HEAP16[r2+250>>1]=HEAP16[r1+294>>1];return}function _start_pass_coef700(r1,r2){var r3,r4,r5,r6,r7,r8;r3=r1+400|0;r4=HEAP32[r3>>2];if((r2|0)!=2){r2=r1|0;HEAP32[HEAP32[r2>>2]+20>>2]=3;FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1)}HEAP32[r4+8>>2]=0;r4=HEAP32[r3>>2],r3=r4>>2;if((HEAP32[r1+288>>2]|0)>1){HEAP32[r3+5]=1;r5=r4+12|0,r6=r5>>2;HEAP32[r6]=0;r7=r4+16|0,r8=r7>>2;HEAP32[r8]=0;return}r2=HEAP32[r1+292>>2];if(HEAP32[r3+2]>>>0<(HEAP32[r1+284>>2]-1|0)>>>0){HEAP32[r3+5]=HEAP32[r2+12>>2];r5=r4+12|0,r6=r5>>2;HEAP32[r6]=0;r7=r4+16|0,r8=r7>>2;HEAP32[r8]=0;return}else{HEAP32[r3+5]=HEAP32[r2+76>>2];r5=r4+12|0,r6=r5>>2;HEAP32[r6]=0;r7=r4+16|0,r8=r7>>2;HEAP32[r8]=0;return}}function _compress_output701(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55;r2=0;r3=STACKTOP;STACKTOP=STACKTOP+56|0;r4=r3;r5=r3+16,r6=r5>>2;r7=r1+400|0;r8=HEAP32[r7>>2];r9=r1+308|0;r10=HEAP32[r9>>2]-1|0;r11=r1+284|0;r12=HEAP32[r11>>2]-1|0;r13=(r1+288|0)>>2;L7782:do{if((HEAP32[r13]|0)>0){r14=r1+4|0;r15=r1;r16=r8+24|0;r17=r8+8|0;r18=0;while(1){r19=HEAP32[r1+(r18<<2)+292>>2];r20=HEAP32[HEAP32[r14>>2]+32>>2];r21=HEAP32[HEAP32[r16>>2]+(HEAP32[r19+4>>2]<<2)>>2];r22=HEAP32[r19+12>>2];r19=Math.imul(r22,HEAP32[r17>>2]);HEAP32[r4+(r18<<2)>>2]=FUNCTION_TABLE[r20](r15,r21,r19,r22,0);r22=r18+1|0;if((r22|0)<(HEAP32[r13]|0)){r18=r22}else{break L7782}}}}while(0);r18=r8+16|0;r15=HEAP32[r18>>2];r17=r8+20|0;L7787:do{if((r15|0)<(HEAP32[r17>>2]|0)){r16=(r8+12|0)>>2;r14=r1+420|0;r22=r5|0;r19=r8+8|0;r21=r19;r20=r8+28|0;r23=r15;r24=HEAP32[r16];L7790:while(1){r25=r24;while(1){if(r25>>>0>=HEAP32[r9>>2]>>>0){break}r26=HEAP32[r13];L7795:do{if((r26|0)>0){r27=r25>>>0<r10>>>0;r28=0;r29=0;r30=r26;while(1){r31=HEAP32[r1+(r29<<2)+292>>2];r32=(r31+56|0)>>2;r33=HEAP32[r32];r34=Math.imul(r33,r25);if(r27){r35=r33}else{r35=HEAP32[r31+72>>2]}r36=r31+60|0;if((HEAP32[r36>>2]|0)>0){r37=(r29<<2)+r4|0;r38=(r35|0)>0;r39=r31+76|0;r31=r28;r40=0;r41=r33;while(1){do{if(HEAP32[r21>>2]>>>0<r12>>>0){if(r38){r2=6428;break}else{r42=0;r43=r31;r44=r41;break}}else{if((r40+r23|0)>=(HEAP32[r39>>2]|0)|r38^1){r42=0;r43=r31;r44=r41;break}else{r2=6428;break}}}while(0);if(r2==6428){r2=0;r33=r31;r45=0;r46=(r34<<7)+HEAP32[HEAP32[r37>>2]+(r40+r23<<2)>>2]|0;while(1){HEAP32[(r33<<2>>2)+r6]=r46;r47=r45+1|0;if((r47|0)==(r35|0)){break}else{r33=r33+1|0;r45=r47;r46=r46+128|0}}r42=r35;r43=r35+r31|0;r44=HEAP32[r32]}L7815:do{if((r42|0)<(r44|0)){r46=r43;r45=r42;while(1){r33=HEAP32[r20+(r46<<2)>>2];HEAP32[(r46<<2>>2)+r6]=r33;HEAP16[r33>>1]=HEAP16[HEAP32[(r46-1<<2>>2)+r6]>>1];r33=r46+1|0;r47=r45+1|0;r48=HEAP32[r32];if((r47|0)<(r48|0)){r46=r33;r45=r47}else{r49=r33;r50=r48;break L7815}}}else{r49=r43;r50=r44}}while(0);r45=r40+1|0;if((r45|0)<(HEAP32[r36>>2]|0)){r31=r49;r40=r45;r41=r50}else{break}}r51=r49;r52=HEAP32[r13]}else{r51=r28;r52=r30}r41=r29+1|0;if((r41|0)<(r52|0)){r28=r51;r29=r41;r30=r52}else{break L7795}}}}while(0);if((FUNCTION_TABLE[HEAP32[HEAP32[r14>>2]+4>>2]](r1,r22)|0)==0){break L7790}r25=r25+1|0}HEAP32[r16]=0;r26=r23+1|0;if((r26|0)<(HEAP32[r17>>2]|0)){r23=r26;r24=0}else{r53=r19;r54=r21;break L7787}}HEAP32[r18>>2]=r23;HEAP32[r16]=r25;r55=0;STACKTOP=r3;return r55}else{r21=r8+8|0;r53=r21;r54=r21}}while(0);HEAP32[r53>>2]=HEAP32[r54>>2]+1|0;r54=HEAP32[r7>>2]>>2;do{if((HEAP32[r13]|0)>1){HEAP32[r54+5]=1}else{r7=HEAP32[r1+292>>2];if(HEAP32[r54+2]>>>0<(HEAP32[r11>>2]-1|0)>>>0){HEAP32[r54+5]=HEAP32[r7+12>>2];break}else{HEAP32[r54+5]=HEAP32[r7+76>>2];break}}}while(0);HEAP32[r54+3]=0;HEAP32[r54+4]=0;r55=1;STACKTOP=r3;return r55}function _jpeg_CreateDecompress(r1,r2,r3){var r4,r5,r6,r7,r8;r4=r1>>2;r5=(r1+4|0)>>2;HEAP32[r5]=0;if((r2|0)!=90){r6=(r1|0)>>2;HEAP32[HEAP32[r6]+20>>2]=13;HEAP32[HEAP32[r6]+24>>2]=90;HEAP32[HEAP32[r6]+28>>2]=r2;FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r1)}r6=(r1|0)>>2;if((r3|0)==488){r7=r1}else{HEAP32[HEAP32[r6]+20>>2]=22;HEAP32[HEAP32[r6]+24>>2]=488;HEAP32[HEAP32[r6]+28>>2]=r3;r3=r1;FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r3);r7=r3}r3=HEAP32[r6];r2=r1+12|0;r8=HEAP32[r2>>2];_memset(r1,0,488);HEAP32[r6]=r3;HEAP32[r2>>2]=r8;HEAP32[r4+4]=1;_jinit_memory_mgr(r1);HEAP32[r4+2]=0;HEAP32[r4+6]=0;HEAP32[r4+78]=0;_memset(r1+164|0,0,48);r8=FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r7,0,172),r2=r8>>2;r3=r1+464|0;HEAP32[r3>>2]=r8;HEAP32[r2]=912;HEAP32[r2+1]=1318;HEAP32[r2+2]=1216;HEAP32[r2+7]=574;HEAP32[r2+24]=0;HEAP32[r2+25]=0;HEAP32[r2+9]=574;HEAP32[r2+26]=0;HEAP32[r2+10]=574;HEAP32[r2+27]=0;HEAP32[r2+11]=574;HEAP32[r2+28]=0;HEAP32[r2+12]=574;HEAP32[r2+29]=0;HEAP32[r2+13]=574;HEAP32[r2+30]=0;HEAP32[r2+14]=574;HEAP32[r2+31]=0;HEAP32[r2+15]=574;HEAP32[r2+32]=0;HEAP32[r2+16]=574;HEAP32[r2+33]=0;HEAP32[r2+17]=574;HEAP32[r2+34]=0;HEAP32[r2+18]=574;HEAP32[r2+35]=0;HEAP32[r2+19]=574;HEAP32[r2+36]=0;HEAP32[r2+20]=574;HEAP32[r2+37]=0;HEAP32[r2+21]=574;HEAP32[r2+38]=0;HEAP32[r2+39]=0;HEAP32[r2+23]=574;HEAP32[r2+40]=0;HEAP32[r2+8]=1126;HEAP32[r2+22]=1126;r2=HEAP32[r3>>2]>>2;HEAP32[r4+54]=0;HEAP32[r4+36]=0;HEAP32[r4+110]=0;HEAP32[r2+3]=0;HEAP32[r2+4]=0;HEAP32[r2+6]=0;HEAP32[r2+41]=0;r2=FUNCTION_TABLE[HEAP32[HEAP32[r5]>>2]](r7,0,28),r7=r2>>2;HEAP32[r4+115]=r2;HEAP32[r7]=528;HEAP32[r7+1]=182;HEAP32[r7+2]=500;HEAP32[r7+3]=1242;HEAP32[r7+4]=0;HEAP32[r7+5]=0;HEAP32[r7+6]=1;HEAP32[r4+5]=200;return}function _jpeg_consume_input(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10;r2=r1>>2;r3=(r1+20|0)>>2;r4=HEAP32[r3];if((r4|0)==201){r5=r1+460|0}else if((r4|0)==203|(r4|0)==204|(r4|0)==205|(r4|0)==206|(r4|0)==207|(r4|0)==208|(r4|0)==210){r6=FUNCTION_TABLE[HEAP32[HEAP32[r2+115]>>2]](r1);return r6}else if((r4|0)==202){r6=1;return r6}else if((r4|0)==200){r4=r1+460|0;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]+4>>2]](r1);FUNCTION_TABLE[HEAP32[HEAP32[r2+6]+8>>2]](r1);HEAP32[r3]=201;r5=r4}else{r4=(r1|0)>>2;HEAP32[HEAP32[r4]+20>>2]=21;HEAP32[HEAP32[r4]+24>>2]=HEAP32[r3];FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r1);r6=0;return r6}r4=FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]>>2]](r1);if((r4|0)!=1){r6=r4;return r6}r4=HEAP32[r2+9];if((r4|0)==3){do{if((HEAP32[r2+71]|0)==0){if((HEAP32[r2+74]|0)!=0){r5=r1+300|0;r7=HEAPU8[r5];if((r7|0)==1){HEAP32[r2+10]=3;break}else if((r7|0)==0){HEAP32[r2+10]=2;break}else{r7=(r1|0)>>2;HEAP32[HEAP32[r7]+20>>2]=116;HEAP32[HEAP32[r7]+24>>2]=HEAPU8[r5];FUNCTION_TABLE[HEAP32[HEAP32[r7]+4>>2]](r1,-1);HEAP32[r2+10]=3;break}}r7=HEAP32[r2+54]>>2;r5=HEAP32[r7];r8=HEAP32[r7+22];r9=HEAP32[r7+44];if((r5|0)==1&(r8|0)==2&(r9|0)==3){HEAP32[r2+10]=3;break}if((r5|0)==82&(r8|0)==71&(r9|0)==66){HEAP32[r2+10]=2;break}else{r7=(r1|0)>>2;r10=HEAP32[r7]>>2;HEAP32[r10+6]=r5;HEAP32[r10+7]=r8;HEAP32[r10+8]=r9;HEAP32[HEAP32[r7]+20>>2]=113;FUNCTION_TABLE[HEAP32[HEAP32[r7]+4>>2]](r1,1);HEAP32[r2+10]=3;break}}else{HEAP32[r2+10]=3}}while(0);HEAP32[r2+11]=2}else if((r4|0)==1){HEAP32[r2+10]=1;HEAP32[r2+11]=1}else if((r4|0)==4){do{if((HEAP32[r2+74]|0)==0){HEAP32[r2+10]=4}else{r4=r1+300|0;r7=HEAPU8[r4];if((r7|0)==0){HEAP32[r2+10]=4;break}else if((r7|0)==2){HEAP32[r2+10]=5;break}else{r7=(r1|0)>>2;HEAP32[HEAP32[r7]+20>>2]=116;HEAP32[HEAP32[r7]+24>>2]=HEAPU8[r4];FUNCTION_TABLE[HEAP32[HEAP32[r7]+4>>2]](r1,-1);HEAP32[r2+10]=5;break}}}while(0);HEAP32[r2+11]=4}else{HEAP32[r2+10]=0;HEAP32[r2+11]=0}r7=HEAP32[r2+107];HEAP32[r2+12]=r7;HEAP32[r2+13]=r7;r7=r1+56|0;HEAPF64[tempDoublePtr>>3]=1,HEAP32[r7>>2]=HEAP32[tempDoublePtr>>2],HEAP32[r7+4>>2]=HEAP32[tempDoublePtr+4>>2];HEAP32[r2+16]=0;HEAP32[r2+17]=0;HEAP32[r2+18]=0;HEAP32[r2+19]=1;HEAP32[r2+20]=1;HEAP32[r2+21]=0;HEAP32[r2+22]=2;HEAP32[r2+23]=1;HEAP32[r2+24]=256;HEAP32[r2+34]=0;HEAP32[r2+25]=0;HEAP32[r2+26]=0;HEAP32[r2+27]=0;HEAP32[r3]=202;r6=1;return r6}function _jpeg_finish_decompress(r1){var r2,r3,r4,r5,r6,r7;r2=r1>>2;r3=0;r4=(r1+20|0)>>2;r5=HEAP32[r4];do{if((r5-205|0)>>>0<2){if((HEAP32[r2+16]|0)!=0){r3=6496;break}if(HEAP32[r2+35]>>>0<HEAP32[r2+29]>>>0){r6=r1|0;HEAP32[HEAP32[r6>>2]+20>>2]=69;FUNCTION_TABLE[HEAP32[HEAP32[r6>>2]>>2]](r1)}FUNCTION_TABLE[HEAP32[HEAP32[r2+111]+4>>2]](r1);HEAP32[r4]=210;break}else{r3=6496}}while(0);do{if(r3==6496){if((r5|0)==207){HEAP32[r4]=210;break}else if((r5|0)==210){break}else{r6=(r1|0)>>2;HEAP32[HEAP32[r6]+20>>2]=21;HEAP32[HEAP32[r6]+24>>2]=HEAP32[r4];FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r1);break}}}while(0);r5=r1+460|0;while(1){r6=HEAP32[r5>>2];if((HEAP32[r6+20>>2]|0)!=0){break}if((FUNCTION_TABLE[HEAP32[r6>>2]](r1)|0)==0){r7=0;r3=6508;break}}if(r3==6508){return r7}FUNCTION_TABLE[HEAP32[HEAP32[r2+6]+24>>2]](r1);r3=HEAP32[r2+1];if((r3|0)==0){r7=1;return r7}FUNCTION_TABLE[HEAP32[r3+36>>2]](r1,1);if((HEAP32[r2+4]|0)==0){HEAP32[r4]=100;r7=1;return r7}else{HEAP32[r4]=200;HEAP32[r2+78]=0;r7=1;return r7}}function _jpeg_start_decompress(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11;r2=0;r3=(r1+20|0)>>2;r4=HEAP32[r3];do{if((r4|0)==202){_jinit_master_decompress(r1);if((HEAP32[r1+64>>2]|0)==0){HEAP32[r3]=203;r2=6515;break}HEAP32[r3]=207;r5=1;return r5}else if((r4|0)==203){r2=6515}else if((r4|0)!=204){r6=(r1|0)>>2;HEAP32[HEAP32[r6]+20>>2]=21;HEAP32[HEAP32[r6]+24>>2]=HEAP32[r3];FUNCTION_TABLE[HEAP32[HEAP32[r6]>>2]](r1);break}}while(0);if(r2==6515){r2=r1+460|0;L7925:do{if((HEAP32[HEAP32[r2>>2]+16>>2]|0)!=0){r3=(r1+8|0)>>2;r4=r1+332|0;r6=r1;L7927:while(1){r7=HEAP32[r3];while(1){if((r7|0)!=0){FUNCTION_TABLE[HEAP32[r7>>2]](r6)}r8=FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r1);if((r8|0)==2){break L7925}else if((r8|0)==0){r5=0;break L7927}r9=HEAP32[r3];if((r9|0)==0){r7=0;continue}if(!((r8|0)==3|(r8|0)==1)){continue L7927}r8=r9+4|0;r9=HEAP32[r8>>2]+1|0;HEAP32[r8>>2]=r9;r8=HEAP32[r3];r10=r8+8|0;r11=HEAP32[r10>>2];if((r9|0)<(r11|0)){r7=r8}else{break}}HEAP32[r10>>2]=HEAP32[r4>>2]+r11|0}return r5}}while(0);HEAP32[r1+152>>2]=HEAP32[r1+144>>2]}r5=_output_pass_setup(r1);return r5}function _output_pass_setup(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13;r2=(r1+20|0)>>2;r3=(r1+444|0)>>2;if((HEAP32[r2]|0)!=204){FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r1);HEAP32[r1+140>>2]=0;HEAP32[r2]=204}L7946:do{if((HEAP32[HEAP32[r3]+8>>2]|0)!=0){r4=r1+140|0,r5=r4>>2;r6=r1+116|0;r7=(r1+8|0)>>2;r8=r1+448|0;r9=r1;r10=HEAP32[r5];while(1){if(r10>>>0>=HEAP32[r6>>2]>>>0){FUNCTION_TABLE[HEAP32[HEAP32[r3]+4>>2]](r1);FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r1);HEAP32[r5]=0;if((HEAP32[HEAP32[r3]+8>>2]|0)==0){break L7946}else{r10=0;continue}}r11=HEAP32[r7];if((r11|0)==0){r12=r10}else{HEAP32[r11+4>>2]=r10;HEAP32[HEAP32[r7]+8>>2]=HEAP32[r6>>2];FUNCTION_TABLE[HEAP32[HEAP32[r7]>>2]](r9);r12=HEAP32[r5]}FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]+4>>2]](r1,0,r4,0);r11=HEAP32[r5];if((r11|0)==(r12|0)){r13=0;break}else{r10=r11}}return r13}}while(0);HEAP32[r2]=(HEAP32[r1+68>>2]|0)!=0?206:205;r13=1;return r13}function _jinit_arith_decoder(r1){var r2,r3,r4,r5,r6;r2=r1+4|0;r3=r1;r4=FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r3,1,188),r5=r4>>2;HEAP32[r1+468>>2]=r4;HEAP32[r5]=1080;HEAP32[r5+14]=0;HEAP32[r5+30]=0;HEAP32[r5+15]=0;HEAP32[r5+31]=0;HEAP32[r5+16]=0;HEAP32[r5+32]=0;HEAP32[r5+17]=0;HEAP32[r5+33]=0;HEAP32[r5+18]=0;HEAP32[r5+34]=0;HEAP32[r5+19]=0;HEAP32[r5+35]=0;HEAP32[r5+20]=0;HEAP32[r5+36]=0;HEAP32[r5+21]=0;HEAP32[r5+37]=0;HEAP32[r5+22]=0;HEAP32[r5+38]=0;HEAP32[r5+23]=0;HEAP32[r5+39]=0;HEAP32[r5+24]=0;HEAP32[r5+40]=0;HEAP32[r5+25]=0;HEAP32[r5+41]=0;HEAP32[r5+26]=0;HEAP32[r5+42]=0;HEAP32[r5+27]=0;HEAP32[r5+43]=0;HEAP32[r5+28]=0;HEAP32[r5+44]=0;HEAP32[r5+29]=0;HEAP32[r5+45]=0;HEAP8[r4+184|0]=113;if((HEAP32[r1+224>>2]|0)==0){return}r4=(r1+36|0)>>2;r5=FUNCTION_TABLE[HEAP32[HEAP32[r2>>2]>>2]](r3,1,HEAP32[r4]<<8);HEAP32[r1+160>>2]=r5;if((HEAP32[r4]|0)>0){r6=0}else{return}while(1){_memset((r6<<8)+r5|0,-1,256);r1=r6+1|0;if((r1|0)<(HEAP32[r4]|0)){r6=r1}else{break}}return}function _start_pass703(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35;r2=r1>>2;r3=0;r4=HEAP32[r2+117];r5=(r1+224|0)>>2;r6=(r1+412|0)>>2;r7=HEAP32[r6];r8=(r7|0)==0;do{if((HEAP32[r5]|0)==0){do{if(r8){if((HEAP32[r2+105]|0)!=0){r3=6586;break}if((HEAP32[r2+106]|0)!=0){r3=6586;break}r9=HEAP32[r2+104];if((r9|0)>=64){break}if((r9|0)==(HEAP32[r2+109]|0)){break}else{r3=6586;break}}else{r3=6586}}while(0);if(r3==6586){r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=125;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]+4>>2]](r1,-1)}HEAP32[r4+4>>2]=708;r10=r1+340|0}else{r9=(r1+416|0)>>2;r11=HEAP32[r9];do{if(r8){if((r11|0)==0){r3=6558;break}else{r3=6562;break}}else{if((r11|0)<(r7|0)){r3=6562;break}if((r11|0)>(HEAP32[r2+109]|0)){r3=6562;break}if((HEAP32[r2+85]|0)==1){r3=6558;break}else{r3=6562;break}}}while(0);do{if(r3==6558){r11=HEAP32[r2+105];if((r11|0)==0){r12=HEAP32[r2+106]}else{r13=r11-1|0;if((r13|0)==(HEAP32[r2+106]|0)){r12=r13}else{r3=6562;break}}if((r12|0)>13){r3=6562;break}else{break}}}while(0);if(r3==6562){r13=(r1|0)>>2;HEAP32[HEAP32[r13]+20>>2]=17;HEAP32[HEAP32[r13]+24>>2]=HEAP32[r6];HEAP32[HEAP32[r13]+28>>2]=HEAP32[r9];HEAP32[HEAP32[r13]+32>>2]=HEAP32[r2+105];HEAP32[HEAP32[r13]+36>>2]=HEAP32[r2+106];FUNCTION_TABLE[HEAP32[HEAP32[r13]>>2]](r1)}r13=r1+340|0;L7994:do{if((HEAP32[r13>>2]|0)>0){r11=r1+160|0;r14=r1+420|0;r15=r1+424|0;r16=(r1|0)>>2;r17=r1;r18=0;while(1){r19=HEAP32[HEAP32[((r18<<2)+344>>2)+r2]+4>>2];r20=HEAP32[r11>>2];r21=HEAP32[r6];do{if((r21|0)==0){r22=0}else{if((HEAP32[r20+(r19<<8)>>2]|0)>=0){r22=r21;break}HEAP32[HEAP32[r16]+20>>2]=118;HEAP32[HEAP32[r16]+24>>2]=r19;HEAP32[HEAP32[r16]+28>>2]=0;FUNCTION_TABLE[HEAP32[HEAP32[r16]+4>>2]](r17,-1);r22=HEAP32[r6]}}while(0);L8003:do{if((r22|0)<=(HEAP32[r9]|0)){r21=r22;while(1){r23=(r19<<8)+(r21<<2)+r20|0;r24=HEAP32[r23>>2];if((HEAP32[r14>>2]|0)!=(((r24|0)<0?0:r24)|0)){HEAP32[HEAP32[r16]+20>>2]=118;HEAP32[HEAP32[r16]+24>>2]=r19;HEAP32[HEAP32[r16]+28>>2]=r21;FUNCTION_TABLE[HEAP32[HEAP32[r16]+4>>2]](r17,-1)}HEAP32[r23>>2]=HEAP32[r15>>2];r23=r21+1|0;if((r23|0)>(HEAP32[r9]|0)){break L8003}else{r21=r23}}}}while(0);r19=r18+1|0;if((r19|0)<(HEAP32[r13>>2]|0)){r18=r19}else{r25=r14;break L7994}}}else{r25=r1+420|0}}while(0);r9=(HEAP32[r6]|0)==0;r14=(r4+4|0)>>2;if((HEAP32[r25>>2]|0)==0){if(r9){HEAP32[r14]=1228;r10=r13;break}else{HEAP32[r14]=664;r10=r13;break}}else{if(r9){HEAP32[r14]=242;r10=r13;break}else{HEAP32[r14]=382;r10=r13;break}}}}while(0);if((HEAP32[r10>>2]|0)<=0){r26=r4+8|0;HEAP32[r26>>2]=0;r27=r4+12|0;HEAP32[r27>>2]=0;r28=r4+16|0;HEAP32[r28>>2]=-16;r29=r1+280|0;r30=HEAP32[r29>>2];r31=r4+52|0;r32=r30;HEAP32[r31>>2]=r32;return}r25=(r1|0)>>2;r22=r1;r12=r4+56|0;r7=r1+4|0;r8=r4+20|0;r14=r4+36|0;r9=r1+436|0;r18=r4+120|0;r15=r1+420|0;r17=0;while(1){r16=HEAP32[((r17<<2)+344>>2)+r2];r11=HEAP32[r5];do{if((r11|0)==0){r3=6593}else{if((HEAP32[r6]|0)!=0){r33=r11;break}if((HEAP32[r15>>2]|0)==0){r3=6593;break}else{r33=r11;break}}}while(0);if(r3==6593){r3=0;r11=HEAP32[r16+20>>2];if(r11>>>0>15){HEAP32[HEAP32[r25]+20>>2]=50;HEAP32[HEAP32[r25]+24>>2]=r11;FUNCTION_TABLE[HEAP32[HEAP32[r25]>>2]](r22)}r13=(r11<<2)+r12|0;r11=HEAP32[r13>>2];if((r11|0)==0){r19=FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r22,1,64);HEAP32[r13>>2]=r19;r34=r19}else{r34=r11}_memset(r34,0,64);HEAP32[r8+(r17<<2)>>2]=0;HEAP32[r14+(r17<<2)>>2]=0;r33=HEAP32[r5]}do{if((r33|0)==0){if((HEAP32[r9>>2]|0)==0){break}else{r3=6601;break}}else{if((HEAP32[r6]|0)==0){break}else{r3=6601;break}}}while(0);if(r3==6601){r3=0;r11=HEAP32[r16+24>>2];if(r11>>>0>15){HEAP32[HEAP32[r25]+20>>2]=50;HEAP32[HEAP32[r25]+24>>2]=r11;FUNCTION_TABLE[HEAP32[HEAP32[r25]>>2]](r22)}r19=(r11<<2)+r18|0;r11=HEAP32[r19>>2];if((r11|0)==0){r13=FUNCTION_TABLE[HEAP32[HEAP32[r7>>2]>>2]](r22,1,256);HEAP32[r19>>2]=r13;r35=r13}else{r35=r11}_memset(r35,0,256)}r11=r17+1|0;if((r11|0)<(HEAP32[r10>>2]|0)){r17=r11}else{break}}r26=r4+8|0;HEAP32[r26>>2]=0;r27=r4+12|0;HEAP32[r27>>2]=0;r28=r4+16|0;HEAP32[r28>>2]=-16;r29=r1+280|0;r30=HEAP32[r29>>2];r31=r4+52|0;r32=r30;HEAP32[r31>>2]=r32;return}function _decode_mcu_DC_first(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25;r3=0;r4=HEAP32[r1+468>>2];if((HEAP32[r1+280>>2]|0)!=0){r5=r4+52|0;r6=r5;r7=HEAP32[r6>>2];if((r7|0)==0){_process_restart(r1);r8=HEAP32[r6>>2]}else{r8=r7}HEAP32[r5>>2]=r8-1|0}r8=r4+16|0;if((HEAP32[r8>>2]|0)==-1){return 1}r5=r1+368|0;if((HEAP32[r5>>2]|0)<=0){return 1}r7=r4+56|0;r6=r4+36|0;r9=r4+20|0;r4=r1+424|0;r10=0;L8064:while(1){r11=HEAP32[r2+(r10<<2)>>2];r12=HEAP32[r1+(r10<<2)+372>>2];r13=HEAP32[HEAP32[r1+(r12<<2)+344>>2]+20>>2];r14=(r13<<2)+r7|0;r15=HEAP32[r14>>2];r16=((r12<<2)+r6|0)>>2;r17=HEAP32[r16];if((_arith_decode(r1,r15+r17|0)|0)==0){HEAP32[r16]=0;r18=HEAP32[r9+(r12<<2)>>2]}else{r19=_arith_decode(r1,r17+(r15+1)|0);r20=r19+(r15+(r17+2))|0;r17=_arith_decode(r1,r20);L8069:do{if((r17|0)==0){r21=0;r22=r20}else{r15=r17;r23=HEAP32[r14>>2]+20|0;while(1){if((_arith_decode(r1,r23)|0)==0){r21=r15;r22=r23;break L8069}r24=r15<<1;if((r24|0)==32768){break L8064}else{r15=r24;r23=r23+1|0}}}}while(0);do{if((r21|0)<(1<<HEAPU8[r1+(r13+232)|0]>>1|0)){HEAP32[r16]=0}else{r14=r19<<2;if((r21|0)>(1<<HEAPU8[r1+(r13+248)|0]>>1|0)){HEAP32[r16]=r14+12|0;break}else{HEAP32[r16]=r14+4|0;break}}}while(0);r16=r22+14|0;r13=r21>>1;L8082:do{if((r13|0)==0){r25=r21}else{r14=r21;r17=r13;while(1){r20=((_arith_decode(r1,r16)|0)==0?0:r17)|r14;r23=r17>>1;if((r23|0)==0){r25=r20;break L8082}else{r14=r20;r17=r23}}}}while(0);r16=(r12<<2)+r9|0;r13=HEAP32[r16>>2]+((r19|0)==0?r25+1|0:r25^-1)|0;HEAP32[r16>>2]=r13;r18=r13}HEAP16[r11>>1]=r18<<HEAP32[r4>>2]&65535;r13=r10+1|0;if((r13|0)<(HEAP32[r5>>2]|0)){r10=r13}else{r3=6635;break}}if(r3==6635){return 1}r3=r1|0;HEAP32[HEAP32[r3>>2]+20>>2]=117;FUNCTION_TABLE[HEAP32[HEAP32[r3>>2]+4>>2]](r1,-1);HEAP32[r8>>2]=-1;return 1}function _decode_mcu_AC_first(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25;r3=r1>>2;r4=0;r5=HEAP32[r3+117];if((HEAP32[r3+70]|0)!=0){r6=r5+52|0;r7=r6;r8=HEAP32[r7>>2];if((r8|0)==0){_process_restart(r1);r9=HEAP32[r7>>2]}else{r9=r8}HEAP32[r6>>2]=r9-1|0}r9=(r5+16|0)>>2;if((HEAP32[r9]|0)==-1){return 1}r6=HEAP32[r3+108];r8=HEAP32[r2>>2];r2=HEAP32[HEAP32[r3+86]+24>>2];r7=(r2<<2)+r5+120|0;r10=r1+416|0;r11=r5+184|0;r5=r1+424|0;r12=r1+(r2+264)|0;r2=HEAP32[r3+103]-1|0;L8101:while(1){r3=HEAP32[r7>>2]+(r2*3&-1)|0;if((_arith_decode(r1,r3)|0)==0){r13=r2;r14=r3}else{r4=6658;break}while(1){r15=r13+1|0;if((_arith_decode(r1,r14+1|0)|0)!=0){break}if((r15|0)<(HEAP32[r10>>2]|0)){r13=r15;r14=r14+3|0}else{r4=6647;break L8101}}r3=_arith_decode(r1,r11);r16=r14+2|0;r17=_arith_decode(r1,r16);L8107:do{if((r17|0)==0){r18=0}else{L8109:do{if((_arith_decode(r1,r16)|0)==0){r19=r17;r20=r16}else{r21=r17<<1;r22=HEAP32[r7>>2]+((r15|0)<=(HEAPU8[r12]|0)?189:217)|0;while(1){if((_arith_decode(r1,r22)|0)==0){r19=r21;r20=r22;break L8109}r23=r21<<1;if((r23|0)==32768){r4=6653;break L8101}else{r21=r23;r22=r22+1|0}}}}while(0);r22=r20+14|0;r21=r19>>1;if((r21|0)==0){r18=r19;break}else{r24=r19;r25=r21}while(1){r21=((_arith_decode(r1,r22)|0)==0?0:r25)|r24;r23=r25>>1;if((r23|0)==0){r18=r21;break L8107}else{r24=r21;r25=r23}}}}while(0);HEAP16[r8+(HEAP32[r6+(r15<<2)>>2]<<1)>>1]=((r3|0)==0?r18+1|0:r18^-1)<<HEAP32[r5>>2]&65535;if((r15|0)<(HEAP32[r10>>2]|0)){r2=r15}else{r4=6660;break}}if(r4==6647){r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=117;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]+4>>2]](r1,-1);HEAP32[r9]=-1;return 1}else if(r4==6660){return 1}else if(r4==6653){r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=117;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]+4>>2]](r1,-1);HEAP32[r9]=-1;return 1}else if(r4==6658){return 1}}function _decode_mcu_DC_refine(r1,r2){var r3,r4,r5,r6,r7,r8;r3=HEAP32[r1+468>>2];if((HEAP32[r1+280>>2]|0)!=0){r4=r3+52|0;r5=r4;r6=HEAP32[r5>>2];if((r6|0)==0){_process_restart(r1);r7=HEAP32[r5>>2]}else{r7=r6}HEAP32[r4>>2]=r7-1|0}r7=r3+184|0;r3=1<<HEAP32[r1+424>>2];r4=r1+368|0;if((HEAP32[r4>>2]|0)>0){r8=0}else{return 1}while(1){if((_arith_decode(r1,r7)|0)!=0){r6=HEAP32[r2+(r8<<2)>>2]|0;HEAP16[r6>>1]=(HEAPU16[r6>>1]|r3)&65535}r6=r8+1|0;if((r6|0)<(HEAP32[r4>>2]|0)){r8=r6}else{break}}return 1}function _decode_mcu_AC_refine(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20;r3=r1>>2;r4=0;r5=HEAP32[r3+117];if((HEAP32[r3+70]|0)!=0){r6=r5+52|0;r7=r6;r8=HEAP32[r7>>2];if((r8|0)==0){_process_restart(r1);r9=HEAP32[r7>>2]}else{r9=r8}HEAP32[r6>>2]=r9-1|0}r9=r5+16|0;if((HEAP32[r9>>2]|0)==-1){return 1}r6=HEAP32[r3+108];r8=HEAP32[r2>>2];r2=HEAP32[HEAP32[r3+86]+24>>2];r7=HEAP32[r3+106];r10=1<<r7;r11=-1<<r7;r7=(r1+416|0)>>2;r12=HEAP32[r7];while(1){if(HEAP16[r8+(HEAP32[r6+(r12<<2)>>2]<<1)>>1]<<16>>16!=0){r13=r12;break}r14=r12-1|0;if((r14|0)==0){r13=0;break}else{r12=r14}}r12=(r2<<2)+r5+120|0;r2=r5+184|0;r5=r10&65535;r14=r11&65535;r15=HEAP32[r3+103]-1|0;L8154:while(1){r3=HEAP32[r12>>2]+(r15*3&-1)|0;do{if((r15|0)<(r13|0)){r16=r3;r17=r15}else{if((_arith_decode(r1,r3)|0)==0){r16=r3;r17=r15;break}else{r4=6700;break L8154}}}while(0);while(1){r18=r17+1|0;r19=((HEAP32[r6+(r18<<2)>>2]<<1)+r8|0)>>1;if(HEAP16[r19]<<16>>16!=0){r4=6686;break}if((_arith_decode(r1,r16+1|0)|0)!=0){r4=6691;break}if((r18|0)<(HEAP32[r7]|0)){r16=r16+3|0;r17=r18}else{r4=6695;break L8154}}do{if(r4==6691){r4=0;if((_arith_decode(r1,r2)|0)==0){HEAP16[r19]=r5;break}else{HEAP16[r19]=r14;break}}else if(r4==6686){r4=0;if((_arith_decode(r1,r16+2|0)|0)==0){break}r3=HEAP16[r19];r20=r3<<16>>16;if(r3<<16>>16<0){HEAP16[r19]=r20+r11&65535;break}else{HEAP16[r19]=r20+r10&65535;break}}}while(0);if((r18|0)<(HEAP32[r7]|0)){r15=r18}else{r4=6698;break}}if(r4==6700){return 1}else if(r4==6695){r18=r1|0;HEAP32[HEAP32[r18>>2]+20>>2]=117;FUNCTION_TABLE[HEAP32[HEAP32[r18>>2]+4>>2]](r1,-1);HEAP32[r9>>2]=-1;return 1}else if(r4==6698){return 1}}function _decode_mcu(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39;r3=r1>>2;r4=0;r5=HEAP32[r3+117];if((HEAP32[r3+70]|0)!=0){r6=r5+52|0;r7=r6;r8=HEAP32[r7>>2];if((r8|0)==0){_process_restart(r1);r9=HEAP32[r7>>2]}else{r9=r8}HEAP32[r6>>2]=r9-1|0}r9=(r5+16|0)>>2;if((HEAP32[r9]|0)==-1){return 1}r6=HEAP32[r3+108];r8=r1+368|0;if((HEAP32[r8>>2]|0)<=0){return 1}r7=r5+56|0;r10=r5+36|0;r11=r5+20|0;r12=(r1+436|0)>>2;r13=r5+120|0;r14=r5+184|0;r5=0;L8191:while(1){r15=HEAP32[r2+(r5<<2)>>2];r16=HEAP32[((r5<<2)+372>>2)+r3];r17=HEAP32[((r16<<2)+344>>2)+r3];r18=HEAP32[r17+20>>2];r19=(r18<<2)+r7|0;r20=HEAP32[r19>>2];r21=((r16<<2)+r10|0)>>2;r22=HEAP32[r21];if((_arith_decode(r1,r20+r22|0)|0)==0){HEAP32[r21]=0;r23=HEAP32[r11+(r16<<2)>>2]}else{r24=_arith_decode(r1,r22+(r20+1)|0);r25=r24+(r20+(r22+2))|0;r22=_arith_decode(r1,r25);L8195:do{if((r22|0)==0){r26=0;r27=r25}else{r20=r22;r28=HEAP32[r19>>2]+20|0;while(1){if((_arith_decode(r1,r28)|0)==0){r26=r20;r27=r28;break L8195}r29=r20<<1;if((r29|0)==32768){r4=6715;break L8191}else{r20=r29;r28=r28+1|0}}}}while(0);do{if((r26|0)<(1<<HEAPU8[r1+(r18+232)|0]>>1|0)){HEAP32[r21]=0}else{r19=r24<<2;if((r26|0)>(1<<HEAPU8[r1+(r18+248)|0]>>1|0)){HEAP32[r21]=r19+12|0;break}else{HEAP32[r21]=r19+4|0;break}}}while(0);r21=r27+14|0;r18=r26>>1;L8208:do{if((r18|0)==0){r30=r26}else{r19=r26;r22=r18;while(1){r25=((_arith_decode(r1,r21)|0)==0?0:r22)|r19;r28=r22>>1;if((r28|0)==0){r30=r25;break L8208}else{r19=r25;r22=r28}}}}while(0);r21=(r16<<2)+r11|0;r18=HEAP32[r21>>2]+((r24|0)==0?r30+1|0:r30^-1)|0;HEAP32[r21>>2]=r18;r23=r18}HEAP16[r15>>1]=r23&65535;L8214:do{if((HEAP32[r12]|0)!=0){r18=HEAP32[r17+24>>2];r21=(r18<<2)+r13|0;r22=r1+(r18+264)|0;r18=0;while(1){r19=HEAP32[r21>>2]+(r18*3&-1)|0;if((_arith_decode(r1,r19)|0)==0){r31=r18;r32=r19}else{break L8214}while(1){r33=r31+1|0;if((_arith_decode(r1,r32+1|0)|0)!=0){break}if((r33|0)<(HEAP32[r12]|0)){r31=r33;r32=r32+3|0}else{r4=6729;break L8191}}r19=_arith_decode(r1,r14);r28=r32+2|0;r25=_arith_decode(r1,r28);L8222:do{if((r25|0)==0){r34=0}else{L8224:do{if((_arith_decode(r1,r28)|0)==0){r35=r25;r36=r28}else{r20=r25<<1;r29=HEAP32[r21>>2]+((r33|0)<=(HEAPU8[r22]|0)?189:217)|0;while(1){if((_arith_decode(r1,r29)|0)==0){r35=r20;r36=r29;break L8224}r37=r20<<1;if((r37|0)==32768){r4=6735;break L8191}else{r20=r37;r29=r29+1|0}}}}while(0);r29=r36+14|0;r20=r35>>1;if((r20|0)==0){r34=r35;break}else{r38=r35;r39=r20}while(1){r20=((_arith_decode(r1,r29)|0)==0?0:r39)|r38;r37=r39>>1;if((r37|0)==0){r34=r20;break L8222}else{r38=r20;r39=r37}}}}while(0);HEAP16[r15+(HEAP32[r6+(r33<<2)>>2]<<1)>>1]=((r19|0)==0?r34+1|0:r34^65535)&65535;if((r33|0)<(HEAP32[r12]|0)){r18=r33}else{break L8214}}}}while(0);r15=r5+1|0;if((r15|0)<(HEAP32[r8>>2]|0)){r5=r15}else{r4=6741;break}}if(r4==6741){return 1}else if(r4==6729){r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=117;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]+4>>2]](r1,-1);HEAP32[r9]=-1;return 1}else if(r4==6735){r5=r1|0;HEAP32[HEAP32[r5>>2]+20>>2]=117;FUNCTION_TABLE[HEAP32[HEAP32[r5>>2]+4>>2]](r1,-1);HEAP32[r9]=-1;return 1}else if(r4==6715){r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=117;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]+4>>2]](r1,-1);HEAP32[r9]=-1;return 1}}function _process_restart(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23;r2=0;r3=HEAP32[r1+468>>2];if((FUNCTION_TABLE[HEAP32[HEAP32[r1+464>>2]+8>>2]](r1)|0)==0){r4=r1|0;HEAP32[HEAP32[r4>>2]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r4>>2]>>2]](r1)}r4=r1+340|0;if((HEAP32[r4>>2]|0)<=0){r5=r3+8|0;HEAP32[r5>>2]=0;r6=r3+12|0;HEAP32[r6>>2]=0;r7=r3+16|0;HEAP32[r7>>2]=-16;r8=r1+280|0;r9=HEAP32[r8>>2];r10=r3+52|0;r11=r9;HEAP32[r10>>2]=r11;return}r12=r1+224|0;r13=r3+56|0;r14=r3+20|0;r15=r3+36|0;r16=r1+436|0;r17=r1+412|0;r18=r3+120|0;r19=r1+420|0;r20=0;while(1){r21=HEAP32[r1+(r20<<2)+344>>2];r22=HEAP32[r12>>2];do{if((r22|0)==0){r2=6754}else{if((HEAP32[r17>>2]|0)!=0){r23=r22;break}if((HEAP32[r19>>2]|0)==0){r2=6754;break}else{r23=r22;break}}}while(0);if(r2==6754){r2=0;_memset(HEAP32[r13+(HEAP32[r21+20>>2]<<2)>>2],0,64);HEAP32[r14+(r20<<2)>>2]=0;HEAP32[r15+(r20<<2)>>2]=0;r23=HEAP32[r12>>2]}do{if((r23|0)==0){if((HEAP32[r16>>2]|0)==0){break}else{r2=6758;break}}else{if((HEAP32[r17>>2]|0)==0){break}else{r2=6758;break}}}while(0);if(r2==6758){r2=0;_memset(HEAP32[r18+(HEAP32[r21+24>>2]<<2)>>2],0,256)}r22=r20+1|0;if((r22|0)<(HEAP32[r4>>2]|0)){r20=r22}else{break}}r5=r3+8|0;HEAP32[r5>>2]=0;r6=r3+12|0;HEAP32[r6>>2]=0;r7=r3+16|0;HEAP32[r7>>2]=-16;r8=r1+280|0;r9=HEAP32[r8>>2];r10=r3+52|0;r11=r9;HEAP32[r10>>2]=r11;return}function _arith_decode(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33;r3=HEAP32[r1+468>>2];r4=r3+12|0,r5=r4>>2;r6=r4;r4=HEAP32[r6>>2];r7=r3+16|0;r8=r7>>2;L8265:do{if((r4|0)<32768){r9=(r7|0)>>2;r10=r1+440|0;r11=r1+24|0;r12=(r1|0)>>2;r13=r1;r14=r3+8|0;r15=r14;r16=r14|0;r17=HEAP32[r8];while(1){r18=r17-1|0;HEAP32[r9]=r18;do{if((r18|0)<0){L8272:do{if((HEAP32[r10>>2]|0)==0){r19=HEAP32[r11>>2];r20=(r19+4|0)>>2;do{if((HEAP32[r20]|0)==0){if((FUNCTION_TABLE[HEAP32[r19+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r12]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r12]>>2]](r13)}}while(0);HEAP32[r20]=HEAP32[r20]-1|0;r21=r19|0;r22=HEAP32[r21>>2];HEAP32[r21>>2]=r22+1|0;r21=HEAP8[r22];if(r21<<24>>24!=-1){r23=r21&255;break}while(1){r21=HEAP32[r11>>2];r22=(r21+4|0)>>2;do{if((HEAP32[r22]|0)==0){if((FUNCTION_TABLE[HEAP32[r21+12>>2]](r1)|0)!=0){break}HEAP32[HEAP32[r12]+20>>2]=25;FUNCTION_TABLE[HEAP32[HEAP32[r12]>>2]](r13)}}while(0);HEAP32[r22]=HEAP32[r22]-1|0;r24=r21|0;r25=HEAP32[r24>>2];HEAP32[r24>>2]=r25+1|0;r26=HEAPU8[r25];if((r26|0)==0){r23=255;break L8272}else if((r26|0)!=255){break}}HEAP32[r10>>2]=r26;r23=0}else{r23=0}}while(0);HEAP32[r16>>2]=HEAP32[r15>>2]<<8|r23;r19=HEAP32[r8];r20=r19+8|0;HEAP32[r9]=r20;if((r20|0)>=0){r27=r20;break}r20=r19+9|0;HEAP32[r9]=r20;if((r20|0)!=0){r27=r20;break}HEAP32[r5]=32768;r27=0}else{r27=r18}}while(0);r18=HEAP32[r6>>2]<<1;HEAP32[r5]=r18;if((r18|0)<32768){r17=r27}else{r28=r18;r29=r27;r30=r14;r31=r15;break L8265}}}else{r15=r3+8|0;r28=r4;r29=HEAP32[r8];r30=r15;r31=r15}}while(0);r8=HEAPU8[r2];r4=HEAP32[((r8&127)<<2)+5246904>>2];r3=r4>>8;r27=r4>>16;r6=r28-r27|0;HEAP32[r5]=r6;r28=r6<<r29;r29=HEAP32[r31>>2];if((r29|0)>=(r28|0)){HEAP32[r30>>2]=r29-r28|0;HEAP32[r5]=r27;r5=r8&128;if((r6|0)<(r27|0)){HEAP8[r2]=(r5^r3)&255;r32=r8;r33=r32>>7;return r33}else{HEAP8[r2]=(r5^r4)&255;r32=r8^128;r33=r32>>7;return r33}}if((r6|0)>=32768){r32=r8;r33=r32>>7;return r33}r5=r8&128;if((r6|0)<(r27|0)){HEAP8[r2]=(r5^r4)&255;r32=r8^128;r33=r32>>7;return r33}else{HEAP8[r2]=(r5^r3)&255;r32=r8;r33=r32>>7;return r33}}function _dummy_consume_data(r1){return 0}function _start_input_pass(r1){var r2,r3;r2=r1>>2;HEAP32[r2+37]=0;r1=HEAP32[r2+113]>>2;do{if((HEAP32[r2+85]|0)>1){HEAP32[r1+7]=1}else{r3=HEAP32[r2+86];if((HEAP32[r2+83]|0)==1){HEAP32[r1+7]=HEAP32[r3+76>>2];break}else{HEAP32[r1+7]=HEAP32[r3+12>>2];break}}}while(0);HEAP32[r1+5]=0;HEAP32[r1+6]=0;return}function _jinit_d_coef_controller(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18;r3=(r1+4|0)>>2;r4=r1;r5=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,116),r6=r5>>2;HEAP32[r1+452>>2]=r5;HEAP32[r6]=524;HEAP32[r6+2]=618;HEAP32[r6+28]=0;if((r2|0)==0){r2=FUNCTION_TABLE[HEAP32[HEAP32[r3]+4>>2]](r4,1,1280);HEAP32[r6+8]=r2;HEAP32[r6+9]=r2+128|0;HEAP32[r6+10]=r2+256|0;HEAP32[r6+11]=r2+384|0;HEAP32[r6+12]=r2+512|0;HEAP32[r6+13]=r2+640|0;HEAP32[r6+14]=r2+768|0;HEAP32[r6+15]=r2+896|0;HEAP32[r6+16]=r2+1024|0;HEAP32[r6+17]=r2+1152|0;if((HEAP32[r1+436>>2]|0)==0){_memset(r2,0,1280)}HEAP32[r6+1]=502;HEAP32[r6+3]=588;HEAP32[r6+4]=0;return}r2=r1+36|0;L8325:do{if((HEAP32[r2>>2]|0)>0){r7=r1+224|0;r8=r5+72|0;r9=r8;r10=HEAP32[r1+216>>2],r11=r10>>2;r12=0;while(1){r13=HEAP32[r11+3];if((HEAP32[r7>>2]|0)==0){r14=r13}else{r14=r13*3&-1}r15=HEAP32[r11+2];r16=HEAP32[r11+7]-1+r15|0;r17=HEAP32[r11+8]-1+r13|0;HEAP32[r9+(r12<<2)>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3]+20>>2]](r4,1,1,r16-(r16|0)%(r15|0)|0,r17-(r17|0)%(r13|0)|0,r14);r13=r12+1|0;if((r13|0)<(HEAP32[r2>>2]|0)){r10=r10+88|0,r11=r10>>2;r12=r13}else{r18=r8;break L8325}}}else{r18=r5+72|0}}while(0);HEAP32[r6+1]=1050;HEAP32[r6+3]=246;HEAP32[r6+4]=r18;return}function _start_output_pass(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19;r2=r1>>2;r3=HEAP32[r2+113],r4=r3>>2;if((HEAP32[r4+4]|0)==0){r5=r1+156|0,r6=r5>>2;HEAP32[r6]=0;return}L8339:do{if((HEAP32[r2+20]|0)!=0){if((HEAP32[r2+56]|0)==0){break}r7=r1+160|0;if((HEAP32[r7>>2]|0)==0){break}r8=r3+112|0;r9=HEAP32[r8>>2];if((r9|0)==0){r10=r1+36|0;r11=FUNCTION_TABLE[HEAP32[HEAP32[r2+1]>>2]](r1,1,HEAP32[r10>>2]*24&-1);HEAP32[r8>>2]=r11;r12=r11;r13=r10}else{r12=r9;r13=r1+36|0}if((HEAP32[r13>>2]|0)<=0){break}r9=0;r10=HEAP32[r2+54];r11=0;r8=r12,r14=r8>>2;while(1){r15=HEAP32[r10+80>>2],r16=r15>>1;if((r15|0)==0){break L8339}if(HEAP16[r16]<<16>>16==0){break L8339}if(HEAP16[r16+1]<<16>>16==0){break L8339}if(HEAP16[r16+8]<<16>>16==0){break L8339}if(HEAP16[r16+16]<<16>>16==0){break L8339}if(HEAP16[r16+9]<<16>>16==0){break L8339}if(HEAP16[r16+2]<<16>>16==0){break L8339}r16=HEAP32[r7>>2];if((HEAP32[r16+(r9<<8)>>2]|0)<0){break L8339}r15=(r9<<8)+r16+4|0;HEAP32[r14+1]=HEAP32[r15>>2];r17=(HEAP32[r15>>2]|0)==0?r11:1;r15=(r9<<8)+r16+8|0;HEAP32[r14+2]=HEAP32[r15>>2];r18=(HEAP32[r15>>2]|0)==0?r17:1;r17=(r9<<8)+r16+12|0;HEAP32[r14+3]=HEAP32[r17>>2];r15=(HEAP32[r17>>2]|0)==0?r18:1;r18=(r9<<8)+r16+16|0;HEAP32[r14+4]=HEAP32[r18>>2];r17=(HEAP32[r18>>2]|0)==0?r15:1;r15=(r9<<8)+r16+20|0;HEAP32[r14+5]=HEAP32[r15>>2];r19=(HEAP32[r15>>2]|0)==0?r17:1;r17=r9+1|0;if((r17|0)<(HEAP32[r13>>2]|0)){r9=r17;r10=r10+88|0;r11=r19;r8=r8+24|0,r14=r8>>2}else{break}}if((r19|0)==0){break}HEAP32[r4+3]=668;r5=r1+156|0,r6=r5>>2;HEAP32[r6]=0;return}}while(0);HEAP32[r4+3]=246;r5=r1+156|0,r6=r5>>2;HEAP32[r6]=0;return}function _consume_data(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42;r2=r1>>2;r3=STACKTOP;STACKTOP=STACKTOP+16|0;r4=r3;r5=r1+452|0;r6=HEAP32[r5>>2];r7=(r1+340|0)>>2;L8364:do{if((HEAP32[r7]|0)>0){r8=r1+4|0;r9=r1;r10=r6+72|0;r11=r1+148|0;r12=0;while(1){r13=HEAP32[((r12<<2)+344>>2)+r2];r14=HEAP32[HEAP32[r8>>2]+32>>2];r15=HEAP32[r10+(HEAP32[r13+4>>2]<<2)>>2];r16=HEAP32[r13+12>>2];r13=Math.imul(r16,HEAP32[r11>>2]);HEAP32[r4+(r12<<2)>>2]=FUNCTION_TABLE[r14](r9,r15,r13,r16,1);r16=r12+1|0;if((r16|0)<(HEAP32[r7]|0)){r12=r16}else{break L8364}}}}while(0);r12=r6+24|0;r9=HEAP32[r12>>2];r11=r6+28|0;L8369:do{if((r9|0)<(HEAP32[r11>>2]|0)){r10=r6+20|0;r8=r1+360|0;r16=r1+468|0;r13=r6+32|0;r15=r13;r14=r13;r13=r10|0;r17=r9;r18=HEAP32[r10>>2];L8371:while(1){r19=r18;while(1){if(r19>>>0>=HEAP32[r8>>2]>>>0){break}r10=HEAP32[r7];L8376:do{if((r10|0)>0){r20=0;r21=0;r22=r10;while(1){r23=HEAP32[((r21<<2)+344>>2)+r2];r24=r23+56|0;r25=HEAP32[r24>>2];r26=Math.imul(r25,r19);r27=r23+60|0;r23=HEAP32[r27>>2];if((r23|0)>0){r28=HEAP32[r4+(r21<<2)>>2];r29=r20;r30=0;r31=r25;r25=r23;while(1){if((r31|0)>0){r23=r29;r32=0;r33=(r26<<7)+HEAP32[r28+(r30+r17<<2)>>2]|0;while(1){r34=r23+1|0;HEAP32[r14+(r23<<2)>>2]=r33;r35=r32+1|0;r36=HEAP32[r24>>2];if((r35|0)<(r36|0)){r23=r34;r32=r35;r33=r33+128|0}else{break}}r37=r34;r38=r36;r39=HEAP32[r27>>2]}else{r37=r29;r38=r31;r39=r25}r33=r30+1|0;if((r33|0)<(r39|0)){r29=r37;r30=r33;r31=r38;r25=r39}else{break}}r40=r37;r41=HEAP32[r7]}else{r40=r20;r41=r22}r25=r21+1|0;if((r25|0)<(r41|0)){r20=r40;r21=r25;r22=r41}else{break L8376}}}}while(0);if((FUNCTION_TABLE[HEAP32[HEAP32[r16>>2]+4>>2]](r1,r15)|0)==0){break L8371}else{r19=r19+1|0}}HEAP32[r13>>2]=0;r10=r17+1|0;if((r10|0)<(HEAP32[r11>>2]|0)){r17=r10;r18=0}else{break L8369}}HEAP32[r12>>2]=r17;HEAP32[r13>>2]=r19;r42=0;STACKTOP=r3;return r42}}while(0);r19=r1+148|0;r12=HEAP32[r19>>2]+1|0;HEAP32[r19>>2]=r12;r19=HEAP32[r2+83];if(r12>>>0>=r19>>>0){FUNCTION_TABLE[HEAP32[HEAP32[r2+115]+12>>2]](r1);r42=4;STACKTOP=r3;return r42}r1=HEAP32[r5>>2]>>2;do{if((HEAP32[r7]|0)>1){HEAP32[r1+7]=1}else{r5=HEAP32[r2+86];if(r12>>>0<(r19-1|0)>>>0){HEAP32[r1+7]=HEAP32[r5+12>>2];break}else{HEAP32[r1+7]=HEAP32[r5+76>>2];break}}}while(0);HEAP32[r1+5]=0;HEAP32[r1+6]=0;r42=3;STACKTOP=r3;return r42}function _decompress_data(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32;r3=0;r4=HEAP32[r1+452>>2];r5=r1+332|0;r6=HEAP32[r5>>2]-1|0;r7=r1+144|0;r8=r1+152|0;r9=r1+460|0;r10=r1+148|0;r11=(r1+156|0)>>2;while(1){r12=HEAP32[r7>>2];r13=HEAP32[r8>>2];if((r12|0)>=(r13|0)){if((r12|0)!=(r13|0)){break}if(HEAP32[r10>>2]>>>0>HEAP32[r11]>>>0){break}}if((FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r1)|0)==0){r14=0;r3=6896;break}}if(r3==6896){return r14}r3=r1+36|0;r9=HEAP32[r3>>2];L8418:do{if((r9|0)>0){r10=r1+4|0;r8=r1;r7=r4+72|0;r13=r1+472|0;r12=0;r15=HEAP32[r1+216>>2];r16=r9;while(1){if((HEAP32[r15+52>>2]|0)==0){r17=r16}else{r18=HEAP32[HEAP32[r10>>2]+32>>2];r19=HEAP32[r7+(r12<<2)>>2];r20=(r15+12|0)>>2;r21=HEAP32[r20];r22=Math.imul(r21,HEAP32[r11]);r23=FUNCTION_TABLE[r18](r8,r19,r22,r21,0);if(HEAP32[r11]>>>0<r6>>>0){r24=HEAP32[r20]}else{r21=HEAP32[r20];r20=(HEAP32[r15+32>>2]>>>0)%(r21>>>0);r24=(r20|0)==0?r21:r20}r20=HEAP32[HEAP32[r13>>2]+(r12<<2)+4>>2];L8428:do{if((r24|0)>0){r21=r15+28|0;r22=r15+40|0;r19=r15+36|0;r18=0;r25=HEAP32[r2+(r12<<2)>>2];r26=HEAP32[r21>>2];while(1){L8432:do{if((r26|0)==0){r27=0}else{r28=0;r29=HEAP32[r23+(r18<<2)>>2];r30=0;while(1){FUNCTION_TABLE[r20](r1,r15,r29|0,r25,r30);r31=r28+1|0;r32=HEAP32[r21>>2];if(r31>>>0<r32>>>0){r28=r31;r29=r29+128|0;r30=HEAP32[r19>>2]+r30|0}else{r27=r32;break L8432}}}}while(0);r30=r18+1|0;if((r30|0)==(r24|0)){break L8428}else{r18=r30;r25=(HEAP32[r22>>2]<<2)+r25|0;r26=r27}}}}while(0);r17=HEAP32[r3>>2]}r20=r12+1|0;if((r20|0)<(r17|0)){r12=r20;r15=r15+88|0;r16=r17}else{break L8418}}}}while(0);r17=HEAP32[r11]+1|0;HEAP32[r11]=r17;r14=r17>>>0<HEAP32[r5>>2]>>>0?3:4;return r14}function _decompress_onepass(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61;r3=r1>>2;r4=0;r5=r1+452|0;r6=HEAP32[r5>>2];r7=HEAP32[r3+90]-1|0;r8=r1+332|0;r9=HEAP32[r8>>2];r10=r9-1|0;r11=r6+24|0;r12=HEAP32[r11>>2];r13=r6+28|0;r14=HEAP32[r13>>2];do{if((r12|0)<(r14|0)){r15=r6+20|0;r16=r15|0;r17=r1+436|0;r18=r1+468|0;r19=r6+32|0;r20=r19;r21=r19;r22=r1+340|0;r23=r1+472|0;r24=r1+148|0;r25=r1+368|0;r26=r12;r27=HEAP32[r15>>2];r15=r14;L8445:while(1){if(r27>>>0>r7>>>0){r28=r15}else{r29=r27;while(1){if((HEAP32[r17>>2]|0)!=0){_memset(HEAP32[r19>>2],0,HEAP32[r25>>2]<<7)}if((FUNCTION_TABLE[HEAP32[HEAP32[r18>>2]+4>>2]](r1,r21)|0)==0){break L8445}r30=HEAP32[r22>>2];L8454:do{if((r30|0)>0){r31=r29>>>0<r7>>>0;r32=0;r33=0;r34=r30;while(1){r35=HEAP32[((r32<<2)+344>>2)+r3],r36=r35>>2;do{if((HEAP32[r36+13]|0)==0){r37=HEAP32[r36+16]+r33|0;r38=r34}else{r39=HEAP32[r36+1];r40=HEAP32[HEAP32[r23>>2]+(r39<<2)+4>>2];r41=r35+56|0;r42=HEAP32[(r31?r41:r35+72|0)>>2];r43=r35+40|0;r44=Math.imul(HEAP32[r36+17],r29);r45=r35+60|0;r46=HEAP32[r45>>2];if((r46|0)<=0){r37=r33;r38=r34;break}r47=HEAP32[r43>>2];r48=r35+76|0;r49=(r42|0)>0;r50=r35+36|0;r51=0;r52=(Math.imul(r47,r26)<<2)+HEAP32[r2+(r39<<2)>>2]|0;r39=r33;r53=r47;r47=r46;while(1){do{if(HEAP32[r24>>2]>>>0<r10>>>0){if(r49){r54=0;r55=r44;r4=6914;break}else{r56=r53;r57=r47;break}}else{if((r51+r26|0)>=(HEAP32[r48>>2]|0)|r49^1){r56=r53;r57=r47;break}else{r54=0;r55=r44;r4=6914;break}}}while(0);if(r4==6914){while(1){r4=0;FUNCTION_TABLE[r40](r1,r35,HEAP32[r20+(r54+r39<<2)>>2]|0,r52,r55);r46=r54+1|0;if((r46|0)==(r42|0)){break}else{r54=r46;r55=HEAP32[r50>>2]+r55|0;r4=6914}}r56=HEAP32[r43>>2];r57=HEAP32[r45>>2]}r58=HEAP32[r41>>2]+r39|0;r46=r51+1|0;if((r46|0)>=(r57|0)){break}r51=r46;r52=(r56<<2)+r52|0;r39=r58;r53=r56;r47=r57}r37=r58;r38=HEAP32[r22>>2]}}while(0);r35=r32+1|0;if((r35|0)<(r38|0)){r32=r35;r33=r37;r34=r38}else{break L8454}}}}while(0);r30=r29+1|0;if(r30>>>0>r7>>>0){break}else{r29=r30}}r28=HEAP32[r13>>2]}HEAP32[r16>>2]=0;r30=r26+1|0;if((r30|0)<(r28|0)){r26=r30;r27=0;r15=r28}else{r4=6923;break}}if(r4==6923){r59=HEAP32[r8>>2];r60=r24;break}HEAP32[r11>>2]=r26;HEAP32[r16>>2]=r29;r61=0;return r61}else{r59=r9;r60=r1+148|0}}while(0);r9=r1+156|0;HEAP32[r9>>2]=HEAP32[r9>>2]+1|0;r9=HEAP32[r60>>2]+1|0;HEAP32[r60>>2]=r9;if(r9>>>0>=r59>>>0){FUNCTION_TABLE[HEAP32[HEAP32[r3+115]+12>>2]](r1);r61=4;return r61}r1=HEAP32[r5>>2]>>2;do{if((HEAP32[r3+85]|0)>1){HEAP32[r1+7]=1}else{r5=HEAP32[r3+86];if(r9>>>0<(r59-1|0)>>>0){HEAP32[r1+7]=HEAP32[r5+12>>2];break}else{HEAP32[r1+7]=HEAP32[r5+76>>2];break}}}while(0);HEAP32[r1+5]=0;HEAP32[r1+6]=0;r61=3;return r61}function _decompress_smooth_data(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66,r67,r68,r69,r70,r71,r72,r73,r74,r75,r76,r77,r78,r79,r80,r81,r82,r83,r84,r85,r86,r87,r88,r89,r90,r91,r92,r93,r94,r95,r96,r97,r98,r99,r100;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+128|0;r5=r4;r6=HEAP32[r1+452>>2];r7=r1+332|0;r8=HEAP32[r7>>2]-1|0;r9=r1+144|0;r10=r1+152|0;r11=r1+460|0;r12=r1+412|0;r13=r1+148|0;r14=(r1+156|0)>>2;while(1){r15=HEAP32[r9>>2];r16=HEAP32[r10>>2];if((r15|0)>(r16|0)){break}r17=HEAP32[r11>>2];if((HEAP32[r17+20>>2]|0)!=0){break}if((r15|0)==(r16|0)){if(HEAP32[r13>>2]>>>0>(HEAP32[r14]+((HEAP32[r12>>2]|0)==0&1)|0)>>>0){break}}if((FUNCTION_TABLE[HEAP32[r17>>2]](r1)|0)==0){r18=0;r3=7012;break}}if(r3==7012){STACKTOP=r4;return r18}r3=r1+36|0;r12=HEAP32[r3>>2];L8506:do{if((r12|0)>0){r13=r1+4|0;r11=r1;r10=r6+72|0;r9=r6+112|0;r17=r1+472|0;r16=r5|0;r15=r5;r19=r5+4|0;r20=r5+18|0;r21=r5+32|0;r22=r5+16|0;r23=r5+2|0;r24=HEAP32[r1+216>>2],r25=r24>>2;r26=0;r27=r12;while(1){if((HEAP32[r25+13]|0)==0){r28=r27}else{r29=HEAP32[r14];if(r29>>>0<r8>>>0){r30=HEAP32[r25+3];r31=r30;r32=r30<<1;r33=0;r34=r30}else{r30=HEAP32[r25+3];r35=(HEAP32[r25+8]>>>0)%(r30>>>0);r36=(r35|0)==0?r30:r35;r31=r36;r32=r36;r33=1;r34=r30}if((r29|0)==0){r30=FUNCTION_TABLE[HEAP32[HEAP32[r13>>2]+32>>2]](r11,HEAP32[r10+(r26<<2)>>2],0,r32,0),r37=r30>>2;r38=1}else{r36=HEAP32[HEAP32[r13>>2]+32>>2];r35=HEAP32[r10+(r26<<2)>>2];r39=Math.imul(r34,r29-1|0);r30=FUNCTION_TABLE[r36](r11,r35,r39,r34+r32|0,0)+(HEAP32[r25+3]<<2)|0,r37=r30>>2;r38=0}r30=HEAP32[r9>>2];r39=r26*6&-1;r35=HEAP32[r25+20]>>1;r36=HEAPU16[r35];r29=HEAPU16[r35+1];r40=HEAPU16[r35+8];r41=HEAPU16[r35+16];r42=HEAPU16[r35+9];r43=HEAPU16[r35+2];r35=HEAP32[HEAP32[r17>>2]+(r26<<2)+4>>2];L8520:do{if((r31|0)>0){r44=(r38|0)!=0;r45=(r33|0)!=0;r46=r24+28|0;r47=((r39|1)<<2)+r30|0;r48=(r39+2<<2)+r30|0;r49=(r39+3<<2)+r30|0;r50=(r39+4<<2)+r30|0;r51=(r39+5<<2)+r30|0;r52=r24+36|0;r53=r36*9&-1;r54=r43<<7;r55=r43<<8;r56=r36*5&-1;r57=r42<<7;r58=r42<<8;r59=r41<<7;r60=r41<<8;r61=r36*36&-1;r62=r40<<7;r63=r40<<8;r64=r29<<7;r65=r29<<8;r66=r24+40|0;r67=r31-1|0;r68=HEAP32[r2+(r26<<2)>>2];r69=0;while(1){r70=HEAP32[(r69<<2>>2)+r37];if(r44&(r69|0)==0){r71=r70}else{r71=HEAP32[(r69-1<<2>>2)+r37]}if(r45&(r69|0)==(r67|0)){r72=r70}else{r72=HEAP32[(r69+1<<2>>2)+r37]}r73=HEAP16[r71>>1]<<16>>16;r74=HEAP16[r70>>1]<<16>>16;r75=HEAP16[r72>>1]<<16>>16;r76=HEAP32[r46>>2]-1|0;r77=0;r78=r72;r79=r71;r80=r70;r70=0;r81=r73;r82=r73;r73=r74;r83=r74;r74=r75;r84=r75;while(1){_memcpy(r15,r80,128);if(r70>>>0<r76>>>0){r85=HEAP16[r78+128>>1]<<16>>16;r86=HEAP16[r80+128>>1]<<16>>16;r87=HEAP16[r79+128>>1]<<16>>16}else{r85=r84;r86=r83;r87=r82}r75=HEAP32[r47>>2];do{if((r75|0)!=0){if(HEAP16[r23>>1]<<16>>16!=0){break}r88=Math.imul(r61,r73-r86|0);do{if((r88|0)>-1){r89=(r88+r64|0)/(r65|0)&-1;if((r75|0)<=0){r90=r89;break}r91=1<<r75;r90=(r89|0)<(r91|0)?r89:r91-1|0}else{r91=(r64-r88|0)/(r65|0)&-1;if((r75|0)>0){r89=1<<r75;r92=(r91|0)<(r89|0)?r91:r89-1|0}else{r92=r91}r90=-r92|0}}while(0);HEAP16[r23>>1]=r90&65535}}while(0);r75=HEAP32[r48>>2];do{if((r75|0)!=0){if(HEAP16[r22>>1]<<16>>16!=0){break}r88=Math.imul(r61,r82-r84|0);do{if((r88|0)>-1){r91=(r88+r62|0)/(r63|0)&-1;if((r75|0)<=0){r93=r91;break}r89=1<<r75;r93=(r91|0)<(r89|0)?r91:r89-1|0}else{r89=(r62-r88|0)/(r63|0)&-1;if((r75|0)>0){r91=1<<r75;r94=(r89|0)<(r91|0)?r89:r91-1|0}else{r94=r89}r93=-r94|0}}while(0);HEAP16[r22>>1]=r93&65535}}while(0);r75=HEAP32[r49>>2];do{if((r75|0)!=0){if(HEAP16[r21>>1]<<16>>16!=0){break}r88=Math.imul(r53,r82-(r83<<1)+r84|0);do{if((r88|0)>-1){r89=(r88+r59|0)/(r60|0)&-1;if((r75|0)<=0){r95=r89;break}r91=1<<r75;r95=(r89|0)<(r91|0)?r89:r91-1|0}else{r91=(r59-r88|0)/(r60|0)&-1;if((r75|0)>0){r89=1<<r75;r96=(r91|0)<(r89|0)?r91:r89-1|0}else{r96=r91}r95=-r96|0}}while(0);HEAP16[r21>>1]=r95&65535}}while(0);r75=HEAP32[r50>>2];do{if((r75|0)!=0){if(HEAP16[r20>>1]<<16>>16!=0){break}r88=Math.imul(r56,r81-r74-r87+r85|0);do{if((r88|0)>-1){r91=(r88+r57|0)/(r58|0)&-1;if((r75|0)<=0){r97=r91;break}r89=1<<r75;r97=(r91|0)<(r89|0)?r91:r89-1|0}else{r89=(r57-r88|0)/(r58|0)&-1;if((r75|0)>0){r91=1<<r75;r98=(r89|0)<(r91|0)?r89:r91-1|0}else{r98=r89}r97=-r98|0}}while(0);HEAP16[r20>>1]=r97&65535}}while(0);r75=HEAP32[r51>>2];do{if((r75|0)!=0){if(HEAP16[r19>>1]<<16>>16!=0){break}r88=Math.imul(r53,r73-(r83<<1)+r86|0);do{if((r88|0)>-1){r89=(r88+r54|0)/(r55|0)&-1;if((r75|0)<=0){r99=r89;break}r91=1<<r75;r99=(r89|0)<(r91|0)?r89:r91-1|0}else{r91=(r54-r88|0)/(r55|0)&-1;if((r75|0)>0){r89=1<<r75;r100=(r91|0)<(r89|0)?r91:r89-1|0}else{r100=r91}r99=-r100|0}}while(0);HEAP16[r19>>1]=r99&65535}}while(0);FUNCTION_TABLE[r35](r1,r24,r16,r68,r77);r75=r70+1|0;if(r75>>>0>r76>>>0){break}else{r77=HEAP32[r52>>2]+r77|0;r78=r78+128|0;r79=r79+128|0;r80=r80+128|0;r70=r75;r81=r82;r82=r87;r73=r83;r83=r86;r74=r84;r84=r85}}r84=r69+1|0;if((r84|0)==(r31|0)){break L8520}else{r68=(HEAP32[r66>>2]<<2)+r68|0;r69=r84}}}}while(0);r28=HEAP32[r3>>2]}r35=r26+1|0;if((r35|0)<(r28|0)){r24=r24+88|0,r25=r24>>2;r26=r35;r27=r28}else{break L8506}}}}while(0);r28=HEAP32[r14]+1|0;HEAP32[r14]=r28;r18=r28>>>0<HEAP32[r7>>2]>>>0?3:4;STACKTOP=r4;return r18}function _start_pass_dcolor(r1){return}function _rgb_gray_convert706(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18;r6=HEAP32[HEAP32[r1+480>>2]+24>>2]>>2;r7=HEAP32[r1+112>>2];if((r5|0)<=0){return}r1=r2+4|0;r8=r2+8|0;r9=(r7|0)==0;r10=r4;r4=r3;r3=r5;while(1){r5=r3-1|0;r11=HEAP32[HEAP32[r2>>2]+(r4<<2)>>2];r12=HEAP32[HEAP32[r1>>2]+(r4<<2)>>2];r13=HEAP32[HEAP32[r8>>2]+(r4<<2)>>2];r14=r4+1|0;r15=r10+4|0;r16=HEAP32[r10>>2];L8607:do{if(!r9){r17=0;while(1){HEAP8[r16+r17|0]=(HEAP32[((HEAPU8[r12+r17|0]|256)<<2>>2)+r6]+HEAP32[(HEAPU8[r11+r17|0]<<2>>2)+r6]+HEAP32[((HEAPU8[r13+r17|0]|512)<<2>>2)+r6]|0)>>>16&255;r18=r17+1|0;if((r18|0)==(r7|0)){break L8607}else{r17=r18}}}}while(0);if((r5|0)>0){r10=r15;r4=r14;r3=r5}else{break}}return}function _rgb1_gray_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18;r6=HEAP32[HEAP32[r1+480>>2]+24>>2]>>2;r7=HEAP32[r1+112>>2];if((r5|0)<=0){return}r1=r2+4|0;r8=r2+8|0;r9=(r7|0)==0;r10=r4;r4=r3;r3=r5;while(1){r5=r3-1|0;r11=HEAP32[HEAP32[r2>>2]+(r4<<2)>>2];r12=HEAP32[HEAP32[r1>>2]+(r4<<2)>>2];r13=HEAP32[HEAP32[r8>>2]+(r4<<2)>>2];r14=r4+1|0;r15=r10+4|0;r16=HEAP32[r10>>2];L8618:do{if(!r9){r17=0;while(1){r18=HEAPU8[r12+r17|0];HEAP8[r16+r17|0]=(HEAP32[((r18|256)<<2>>2)+r6]+HEAP32[((HEAPU8[r11+r17|0]+r18+128&255)<<2>>2)+r6]+HEAP32[((r18+HEAPU8[r13+r17|0]+128&255|512)<<2>>2)+r6]|0)>>>16&255;r18=r17+1|0;if((r18|0)==(r7|0)){break L8618}else{r17=r18}}}}while(0);if((r5|0)>0){r10=r15;r4=r14;r3=r5}else{break}}return}function _ycc_rgb_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24;r6=HEAP32[r1+480>>2]>>2;r7=HEAP32[r1+112>>2];r8=HEAP32[r1+336>>2];r1=HEAP32[r6+2];r9=HEAP32[r6+3];r10=HEAP32[r6+4];r11=HEAP32[r6+5];if((r5|0)<=0){return}r6=r2+4|0;r12=r2+8|0;r13=(r7|0)==0;r14=r4;r4=r3;r3=r5;while(1){r5=r3-1|0;r15=HEAP32[HEAP32[r2>>2]+(r4<<2)>>2];r16=HEAP32[HEAP32[r6>>2]+(r4<<2)>>2];r17=HEAP32[HEAP32[r12>>2]+(r4<<2)>>2];r18=r4+1|0;r19=r14+4|0;L8629:do{if(!r13){r20=0;r21=HEAP32[r14>>2];while(1){r22=HEAPU8[r15+r20|0];r23=HEAPU8[r16+r20|0];r24=HEAPU8[r17+r20|0];HEAP8[r21]=HEAP8[r8+HEAP32[r1+(r24<<2)>>2]+r22|0];HEAP8[r21+1|0]=HEAP8[(HEAP32[r10+(r24<<2)>>2]+HEAP32[r11+(r23<<2)>>2]>>16)+r8+r22|0];HEAP8[r21+2|0]=HEAP8[r8+HEAP32[r9+(r23<<2)>>2]+r22|0];r22=r20+1|0;if((r22|0)==(r7|0)){break L8629}else{r20=r22;r21=r21+3|0}}}}while(0);if((r5|0)>0){r14=r19;r4=r18;r3=r5}else{break}}return}function _gray_rgb_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13;r6=HEAP32[r1+112>>2];if((r5|0)<=0){return}r1=(r6|0)==0;r7=r4;r4=r3;r3=r5;while(1){r5=r3-1|0;r8=r4+1|0;r9=HEAP32[HEAP32[r2>>2]+(r4<<2)>>2];r10=r7+4|0;L8641:do{if(!r1){r11=HEAP32[r7>>2];r12=0;while(1){r13=HEAP8[r9+r12|0];HEAP8[r11+2|0]=r13;HEAP8[r11+1|0]=r13;HEAP8[r11]=r13;r13=r12+1|0;if((r13|0)==(r6|0)){break L8641}else{r11=r11+3|0;r12=r13}}}}while(0);if((r5|0)>0){r7=r10;r4=r8;r3=r5}else{break}}return}function _rgb_convert707(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17;r6=HEAP32[r1+112>>2];if((r5|0)<=0){return}r1=r2+4|0;r7=r2+8|0;r8=(r6|0)==0;r9=r4;r4=r3;r3=r5;while(1){r5=r3-1|0;r10=HEAP32[HEAP32[r2>>2]+(r4<<2)>>2];r11=HEAP32[HEAP32[r1>>2]+(r4<<2)>>2];r12=HEAP32[HEAP32[r7>>2]+(r4<<2)>>2];r13=r4+1|0;r14=r9+4|0;L8653:do{if(!r8){r15=HEAP32[r9>>2];r16=0;while(1){HEAP8[r15]=HEAP8[r10+r16|0];HEAP8[r15+1|0]=HEAP8[r11+r16|0];HEAP8[r15+2|0]=HEAP8[r12+r16|0];r17=r16+1|0;if((r17|0)==(r6|0)){break L8653}else{r15=r15+3|0;r16=r17}}}}while(0);if((r5|0)>0){r9=r14;r4=r13;r3=r5}else{break}}return}function _rgb1_rgb_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18;r6=HEAP32[r1+112>>2];if((r5|0)<=0){return}r1=r2+4|0;r7=r2+8|0;r8=(r6|0)==0;r9=r4;r4=r3;r3=r5;while(1){r5=r3-1|0;r10=HEAP32[HEAP32[r2>>2]+(r4<<2)>>2];r11=HEAP32[HEAP32[r1>>2]+(r4<<2)>>2];r12=HEAP32[HEAP32[r7>>2]+(r4<<2)>>2];r13=r4+1|0;r14=r9+4|0;L8665:do{if(!r8){r15=HEAP32[r9>>2];r16=0;while(1){r17=HEAP8[r11+r16|0];r18=HEAP8[r12+r16|0];HEAP8[r15]=r17+HEAP8[r10+r16|0]&255^-128;HEAP8[r15+1|0]=r17;HEAP8[r15+2|0]=r18+r17&255^-128;r17=r16+1|0;if((r17|0)==(r6|0)){break L8665}else{r15=r15+3|0;r16=r17}}}}while(0);if((r5|0)>0){r9=r14;r4=r13;r3=r5}else{break}}return}function _jinit_color_deconverter(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17;r2=r1>>2;r3=(r1+4|0)>>2;r4=r1;r5=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,28),r6=r5>>2;r7=(r1+480|0)>>2;HEAP32[r7]=r5;HEAP32[r6]=304;r5=(r1+40|0)>>2;r8=HEAP32[r5];do{if((r8|0)==4|(r8|0)==5){if((HEAP32[r2+9]|0)==4){break}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=11;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}else if((r8|0)==2|(r8|0)==3){if((HEAP32[r2+9]|0)==3){break}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=11;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}else if((r8|0)==1){if((HEAP32[r2+9]|0)==1){break}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=11;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}else{if((HEAP32[r2+9]|0)>=1){break}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=11;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}}while(0);r8=(r1+304|0)>>2;do{if((HEAP32[r8]|0)!=0){if((HEAP32[r5]|0)==2){break}r9=r1|0;HEAP32[HEAP32[r9>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r9>>2]>>2]](r4)}}while(0);r9=HEAP32[r2+11];L8686:do{if((r9|0)==4){HEAP32[r2+30]=4;r10=HEAP32[r5];if((r10|0)==5){HEAP32[r6+1]=898;r11=HEAP32[r7];r12=r11+8|0;r13=r12;HEAP32[r12>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,1024);r12=r11+12|0;HEAP32[r12>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,1024);r14=r11+16|0;r15=r14;HEAP32[r14>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,1024);r14=r11+20|0;HEAP32[r14>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,1024);r11=0;r16=-128;while(1){HEAP32[HEAP32[r13>>2]+(r11<<2)>>2]=(r16*91881&-1)+32768>>16;HEAP32[HEAP32[r12>>2]+(r11<<2)>>2]=(r16*116130&-1)+32768>>16;HEAP32[HEAP32[r15>>2]+(r11<<2)>>2]=r16*-46802&-1;HEAP32[HEAP32[r14>>2]+(r11<<2)>>2]=(r16*-22554&-1)+32768|0;r17=r11+1|0;if((r17|0)==256){break L8686}else{r11=r17;r16=r16+1|0}}}else if((r10|0)==4){HEAP32[r6+1]=86;break}else{r16=r1|0;HEAP32[HEAP32[r16>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r16>>2]>>2]](r4);break}}else if((r9|0)==1){HEAP32[r2+30]=1;r16=HEAP32[r5];if((r16|0)==1|(r16|0)==3){HEAP32[r6+1]=758;r11=r1+36|0;if((HEAP32[r11>>2]|0)<=1){break}r14=r1+216|0;r15=1;while(1){HEAP32[HEAP32[r14>>2]+(r15*88&-1)+52>>2]=0;r12=r15+1|0;if((r12|0)<(HEAP32[r11>>2]|0)){r15=r12}else{break L8686}}}else if((r16|0)==2){r15=HEAP32[r8];if((r15|0)==0){HEAP32[r6+1]=114}else if((r15|0)==1){HEAP32[r6+1]=732}else{r15=r1|0;HEAP32[HEAP32[r15>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r15>>2]>>2]](r4)}r15=HEAP32[r7];r11=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,3072);r14=r11>>2;HEAP32[r15+24>>2]=r11;r11=0;while(1){HEAP32[(r11<<2>>2)+r14]=r11*19595&-1;HEAP32[(r11+256<<2>>2)+r14]=r11*38470&-1;HEAP32[(r11+512<<2>>2)+r14]=(r11*7471&-1)+32768|0;r15=r11+1|0;if((r15|0)==256){break L8686}else{r11=r15}}}else{r11=r1|0;HEAP32[HEAP32[r11>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]>>2]](r4);break}}else if((r9|0)==2){HEAP32[r2+30]=3;r11=HEAP32[r5];if((r11|0)==2){r14=HEAP32[r8];if((r14|0)==0){HEAP32[r6+1]=594;break}else if((r14|0)==1){HEAP32[r6+1]=866;break}else{r14=r1|0;HEAP32[HEAP32[r14>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r14>>2]>>2]](r4);break}}else if((r11|0)==1){HEAP32[r6+1]=992;break}else if((r11|0)==3){HEAP32[r6+1]=586;r11=HEAP32[r7];r14=r11+8|0;r16=r14;HEAP32[r14>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,1024);r14=r11+12|0;HEAP32[r14>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,1024);r15=r11+16|0;r10=r15;HEAP32[r15>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,1024);r15=r11+20|0;HEAP32[r15>>2]=FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r4,1,1024);r11=0;r12=-128;while(1){HEAP32[HEAP32[r16>>2]+(r11<<2)>>2]=(r12*91881&-1)+32768>>16;HEAP32[HEAP32[r14>>2]+(r11<<2)>>2]=(r12*116130&-1)+32768>>16;HEAP32[HEAP32[r10>>2]+(r11<<2)>>2]=r12*-46802&-1;HEAP32[HEAP32[r15>>2]+(r11<<2)>>2]=(r12*-22554&-1)+32768|0;r13=r11+1|0;if((r13|0)==256){break L8686}else{r11=r13;r12=r12+1|0}}}else{r12=r1|0;HEAP32[HEAP32[r12>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r12>>2]>>2]](r4);break}}else{if((r9|0)==(HEAP32[r5]|0)){HEAP32[r2+30]=HEAP32[r2+9];HEAP32[r6+1]=86;break}else{r12=r1|0;HEAP32[HEAP32[r12>>2]+20>>2]=28;FUNCTION_TABLE[HEAP32[HEAP32[r12>>2]>>2]](r4);break}}}while(0);if((HEAP32[r2+21]|0)==0){HEAP32[r2+31]=HEAP32[r2+30];return}else{HEAP32[r2+31]=1;return}}function _grayscale_convert705(r1,r2,r3,r4,r5){var r6;r6=HEAP32[r1+112>>2];if((r5|0)<=0){return}r1=r4;r4=(r3<<2)+HEAP32[r2>>2]|0;r2=r5;while(1){_memcpy(HEAP32[r1>>2],HEAP32[r4>>2],r6);r5=r2-1|0;if((r5|0)>0){r1=r1+4|0;r4=r4+4|0;r2=r5}else{break}}return}function _ycck_cmyk_convert(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26;r6=HEAP32[r1+480>>2]>>2;r7=HEAP32[r1+112>>2];r8=HEAP32[r1+336>>2];r1=HEAP32[r6+2];r9=HEAP32[r6+3];r10=HEAP32[r6+4];r11=HEAP32[r6+5];if((r5|0)<=0){return}r6=r2+4|0;r12=r2+8|0;r13=r2+12|0;r14=(r7|0)==0;r15=r4;r4=r3;r3=r5;while(1){r5=r3-1|0;r16=HEAP32[HEAP32[r2>>2]+(r4<<2)>>2];r17=HEAP32[HEAP32[r6>>2]+(r4<<2)>>2];r18=HEAP32[HEAP32[r12>>2]+(r4<<2)>>2];r19=HEAP32[HEAP32[r13>>2]+(r4<<2)>>2];r20=r4+1|0;r21=r15+4|0;L8744:do{if(!r14){r22=0;r23=HEAP32[r15>>2];while(1){r24=HEAPU8[r17+r22|0];r25=HEAPU8[r18+r22|0];r26=HEAPU8[r16+r22|0]^255;HEAP8[r23]=HEAP8[r8+(r26-HEAP32[r1+(r25<<2)>>2])|0];HEAP8[r23+1|0]=HEAP8[r8+(r26-(HEAP32[r10+(r25<<2)>>2]+HEAP32[r11+(r24<<2)>>2]>>16))|0];HEAP8[r23+2|0]=HEAP8[r8+(r26-HEAP32[r9+(r24<<2)>>2])|0];HEAP8[r23+3|0]=HEAP8[r19+r22|0];r24=r22+1|0;if((r24|0)==(r7|0)){break L8744}else{r22=r24;r23=r23+4|0}}}}while(0);if((r5|0)>0){r15=r21;r4=r20;r3=r5}else{break}}return}function _null_convert708(r1,r2,r3,r4,r5){var r6,r7,r8,r9,r10,r11,r12,r13,r14;r6=HEAP32[r1+36>>2];r7=HEAP32[r1+112>>2];if((r5|0)<=0){return}r1=(r6|0)>0;r8=(r7|0)==0;r9=r4;r4=r3;r3=r5;while(1){r5=r3-1|0;L8756:do{if(r1){r10=0;while(1){L8759:do{if(!r8){r11=HEAP32[r9>>2]+r10|0;r12=HEAP32[HEAP32[r2+(r10<<2)>>2]+(r4<<2)>>2];r13=0;while(1){HEAP8[r11]=HEAP8[r12];r14=r13+1|0;if((r14|0)==(r7|0)){break L8759}else{r11=r11+r6|0;r12=r12+1|0;r13=r14}}}}while(0);r13=r10+1|0;if((r13|0)==(r6|0)){break L8756}else{r10=r13}}}}while(0);if((r5|0)>0){r9=r9+4|0;r4=r4+1|0;r3=r5}else{break}}return}function _start_pass709(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20;r2=HEAP32[r1+472>>2];r3=r1+36|0;if((HEAP32[r3>>2]|0)<=0){return}r4=(r1|0)>>2;r5=r1;r6=r2+44|0;r7=r1+72|0;r8=0;r9=0;r10=HEAP32[r1+216>>2],r1=r10>>2;r11=0;while(1){r12=r10+36|0;r13=r10+40|0;r14=(HEAP32[r12>>2]<<8)+HEAP32[r13>>2]|0;do{if((r14|0)==2570){r15=0;r16=1150}else if((r14|0)==1806){r15=0;r16=554}else if((r14|0)==1285){r15=0;r16=1184}else if((r14|0)==2565){r15=0;r16=390}else if((r14|0)==258){r15=0;r16=754}else if((r14|0)==2056){r17=HEAP32[r7>>2];if((r17|0)==2){r15=r17;r16=728;break}else if((r17|0)==0){r15=0;r16=578;break}else if((r17|0)==1){r15=r17;r16=1106;break}else{HEAP32[HEAP32[r4]+20>>2]=49;FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r5);r15=r9;r16=r8;break}}else if((r14|0)==1026){r15=0;r16=314}else if((r14|0)==1542){r15=0;r16=1198}else if((r14|0)==3341){r15=0;r16=118}else if((r14|0)==1799){r15=0;r16=494}else if((r14|0)==774){r15=0;r16=176}else if((r14|0)==4104){r15=0;r16=1118}else if((r14|0)==1032){r15=0;r16=440}else if((r14|0)==1290){r15=0;r16=830}else if((r14|0)==3078){r15=0;r16=530}else if((r14|0)==2052){r15=0;r16=702}else if((r14|0)==257){r15=0;r16=190}else if((r14|0)==516){r15=0;r16=810}else if((r14|0)==2064){r15=0;r16=268}else if((r14|0)==1548){r15=0;r16=106}else if((r14|0)==1539){r15=0;r16=1194}else if((r14|0)==3084){r15=0;r16=1176}else if((r14|0)==1028){r15=0;r16=930}else if((r14|0)==514){r15=0;r16=812}else if((r14|0)==4112){r15=0;r16=396}else if((r14|0)==3855){r15=0;r16=1296}else if((r14|0)==771){r15=0;r16=180}else if((r14|0)==3591){r15=0;r16=270}else if((r14|0)==2313){r15=0;r16=682}else if((r14|0)==2827){r15=0;r16=466}else if((r14|0)==513){r15=0;r16=814}else if((r14|0)==3598){r15=0;r16=572}else{HEAP32[HEAP32[r4]+20>>2]=7;HEAP32[HEAP32[r4]+24>>2]=HEAP32[r12>>2];HEAP32[HEAP32[r4]+28>>2]=HEAP32[r13>>2];FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r5);r15=r9;r16=r8}}while(0);HEAP32[r2+(r11<<2)+4>>2]=r16;L8810:do{if((HEAP32[r1+13]|0)!=0){r13=(r11<<2)+r6|0;if((HEAP32[r13>>2]|0)==(r15|0)){break}r12=HEAP32[r1+20],r14=r12>>1;if((r12|0)==0){break}HEAP32[r13>>2]=r15;if((r15|0)==0){r13=HEAP32[r1+21];r12=0;while(1){HEAP32[r13+(r12<<2)>>2]=HEAPU16[(r12<<1>>1)+r14];r17=r12+1|0;if((r17|0)==64){break L8810}else{r12=r17}}}else if((r15|0)==2){r12=HEAP32[r1+21]>>2;r13=0;r17=0;while(1){r18=(r17<<3)+5243964|0;r19=(HEAP32[tempDoublePtr>>2]=HEAP32[r18>>2],HEAP32[tempDoublePtr+4>>2]=HEAP32[r18+4>>2],HEAPF64[tempDoublePtr>>3]);HEAPF32[(r13<<2>>2)+r12]=HEAPU16[(r13<<1>>1)+r14]*r19*.125;r18=r13|1;HEAPF32[(r18<<2>>2)+r12]=HEAPU16[(r18<<1>>1)+r14]*r19*1.387039845*.125;r20=r18+1|0;HEAPF32[(r20<<2>>2)+r12]=HEAPU16[(r20<<1>>1)+r14]*r19*1.306562965*.125;r20=r13|3;HEAPF32[(r20<<2>>2)+r12]=HEAPU16[(r20<<1>>1)+r14]*r19*1.175875602*.125;r18=r20+1|0;HEAPF32[(r18<<2>>2)+r12]=HEAPU16[(r18<<1>>1)+r14]*r19*.125;r18=r20+2|0;HEAPF32[(r18<<2>>2)+r12]=HEAPU16[(r18<<1>>1)+r14]*r19*.785694958*.125;r18=r20+3|0;HEAPF32[(r18<<2>>2)+r12]=HEAPU16[(r18<<1>>1)+r14]*r19*.5411961*.125;r18=r13|7;HEAPF32[(r18<<2>>2)+r12]=HEAPU16[(r18<<1>>1)+r14]*r19*.275899379*.125;r19=r17+1|0;if((r19|0)==8){break L8810}else{r13=r13+8|0;r17=r19}}}else if((r15|0)==1){r17=HEAP32[r1+21];r13=0;while(1){HEAP32[r17+(r13<<2)>>2]=Math.imul(HEAP16[(r13<<1)+5243836>>1]<<16>>16,HEAPU16[(r13<<1>>1)+r14])+2048>>12;r12=r13+1|0;if((r12|0)==64){break L8810}else{r13=r12}}}else{HEAP32[HEAP32[r4]+20>>2]=49;FUNCTION_TABLE[HEAP32[HEAP32[r4]>>2]](r5);break}}}while(0);r13=r11+1|0;if((r13|0)<(HEAP32[r3>>2]|0)){r8=r16;r9=r15;r10=r10+88|0,r1=r10>>2;r11=r13}else{break}}return}function _start_pass_huff_decoder(r1){var r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36;r2=r1>>2;r3=0;r4=HEAP32[r2+117];r5=(r1+412|0)>>2;r6=HEAP32[r5];r7=(r6|0)==0;if((HEAP32[r2+56]|0)==0){do{if(r7){if((HEAP32[r2+105]|0)!=0){r3=7234;break}if((HEAP32[r2+106]|0)!=0){r3=7234;break}r8=HEAP32[r2+104];if(!((HEAP32[r2+55]|0)!=0|(r8|0)<64)){break}if((r8|0)==(HEAP32[r2+109]|0)){break}else{r3=7234;break}}else{r3=7234}}while(0);if(r3==7234){r8=r1|0;HEAP32[HEAP32[r8>>2]+20>>2]=125;FUNCTION_TABLE[HEAP32[HEAP32[r8>>2]+4>>2]](r1,-1)}r8=(r1+436|0)>>2;HEAP32[r4+4>>2]=(HEAP32[r8]|0)==63?780:1218;r9=r1+340|0;L8838:do{if((HEAP32[r9>>2]|0)>0){r10=r4+64|0;r11=r4+20|0;r12=r4+80|0;r13=0;while(1){r14=HEAP32[((r13<<2)+344>>2)+r2];r15=HEAP32[r14+20>>2];_jpeg_make_d_derived_tbl(r1,1,r15,(r15<<2)+r10|0);if((HEAP32[r8]|0)!=0){r15=HEAP32[r14+24>>2];_jpeg_make_d_derived_tbl(r1,0,r15,(r15<<2)+r12|0)}HEAP32[r11+(r13<<2)>>2]=0;r15=r13+1|0;if((r15|0)<(HEAP32[r9>>2]|0)){r13=r15}else{break L8838}}}}while(0);r9=r1+368|0;if((HEAP32[r9>>2]|0)<=0){r16=r4+12|0,r17=r16>>2;HEAP32[r17]=0;r18=r4+8|0,r19=r18>>2;HEAP32[r19]=0;r20=r4+36|0,r21=r20>>2;HEAP32[r21]=0;r22=r1+280|0,r23=r22>>2;r24=HEAP32[r23];r25=r4+40|0,r26=r25>>2;r27=r24;HEAP32[r26]=r27;return}r13=r4+64|0;r11=r4+96|0;r12=r4+80|0;r10=r4+136|0;r15=(r4+176|0)>>2;r14=0;while(1){r28=HEAP32[((HEAP32[((r14<<2)+372>>2)+r2]<<2)+344>>2)+r2]>>2;HEAP32[r11+(r14<<2)>>2]=HEAP32[r13+(HEAP32[r28+5]<<2)>>2];HEAP32[r10+(r14<<2)>>2]=HEAP32[r12+(HEAP32[r28+6]<<2)>>2];do{if((HEAP32[r28+13]|0)==0){HEAP32[(r14<<2>>2)+r15]=0}else{r29=HEAP32[r28+10];r30=HEAP32[r28+9];r31=HEAP32[r8];if((r31|0)==3){r32=r29-1|0;r33=r30-1|0;HEAP32[(r14<<2>>2)+r15]=HEAP32[((r32>>>0>1?1:r32)<<3)+((r33>>>0>1?1:r33)<<2)+5244708>>2]+1|0;break}else if((r31|0)==8){r33=r29-1|0;r32=r30-1|0;HEAP32[(r14<<2>>2)+r15]=HEAP32[((r33>>>0>2?2:r33)*12&-1)+((r32>>>0>2?2:r32)<<2)+5244672>>2]+1|0;break}else if((r31|0)==24){r32=r29-1|0;r33=r30-1|0;HEAP32[(r14<<2>>2)+r15]=HEAP32[((r32>>>0>4?4:r32)*20&-1)+((r33>>>0>4?4:r33)<<2)+5244508>>2]+1|0;break}else if((r31|0)==48){r33=r29-1|0;r32=r30-1|0;HEAP32[(r14<<2>>2)+r15]=HEAP32[((r33>>>0>6?6:r33)*28&-1)+((r32>>>0>6?6:r32)<<2)+5244168>>2]+1|0;break}else if((r31|0)==15){r32=r29-1|0;r33=r30-1|0;HEAP32[(r14<<2>>2)+r15]=HEAP32[((r32>>>0>3?3:r32)<<4)+((r33>>>0>3?3:r33)<<2)+5244608>>2]+1|0;break}else if((r31|0)==35){r33=r29-1|0;r32=r30-1|0;HEAP32[(r14<<2>>2)+r15]=HEAP32[((r33>>>0>5?5:r33)*24&-1)+((r32>>>0>5?5:r32)<<2)+5244364>>2]+1|0;break}else if((r31|0)==0){HEAP32[(r14<<2>>2)+r15]=1;break}else{r31=r29-1|0;r29=r30-1|0;HEAP32[(r14<<2>>2)+r15]=HEAP32[((r31>>>0>7?7:r31)<<5)+((r29>>>0>7?7:r29)<<2)+5244724>>2]+1|0;break}}}while(0);r28=r14+1|0;if((r28|0)<(HEAP32[r9>>2]|0)){r14=r28}else{break}}r16=r4+12|0,r17=r16>>2;HEAP32[r17]=0;r18=r4+8|0,r19=r18>>2;HEAP32[r19]=0;r20=r4+36|0,r21=r20>>2;HEAP32[r21]=0;r22=r1+280|0,r23=r22>>2;r24=HEAP32[r23];r25=r4+40|0,r26=r25>>2;r27=r24;HEAP32[r26]=r27;return}r14=(r1+416|0)>>2;r9=HEAP32[r14];do{if(r7){if((r9|0)==0){r3=7198;break}else{r3=7202;break}}else{if((r9|0)<(r6|0)){r3=7202;break}if((r9|0)>(HEAP32[r2+109]|0)){r3=7202;break}if((HEAP32[r2+85]|0)==1){r3=7198;break}else{r3=7202;break}}}while(0);do{if(r3==7198){r9=HEAP32[r2+105];if((r9|0)==0){r34=HEAP32[r2+106]}else{r6=r9-1|0;if((r6|0)==(HEAP32[r2+106]|0)){r34=r6}else{r3=7202;break}}if((r34|0)>13){r3=7202;break}else{break}}}while(0);if(r3==7202){r3=(r1|0)>>2;HEAP32[HEAP32[r3]+20>>2]=17;HEAP32[HEAP32[r3]+24>>2]=HEAP32[r5];HEAP32[HEAP32[r3]+28>>2]=HEAP32[r14];HEAP32[HEAP32[r3]+32>>2]=HEAP32[r2+105];HEAP32[HEAP32[r3]+36>>2]=HEAP32[r2+106];FUNCTION_TABLE[HEAP32[HEAP32[r3]>>2]](r1)}r3=(r1+340|0)>>2;L8880:do{if((HEAP32[r3]|0)>0){r34=r1+160|0;r6=r1+420|0;r9=r1+424|0;r7=(r1|0)>>2;r15=r1;r8=0;while(1){r12=HEAP32[HEAP32[((r8<<2)+344>>2)+r2]+4>>2];r10=HEAP32[r34>>2];r13=HEAP32[r5];do{if((r13|0)==0){r35=0}else{if((HEAP32[r10+(r12<<8)>>2]|0)>=0){r35=r13;break}HEAP32[HEAP32[r7]+20>>2]=118;HEAP32[HEAP32[r7]+24>>2]=r12;HEAP32[HEAP32[r7]+28>>2]=0;FUNCTION_TABLE[HEAP32[HEAP32[r7]+4>>2]](r15,-1);r35=HEAP32[r5]}}while(0);L8889:do{if((r35|0)<=(HEAP32[r14]|0)){r13=r35;while(1){r11=(r12<<8)+(r13<<2)+r10|0;r28=HEAP32[r11>>2];if((HEAP32[r6>>2]|0)!=(((r28|0)<0?0:r28)|0)){HEAP32[HEAP32[r7]+20>>2]=118;HEAP32[HEAP32[r7]+24>>2]=r12;HEAP32[HEAP32[r7]+28>>2]=r13;FUNCTION_TABLE[HEAP32[HEAP32[r7]+4>>2]](r15,-1)}HEAP32[r11>>2]=HEAP32[r9>>2];r11=r13+1|0;if((r11|0)>(HEAP32[r14]|0)){break L8889}else{r13=r11}}}}while(0);r12=r8+1|0;if((r12|0)<(HEAP32[r3]|0)){r8=r12}else{r36=r6;break L8880}}}else{r36=r1+420|0}}while(0);r14=(HEAP32[r5]|0)==0;r35=(r4+4|0)>>2;do{if((HEAP32[r36>>2]|0)==0){if(r14){HEAP32[r35]=284;break}else{HEAP32[r35]=420;break}}else{if(r14){HEAP32[r35]=82;break}else{HEAP32[r35]=352;break}}}while(0);L8907:do{if((HEAP32[r3]|0)>0){r35=r4+44|0;r14=r4+20|0;r6=r4+60|0;r8=0;while(1){r9=HEAP32[((r8<<2)+344>>2)+r2];do{if((HEAP32[r5]|0)==0){if((HEAP32[r36>>2]|0)!=0){break}r15=HEAP32[r9+20>>2];_jpeg_make_d_derived_tbl(r1,1,r15,(r15<<2)+r35|0)}else{r15=HEAP32[r9+24>>2];r7=(r15<<2)+r35|0;_jpeg_make_d_derived_tbl(r1,0,r15,r7);HEAP32[r6>>2]=HEAP32[r7>>2]}}while(0);HEAP32[r14+(r8<<2)>>2]=0;r9=r8+1|0;if((r9|0)<(HEAP32[r3]|0)){r8=r9}else{break L8907}}}}while(0);HEAP32[r4+16>>2]=0;r16=r4+12|0,r17=r16>>2;HEAP32[r17]=0;r18=r4+8|0,r19=r18>>2;HEAP32[r19]=0;r20=r4+36|0,r21=r20>>2;HEAP32[r21]=0;r22=r1+280|0,r23=r22>>2;r24=HEAP32[r23];r25=r4+40|0,r26=r25>>2;r27=r24;HEAP32[r26]=r27;return}function _decode_mcu_DC_first710(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52;r3=r1>>2;r4=0;r5=STACKTOP;STACKTOP=STACKTOP+40|0;r6=r5;r7=r5+20;r8=HEAP32[r3+117],r9=r8>>2;r10=HEAP32[r3+106];r11=r1+280|0;do{if((HEAP32[r11>>2]|0)!=0){if((HEAP32[r9+10]|0)!=0){break}r12=r8+12|0;r13=r1+464|0;r14=HEAP32[r13>>2]+24|0;HEAP32[r14>>2]=HEAP32[r14>>2]+((HEAP32[r12>>2]|0)/8&-1)|0;HEAP32[r12>>2]=0;if((FUNCTION_TABLE[HEAP32[HEAP32[r13>>2]+8>>2]](r1)|0)==0){r15=0;STACKTOP=r5;return r15}r13=r1+340|0;L8925:do{if((HEAP32[r13>>2]|0)>0){r12=r8+20|0;r14=0;while(1){HEAP32[r12+(r14<<2)>>2]=0;r16=r14+1|0;if((r16|0)<(HEAP32[r13>>2]|0)){r14=r16}else{break L8925}}}}while(0);HEAP32[r9+4]=0;HEAP32[r9+10]=HEAP32[r11>>2];if((HEAP32[r3+110]|0)!=0){break}HEAP32[r9+9]=0}}while(0);if((HEAP32[r9+9]|0)==0){HEAP32[r6+16>>2]=r1;r9=(r1+24|0)>>2;r11=HEAP32[r9];r13=HEAP32[r11>>2];r14=r6|0;HEAP32[r14>>2]=r13;r12=HEAP32[r11+4>>2];r16=r6+4|0;HEAP32[r16>>2]=r12;r17=r8+8|0;r18=HEAP32[r17>>2];r19=r8+12|0;r20=HEAP32[r19>>2];r21=r7>>2;r22=(r8+16|0)>>2;HEAP32[r21]=HEAP32[r22];HEAP32[r21+1]=HEAP32[r22+1];HEAP32[r21+2]=HEAP32[r22+2];HEAP32[r21+3]=HEAP32[r22+3];HEAP32[r21+4]=HEAP32[r22+4];r23=r1+368|0;do{if((HEAP32[r23>>2]|0)>0){r1=r8+44|0;r24=(r6+8|0)>>2;r25=(r6+12|0)>>2;r26=r18;r27=r20;r28=0;L8936:while(1){r29=HEAP32[r2+(r28<<2)>>2];r30=HEAP32[((r28<<2)+372>>2)+r3];r31=HEAP32[r1+(HEAP32[HEAP32[((r30<<2)+344>>2)+r3]+20>>2]<<2)>>2];do{if((r27|0)<8){if((_jpeg_fill_bit_buffer(r6,r26,r27,0)|0)==0){r15=0;r4=7288;break L8936}r32=HEAP32[r24];r33=HEAP32[r25];if((r33|0)<8){r34=1;r35=r33;r36=r32;r4=7274;break}else{r37=r33;r38=r32;r4=7272;break}}else{r37=r27;r38=r26;r4=7272}}while(0);do{if(r4==7272){r4=0;r32=r38>>r37-8&255;r33=HEAP32[r31+(r32<<2)+144>>2];if((r33|0)==0){r34=9;r35=r37;r36=r38;r4=7274;break}r39=HEAPU8[r31+(r32+1168)|0];r40=r37-r33|0;r41=r38;break}}while(0);if(r4==7274){r4=0;r33=_jpeg_huff_decode(r6,r36,r35,r31,r34);if((r33|0)<0){r15=0;r4=7289;break}r39=r33;r40=HEAP32[r25];r41=HEAP32[r24]}if((r39|0)==0){r42=0;r43=r40;r44=r41}else{if((r40|0)<(r39|0)){if((_jpeg_fill_bit_buffer(r6,r41,r40,r39)|0)==0){r15=0;r4=7287;break}r45=HEAP32[r25];r46=HEAP32[r24]}else{r45=r40;r46=r41}r33=r45-r39|0;r32=HEAP32[(r39<<2)+5247376>>2];r47=r46>>r33&r32;r42=r47-((r47|0)>(HEAP32[(r39-1<<2)+5247376>>2]|0)?0:r32)|0;r43=r33;r44=r46}r33=(r30<<2)+r7+4|0;r32=HEAP32[r33>>2]+r42|0;HEAP32[r33>>2]=r32;HEAP16[r29>>1]=r32<<r10&65535;r32=r28+1|0;if((r32|0)<(HEAP32[r23>>2]|0)){r26=r44;r27=r43;r28=r32}else{r4=7282;break}}if(r4==7282){r48=r44;r49=r43;r50=HEAP32[r14>>2];r51=HEAP32[r9];r52=HEAP32[r16>>2];break}else if(r4==7287){STACKTOP=r5;return r15}else if(r4==7288){STACKTOP=r5;return r15}else if(r4==7289){STACKTOP=r5;return r15}}else{r48=r18;r49=r20;r50=r13;r51=r11;r52=r12}}while(0);HEAP32[r51>>2]=r50;HEAP32[HEAP32[r9]+4>>2]=r52;HEAP32[r17>>2]=r48;HEAP32[r19>>2]=r49;HEAP32[r22]=HEAP32[r21];HEAP32[r22+1]=HEAP32[r21+1];HEAP32[r22+2]=HEAP32[r21+2];HEAP32[r22+3]=HEAP32[r21+3];HEAP32[r22+4]=HEAP32[r21+4]}r21=r8+40|0;HEAP32[r21>>2]=HEAP32[r21>>2]-1|0;r15=1;STACKTOP=r5;return r15}function _decode_mcu_AC_first711(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50;r3=r1>>2;r4=0;r5=STACKTOP;STACKTOP=STACKTOP+20|0;r6=r5;r7=HEAP32[r3+117],r8=r7>>2;r9=r1+280|0;do{if((HEAP32[r9>>2]|0)!=0){if((HEAP32[r8+10]|0)!=0){break}r10=r7+12|0;r11=r1+464|0;r12=HEAP32[r11>>2]+24|0;HEAP32[r12>>2]=HEAP32[r12>>2]+((HEAP32[r10>>2]|0)/8&-1)|0;HEAP32[r10>>2]=0;if((FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]+8>>2]](r1)|0)==0){r13=0;STACKTOP=r5;return r13}r11=r1+340|0;L8970:do{if((HEAP32[r11>>2]|0)>0){r10=r7+20|0;r12=0;while(1){HEAP32[r10+(r12<<2)>>2]=0;r14=r12+1|0;if((r14|0)<(HEAP32[r11>>2]|0)){r12=r14}else{break L8970}}}}while(0);HEAP32[r8+4]=0;HEAP32[r8+10]=HEAP32[r9>>2];if((HEAP32[r3+110]|0)!=0){break}HEAP32[r8+9]=0}}while(0);if((HEAP32[r8+9]|0)==0){r9=HEAP32[r3+104];r11=HEAP32[r3+106];r12=HEAP32[r3+108];r10=r7+16|0;r14=HEAP32[r10>>2];if((r14|0)==0){HEAP32[r6+16>>2]=r1;r15=(r1+24|0)>>2;r1=HEAP32[r15];r16=r6|0;HEAP32[r16>>2]=HEAP32[r1>>2];r17=r6+4|0;HEAP32[r17>>2]=HEAP32[r1+4>>2];r1=r7+8|0;r18=HEAP32[r1>>2];r19=r7+12|0;r20=HEAP32[r19>>2];r21=HEAP32[r2>>2];r2=HEAP32[r8+15];r8=HEAP32[r3+103];L8982:do{if((r8|0)>(r9|0)){r22=r20;r23=r18;r24=0}else{r3=(r6+8|0)>>2;r25=(r6+12|0)>>2;r26=r8;r27=r18;r28=r20;L8984:while(1){do{if((r28|0)<8){if((_jpeg_fill_bit_buffer(r6,r27,r28,0)|0)==0){r13=0;r4=7332;break L8984}r29=HEAP32[r3];r30=HEAP32[r25];if((r30|0)<8){r31=1;r32=r30;r33=r29;r4=7309;break}else{r34=r30;r35=r29;r4=7307;break}}else{r34=r28;r35=r27;r4=7307}}while(0);do{if(r4==7307){r4=0;r29=r35>>r34-8&255;r30=HEAP32[r2+(r29<<2)+144>>2];if((r30|0)==0){r31=9;r32=r34;r33=r35;r4=7309;break}r36=HEAPU8[r2+(r29+1168)|0];r37=r34-r30|0;r38=r35;break}}while(0);if(r4==7309){r4=0;r30=_jpeg_huff_decode(r6,r33,r32,r2,r31);if((r30|0)<0){r13=0;r4=7327;break}r36=r30;r37=HEAP32[r25];r38=HEAP32[r3]}r39=r36>>4;r30=r36&15;if((r30|0)==0){if((r39|0)==0){r22=r37;r23=r38;r24=0;break L8982}else if((r39|0)!=15){r4=7317;break}r40=r37;r41=r38;r42=r26+15|0}else{r29=r39+r26|0;if((r37|0)<(r30|0)){if((_jpeg_fill_bit_buffer(r6,r38,r37,r30)|0)==0){r13=0;r4=7331;break}r43=HEAP32[r25];r44=HEAP32[r3]}else{r43=r37;r44=r38}r45=r43-r30|0;r46=HEAP32[(r30<<2)+5247376>>2];r47=r44>>r45&r46;HEAP16[r21+(HEAP32[r12+(r29<<2)>>2]<<1)>>1]=r47-((r47|0)>(HEAP32[(r30-1<<2)+5247376>>2]|0)?0:r46)<<r11&65535;r40=r45;r41=r44;r42=r29}r29=r42+1|0;if((r29|0)>(r9|0)){r22=r40;r23=r41;r24=0;break L8982}else{r26=r29;r27=r41;r28=r40}}if(r4==7317){r28=1<<r39;do{if((r37|0)<(r39|0)){if((_jpeg_fill_bit_buffer(r6,r38,r37,r39)|0)==0){r13=0;STACKTOP=r5;return r13}else{r48=HEAP32[r25];r49=HEAP32[r3];break}}else{r48=r37;r49=r38}}while(0);r3=r48-r39|0;r22=r3;r23=r49;r24=r28-1+(r49>>r3&HEAP32[(r39<<2)+5247376>>2])|0;break}else if(r4==7331){STACKTOP=r5;return r13}else if(r4==7332){STACKTOP=r5;return r13}else if(r4==7327){STACKTOP=r5;return r13}}}while(0);HEAP32[HEAP32[r15]>>2]=HEAP32[r16>>2];HEAP32[HEAP32[r15]+4>>2]=HEAP32[r17>>2];HEAP32[r1>>2]=r23;HEAP32[r19>>2]=r22;r50=r24}else{r50=r14-1|0}HEAP32[r10>>2]=r50}r50=r7+40|0;HEAP32[r50>>2]=HEAP32[r50>>2]-1|0;r13=1;STACKTOP=r5;return r13}function _decode_mcu_DC_refine712(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33;r3=0;r4=STACKTOP;STACKTOP=STACKTOP+20|0;r5=r4;r6=HEAP32[r1+468>>2],r7=r6>>2;r8=1<<HEAP32[r1+424>>2];r9=r1+280|0;do{if((HEAP32[r9>>2]|0)!=0){if((HEAP32[r7+10]|0)!=0){break}r10=r6+12|0;r11=r1+464|0;r12=HEAP32[r11>>2]+24|0;HEAP32[r12>>2]=HEAP32[r12>>2]+((HEAP32[r10>>2]|0)/8&-1)|0;HEAP32[r10>>2]=0;if((FUNCTION_TABLE[HEAP32[HEAP32[r11>>2]+8>>2]](r1)|0)==0){r13=0;STACKTOP=r4;return r13}r11=r1+340|0;L9027:do{if((HEAP32[r11>>2]|0)>0){r10=r6+20|0;r12=0;while(1){HEAP32[r10+(r12<<2)>>2]=0;r14=r12+1|0;if((r14|0)<(HEAP32[r11>>2]|0)){r12=r14}else{break L9027}}}}while(0);HEAP32[r7+4]=0;HEAP32[r7+10]=HEAP32[r9>>2];if((HEAP32[r1+440>>2]|0)!=0){break}HEAP32[r7+9]=0}}while(0);HEAP32[r5+16>>2]=r1;r7=(r1+24|0)>>2;r9=HEAP32[r7];r11=HEAP32[r9>>2];r12=r5|0;HEAP32[r12>>2]=r11;r10=HEAP32[r9+4>>2];r14=r5+4|0;HEAP32[r14>>2]=r10;r15=r6+8|0;r16=HEAP32[r15>>2];r17=r6+12|0;r18=HEAP32[r17>>2];r19=r1+368|0;do{if((HEAP32[r19>>2]|0)>0){r1=r5+8|0;r20=r5+12|0;r21=0;r22=r16;r23=r18;while(1){r24=HEAP32[r2+(r21<<2)>>2];if((r23|0)<1){if((_jpeg_fill_bit_buffer(r5,r22,r23,1)|0)==0){r13=0;r3=7353;break}r25=HEAP32[r20>>2];r26=HEAP32[r1>>2]}else{r25=r23;r26=r22}r27=r25-1|0;if((1<<r27&r26|0)!=0){r28=r24|0;HEAP16[r28>>1]=(HEAPU16[r28>>1]|r8)&65535}r28=r21+1|0;if((r28|0)<(HEAP32[r19>>2]|0)){r21=r28;r22=r26;r23=r27}else{r3=7349;break}}if(r3==7349){r29=r26;r30=r27;r31=HEAP32[r12>>2];r32=HEAP32[r7];r33=HEAP32[r14>>2];break}else if(r3==7353){STACKTOP=r4;return r13}}else{r29=r16;r30=r18;r31=r11;r32=r9;r33=r10}}while(0);HEAP32[r32>>2]=r31;HEAP32[HEAP32[r7]+4>>2]=r33;HEAP32[r15>>2]=r29;HEAP32[r17>>2]=r30;r30=r6+40|0;HEAP32[r30>>2]=HEAP32[r30>>2]-1|0;r13=1;STACKTOP=r4;return r13}function _decode_mcu_AC_refine713(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41,r42,r43,r44,r45,r46,r47,r48,r49,r50,r51,r52,r53,r54,r55,r56,r57,r58,r59,r60,r61,r62,r63,r64,r65,r66,r67,r68,r69,r70,r71,r72,r73,r74,r75,r76,r77,r78,r79,r80,r81,r82;r3=r1>>2;r4=0;r5=STACKTOP;STACKTOP=STACKTOP+276|0;r6=r5;r7=r5+20;r8=HEAP32[r3+117],r9=r8>>2;r10=r1+280|0;do{if((HEAP32[r10>>2]|0)!=0){if((HEAP32[r9+10]|0)!=0){break}r11=r8+12|0;r12=r1+464|0;r13=HEAP32[r12>>2]+24|0;HEAP32[r13>>2]=HEAP32[r13>>2]+((HEAP32[r11>>2]|0)/8&-1)|0;HEAP32[r11>>2]=0;if((FUNCTION_TABLE[HEAP32[HEAP32[r12>>2]+8>>2]](r1)|0)==0){r14=0;STACKTOP=r5;return r14}r12=r1+340|0;L9057:do{if((HEAP32[r12>>2]|0)>0){r11=r8+20|0;r13=0;while(1){HEAP32[r11+(r13<<2)>>2]=0;r15=r13+1|0;if((r15|0)<(HEAP32[r12>>2]|0)){r13=r15}else{break L9057}}}}while(0);HEAP32[r9+4]=0;HEAP32[r9+10]=HEAP32[r10>>2];if((HEAP32[r3+110]|0)!=0){break}HEAP32[r9+9]=0}}while(0);do{if((HEAP32[r9+9]|0)==0){r10=HEAP32[r3+104];r12=HEAP32[r3+106];r13=1<<r12;r11=-1<<r12;r12=HEAP32[r3+108]>>2;HEAP32[r6+16>>2]=r1;r15=(r1+24|0)>>2;r16=HEAP32[r15];r17=r6|0;HEAP32[r17>>2]=HEAP32[r16>>2];r18=r6+4|0;HEAP32[r18>>2]=HEAP32[r16+4>>2];r16=r8+8|0;r19=HEAP32[r16>>2];r20=r8+12|0;r21=HEAP32[r20>>2];r22=r8+16|0;r23=HEAP32[r22>>2];r24=HEAP32[r2>>2];r25=HEAP32[r9+15];r26=HEAP32[r3+103];r27=(r6+8|0)>>2;r28=(r6+12|0)>>2;L9066:do{if((r23|0)==0){r29=r1|0;r30=r1;r31=0;r32=r26;r33=r21;r34=r19;L9068:while(1){do{if((r33|0)<8){if((_jpeg_fill_bit_buffer(r6,r34,r33,0)|0)==0){r35=r31;break L9066}r36=HEAP32[r27];r37=HEAP32[r28];if((r37|0)<8){r38=1;r39=r37;r40=r36;r4=7372;break}else{r41=r37;r42=r36;r4=7370;break}}else{r41=r33;r42=r34;r4=7370}}while(0);do{if(r4==7370){r4=0;r36=r42>>r41-8&255;r37=HEAP32[r25+(r36<<2)+144>>2];if((r37|0)==0){r38=9;r39=r41;r40=r42;r4=7372;break}r43=HEAPU8[r25+(r36+1168)|0];r44=r41-r37|0;r45=r42;break}}while(0);if(r4==7372){r4=0;r37=_jpeg_huff_decode(r6,r40,r39,r25,r38);if((r37|0)<0){r35=r31;break L9066}r43=r37;r44=HEAP32[r28];r45=HEAP32[r27]}r46=r43>>4;r37=r43&15;do{if((r37|0)==1){r4=7376}else if((r37|0)==0){if((r46|0)==15){r47=0;r48=r44;r49=r45;r50=15;break}else{break L9068}}else{HEAP32[HEAP32[r29>>2]+20>>2]=121;FUNCTION_TABLE[HEAP32[HEAP32[r29>>2]+4>>2]](r30,-1);r4=7376;break}}while(0);if(r4==7376){r4=0;if((r44|0)<1){if((_jpeg_fill_bit_buffer(r6,r45,r44,1)|0)==0){r35=r31;break L9066}r51=HEAP32[r28];r52=HEAP32[r27]}else{r51=r44;r52=r45}r37=r51-1|0;r47=(1<<r37&r52|0)==0?r11:r13;r48=r37;r49=r52;r50=r46}r37=r32;r36=r48;r53=r49;r54=r50;L9090:while(1){r55=((HEAP32[(r37<<2>>2)+r12]<<1)+r24|0)>>1;do{if(HEAP16[r55]<<16>>16==0){r56=r54-1|0;if((r56|0)<0){r57=r37;r58=r36;r59=r53;break L9090}else{r60=r36;r61=r53;r62=r56}}else{if((r36|0)<1){if((_jpeg_fill_bit_buffer(r6,r53,r36,1)|0)==0){r35=r31;break L9066}r63=HEAP32[r28];r64=HEAP32[r27]}else{r63=r36;r64=r53}r56=r63-1|0;if((1<<r56&r64|0)==0){r60=r56;r61=r64;r62=r54;break}r65=HEAP16[r55];r66=r65<<16>>16;if((r66&r13|0)!=0){r60=r56;r61=r64;r62=r54;break}if(r65<<16>>16>-1){HEAP16[r55]=r66+r13&65535;r60=r56;r61=r64;r62=r54;break}else{HEAP16[r55]=r66+r11&65535;r60=r56;r61=r64;r62=r54;break}}}while(0);r55=r37+1|0;if((r55|0)>(r10|0)){r57=r55;r58=r60;r59=r61;break}else{r37=r55;r36=r60;r53=r61;r54=r62}}if((r47|0)==0){r67=r31}else{r54=HEAP32[(r57<<2>>2)+r12];HEAP16[r24+(r54<<1)>>1]=r47&65535;HEAP32[r7+(r31<<2)>>2]=r54;r67=r31+1|0}r54=r57+1|0;if((r54|0)>(r10|0)){r68=r58;r69=r59;r70=0;r4=7413;break L9066}else{r31=r67;r32=r54;r33=r58;r34=r59}}r34=1<<r46;if((r46|0)==0){r71=r32;r72=r44;r73=r45;r74=r34;r75=r31;r4=7401;break}if((r44|0)<(r46|0)){if((_jpeg_fill_bit_buffer(r6,r45,r44,r46)|0)==0){r35=r31;break}r76=HEAP32[r28];r77=HEAP32[r27]}else{r76=r44;r77=r45}r33=r76-r46|0;r30=(r77>>r33&HEAP32[(r46<<2)+5247376>>2])+r34|0;if((r30|0)==0){r68=r33;r69=r77;r70=0;r4=7413;break}else{r71=r32;r72=r33;r73=r77;r74=r30;r75=r31;r4=7401;break}}else{r71=r26;r72=r21;r73=r19;r74=r23;r75=0;r4=7401}}while(0);L9115:do{if(r4==7401){r23=r71;r19=r72;r21=r73;while(1){r26=((HEAP32[(r23<<2>>2)+r12]<<1)+r24|0)>>1;do{if(HEAP16[r26]<<16>>16==0){r78=r19;r79=r21}else{if((r19|0)<1){if((_jpeg_fill_bit_buffer(r6,r21,r19,1)|0)==0){r35=r75;break L9115}r80=HEAP32[r28];r81=HEAP32[r27]}else{r80=r19;r81=r21}r25=r80-1|0;if((1<<r25&r81|0)==0){r78=r25;r79=r81;break}r30=HEAP16[r26];r33=r30<<16>>16;if((r33&r13|0)!=0){r78=r25;r79=r81;break}if(r30<<16>>16>-1){HEAP16[r26]=r33+r13&65535;r78=r25;r79=r81;break}else{HEAP16[r26]=r33+r11&65535;r78=r25;r79=r81;break}}}while(0);r26=r23+1|0;if((r26|0)>(r10|0)){break}else{r23=r26;r19=r78;r21=r79}}r68=r78;r69=r79;r70=r74-1|0;r4=7413;break}}while(0);if(r4==7413){HEAP32[HEAP32[r15]>>2]=HEAP32[r17>>2];HEAP32[HEAP32[r15]+4>>2]=HEAP32[r18>>2];HEAP32[r16>>2]=r69;HEAP32[r20>>2]=r68;HEAP32[r22>>2]=r70;break}if((r35|0)==0){r14=0;STACKTOP=r5;return r14}else{r82=r35}while(1){r10=r82-1|0;HEAP16[r24+(HEAP32[r7+(r10<<2)>>2]<<1)>>1]=0;if((r10|0)==0){r14=0;break}else{r82=r10}}STACKTOP=r5;return r14}}while(0);r82=r8+40|0;HEAP32[r82>>2]=HEAP32[r82>>2]-1|0;r14=1;STACKTOP=r5;return r14}
function _strtod(r1,r2){var r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25,r26,r27,r28,r29,r30,r31,r32,r33,r34,r35,r36,r37,r38,r39,r40,r41;r3=0;r4=r1;while(1){r5=r4+1|0;if((_isspace(HEAP8[r4]<<24>>24)|0)==0){break}else{r4=r5}}r6=HEAP8[r4];if(r6<<24>>24==45){r7=r5;r8=1}else if(r6<<24>>24==43){r7=r5;r8=0}else{r7=r4;r8=0}r4=-1;r5=0;r6=r7;while(1){r9=HEAP8[r6];if(((r9<<24>>24)-48|0)>>>0<10){r10=r4}else{if(r9<<24>>24!=46|(r4|0)>-1){break}else{r10=r5}}r4=r10;r5=r5+1|0;r6=r6+1|0}r10=r6+ -r5|0;r7=(r4|0)<0;r11=((r7^1)<<31>>31)+r5|0;r12=(r11|0)>18;r13=(r12?-18:-r11|0)+(r7?r5:r4)|0;r4=r12?18:r11;do{if((r4|0)==0){r14=r1;r15=0}else{do{if((r4|0)>9){r11=r10;r12=r4;r5=0;while(1){r7=HEAP8[r11];r16=r11+1|0;if(r7<<24>>24==46){r17=HEAP8[r16];r18=r11+2|0}else{r17=r7;r18=r16}r19=(r17<<24>>24)+((r5*10&-1)-48)|0;r16=r12-1|0;if((r16|0)>9){r11=r18;r12=r16;r5=r19}else{break}}r20=(r19|0)*1e9;r21=9;r22=r18;r3=6569;break}else{if((r4|0)>0){r20=0;r21=r4;r22=r10;r3=6569;break}else{r23=0;r24=0;break}}}while(0);if(r3==6569){r5=r22;r12=r21;r11=0;while(1){r16=HEAP8[r5];r7=r5+1|0;if(r16<<24>>24==46){r25=HEAP8[r7];r26=r5+2|0}else{r25=r16;r26=r7}r27=(r25<<24>>24)+((r11*10&-1)-48)|0;r7=r12-1|0;if((r7|0)>0){r5=r26;r12=r7;r11=r27}else{break}}r23=r27|0;r24=r20}r11=r24+r23;L7682:do{if(r9<<24>>24==69|r9<<24>>24==101){r12=r6+1|0;r5=HEAP8[r12];if(r5<<24>>24==45){r28=r6+2|0;r29=1}else if(r5<<24>>24==43){r28=r6+2|0;r29=0}else{r28=r12;r29=0}r12=HEAP8[r28];if(((r12<<24>>24)-48|0)>>>0<10){r30=r28;r31=0;r32=r12}else{r33=0;r34=r28;r35=r29;break}while(1){r12=(r32<<24>>24)+((r31*10&-1)-48)|0;r5=r30+1|0;r7=HEAP8[r5];if(((r7<<24>>24)-48|0)>>>0<10){r30=r5;r31=r12;r32=r7}else{r33=r12;r34=r5;r35=r29;break L7682}}}else{r33=0;r34=r6;r35=0}}while(0);r5=r13+((r35|0)==0?r33:-r33|0)|0;r12=(r5|0)<0?-r5|0:r5;do{if((r12|0)>511){HEAP32[___errno_location()>>2]=34;r36=1;r37=5244040;r38=511;r3=6586;break}else{if((r12|0)==0){r39=1;break}else{r36=1;r37=5244040;r38=r12;r3=6586;break}}}while(0);L7694:do{if(r3==6586){while(1){r3=0;if((r38&1|0)==0){r40=r36}else{r40=r36*(HEAP32[tempDoublePtr>>2]=HEAP32[r37>>2],HEAP32[tempDoublePtr+4>>2]=HEAP32[r37+4>>2],HEAPF64[tempDoublePtr>>3])}r12=r38>>1;if((r12|0)==0){r39=r40;break L7694}else{r36=r40;r37=r37+8|0;r38=r12;r3=6586}}}}while(0);if((r5|0)>-1){r14=r34;r15=r11*r39;break}else{r14=r34;r15=r11/r39;break}}}while(0);if((r2|0)!=0){HEAP32[r2>>2]=r14}if((r8|0)==0){r41=r15;return r41}r41=-r15;return r41}function __ZSt17__throw_bad_allocv(){var r1;r1=___cxa_allocate_exception(4);HEAP32[r1>>2]=5260924;___cxa_throw(r1,5267516,110)}function _i64Add(r1,r2,r3,r4){var r5,r6;r1=r1|0;r2=r2|0;r3=r3|0;r4=r4|0;r5=0,r6=0;r5=r1+r3>>>0;r6=r2+r4>>>0;if(r5>>>0<r1>>>0){r6=r6+1>>>0}return tempRet0=r6,r5|0}function _bitshift64Shl(r1,r2,r3){var r4;r1=r1|0;r2=r2|0;r3=r3|0;r4=0;if((r3|0)<32){r4=(1<<r3)-1|0;tempRet0=r2<<r3|(r1&r4<<32-r3)>>>32-r3;return r1<<r3}tempRet0=r1<<r3-32;return 0}function _bitshift64Lshr(r1,r2,r3){var r4;r1=r1|0;r2=r2|0;r3=r3|0;r4=0;if((r3|0)<32){r4=(1<<r3)-1|0;tempRet0=r2>>>r3;return r1>>>r3|(r2&r4)<<32-r3}tempRet0=0;return r2>>>r3-32|0}function _bitshift64Ashr(r1,r2,r3){var r4;r1=r1|0;r2=r2|0;r3=r3|0;r4=0;if((r3|0)<32){r4=(1<<r3)-1|0;tempRet0=r2>>r3;return r1>>>r3|(r2&r4)<<32-r3}tempRet0=(r2|0)<0?-1:0;return r2>>r3-32|0}
// EMSCRIPTEN_END_FUNCS
Module["_main"] = _main;
Module["_realloc"] = _realloc;
// TODO: strip out parts of this we do not need
//======= begin closure i64 code =======
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */
var i64Math = (function() { // Emscripten wrapper
  var goog = { math: {} };
  /**
   * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
   * values as *signed* integers.  See the from* functions below for more
   * convenient ways of constructing Longs.
   *
   * The internal representation of a long is the two given signed, 32-bit values.
   * We use 32-bit pieces because these are the size of integers on which
   * Javascript performs bit-operations.  For operations like addition and
   * multiplication, we split each number into 16-bit pieces, which can easily be
   * multiplied within Javascript's floating-point representation without overflow
   * or change in sign.
   *
   * In the algorithms below, we frequently reduce the negative case to the
   * positive case by negating the input(s) and then post-processing the result.
   * Note that we must ALWAYS check specially whether those values are MIN_VALUE
   * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
   * a positive number, it overflows back into a negative).  Not handling this
   * case would often result in infinite recursion.
   *
   * @param {number} low  The low (signed) 32 bits of the long.
   * @param {number} high  The high (signed) 32 bits of the long.
   * @constructor
   */
  goog.math.Long = function(low, high) {
    /**
     * @type {number}
     * @private
     */
    this.low_ = low | 0;  // force into 32 signed bits.
    /**
     * @type {number}
     * @private
     */
    this.high_ = high | 0;  // force into 32 signed bits.
  };
  // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
  // from* methods on which they depend.
  /**
   * A cache of the Long representations of small integer values.
   * @type {!Object}
   * @private
   */
  goog.math.Long.IntCache_ = {};
  /**
   * Returns a Long representing the given (32-bit) integer value.
   * @param {number} value The 32-bit integer in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
      var cachedObj = goog.math.Long.IntCache_[value];
      if (cachedObj) {
        return cachedObj;
      }
    }
    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
      goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
  };
  /**
   * Returns a Long representing the given value, provided that it is a finite
   * number.  Otherwise, zero is returned.
   * @param {number} value The number in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
      return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
      return goog.math.Long.fromNumber(-value).negate();
    } else {
      return new goog.math.Long(
          (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
          (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
    }
  };
  /**
   * Returns a Long representing the 64-bit integer that comes by concatenating
   * the given high and low bits.  Each is assumed to use 32 bits.
   * @param {number} lowBits The low 32-bits.
   * @param {number} highBits The high 32-bits.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
  };
  /**
   * Returns a Long representation of the given string, written using the given
   * radix.
   * @param {string} str The textual representation of the Long.
   * @param {number=} opt_radix The radix in which the text is written.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
      throw Error('number format error: empty string');
    }
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }
    if (str.charAt(0) == '-') {
      return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf('-') >= 0) {
      throw Error('number format error: interior "-" character: ' + str);
    }
    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));
    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
      var size = Math.min(8, str.length - i);
      var value = parseInt(str.substring(i, i + size), radix);
      if (size < 8) {
        var power = goog.math.Long.fromNumber(Math.pow(radix, size));
        result = result.multiply(power).add(goog.math.Long.fromNumber(value));
      } else {
        result = result.multiply(radixToPower);
        result = result.add(goog.math.Long.fromNumber(value));
      }
    }
    return result;
  };
  // NOTE: the compiler should inline these constant values below and then remove
  // these variables, so there should be no runtime penalty for these.
  /**
   * Number used repeated below in calculations.  This must appear before the
   * first call to any from* function below.
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_32_DBL_ =
      goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_31_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ / 2;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_48_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_64_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;
  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_63_DBL_ =
      goog.math.Long.TWO_PWR_64_DBL_ / 2;
  /** @type {!goog.math.Long} */
  goog.math.Long.ZERO = goog.math.Long.fromInt(0);
  /** @type {!goog.math.Long} */
  goog.math.Long.ONE = goog.math.Long.fromInt(1);
  /** @type {!goog.math.Long} */
  goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);
  /** @type {!goog.math.Long} */
  goog.math.Long.MAX_VALUE =
      goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
  /** @type {!goog.math.Long} */
  goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);
  /**
   * @type {!goog.math.Long}
   * @private
   */
  goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);
  /** @return {number} The value, assuming it is a 32-bit integer. */
  goog.math.Long.prototype.toInt = function() {
    return this.low_;
  };
  /** @return {number} The closest floating-point representation to this value. */
  goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
           this.getLowBitsUnsigned();
  };
  /**
   * @param {number=} opt_radix The radix in which the text should be written.
   * @return {string} The textual representation of this value.
   */
  goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }
    if (this.isZero()) {
      return '0';
    }
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        // We need to change the Long value before it can be negated, so we remove
        // the bottom-most digit in this base and then recurse to do the rest.
        var radixLong = goog.math.Long.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      } else {
        return '-' + this.negate().toString(radix);
      }
    }
    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));
    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
      var digits = intval.toString(radix);
      rem = remDiv;
      if (rem.isZero()) {
        return digits + result;
      } else {
        while (digits.length < 6) {
          digits = '0' + digits;
        }
        result = '' + digits + result;
      }
    }
  };
  /** @return {number} The high 32-bits as a signed value. */
  goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
  };
  /** @return {number} The low 32-bits as a signed value. */
  goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
  };
  /** @return {number} The low 32-bits as an unsigned value. */
  goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return (this.low_ >= 0) ?
        this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
  };
  /**
   * @return {number} Returns the number of bits needed to represent the absolute
   *     value of this Long.
   */
  goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return 64;
      } else {
        return this.negate().getNumBitsAbs();
      }
    } else {
      var val = this.high_ != 0 ? this.high_ : this.low_;
      for (var bit = 31; bit > 0; bit--) {
        if ((val & (1 << bit)) != 0) {
          break;
        }
      }
      return this.high_ != 0 ? bit + 33 : bit + 1;
    }
  };
  /** @return {boolean} Whether this value is zero. */
  goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
  };
  /** @return {boolean} Whether this value is negative. */
  goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
  };
  /** @return {boolean} Whether this value is odd. */
  goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long equals the other.
   */
  goog.math.Long.prototype.equals = function(other) {
    return (this.high_ == other.high_) && (this.low_ == other.low_);
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long does not equal the other.
   */
  goog.math.Long.prototype.notEquals = function(other) {
    return (this.high_ != other.high_) || (this.low_ != other.low_);
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than the other.
   */
  goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than or equal to the other.
   */
  goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than the other.
   */
  goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
  };
  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than or equal to the other.
   */
  goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
  };
  /**
   * Compares this Long with the given one.
   * @param {goog.math.Long} other Long to compare against.
   * @return {number} 0 if they are the same, 1 if the this is greater, and -1
   *     if the given one is greater.
   */
  goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
      return 0;
    }
    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
      return -1;
    }
    if (!thisNeg && otherNeg) {
      return 1;
    }
    // at this point, the signs are the same, so subtraction will not overflow
    if (this.subtract(other).isNegative()) {
      return -1;
    } else {
      return 1;
    }
  };
  /** @return {!goog.math.Long} The negation of this value. */
  goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.MIN_VALUE;
    } else {
      return this.not().add(goog.math.Long.ONE);
    }
  };
  /**
   * Returns the sum of this and the given Long.
   * @param {goog.math.Long} other Long to add to this one.
   * @return {!goog.math.Long} The sum of this and the given Long.
   */
  goog.math.Long.prototype.add = function(other) {
    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.
    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;
    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;
    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };
  /**
   * Returns the difference of this and the given Long.
   * @param {goog.math.Long} other Long to subtract from this.
   * @return {!goog.math.Long} The difference of this and the given Long.
   */
  goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
  };
  /**
   * Returns the product of this and the given long.
   * @param {goog.math.Long} other Long to multiply with this.
   * @return {!goog.math.Long} The product of this and the other.
   */
  goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
      return goog.math.Long.ZERO;
    } else if (other.isZero()) {
      return goog.math.Long.ZERO;
    }
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }
    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().multiply(other.negate());
      } else {
        return this.negate().multiply(other).negate();
      }
    } else if (other.isNegative()) {
      return this.multiply(other.negate()).negate();
    }
    // If both longs are small, use float multiplication
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
        other.lessThan(goog.math.Long.TWO_PWR_24_)) {
      return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }
    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.
    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;
    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;
    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };
  /**
   * Returns this Long divided by the given one.
   * @param {goog.math.Long} other Long by which to divide.
   * @return {!goog.math.Long} This Long divided by the given one.
   */
  goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
      throw Error('division by zero');
    } else if (this.isZero()) {
      return goog.math.Long.ZERO;
    }
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      if (other.equals(goog.math.Long.ONE) ||
          other.equals(goog.math.Long.NEG_ONE)) {
        return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ONE;
      } else {
        // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
        var halfThis = this.shiftRight(1);
        var approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) {
          return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        } else {
          var rem = this.subtract(other.multiply(approx));
          var result = approx.add(rem.div(other));
          return result;
        }
      }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ZERO;
    }
    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().div(other.negate());
      } else {
        return this.negate().div(other).negate();
      }
    } else if (other.isNegative()) {
      return this.div(other.negate()).negate();
    }
    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
      // Approximate the result of division. This may be a little greater or
      // smaller than the actual value.
      var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));
      // We will tweak the approximate result by changing it in the 48-th digit or
      // the smallest non-fractional digit, whichever is larger.
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);
      // Decrease the approximation until it is smaller than the remainder.  Note
      // that if it is too large, the product overflows and is negative.
      var approxRes = goog.math.Long.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = goog.math.Long.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }
      // We know the answer can't be zero... and actually, zero would cause
      // infinite recursion since we would make no progress.
      if (approxRes.isZero()) {
        approxRes = goog.math.Long.ONE;
      }
      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };
  /**
   * Returns this Long modulo the given one.
   * @param {goog.math.Long} other Long by which to mod.
   * @return {!goog.math.Long} This Long modulo the given one.
   */
  goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
  };
  /** @return {!goog.math.Long} The bitwise-NOT of this value. */
  goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
  };
  /**
   * Returns the bitwise-AND of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to AND.
   * @return {!goog.math.Long} The bitwise-AND of this and the other.
   */
  goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_,
                                   this.high_ & other.high_);
  };
  /**
   * Returns the bitwise-OR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to OR.
   * @return {!goog.math.Long} The bitwise-OR of this and the other.
   */
  goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_,
                                   this.high_ | other.high_);
  };
  /**
   * Returns the bitwise-XOR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to XOR.
   * @return {!goog.math.Long} The bitwise-XOR of this and the other.
   */
  goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                   this.high_ ^ other.high_);
  };
  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the left by the given amount.
   */
  goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var low = this.low_;
      if (numBits < 32) {
        var high = this.high_;
        return goog.math.Long.fromBits(
            low << numBits,
            (high << numBits) | (low >>> (32 - numBits)));
      } else {
        return goog.math.Long.fromBits(0, low << (numBits - 32));
      }
    }
  };
  /**
   * Returns this Long with bits shifted to the right by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount.
   */
  goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >> numBits);
      } else {
        return goog.math.Long.fromBits(
            high >> (numBits - 32),
            high >= 0 ? 0 : -1);
      }
    }
  };
  /**
   * Returns this Long with bits shifted to the right by the given amount, with
   * the new top bits matching the current sign bit.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount, with
   *     zeros placed into the new leading bits.
   */
  goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >>> numBits);
      } else if (numBits == 32) {
        return goog.math.Long.fromBits(high, 0);
      } else {
        return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
      }
    }
  };
  //======= begin jsbn =======
  var navigator = { appName: 'Modern Browser' }; // polyfill a little
  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // http://www-cs-students.stanford.edu/~tjw/jsbn/
  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */
  // Basic JavaScript BN library - subset useful for RSA encryption.
  // Bits per digit
  var dbits;
  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = ((canary&0xffffff)==0xefcafe);
  // (public) Constructor
  function BigInteger(a,b,c) {
    if(a != null)
      if("number" == typeof a) this.fromNumber(a,b,c);
      else if(b == null && "string" != typeof a) this.fromString(a,256);
      else this.fromString(a,b);
  }
  // return new, unset BigInteger
  function nbi() { return new BigInteger(null); }
  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.
  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i,x,w,j,c,n) {
    while(--n >= 0) {
      var v = x*this[i++]+w[j]+c;
      c = Math.floor(v/0x4000000);
      w[j++] = v&0x3ffffff;
    }
    return c;
  }
  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i,x,w,j,c,n) {
    var xl = x&0x7fff, xh = x>>15;
    while(--n >= 0) {
      var l = this[i]&0x7fff;
      var h = this[i++]>>15;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
      c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
      w[j++] = l&0x3fffffff;
    }
    return c;
  }
  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i,x,w,j,c,n) {
    var xl = x&0x3fff, xh = x>>14;
    while(--n >= 0) {
      var l = this[i]&0x3fff;
      var h = this[i++]>>14;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x3fff)<<14)+w[j]+c;
      c = (l>>28)+(m>>14)+xh*h;
      w[j++] = l&0xfffffff;
    }
    return c;
  }
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }
  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = ((1<<dbits)-1);
  BigInteger.prototype.DV = (1<<dbits);
  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2,BI_FP);
  BigInteger.prototype.F1 = BI_FP-dbits;
  BigInteger.prototype.F2 = 2*dbits-BI_FP;
  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr,vv;
  rr = "0".charCodeAt(0);
  for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  function int2char(n) { return BI_RM.charAt(n); }
  function intAt(s,i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c==null)?-1:c;
  }
  // (protected) copy this to r
  function bnpCopyTo(r) {
    for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }
  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    this.t = 1;
    this.s = (x<0)?-1:0;
    if(x > 0) this[0] = x;
    else if(x < -1) this[0] = x+DV;
    else this.t = 0;
  }
  // return bigint initialized to value
  function nbv(i) { var r = nbi(); r.fromInt(i); return r; }
  // (protected) set from string and radix
  function bnpFromString(s,b) {
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 256) k = 8; // byte array
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else { this.fromRadix(s,b); return; }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while(--i >= 0) {
      var x = (k==8)?s[i]&0xff:intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if(sh == 0)
        this[this.t++] = x;
      else if(sh+k > this.DB) {
        this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
        this[this.t++] = (x>>(this.DB-sh));
      }
      else
        this[this.t-1] |= x<<sh;
      sh += k;
      if(sh >= this.DB) sh -= this.DB;
    }
    if(k == 8 && (s[0]&0x80) != 0) {
      this.s = -1;
      if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
    }
    this.clamp();
    if(mi) BigInteger.ZERO.subTo(this,this);
  }
  // (protected) clamp off excess high words
  function bnpClamp() {
    var c = this.s&this.DM;
    while(this.t > 0 && this[this.t-1] == c) --this.t;
  }
  // (public) return string representation in given radix
  function bnToString(b) {
    if(this.s < 0) return "-"+this.negate().toString(b);
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1<<k)-1, d, m = false, r = "", i = this.t;
    var p = this.DB-(i*this.DB)%k;
    if(i-- > 0) {
      if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
      while(i >= 0) {
        if(p < k) {
          d = (this[i]&((1<<p)-1))<<(k-p);
          d |= this[--i]>>(p+=this.DB-k);
        }
        else {
          d = (this[i]>>(p-=k))&km;
          if(p <= 0) { p += this.DB; --i; }
        }
        if(d > 0) m = true;
        if(m) r += int2char(d);
      }
    }
    return m?r:"0";
  }
  // (public) -this
  function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }
  // (public) |this|
  function bnAbs() { return (this.s<0)?this.negate():this; }
  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var r = this.s-a.s;
    if(r != 0) return r;
    var i = this.t;
    r = i-a.t;
    if(r != 0) return (this.s<0)?-r:r;
    while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
    return 0;
  }
  // returns bit length of the integer x
  function nbits(x) {
    var r = 1, t;
    if((t=x>>>16) != 0) { x = t; r += 16; }
    if((t=x>>8) != 0) { x = t; r += 8; }
    if((t=x>>4) != 0) { x = t; r += 4; }
    if((t=x>>2) != 0) { x = t; r += 2; }
    if((t=x>>1) != 0) { x = t; r += 1; }
    return r;
  }
  // (public) return the number of bits in "this"
  function bnBitLength() {
    if(this.t <= 0) return 0;
    return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
  }
  // (protected) r = this << n*DB
  function bnpDLShiftTo(n,r) {
    var i;
    for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
    for(i = n-1; i >= 0; --i) r[i] = 0;
    r.t = this.t+n;
    r.s = this.s;
  }
  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n,r) {
    for(var i = n; i < this.t; ++i) r[i-n] = this[i];
    r.t = Math.max(this.t-n,0);
    r.s = this.s;
  }
  // (protected) r = this << n
  function bnpLShiftTo(n,r) {
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<cbs)-1;
    var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
    for(i = this.t-1; i >= 0; --i) {
      r[i+ds+1] = (this[i]>>cbs)|c;
      c = (this[i]&bm)<<bs;
    }
    for(i = ds-1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t+ds+1;
    r.s = this.s;
    r.clamp();
  }
  // (protected) r = this >> n
  function bnpRShiftTo(n,r) {
    r.s = this.s;
    var ds = Math.floor(n/this.DB);
    if(ds >= this.t) { r.t = 0; return; }
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<bs)-1;
    r[0] = this[ds]>>bs;
    for(var i = ds+1; i < this.t; ++i) {
      r[i-ds-1] |= (this[i]&bm)<<cbs;
      r[i-ds] = this[i]>>bs;
    }
    if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
    r.t = this.t-ds;
    r.clamp();
  }
  // (protected) r = this - a
  function bnpSubTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]-a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c -= a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c -= a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = (c<0)?-1:0;
    if(c < -1) r[i++] = this.DV+c;
    else if(c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }
  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a,r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i+y.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
    r.s = 0;
    r.clamp();
    if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
  }
  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2*x.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < x.t-1; ++i) {
      var c = x.am(i,x[i],r,2*i,0,1);
      if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
        r[i+x.t] -= x.DV;
        r[i+x.t+1] = 1;
      }
    }
    if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
    r.s = 0;
    r.clamp();
  }
  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m,q,r) {
    var pm = m.abs();
    if(pm.t <= 0) return;
    var pt = this.abs();
    if(pt.t < pm.t) {
      if(q != null) q.fromInt(0);
      if(r != null) this.copyTo(r);
      return;
    }
    if(r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
    if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
    else { pm.copyTo(y); pt.copyTo(r); }
    var ys = y.t;
    var y0 = y[ys-1];
    if(y0 == 0) return;
    var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
    var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
    var i = r.t, j = i-ys, t = (q==null)?nbi():q;
    y.dlShiftTo(j,t);
    if(r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t,r);
    }
    BigInteger.ONE.dlShiftTo(ys,t);
    t.subTo(y,y);	// "negative" y so we can replace sub with am later
    while(y.t < ys) y[y.t++] = 0;
    while(--j >= 0) {
      // Estimate quotient digit
      var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
      if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
        y.dlShiftTo(j,t);
        r.subTo(t,r);
        while(r[i] < --qd) r.subTo(t,r);
      }
    }
    if(q != null) {
      r.drShiftTo(ys,q);
      if(ts != ms) BigInteger.ZERO.subTo(q,q);
    }
    r.t = ys;
    r.clamp();
    if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
    if(ts < 0) BigInteger.ZERO.subTo(r,r);
  }
  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a,null,r);
    if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
    return r;
  }
  // Modular reduction using "classic" algorithm
  function Classic(m) { this.m = m; }
  function cConvert(x) {
    if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) { return x; }
  function cReduce(x) { x.divRemTo(this.m,null,x); }
  function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }
  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;
  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    if(this.t < 1) return 0;
    var x = this[0];
    if((x&1) == 0) return 0;
    var y = x&3;		// y == 1/x mod 2^2
    y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
    y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
    y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y>0)?this.DV-y:-y;
  }
  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp&0x7fff;
    this.mph = this.mp>>15;
    this.um = (1<<(m.DB-15))-1;
    this.mt2 = 2*m.t;
  }
  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t,r);
    r.divRemTo(this.m,null,r);
    if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
    return r;
  }
  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }
  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    while(x.t <= this.mt2)	// pad x so am has enough room later
      x[x.t++] = 0;
    for(var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i]&0x7fff;
      var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
      // use am to combine the multiply-shift-add into one call
      j = i+this.m.t;
      x[j] += this.m.am(0,u0,x,i,0,this.m.t);
      // propagate carry
      while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
    }
    x.clamp();
    x.drShiftTo(this.m.t,x);
    if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
  }
  // r = "x^2/R mod m"; x != r
  function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }
  // r = "xy/R mod m"; x,y != r
  function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;
  // (protected) true iff this is even
  function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }
  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e,z) {
    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
    g.copyTo(r);
    while(--i >= 0) {
      z.sqrTo(r,r2);
      if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
      else { var t = r; r = r2; r2 = t; }
    }
    return z.revert(r);
  }
  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e,m) {
    var z;
    if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
    return this.exp(e,z);
  }
  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;
  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;
  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);
  // jsbn2 stuff
  // (protected) convert from radix string
  function bnpFromRadix(s,b) {
    this.fromInt(0);
    if(b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
    for(var i = 0; i < s.length; ++i) {
      var x = intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b*w+x;
      if(++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w,0);
        j = 0;
        w = 0;
      }
    }
    if(j > 0) {
      this.dMultiply(Math.pow(b,j));
      this.dAddOffset(w,0);
    }
    if(mi) BigInteger.ZERO.subTo(this,this);
  }
  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }
  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    if(this.s < 0) return -1;
    else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
    else return 1;
  }
  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    this[this.t] = this.am(0,n-1,this,0,0,this.t);
    ++this.t;
    this.clamp();
  }
  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n,w) {
    if(n == 0) return;
    while(this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while(this[w] >= this.DV) {
      this[w] -= this.DV;
      if(++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }
  // (protected) convert to radix string
  function bnpToRadix(b) {
    if(b == null) b = 10;
    if(this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b,cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d,y,z);
    while(y.signum() > 0) {
      r = (a+z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d,y,z);
    }
    return z.intValue().toString(b) + r;
  }
  // (public) return value as integer
  function bnIntValue() {
    if(this.s < 0) {
      if(this.t == 1) return this[0]-this.DV;
      else if(this.t == 0) return -1;
    }
    else if(this.t == 1) return this[0];
    else if(this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
  }
  // (protected) r = this + a
  function bnpAddTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]+a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c += a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c += a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = (c<0)?-1:0;
    if(c > 0) r[i++] = c;
    else if(c < -1) r[i++] = this.DV+c;
    r.t = i;
    r.clamp();
  }
  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.addTo = bnpAddTo;
  //======= end jsbn =======
  // Emscripten wrapper
  var Wrapper = {
    subtract: function(xl, xh, yl, yh) {
      var x = new goog.math.Long(xl, xh);
      var y = new goog.math.Long(yl, yh);
      var ret = x.subtract(y);
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    multiply: function(xl, xh, yl, yh) {
      var x = new goog.math.Long(xl, xh);
      var y = new goog.math.Long(yl, yh);
      var ret = x.multiply(y);
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    abs: function(l, h) {
      var x = new goog.math.Long(l, h);
      var ret;
      if (x.isNegative()) {
        ret = x.negate();
      } else {
        ret = x;
      }
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    ensureTemps: function() {
      if (Wrapper.ensuredTemps) return;
      Wrapper.ensuredTemps = true;
      Wrapper.two32 = new BigInteger();
      Wrapper.two32.fromString('4294967296', 10);
      Wrapper.two64 = new BigInteger();
      Wrapper.two64.fromString('18446744073709551616', 10);
      Wrapper.temp1 = new BigInteger();
      Wrapper.temp2 = new BigInteger();
    },
    lh2bignum: function(l, h) {
      var a = new BigInteger();
      a.fromString(h.toString(), 10);
      var b = new BigInteger();
      a.multiplyTo(Wrapper.two32, b);
      var c = new BigInteger();
      c.fromString(l.toString(), 10);
      var d = new BigInteger();
      c.addTo(b, d);
      return d;
    },
    divide: function(xl, xh, yl, yh, unsigned) {
      Wrapper.ensureTemps();
      if (!unsigned) {
        var x = new goog.math.Long(xl, xh);
        var y = new goog.math.Long(yl, yh);
        var ret = x.div(y);
        HEAP32[tempDoublePtr>>2] = ret.low_;
        HEAP32[tempDoublePtr+4>>2] = ret.high_;
      } else {
        // slow precise bignum division
        var x = Wrapper.lh2bignum(xl >>> 0, xh >>> 0);
        var y = Wrapper.lh2bignum(yl >>> 0, yh >>> 0);
        var z = new BigInteger();
        x.divRemTo(y, z, null);
        var l = new BigInteger();
        var h = new BigInteger();
        z.divRemTo(Wrapper.two32, h, l);
        HEAP32[tempDoublePtr>>2] = parseInt(l.toString()) | 0;
        HEAP32[tempDoublePtr+4>>2] = parseInt(h.toString()) | 0;
      }
    },
    modulo: function(xl, xh, yl, yh, unsigned) {
      Wrapper.ensureTemps();
      if (!unsigned) {
        var x = new goog.math.Long(xl, xh);
        var y = new goog.math.Long(yl, yh);
        var ret = x.modulo(y);
        HEAP32[tempDoublePtr>>2] = ret.low_;
        HEAP32[tempDoublePtr+4>>2] = ret.high_;
      } else {
        // slow precise bignum division
        var x = Wrapper.lh2bignum(xl >>> 0, xh >>> 0);
        var y = Wrapper.lh2bignum(yl >>> 0, yh >>> 0);
        var z = new BigInteger();
        x.divRemTo(y, null, z);
        var l = new BigInteger();
        var h = new BigInteger();
        z.divRemTo(Wrapper.two32, h, l);
        HEAP32[tempDoublePtr>>2] = parseInt(l.toString()) | 0;
        HEAP32[tempDoublePtr+4>>2] = parseInt(h.toString()) | 0;
      }
    },
    stringify: function(l, h, unsigned) {
      var ret = new goog.math.Long(l, h).toString();
      if (unsigned && ret[0] == '-') {
        // unsign slowly using jsbn bignums
        Wrapper.ensureTemps();
        var bignum = new BigInteger();
        bignum.fromString(ret, 10);
        ret = new BigInteger();
        Wrapper.two64.addTo(bignum, ret);
        ret = ret.toString(10);
      }
      return ret;
    },
    fromString: function(str, base, min, max, unsigned) {
      Wrapper.ensureTemps();
      var bignum = new BigInteger();
      bignum.fromString(str, base);
      var bigmin = new BigInteger();
      bigmin.fromString(min, 10);
      var bigmax = new BigInteger();
      bigmax.fromString(max, 10);
      if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
        var temp = new BigInteger();
        bignum.addTo(Wrapper.two64, temp);
        bignum = temp;
      }
      var error = false;
      if (bignum.compareTo(bigmin) < 0) {
        bignum = bigmin;
        error = true;
      } else if (bignum.compareTo(bigmax) > 0) {
        bignum = bigmax;
        error = true;
      }
      var ret = goog.math.Long.fromString(bignum.toString()); // min-max checks should have clamped this to a range goog.math.Long can handle well
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
      if (error) throw 'range error';
    }
  };
  return Wrapper;
})();
//======= end closure i64 code =======
// === Auto-generated postamble setup entry stuff ===
Module.callMain = function callMain(args) {
  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_STATIC) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_STATIC));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_STATIC);
  var ret;
  var initialStackTop = STACKTOP;
  try {
    ret = Module['_main'](argc, argv, 0);
  }
  catch(e) {
    if (e.name == 'ExitStatus') {
      return e.status;
    } else if (e == 'SimulateInfiniteLoop') {
      Module['noExitRuntime'] = true;
    } else {
      throw e;
    }
  } finally {
    STACKTOP = initialStackTop;
  }
  return ret;
}
function run(args) {
  args = args || Module['arguments'];
  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return 0;
  }
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    var toRun = Module['preRun'];
    Module['preRun'] = [];
    for (var i = toRun.length-1; i >= 0; i--) {
      toRun[i]();
    }
    if (runDependencies > 0) {
      // a preRun added a dependency, run will be called later
      return 0;
    }
  }
  function doRun() {
    var ret = 0;
    calledRun = true;
    if (Module['_main']) {
      preMain();
      ret = Module.callMain(args);
      if (!Module['noExitRuntime']) {
        exitRuntime();
      }
    }
    if (Module['postRun']) {
      if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
      while (Module['postRun'].length > 0) {
        Module['postRun'].pop()();
      }
    }
    return ret;
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
    return 0;
  } else {
    return doRun();
  }
}
Module['run'] = Module.run = run;
// {{PRE_RUN_ADDITIONS}}
if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}
initRuntime();
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}
if (shouldRunNow) {
  run();
}
// {{POST_RUN_ADDITIONS}}
  // {{MODULE_ADDITIONS}}