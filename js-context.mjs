import Ast from "./ast.mjs";
import {ArraySet, assert} from "./common.mjs";
import concLattice from "./conc-lattice.mjs";
import {createMachine, explore} from "./abstract-machine.mjs";
import {isSuccessState} from "./abstract-machine";


export function JsContext(semantics, explorer, store, kont)
{
  this.semantics = semantics;
  this.explorer = explorer;
  this.store = store;
  assert(kont);
  this.kont = kont;
  this.managedValues = ArraySet.empty();
}

JsContext.prototype.explore =
    function (S)
    {
      const resultStates = new Set();
      const initialStates = [...S];
      assert(initialStates.length > 0);
      this.explorer.explore(initialStates, s => resultStates.add(s));
      let value = this.semantics.lat.bot();
      let store = this.semantics.lat.bot();
      let kont = null;
      if (resultStates.size === 0)
      {
        throw new Error("TODO: no result states");
      }
      for (const s of resultStates)
      {
        if (isSuccessState(s))
        {
          value = value.join(s.value);
          store = store.join(s.store);
          if (kont)
          {
            if (s.kont !== kont)
            {
              throw new Error("?");
            }
          }
          else
          {
            kont = s.kont;
          }
        }
        else if (s.isThrowState)
        {
          this.managedValues = this.managedValues.add(s.value);
          store = store.join(s.store);
          if (kont)
          {
            if (s.kont !== kont)
            {
              throw new Error("?");
            }
          }
          else
          {
            kont = s.kont;
          }
          console.warn("warning: ignoring throw state " + s);
        }
        else
        {
          console.warn("warning: ignoring non-success state " + s)
        }
      }
      assert(store);
      assert(kont);
      this.store = store;
      this.kont = kont;
      this.managedValues = this.managedValues.add(value);
      assert(typeof value.addresses === 'function');
      //console.log("managing " + s.value.addresses());
      return new JsValue(value, this);
    }

JsContext.prototype.globalObject =
    function ()
    {
      return new JsValue(this.kont.realm.GlobalObject, this);
    }

JsContext.prototype.createArray =
    function ()
    {
      return this.evaluateScript("[]");
    }

// JsContext.prototype.createFunction =
//     function (f)
//     {
//       // Call, store, kont, lkont, machine
// //      ObjClosureCall.prototype.applyFunction =
//   //        function (application, operandValues, thisValue, TODO_REMOVE, store, lkont, kont, states)
//
// //      ObjClosureCall.prototype.applyConstructor =
//   //        function (application, operandValues, protoRef, TODO_REMOVE, store, lkont, kont, states)
//       const semantics = this.semantics;
//       const machine = this.createMachine();
//       const applyFunction = function (application, operandValues, thisValue, TODO_REMOVE, store, lkont, kont, states)
//       {
//
//       };
//       const S = semantics.createFunction(ast, benv, store, lkont, kont, machine);
//       return this.explore(S);
//     }

JsContext.prototype.evaluateScript =
    function (src)
    {
      const semantics = this.semantics;
      const ast = Ast.createAst(src);
      const benv = this.kont.realm.GlobalEnv;
      const store = this.store;
      const lkont = [];
      const kont = this.kont;
      const machine = this.createMachine();
      const S = semantics.evaluate(ast, benv, store, lkont, kont, machine);
      return this.explore(S);
    }

JsContext.prototype.createMachine =
  function ()
  {
    const rootSet = this.managedValues.reduce(
        function (acc, d)
        {
          return acc.join(d.addresses())
        }, ArraySet.empty());
    return createMachine(this.semantics, {rootSet});
  }


function JsValue(d, context)
{
  this.d = d;
  this.context = context;
}

JsValue.prototype.isNonUndefined =
    function ()
    {
      return this.d.isNonUndefined();
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
      const kont = this.context.kont;
      const machine = this.context.createMachine();
      const S = semantics.$getProperty(obj, nameValue, store, lkont, kont, machine);
      return this.context.explore(S);
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
      const kont = this.context.kont;
      const machine = this.context.createMachine();
      const S = semantics.$assignProperty(obj, dName, dValue, store, lkont, kont, machine);
      return this.context.explore(S);
    }

JsValue.prototype.construct =
    function (args)
    {
      const semantics = this.context.semantics;
      const obj = this.d;
      const operandValues = args.map(v => v.d);
      const store = this.context.store;
      const benv = this.context.kont.realm.GlobalEnv;
      const lkont = [];
      const kont = this.context.kont;
      const machine = this.context.createMachine();
      const S = semantics.$construct(obj, operandValues, benv, store, lkont, kont, machine);
      return this.context.explore(S);
    }

JsValue.prototype.push =
  function (v)
  {
    const semantics = this.context.semantics;
    const obj = this.d;
    const operandValues = [v.d];
    const store = this.context.store;
    const benv = this.context.kont.realm.GlobalEnv;
    const lkont = [];
    const kont = this.context.kont;
    const machine = this.context.createMachine();
    const S = semantics.$getProperty(obj, semantics.lat.abst1("push"), store, lkont, kont, machine);
    const pushMethod = this.context.explore(S);
    const S2 = semantics.$call(pushMethod.d, obj, operandValues, benv, this.context.store, lkont, this.context.kont, machine);
    return this.context.explore(S2);
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
    const benv = this.context.kont.realm.GlobalEnv;
    const lkont = [];
    const machine = this.context.createMachine();
    const S = semantics.$call(this.d, thisArg.d, args.map(x => x.d), benv, this.context.store, lkont, this.context.kont, machine);
    return this.context.explore(S);
  }

JsValue.prototype.toString =
    function ()
    {
      const BOT = this.context.semantics.lat.bot();
      let str = [];
      const d = this.d;
      if (d.projectObject() !== BOT)
      {
        const store = this.context.store;
        for (const a of d.addresses())
        {
          str.push(a + ":" + new JsValue(store.lookupAval(a), this));
        }
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
        str.push(d.isProjectNumber());
      }
      if (d.projectString() !== BOT)
      {
        str.push(d.isProjectString());
      }
      return "<" + str.join(",") + ">";
    }