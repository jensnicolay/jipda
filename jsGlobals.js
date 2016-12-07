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
    function (machine, store, intrinsics)
    {
      let global = store.lookupAval(machine.globala);
      
      // BEGIN PERFORMANCE
      let perf = machine.createObject(intrinsics.ObjectPrototype);
      const perfa = machine.allocNative();
      const primFunObject = machine.createPrimitive(performanceNow, null);
      const primFunObjectAddress = machine.allocNative();
      store = machine.storeAlloc(store, primFunObjectAddress, primFunObject);
      perf = machine.registerProperty(perf, "now", machine.l.abstRef(primFunObjectAddress));
      store = machine.storeAlloc(store, perfa, perf);
      global = machine.registerProperty(global, "performance", machine.l.abstRef(perfa));
  
      function performanceNow(application, operandValues, thisa, benv, store, lkont, kont, effects)
      {
        var value = machine.l.abst1(performance.now());
        return [{state:new machine.KontState(value, store, lkont, kont), effects:effects}];
      }
      // END PERFORMANCE

      store = store.updateAval(machine.globala, global);
      return store;
    }


