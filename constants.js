const LANGUAGE_PREFIX = 'Javascript.';
exports.LANGUAGE_PREFIX = LANGUAGE_PREFIX;


const STD = LANGUAGE_PREFIX+'__std_library__.';
exports.STD = STD;


exports.THIRD_PARTY = LANGUAGE_PREFIX+'__3rd_party__.';


exports.LANGUAGE_TECH = LANGUAGE_PREFIX+'__grammar__.';


exports.BABYLON_OPTIONS = { 
    sourceType: "module",
    plugins: [
        "jsx",
        "flow",
        "doExpressions",
        "objectRestSpread",
        "decorators",
        "classProperties",
        "exportExtensions",
        "asyncGenerators",
        "functionBind",
        "functionSent"
    ]
};


exports.STANDARD_LIBRARY = new Map([
    'Infinity',
    'NaN',    
    'undefined',
    'null',    
    'eval',   
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    'escape',
    'unescape',
    'Object',
    'Function',
    'Boolean',
    'Symbol',
    'Error',
    'EvalError',
    'InternalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
    'Number',
    'Math',
    'Date',
    'String',
    'RegExp',
    'Array',
    'Int8Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
    'Map',
    'Set',
    'WeakMap',
    'WeakSet',
    'SIMD',
    'SIMD.Float32x4',
    'SIMD.Float64x2',
    'SIMD.Int8x16',
    'SIMD.Int16x8',
    'SIMD.Int32x4',
    'SIMD.Uint8x16',
    'SIMD.Uint16x8',
    'SIMD.Uint32x4',
    'SIMD.Bool8x16',
    'SIMD.Bool16x8',
    'SIMD.Bool32x4',
    'SIMD.Bool64x2',
    'ArrayBuffer',
    'SharedArrayBuffer ',
    'Atomics ',
    'DataView',
    'JSON',
    'Promise',
    'Generator',
    'GeneratorFunction',
    'Reflect',
    'Proxy',
    'Intl',
    'Intl.Collator',
    'Intl.DateTimeFormat',
    'Intl.NumberFormat',
    'arguments'
].map(obj => [obj, STD+obj]));


