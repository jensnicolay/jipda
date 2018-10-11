import fs from 'fs';

import {assert} from '../common';
import {FileResource, StringResource} from "../ast";
import {BOT} from '../lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import typeLattice from '../type-lattice';
import tagAlloc from '../tag-alloc';
import aacKalloc from '../aac-kalloc';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';
import createSemantics from '../js-semantics';
import {TestSuite} from '../test';

typeLattice.sanity();

const ast0resource = new FileResource("../prelude.js");

var module = new TestSuite("suiteJipdaTests");

const typeJsSemantics = createSemantics(typeLattice, {errors:true});
const s0 = computeInitialCeskState(typeJsSemantics, concAlloc, concKalloc, ast0resource);

let c = 0;

function run(resource, expected)
{
  console.log("type " + ++c + "\t" + resource);
  const s1 = s0.switchMachine(typeJsSemantics, tagAlloc, aacKalloc, {gc:true});
  const s2 = s1.enqueueScriptEvaluation(resource);
  let actual = typeJsSemantics.lat.bot();
  const system = explore([s2], s => {
    if (isSuccessState(s))
    {
      actual = actual.join(s.value);
    }
    else if (s.isThrowState)
    {
      console.log("Error thrown: " + s.value + "\n" + s.value.addresses().map(addr => s.store.lookupAval(addr).lookup(jsSemantics.lat.abst1("message")).value.Value).join());
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
  assert(actual.equals(expected));
}

function runSource(src, expected)
{
  return run(new StringResource(src), expected);
}


runSource("function f() {f()}; f()", BOT);
runSource("var t = function (x) {return t(x+1)}; t(0)", BOT);
runSource("var x = 'hela'; while (true) {x += x}", BOT);
runSource("for (var x=0;true;x++);", BOT);

// simplest of GC tests
//    
//    function f(x)
//    {
//        return x;
//    }
//
//    function g(y)
//    {
//        return f(y);
//    }
//
//    g(1);
//    g(2);
//
