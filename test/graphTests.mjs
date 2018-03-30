import fs from 'fs';

import {assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';

const read = name => fs.readFileSync(name).toString();

const ast0src = read("../prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const s0 = computeInitialCeskState(jsSemantics, ast0src);

let c = 0;

function stateToLabel(s)
{
  function kontLabel(s)
  {
    return " | " + s.kont._id;
  }


  if (s.isEvalState)
  {
    return s.node.toString().substring(0, 80) + kontLabel(s);
  }
  else if (s.isKontState)
  {
    return s.value.toString() + kontLabel(s);
  }
  else if (s.isReturnState)
  {
    return s.value.toString() + kontLabel(s);
  }
  else if (s.isBreakState)
  {
    return s.value.toString() + kontLabel(s);
  }
  else if (s.isThrowState)
  {
    return s.value + "\n" + s.value.addresses().map(addr => s.store.lookupAval(addr).lookup(jsSemantics.lat.abst1("message")).value.Value).join() + kontLabel(s);
  }
  else if (s.isErrorState)
  {
    return s.node.loc.start.line + ": " + s.msg + kontLabel(s);
  }
  else
  {
    return "???" + kontLabel(s);
  }
}

function stateToColor(s)
{
  if (isSuccessState(s))
  {
    return "yellow";
  }
  else if (s.isEvalState)
  {
    return "pink";
  }
  else if (s.isKontState)
  {
    return "lightgreen";
  }
  else if (s.isReturnState)
  {
    return "lightblue";
  }
  else if (s.isBreakState)
  {
    return "lightblue";
  }
  else if (s.isThrowState)
  {
    return "red";
  }
  else if (s.isErrorState)
  {
    return "red";
  }
  else
  {
    return "???";
  }
}

function run(src, expected)
{
  console.log("digraph G {\nnode [style=filled,fontname=\"Roboto Condensed\"];");
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
  }, s => {console.log(s._id + " [label=\"" + s._id + ": " + stateToLabel(s) + "\",color=\""+ stateToColor(s) + "\"];")},
      (s, s2) => {console.log(s._id + " -> " + s2._id + ";")});
  console.log("}");
}


run(read("resources/fib.js"), 42);
