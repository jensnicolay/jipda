import fs from 'fs';

import {assertEquals, assert} from '../common';
import {FileResource, StringResource} from "../ast";
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';
import typeLattice from "../type-lattice";
import aacKalloc from "../aac-kalloc";
import tagAlloc from "../tag-alloc";

const ast0resource = new FileResource("../prelude.js");

const jsConcSemantics = createSemantics(concLattice, {errors: true});
const jsTypeSemantics = createSemantics(typeLattice, {errors:true});

const s0Conc = computeInitialCeskState(jsConcSemantics, concAlloc, concKalloc, ast0resource);
const s0Type = computeInitialCeskState(jsTypeSemantics, concAlloc, concKalloc, ast0resource);

let c = 0;

function run(resource, expected)
{
  console.log(++c + "\t" + resource);

  process.stdout.write("conc ");
  const s1Conc = s0Conc.switchMachine(jsConcSemantics, concAlloc, concKalloc, {hardAsserts: true});

  const s2Conc = s1Conc.enqueueScriptEvaluation(resource);
  let actualConc = jsConcSemantics.lat.bot();
  const systemConc = explore([s2Conc], s =>
  {
    if (isSuccessState(s))
    {
      actualConc = actualConc.join(s.value);
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
  if (!concLattice.abst1(expected).equals(actualConc))
  {
    throw new Error("expected " + expected + ", got " + actualConc);
  }

  process.stdout.write("type ");
  const s1Type = s0Type.switchMachine(jsTypeSemantics, tagAlloc, aacKalloc, {hardAsserts: true});
  const s2Type = s1Type.enqueueScriptEvaluation(resource);
  let actualType = jsTypeSemantics.lat.bot();
  const systemType = explore([s2Type], s => {
    if (isSuccessState(s))
    {
      actualType = actualType.join(s.value);
    }
    else if (s.isThrowState)
    {
      console.warn(s.value + "\n" + s.value.addresses().map(addr => s.store.lookupAval(addr).lookup(jsTypeSemantics.lat.abst1("message")).value.Value).join());
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
  if (!actualType.subsumes(jsTypeSemantics.lat.abst1(expected)))
  {
    if (!actualType.abst().subsumes(jsTypeSemantics.lat.abst1(expected)))
    {
      console.log(jsTypeSemantics.lat.abst1(expected).constructor.name)
      throw new Error(actualType + " does not subsume " + expected);
    }
    console.warn("required abst on abstract value");
  }

  console.log();
}

function runSource(src, expected)
{
  return run(new StringResource(src), expected);
}

function runFile(path, expected)
{
  return run(new FileResource(path), expected);
}

function runEval(...tests)
{
  for (const t of tests)
  {
    runSource(t, eval(t));
  }
}

runSource("'8249823789237'.substring(3, 5)", "98");
runSource("String.prototype.substring.apply('8249823789237', [3, 5])", "98");



//String.prototype.slice
// runSource("'To be, or not to be, that is the question.'.slice(0,7)", "To be, ");     