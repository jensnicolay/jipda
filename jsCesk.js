"use strict";


var EMPTY_KONT = {equals:function (x) {return x === EMPTY_KONT}, hashCode:function () {return 0}, toString:function () {return "@---"}};
var EMPTY_LKONT = [];
var EMPTY_ADDRESS_SET = ArraySet.empty();

function jsCesk(cc)
{
  // address generator
  const a = cc.a;
  // lattice
  const l = cc.l || new JipdaLattice();
  // atomic evaluation
  const aeFlag = cc.ae === undefined ? true : cc.ae;
  // gc
  const gcFlag = cc.gc === undefined ? true : cc.gc;
  //
  const errors = cc.errors === undefined ? false : cc.errors; 
  
  assert(a);
  assert(l);
  
  var __ALLOC__NATIVE__COUNTER = 1; 
  function allocNative()
  {
    var a = __ALLOC__NATIVE__COUNTER++;
    return a;
  }

  //print("alloc", a, "lat", l, "gc", gcFlag);
  
  // install constants
  var L_UNDEFINED = l.abst1(undefined);
  var L_NULL = l.abst1(null);
  var L_0 = l.abst1(0);
  var L_1 = l.abst1(1);
  var L_FALSE = l.abst1(false);
  var L_MININFINITY = l.abst1(-Infinity);
  var L_EMPTY_STRING = l.abst1("");
//  var P_0 = l.abst1(0);
//  var P_1 = l.abst1(1);
//  var P_TRUE = l.abst1(true);
//  var P_FALSE = l.abst1(false);
//  var P_THIS = l.abst1("this");
  var P_PROTOTYPE = l.abst1("prototype");
  var P_CONSTRUCTOR = l.abst1("constructor");
  var P_LENGTH = l.abst1("length");
  var P_MESSAGE = l.abst1("message");
  
//  var P_RETVAL = l.abst1("!retVal!");

  // install global pointers and refs
  var globala = allocNative();
  var globalRef = l.abstRef(globala); // global this
  //var globalenva = "globalenv@0";
  var objectPa = allocNative();
  var objectProtoRef = l.abstRef(objectPa);
  var functionPa = allocNative();
  var functionProtoRef = l.abstRef(functionPa);
  var stringPa = allocNative();
  var stringProtoRef = l.abstRef(stringPa);
  var arrayPa = allocNative();
  var arrayProtoRef = l.abstRef(arrayPa);
  var errorPa = allocNative();
  var errorProtoRef = l.abstRef(errorPa);
  
  const popTodo = [];
  var contexts = MutableHashSet.empty(10007);
    
//function stackFrames(lkont, kont)
//{
//  var todo = [kont];
//  var result = ArraySet.from(lkont);
//  var visited = ArraySet.empty();
//  while (todo.length > 0)
//  {
//    var kont = todo.pop();
//    if (kont === EMPTY_KONT || visited.contains(kont))
//    {
//      continue;
//    }
//    visited = visited.add(kont);
//    var stacks = sstore.get(kont);
//    stacks.forEach(
//      function (stack)
//      {
//        var lkont = stack[0];
//        result = result.addAll(lkont);
//        var kont = stack[1];          
//        todo = todo.push(kont);
//      });
//  }
//  return result;
//}

  function Context(ex, callable, args, thisa, store, as)
  {
    this.ex = ex;
    this.callable = callable;
    this.args = args;
    this.thisa = thisa;
    this.store = store;
    this.as = as;
    this._hashCode = undefined;
    this._stacks = null;
  }
  
  Context.prototype.equals =
    function (x)
    {
      if (this === x)
      {
        return true;
      }
      if (!(x instanceof Context))
      {
        return false;
      }
      return this.ex === x.ex
        && this.thisa.equals(x.thisa)
        && this.callable.equals(x.callable)
        && this.args.equals(x.args)
        && this.store.equals(x.store)
        && this.as.equals(x.as)
    }
  
  Context.prototype.hashCode =
    function ()
    {
      if (this._hashCode !== undefined)
      {
        return this._hashCode;
      }
      var prime = 31;
      var result = 1;
      result = prime * result + this.ex.hashCode();
      result = prime * result + this.callable.hashCode();
      result = prime * result + this.args.hashCode();
      result = prime * result + this.thisa.hashCode();
      result = prime * result + this.store.hashCode();
      result = prime * result + this.as.hashCode();
      this._hashCode = result;
      return result;
    }
  
  Context.prototype.toString =
    function ()
    {
      return "@" + this.ex;
    }
  
  function stackAddresses(lkont, kont)
  {
    var addresses = (kont === EMPTY_KONT ? EMPTY_ADDRESS_SET : kont.as)
    for (var i = 0; i < lkont.length; i++)
    {
      var frame = lkont[i];
      addresses = addresses.join(frame.addresses());
    }
    return addresses;
  }
  
//  function storeWeakAlloc(store, addr, value)
//  {
//    assert(addr>>>0===addr);
//    return store.weakAllocAval(addr, value);
//  }
  
  function storeAlloc(store, addr, value)
  {
    assert(addr>>>0===addr);
    return store.allocAval(addr, value);
  }
  
  function storeUpdate(store, addr, value)
  {
    assert(addr>>>0===addr);
    return store.updateAval(addr, value);
  }
  
  function storeLookup(store, addr)
  {
    assert(addr>>>0===addr);
    return store.lookupAval(addr);
  }
  
  
//  function allocObjectEffect(a)
//  {
//    return new Effect(Effect.Operations.ALLOC, Effect.Targets.OBJECT, a);
//  }
  
  function readObjectEffect(a, name)
  {
    return new Effect(Effect.Operations.READ, a, name);
  }
  
  function readVarEffect(a, vr)
  {
    return new Effect(Effect.Operations.READ, a, vr);
  }
  
  function writeObjectEffect(a, name)
  {
    return new Effect(Effect.Operations.WRITE, a, name);
  }
  
  function writeVarEffect(a, vr)
  {
    return new Effect(Effect.Operations.WRITE, a, vr);
  }
  
  function createEnvironment(parents)
  {
    var benv = Benv.empty(parents);
    return benv;    
  }

  function createObject(Prototype)
  {
    assertDefinedNotNull(Prototype, "[[Prototype]]");
    var benv = Obj.createObject(Prototype);
    return benv;
  }

  function createArray()
  {
    var benv = Obj.createArray(arrayProtoRef);
    return benv;
  }
  
  function createError(message)
  {
    var benv = Obj.createError(errorProtoRef);
    benv = benv.add(P_MESSAGE, message);
    return benv;
  }

  function createString(lprim)
  {
    var benv = new Obj(ArraySet.from1(Ecma.Class.STRING));
    benv.Prototype = stringProtoRef;
    benv.PrimitiveValue = lprim;
    benv = benv.add(P_LENGTH, lprim.stringLength());
    return benv;
  }

  function createClosure(node, scope)
  {
    var benv = Obj.createFunction(new ObjClosureCall(node, scope), functionProtoRef);
    return benv;
  }

  function createPrimitive(applyFunction, applyConstructor)
  {
    var benv = Obj.createFunction(new ObjPrimitiveCall(applyFunction, applyConstructor), functionProtoRef);
    return benv;
  }
  
  function registerPrimitiveFunction(object, objectAddress, propertyName, applyFunction, applyConstructor)
  {
    var primFunObject = createPrimitive(applyFunction, applyConstructor);
    var primFunObjectAddress = allocNative(); 
    store = storeAlloc(store, primFunObjectAddress, primFunObject);
    return registerProperty(object, propertyName, l.abstRef(primFunObjectAddress));
  }
  
  function registerProperty(object, propertyName, value)
  {
    object = object.add(l.abst1(propertyName), value);
    return object;      
  }
  
  function functionScopeDeclarations(node)
  {
    var funScopeDecls = node.funScopeDecls;
    if (!funScopeDecls)
    {
      funScopeDecls = Ast.functionScopeDeclarations(node);
      node.funScopeDecls = funScopeDecls;
    }
    return funScopeDecls;
  }
  
  // create global object and initial store
  var global = createObject(objectProtoRef);
  var globalEnv = Benv.empty(ArraySet.empty());
  var store = Store.empty();
  
  // BEGIN OBJECT
  var objectP = createObject(L_NULL);
//  objectP.toString = function () { return "~Object.prototype"; }; // debug
  var objecta = allocNative();
  objectP = registerProperty(objectP, "constructor", l.abstRef(objecta));
  
  var object = createPrimitive(null, objectConstructor);
  object = object.add(P_PROTOTYPE, objectProtoRef);//was objectProtoRef
  global = global.add(l.abst1("Object"), l.abstRef(objecta));
  
  object = registerPrimitiveFunction(object, objecta, "create", objectCreate);
  object = registerPrimitiveFunction(object, objecta, "getPrototypeOf", objectGetPrototypeOf);

  store = storeAlloc(store, objecta, object);
  store = storeAlloc(store, objectPa, objectP);
  // END OBJECT

      
  // BEGIN FUNCTION
  var functionP = createObject(objectProtoRef);
//  functionP.toString = function () { return "~Function.prototype"; }; // debug
  var functiona = allocNative();
  var functionP = registerProperty(functionP, "constructor", l.abstRef(functiona));
  var fun = createPrimitive(function () {}); // TODO
  fun = fun.add(P_PROTOTYPE, functionProtoRef);
  global = global.add(l.abst1("Function"), l.abstRef(functiona));
  store = storeAlloc(store, functiona, fun);

  store = storeAlloc(store, functionPa, functionP);
  // END FUNCTION 
          
  // BEGIN STRING
  var stringP = createObject(objectProtoRef);
//  stringP.toString = function () { return "~String.prototype"; }; // debug
  var stringa = allocNative();
  var stringP = registerProperty(stringP, "constructor", l.abstRef(stringa));
  var string = createPrimitive(stringFunction, null);
  string = string.add(P_PROTOTYPE, stringProtoRef);
  global = global.add(l.abst1("String"), l.abstRef(stringa));
  store = storeAlloc(store, stringa, string);

  stringP = registerPrimitiveFunction(stringP, stringPa, "charAt", stringCharAt);
  stringP = registerPrimitiveFunction(stringP, stringPa, "charCodeAt", stringCharCodeAt);
  stringP = registerPrimitiveFunction(stringP, stringPa, "startsWith", stringStartsWith);
    
  store = storeAlloc(store, stringPa, stringP);
  // END STRING 
          
  // BEGIN ARRAY
  var arrayP = createObject(objectProtoRef);
  arrayP.toString = function () { return "~Array.prototype"; }; // debug
  var arraya = allocNative();
  var arrayP = registerProperty(arrayP, "constructor", l.abstRef(arraya));
  var array = createPrimitive(arrayFunction, arrayConstructor);
  array = array.add(P_PROTOTYPE, arrayProtoRef);
  global = global.add(l.abst1("Array"), l.abstRef(arraya));
  store = storeAlloc(store, arraya, array);
  
  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "toString", arrayToString);
  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "concat", arrayConcat);
  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "push", arrayPush);
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "map", arrayMap);
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "reduce", arrayReduce);
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "filter", arrayFilter);
  store = storeAlloc(store, arrayPa, arrayP);
  // END ARRAY
  
  // BEGIN ERROR
  var errorP = createObject(objectProtoRef);
//  errorP.toString = function () { return "~Error.prototype"; }; // debug
  var errora = allocNative();
  var errorP = registerProperty(errorP, "constructor", l.abstRef(errora));
  var error = createPrimitive(errorConstructor, errorConstructor);
  error = error.add(P_PROTOTYPE, errorProtoRef);
  global = global.add(l.abst1("Error"), l.abstRef(errora));
  store = storeAlloc(store, errora, error);
  store = storeAlloc(store, errorPa, errorP);
  // END ERROR
  
  // BEGIN MATH
  var math = createObject(objectProtoRef);
  var matha = allocNative();
  math = registerPrimitiveFunction(math, matha, "abs", mathAbs);
  math = registerPrimitiveFunction(math, matha, "round", mathRound);
  math = registerPrimitiveFunction(math, matha, "sin", mathSin);
  math = registerPrimitiveFunction(math, matha, "cos", mathCos);
  math = registerPrimitiveFunction(math, matha, "sqrt", mathSqrt);
  math = registerPrimitiveFunction(math, matha, "random", mathRandom);
//  math = registerPrimitiveFunction(math, matha, "max", mathMax);
//  math = registerProperty(math, "PI", l.abst1(Math.PI));
  store = storeAlloc(store, matha, math);
  global = global.add(l.abst1("Math"), l.abstRef(matha));
  // END MATH
  
  // BEGIN PERFORMANCE
  var perf = createObject(objectProtoRef);
  var perfa = allocNative();
  perf = registerPrimitiveFunction(perf, perfa, "now", performanceNow);
  store = storeAlloc(store, perfa, perf);
  global = global.add(l.abst1("performance"), l.abstRef(perfa));  
  // END PERFORMANCE
  
  // BEGIN GLOBAL
  globalEnv = globalEnv.add("this", globalRef); // global "this" address
  // ECMA 15.1.1 value properties of the global object (no "null", ...)
  global = registerProperty(global, "undefined", L_UNDEFINED);
  global = registerProperty(global, "NaN", l.abst1(NaN));
  global = registerProperty(global, "Infinity", l.abst1(Infinity));
  global = registerPrimitiveFunction(global, globala, "parseInt", globalParseInt);

  // specific interpreter functions
//  global = registerPrimitiveFunction(global, globala, "$meta", $meta);
  global = registerPrimitiveFunction(global, globala, "$join", $join);
  global = registerPrimitiveFunction(global, globala, "print", _print);
  // end specific interpreter functions
  
//  store = storeAlloc(store, globalenva, globalEnv);
  store = storeAlloc(store, globala, global);
  // END GLOBAL
  
  // BEGIN PRIMITIVES
  function objectConstructor(application, operandValues, protoRef, benv, store, lkont, kont, effects)
  {
    var obj = createObject(protoRef);
    var objectAddress = a.object(application, benv, store, kont);
    store = storeAlloc(store, objectAddress, obj);
    var objRef = l.abstRef(objectAddress);
    return [{state:new KontState(objRef, store, lkont, kont), effects:effects}];
  }    
  
  function objectCreate(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    if (operandValues.length !== 1)
    {
      return [];  
    }
    var obj = createObject(operandValues[0]);
    var objectAddress = a.object(application, benv, store, kont);
    store = storeAlloc(store, objectAddress, obj);
    var objRef = l.abstRef(objectAddress);
    return [{state:new KontState(objRef, store, lkont, kont), effects:effects}];
  }
  
  function objectGetPrototypeOf(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    if (operandValues.length !== 1)
    {
      return [];  
    }
    var objectAddresses = operandValues[0].addresses();
    var result = BOT;
    objectAddresses.forEach(
      function (objectAddress)
      {
        var obj = storeLookup(store, objectAddress);
        result = result.join(obj.Prototype);
      });
    return [{state:new KontState(result, store, lkont, kont), effects:effects}];
  }
  
  function stringFunction(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    if (operandValues.length === 0)
    {
      return [{state:new KontState(L_EMPTY_STRING, store, lkont, kont), effects:effects}];  
    }
    return [{state:new KontState(operandValues[0].ToString(), store, lkont, kont), effects:effects}];
  }    
  
  function $join(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var value = operandValues.reduce(Lattice.join, BOT);
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }   
  
  function _print(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    print(operandValues);
    return [{state:new KontState(L_UNDEFINED, store, lkont, kont), effects:effects}];
  }   
  
  function globalParseInt(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var value = operandValues[0].parseInt(); // TODO: 2nd (base) arg
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }   
  
  function arrayConstructor(application, operandValues, protoRef, benv, store, lkont, kont, effects)
  {
    var arr = createArray();
    var length;
    if (operandValues.length === 0)
    {
      length = L_0;
    }
    else if (operandValues.length === 1)
    {
      length = operandValues[0];
    }
    else
    {
      throw new Error("TODO: " + operandValues.length);
    }
    arr = arr.add(P_LENGTH, length);
    
    var arrAddress = a.array(application, benv, store, kont);
    store = storeAlloc(store, arrAddress, arr);
    var arrRef = l.abstRef(arrAddress);
    return [{state:new KontState(arrRef, store, lkont, kont), effects:effects}];
  }
  
  function arrayFunction(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var arr = createArray();
    for (var i = 0; i < operandValues.length; i++)
    {
      arr = arr.add(l.abst1(String(i)), operandValues[i]);
    }
    arr = arr.add(P_LENGTH, l.abst1(operandValues.length));
    
    var arrAddress = a.array(application, benv, store, kont);
    store = storeAlloc(store, arrAddress, arr);
    var arrRef = l.abstRef(arrAddress);
    return [{state:new KontState(arrRef, store, lkont, kont), effects:effects}];
  }
  
  function arrayToString(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var arr = storeLookup(store, thisa);
    var len = arr.lookup(P_LENGTH)[0];
    effects.push(readObjectEffect(thisa, P_LENGTH));
    var i = L_0;
    var r = [];
    var seen = ArraySet.empty();
    var thisAs = ArraySet.from1(thisa); 
    while ((!seen.contains(i)) && l.lt(i, len).isTrue())
    {
      seen = seen.add(i);
      var iname = i.ToString();
      var v = doProtoLookup(iname, thisAs, store, effects); 
      if (v !== BOT)
      {
        r.push(v);
      }
      i = l.add(i, L_1);
    }
    return [{state:new KontState(l.abst1(r.join()), store, lkont, kont), effects:effects}];
  }
  
  function arrayConcat(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    if (operandValues.length !== 1)
    {
      print("warning: array.concat");
      return [];
    }
    var thisArr = storeLookup(store, thisa);
    var thisLen = thisArr.lookup(P_LENGTH)[0];
    effects.push(readObjectEffect(thisa, P_LENGTH));
    var argAddrs = operandValues[0].addresses();
    var resultArr = createArray();
    var i = L_0;
    var seen = ArraySet.empty();
    while ((!seen.contains(i)) && l.lt(i, thisLen).isTrue())
    {
      seen = seen.add(i);
      var iname = i.ToString();
      var v = doProtoLookup(iname, ArraySet.from1(thisa), store, effects);
      resultArr = resultArr.add(iname, v);
      i = l.add(i, L_1);
    }
    argAddrs.forEach(
      function (argAddr)
      {
        var argArr = storeLookup(store, argAddr);
        var argLen = argArr.lookup(P_LENGTH)[0];
        effects.push(readObjectEffect(argAddr, P_LENGTH));
        var i = L_0;
        var seen = ArraySet.empty();
        while ((!seen.contains(i)) && l.lt(i, argLen).isTrue())
        {
          seen = seen.add(i);
          var iname = i.ToString();
          var v = doProtoLookup(iname, ArraySet.from1(argAddr), store, effects);
          resultArr = resultArr.weakAdd(l.add(thisLen, i).ToString(), argArr.lookup(iname)[0]);
          i = l.add(i, L_1);
        }
        resultArr = resultArr.weakAdd(P_LENGTH, l.add(thisLen, i));
      });
    var arrAddress = a.array(application, benv, store, lkont, kont);
    store = storeAlloc(store, arrAddress, resultArr);
    return [{state:new KontState(l.abstRef(arrAddress), store, lkont, kont), effects:effects}];
  }
  
  function arrayPush(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var arr = storeLookup(store, thisa);
    var len = arr.lookup(P_LENGTH)[0];
    effects.push(readObjectEffect(thisa, P_LENGTH));
    var lenStr = len.ToString();
    arr = arr.add(lenStr, operandValues[0]) 
    effects.push(writeObjectEffect(thisa, lenStr));
    var len1 = l.add(len, L_1);
    arr = arr.add(P_LENGTH, len1);
    effects.push(writeObjectEffect(thisa, P_LENGTH))
    store = storeUpdate(store, thisa, arr);
    return [{state:new KontState(len1, store, lkont, kont), effects:effects}];
  }
  
  function stringCharAt(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var str = storeLookup(store, thisa);
    var lprim = str.PrimitiveValue;
    var value = lprim.charAt(operandValues[0]);
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  function stringCharCodeAt(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var str = storeLookup(store, thisa);
    var lprim = str.PrimitiveValue;
    var value = lprim.charCodeAt(operandValues[0]);
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  function stringStartsWith(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var str = storeLookup(store, thisa);
    var lprim = str.PrimitiveValue;
    var value = lprim.startsWith(operandValues[0]);
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  function errorConstructor(application, operandValues, protoRef, benv, store, lkont, kont, effects)
  {
    var err = createError(operandValues.length === 1 && operandValues[0] !== BOT ? operandValues[0].ToString() : L_EMPTY_STRING);
    var errAddress = application.tag;
    store = storeAlloc(store, errAddress, err);
    var errRef = l.abstRef(errAddress);
    return [{state:new KontState(errRef, store, lkont, kont), effects:effects}];
  }
  
  function mathSqrt(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var value = l.sqrt(operandValues[0]);
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  function mathAbs(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var value = l.abs(operandValues[0]);
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  function mathRound(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var value = l.round(operandValues[0]);
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  function mathCos(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var value = l.cos(operandValues[0]);
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  function mathSin(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var value = l.sin(operandValues[0]);
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  var random = (function() {
    var seed = 0x2F6E2B1;
    return function() {
      // Robert Jenkins’ 32 bit integer hash function
      seed = ((seed + 0x7ED55D16) + (seed << 12))  & 0xFFFFFFFF;
      seed = ((seed ^ 0xC761C23C) ^ (seed >>> 19)) & 0xFFFFFFFF;
      seed = ((seed + 0x165667B1) + (seed << 5))   & 0xFFFFFFFF;
      seed = ((seed + 0xD3A2646C) ^ (seed << 9))   & 0xFFFFFFFF;
      seed = ((seed + 0xFD7046C5) + (seed << 3))   & 0xFFFFFFFF;
      seed = ((seed ^ 0xB55A4F09) ^ (seed >>> 16)) & 0xFFFFFFFF;
      return (seed & 0xFFFFFFF) / 0x10000000;
    };
  }());
  
  function mathRandom(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var value = l.abst1(random());
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  function performanceNow(application, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var value = l.abst1(performance.now());
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  // END PRIMITIVES
  
  
  function ObjPrimitiveCall(applyFunction, applyConstructor)
  {
    this.applyFunction = applyFunction;
    this.applyConstructor = applyConstructor;
    this._hashCode = HashCode.bump();
  }

  ObjPrimitiveCall.prototype.toString =
    function ()
    {
      return "ObjPrimitiveCall";
    }
  
  ObjPrimitiveCall.prototype.equals =
    function (other)
    {
      if (this === other)
      {
        return true;
      }
      if (!(this instanceof ObjPrimitiveCall))
      {
        return false;
      }
      return this._hashCode === other._hashCode;
    }
  
  ObjPrimitiveCall.prototype.hashCode =
    function ()
    {
      return this._hashCode;
    }
  
  ObjPrimitiveCall.prototype.addresses =
    function ()
    {
      return EMPTY_ADDRESS_SET;
    } 
  
  function ObjClosureCall(node, scope)
  {
    this.node = node;
    this.scope = scope;
  }

  ObjClosureCall.prototype.toString =
    function ()
    {
      return "(" + this.node.tag + " " + this.scope + ")";
    }
  ObjClosureCall.prototype.nice =
    function ()
    {
      return "closure-" + this.node.tag;
    }

  ObjClosureCall.prototype.equals =
    function (other)
    {
      if (this === other)
      {
        return true;
      }
      if (!(this instanceof ObjClosureCall))
      {
        return false;
      }
      return this.node === other.node
        && this.scope.equals(other.scope);
    }
  ObjClosureCall.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.scope.hashCode();
      return result;      
    }

  ObjClosureCall.prototype.applyFunction =
    function (application, operandValues, thisa, benv, store, lkont, kont, effects)
    {
    var funNode = this.node;
    var bodyNode = funNode.body;
    
    var stackAs = stackAddresses(lkont, kont);
    if (Ast.isNewExpression(application))
    {
      // we still might want to return 'this'
      stackAs = stackAs.add(thisa);
    }
    var stack = [lkont, kont];
    var ctx0 = new Context(application, this, operandValues, thisa, store, stackAs);
    var ctx = contexts.get(ctx0);
    if (!ctx)
    {
      ctx = ctx0;
      ctx._id = contexts.count();
      ctx._stacks = new MutableHashSet(7);
      ctx._stacks.add(stack);
      contexts.add(ctx);
      
      // sstorei++; don't increase age for fresh stack: no need to revisit states
    }
    else
    {
      if (ctx._stacks.contains(stack))
      {
      }
      else
      {
        ctx._stacks.add(stack);
//        sstorei++;
        if (ctx._poppers)
        {
          popTodo.push([ctx._poppers, stack]);
        }
      }
    }

    var nodes = bodyNode.body;    
    if (nodes.length === 0)
    {
      return [{state:new KontState(L_UNDEFINED, store, [], ctx), effects:effects}];
    }
    
    var extendedBenv = this.scope.extend();
    extendedBenv = extendedBenv.add("this", thisa);
    
    var funScopeDecls = functionScopeDeclarations(funNode);
    var names = Object.keys(funScopeDecls);
    if (names.length > 0)
    {
      var nodeAddr = names.map(function (name)
          {
            var node = funScopeDecls[name];
            var addr = a.vr(node.id || node);
            extendedBenv = extendedBenv.add(name, addr);
            return [node, addr];
          });
        nodeAddr.forEach(
          function (na)
          {
            var node = na[0];
            var addr = na[1];
            if (Ast.isIdentifier(node)) // param
            {
              store = storeAlloc(store, addr, operandValues[node.i]);
            }
            else if (Ast.isFunctionDeclaration(node))
            {
              var allocateResult = allocateClosure(node, extendedBenv, store, lkont, kont);
              var closureRef = allocateResult.ref;
              store = allocateResult.store;
              store = storeAlloc(store, addr, closureRef);
            }
            else if (Ast.isVariableDeclarator(node))
            {
              store = storeAlloc(store, addr, L_UNDEFINED);
            }
            else
            {
              throw new Error("cannot handle declaration " + node);
            }
          });
    }
    
    return [{state:new EvalState(bodyNode, extendedBenv, store, [], ctx), effects:effects}];
  }
  
  ObjClosureCall.prototype.applyConstructor =
    function (application, operandValues, protoRef, benv, store, lkont, kont, effects)
    {    
      var funNode = this.node;
      var obj = createObject(protoRef);
      var thisa = a.constructor(funNode); /// TODO: funNode and funNode.body already in use as address
      store = storeAlloc(store, thisa, obj);
      return this.applyFunction(application, operandValues, thisa, benv, store, lkont, kont, effects);
    }

  ObjClosureCall.prototype.addresses =
    function ()
    {
      return this.scope.addresses();
    }
  
  function EvalState(node, benv, store, lkont, kont)
  {
    this.node = node;
    this.benv = benv;
    this.store = store;
    this.lkont = lkont;
    this.kont = kont;
    this._successors = null;
    this._sstorei = -1;
    this._id = -1;
  }
  EvalState.prototype.toString =
    function ()
    {
      return "#eval " + this.node.tag;
    }
  EvalState.prototype.nice =
    function ()
    {
      return "#eval " + this.node.tag;
    }
  EvalState.prototype.equals =
    function (x)
    {
      return (x instanceof EvalState)
        && this.node === x.node 
        && (this.benv === x.benv || this.benv.equals(x.benv))
        && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
        && (this.kont === x.kont || this.kont.equals(x.kont))
        && (this.store === x.store || this.store.equals(x.store))
    }
  EvalState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
  EvalState.prototype.next =
    function ()
    {
      var store;
      if (gcFlag)
      {
        store = Agc.collect(this.store, this.addresses());
      }
      else
      {
        store = this.store;
      }
      return evalNode(this.node, this.benv, store, this.lkont, this.kont, []);
    }
  EvalState.prototype.gc =
    function ()
    {
      return new EvalState(this.node, this.benv, Agc.collect(this.store, this.addresses()), this.lkont, this.kont);
    }
  EvalState.prototype.addresses =
    function ()
    {
      var as = this.benv.addresses().join(stackAddresses(this.lkont, this.kont));
      return as;
    }
  
  function KontState(value, store, lkont, kont)
  {
    this.value = value;
    this.store = store;
    this.lkont = lkont;
    this.kont = kont;
    this._successors = null;
    this._sstorei = -1;
    this._id = -1;
  }
  KontState.prototype.equals =
    function (x)
    {
      return (x instanceof KontState)
        && (this.value === x.value || this.value.equals(x.value)) 
        && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
        && (this.kont === x.kont || this.kont.equals(x.kont))
        && (this.store === x.store || this.store.equals(x.store))
    }
  KontState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.value.hashCode();
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
  KontState.prototype.toString =
    function ()
    {
      return "#kont-" + this.lkont[0];
    }
  KontState.prototype.nice =
    function ()
    {
      return "#kont-" + this.lkont[0];
    }
  KontState.prototype.next =
    function ()
    {
      var value = this.value;
      if (value === BOT)
      {
        return [];
      }      
      var lkont = this.lkont;
      var kont = this.kont;
      var store = this.store;
      
      if (lkont.length === 0) 
      {
        if (kont === EMPTY_KONT)
        {
          return [];
        }
                
        if (Ast.isNewExpression(kont.ex))
        {
          value = l.abstRef(kont.thisa);
        }
        else
        {
          value = L_UNDEFINED;
        }
        
        var poppers = kont._poppers;
        if (!poppers)
        {
          poppers = new MutableHashSet(7);
          kont._poppers = poppers;
        }
        poppers.add(this);
        
        return kont._stacks.map(
          function (stack)
          {
            
            return {state:new KontState(value, store, stack[0], stack[1]), effects:[]};
          });
      }
      
      return lkont[0].apply(value, store, lkont.slice(1), kont);
    }
  KontState.prototype.gc =
    function ()
    {
      return this;
    } 
  KontState.prototype.addresses =
    function ()
    {
      return stackAddresses(lkont, kont).join(this.value.addresses());
    }
  
  function ReturnState(value, store, lkont, kont)
  {
    this.value = value;
    this.store = store;
    this.lkont = lkont;
    this.kont = kont;
    this._successors = null;
    this._sstorei = -1;
    this._id = -1;
  }
  ReturnState.prototype.equals =
    function (x)
    {
      return (x instanceof ReturnState)
        && (this.value === x.value || this.value.equals(x.value)) 
        && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
        && (this.kont === x.kont || this.kont.equals(x.kont))
        && (this.store === x.store || this.store.equals(x.store))
    }
  ReturnState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.value.hashCode();
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
  ReturnState.prototype.toString =
    function ()
    {
      return "#ret-" + this.lkont[0];
    }
  ReturnState.prototype.nice =
    function ()
    {
      return "#ret-" + this.lkont[0];
    }
  ReturnState.prototype.next =
    function ()
    {
      var kont = this.kont;
      if (kont === EMPTY_KONT)
      {
        throw new Error("return outside function");
      }

      var value = this.value;
      if (value === BOT)
      {
        return [];
      }      

      if (Ast.isNewExpression(kont.ex))
      {
        var returnValue = BOT;
        if (value.isRef())
        {
          returnValue = returnValue.join(value.projectRef()); 
        }
        if (value.isNonRef())
        {
          returnValue = returnValue.join(l.abstRef(kont.thisa));
        }
        value = returnValue;
      }

      var lkont = this.lkont;
      var store = this.store;
      
      var poppers = kont._poppers;
      if (!poppers)
      {
        poppers = new MutableHashSet(7);
        kont._poppers = poppers;
      }
      poppers.add(this);
      
      var result = kont._stacks.map(
          function (st)
          {
            return {state:new KontState(value, store, st[0], st[1]), effects: []};
          });

      return result;
    }
      
  ReturnState.prototype.gc =
    function ()
    {
      return this;
    }  
  ReturnState.prototype.addresses =
    function ()
    {
      return stackAddresses([], kont).join(this.value.addresses());
    }
  
  function ThrowState(value, store, lkont, kont)
  {
    this.value = value;
    this.store = store;
    this.lkont = lkont;
    this.kont = kont;
    this._successors = null;
    this._sstorei = -1;
    this._id = -1;
  }
  ThrowState.prototype.equals =
    function (x)
    {
      return (x instanceof ThrowState)
        && (this.value === x.value || this.value.equals(x.value)) 
        && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
        && (this.kont === x.kont || this.kont.equals(x.kont))
        && (this.store === x.store || this.store.equals(x.store))
    }
  ThrowState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.value.hashCode();
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
  ThrowState.prototype.toString =
    function ()
    {
      return "#throw-" + this.lkont[0];
    }
  ThrowState.prototype.nice =
    function ()
    {
      return "#throw-" + this.lkont[0];
    }
  ThrowState.prototype.next =
    function ()
    {
      var value = this.value;
      if (value === BOT)
      {
        return [];
      }      
      var lkont = this.lkont;
      var kont = this.kont;
      var store = this.store;
      
      var stacks = this.stackPop(lkont, kont);
      return stacks.flatMap(
        function (stack)
        {
          var lkont = stack[0];
          var kont = stack[1];
          var frame = lkont[0];
          var lkont2 = lkont.slice(1);
          return frame.applyThrow(value, store, lkont2, kont);
        });
    }
  
  ThrowState.prototype.stackPop = function (lkont, kont)
  {
    var todo = [[lkont, kont]];
    var result = [];
    var G = ArraySet.empty();
    todo: while (todo.length > 0)
    {
      var stack = todo.pop();
      var lkont = stack[0];
      var kont = stack[1];
      
      for (var i = 0; i < lkont.length; i++)
      {
        if (lkont[i].applyThrow)
        {
          result.push(stack);
          break todo;
        }
      }
      if (kont === EMPTY_KONT || G.contains(kont))
      {
        // TODO  if kont === EMPTY_KONT then unhandled exception
        continue;
      }
        
      kont._stacks.forEach(
        function (st)
        {
          todo.push([st[0],st[1]]);
        });
      G = G.add(kont);
      var poppers = kont._poppers;
      if (!poppers)
      {
        poppers = new MutableHashSet(7);
        kont._poppers = poppers;
      }
      poppers.add(this);
    }
    return result;
  }
  ThrowState.prototype.gc =
    function ()
    {
      return this;
    }  
  ThrowState.prototype.addresses =
    function ()
    {
      return stackAddresses(lkont, kont).join(this.value.addresses());
    }
  
  function BreakState(store, lkont, kont)
  {
    this.store = store;
    this.lkont = lkont;
    this.kont = kont;
    this._successors = null;
    this._sstorei = -1;
    this._id = -1;
  }
  BreakState.prototype.equals =
    function (x)
    {
      return (x instanceof BreakState)
        && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
        && (this.kont === x.kont || this.kont.equals(x.kont))
        && (this.store === x.store || this.store.equals(x.store))
    }
  BreakState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
  BreakState.prototype.toString =
    function ()
    {
      return "#break-" + this.lkont[0];
    }
  BreakState.prototype.nice =
    function ()
    {
      return "#break-" + this.lkont[0];
    }
  BreakState.prototype.next =
    function ()
    {
      var value = this.value;
      if (value === BOT)
      {
        return [];
      }      
      var lkont = this.lkont;
      var kont = this.kont;
      var store = this.store;
      
      for (var i = 0; i < lkont.length; i++)
      {
        if (lkont[i].applyBreak)
        {
          return lkont[i].applyBreak(store, lkont.slice(i), kont);
        }
      }
      throw new Error("no break target\nlocal stack: " + lkont);
    }
  BreakState.prototype.gc =
    function ()
    {
      return this;
    }  
  BreakState.prototype.addresses =
    function ()
    {
      return stackAddresses(lkont, kont);
    }
  
  function ResultState(value, store, lkont, kont)
  {
    this.value = value;
    this.store = store;
    this.lkont = lkont;
    this.kont = kont;
    this._successors = null;
    this._sstorei = -1;
    this._id = -1;
  }
  ResultState.prototype.equals =
    function (x)
    {
      return (x instanceof ResultState)
        && (this.value === x.value || this.value.equals(x.value)) 
        && (this.lkont === x.lkont || this.lkont.equals(x.lkont))
        && (this.kont === x.kont || this.kont.equals(x.kont))
        && (this.store === x.store || this.store.equals(x.store))
    }
  ResultState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.value.hashCode();
      result = prime * result + this.lkont.hashCode();
      result = prime * result + this.kont.hashCode();
      return result;
    }
  ResultState.prototype.toString =
    function ()
    {
      return "#result";
    }
  ResultState.prototype.nice =
    function ()
    {
      return "#result";
    }
  ResultState.prototype.next =
    function ()
    {
      return [];
    }
  ResultState.prototype.gc =
    function ()
    {
      return this;
    } 
  ResultState.prototype.addresses =
    function ()
    {
      return stackAddresses([], kont).join(this.value.addresses());
    }
  
  function ErrorState(node, msg)
  {
    this.node = node;
    this.msg = msg;
  }
  ErrorState.prototype.toString =
    function ()
    {
      return this.msg;
    }
  ErrorState.prototype.nice =
    function ()
    {
      return this.msg;
    }
  ErrorState.prototype.equals =
    function (x)
    {
      return (x instanceof ErrorState)
        && this.node === x.node 
        && this.msg === x.msg 
    }
  ErrorState.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.msg.hashCode();
      return result;
    }
  ErrorState.prototype.next =
    function ()
    {
      return [];
    }
  ErrorState.prototype.gc =
    function ()
    {
      return this;
    }   
  ErrorState.prototype.addresses =
    function ()
    {
      return EMPTY_ADDRESS_SET;
    }
  
  function HaltKont()
  {
  }
  HaltKont.prototype.toString =
    function ()
    {
      return "halt";
    }
  HaltKont.prototype.apply =
    function (value, store, lkont, kont)
    {
      return [{state:new ResultState(value, store, lkont, kont)}];
    }
  HaltKont.prototype.hashCode =
    function ()
    {
      return 0;
    }
  HaltKont.prototype.equals =
    function (x)
    {
      return this instanceof HaltKont;
    }
  HaltKont.prototype.addresses =
    function ()
    {
      return EMPTY_ADDRESS_SET;
    }    
  
  function VariableDeclarationKont(node, i, benv)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
  }
  VariableDeclarationKont.prototype.equals =
    function (x)
    {
      return x instanceof VariableDeclarationKont
        && this.node === x.node
        && this.i === x.i
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  VariableDeclarationKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.i;
      result = prime * result + this.benv.hashCode();
      return result;
    }
  VariableDeclarationKont.prototype.toString =
    function ()
    {
      return "vdecl-" + this.node.tag + "-" + this.i;
    }
  VariableDeclarationKont.prototype.nice =
    function ()
    {
      return "vdecl-" + this.node.tag + "-" + this.i;
    }
  VariableDeclarationKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  VariableDeclarationKont.prototype.apply =
    function (value, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var i = this.i;
      
      var nodes = node.declarations;
      if (i === nodes.length)
      {
        return [{state:new KontState(value, store, lkont, kont)}];
      }
      var frame = new VariableDeclarationKont(node, i + 1, benv);
      return [{state:new EvalState(nodes[i], benv, store, [frame].concat(lkont), kont)}];
    }
  
  function VariableDeclaratorKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  VariableDeclaratorKont.prototype.equals =
    function (x)
    {
      return x instanceof VariableDeclaratorKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  VariableDeclaratorKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  VariableDeclaratorKont.prototype.toString =
    function ()
    {
      return "vrator " + this.node.tag;
    }
  VariableDeclaratorKont.prototype.nice =
    function ()
    {
      return "vrator " + this.node.tag;
    }
  VariableDeclaratorKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  VariableDeclaratorKont.prototype.apply =
    function (value, store, lkont, kont)
    {
      var effects = [];
      var id = this.node.id;
      var benv = this.benv;
      store = doScopeSet(id, value, benv, store, effects);
      return [{state:new KontState(L_UNDEFINED, store, lkont, kont), effects:effects}];
    }
  
  function LeftKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  LeftKont.prototype.equals =
    function (x)
    {
      return x instanceof LeftKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  LeftKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  LeftKont.prototype.toString =
    function ()
    {
      return "left-" + this.node.tag;
    }
  LeftKont.prototype.nice =
    function ()
    {
      return "left-" + this.node.tag;
    }
  LeftKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  LeftKont.prototype.apply =
    function (leftValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var frame = new RightKont(node, leftValue);
      return [{state:new EvalState(node.right, benv, store, [frame].concat(lkont), kont)}];
    }
  
  function LogicalLeftKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  LogicalLeftKont.prototype.equals =
    function (x)
    {
      return x instanceof LogicalLeftKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  LogicalLeftKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  LogicalLeftKont.prototype.toString =
    function ()
    {
      return "logleft-" + this.node.tag;
    }
  LogicalLeftKont.prototype.nice =
    function ()
    {
      return "logleft-" + this.node.tag;
    }
  LogicalLeftKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  LogicalLeftKont.prototype.apply =
    function (leftValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var operator = node.operator;
      var result = [];
      switch (operator)
      {
        case "&&":
        {
          
          if (leftValue.isTruthy())
          {
            result = result.concat([{state:new EvalState(node.right, benv, store, lkont, kont)}]);
          }
          if (leftValue.isFalsy())
          {
            result = result.concat([{state:new KontState(leftValue, store, lkont, kont)}]);
          }
          break;
        }
        case "||":
        {
          if (leftValue.isTruthy())
          {
            result = result.concat([{state:new KontState(leftValue, store, lkont, kont)}]);
          }
          if (leftValue.isFalsy())
          {
            result = result.concat([{state:new EvalState(node.right, benv, store, lkont, kont)}]);
          }
          break;
        }
        default: throw new Error("cannot handle logical operator " + operator);
      }
      return result;
    }
  
  
  function UnaryKont(node)
  {
    this.node = node;
  }
  UnaryKont.prototype.equals =
    function (x)
    {
      return x instanceof UnaryKont
        && this.node === x.node
    }
  UnaryKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      return result;
    }
  UnaryKont.prototype.toString =
    function ()
    {
      return "unary-" + this.node.tag;
    }
  UnaryKont.prototype.nice =
    function ()
    {
      return "unary-" + this.node.tag;
    }
  UnaryKont.prototype.addresses =
    function ()
    {
      return EMPTY_ADDRESS_SET;
    }
  UnaryKont.prototype.apply =
    function (value, store, lkont, kont)
    {
      var node = this.node;
      var leftValue = this.leftValue;
      var operator = node.operator;
      var value;
      switch (node.operator)
      {
        case "!":
        {
          value = l.not(value);
          break;
        }
        case "-":
        {
          value = l.neg(value);
          break;
        }
        case "~":
        {
          value = l.binnot(value);
          break;
        }
        default: throw new Error("cannot handle unary operator " + node.operator);
      }
      return [{state:new KontState(value, store, lkont, kont)}];
    }
  
  function RightKont(node, leftValue)
  {
    this.node = node;
    this.leftValue = leftValue;
  }
  RightKont.prototype.equals =
    function (x)
    {
      return x instanceof RightKont
        && this.node === x.node
        && (this.leftValue === x.leftValue || this.leftValue.equals(x.leftValue))
    }
  RightKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.leftValue.hashCode();
      return result;
    }
  RightKont.prototype.toString =
    function ()
    {
      return "right-" + this.node.tag;
    }
  RightKont.prototype.nice =
    function ()
    {
      return "right-" + this.node.tag;
    }
  RightKont.prototype.addresses =
    function ()
    {
      return this.leftValue.addresses();
    }
  RightKont.prototype.apply =
    function (rightValue, store, lkont, kont)
    {
      var node = this.node;
      var leftValue = this.leftValue;
      var operator = node.operator;
      var value = applyBinaryOperator(operator, leftValue, rightValue);
//      value = sanitize(value); //TODO?
      return [{state:new KontState(value, store, lkont, kont)}];
    }
  
function applyBinaryOperator(operator, leftValue, rightValue)
{
  switch (operator)
  {
    case "+":
    {
      return l.add(leftValue, rightValue);
    }
    case "*":
    {
      return l.mul(leftValue, rightValue);
    }
    case "-":
    {
      return l.sub(leftValue, rightValue);
    }
    case "/":
    {
      return l.div(leftValue, rightValue);
    }
    case "%":
    {
      return l.rem(leftValue, rightValue);
    }
    case "===":
    {
      return l.eqq(leftValue, rightValue);
    }
    case "!==":
    {
      return l.neqq(leftValue, rightValue);
    }
    case "==":
    {
      return l.eq(leftValue, rightValue);
    }
    case "!=":
    {
      return l.neq(leftValue, rightValue);
    }
    case "<":
    {
      return l.lt(leftValue, rightValue);
    }
    case "<=":
    {
      return l.lte(leftValue, rightValue);
    }
    case ">":
    {
      return l.gt(leftValue, rightValue);
    }
    case ">=":
    {
      return l.gte(leftValue, rightValue);
    }
    case "&":
    {
      return l.binand(leftValue, rightValue);
    }
    case "|":
    {
      return l.binor(leftValue, rightValue);
    }
    case "^":
    {
      return l.binxor(leftValue, rightValue);
    }
    case "<<":
    {
      return l.shl(leftValue, rightValue);
    }
    case ">>":
    {
      return l.shr(leftValue, rightValue);
    }
    case ">>>":
    {
      return l.shrr(leftValue, rightValue);
    }
    default: throw new Error("cannot handle binary operator " + operator);
  }
} 
  
//  function UpdateIdentifierKont(node, benv)
//  {
//    this.node = node;
//    this.benv = benv;
//  }
//  UpdateIdentifierKont.prototype.equals =
//    function (x)
//    {
//      return x instanceof UpdateIdentifierKont
//        && this.node === x.node 
//        && Eq.equals(this.benv, x.benv);
//    }
//  UpdateIdentifierKont.prototype.hashCode =
//    function ()
//    {
//      var prime = 31;
//      var result = 1;
//      result = prime * result + this.node.hashCode();
//      result = prime * result + this.benv.hashCode();
//      return result;
//    }
//  UpdateIdentifierKont.prototype.toString =
//    function ()
//    {
//      return "upid-" + this.node.tag;
//    }
//  UpdateIdentifierKont.prototype.nice =
//    function ()
//    {
//      return "upid-" + this.node.tag;
//    }
//  UpdateIdentifierKont.prototype.addresses =
//    function ()
//    {
//      return [this.benv];
//    }
//  UpdateIdentifierKont.prototype.apply =
//    function (value, store, kont)
//    {
//      var node = this.node;
//      var benv = this.benv;
//      var id = node.argument;
//    }
  
  function AssignIdentifierKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  AssignIdentifierKont.prototype.equals =
    function (x)
    {
      return x instanceof AssignIdentifierKont
        && this.node === x.node 
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  AssignIdentifierKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  AssignIdentifierKont.prototype.toString =
    function ()
    {
      return "asid-" + this.node.tag;
    }
  AssignIdentifierKont.prototype.nice =
    function ()
    {
      return "asid-" + this.node.tag;
    }
  AssignIdentifierKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  AssignIdentifierKont.prototype.apply =
    function (value, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var name = node.left.name;
      var effects = [];
      var newValue;
      switch (node.operator)
      {
        case "=":
        {
          newValue = value;
          break;
        }
        case "+=":
        {
          var existingValue = doScopeLookup(node.left, benv, store, effects);
          newValue = l.add(existingValue, value);
          break;
        }
        case "-=":
        {
          var existingValue = doScopeLookup(node.left, benv, store, effects);
          newValue = l.sub(existingValue, value);
          break;
        }
        case "*=":
        {
          var existingValue = doScopeLookup(node.left, benv, store, effects);
          newValue = l.mul(existingValue, value);
          break;
        }
        case "|=":
        {
          var existingValue = doScopeLookup(node.left, benv, store, effects);
          newValue = l.binor(existingValue, value);
          break;
        }
        default: throw new Error("cannot handle assignment operator " + node.operator);
      }
      if (newValue === BOT)
      {
        return [];
      }
      store = doScopeSet(node.left, newValue, benv, store, effects);
      return [{state:new KontState(newValue, store, lkont, kont), effects:effects}];
    }
  
  function OperatorKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  OperatorKont.prototype.equals =
    function (x)
    {
      return x instanceof OperatorKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  OperatorKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  OperatorKont.prototype.toString =
    function ()
    {
      return "rator-" + this.node.tag;
    }
  OperatorKont.prototype.nice =
    function ()
    {
      return "rator-" + this.node.tag;
    }
  OperatorKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  OperatorKont.prototype.apply =
    function (operatorValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var operands = node.arguments;
  
      if (operands.length === 0)
      {
        if (Ast.isNewExpression(node))
        {
          return applyCons(node, operatorValue, [], benv, store, lkont, kont, []);
        }
        return applyProc(node, operatorValue, [], globala, benv, store, lkont, kont, []);
      }
      var frame = new OperandsKont(node, 1, benv, operatorValue, [], globala);
      return [{state:new EvalState(operands[0], benv, store, [frame].concat(lkont), kont)}];
    }
  
  function OperandsKont(node, i, benv, operatorValue, operandValues, thisa)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
    this.operatorValue = operatorValue; 
    this.operandValues = operandValues; 
    this.thisa = thisa;
  }
  OperandsKont.prototype.equals =
    function (x)
    {
      return x instanceof OperandsKont
        && this.node === x.node 
        && this.i === x.i 
        && (this.benv === x.benv || this.benv.equals(x.benv))
        && (this.thisa === x.thisa || this.thisa.equals(x.thisa))
        && (this.operatorValue === x.operatorValue || this.operatorValue.equals(x.operatorValue)) 
        && (this.operandValues === x.operandValues || this.operandValues.equals(x.operandValues)) 
    }
  OperandsKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.i;
      result = prime * result + this.benv.hashCode();
      result = prime * result + this.operatorValue.hashCode();
      result = prime * result + this.operandValues.hashCode();
      result = prime * result + this.thisa.hashCode();
      return result;
    }
  OperandsKont.prototype.toString =
    function ()
    {
      return "rand-" + this.node.tag + "-" + this.i;
    }
  OperandsKont.prototype.nice =
    function ()
    {
      return "rand-" + this.node.tag + "-" + this.i;
    }
  OperandsKont.prototype.addresses =
    function ()
    {
      var addresses = this.operatorValue.addresses().add(this.thisa).join(this.benv.addresses());
      this.operandValues.forEach(function (value) {addresses = addresses.join(value.addresses())});
      return addresses;
    }
  OperandsKont.prototype.apply =
    function (operandValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var i = this.i;
      var operatorValue = this.operatorValue;
      var operandValues = this.operandValues;
      var thisa = this.thisa;
      var operands = node.arguments;
  
      if (i === operands.length)
      {
        if (Ast.isNewExpression(node))
        {
          return applyCons(node, operatorValue, operandValues.addLast(operandValue), benv, store, lkont, kont, []);
        }
        return applyProc(node, operatorValue, operandValues.addLast(operandValue), thisa, benv, store, lkont, kont, []);
      }
      var frame = new OperandsKont(node, i + 1, benv, operatorValue, operandValues.addLast(operandValue), thisa);
      return [{state:new EvalState(operands[i], benv, store, [frame].concat(lkont), kont)}];
    }
  
  function BodyKont(node, i, benv)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
  }
  BodyKont.prototype.equals =
    function (x)
    {
      return x instanceof BodyKont
        && this.node === x.node
        && this.i === x.i
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  BodyKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.i;
      result = prime * result + this.benv.hashCode();
      return result;
    }
  BodyKont.prototype.toString =
    function ()
    {
      return "body-" + this.node.tag + "-" + this.i;
    }
  BodyKont.prototype.nice =
    function ()
    {
      return "body-" + this.node.tag + "-" + this.i;
    }
  BodyKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  BodyKont.prototype.apply =
    function (value, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var i = this.i;
      
      var nodes = node.body;
      if (i === nodes.length - 1)
      {
        return [{state:new EvalState(nodes[i], benv, store, lkont, kont)}];
      }
      var frame = new BodyKont(node, i + 1, benv);
      return [{state:new EvalState(nodes[i], benv, store, [frame].concat(lkont), kont)}];
    }
  
  function ReturnKont(node)
  {
    this.node = node;
  }
  ReturnKont.prototype.equals =
    function (x)
    {
      return x instanceof ReturnKont
        && this.node === x.node 
    }
  ReturnKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      return result;
    }
  ReturnKont.prototype.toString =
    function ()
    {
      return "ret-" + this.node.tag;
    }
  ReturnKont.prototype.nice =
    function ()
    {
      return "ret-" + this.node.tag;
    }
  ReturnKont.prototype.addresses =
    function ()
    {
      return EMPTY_ADDRESS_SET;
    }
  ReturnKont.prototype.apply =
    function (value, store, lkont, kont)
    {
      var node = this.node;
      return [{state:new ReturnState(value, store, lkont, kont)}];
    }
  
  function TryKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  TryKont.prototype.equals =
    function (x)
    {
      return x instanceof TryKont
        && this.node === x.node 
    }
  TryKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      return result;
    }
  TryKont.prototype.toString =
    function ()
    {
      return "try-" + this.node.tag;
    }
  TryKont.prototype.nice =
    function ()
    {
      return "try-" + this.node.tag;
    }
  TryKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  TryKont.prototype.apply =
    function (tryValue, store, lkont, kont)
    {
      var node = this.node;
      return [{state:new KontState(tryValue, store, lkont, kont), effects:[]}];
    }
  TryKont.prototype.applyThrow =
    function (throwValue, store, lkont, kont)
    {
      var node = this.node;
      var catchHandlers = node.handlers.filter(function (handler) {return handler.type === "CatchClause"});
      assert(catchHandlers.length === 1);
      var handler = catchHandlers[0]; 
      var body = handler.body;
      var nodes = body.body;
      if (nodes.length === 0)
      {
        return [{state:new KontState(L_UNDEFINED, store, lkont, kont), effects:[]}];
      }
      
      var extendedBenv = this.benv.extend();
      var param = handler.param;
      var name = param.name;
      var addr = a.vr(param);
      extendedBenv = extendedBenv.add(name, addr);
      store = storeAlloc(store, addr, throwValue);
      return evalStatementList(body, extendedBenv, store, lkont, kont, []);
    }
  
  function ThrowKont(node)
  {
    this.node = node;
  }
  ThrowKont.prototype.equals =
    function (x)
    {
      return x instanceof ThrowKont
        && this.node === x.node 
    }
  ThrowKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      return result;
    }
  ThrowKont.prototype.toString =
    function ()
    {
      return "throw-" + this.node.tag;
    }
  ThrowKont.prototype.nice =
    function ()
    {
      return "throw-" + this.node.tag;
    }
  ThrowKont.prototype.addresses =
    function ()
    {
      return EMPTY_ADDRESS_SET;
    }
  ThrowKont.prototype.apply =
    function (throwValue, store, lkont, kont)
    {
      var node = this.node;
      return [{state:new ThrowState(throwValue, store, lkont, kont), effects:[]}];
    }
  
  function IfKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  IfKont.prototype.equals =
    function (x)
    {
      return x instanceof IfKont
        && this.node === x.node 
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  IfKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  IfKont.prototype.toString =
    function ()
    {
      return "if-" + this.node.tag;
    }
  IfKont.prototype.nice =
    function ()
    {
      return "if-" + this.node.tag;
    }
  IfKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  IfKont.prototype.apply =
    function (conditionValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;    
      var consequent = node.consequent;
      var alternate = node.alternate;
      var result = [];
      if (conditionValue.isTruthy())
      {
        result = result.concat([{state:new EvalState(consequent, benv, store, lkont, kont)}]);
      }
      if (conditionValue.isFalsy())
      {
        if (alternate === null)
        {
          result = result.concat([{state:new KontState(L_UNDEFINED, store, lkont, kont)}]);
        }
        else
        {
          result = result.concat([{state:new EvalState(alternate, benv, store, lkont, kont)}]);
        }
      }
      return result;
    }
  
  function ForInitKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  ForInitKont.prototype.equals =
    function (x)
    {
      return x instanceof ForInitKont
        && this.node === x.node 
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  ForInitKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  ForInitKont.prototype.toString =
    function ()
    {
      return "forinit-" + this.node.tag;
    }
  ForInitKont.prototype.nice =
    function ()
    {
      return "forinit-" + this.node.tag;
    }
  ForInitKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  ForInitKont.prototype.apply =
    function (value, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;    
      var test = node.test;
      var frame = new ForTestKont(node, L_UNDEFINED, benv);
      return [{state:new EvalState(test, benv, store, [frame].concat(lkont), kont)}];
    }
  
  function ForTestKont(node, bodyValue, benv)
  {
    this.node = node;
    this.bodyValue = bodyValue;
    this.benv = benv;
  }
  ForTestKont.prototype.equals =
    function (x)
    {
      return x instanceof ForTestKont
        && this.node === x.node 
        && this.bodyValue.equals(x.bodyValue) 
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  ForTestKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.bodyValue.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  ForTestKont.prototype.toString =
    function ()
    {
      return "fortest-" + this.node.tag;
    }
  ForTestKont.prototype.nice =
    function ()
    {
      return "fortest-" + this.node.tag;
    }
  ForTestKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  ForTestKont.prototype.apply =
    function (testValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var result = [];
      if (testValue.isTruthy())
      {
        var body = node.body;
        var frame = new ForBodyKont(node, benv);
        result = result.concat([{state:new EvalState(body, benv, store, [frame].concat(lkont), kont)}]);
      }
      if (testValue.isFalsy())
      {
        result = result.concat([{state:new KontState(this.bodyValue, store, lkont, kont)}]);
      }
      return result;
    }
  
  function ForBodyKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  ForBodyKont.prototype.equals =
    function (x)
    {
      return x instanceof ForBodyKont
        && this.node === x.node 
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  ForBodyKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  ForBodyKont.prototype.toString =
    function ()
    {
      return "forbody-" + this.node.tag;
    }
  ForBodyKont.prototype.nice =
    function ()
    {
      return "forbody-" + this.node.tag;
    }
  ForBodyKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  ForBodyKont.prototype.apply =
    function (bodyValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var update = node.update;
      var frame = new ForUpdateKont(node, bodyValue, benv);
      return [{state:new EvalState(update, benv, store, [frame].concat(lkont), kont), effects:[]}];
    }
  ForBodyKont.prototype.applyBreak =
    function (store, lkont, kont)
    {
      return [{state:new KontState(L_UNDEFINED, store, lkont.slice(1), kont), effects:[]}];
    }
  
  function ForUpdateKont(node, bodyValue, benv)
  {
    this.node = node;
    assert(bodyValue);
    this.bodyValue = bodyValue;
    this.benv = benv;
  }
  ForUpdateKont.prototype.equals =
    function (x)
    {
      return x instanceof ForUpdateKont
        && this.node === x.node 
        && this.bodyValue.equals(x.bodyValue)
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  ForUpdateKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.bodyValue.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  ForUpdateKont.prototype.toString =
    function ()
    {
      return "forupd-" + this.node.tag;
    }
  ForUpdateKont.prototype.nice =
    function ()
    {
      return "forupd-" + this.node.tag;
    }
  ForUpdateKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  ForUpdateKont.prototype.apply =
    function (updateValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var test = node.test;
      var frame = new ForTestKont(node, this.bodyValue, benv);
      return [{state:new EvalState(test, benv, store, [frame].concat(lkont), kont)}];
    }
  
  function WhileTestKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  WhileTestKont.prototype.equals =
    function (x)
    {
      return x instanceof WhileTestKont
        && this.node === x.node 
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  WhileTestKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  WhileTestKont.prototype.toString =
    function ()
    {
      return "whiletest-" + this.node.tag;
    }
  WhileTestKont.prototype.nice =
    function ()
    {
      return "whiletest-" + this.node.tag;
    }
  WhileTestKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  WhileTestKont.prototype.apply =
    function (testValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var body = node.body;
      var result = [];
      if (testValue.isTruthy())
      {
        var frame = new WhileBodyKont(node, benv);
        result = result.concat([{state:new EvalState(body, benv, store, [frame].concat(lkont), kont)}]);
      }
      if (testValue.isFalsy())
      {
        result = result.concat([{state:new KontState(L_UNDEFINED, store, lkont, kont)}]);
      }
      return result;
    }
  
  function WhileBodyKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  WhileBodyKont.prototype.equals =
    function (x)
    {
      return x instanceof WhileBodyKont
        && this.node === x.node 
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  WhileBodyKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  WhileBodyKont.prototype.toString =
    function ()
    {
      return "whilebody-" + this.node.tag;
    }
  WhileBodyKont.prototype.nice =
    function ()
    {
      return "whilebody-" + this.node.tag;
    }
  WhileBodyKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  WhileBodyKont.prototype.apply =
    function (bodyValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var test = node.test;
      var frame = new WhileTestKont(node, benv);
      return [{state:new EvalState(test, benv, store, [frame].concat(lkont), kont),effects:[]}];
    }
  WhileBodyKont.prototype.applyBreak =
    function (store, lkont, kont)
    {
      return [{state:new KontState(L_UNDEFINED, store, lkont.slice(1), kont), effects:[]}];
    }
  
  function ObjectKont(node, i, benv, initValues)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
    this.initValues = initValues;
  }
  
  ObjectKont.prototype.equals =
    function (x)
    {
      return x instanceof ObjectKont
        && this.node === x.node
        && this.i === x.i
        && (this.benv === x.benv || this.benv.equals(x.benv))
        && (this.initValues === x.initValues || this.initValues.equals(x.initValues))
    }
  ObjectKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.i;
      result = prime * result + this.benv.hashCode();
      result = prime * result + this.initValues.hashCode();
      return result;
    }
  ObjectKont.prototype.toString =
    function ()
    {
      return "obj-" + this.node.tag + "-" + this.i;
    }
  ObjectKont.prototype.nice =
    function ()
    {
      return "obj-" + this.node.tag + "-" + this.i;
    }
  ObjectKont.prototype.addresses =
    function ()
    {
      var addresses = this.benv.addresses();
      this.initValues.forEach(function (value) {addresses = addresses.join(value.addresses())});
      return addresses;
    }
  ObjectKont.prototype.apply =
    function (initValue, store, lkont, kont)
    {
      var node = this.node;
      var properties = node.properties;
      var benv = this.benv;
      var i = this.i;
      var initValues = this.initValues.addLast(initValue);

      if (properties.length === i)
      {
        var effects = [];
        var obj = createObject(objectProtoRef);
        var objectAddress = a.object(node, benv, store, lkont, kont);
        for (var j = 0; j < i; j++)
        {
          var propertyName = l.abst1(properties[j].key.name);
          obj = obj.add(propertyName, initValues[j]);
        }
        store = storeAlloc(store, objectAddress, obj);
//        effects.push(allocObjectEffect(objectAddress));
        return [{state:new KontState(l.abstRef(objectAddress), store, lkont, kont), effects:effects}];        
      }
      var frame = new ObjectKont(node, i + 1, benv, initValues);
      return [{state:new EvalState(properties[i].value, benv, store, [frame].concat(lkont), kont)}];
    }
  
  function ArrayKont(node, i, benv, initValues)
  {
    this.node = node;
    this.i = i;
    this.benv = benv;
    this.initValues = initValues;
  }
  
  ArrayKont.prototype.equals =
    function (x)
    {
      return x instanceof ArrayKont
        && this.node === x.node
        && this.i === x.i
        && (this.benv === x.benv || this.benv.equals(x.benv))
        && (this.initValues === x.initValues || this.initValues.equals(x.initValues))
    }
  ArrayKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.i;
      result = prime * result + this.benv.hashCode();
      result = prime * result + this.initValues.hashCode();
      return result;
    }
  ArrayKont.prototype.toString =
    function ()
    {
      return "arr-" + this.node.tag + "-" + this.i;
    }
  ArrayKont.prototype.nice =
    function ()
    {
      return "arr-" + this.node.tag + "-" + this.i;
    }
  ArrayKont.prototype.addresses =
    function ()
    {
      var addresses = this.benv.addresses();
      this.initValues.forEach(function (value) {addresses = addresses.join(value.addresses())});
      return addresses;
    }
  ArrayKont.prototype.apply =
    function (initValue, store, lkont, kont)
    {
      var node = this.node;
      var elements = node.elements;
      var benv = this.benv;
      var i = this.i;
      var initValues = this.initValues.addLast(initValue);

      if (elements.length === i)
      {
        var arr = createArray();
        var arrAddress = a.array(node, benv, store, lkont, kont);
        for (var j = 0; j < i; j++)
        {
          var indexName = l.abst1(String(j));
          arr = arr.add(indexName, initValues[j]);
        }
        arr = arr.add(P_LENGTH, l.abst1(i));
        store = storeAlloc(store, arrAddress, arr);
        return [{state:new KontState(l.abstRef(arrAddress), store, lkont, kont)}];        
      }
      var frame = new ArrayKont(node, i + 1, benv, initValues);
      return [{state:new EvalState(elements[i], benv, store, [frame].concat(lkont), kont)}];
    }
  
  function MemberKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  MemberKont.prototype.equals =
    function (x)
    {
      return x instanceof MemberKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  MemberKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  MemberKont.prototype.toString =
    function ()
    {
      return "mem-" + this.node.tag;
    }
  MemberKont.prototype.nice =
    function ()
    {
      return "mem-" + this.node.tag;
    }
  MemberKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  MemberKont.prototype.apply =
    function (objectValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var property = node.property;
      var objectRefStore = ToObject(node, objectValue, store);
      var objectRef = objectRefStore[0];
      store = objectRefStore[1];
      if (node.computed)
      {
        var frame = new MemberPropertyKont(node, benv, objectRef);
        return [{state:new EvalState(property, benv, store, [frame].concat(lkont), kont)}];
      }
      var effects = [];
      var value = doProtoLookup(l.abst1(property.name), objectRef.addresses(), store, effects);
      return [{state:new KontState(value, store, lkont, kont), effects:effects}];
    }
  
  function MemberPropertyKont(node, benv, objectRef)
  {
    this.node = node;
    this.benv = benv;
    this.objectRef = objectRef;
  }
  
  MemberPropertyKont.prototype.equals =
    function (x)
    {
      return x instanceof MemberPropertyKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
        && (this.objectRef === x.objectRef || this.objectRef.equals(x.objectRef))
    }
  MemberPropertyKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      result = prime * result + this.objectRef.hashCode();
      return result;
    }
  MemberPropertyKont.prototype.toString =
    function ()
    {
      return "mem-" + this.node.tag;
    }
  MemberPropertyKont.prototype.nice =
    function ()
    {
      return "mem-" + this.node.tag;
    }
  MemberPropertyKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses().join(this.objectRef.addresses());
    }
  MemberPropertyKont.prototype.apply =
    function (propertyValue, store, lkont, kont)
    {
      if (propertyValue === BOT)
      {
        return [];
      }
      var objectRef = this.objectRef;
      var nameValue = propertyValue.ToString();
      var effects = [];
      var value = doProtoLookup(nameValue, objectRef.addresses(), store, effects);
      return [{state:new KontState(value, store, lkont, kont), effects:effects}];
    }
  
  function ToObject(node, value, store)
  {
    
    if (value === BOT)
    {
      return [value, store];
    }
    
    // fast path
//    if (!value.isNonRef) {print(value, Object.keys(value))}
    if (!value.isNonRef())
    {
      return [value, store];
    }
    // end fast path
    
    var objectRef = BOT;
    if (value.isRef())
    {
      objectRef = objectRef.join(value.projectRef());
    }
    var stringProj = value.projectString();
    if (stringProj !== BOT)
    {
      var stringObject = createString(stringProj);
      var addr = a.string(node);
      store = storeAlloc(store, addr, stringObject);
      objectRef = objectRef.join(l.abstRef(addr));
    }
    return [objectRef, store];
  }
  
  function CallMemberKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  CallMemberKont.prototype.equals =
    function (x)
    {
      return x instanceof CallMemberKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  CallMemberKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  CallMemberKont.prototype.toString =
    function ()
    {
      return "memcall-" + this.node.tag;
    }
  CallMemberKont.prototype.nice =
    function ()
    {
      return "memcall-" + this.node.tag;
    }
  CallMemberKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  CallMemberKont.prototype.apply =
    function (objectValue, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      
      var property = node.callee.property;
      if (node.computed)
      {
        throw new Error("TODO");
      }
      var nameValue = l.abst1(property.name);
      var objectRefStore = ToObject(node.callee, objectValue, store);
      var objectRef = objectRefStore[0];
      store = objectRefStore[1];
      var thisAddresses = objectRef.addresses();
      var operands = node.arguments;
      return xxx(node, thisAddresses, nameValue, operands, benv, store, lkont, kont);
    }
  
  function xxx(application, thisAddresses, nameValue, operands, benv, store, lkont, kont)
  {
    return thisAddresses.flatMap(
        function (thisa)
        {
          var effects = [];
          var operatorValue = doProtoLookup(nameValue, ArraySet.from1(thisa), store, effects); 
          if (operands.length === 0)
          {
            if (Ast.isNewExpression(application))
            {
              return applyCons(application, operatorValue, [], benv, store, lkont, kont, effects);
            }
            return applyProc(application, operatorValue, [], thisa, benv, store, lkont, kont, effects);
          }
          var frame = new OperandsKont(application, 1, benv, operatorValue, [], thisa);
          return [{state:new EvalState(operands[0], benv, store, [frame].concat(lkont), kont), effects:effects}];
        });      
  }
  
  function AssignMemberKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  AssignMemberKont.prototype.equals =
    function (x)
    {
      return x instanceof AssignMemberKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  AssignMemberKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  AssignMemberKont.prototype.toString =
    function ()
    {
      return "memas-" + this.node.tag;
    }
  AssignMemberKont.prototype.nice =
    function ()
    {
      return "memas-" + this.node.tag;
    }
  AssignMemberKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  AssignMemberKont.prototype.apply =
    function (objectRef, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var left = node.left;
      var property = left.property;
      if (left.computed)
      {
        var frame = new AssignMemberPropertyKont(node, benv, objectRef);
        return [{state:new EvalState(property, benv, store, [frame].concat(lkont), kont)}];
      }
      var right = node.right;
      var nameValue = l.abst1(property.name);
      var frame = new MemberAssignmentValueKont(node, benv, objectRef, nameValue);
      return [{state:new EvalState(right, benv, store, [frame].concat(lkont), kont)}];
    }
  
  function UpdateMemberKont(node, benv)
  {
    this.node = node;
    this.benv = benv;
  }
  
  UpdateMemberKont.prototype.equals =
    function (x)
    {
      return x instanceof UpdateMemberKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
    }
  UpdateMemberKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      return result;
    }
  UpdateMemberKont.prototype.toString =
    function ()
    {
      return "upmem-" + this.node.tag;
    }
  UpdateMemberKont.prototype.nice =
    function ()
    {
      return "upmem-" + this.node.tag;
    }
  UpdateMemberKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses();
    }
  UpdateMemberKont.prototype.apply =
    function (objectRef, store, lkont, kont)
    {
      var node = this.node;
      var benv = this.benv;
      var argument = node.argument;
      var property = argument.property;
      if (argument.computed)
      {
        var frame = new UpdateMemberPropertyKont(node, benv, objectRef); // TODO
        return [{state:new EvalState(property, benv, store, [frame].concat(lkont), kont)}];
      }
      var name = l.abst1(property.name);
      var effects = [];
      var value = doProtoLookup(name, objectRef.addresses(), store, effects);
      var updatedValue;
      switch (node.operator)
      {
        case "++":
        {
          updatedValue = l.add(value, L_1);
          break;
        }
        case "--":
        {
          updatedValue = l.sub(value, L_1);
          break;
        }
        default: throw new Error("cannot handle update operator " + node.operator);
      }
      if (updatedValue === BOT)
      {
        return [];
      }      
      store = doProtoSet(name, updatedValue, objectRef, store, effects);
      var resultingValue = node.prefix ? updatedValue : value;
      return [{state:new KontState(resultingValue, store, lkont, kont), effects:effects}];
    }
  
  function AssignMemberPropertyKont(node, benv, objectRef)
  {
    this.node = node;
    this.benv = benv;
    this.objectRef = objectRef;
  }
  
  AssignMemberPropertyKont.prototype.equals =
    function (x)
    {
      return x instanceof AssignMemberPropertyKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
        && (this.objectRef === x.objectRef || this.objectRef.equals(x.objectRef))
    }
  AssignMemberPropertyKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      result = prime * result + this.objectRef.hashCode();
      return result;
    }
  AssignMemberPropertyKont.prototype.toString =
    function ()
    {
      return "asmemp-" + this.node.tag;
    }
  AssignMemberPropertyKont.prototype.nice =
    function ()
    {
      return "asmemp-" + this.node.tag;
    }
  AssignMemberPropertyKont.prototype.addresses =
    function ()
    {
      return this.benv.addresses().join(this.objectRef.addresses());
    }
  AssignMemberPropertyKont.prototype.apply =
    function (propertyValue, store, lkont, kont)
    {
      if (propertyValue === BOT)
      {
        return [];
      }
      var node = this.node;
      var benv = this.benv;
      var right = node.right;
      var objectRef = this.objectRef;
      var nameValue = propertyValue.ToString();
      var frame = new MemberAssignmentValueKont(node, benv, objectRef, nameValue);
      return [{state:new EvalState(right, benv, store, [frame].concat(lkont), kont)}];
    }
  
  function MemberAssignmentValueKont(node, benv, objectRef, nameValue)
  {
    this.node = node;
    this.benv = benv;
    this.objectRef = objectRef;
    this.nameValue = nameValue;
  }
  
  MemberAssignmentValueKont.prototype.equals =
    function (x)
    {
      return x instanceof MemberAssignmentValueKont
        && this.node === x.node
        && (this.benv === x.benv || this.benv.equals(x.benv))
        && (this.objectRef === x.objectRef || this.objectRef.equals(x.objectRef))
        && (this.nameValue === x.nameValue || this.nameValue.equals(x.nameValue))
    }
  MemberAssignmentValueKont.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benv.hashCode();
      result = prime * result + this.objectRef.hashCode();
      result = prime * result + this.nameValue.hashCode();
      return result;
    }
  MemberAssignmentValueKont.prototype.toString =
    function ()
    {
      return "memasv-" + this.node.tag;
    }
  MemberAssignmentValueKont.prototype.nice =
    function ()
    {
      return "memasv-" + this.node.tag;
    }
  MemberAssignmentValueKont.prototype.addresses =
    function ()
    {
    // no addresses from nameValue: required to be `ToString`ed! (see assert in constr)
      return this.benv.addresses().join(this.objectRef.addresses());
    }
  MemberAssignmentValueKont.prototype.apply =
    function (value, store, lkont, kont)
    {
      var node = this.node;
      var objectRef = this.objectRef;
      var nameValue = this.nameValue;
      var effects = [];
      var newValue;
      switch (node.operator)
      {
        case "=":
        {
          newValue = value;
          break;
        }
        case "+=":
        {
          var existingValue = doProtoLookup(nameValue, objectRef.addresses(), store, effects);
          var newValue = l.add(existingValue, value);
          break;
        }
        case "-=":
        {
          var existingValue = doProtoLookup(nameValue, objectRef.addresses(), store, effects);
          var newValue = l.sub(existingValue, value);
          break;
        }
        case "|=":
        {
          var existingValue = doProtoLookup(nameValue, objectRef.addresses(), store, effects);
          newValue = l.binor(existingValue, value);
          break;
        }
        default: throw new Error("cannot handle assignment operator " + node.operator);
      }
      if (newValue === BOT)
      {
        return [];
      }
      store = doProtoSet(nameValue, newValue, objectRef, store, effects);
      return [{state:new KontState(newValue, store, lkont, kont), effects:effects}];
    }
  
  
  function doScopeLookup(nameNode, benv, store, effects)
  {
    var name = nameNode.name;
    var a = benv.lookup(name);
    if (a === BOT)
    {
      var obj = storeLookup(store, globala);
      var aname = l.abst1(name);
      var resultFound = obj.lookup(aname);
      var value = resultFound[0];
      if (value !== BOT)
      {
        effects.push(new readObjectEffect(globala, aname));
      }      
      return value;
    }
    effects.push(new readVarEffect(a, nameNode));
    return storeLookup(store, a);
  }

  function doProtoLookup(name, as, store, effects)
  {
    var result = BOT;
    as = as.values();
    while (as.length !== 0)
    {
      var a = as[0];
      as = as.slice(1);
      var benv = storeLookup(store, a);
      effects.push(readObjectEffect(a, name));
      var valueFound = benv.lookup(name);
      var value = valueFound[0];
      var found = valueFound[1];
      if (value !== BOT)
      {
        result = result.join(value);
      }
      if (!found)
      {
        if (benv.Prototype.subsumes(L_NULL))
        {
           result = result.join(L_UNDEFINED);
        }
        var cprotoAddresses = benv.Prototype.addresses();
        as = as.concat(cprotoAddresses.values());
      }
    }
    return result;
  }
  
  function doScopeSet(nameNode, value, benv, store, effects)
  {
    var name = nameNode.name;
    var a = benv.lookup(name);
    if (a === BOT)
    {
      var obj = storeLookup(store, globala);
      var aname = l.abst1(name);
      obj = obj.add(aname, value);
      effects.push(writeObjectEffect(globala, aname))
      store = storeUpdate(store, globala, obj);      
    }
    else
    {
      store = storeUpdate(store, a, value);
      effects.push(writeVarEffect(a, nameNode));
    }
    return store;
  }
  
  function doProtoSet(name, value, objectRef, store, effects)
  {
    var benvs = objectRef.addresses().values();
    while (benvs.length !== 0)
    {
      var a = benvs[0];
      benvs = benvs.slice(1);
      var benv = storeLookup(store, a);
      benv = benv.add(name, value);
      effects.push(writeObjectEffect(a, name));
      if (benv.isArray())
      {
        // ES5.1 15.4.5.1 
        var n = name.ToNumber();
        var i = name.ToUint32();
        if (n.equals(i))
        {
          var len = benv.lookup(P_LENGTH)[0];
          if (l.gte(i, len).isTrue())
          {
            benv = benv.add(P_LENGTH, l.add(i, L_1));
            effects.push(writeObjectEffect(a, P_LENGTH));
          }
        }
      }
      store = storeUpdate(store, a, benv);
    }
    return store;
  }
  
  function isAtomic(node)
  {
    if (!aeFlag)
    {
      return false;
    }
    switch (node.type)
    {
      case "Literal":
      case "ThisExpression":  
      case "Identifier": return true;  
      //case "FunctionDeclaration": return true; WRONG: modifies the store
      case "BinaryExpression": return isAtomic(node.left) && isAtomic(node.right);
      case "MemberExpression": return isAtomic(node.object) && isAtomic(node.property);
      default: return false;
    }
    return false;
  }
 
  function AtomicEvaluator(effects)
  {
    assert(Array.isArray(effects));
    this.effects = effects;
  }
  
  AtomicEvaluator.prototype.evalNode =
    function (node, benv, store)
    {
      switch (node.type)
      {
        case "ExpressionStatement": return this.evalNode(node.expression, benv, store);
        case "Literal": return l.abst1(node.value);
        case "Identifier": return this.evalIdentifier(node, benv, store);
        case "ThisExpression": return this.evalThisExpression(node, benv, store);
        case "FunctionDeclaration": return L_UNDEFINED;
        case "BinaryExpression": return this.evalBinaryExpression(node, benv, store);
        case "MemberExpression": return this.evalMemberExpression(node, benv, store);
        default: throw new Error("cannot atomically evaluate " + node + " (" + node.type + ")");
      }
    }
  
//  AtomicEvaluator.prototype.evalStatementList =
//    function (node, benv)
//    {
//      var nodes = node.body;
//      if (nodes.length === 0)
//      {
//        return L_UNDEFINED;
//      }
//      var i = 0;
//      while (true)
//      {
//        var value = this.evalNode(nodes[i], benv); 
//        if (i + 1 === nodes.length)
//        {
//          return value; 
//        }
//        i++;
//      }
//    }
  
   AtomicEvaluator.prototype.evalIdentifier =
     function (node, benv, store)
    {
      var effects = this.effects;
      var value = doScopeLookup(node, benv, store, effects);
      return value;
    }
   
   AtomicEvaluator.prototype.evalThisExpression =
     function (node, benv, store)
    {
       return l.abstRef(benv.lookup("this"));
    }

   AtomicEvaluator.prototype.evalBinaryExpression =
     function (node, benv, store)
     {
       var leftValue = this.evalNode(node.left, benv, store);
       var rightValue = this.evalNode(node.right, benv, store);
       var operator = node.operator;
       return applyBinaryOperator(operator, leftValue, rightValue);
     }
   
   AtomicEvaluator.prototype.evalMemberExpression =
     function (node, benv, store)
     {
       var effects = this.effects;
       var objectValue = this.evalNode(node.object, benv, store);
       var objectRefStore = ToObject(node, objectValue, store);
       var objectRef = objectRefStore[0];
       store = objectRefStore[1];
       var nameValue;
       if (node.computed)
       {
         var propertyValue = this.evalNode(node.property, benv, store);
         if (propertyValue === BOT)
         {
           return BOT;
         }
         nameValue = propertyValue.ToString();
       }
       else
       {
         nameValue = l.abst1(node.property.name);
       }
       var value = doProtoLookup(nameValue, objectRef.addresses(), store, effects);
       return value;
     }
   
  function evalEmptyStatement(node, benv, store, lkont, kont)
  {
    return [{state:new KontState(L_UNDEFINED, store, lkont, kont)}];
  }

  function evalLiteral(node, benv, store, lkont, kont)
  {
    var value = l.abst1(node.value);
    return [{state:new KontState(value, store, lkont, kont)}];
  }
  
  function evalIdentifier(node, benv, store, lkont, kont, effects)
   {
     var value = doScopeLookup(node, benv, store, effects);
     return [{state:new KontState(value, store, lkont, kont), effects:effects}];
   }

  function evalThisExpression(node, benv, store, lkont, kont, effects)
  {
    var value = l.abstRef(benv.lookup("this"));
    return [{state:new KontState(value, store, lkont, kont), effects:effects}];
  }
  
  function evalProgram(node, benv, store, lkont, kont)
  {
    var funScopeDecls = functionScopeDeclarations(node);
    var names = Object.keys(funScopeDecls);
    var effects = [];
    if (names.length > 0)
    {
      var obj = storeLookup(store, globala);
      names.forEach(
        function (name)
        {
          var node = funScopeDecls[name];
          var aname = l.abst1(name);
          if (Ast.isFunctionDeclaration(node))
          {
            var allocateResult = allocateClosure(node, benv, store, lkont, kont);
            var closureRef = allocateResult.ref;
            store = allocateResult.store;
            obj = obj.add(aname, closureRef);  
            effects.push(writeObjectEffect(globala, aname));
          }
          else if (Ast.isVariableDeclarator(node))
          {          
            obj = obj.add(aname, L_UNDEFINED);
            effects.push(writeObjectEffect(globala, aname));
          }
          else
          {
            throw new Error("cannot handle declaration " + node);
          }
        });
      store = storeUpdate(store, globala, obj);
    }
    return evalStatementList(node, benv, store, lkont, kont, effects);
  }

  function evalStatementList(node, benv, store, lkont, kont, effects)
  {
    var nodes = node.body;
    if (nodes.length === 0)
    {
      return [{state:new KontState(L_UNDEFINED, store, lkont, kont), effects:effects}];
    }
    if (nodes.length === 1)
    {
//      return kont.unch(new EvalState(nodes[0], benv, store));
      return evalNode(nodes[0], benv, store, lkont, kont, effects);
    }
    var frame = new BodyKont(node, 1, benv);
    return [{state:new EvalState(nodes[0], benv, store, [frame].concat(lkont), kont), effects:effects}];
  }

  function evalVariableDeclaration(node, benv, store, lkont, kont, effects)
  {
    var nodes = node.declarations;
    if (nodes.length === 0)
    {
      throw new Error("no declarations in " + node);
    }
    if (nodes.length === 1)
    {
      return evalVariableDeclarator(nodes[0], benv, store, lkont, kont, effects);
    }
    var frame = new VariableDeclarationKont(node, 1, benv);
    return [{state:new EvalState(nodes[0], benv, store, [frame].concat(lkont), kont)}];
  }

  function evalVariableDeclarator(node, benv, store, lkont, kont, effects)
  {
    var init = node.init;
    if (init === null)
    {
      return [{state:new KontState(L_UNDEFINED, store, lkont, kont), effects:effects}];      
    }
    if (isAtomic(init))
    {
      var ae = new AtomicEvaluator(effects);
      var value = ae.evalNode(init, benv, store);
      var id = node.id;
      store = doScopeSet(id, value, benv, store, effects);      
      return [{state:new KontState(L_UNDEFINED, store, lkont, kont), effects:effects}];
    }
    var frame = new VariableDeclaratorKont(node, benv);
    return [{state:new EvalState(init, benv, store, [frame].concat(lkont), kont)}];
  }

  function evalUnaryExpression(node, benv, store, lkont, kont)
  {
    var frame = new UnaryKont(node);
    return [{state:new EvalState(node.argument, benv, store, [frame].concat(lkont), kont)}];
  }

  function evalBinaryExpression(node, benv, store, lkont, kont)
  {
    var frame = new LeftKont(node, benv);
    return [{state:new EvalState(node.left, benv, store, [frame].concat(lkont), kont)}];
  }

  function evalLogicalExpression(node, benv, store, lkont, kont)
  {
    var frame = new LogicalLeftKont(node, benv);
    return [{state:new EvalState(node.left, benv, store, [frame].concat(lkont), kont)}];
  }

  function evalAssignmentExpression(node, benv, store, lkont, kont)
  { 
    var left = node.left;
    switch (left.type)
    {
      case "Identifier":
      {
        var right = node.right;
        var frame = new AssignIdentifierKont(node, benv);
        return [{state:new EvalState(right, benv, store, [frame].concat(lkont), kont)}];
      }
      case "MemberExpression":
      {
        var object = left.object;
        var frame = new AssignMemberKont(node, benv);
        return [{state:new EvalState(object, benv, store, [frame].concat(lkont), kont)}];    
      }
      default:
      {
        throw new Error("cannot handle left hand side " + left);
      }
    }
  }
  
  function evalUpdateExpression(node, benv, store, lkont, kont)
  {
    var argument = node.argument;
    switch (argument.type)
    {
      case "Identifier":
      {
        var effects = [];
        var value = doScopeLookup(argument, benv, store, effects);
        var updatedValue;
        switch (node.operator)
        {
          case "++":
          {
            updatedValue = l.add(value, L_1);
            break;
          }
          case "--":
          {
            updatedValue = l.sub(value, L_1);
            break;
          }
          default: throw new Error("cannot handle update operator " + node.operator);
        }
        if (updatedValue === BOT)
        {
          return [];
        }
        store = doScopeSet(argument, updatedValue, benv, store, effects);
        var resultingValue = node.prefix ? updatedValue : value;
        return [{state:new KontState(resultingValue, store, lkont, kont), effects:effects}];
      }
      case "MemberExpression":
      {
        var object = argument.object;
        var frame = new UpdateMemberKont(node, benv);
        return [{state:new EvalState(object, benv, store, [frame].concat(lkont), kont)}];    
      }
      default:
      {
        throw new Error("cannot handle argument " + argument);
      }
    }
  }


  function allocateClosure(node, benv, store, lkont, kont)
  {
    var closure = createClosure(node, benv);
    var closurea = a.closure(node, benv, store, lkont, kont);
  
    var prototype = createObject(objectProtoRef);
    var prototypea = a.closureProtoObject(node.body, benv, store, lkont, kont);
    var closureRef = l.abstRef(closurea);
    prototype = prototype.add(P_CONSTRUCTOR, closureRef);
    store = storeAlloc(store, prototypea, prototype);
  
    closure = closure.add(P_PROTOTYPE, l.abstRef(prototypea));
    store = storeAlloc(store, closurea, closure);
    return {store: store, ref: closureRef}
  }

  function evalFunctionExpression(node, benv, store, lkont, kont)
  {
    var allocateResult = allocateClosure(node, benv, store, lkont, kont);
    var closureRef = allocateResult.ref;
    store = allocateResult.store;
    return [{state:new KontState(closureRef, store, lkont, kont)}];
  }

  function evalFunctionDeclaration(node, benv, store, lkont, kont)
  {
    return [{state:new KontState(L_UNDEFINED, store, lkont, kont)}];
  }
  
  function evalCallExpression(node, benv, store, lkont, kont, effects)
  {
    var calleeNode = node.callee;
    
    if (Ast.isMemberExpression(calleeNode))
    { 
      var object = calleeNode.object;
      
      if (isAtomic(object))
      {
        var ae = new AtomicEvaluator(effects);
        var objectValue = ae.evalNode(object, benv, store);
        var property = node.callee.property;
        if (node.computed)
        {
          throw new Error("TODO");
        }
        var nameValue = l.abst1(property.name);
        var objectRefStore = ToObject(node.callee, objectValue, store);
        var objectRef = objectRefStore[0];
        store = objectRefStore[1]; // TODO ae, should not change
        
        var thisAddresses = objectRef.addresses();
        var operands = node.arguments;
        return thisAddresses.flatMap(
          function (thisa)
          {
            effects = effects.slice(0);
            var operatorValue = doProtoLookup(nameValue, ArraySet.from1(thisa), store, effects); 
            var i = 0;
            var operandsValues = [];
            while (i < operands.length && isAtomic(operands[i]))
            {
              operandsValues[i] = ae.evalNode(operands[i], benv, store);
              i++;
            }
            if (i === operands.length)
            {
              if (Ast.isNewExpression(node))
              {
                return applyCons(node, operatorValue, operandsValues, benv, store, lkont, kont, effects);
              }
              return applyProc(node, operatorValue, operandsValues, thisa, benv, store, lkont, kont, effects);
            }
            var frame = new OperandsKont(node, 1, benv, operatorValue, [], thisa);
            return [{state:new EvalState(operands[0], benv, store, [frame].concat(lkont), kont), effects:effects}];
          });      
      }
      
      var frame = new CallMemberKont(node, benv);
      return [{state:new EvalState(object, benv, store, [frame].concat(lkont), kont), effects:effects}];
    }
    
    if (isAtomic(calleeNode))
    {
      var ae = new AtomicEvaluator(effects);
      var operatorValue = ae.evalNode(calleeNode, benv, store);
      var operands = node.arguments;
      
      var i = 0;
      var operandsValues = [];
      while (i < operands.length && isAtomic(operands[i]))
      {
        operandsValues[i] = ae.evalNode(operands[i], benv, store);
        i++;
      }
      if (i === operands.length)
      {
        if (Ast.isNewExpression(node))
        {
          return applyCons(node, operatorValue, operandsValues, benv, store, lkont, kont, effects);
        }
        return applyProc(node, operatorValue, operandsValues, globala, benv, store, lkont, kont, effects);
      }
      var frame = new OperandsKont(node, i + 1, benv, operatorValue, operandsValues, globala);
      return [{state:new EvalState(operands[i], benv, store, [frame].concat(lkont), kont)}];
    }
    
    var frame = new OperatorKont(node, benv);
    return [{state:new EvalState(calleeNode, benv, store, [frame].concat(lkont), kont)}];
  }
  

  function applyProc(application, operatorValue, operandValues, thisa, benv, store, lkont, kont, effects)
  {
    var operatorAs = operatorValue.addresses();
    if (errors)
    {
      if (operatorAs.count() === 0)
      {
        return [{state:new ErrorState(application.callee, application.callee + " is not a function"),effects:effects}];
      }
    }
    return operatorAs.flatMap(
      function (operatora)
      {
        var benv = storeLookup(store, operatora);
        var callables = benv.Call.values();
        return callables.flatMap(
          function (callable)
          {
            //if (!callable.applyFunction) {print(application, callable, Object.keys(callable))};
            return callable.applyFunction(application, operandValues, thisa, benv, store, lkont, kont, effects.slice(0));
          })
      })
  }

  // cloned from 'applyProc', invokes 'applyConstructor' iso. 'applyFunction' on callables
  function applyCons(application, operatorValue, operandValues, benv, store, lkont, kont, effects)
  {
    var operatorAs = operatorValue.addresses();
    return operatorAs.flatMap(
      function (operatora)
      {
        var benv = storeLookup(store, operatora);
        var protoRef = benv.lookup(P_PROTOTYPE)[0];
        var callables = benv.Call.values();
        return callables.flatMap(
          function (callable)
          {
            return callable.applyConstructor(application, operandValues, protoRef, benv, store, lkont, kont, effects.slice(0));
          })
      })
  }

  function evalReturnStatement(node, benv, store, lkont, kont, effects)
  {
    var argumentNode = node.argument;
    if (argumentNode === null)
    {
      return [{state:new ReturnState(L_UNDEFINED, store, lkont, kont), effects:effects}];
    }
    
    if (isAtomic(argumentNode))
    {
      var ae = new AtomicEvaluator(effects);
      var value = ae.evalNode(argumentNode, benv, store);
      return [{state:new ReturnState(value, store, lkont, kont), effects:effects}];
    }
    
    var frame = new ReturnKont(node);
    return [{state:new EvalState(argumentNode, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalBreakStatement(node, benv, store, lkont, kont, effects)
  {
    return [{state:new BreakState(store, lkont, kont), effects: effects}];
  }
  
  function evalTryStatement(node, benv, store, lkont, kont, effects)
  {
    var block = node.block;
    var frame = new TryKont(node, benv);
    return [{state:new EvalState(block, benv, store, [frame].concat(lkont), kont),effects:effects}];    
  }
  
  function evalThrowStatement(node, benv, store, lkont, kont, effects)
  {
    var argumentNode = node.argument;
    
    if (isAtomic(argumentNode))
    {
      var ae = new AtomicEvaluator(effects);
      var value = ae.evalNode(argumentNode, benv, store);
      return [{state:new ThrowState(value, store, lkont, kont), effects:effects}];
    }
    
    var frame = new ThrowKont(node);
    return [{state:new EvalState(argumentNode, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalIfStatement(node, benv, store, lkont, kont)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benv);
    return [{state:new EvalState(testNode, benv, store, [frame].concat(lkont), kont)}];
  }

  function evalConditionalExpression(node, benv, store, lkont, kont)  
  {
    var testNode = node.test;
    var frame = new IfKont(node, benv);
    return [{state:new EvalState(testNode, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalForStatement(node, benv, store, lkont, kont)
  {
    var init = node.init;
    if (init)
    {
      var frame = new ForInitKont(node, benv);
      return [{state:new EvalState(init, benv, store, [frame].concat(lkont), kont)}];      
    }
    var test = node.test;
    var frame = new ForTestKont(node, L_UNDEFINED, benv);
    return [{state:new EvalState(test, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalWhileStatement(node, benv, store, lkont, kont)
  {
    var test = node.test;
    var frame = new WhileTestKont(node, benv);
    return [{state:new EvalState(test, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalDoWhileStatement(node, benv, store, lkont, kont)
  {
    var body = node.body;
    var frame = new WhileBodyKont(node, benv);
    return [{state:new EvalState(body, benv, store, [frame].concat(lkont), kont)}];
  }
  
  function evalObjectExpression(node, benv, store, lkont, kont)
  {
    var properties = node.properties;    
    if (properties.length === 0)
    { 
      var obj = createObject(objectProtoRef);
      var objectAddress = a.object(node, benv, store, lkont, kont);
      store = storeAlloc(store, objectAddress, obj);
//      effects.push(allocObjectEffect(objectAddress));
      var objectRef = l.abstRef(objectAddress);
      return [{state:new KontState(objectRef, store, lkont, kont)}];
    }
    var frame = new ObjectKont(node, 1, benv, []);
    return [{state:new EvalState(properties[0].value, benv, store, [frame].concat(lkont), kont)}];    
  }
  
  function evalArrayExpression(node, benv, store, lkont, kont)
  {
    var elements = node.elements;    
    if (elements.length === 0)
    { 
      var arr = createArray();
      arr = arr.add(P_LENGTH, L_0);
      var arrAddress = a.array(node, benv, store, lkont, kont);
      store = storeAlloc(store, arrAddress, arr);
      var arrRef = l.abstRef(arrAddress);
      return [{state:new KontState(arrRef, store, lkont, kont)}];
    }
    var frame = new ArrayKont(node, 1, benv, []);
    return [{state:new EvalState(elements[0], benv, store, [frame].concat(lkont), kont)}];    
  }
  
  function evalMemberExpression(node, benv, store, lkont, kont)
  {
    var object = node.object;
    var frame = new MemberKont(node, benv);
    return [{state:new EvalState(object, benv, store, [frame].concat(lkont), kont)}];
  }

  function evalNode(node, benv, store, lkont, kont, effects)
  {
    assert(Array.isArray(effects));
    if (isAtomic(node))
    {
      var ae = new AtomicEvaluator(effects);
      var value = ae.evalNode(node, benv, store);
      return [{state:new KontState(value, store, lkont, kont), effects:effects}];
    }
    return evalNonAtomic(node, benv, store, lkont, kont, effects);
  }
  
  function evalNonAtomic(node, benv, store, lkont, kont, effects)
  {
    switch (node.type)
    {
      case "Literal": 
        return evalLiteral(node, benv, store, lkont, kont, effects);
      case "Identifier":
        return evalIdentifier(node, benv, store, lkont, kont, effects);
      case "BinaryExpression":
        return evalBinaryExpression(node, benv, store, lkont, kont, effects);
      case "LogicalExpression":
        return evalLogicalExpression(node, benv, store, lkont, kont, effects);
      case "CallExpression":
        return evalCallExpression(node, benv, store, lkont, kont, effects);
      case "FunctionExpression":
        return evalFunctionExpression(node, benv, store, lkont, kont, effects);
      case "AssignmentExpression":
        return evalAssignmentExpression(node, benv, store, lkont, kont, effects);
      case "ArrayExpression":
        return evalArrayExpression(node, benv, store, lkont, kont, effects);
      case "MemberExpression":
        return evalMemberExpression(node, benv, store, lkont, kont, effects);
      case "ObjectExpression":
        return evalObjectExpression(node, benv, store, lkont, kont, effects);
      case "ThisExpression":
        return evalThisExpression(node, benv, store, lkont, kont, effects);
      case "NewExpression":
        return evalCallExpression(node, benv, store, lkont, kont, effects);
      case "UpdateExpression":
        return evalUpdateExpression(node, benv, store, lkont, kont, effects);
      case "UnaryExpression":
        return evalUnaryExpression(node, benv, store, lkont, kont, effects);
      case "ExpressionStatement":
        return evalNode(node.expression, benv, store, lkont, kont, effects);
      case "ReturnStatement": 
        return evalReturnStatement(node, benv, store, lkont, kont, effects);
      case "BreakStatement": 
        return evalBreakStatement(node, benv, store, lkont, kont, effects);
      case "LabeledStatement": 
        return evalLabeledStatement(node, benv, store, lkont, kont, effects);
      case "IfStatement": 
        return evalIfStatement(node, benv, store, lkont, kont, effects);
      case "ConditionalExpression": 
        return evalConditionalExpression(node, benv, store, lkont, kont, effects);
      case "SwitchStatement": 
        return evalSwitchStatement(node, benv, store, lkont, kont, effects);
      case "ForStatement": 
        return evalForStatement(node, benv, store, lkont, kont, effects);
      case "WhileStatement": 
        return evalWhileStatement(node, benv, store, lkont, kont, effects);
      case "DoWhileStatement": 
        return evalDoWhileStatement(node, benv, store, lkont, kont, effects);
      case "FunctionDeclaration": 
        return evalFunctionDeclaration(node, benv, store, lkont, kont, effects);
      case "VariableDeclaration": 
        return evalVariableDeclaration(node, benv, store, lkont, kont, effects);
      case "VariableDeclarator": 
        return evalVariableDeclarator(node, benv, store, lkont, kont, effects);
      case "BlockStatement":
        return evalStatementList(node, benv, store, lkont, kont, effects);
      case "EmptyStatement":
        return evalEmptyStatement(node, benv, store, lkont, kont, effects);
      case "TryStatement": 
        return evalTryStatement(node, benv, store, lkont, kont, effects);
      case "ThrowStatement": 
        return evalThrowStatement(node, benv, store, lkont, kont, effects);
      case "Program":
        return evalProgram(node, benv, store, lkont, kont, effects);
      default:
        throw new Error("cannot handle node " + node.type); 
    }
  }

  var module = {};
  module.l = l;
  module.store = store;
  module.globala = globala;
  
  module.inject = 
    function (node, override)
    {
      override = override || {};
      var haltFrame = new HaltKont([globala]);
      var globalEnv = Benv.empty().add("this", globala);
      return new EvalState(node, override.benv || globalEnv, override.store || store, [haltFrame], EMPTY_KONT);    
    }
  
  
  module.explore =
    function (ast)
    {
      var startTime = performance.now();
      var id = 0;
      var visited = MutableHashSet.empty(104729);
      var initial = this.inject(ast);
      initial._id = id++;
      visited.add(initial);
      var result = ArraySet.empty();
      var todo = [initial];
      while (todo.length > 0 || popTodo.length > 0)
      {
        while (todo.length > 0)
        {
          var s = todo.pop();
          var next = s.next();
          s._successors = next;
          if (next.length === 0)
          {
            result = result.add(s);
            continue;
          }
          for (var i = 0; i < next.length; i++)
          {
            var t2 = next[i];
            var s2 = t2.state;
            var ss2 = visited.get(s2);
            if (ss2)
            {
              t2.state = ss2;
              continue;
            }
            visited.add(s2);
            s2._id = id++;
            todo.push(s2);
            if (id % 10000 === 0)
            {
              print(Formatter.displayTime(performance.now()-startTime), "states", id, "todo", todo.length + "/" + popTodo.length, "ctxs", contexts.count());//, "sstorei", sstorei);
            }
          }            
        }
        while (popTodo.length > 0)
        {
          var poppy = popTodo.pop();
          var poppers = poppy[0];
          var stack = poppy[1];
          poppers.forEach(
            function (popper)
            {
              var todoS = new KontState(popper.value, popper.store, stack[0], stack[1]);
              var s2 = visited.get(todoS);
              if (s2)
              {
                popper._successors.push({state:s2, effects: []});
              }
              else
              {
                visited.add(todoS);
                todoS._id = id++;
                popper._successors.push({state:todoS, effects: []});
                todo.push(todoS);
              }
            });
        }
      }
//      print("sstorei-skip", skipped1, "eval-skip", skipped2, "nexted", nexted);
      return {initial:initial, result:result, contexts:contexts, states:visited, time:performance.now()-startTime};
    }
  
//  module.explore =
//    function (ast)
//    {
//      var startTime = performance.now();
//      var id = 0;
//      var visited = MutableHashSet.empty(104729);
//      var initial = this.inject(ast);
//      initial._id = id++;
//      visited.add(initial);
//      var result = ArraySet.empty();
//      var todo = [initial];
//      while (todo.length > 0)
//      {
//        var s = todo.pop();
//        if (s._sstorei === sstorei)
//        {
//          continue;
//        }
//        s._sstorei = sstorei;
//        var next = s._successors;
//        if (next && s instanceof EvalState)
//        {
//          for (var i = 0; i < next.length; i++)
//          {
//            var t2 = next[i];
//            var s2 = t2.state;
//            todo.push(s2);
//          }
//          continue;
//        }
//        next = s.next();
//        s._successors = next;
//        if (next.length === 0)
//        {
//          result = result.add(s);
//          continue;
//        }
//        for (var i = 0; i < next.length; i++)
//        {
//          var t2 = next[i];
//          var s2 = t2.state;
//          var ss2 = visited.get(s2);
//          if (ss2)
//          {
//            t2.state = ss2;
//            todo.push(ss2);
//            continue;
//          }
//          visited.add(s2);
//          s2._id = id++;
//          todo.push(s2);
//          if (id % 10000 === 0)
//          {
//            print(Formatter.displayTime(performance.now()-startTime), "states", id, "todo", todo.length, "ctxs", contexts.count(), "sstorei", sstorei);
//          }
//        }            
//      }
////      print("sstorei-skip", skipped1, "eval-skip", skipped2, "nexted", nexted);
//      return {initial:initial, result:result, contexts:contexts, states:visited, time:performance.now()-startTime};
//    }
  
  module.concExplore =
    function (ast)
    {
      var startTime = performance.now();
      var initial = this.inject(ast);
      var s = initial;
      var id = 0;
      while (true)
      {
        var next = s.next();
        id++;
        if (id % 10000 === 0)
        {
          print(Formatter.displayTime(performance.now()-startTime), "states", id, "ctxs", sstore.count(), "sstorei", sstorei);
        }
        var l = next.length;
        if (l === 1)
        {
          s = next[0].state;
        }
        else if (l === 0)
        {
          return {initial:initial, result: ArraySet.from1(s), sstore:sstore, numStates:id, time:performance.now()-startTime};
        }
        else
        {
          throw new Error("more than one next state");
        }
      }
    }
  
  
  module.isAtomic = isAtomic;
  module.evalAtomic =
    function (atom, benv, store)
    {
      var ae = new AtomicEvaluator([]);
      var value = ae.evalNode(atom, benv, store);
      return value;
    }
      
  return module; 
}

//module.explore =
//function (ast)
//{ // orig
//  var yes = 0;
//  var visited = MutableHashSet.empty(104729);
//  var graph = Graph.empty();
//  var initial = this.inject(ast);
//  var todo = [initial];
//  while (todo.length > 0)
//  {
//    var s = todo.pop();
//    if (visited.contains(s))
//    {
//      continue;
//    }
//    visited.add(s); 
//    var currSstorei = sstorei; 
//    var next = s.next();
//    if (sstorei > currSstorei)
//    {
//      visited.clear();
//    }
//    for (var i = 0; i < next.length; i++)
//    {
//      var t2 = next[i];
//      var s2 = t2.state;
//      var m2 = t2.effects;
////      if (graph.containsEdge(new Edge(s, m2, s2)))
////      {
////        yes++;
////      }
////      else
//      {
//        graph = graph.addEdge(new Edge(s, m2, s2));            
//      }
//      todo.push(s2);
//    }
//  }
//  print("YES", yes);
//  return {initial: initial, graph:graph, sstore: sstore};
//}  


function isResultState(state)
{
  return state.value && state.lkont.length === 0 && state.kont === EMPTY_KONT; 
}

function retrieveEndStates(initial) // not used for the moment
{
  var todo = [initial];
  var result = ArraySet.empty();
  while (todo.length > 0)
  {
    var s = todo.pop();
    if (s._result)
    {
      continue;
    }
    s._result = true;
    var successors = s._successors; 
    if (successors.length === 0)
    {
      result = result.add(s);
    }
    else
    {
      todo = todo.concat(successors.map(function (t) {return t.state}));      
    }
  }
  return result;
}

function computeResultValue(endStates)
{
  var result = BOT;
  var msgs = [];
  endStates.forEach(
    function (s)
    {
      if (isResultState(s))
      {
        result = result.join(s.value)
      }
      else if (s.msg)
      {
        msgs.push("line " + s.node.loc.start.line + ": " + s.msg);
      }
      else
      {
        msgs.push("ERROR: no successors for " + s);
      }
    });
  return {value:result, msgs:msgs};
}

function Effect(operation, address, name)
{
  this.operation = operation;
  this.address = address;
  this.name = name;
}
Effect.Operations = {READ:"R", WRITE:"W", ALLOC:"A"}
Effect.prototype.toString =
  function ()
  {
    return "[" + this.operation + "," + this.address + "," + this.name + "]";
  }
Effect.prototype.equals =
  function (x)
  {
    return (x instanceof Effect)
      && this.operation === x.operation
      && this.address.equals(x.address)
      && ((this.name === x.name) || (this.name && this.name.equals(x.name)))
  }
Effect.prototype.hashCode =
  function ()
  {
    var prime = 31;
    var result = 1;
    result = prime * result + this.operation.hashCode();
    result = prime * result + this.address.hashCode();
    result = prime * result + HashCode.hashCode(this.name);
    return result;          
  }
Effect.prototype.isReadEffect =
  function ()
  {
    return this.operation === Effect.Operations.READ;
  }
Effect.prototype.isWriteEffect =
  function ()
  {
    return this.operation === Effect.Operations.WRITE;
  }
Effect.prototype.isAllocEffect =
  function ()
  {
    return this.operation === Effect.Operations.ALLOC;
  }

var storeI = new Indexer();
