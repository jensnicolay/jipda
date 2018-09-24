import {assert} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {FileResource} from '../ast';
import {JsContext} from '../js-context';
import {computeInitialCeskState} from "../abstract-machine.mjs";
import {explore, StateRegistry} from "../abstract-machine";

const ast0resource = new FileResource("../prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0resource);

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
  const jsContext = new JsContext(jsSemantics, new Explorer(), store0, kont0);
  //const actual =
  f(jsContext);
  //assertEquals(concLattice.abst1(expected), actual);
}


run(context => {
  const String = context.globalObject().getProperty("String").d;
  assert(String.isNonUndefined());
}, undefined);
