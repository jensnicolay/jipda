import fs from 'fs';

import {assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';
import {FileResource, StringResource} from "../ast";
import {initialStatesToDot} from "../export/dot-graph";

const ast0resource = new FileResource("../prelude.js");
const jsSemantics = createSemantics(concLattice, {errors: true});
const s0 = computeInitialCeskState(jsSemantics, concAlloc, concKalloc, ast0resource);

function run(resource)
{
  const s1 = s0.switchMachine(jsSemantics, concAlloc, concKalloc, {hardAsserts: true});
  const s2 = s1.enqueueScriptEvaluation(resource);
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


function runSource(src, expected)
{
  return run(new StringResource(src), expected);
}

function runFile(path)
{
  return run(new FileResource(path));
}


const system = runSource("[1,2,3].map(function (n) {return n+1})");
//const states = system.states;
const initialStates = system.initialStates;
const dot = initialStatesToDot(initialStates);
console.log(dot);
