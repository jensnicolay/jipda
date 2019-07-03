import {assert} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {FileResource, StringResource} from '../ast';
import {JsContext} from '../js-context';
import {computeInitialCeskState} from "../abstract-machine.mjs";
import {explore, isSuccessState, StateRegistry} from "../abstract-machine";

const ast0resource = new FileResource("../prelude.js");
const jsSemantics = createSemantics(concLattice, {errors: true});

function Explorer()
{
  this.stateRegistry = new StateRegistry();
}

Explorer.prototype.explore =
    function (initialStates, onEndState)
    {
      return explore(initialStates, onEndState, undefined, undefined, this.stateRegistry);
    }



let c = 0;

function run(f, expected)
{
  console.log("test " + c++ + "\n");
  const jsContext = new JsContext(jsSemantics, new Explorer(), concAlloc, concKalloc, store0, kont0);
  //const actual =
  f(jsContext);
  //assertEquals(concLattice.abst1(expected), actual);
}


// run(context => {
//   const String = context.globalObject().getProperty("String").d;
//   assert(String.isNonUndefined());
// }, undefined);


const s0 = computeInitialCeskState(jsSemantics, concAlloc, concKalloc, ast0resource);
const s1 = s0.switchMachine(jsSemantics, concAlloc, concKalloc, {hardAsserts: true, });
const s2 = s1.enqueueScriptEvaluation(new StringResource("function chkpassword(pwd) {\n" +
    "     print(pwd);\n" +
    "}\n" +
    "\n" +
    "chkpassword('pass');"));
let actual = jsSemantics.lat.bot();
const system = explore([s2], s => {
  if (isSuccessState(s))
  {
    actual = actual.join(s.value);
  }
  else if (s.isThrowState)
  {
    throw new Error(s.value + "\n" + s.value.addresses().map(addr => s.store.lookupAval(addr).lookup(jsSemantics.lat.abst1("message")).value.Value).join());
  }
  else if (s.isErrorState)
  {
    throw new Error(s.node.loc.start.line + ": " + s.msg);
  }
  else
  {
    throw new Error("no progress: " + s);
  }
});

const state10 = system.states[10];
const jsContext = new JsContext(jsSemantics, new Explorer(), concAlloc, concKalloc, state10.store, s0.kont);
console.log(jsContext.globalObject().getProperty("Array"));
