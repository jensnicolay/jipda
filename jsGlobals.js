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
      const allocNative = machine.allocNative;
      const registerProperty = machine.registerProperty;
      const createObject = machine.createObject;
      const createPrimitive = machine.createPrimitive;
      const KontState = machine.KontState;
      
      let global = store.lookupAval(machine.globala);
  
      // BEGIN STRING
      const stringPa = allocNative();
      const stringProtoRef = l.abstRef(stringPa);
      intrinsics.StringPrototype = stringProtoRef;
      var stringP = createObject(intrinsics.ObjectPrototype);
      //  stringP.toString = function () { return "~String.prototype"; }; // debug
      var stringa = allocNative();
      var stringP = registerProperty(stringP, "constructor", l.abstRef(stringa));
      var string = createPrimitive(stringFunction, null);
      string = string.add(P_PROTOTYPE, intrinsics.StringPrototype);
      global = global.add(l.abst1("String"), l.abstRef(stringa));
      store = storeAlloc(store, stringa, string);
  
      stringP = registerPrimitiveFunction(stringP, stringPa, "charAt", stringCharAt);
      stringP = registerPrimitiveFunction(stringP, stringPa, "charCodeAt", stringCharCodeAt);
      stringP = registerPrimitiveFunction(stringP, stringPa, "startsWith", stringStartsWith);
  
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
      
      
      // BEGIN PERFORMANCE
      let perf = createObject(intrinsics.ObjectPrototype);
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


