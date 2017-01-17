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
      
      const hasInternal = machine.hasInternal;
      const lookupInternal = machine.lookupInternal;
      const assignInternal = machine.assignInternal;
      const callInternal = machine.callInternal;
      
      let global = store.lookupAval(machine.globala);
  
      
      
      
      
      
      
      
      
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


