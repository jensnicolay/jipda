import fs from 'fs';

import {assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';
import dotGraph from '../export/dot-graph';
const read = name => fs.readFileSync(name).toString();

const ast0src = read("../prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const s0 = computeInitialCeskState(jsSemantics, ast0src);

function run(src)
{
  const s1 = s0.switchMachine(jsSemantics, {hardAsserts: true});
  const s2 = s1.enqueueScriptEvaluation(src);
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
  console.log("result value: "+ actual);
  return system;
}


const system = run(read("resources/fib.js"));
const states = system.states;
const dot = dotGraph(states);
console.log(dot);
