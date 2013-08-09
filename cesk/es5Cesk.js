function es5Cesk(cc)
{
  // address generator
  var a = cc.a;
  // benv creator
  var b = cc.b || new DefaultBenv();
  // primitive lattice
  var p = cc.p;
  
  assertDefinedNotNull(a);
//  assertDefinedNotNull(b);
  assertDefinedNotNull(p);

  // lattice (primitives + addresses)
  var l = new JipdaLattice(p); // TODO this will become param
  
  // install constants
  var L_UNDEFINED = l.abst1(undefined);
  var L_NULL = l.abst1(null);
  var L_0 = l.abst1(0);
  var L_1 = l.abst1(1);
  var L_FALSE = l.abst1(false);
  var L_MININFINITY = l.abst1(-Infinity);
  var P_0 = p.abst1(0);
  var P_1 = p.abst1(1);
  var P_TRUE = p.abst1(true);
  var P_FALSE = p.abst1(false);
  var P_THIS = p.abst1("this");
  var P_PROTOTYPE = p.abst1("prototype");
  var P_CONSTRUCTOR = p.abst1("constructor");
  var P_LENGTH = p.abst1("length");
  var P_NULL = p.abst1(null);
  var P_NUMBER = p.NUMBER;
  var P_STRING = p.STRING;
  var P_DEFINED = P_NULL.join(P_TRUE).join(P_FALSE).join(P_NUMBER).join(P_STRING);
  
  var P_RETVAL = p.abst1("!retVal!");

  // install global pointers and refs
  var globala = new ContextAddr("this", 0);
  var globalRef = l.abst1(globala); // global this
  var objectPa = new ContextAddr("Object.prototype", 0);
  var objectProtoRef = l.abst1(objectPa);
  var functionPa = new ContextAddr("Function.prototype", 0);
  var functionProtoRef = l.abst1(functionPa);
  var stringPa = new ContextAddr("String.prototype", 0);
  var stringProtoRef = l.abst1(stringPa);
  var arrayPa = new ContextAddr("Array.prototype", 0);
  var arrayProtoRef = l.abst1(arrayPa);
  
  function createEnvironment(parenta)
  {
    var benv = b.createEnvironment(parenta);
    return benv;
  }

  function createObject(Prototype)
  {
    assertDefinedNotNull(Prototype, "[[Prototype]]");
    var benv = b.createObject(Prototype);
    return benv;
  }

  function createArray()
  {
    var benv = b.createArray(arrayProtoRef);
    return benv;
  }

  function createString(prim)
  {
    assertDefinedNotNull(prim, "prim");
    var benv = b.createString(prim, stringProtoRef);
    return benv;
  }

  function createClosure(node, scope)
  {
    var benv = b.createFunction(new BenvClosureCall(node, scope), functionProtoRef);
    return benv;
  }

  function createPrimitive(applyFunction)
  {
    var benv = b.createFunction(new BenvPrimitiveCall(applyFunction), functionProtoRef);
    return benv;
  }
  
  function registerProperty(object, propertyName, value)
  {
    object = object.add(p.abst1(propertyName), value);
    return object;      
  }
  
  // create global object and initial store
  var global = createObject(objectProtoRef);
  var store = new Store();

  function registerPrimitiveFunction(object, objectAddress, propertyName, fun)
  {
    var primFunObject = createPrimitive(fun);
    var primFunObjectAddress = new ContextAddr(objectAddress, "<" + propertyName + ">"); 
    store = store.allocAval(primFunObjectAddress, primFunObject);    
    return registerProperty(object, propertyName, l.abst1(primFunObjectAddress));
  }
  
  // BEGIN OBJECT
  var objectP = createObject(L_NULL);
  objectP.toString = function () { return "<Object.prototype>"; }; // debug
  var objecta = new ContextAddr("<Object>", 0);
  objectP = registerProperty(objectP, "constructor", l.abst1(objecta));
  
  var object = createPrimitive(objectConstructor);
  object = object.add(P_PROTOTYPE, objectProtoRef);//was objectProtoRef
  global = global.add(p.abst1("Object"), l.abst1(objecta));
  
//  object = registerPrimitiveFunction(object, objecta, "getPrototypeOf", objectGetPrototypeOf);
//  object = registerPrimitiveFunction(object, objecta, "create", objectCreate);

  store = store.allocAval(objecta, object);
  store = store.allocAval(objectPa, objectP);
  // END OBJECT

      
  // BEGIN FUNCTION
  var functionP = createObject(objectProtoRef);
  functionP.toString = function () { return "<Function.prototype>"; }; // debug
  var functiona = new ContextAddr("<Function>", 0);
  var functionP = registerProperty(functionP, "constructor", l.abst1(functiona));
  var fun = createPrimitive(function () {}); // TODO
  fun = fun.add(P_PROTOTYPE, functionProtoRef);
  global = global.add(p.abst1("Function"), l.abst1(functiona));
  store = store.allocAval(functiona, fun);

  store = store.allocAval(functionPa, functionP);
  // END FUNCTION 
          
  // BEGIN STRING
  var stringP = createObject(objectProtoRef);
  stringP.toString = function () { return "<String.prototype>"; }; // debug
  var stringa = new ContextAddr("<String>", 0);
  var stringP = registerProperty(stringP, "constructor", l.abst1(stringa));
  var string = createPrimitive(stringConstructor);
  string = string.add(P_PROTOTYPE, stringProtoRef);
  var stringNa = new ContextAddr("String", 0);
  global = global.add(p.abst1("String"), l.abst1(stringa));
  store = store.allocAval(stringa, string);

  store = store.allocAval(stringPa, stringP);
  // END STRING 
          
  // BEGIN ARRAY
//  var arrayP = createObject(objectProtoRef);
//  arrayP.toString = function () { return "<Array.prototype>"; }; // debug
//  var arraya = new ContextAddr("<Array>", 0);
//  var arrayP = registerProperty(arrayP, "constructor", l.abst1(arraya));
//  var array = createPrimitive(arrayConstructor);
//  array = array.add(P_PROTOTYPE, arrayProtoRef);
//  var arrayNa = new ContextAddr("Array", 0);
//  store = store.allocAval(arraya, array);
//  global = global.add(p.abst1("Array"), l.abst1(arraya));
//  
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "concat", arrayConcat);
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "push", arrayPush);
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "map", arrayMap);
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "reduce", arrayReduce); // TODO
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "filter", arrayFilter);
//  store = store.allocAval(arrayPa, arrayP);
  // END ARRAY
  
  // BEGIN MATH
//  var math = createObject(objectProtoRef);
//  math = registerPrimitiveFunction(math, globala, "abs", mathAbs);
//  math = registerPrimitiveFunction(math, globala, "round", mathRound);
//  math = registerPrimitiveFunction(math, globala, "sin", mathCos);
//  math = registerPrimitiveFunction(math, globala, "cos", mathSin);
//  math = registerPrimitiveFunction(math, globala, "sqrt", mathSqrt);
//  math = registerPrimitiveFunction(math, globala, "max", mathMax);
//  math = registerPrimitiveFunction(math, globala, "random", mathRandom);
//  math = registerProperty(math, "PI", l.abst1(Math.PI));
//  var matha = new ContextAddr("<Math>", 0);
//  store = store.allocAval(matha, math);
//  global = global.add(p.abst1("Math"), l.abst1(matha));
  // END MATH
  
  // BEGIN GLOBAL
  global = global.add(P_THIS, globalRef); // global "this" address
  // ECMA 15.1.1 value properties of the global object (no "null", ...)
  global = registerProperty(global, "undefined", L_UNDEFINED);
  global = registerProperty(global, "NaN", l.abst1(NaN));
  global = registerProperty(global, "Infinity", l.abst1(Infinity));

  // specific interpreter functions
//  global = registerPrimitiveFunction(global, globala, "$meta", $meta);
//  global = registerPrimitiveFunction(global, globala, "$join", $join);
//  global = registerPrimitiveFunction(global, globala, "print", _print);
  // end specific interpreter functions
  
  store = store.allocAval(globala, global);
  // END GLOBAL
  
  // BEGIN PRIMITIVES
  function objectConstructor(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var obj = createObject(objectProtoRef);
    store = allocAval(objectAddress, obj, stack, store);
    return kont[0].apply(stack2.addFirst(l.abst1(objectAddress)), store, time);
  }    
  
  function objectCreate(application, operands, objectAddress, stack, benva, store, time)
  {
    if (operands.length !== 1)
    {
      throw new Error("TODO");
    }
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var obj = createObject(operands[0]);
    var address = a.object(application, time);
    store = allocAval(address, obj, stack, store);
    return kont[0].apply(stack2.addFirst(l.abst1(address)), store, time);
  }    
  
  function objectGetPrototypeOf(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var operand = operands[0];
    if (operand.prim === BOT)
    {
      var addresses = operand.addresses();
      var object = addresses.map(store.lookupAval, store).reduce(Lattice.join);
      return kont[0].apply(stack2.addFirst(object.Prototype), store, time);
    }
    throw new Error("TODO");
  }    

  function stringConstructor(application, operands, ths, stack, benva, store, time)
  {
    // TODO (also for other built-in constructors): throwing away freshly created object (that has different addr, so not that bad)!
    // (postpone creating fresh object?)
    if (isNewExpression(application))
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);

      if (operands.length === 0)
      {
        var stringBenv = createString(p.abst1("")); // TODO constant 
        var stringAddress = a.string(application, time);
        stringBenv = stringBenv.add(P_LENGTH, L_0);
        store = allocAval(stringAddress, stringBenv, stack, store);
        return kont[0].apply(stack2.addFirst(l.abst1(stringAddress)), store, time);
      }
      
      var prim = operands[0].user.ToString(); // TODO ToString iso. project
      var stringBenv = createString(prim); 
      var stringAddress = a.array(application, time); // TODO this is not an array(!)
      stringBenv = stringBenv.add(P_LENGTH, new JipdaValue(prim.length(), []));
      store = allocAval(stringAddress, stringBenv, stack, store);
      return kont[0].apply(stack2.addFirst(l.abst1(stringAddress)), store, time);        
    }
    if (operands.length === 0)
    {
      var cont = stack[0];
      var stack2 = stack.slice(1);
      return kont[0].apply(stack2.addFirst(l.abst1("")), store, time); // TODO constant  
    }
    return ToString(application, stack.addFirst(operands[0]), benva, store, time);
  }    
      
  function arrayConstructor(application, operands, ths, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var arrayBenv = createArray();
    var arrayAddress = a.array(application, time);
    var l;
    if (operands.length === 0)
    {
      l = L_0;
    }
    else
    {
      l = operands[0];
    }
    arrayBenv = arrayBenv.add(P_LENGTH, l);
    store = allocAval(arrayAddress, arrayBenv, stack, store);
    return kont[0].apply(stack2.addFirst(l.abst1(arrayAddress)), store, time);
  }    
  
  function arrayPush(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
   
    var arg0aa = operands[0];
                  
    var receiver = lookupAval(objectAddress, stack, store);
    var lreceiver = receiver.lookup(l.U_LENGTH);
    if (lreceiver === BOT)
    {
      // this branch is untested (need apply or call)
//      receiver = receiver.add(P_0.ToString(), newPropertyAddress);
//      store = allocAval(newPropertyAddress, arg0aa, stack, store);
//      var lengthPropertyAddress = a.objectPropery(objectAddress, l.U_LENGTH);
//      receiver = receiver.add(P_LENGTH, lengthPropertyAddress);
//      store = allocAval(lengthPropertyAddress, L_0, stack, store);
//      store = sideEffectAval(objectAddress, receiver, stack, store);
//      return kont[0].apply(stack2.addFirst(arg0aa), store, time);
      throw new Error("TODO");
    }
    else
    {
      var lreceiveru = lreceiver.user;
      receiver = receiver.add(lreceiveru.ToString(), arg0aa);
      var newLengthu = p.add(lreceiveru, l.U_1);
      var newLength = new JipdaValue(newLengthu, []);
      receiver = receiver.add(l.U_LENGTH, newLength);
      store = sideEffectAval(objectAddress, receiver, stack, store);
      return kont[0].apply(stack2.addFirst(newLength), store, time);                                                                                  
    }
  }
  
  function arrayConcat(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
   
    var arg0aa = operands[0];

    var receiver = lookupAval(objectAddress, stack, store);
    var lreceiveru = receiver.lookup(l.U_LENGTH).user;
    var arg0 = doLookupAddresses(arg0aa.addresses(), stack, store);
    var larg0 = arg0.lookup(l.U_LENGTH);
    var larg0u = larg0.user;
    var result = createArray();
    var resulta = a.array(application, time);
    return arrayCopy(receiver, l.U_0, result, l.U_0, lreceiveru, stack, store, c,
      function (result, index, store)
      {
        return arrayCopy(arg0, P_0, result, index, larg0u, stack, store, c, 
          function (result, index, store)
          {
            result = result.add(l.U_LENGTH, new JipdaValue(index, []));
            store = allocAval(resulta, result, stack, store);
            return kont[0].apply(stack2.addFirst(l.abst1(resulta)), store, time);                                                                                  
          });
      });
  } 
  
  function arrayMap(application, operands, thisa, stack, benva, store, time)
  {
    // TODO ToObject(thisa)
    // TODO best way to solve this?
    var receiver = lookupAval(thisa, stack, store);
    var lenValue = receiver.lookup(P_LENGTH);
    
    function arrayMapToUInt32Cont()
    {
      return new Cont("arrayMapToUInt32", application, null, benva,
        function (stack, store, time)
        {
          var lenPrim = stack[0].user;
          var stack2 = stack.slice(1);
          
          var arr = createArray();
          var arrAddr = a.array(application, time);
          store = store.allocAval(arrAddr, arr, stack, store);
          
          
          function arrayMapLoop(k, arr, stack, store, time)
          {
            while (p.isTrue(p.lt(k, lenPrim)))
            {
              var indexValue = receiver.lookup(k.ToString());
              if (indexValue !== BOT && !indexValue.equals(L_UNDEFINED)) // TODO project defined/undefined
              {
                return applyProc(application, [l.abst1(thisa), new JipdaValue(k, []), indexValue, operands[0], operands[1] || GLOBALA, arrayMapCont(k, arr)].concat(stack), benva, store, time, c, 3); // TODO this addresses          
              }
              k = p.add(k, P_1);
            }

            arr = arr.add(P_LENGTH, new JipdaValue(lenPrim, []));
            store = sideEffectAval(arrAddr, arr, stack, store);
            //stack[0] jarr    (GC)
            //stack[1] f       (GC)
            //stack[2] this    (GC)
            var cont = stack[3];
            var stack2 = stack.slice(4);
            return kont[0].apply(stack2.addFirst(jarr), store, time);            
          }
          
          function arrayMapCont(k, arr)
          {
            return new Cont("arrayMap", application, k, benva,
              function (stack, store, time)
              {
                var value = stack[0];
                var stack2 = stack.slice(1);
                arr = arr.add(k.ToString(), value);
                // side-effect now for GC
                store = sideEffectAval(arrAddr, arr, stack, store);
                return arrayMapLoop(p.add(k, P_1), arr, stack2, store, time);
              });
          }
          
          var jarr = l.abst1(arrAddr);
          return arrayMapLoop(P_0, arr, stack2.addFirst(jarr), store, time);            
        });
    }
    
    // add thisAddr and fAddr to rootset 
    var stack2 = stack.addFirst(thisa).addFirst(operands[0]);
    return ToUInt32(lenValue, application, stack2.addFirst(arrayMapToUInt32Cont()), benva, store, time);
  }
  
  function arrayReduce(application, operands, thisa, stack, benva, store, time)
  {
    // TODO ToObject(thisa)
    // TODO best way to solve this?
    var receiver = lookupAval(thisa, stack, store);
    var lenValue = receiver.lookup(P_LENGTH);
    
    function arrayReduceToUInt32Cont()
    {
      return new Cont("arrayReduceToUInt32", application, null, benva,
        function (stack, store, time)
        {
          var lenPrim = stack[0].user;
          var k = P_0;
          if (operands[1])
          {
            return arrayReduceLoop(k, operands[1], stack, store, time);
          }
          else
          {
            if (p.isTrue(p.eqq(lenPrim, P_0)))
            {
              var stack2 = stack.slice(1);
              return performThrow(l.abst1("Type error"), application, stack2, benva, store, time);
            }
            while (p.isTrue(p.lt(k, lenPrim)))
            {
              var indexValue = receiver.lookup(k.ToString());
              if (indexValue !== BOT)
              {
                return arrayReduceLoop(p.add(k, P_1), indexValue, stack, store, time);
              }
              k = p.add(k, P_1);
            }              
          }
          
          function arrayReduceLoop(k, result, stack, store, time)
          {
            while (p.isTrue(p.lt(k, lenPrim)))
            {
              var indexValue = receiver.lookup(k.ToString()); // TODO here, and similar methods, proto lookup?
              if (indexValue !== BOT)
              {
                var stack2 = stack.slice(1);
                return applyProc(application, [l.abst1(thisa), new JipdaValue(k, []), indexValue, result, operands[0], l.abst1(thisa), arrayReduceCont(k)].concat(stack2), benva, store, time, c, 4); // TODO this addresses          
              }
              k = p.add(k, P_1);
            }
            //stack[0] index value
            //stack[1] GC
            //stack[2] GC
            var cont = stack[3];
            var stack2 = stack.slice(4);
            return kont[0].apply(stack2.addFirst(result), store, time);            
          }
          
          function arrayReduceCont(k)
          {
            return new Cont("arrayReduce", application, k, benva,
              function (stack, store, time)
              {
                var result = stack[0];
                return arrayReduceLoop(p.add(k, P_1), result, stack, store, time);
              });
          }
        });
    }
    
    // add receiver, reducer to rootset
    var stack2 = stack.addFirst(thisa).addFirst(operands[0]);
    return ToUInt32(lenValue, application, stack2.addFirst(arrayReduceToUInt32Cont()), benva, store, time);
  }

  function arrayFilter(application, operands, thisa, stack, benva, store, time)
  {
    // TODO ToObject(thisa)
    // TODO best way to solve this?
    var receiver = lookupAval(thisa, stack, store);
    var lenValue = receiver.lookup(P_LENGTH);
    
    function arrayFilterToUInt32Cont() // TODO numAllocedProperties is concrete integer (used as index), k is abstract???
    { // but numAP is also used to slice stuff of stack... make two counters: concrete and abst?
      // Points against: every JS conc value should be abstractable
      return new Cont("arrayFilterToUInt32", application, null, benva,
        function (stack, store, time)
        {
          var lenPrim = stack[0].user;
          var stack2 = stack.slice(1);
          
          var arr = createArray();
          var arrAddr = a.array(application, time);
          var jarr = l.abst1(arrAddr);
          store = allocAval(arrAddr, arr, stack, store);
          
          function arrayFilterLoop(k, numAllocedProperties, arr, stack, store, time)
          {
            while (p.isTrue(p.lt(k, lenPrim)))
            {
              var indexValue = receiver.lookup(k.ToString());
              if (indexValue !== BOT && !indexValue.equals(L_UNDEFINED)) // TODO project defined/undefined
              {
                return applyProc(application, [indexValue, new JipdaValue(k, []), indexValue, operands[0], operands[1] || GLOBALA, arrayFilterCont(k, indexValue, numAllocedProperties, arr)].concat(stack), benva, store, time, c, 3); // TODO this addresses          
              }
              k = p.add(k, l.U_1);
            }
            
            arr = arr.add(P_LENGTH, l.abst1(numAllocedProperties));
            store = sideEffectAval(arrAddr, arr, stack, store);
            //stack[0] jarr    (GC)
            //stack[1] f       (GC)
            //stack[2] this    (GC)
            var cont = stack[3];
            var stack2 = stack.slice(4);
            return kont[0].apply(stack2.addFirst(jarr), store, time);            
          }
          
          function arrayFilterCont(k, indexValue, numAllocedProperties, arr)
          {
            return new Cont("arrayFilter", application, k, benva,
              function (stack, store, time)
              {
                var value = toUserBoolean(stack[0]);
                var stack2 = stack.slice(1);
                if (p.isTrue(value))
                {
                  var propName = p.abst1(String(numAllocedProperties));
                  arr = arr.add(propName, indexValue);
                  // side-effect now for GC
                  store = sideEffectAval(arrAddr, arr, stack, store);
                  return arrayFilterLoop(p.add(k, P_1), numAllocedProperties + 1, arr, stack2, store, time);                    
                }
                if (p.isFalse(value))
                {
                  return arrayFilterLoop(p.add(k, P_1), numAllocedProperties, arr, stack2, store, time);
                }
                return [new Task("Array.prototype.filter true",
                          function ()
                          { // copied
                            var propName = p.abst1(String(numAllocedProperties));
                            arr = arr.add(propName, indexValue);
                            // side-effect now for GC
                            store = sideEffectAval(arrAddr, arr, stack, store);
                            return arrayFilterLoop(p.add(k, P_1), numAllocedProperties + 1, arr, stack2, store, time);                    
                          }),
                        new Task("Array.prototype.filter false",
                          function ()
                          { // copied
                            return arrayFilterLoop(p.add(k, P_1), numAllocedProperties, arr, stack2, store, time);
                          })];
              });
          }
          return arrayFilterLoop(l.U_0, 0, arr, stack2.addFirst(jarr), store, time);            
        });
    }
    
    // add receiver, filter function to rootset
    var stack2 = stack.addFirst(thisa).addFirst(operands[0]);
    return ToUInt32(lenValue, application, stack2.addFirst(arrayFilterToUInt32Cont()), benva, store, time);
  }    
  
  function mathSqrt(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var u = toUserNumber(operands[0], store);
    var r = p.sqrt(u);
    var j = new JipdaValue(r, []);
    return kont[0].apply(stack2.addFirst(j), store, time);
  }
  
  function mathAbs(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var u = toUserNumber(operands[0], store);
    var r = p.abs(u);
    var j = new JipdaValue(r, []);
    return kont[0].apply(stack2.addFirst(j), store, time);
  }
  
  function mathRound(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var u = toUserNumber(operands[0], store);
    var r = p.round(u);
    var j = new JipdaValue(r, []);
    return kont[0].apply(stack2.addFirst(j), store, time);
  }
  
  function mathSin(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var u = toUserNumber(operands[0], store);
    var r = p.sin(u);
    var j = new JipdaValue(r, []);
    return kont[0].apply(stack2.addFirst(j), store, time);
  }
  
  function mathCos(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var u = toUserNumber(operands[0], store);
    var r = p.cos(u);
    var j = new JipdaValue(r, []);
    return kont[0].apply(stack2.addFirst(j), store, time);
  }
  
  function mathMax(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    if (operands.length === 2)
    {
      var u1 = toUserNumber(operands[0], store);
      var u2 = toUserNumber(operands[1], store);
      var r = p.max(u1, u2);
      var j = new JipdaValue(r, []);
      return kont[0].apply(stack2.addFirst(j), store, time);        
    }
    throw new Error("NYI");
  }
  
  // deterministic random from Octane benchmarks 
  var seed = 49734321;
  function mathRandom(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    // Robert Jenkins' 32 bit integer hash function.
    seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
    seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
    seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
    seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
    seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
    seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
    var r = p.abst1((seed & 0xfffffff) / 0x10000000);
    var j = new JipdaValue(r, []);
    return kont[0].apply(stack2.addFirst(j), store, time);
  }
  
  function $meta(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var str = operands[0].conc()[0];
    var value = l.abst1(eval(str));
    return kont[0].apply(stack2.addFirst(value), store, time);
  }
  
  function $join(application, operands, thisa, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var value = operands.reduce(Lattice.join, BOT);
    return kont[0].apply(stack2.addFirst(value), store, time);
  }    
  
  function $toString(application, operands, thisa, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    var value = operands.reduce(Lattice.join, BOT);
    return kont[0].apply(stack2.addFirst(value), store, time);
  }    
  
  function _print(application, operands, objectAddress, stack, benva, store, time)
  {
    var cont = stack[0];
    var stack2 = stack.slice(1);
    print.apply(null, operands);
    return kont[0].apply(stack2.addFirst(L_UNDEFINED), store, time);
  }    
  // END PRIMITIVES
  
  // BEGIN HELPERS
  function arrayCopy(srcBenv, srcPos, dstBenv, dstPos, l, stack, store, c, fcont)
  {
    var i = l.U_0;
    while (p.isTrue(p.lt(i, l)))
    {
      var srcvalue = srcBenv.lookup(p.add(i, srcPos).ToString());
      var dstName = p.add(i, dstPos).ToString();
      dstBenv = dstBenv.add(dstName, srcvalue);
      i = p.add(i, l.U_1);
    }
    return fcont(dstBenv, p.add(i, dstPos), store);
  }
  // END HELPERS
  
  function BenvPrimitiveCall(applyFunction)
  {
    this.applyFunction = applyFunction;
  }

  BenvPrimitiveCall.prototype.toString =
    function ()
    {
      return "<BenvPrimitiveCall>";
    }
  
  BenvPrimitiveCall.prototype.equals =
    function (other)
    {
      if (this === other)
      {
        return true;
      }
      if (!(this instanceof BenvPrimitiveCall))
      {
        return false;
      }
      return this.applyFunction === other.applyFunction; // this case needed? (finite number of fixed prims)
    }
  
  BenvPrimitiveCall.prototype.addresses =
    function ()
    {
      return [];
    } 
  
  function BenvClosureCall(node, scope)
  {
    this.node = node;
    this.scope = scope;
  }

  BenvClosureCall.prototype.toString =
    function ()
    {
      return "(" + this.node.tag + " " + this.scope + ")";
    }
  BenvClosureCall.prototype.nice =
    function ()
    {
      return "<BenvClosureCall " + this.node.tag + ">"
    }

  BenvClosureCall.prototype.equals =
    function (other)
    {
      if (this === other)
      {
        return true;
      }
      if (!(this instanceof BenvClosureCall))
      {
        return false;
      }
      return this.node === other.node
        && this.scope.equals(other.scope);
    }
  BenvClosureCall.prototype.hashCode =
    function (x)
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.scope.hashCode();
      return result;      
    }


  BenvClosureCall.prototype.applyFunction =
    function (application, operandValues, thisa, benva, store, kont)
    {
//      print("BenvClosureCall.applyFunction", application, "operandValues", operandValues, "ths", ths);
      var fun = this.node;
      var statica = this.scope;
      return applyClosure(application, fun, statica, operandValues, thisa, benva, store, kont);
    }

  BenvClosureCall.prototype.addresses =
    function ()
    {
      return [this.scope];
    }
  


  function EvalState(node, benva, store)
  {
    this.type = "eval";
    this.node = node;
    this.benva = benva;
    this.store = store;
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
      return this.type === x.type
        && this.node === x.node 
        && Eq.equals(this.benva, x.benva)
        && Eq.equals(this.store, x.store);
    }
  EvalState.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
      return result;
    }
  EvalState.prototype.next =
    function (kont)
    {
      return evalNode(this.node, this.benva, this.store, kont);
    }
  EvalState.prototype.addresses =
    function ()
    {
      return [this.benva];
    }
  EvalState.prototype.setStore =
    function (store)
    {
      return new EvalState(this.node, this.benva, store);
    }
  
  function KontState(frame, value, store)
  {
    this.type = "kont";  
    this.frame = frame;
    this.value = value;
    this.store = store;
  }
  KontState.prototype.equals =
    function (x)
    {
      return this.type === x.type
        && Eq.equals(this.frame, x.frame) 
        && Eq.equals(this.value, x.value) 
        && Eq.equals(this.store, x.store);
    }
  KontState.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.frame.hashCode();
      result = prime * result + this.value.hashCode();
      return result;
    }
  KontState.prototype.toString =
    function ()
    {
      return "#kont-" + this.frame;
    }
  KontState.prototype.nice =
    function ()
    {
      return "#kont-" + this.frame.toString();
    }
  KontState.prototype.next =
    function (kont)
    {
      return applyKont(this.frame, this.value, this.store, kont)
    }
  KontState.prototype.addresses =
    function ()
    {
      return this.frame.addresses().concat(this.value.addresses());
    }
  KontState.prototype.setStore =
    function (store)
    {
      return new KontState(this.frame, this.value, store);
    }
  
  
  function CallState(node, callable, operandValues, thisa, benva, store)
  {
    this.type = "call";
    this.node = node;
    this.callable = callable;
    this.operandValues = operandValues;
    this.thisa = thisa;
    this.benva = benva;
    this.store = store;
  }
  CallState.prototype.equals =
    function (x)
    {
      return this.type === x.type
        && this.node === x.node
        && Eq.equals(this.callable, x.callable)
        && Eq.equals(this.operandValues, x.operandValues)
        && Eq.equals(this.thisa, x.thisa)
        && Eq.equals(this.benva, x.benva)
        && Eq.equals(this.store, x.store)
    }
  CallState.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.callable.hashCode();
      result = prime * result + this.operandValues.hashCode();
      result = prime * result + this.thisa.hashCode();
      result = prime * result + this.benva.hashCode();
      return result;
    }
  CallState.prototype.toString =
    function ()
    {
      return "#call " + this.node.tag;
    }
  CallState.prototype.nice =
    function ()
    {
      return "#call " + this.node.tag;
    }
  CallState.prototype.next =
    function (kont)
    {
      return this.callable.applyFunction(this.node, this.operandValues, this.thisa, this.benva, this.store, kont);
    }
  CallState.prototype.addresses =
    function ()
    {
      return [this.benva, this.thisa]
              .concat(this.callable.addresses())
              .concat(this.operandValues.flatMap(function (operandValue) {return operandValue.addresses()}));
    }
  CallState.prototype.setStore =
    function (store)
    {
      return new CallState(this.node, this.callable, this.operandValues, this.thisa, this.benva, this.store);
    }
  
  function ReturnState(node, returna, store, frame)
  {
    this.type = "return";
    this.node = node;
    this.returna = returna;
    this.store = store;
    this.frame = frame;
  }
  
  ReturnState.returnMarker = {isMarker:true};
  ReturnState.returnMarker.equals = function (x) {return x === ReturnState.returnMarker};
  ReturnState.returnMarker.hashCode = function () {return 5};
  ReturnState.returnMarker.addresses = function () {return []};
  ReturnState.returnMarker.apply = function () {throw new Error("cannot apply returnMarker")};
  ReturnState.returnMarker.toString = function () {return "ret"};
  ReturnState.returnMarker.nice = function () {return "ret"};
  
  ReturnState.prototype.equals =
    function (x)
    {
      return this.type === x.type 
        && this.node === x.node 
        && Eq.equals(this.returna, x.returna) 
        && Eq.equals(this.store, x.store) 
        && Eq.equals(this.frame, x.frame); 
    }
  ReturnState.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.returna.hashCode();
      result = prime * result + this.frame.hashCode();
      return result;
    }
  ReturnState.prototype.toString =
    function ()
    {
      return "#return-" + this.node.tag;
    }
  ReturnState.prototype.nice =
    function ()
    {
      return "#return-" + this.node.tag;
    }
  ReturnState.prototype.next =
    function (kont)
    {
      return scanReturn(this.node, this.returna, this.store, this.frame, kont);
    }
  ReturnState.prototype.addresses =
    function ()
    {
      return [this.returna]
              .concat(this.frame.addresses());
    }
  ReturnState.prototype.setStore =
    function (store)
    {
      return new ReturnState(this.node, this.returna, this.store, this.frame);
    }
  
  function StatementListKont(node, i, benva, lastValue)
  {
    this.node = node;
    this.i = i;
    this.benva = benva;
    this.lastValue = lastValue;
  }
  StatementListKont.prototype.equals =
    function (x)
    {
      return x instanceof StatementListKont
        && this.node === x.node
        && this.i === x.i
        && Eq.equals(this.benva, x.benva)
        && Eq.equals(this.lastValue, x.lastValue);
    }
  StatementListKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.i;
      result = prime * result + this.benva.hashCode();
      result = prime * result + this.lastValue.hashCode();
      return result;
    }
  StatementListKont.prototype.toString =
    function ()
    {
      return "slist-" + this.node.tag + "-" + this.i;
    }
  StatementListKont.prototype.nice =
    function ()
    {
      return "slist-" + this.node.tag + "-" + this.i;
    }
  StatementListKont.prototype.addresses =
    function ()
    {
      return this.lastValue.addresses().addLast(this.benva);
    }
  StatementListKont.prototype.apply =
    function (value, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var i = this.i;
      var lastValue = this.lastValue;
      
      // keep track of last value-producing statement (ECMA 12.1 Block, 14 Program)
      var newLastValue;
      var undefProj = value.meet(L_UNDEFINED);
      if (undefProj === BOT) // no undefined in value
      {
        newLastValue = value;
      }
      else if (value.equals(undefProj)) // value is undefined
      {
        newLastValue = lastValue;
      }
      else // value > undefined
      {
        newLastValue = l.product(value.prim.meet(P_DEFINED), value.as).join(lastValue); 
      }
      
      var nodes = node.body;
      if (i === nodes.length)
      {
        return kont.pop(function (frame) {return new KontState(frame, newLastValue, store)});
      }
      var frame = new StatementListKont(node, i + 1, benva, newLastValue);
      return kont.push(frame, new EvalState(nodes[i], benva, store));
    }
  
  function VariableDeclarationKont(node, i, benva)
  {
    this.node = node;
    this.i = i;
    this.benva = benva;
  }
  VariableDeclarationKont.prototype.equals =
    function (x)
    {
      return x instanceof VariableDeclarationKont
        && this.node === x.node
        && this.i === x.i
        && Eq.equals(this.benva, x.benva);
    }
  VariableDeclarationKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.i;
      result = prime * result + this.benva.hashCode();
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
      return [this.benva];
    }
  VariableDeclarationKont.prototype.apply =
    function (value, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var i = this.i;
      
      var nodes = node.declarations;
      if (i === nodes.length)
      {
        return kont.pop(function (frame) {return new KontState(frame, value, store)});
      }
      var frame = new VariableDeclarationKont(node, i + 1, benva);
      return kont.push(frame, new EvalState(nodes[i], benva, store));
    }
  
  function VariableDeclaratorKont(node, benva)
  {
    this.node = node;
    this.benva = benva;
  }
  VariableDeclaratorKont.prototype.equals =
    function (x)
    {
      return x instanceof VariableDeclaratorKont
        && this.node === x.node
        && Eq.equals(this.benva, x.benva);
    }
  VariableDeclaratorKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
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
      return [this.benva];
    }
  VariableDeclaratorKont.prototype.apply =
    function (value, store, kont)
    {
      var id = this.node.id;
      var benva = this.benva;
      var benv = store.lookupAval(benva);
      benv = benv.add(p.abst1(id.name), value);
      store = store.updateAval(benva, benv); // side-effect
      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
    }
  
  function LeftKont(node, benva)
  {
    this.node = node;
    this.benva = benva;
  }
  LeftKont.prototype.equals =
    function (x)
    {
      return x instanceof LeftKont
        && this.node === x.node
        && Eq.equals(this.benva, x.benva);
    }
  LeftKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
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
      return [this.benva];
    }
  LeftKont.prototype.apply =
    function (leftValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var frame = new RightKont(node, benva, leftValue);
      return kont.push(frame, new EvalState(node.right, benva, store));
    }
  
  function RightKont(node, benva, leftValue)
  {
    this.node = node;
    this.benva = benva;
    this.leftValue = leftValue;
  }
  RightKont.prototype.equals =
    function (x)
    {
      return x instanceof RightKont
        && this.node === x.node
        && Eq.equals(this.benva, x.benva)
        && Eq.equals(this.leftValue, x.leftValue);
    }
  RightKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
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
      return this.leftValue.addresses().addLast(this.benva);
    }
  RightKont.prototype.apply =
    function (rightValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var leftValue = this.leftValue;
      var leftPrim = leftValue.prim;
      var rightPrim = rightValue.prim;
      var leftAs = leftValue.addresses();
      var rightAs = rightValue.addresses();
      if (leftAs.length === 0 && rightAs.length === 0)
      {
        // fast path: primitives (no need for coercions on interpreter level)
        return applyBinaryExpressionPrim(node, leftPrim, rightPrim, benva, store, kont);
      }
      throw new Error("TODO");
    }
  
  function AssignIdentifierKont(node, benva)
  {
    this.node = node;
    this.benva = benva;
  }
  AssignIdentifierKont.prototype.equals =
    function (x)
    {
      return x instanceof AssignIdentifierKont
        && this.node === x.node 
        && Eq.equals(this.benva, x.benva);
    }
  AssignIdentifierKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
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
      return [this.benva];
    }
  AssignIdentifierKont.prototype.apply =
    function (value, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var id = node.left;
      store = doScopeSet(p.abst1(id.name), value, benva, store);
      return kont.pop(function (frame) {return new KontState(frame, value, store)});
    }
  
  function OperatorKont(node, benva)
  {
    this.node = node;
    this.benva = benva;
  }
  OperatorKont.prototype.equals =
    function (x)
    {
      return x instanceof OperatorKont
        && this.node === x.node
        && Eq.equals(this.benva, x.benva);
    }
  OperatorKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
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
      return [this.benva];
    }
  OperatorKont.prototype.apply =
    function (operatorValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var operands = node.arguments;
  
      if (operands.length === 0)
      {
        return applyProc(node, operatorValue, [], globalRef, benva, store, kont);
      }
      var frame = new OperandsKont(node, 1, benva, operatorValue, [], globalRef);
      return kont.push(frame, new EvalState(operands[0], benva, store));
    }
  
  function OperandsKont(node, i, benva, operatorValue, operandValues, thisValue)
  {
    this.node = node;
    this.i = i;
    this.benva = benva;
    this.operatorValue = operatorValue; 
    this.operandValues = operandValues; 
    this.thisValue = thisValue;
  }
  OperandsKont.prototype.equals =
    function (x)
    {
      return x instanceof OperandsKont
        && this.node === x.node 
        && this.i === x.i 
        && Eq.equals(this.benva, x.benva) 
        && Eq.equals(this.operatorValue, x.operatorValue) 
        && Eq.equals(this.operandValues, x.operandValues) 
        && Eq.equals(this.thisValue, x.thisValue);
    }
  OperandsKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.i;
      result = prime * result + this.benva.hashCode();
      result = prime * result + this.operatorValue.hashCode();
      result = prime * result + this.operandValues.hashCode();
      result = prime * result + this.thisValue.hashCode();
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
      return this.operatorValue.addresses()
        .concat(this.operandValues.flatMap(function (value) {return value.addresses()}))
        .concat(this.thisValue.addresses())
        .addLast(this.benva);
    }
  OperandsKont.prototype.apply =
    function (operandValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var i = this.i;
      var operatorValue = this.operatorValue;
      var operandValues = this.operandValues;
      var thisValue = this.thisValue;
      var operands = node.arguments;
  
      if (i === operands.length)
      {
        return applyProc(node, operatorValue, operandValues.addLast(operandValue), thisValue, benva, store, kont);
      }
      var frame = new OperandsKont(node, i + 1, benva, operatorValue, operandValues.addLast(operandValue), thisValue);
      return kont.push(frame, new EvalState(operands[i], benva, store));
    }
  
  function BodyKont(node, i, benva)
  {
    this.node = node;
    this.i = i;
    this.benva = benva;
  }
  BodyKont.prototype.equals =
    function (x)
    {
      return x instanceof BodyKont
        && this.node === x.node
        && this.i === x.i
        && Eq.equals(this.benva, x.benva);
    }
  BodyKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.i;
      result = prime * result + this.benva.hashCode();
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
      return [this.benva];
    }
  BodyKont.prototype.apply =
    function (ignoredValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var i = this.i;
      
      var nodes = node.body;
      if (i === nodes.length)
      {
        return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
      }
      var frame = new BodyKont(node, i + 1, benva);
      return kont.push(frame, new EvalState(nodes[i], benva, store));
    }
  
  function ReturnKont(node, benva)
  {
    this.node = node;
    this.benva = benva;
  }
  ReturnKont.prototype.equals =
    function (x)
    {
      return x instanceof ReturnKont
        && this.node === x.node 
        && Eq.equals(this.benva, x.benva);
    }
  ReturnKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
      return result;
    }
  ReturnKont.prototype.toString =
    function ()
    {
      return "ret-" + this.node.tag + "::" + this.addresses();
    }
  ReturnKont.prototype.nice =
    function ()
    {
      return "ret-" + this.node.tag;
    }
  ReturnKont.prototype.addresses =
    function ()
    {
      return [this.benva];
    }
  ReturnKont.prototype.apply =
    function (returnValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;
      var benv = store.lookupAval(benva);
      benv = benv.add(P_RETVAL, returnValue);
      store = store.updateAval(benva, benv);
      return kont.pop(function (frame) {return new ReturnState(node, benva, store, frame)});
    }
  
  function IfKont(node, benva)
  {
    this.node = node;
    this.benva = benva;
  }
  IfKont.prototype.equals =
    function (x)
    {
      return x instanceof IfKont
        && this.node === x.node 
        && Eq.equals(this.benva, x.benva);
    }
  IfKont.prototype.hashCode =
    function ()
    {
      var prime = 7;
      var result = 1;
      result = prime * result + this.node.hashCode();
      result = prime * result + this.benva.hashCode();
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
      return [this.benva];
    }
  IfKont.prototype.apply =
    function (conditionValue, store, kont)
    {
      var node = this.node;
      var benva = this.benva;    
      var consequent = node.consequent;
      var alternate = node.alternate;
      // TODO ToBoolean
      var falseProj = conditionValue.meet(L_FALSE);
      if (falseProj === BOT) // no false in value
      {
  //      return [new EvalState(consequent, benva, store, kont)];
        return evalNode(consequent, benva, store, kont);
      }
      else if (conditionValue.equals(falseProj)) // value is false
      {
        if (alternate === null)
        {
          return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
        }
  //      return [new EvalState(alternate, benva, store, kont)];
        return evalNode(alternate, benva, store, kont);
      }
      else // value > false
      {
        var consequentState = kont.unch(new EvalState(consequent, benva, store));
        var alternateState;
        if (alternate === null)
        {
          alternateState = kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
        }
        else
        {
          alternateState = kont.unch(new EvalState(alternate, benva, store));
        }
        return consequentState.concat(alternateState);
      }
    }
  
  function doScopeLookup(name, benva, store)
  {
    var result = BOT;
    var benvas = [benva];
    while (benvas.length !== 0)
    {
      var a = benvas[0];
      benvas = benvas.slice(1);
      var benv = store.lookupAval(a);
      var value = benv.lookup(name);
      if (value !== BOT)
      {
        result = result.join(value);
      }
      else
      {
        benvas = benvas.concat(benv.parents);
      }
    }
    // approximation: if some chains have the var, then we assume ok
    // in theory we should check each chain separately, join the found results, and if necessary
    // create an error branch if one of the chains doesn't find the var
    if (result === BOT)
    {
      throw new Error("ReferenceError: " + name + " is not defined"); //TODO turn this into stack trace      
    }
    return result;
  }

  function doScopeSet(name, value, benva, store)
  {
    var benvas = [benva];
    var setTopLevel = false;
    while (benvas.length !== 0)
    {
      var a = benvas[0];
      benvas = benvas.slice(1);
      var benv = store.lookupAval(a);
      var existing = benv.lookup(name);
      if (existing !== BOT)
      {
        benv = benv.add(name, value);
        store = store.updateAval(a, benv); // side-effect
      }
      else
      {
        var parents = benv.parents;
        if (parents.length === 0)
        {
          setTopLevel = true;
        }
        else
        {
          benvas = benvas.concat(benv.parents);
        }
      }
    }
    if (setTopLevel)
    {
      var benv = store.lookupAval(globala);      
      benv = benv.add(name, value);
      store = store.updateAval(globala, benv); // side-effect
    }
    return store;
  }

  function doHoisting(node, benva, store, kont)
  {
    var hoisted = node.hoisted;
    if (!hoisted)
    {
      var scopeInfo = Ast.scopeInfo(node);
      hoisted = Ast.hoist(scopeInfo);
      node.hoisted = hoisted;
    }
    if (hoisted.funs.length > 0 || hoisted.vars.length > 0)
    {
      var benv = store.lookupAval(benva);      
      hoisted.funs.forEach(
        function (funDecl)
        {
          var node = funDecl.node;
          var allocateResult = allocateClosure(node, benva, store, kont);
          var closureRef = allocateResult.ref;
          store = allocateResult.store;
          var vr = node.id;
          benv = benv.add(p.abst1(vr.name), closureRef);
        });
      hoisted.vars.forEach(
        function (varDecl)
        {
          var vr = varDecl.node.id;    
          benv = benv.add(p.abst1(vr.name), L_UNDEFINED);
        });
      store = store.updateAval(benva, benv); // side-effect
    }
    return store;
  }

  function evalEmptyStatement(node, benva, store, kont)
  {
    return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
  }

  function evalLiteral(node, benva, store, kont)
  {
    var value = l.abst1(node.value);
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
  }

  function evalIdentifier(node, benva, store, kont)
  {
    var value = doScopeLookup(p.abst1(node.name), benva, store);
    return kont.pop(function (frame) {return new KontState(frame, value, store)});
  }

  function evalProgram(node, benva, store, kont)
  {
    store = doHoisting(node, benva, store, kont);    
    return evalStatementList(node, benva, store, kont);
  }

  function evalStatementList(node, benva, store, kont)
  {
    var nodes = node.body;
    if (nodes.length === 0)
    {
      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
    }
    if (nodes.length === 1)
    {
      return kont.unch(new EvalState(nodes[0], benva, store));
//      return evalNode(nodes[0], benva, store, kont);
    }
    var frame = new StatementListKont(node, 1, benva, L_UNDEFINED);
    return kont.push(frame, new EvalState(nodes[0], benva, store));
  }

  function evalVariableDeclaration(node, benva, store, kont)
  {
    var nodes = node.declarations;
    if (nodes.length === 0)
    {
      throw new Error("no declarations in " + node);
    }
    if (nodes.length === 1)
    {
      return evalVariableDeclarator(nodes[0], benva, store, kont);
    }
    var frame = new VariableDeclarationKont(node, 1, benva);
    return kont.push(frame, new EvalState(nodes[0], benva, store));
  }

  function evalVariableDeclarator(node, benva, store, kont)
  { 
    var init = node.init;
      
    if (init === null)
    {
      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});      
    }
    var frame = new VariableDeclaratorKont(node, benva);
    return kont.push(frame, new EvalState(init, benva, store));
  }

  function evalBinaryExpression(node, benva, store, kont)
  {
    var frame = new LeftKont(node, benva);
    return kont.push(frame, new EvalState(node.left, benva, store));
  }

  function applyBinaryExpressionPrim(node, leftPrim, rightPrim, benva, store, kont)
  {
    var operator = node.operator;
    var prim;
    switch (node.operator)
    {
      case "+":
      {
        prim = p.add(leftPrim, rightPrim);
        break;
      }
      case "*":
      {
        prim = p.mul(leftPrim, rightPrim);
        break;
      }
      case "-":
      {
        prim = p.sub(leftPrim, rightPrim);
        break;
      }
      case "/":
      {
        prim = p.div(leftPrim, rightPrim);
        break;
      }
      case "%":
      {
        prim = p.rem(leftPrim, rightPrim);
        break;
      }
      case "===":
      {
        prim = p.eqq(leftPrim, rightPrim);
        break;
      }
      case "!==":
      {
        prim = p.neqq(leftPrim, rightPrim);
        break;
      }
      case "==":
      {
        prim = p.eq(leftPrim, rightPrim);
        break;
      }
      case "!=":
      {
        prim = p.neq(leftPrim, rightPrim);
        break;
      }
      case "<":
      {
        prim = p.lt(leftPrim, rightPrim);
        break;
      }
      case "<=":
      {
        prim = p.lte(leftPrim, rightPrim);
        break;
      }
      case ">":
      {
        prim = p.gt(leftPrim, rightPrim);
        break;
      }
      case ">=":
      {
        prim = p.gte(leftPrim, rightPrim);
        break;
      }
      case "&":
      {
        prim = p.binand(leftPrim, rightPrim);
        break;
      }
      case "|":
      {
        prim = p.binor(leftPrim, rightPrim);
        break;
      }
      case "<<":
      {
        prim = p.shl(leftPrim, rightPrim);
        break;
      }
      default: throw new Error("cannot handle binary operator " + node.operator);
    }
    return kont.pop(function (frame) {return new KontState(frame, l.product(prim, []), store)});
  }

  function evalAssignmentExpression(node, benva, store, kont)
  { 
    var left = node.left;
    
    switch (left.type)
    {
      case "Identifier":
      {
        return evalAssignmentExpressionIdentifier(node, benva, store, kont);
      }
      case "MemberExpression":
      {
        return evalAssignmentExpressionMember(node, benva, store, kont);        
//        return evalBaseExpression(left, stack.addFirst(rightCont()), benva, store, time);
      }
      default:
        throw new Error("evalAssignment: cannot handle left hand side " + left); 
    }
  }

  function evalAssignmentExpressionIdentifier(node, benva, store, kont)
  { 
    var right = node.right;
    var frame = new AssignIdentifierKont(node, benva);
    return kont.push(frame, new EvalState(right, benva, store));
  }

//  function memberAssignmentCont()
//  {
//    return new Cont("=mem", right, null, benva,
//      function (stack, store, time)
//      {
//        var rvalues = stack[0];
//        var propertyName = stack[1];
//        var spn = toUserString(propertyName, store);
//        var uspn;
//        var length;
//        if (uspn = l.userLattice.isStringArrayIndex(spn)) // TODO wrong! 'is...Index' should return abstract boolean
//        {
//          length = l.userLattice.add(uspn, l.U_1);
//        }
//        var objectAddresses = stack[2].addresses();
//        var cont = stack[3];
//        var stack2 = stack.slice(4);
//        //print("rvalues", rvalues, "objectAddresses", objectAddresses, "propertyName", spn);
//        if (!objectAddresses)
//        {
//          throw new Error("cannot determine object addresses for lhs in " + node);
//        }
//        objectAddresses.forEach(
//          function (objectAddress)
//          {
//            var object = lookupAval(objectAddress, stack, store);
//            assertDefinedNotNull(object.lookup);
//            object = object.add(spn, rvalues);
//            if (length && object.isArray())
//            {
//              var lengthValue = object.lookup(l.U_LENGTH).value; // direct (local) lookup without protochain
//              if (l.userLattice.isTrue(l.userLattice.lt(lengthValue.user, length)))
//              {
//                object = object.add(l.U_LENGTH, new JipdaValue(length, []));
//              }
//            }
//            store = sideEffectAval(objectAddress, object, stack, store);
//          });
//        return cont.execute(stack2.addFirst(rvalues), store, time);
//      });
//  }

  function allocateClosure(node, benva, store, kont)
  {
    var closure = createClosure(node, benva);
    var closurea = a.closure(node, benva, store, kont);
  
    var prototype = createObject(objectProtoRef);
    var prototypea = a.closureProtoObject(node, benva, store, kont);
    var closureRef = l.abst1(closurea);
    prototype = prototype.add(P_CONSTRUCTOR, closureRef);
    store = store.allocAval(prototypea, prototype);
  
    closure = closure.add(P_PROTOTYPE, l.abst1(prototypea));
    store = store.allocAval(closurea, closure);
    return {store: store, ref: closureRef}
  }

  function evalFunctionExpression(node, benva, store, kont)
  {
    var allocateResult = allocateClosure(node, benva, store, kont);
    var closureRef = allocateResult.ref;
    store = allocateResult.store;
    return kont.pop(function (frame) {return new KontState(frame, closureRef, store)});
  }

  function evalFunctionDeclaration(node, benva, store, kont)
  {
    // hoisted!
    return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
  }

  function evalCallExpression(node, benva, store, kont)
  {
    var calleeNode = node.callee;
      
    if (Ast.isMemberExpression(calleeNode))
    { // TODO
      var cont = new Cont("meth", node, null, benva, methodOperatorCont);
      return evalNode(calleeNode.object, stack.addFirst(cont), benva, store, time);
    }
    
    var frame = new OperatorKont(node, benva);
    return kont.push(frame, new EvalState(calleeNode, benva, store));      
  }

  function applyProc(node, operatorValue, operandValues, thisValue, benva, store, kont)
  {
    // TODO 'thisValue' handling/type coercions?
    
    var operatorPrim = operatorValue.prim;
    if (operatorPrim === BOT)
    {
      // fast path: no type coercions needed
      var thisAs = thisValue.addresses();
      var operatorAs = operatorValue.addresses();
      return thisAs.flatMap(
        function (thisa)
        {
          return operatorAs.flatMap(
            function (operatora)
            {
              var benv = store.lookupAval(operatora);
              var callables = benv.Call;
              return callables.flatMap(
                function (callable)
                {
                  return kont.push(ReturnState.returnMarker, new CallState(node, callable, operandValues, thisa, benva, store));
                })
            })
        })
    }
  }


  function applyClosure(applicationNode, funNode, statica, operandValues, thisa, benva, store, kont)
  {
    var bodyNode = funNode.body;
    var nodes = bodyNode.body;
    if (nodes.length === 0)
    {
      return kont.pop(function (frame) {return new KontState(frame, L_UNDEFINED, store)});
    }
    
    var formalParameters = funNode.params;
  
    var extendedBenv = createEnvironment(statica);    
    extendedBenv = extendedBenv.add(P_THIS, l.abst1(thisa));
    for (var i = 0; i < formalParameters.length; i++)
    {
      var param = formalParameters[i];
      extendedBenv = extendedBenv.add(p.abst1(param.name), operandValues[i]);
    }    
    var extendedBenva = a.benv(applicationNode, benva, store, kont);
    
    store = doHoisting(funNode, benva, store, kont);
    store = store.allocAval(extendedBenva, extendedBenv);
    
    // ECMA 13.2.1(6): [[Code]] cannot be evaluated as StatementList
    var frame = new BodyKont(bodyNode, 1, extendedBenva);
    return kont.push(frame, new EvalState(nodes[0], extendedBenva, store));
  }

  function evalReturnStatement(node, benva, store, kont)
  {
    var argumentNode = node.argument;
    if (argumentNode === null)
    {
      var benv = store.lookupAval(benva);
      benv = benv.add(P_RETVAL, returnValue);
      store = store.updateAval(benva, benv);
      return kont.pop(function (frame) {return new ReturnState(node, benva, store, frame)});
    }
    
    var frame = new ReturnKont(node, benva);
    return kont.push(frame, new EvalState(argumentNode, benva, store));
  }

  function scanReturn(node, returna, store, frame, kont)
  {
    if (frame === ReturnState.returnMarker)
    {
      var benv = store.lookupAval(returna);
      var returnValue = benv.lookup(P_RETVAL);
      return kont.pop(function (frame) {return new KontState(frame, returnValue, store)});
    }
    return kont.pop(function (frame) {return new ReturnState(node, returna, store, frame)});
  }
  
  function applyKont(frame, value, store, kont)
  {
    if (frame.isMarker)
    {
      return kont.pop(function (frame) {return new KontState(frame, value, store)});
    }
    return frame.apply(value, store, kont);
  }

  function evalIfStatement(node, benva, store, kont)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benva);
    return kont.push(frame, new EvalState(testNode, benva, store));
  }

  function evalConditionalExpression(node, benva, store, kont)
  {
    var testNode = node.test;
    var frame = new IfKont(node, benva);
    return kont.push(frame, new EvalState(testNode, benva, store));
  }

  function evalNode(node, benva, store, kont)
  {
    switch (node.type)
    {
      case "Literal": 
        return evalLiteral(node, benva, store, kont);
      case "Identifier":
        return evalIdentifier(node, benva, store, kont);
      case "BinaryExpression":
        return evalBinaryExpression(node, benva, store, kont);
      case "LogicalExpression":
        return evalLogicalExpression(node, benva, store, kont);
      case "CallExpression":
        return evalCallExpression(node, benva, store, kont);
      case "FunctionExpression":
        return evalFunctionExpression(node, benva, store, kont);
      case "AssignmentExpression":
        return evalAssignmentExpression(node, benva, store, kont);
      case "ArrayExpression":
        return evalArrayExpression(node, benva, store, kont);
      case "MemberExpression":
        return evalMemberExpression(node, benva, store, kont);
      case "ObjectExpression":
        return evalObjectExpression(node, benva, store, kont);
      case "ThisExpression":
        return evalThisExpression(node, benva, store, kont);
      case "NewExpression":
        return evalNewExpression(node, benva, store, kont);
      case "UpdateExpression":
        return evalUpdateExpression(node, benva, store, kont);
      case "UnaryExpression":
        return evalUnaryExpression(node, benva, store, kont);
      case "ExpressionStatement":
        return evalNode(node.expression, benva, store, kont);
      case "ReturnStatement": 
        return evalReturnStatement(node, benva, store, kont);
      case "BreakStatement": 
        return evalBreakStatement(node, benva, store, kont);
      case "LabeledStatement": 
        return evalLabeledStatement(node, benva, store, kont);
      case "IfStatement": 
        return evalIfStatement(node, benva, store, kont);
      case "ConditionalExpression": 
        return evalConditionalExpression(node, benva, store, kont);
      case "SwitchStatement": 
        return evalSwitchStatement(node, benva, store, kont);
      case "ForStatement": 
        return evalForStatement(node, benva, store, kont);
      case "WhileStatement": 
        return evalWhileStatement(node, benva, store, kont);
      case "FunctionDeclaration": 
        return evalFunctionDeclaration(node, benva, store, kont);
      case "VariableDeclaration": 
        return evalVariableDeclaration(node, benva, store, kont);
      case "VariableDeclarator": 
        return evalVariableDeclarator(node, benva, store, kont);
      case "BlockStatement":
        return evalStatementList(node, benva, store, kont);
      case "EmptyStatement":
        return evalEmptyStatement(node, benva, store, kont);
      case "TryStatement": 
        return evalTryStatement(node, benva, store, kont);
      case "ThrowStatement": 
        return evalThrowStatement(node, benva, store, kont);
      case "Program":
        return evalProgram(node, benva, store, kont);
      default:
        throw new "cannot handle node " + node.type; 
    }
  }
    
  var module = {};
  module.evalState =
    function (node, benva, store)
    {
      return new EvalState(node, benva, store);
    }
  module.p = p;
  module.l = l;
  module.store = store;
  module.globala = globala;
  return module; 
}

