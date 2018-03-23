import Ast from "./ast.mjs";
import {ArraySet, assert} from "./common.mjs";
import concLattice from "./conc-lattice.mjs";
import {createMachine, computeResultValue, explore} from "./abstract-machine.mjs";

export function JsContext(semantics, store, kont)
{
  this.semantics = semantics;
  this.store = store;
  this.kont = kont;
  this.managedValues = ArraySet.empty();
}

JsContext.prototype.explore =
    function (S)
    {
      const resultStates = new Set();
      const initialStates = [...S];
      assert(initialStates.length > 0);
      explore(initialStates, s => resultStates.add(s));
      //console.log("resultStates: " + [...S] + "->" + resultStates.size);
      assert(resultStates.size === 1);
      const s = [...resultStates][0];
      assert(s.value);
      assert(s.store);
      assert(s.kont);
      this.store = s.store;
      this.kont = s.kont;
      this.managedValues = this.managedValues.add(s.value);
      assert(typeof s.value.addresses === 'function');
      //console.log("managing " + s.value.addresses());
      return new JsValue(s.value, this);
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
      const nameValue = typeof name === "string" ? semantics.lat.abst1(name) : name.d;
      const obj = this.d;
      const store = this.context.store;
      const lkont = [];
      const kont = this.context.kont;
      const machine = this.context.createMachine();
      const S = semantics.$assignProperty(obj, nameValue, value.d, store, lkont, kont, machine);
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