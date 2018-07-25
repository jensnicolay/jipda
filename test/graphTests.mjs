import fs from 'fs';

import {assert} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';
import {FileResource, StringResource} from '../ast';
import {initialStatesToDot} from "../export/dot-graph";

const ast0resource = new FileResource("../prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const s0 = computeInitialCeskState(jsSemantics, ast0resource);

function markResources(initialStates)
{
  const W = [...initialStates];
  const S = [];
  const resources = [];
  let currentCtx = null;
  while (W.length > 0)
  {
    const s = W.pop();
    if (S[s._id])
    {
      continue;
    }
    S[s._id] = true;
    const ctx = s.kont;
    let resource = resources[ctx._id];
    if (ctx !== currentCtx)
    {
      if (!resource)
      {
        //assert(s.isEvalState);
        if (s.isEvalState)
        {
          resource = s.node.root.resource;
          resources[ctx._id] = resource;
        }
      }
    }
    s.resource = resource;
    s._successors.forEach(s2 => W.push(s2));
  }
}

function pruneGraph(initialStates)
{
  function preludeState(s)
  {
    const resource = s.resource;
    return resource && resource instanceof FileResource && resource.path.includes("prelude");
  }

  function scanForNonPreludeStates(W)
  {
    // const W = [...W2];
    const S = [];
    const nonPreludeStates = [];
    while (W.length > 0)
    {
      const s = W.pop();
      if (S[s._id])
      {
        continue;
      }
      S[s._id] = true;
      if (preludeState(s))
      {
        s._successors.forEach(s2 => W.push(s2));
      }
      else
      {
        nonPreludeStates.push(s);
      }
    }
    return nonPreludeStates;
  }

  const W = [...initialStates];
  const S = [];
  while (W.length > 0)
  {
    const s = W.pop();
    if (S[s._id])
    {
      continue;
    }
    S[s._id] = true;
    s._successors = scanForNonPreludeStates(s._successors);
    s._successors.forEach(s2 => W.push(s2));
  }
}

function run(resource)
{
  const s1 = s0.switchMachine(jsSemantics, {hardAsserts: true});
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
const states = system.states;
const initialStates = system.initialStates;
markResources(initialStates);
pruneGraph(initialStates);
const dot = initialStatesToDot(initialStates);
console.log(dot);
