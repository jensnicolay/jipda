import fs from 'fs';

import {assert} from '../common.mjs';
import {FileResource, StringResource} from "../ast.mjs";
import {BOT} from '../lattice.mjs';
import concAlloc from '../conc-alloc.mjs';
import concKalloc from '../conc-kalloc.mjs';
import typeLattice from '../type-lattice.mjs';
import tagAlloc from '../tag-alloc.mjs';
import aacKalloc from '../aac-kalloc.mjs';
import {isSuccessState, initializeMachine} from '../abstract-machine.mjs';
import createSemantics from '../js-semantics.mjs';
import {TestSuite} from '../test.mjs';

typeLattice.sanity();

const ast0resource = new FileResource("../prelude.js");

var module = new TestSuite("suiteJipdaTests");

const jsTypeSemantics = createSemantics(typeLattice, {errors:true});
const typeMachine = initializeMachine(jsTypeSemantics, concAlloc, concKalloc, ast0resource).switchConfiguration(jsTypeSemantics, tagAlloc, aacKalloc);

let c = 0;

function handleState(value, s)
{
  if (isSuccessState(s))
  {
    return value.join(s.value);
  }
  else if (s.isThrowState)
  {
    console.warn(s.value);
    return value;
  }
  else if (s.isErrorState)
  {
    throw new Error(s.node.loc.start.line + ": " + s.msg);
  }
  else
  {
    throw new Error("no progress: " + s);
  }
}

function run(resource, expected)
{
  console.log(++c + "\t" + resource);

  process.stdout.write("type ");
  const typeMachine2 = typeMachine.switchConfiguration(jsTypeSemantics, tagAlloc, aacKalloc);
  const systemType = typeMachine2.explore(resource);
  const actualType = [...systemType.endStates].reduce(handleState, jsTypeSemantics.lat.bot());
  assert(actualType.equals(expected))
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
