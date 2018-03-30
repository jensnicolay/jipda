import fs from 'fs';

import {assert} from '../common';
import Ast from '../ast';
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


const read = name => fs.readFileSync(name).toString();

const ast0src = read("../prelude.js");

var module = new TestSuite("suiteJipdaTests");

const preludeJsSemantics = createSemantics(typeLattice, concAlloc, concKalloc, {errors:true});
const s0 = computeInitialCeskState(preludeJsSemantics, ast0src);
const typeJsSemantics = createSemantics(typeLattice, tagAlloc, aacKalloc, {errors:true});

let c = 0;

function run(src, expected)
{
  console.log("type " + ++c + "\t" + src.substring(0, 80).replace(/(\r\n\t|\n|\r\t)/gm, ' '));
  const s1 = s0.switchMachine(typeJsSemantics, {gc:true});
  const s2 = s1.enqueueScriptEvaluation(src);
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
  });
  assert(actual.equals(expected));
}

run("function f() {f()}; f()", BOT);
run("var t = function (x) {return t(x+1)}; t(0)", BOT);
run("var x = 'hela'; while (true) {x += x}", BOT);

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
