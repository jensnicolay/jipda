import {createAst, StringResource} from "./ast.mjs";
import {ArraySet, assert, assertDefinedNotNull, Sets} from "./common.mjs";
import {StateRegistry, createMachine, isSuccessState} from "./abstract-machine.mjs";
import {BOT} from "./lattice.mjs";

import fs from 'fs';
import {initialStatesToDot} from "./export/dot-graph.mjs";


export function JsContext(semantics, store, kont, alloc, kalloc)
{
  assertDefinedNotNull(store);
  assertDefinedNotNull(store.lookup);  
  assertDefinedNotNull(kont);
  this.semantics = semantics;
  this.alloc = alloc;
  this.kalloc = kalloc;
  this.store = store;
  this.kont0 = kont;
  this.initialStates = [];
  this.stateRegistry = new StateRegistry();
  this.managedValues = ArraySet.empty();
}

JsContext.prototype.createMachine =
  function ()
  {
    const machine = createMachine(this.semantics, this.store, this.kont, this.alloc, this.kalloc);
    return machine;
  }

JsContext.prototype.explore =
    function (machine)
    {
      assertDefinedNotNull(machine);
      const system = machine.explore({stateRegistry: this.stateRegistry});
      this.initialStates = this.initialStates.concat(system.initialStates);
      let value = this.semantics.lat.bot();
      let store = this.semantics.lat.bot();
      let resultStates = system.endStates;
      if (resultStates.size === 0)
      {
        resultStates = system.initialStates.filter(isSuccessState);
        if (resultStates.size === 0 )
        {
          throw new Error("no result states");
          // console.warn("no result states!");
        }
      }
      for (const s of resultStates)
      {
        if (isSuccessState(s))
        {
          value = value.join(s.value);
          store = store.join(s.store);
          // if (kont)
          // {
          //   if (s.kont !== kont)
          //   {
          //     throw new Error("?");
          //   }
          // }
          // else
          // {
          //   kont = s.kont;
          // }
        }
        else if (s.isThrowState)
        {
          this.managedValues = this.managedValues.add(s.value);
          store = store.join(s.store);
          // if (kont)
          // {
          //   if (s.kont !== kont)
          //   {
          //     throw new Error("?");
          //   }
          // }
          // else
          // {
          //   kont = s.kont;
          // }
          // warning: NESTING JsContexts!
          // cannot wrap jsValue here, because context store doesn't match; therefore: new JsValue(..., new JsC(...))
          console.warn("Uncaught exception: " + new JsValue(s.value, new JsContext(this.semantics, s.store, this.kont0, this.alloc, this.kalloc)).introspectiveToString());
          console.warn(s.stackTrace());
        }
        else
        {
          console.warn("warning: ignoring non-success state " + s)
        }
      }
      assertDefinedNotNull(store);
      assert(store !== BOT);
      this.store = store;
      this.managedValues = this.managedValues.add(value);
      assert(typeof value.addresses === 'function');
      //console.log("managing " + s.value.addresses());
      return new JsValue(value, this);
    }

JsContext.prototype.system =
    function ()
    {
      const system = {
        states:this.stateRegistry.states, initialStates:this.initialStates, //endStates,
        store:this.store, kont0: this.kont0,
        semantics: this.semantics};
      return system;
    }        

JsContext.prototype.globalObject =
    function ()
    {
      return new JsValue(this.kont0.realm.GlobalObject, this);
    }

JsContext.prototype.createArray =
    function ()
    {
      return this.evaluateScript(new StringResource("[]"));
    }

JsContext.prototype.createFunction =
    function (argsText /* array of strings */, bodyText)
    {
      const semantics = this.semantics;
      const machine = this.createMachine();
      const benv = this.kont0.realm.GlobalEnv; // ??
      const store = this.store;
      const lkont = [];
      const kont = this.kont0;
      semantics.$createFunction(argsText, bodyText, benv, store, lkont, kont, machine.machine);
      return this.explore(machine);
    }

JsContext.prototype.evaluateScript =
    function (resource)
    {
      const semantics = this.semantics;
      const ast = createAst(typeof resource === "string" ? new StringResource(resource) : resource);
      const benv = this.kont0.realm.GlobalEnv;
      const store = this.store;
      const lkont = [];
      const kont = this.kont0;
      const machine = this.createMachine();
      machine.machine.evaluate(ast, benv, store, lkont, kont);
      return this.explore(machine);   
    }

JsContext.prototype.createMachine =
  function ()
  {
    // const rootSet = this.managedValues.reduce(
    //     function (acc, d)
    //     {
    //       return acc.join(d.addresses())
    //     }, ArraySet.empty());
    const machine = createMachine(this.semantics, this.store, this.kont, this.alloc, this.kalloc);
    return machine;
  }

JsContext.prototype.wrapValue =
  function (d)
  {
    const type = typeof d;
    if (type === 'string' || type === 'null' || type === 'undefined' || type === 'number' || type === 'boolean')
    {
      return new JsValue(this.semantics.lat.abst1(d), this);
    }
    else
    {
      return new JsValue(d, this);
    }
  }


function JsValue(d, context)
{
  this.d = d;
  this.context = context;
  assertDefinedNotNull(context.store.lookup);
}

JsValue.prototype.isNonUndefined =
    function ()
    {
      return this.d.isDefined();
    }

JsValue.prototype.isNonNull =
    function ()
    {
      return this.d.isNonNull();
    }

JsValue.prototype.getProperty =
    function (name)
    {
      const semantics = this.context.semantics;
      const nameValue = typeof name === "string" ? semantics.lat.abst1(name) : name.d;
      const obj = this.d;
      const store = this.context.store;
      const lkont = [];
      const kont = this.context.kont0;
      const machine = this.context.createMachine();
      semantics.$getProperty(obj, nameValue, store, lkont, kont, machine.machine); // TODO ugly (`machine.machine`)
      return this.context.explore(machine);
    }

JsValue.prototype.assignProperty =
    function (name, value)
    {
      const semantics = this.context.semantics;
      const dName = name instanceof JsValue ? name.d : semantics.lat.abst1(name);
      const dValue = value instanceof JsValue ? value.d : semantics.lat.abst1(value);
      const obj = this.d;
      const store = this.context.store;
      const lkont = [];
      const kont = this.context.kont0;
      const machine = this.context.createMachine();
      semantics.$assignProperty(obj, dName, dValue, store, lkont, kont, machine.machine);
      return this.context.explore(machine);
    }

JsValue.prototype.construct =
    function (args)
    {
      const semantics = this.context.semantics;
      const obj = this.d;
      const operandValues = args.map(v => v.d);
      const store = this.context.store;
      const benv = this.context.kont0.realm.GlobalEnv;
      const lkont = [];
      const kont = this.context.kont0;
      const machine = this.context.createMachine();
      semantics.$construct(obj, operandValues, benv, store, lkont, kont, machine.machine);
      return this.context.explore(machine);
    }

JsValue.prototype.push =
  function (v)
  {
    const semantics = this.context.semantics;
    const obj = this.d;
    const operandValues = [v.d];
    const store = this.context.store;
    const benv = this.context.kont0.realm.GlobalEnv;
    const lkont = [];
    const kont = this.context.kont0;
    const machine = this.context.createMachine();
    semantics.$getProperty(obj, semantics.lat.abst1("push"), store, lkont, kont, machine.machine);
    const pushMethod = this.context.explore(machine);
    semantics.$call(pushMethod.d, obj, operandValues, benv, this.context.store, lkont, this.context.kont0, machine.machine);
    return this.context.explore(machine);
  }

// JsValue.prototype[Symbol.iterator] =
//     function* ()
//     {
//       const semantics = this.context.semantics;
//       const obj = this.d;
//       const store = this.context.store;
//       const benv = this.context.kont.realm.GlobalEnv;
//       const lkont = [];
//       const kont = this.context.kont;
//       const machine = this.context.createMachine();
//     }


JsValue.prototype.call =
  function (thisArg, ...args)
  {
    const semantics = this.context.semantics;
    const benv = this.context.kont0.realm.GlobalEnv;
    const lkont = [];
    const machine = this.context.createMachine();
    semantics.$call(this.d, thisArg.d, args.map(x => x.d), benv, this.context.store, lkont, this.context.kont0, machine.machine);
    return this.context.explore(machine);
  }

JsValue.prototype.String =
    function ()
    {
      const rator = this.context.globalObject().getProperty("String").d;
      const semantics = this.context.semantics;
      const benv = this.context.kont0.realm.GlobalEnv;
      const lkont = [];
      const machine = this.context.createMachine();
      const thisArg = semantics.lat.abst1(null);
      semantics.$call(rator, thisArg, [this.d], benv, this.context.store, lkont, this.context.kont0, machine.machine);
      return this.context.explore(machine);
    }


JsValue.prototype.introspectiveToString =
    function ()
    {
      return introspectiveToString(this.d, this.context.store, this.context.semantics);
    }
function introspectiveToString(d, store, semantics)
{
  const BOT = semantics.lat.bot();
  let str = [];
  if (d.projectObject() !== BOT)
  {
    let sb = "";
    for (const a of d.addresses())
    {
      const obj = store.lookup(a);
      sb += a + ":";
      for (const name of obj.names())
      {
        const value = obj.getProperty(name);
        sb += "(" + name + "=>" + value + ")";
      }
    }
    str.push(sb);
  }
  if (d.projectUndefined() !== BOT)
  {
    str.push("undefined");
  }
  if (d.projectNull() !== BOT)
  {
    str.push("null");
  }
  if (d.isTrue())
  {
    str.push("true");
  }
  if (d.isFalse())
  {
    str.push("true");
  }
  if (d.projectNumber() !== BOT)
  {
    str.push(d.projectNumber());
  }
  if (d.projectString() !== BOT)
  {
    str.push(d.projectString());
  }
  return "<" + str.join(",") + ">";
}
