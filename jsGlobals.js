// function EnvBuilder(machine, store)
// {
//   this.machine = machine;
//   this.store = store;
//   this.global = store.lookupAval(machine.globala);
// }
//
// EnvBuilder.prototype.registerPrimitiveFuntion =
//     function (object, objectAddress, propertyName, applyFunction, applyConstructor)
//     {
//       const primFunObject = this.machine.createPrimitive(applyFunction, applyConstructor);
//       const primFunObjectAddress = this.machine.allocNative();
//       this.store = storeAlloc(store, primFunObjectAddress, primFunObject);
//       return registerProperty(object, propertyName, l.abstRef(primFunObjectAddress));
//     }
//
// EnvBuilder.prototype.commit =
//     function ()
//     {
//       let store = this.store.updateAval(this.machine.globala, this.global);
//       this.machine = null;
//       this.store = null;
//       this.global = null;
//       return store;
//     }


function GlobalsInitializer()
{
}

GlobalsInitializer.prototype.run =
    function (machine, store, intrinsics) // TODO intrinsics is in-out param
    {
  
      const l = machine.l;
      const a = machine.a;
      // DUPLICATED FROM JS_CESK
      const L_UNDEFINED = l.abst1(undefined);
      const L_NULL = l.abst1(null);
      const L_0 = l.abst1(0);
      const L_1 = l.abst1(1);
      const L_FALSE = l.abst1(false);
      const L_MININFINITY = l.abst1(-Infinity);
      const L_EMPTY_STRING = l.abst1("");
      const P_PROTOTYPE = l.abst1("prototype");
      const P_CONSTRUCTOR = l.abst1("constructor");
      const P_LENGTH = l.abst1("length");
      const P_MESSAGE = l.abst1("message");
      
      // END
      const globala = machine.globala;
      const storeAlloc = machine.storeAlloc;
      const storeLookup = machine.storeLookup;
      const storeUpdate = machine.storeUpdate;
      const doProtoLookup = machine.doProtoLookup;
      const doProtoSet = machine.doProtoSet;
      const allocNative = machine.allocNative;
      const registerProperty = machine.registerProperty;
      const ObjectCreate = machine.ObjectCreate;
      const createArray = machine.createArray;
      const createPrimitive = machine.createPrimitive;
      //const createError = machine.createError;
      const readObjectEffect = machine.readObjectEffect;
      const writeObjectEffect = machine.writeObjectEffect;
      const KontState = machine.KontState;
      
      const Property = machine.Property;
      
      let global = store.lookupAval(machine.globala);
  
      
      
      
      
      // BEGIN STRING
      const stringPa = allocNative();
      const stringProtoRef = l.abstRef(stringPa);
      intrinsics.add("%StringPrototype%", stringProtoRef);
      var stringP = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
      //  stringP.toString = function () { return "~String.prototype"; }; // debug
      var stringa = allocNative();
      var stringP = registerProperty(stringP, "constructor", l.abstRef(stringa));
      var string = createPrimitive(stringFunction, null);
      string = string.add(P_PROTOTYPE, new Property(intrinsics.get("%StringPrototype%"), BOT, BOT, BOT, BOT, BOT));
      global = global.add(l.abst1("String"), new Property(l.abstRef(stringa), BOT, BOT, BOT, BOT, BOT));
      store = storeAlloc(store, stringa, string);
  
      stringP = registerPrimitiveFunction(stringP, "charAt", stringCharAt);
      stringP = registerPrimitiveFunction(stringP, "charCodeAt", stringCharCodeAt);
      stringP = registerPrimitiveFunction(stringP, "startsWith", stringStartsWith);
  
      store = storeAlloc(store, stringPa, stringP);
  
      function stringFunction(application, operandValues, thisa, benv, store, lkont, kont, effects)
      {
        if (operandValues.length === 0)
        {
          return [{state:new KontState(L_EMPTY_STRING, store, lkont, kont), effects:effects}];
        }
        return [{state:new KontState(operandValues[0].ToString(), store, lkont, kont), effects:effects}];
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
      // END STRING
  
  
  
  
  
      // BEGIN ARRAY
      const arrayPa = allocNative();
      const arrayProtoRef = l.abstRef(arrayPa);
      intrinsics.add("%ArrayPrototype%", arrayProtoRef);
  
      var arrayP = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
      var arraya = allocNative();
      var arrayP = registerProperty(arrayP, "constructor", l.abstRef(arraya));
      var array = createPrimitive(arrayFunction, arrayConstructor);
      array = array.add(P_PROTOTYPE, new Property(arrayProtoRef, BOT, BOT, BOT, BOT, BOT));
      global = global.add(l.abst1("Array"), new Property(l.abstRef(arraya), BOT, BOT, BOT, BOT, BOT));
      store = storeAlloc(store, arraya, array);
  
      arrayP = registerPrimitiveFunction(arrayP, "toString", arrayToString);
      arrayP = registerPrimitiveFunction(arrayP, "concat", arrayConcat);
      arrayP = registerPrimitiveFunction(arrayP, "push", arrayPush);
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "map", arrayMap);
//  arrayP = registerPrimitiveFunction(arrayP, arrayPa, "reduce", arrayReduce);
      store = storeAlloc(store, arrayPa, arrayP);
  
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
        arr = arr.add(P_LENGTH, new Property(length, BOT, BOT, BOT, BOT, BOT));
    
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
          arr = arr.add(l.abst1(String(i)), new Property(operandValues[i], BOT, BOT, BOT, BOT, BOT));
        }
        arr = arr.add(P_LENGTH, new Property(l.abst1(operandValues.length), BOT, BOT, BOT, BOT, BOT));
    
        var arrAddress = a.array(application, benv, store, kont);
        store = storeAlloc(store, arrAddress, arr);
        var arrRef = l.abstRef(arrAddress);
        return [{state:new KontState(arrRef, store, lkont, kont), effects:effects}];
      }
  
      function arrayToString(application, operandValues, thisa, benv, store, lkont, kont, effects)
      {
        var arr = storeLookup(store, thisa);
        var len = arr.lookup(P_LENGTH).Value;
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
        var thisLen = thisArr.lookup(P_LENGTH).Value;
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
          resultArr = resultArr.add(iname, new Property(v, BOT, BOT, BOT, BOT, BOT));
          i = l.add(i, L_1);
        }
        argAddrs.forEach(
            function (argAddr)
            {
              var argArr = storeLookup(store, argAddr);
              var argLen = argArr.lookup(P_LENGTH).Value;
              effects.push(readObjectEffect(argAddr, P_LENGTH));
              var i = L_0;
              var seen = ArraySet.empty();
              while ((!seen.contains(i)) && l.lt(i, argLen).isTrue())
              {
                seen = seen.add(i);
                var iname = i.ToString();
                var v = doProtoLookup(iname, ArraySet.from1(argAddr), store, effects);
                resultArr = resultArr.add(l.add(thisLen, i).ToString(), new Property(argArr.lookup(iname).Value, BOT, BOT, BOT, BOT, BOT, BOT));
                i = l.add(i, L_1);
              }
              resultArr = resultArr.add(P_LENGTH, new Property(l.add(thisLen, i), BOT, BOT, BOT, BOT, BOT));
            });
        var arrAddress = a.array(application, benv, store, lkont, kont);
        store = storeAlloc(store, arrAddress, resultArr);
        return [{state:new KontState(l.abstRef(arrAddress), store, lkont, kont), effects:effects}];
      }
  
      function arrayPush(application, operandValues, thisa, benv, store, lkont, kont, effects)
      {
        var arr = storeLookup(store, thisa);
        var len = arr.lookup(P_LENGTH).Value;
        effects.push(readObjectEffect(thisa, P_LENGTH));
        var lenStr = len.ToString();
        arr = arr.add(lenStr, new Property(operandValues[0], BOT, BOT, BOT, BOT, BOT))
        effects.push(writeObjectEffect(thisa, lenStr));
        var len1 = l.add(len, L_1);
        arr = arr.add(P_LENGTH, new Property(len1, BOT, BOT, BOT, BOT, BOT));
        effects.push(writeObjectEffect(thisa, P_LENGTH))
        store = storeUpdate(store, thisa, arr);
        return [{state:new KontState(len1, store, lkont, kont), effects:effects}];
      }
      // END ARRAY
  

      
      // BEGIN MATH
      var math = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
      var matha = allocNative();
      math = registerPrimitiveFunction(math, "abs", mathAbs);
      math = registerPrimitiveFunction(math, "round", mathRound);
      math = registerPrimitiveFunction(math, "floor", mathFloor);
      math = registerPrimitiveFunction(math, "sin", mathSin);
      math = registerPrimitiveFunction(math, "cos", mathCos);
      math = registerPrimitiveFunction(math, "sqrt", mathSqrt);
      math = registerPrimitiveFunction(math, "random", mathRandom);
//  math = registerPrimitiveFunction(math, matha, "max", mathMax);
//  math = registerProperty(math, "PI", l.abst1(Math.PI));
      store = storeAlloc(store, matha, math);
      global = global.add(l.abst1("Math"), new Property(l.abstRef(matha), BOT, BOT, BOT, BOT, BOT));
  
  
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
  
      function mathFloor(application, operandValues, thisa, benv, store, lkont, kont, effects)
      {
        var value = l.floor(operandValues[0]);
        return [{state: new KontState(value, store, lkont, kont), effects:effects}];
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
      // END MATH
  
  
      // BEGIN META
      var meta = ObjectCreate(l.abst1(null));
      var metaa = allocNative();
      // meta = registerPrimitiveFunction(meta, "HasStringDataInternalSlot", metaHasStringDataInternalSlot);
      // meta = registerPrimitiveFunction(meta, "GetStringDataInternalSlot", metaGetStringDataInternalSlot);
      // meta = registerPrimitiveFunction(meta, "SetStringDataInternalSlot", metaSetStringDataInternalSlot);
      meta = registerPrimitiveFunction(meta, "AddIntrinsic", metaAddIntrinsic);
      store = storeAlloc(store, metaa, meta);
      global = global.add(l.abst1("$META$"), new Property(l.abstRef(metaa), BOT, BOT, BOT, BOT, BOT));
  
  
      // // 21.1.3
      // function metaThisStringValue(value)
      // {
      //   if (typeof value === "string")
      //   {
      //     return value;
      //   }
      //
      //   if (typeof value === "object")
      //   {
      //     if ($META$.HasStringDataInternalSlot(value))
      //     {
      //       return $META$.GetStringDataInternalSlot(value);
      //     }
      //   }
      //
      //   throw new TypeError("cannot convert to string: " + value);
      // }
  
      // function metaHasStringDataInternalSlot(application, operandValues, thisa, benv, store, lkont, kont, effects)
      // {
      //   let value = BOT;
      //   const addresses = operandValues[0].addresses();
      //   addresses.forEach(
      //       function (address)
      //       {
      //         const obj = store.lookupAval(address);
      //         value = value.join(l.abst1(obj.StringData !== BOT));
      //       });
      //   return  [{state:new KontState(value, store, lkont, kont), effects:effects}];
      // }
      //
      // function metaGetStringDataInternalSlot(application, operandValues, thisa, benv, store, lkont, kont, effects)
      // {
      //   let value = BOT;
      //   const addresses = operandValues[0].addresses();
      //   addresses.forEach(
      //       function (address)
      //       {
      //         const obj = storeLookup(address);
      //         value = value.join(obj.StringData);
      //       });
      //   return  [{state:new KontState(value, store, lkont, kont), effects:effects}];
      // }
      //
      //
  
      function metaAddIntrinsic(application, operandValues, thisa, benv, store, lkont, kont, effects)
      {
        const [Name, Value] = operandValues;
        intrinsics.add(Name.conc1(), Value);
        return  [{state:new KontState(l.abst1(undefined), store, lkont, kont), effects:effects}];
      }
  
      // BEGIN PERFORMANCE
      let perf = ObjectCreate(intrinsics.get("%ObjectPrototype%"));
      const perfa = allocNative();
      perf = registerPrimitiveFunction(perf, "now", performanceNow, null);
      store = storeAlloc(store, perfa, perf);
      global = registerProperty(global, "performance", l.abstRef(perfa));
  
      function performanceNow(application, operandValues, thisa, benv, store, lkont, kont, effects)
      {
        var value = l.abst1(performance.now());
        return [{state:new KontState(value, store, lkont, kont), effects:effects}];
      }
      // END PERFORMANCE
      
      
      
      
      // COMMIT UPDATED GLOBAL TO STORE
      store = store.updateAval(globala, global);
      return store;
  
      function registerPrimitiveFunction(object, propertyName, applyFunction, applyConstructor)
      {
        var primFunObject = createPrimitive(applyFunction, applyConstructor);
        var primFunObjectAddress = allocNative();
        store = storeAlloc(store, primFunObjectAddress, primFunObject);
        return registerProperty(object, propertyName, l.abstRef(primFunObjectAddress));
      }
    }


