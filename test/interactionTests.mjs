import fs from 'fs';

import {assertEquals} from '../common';
import Ast from '../ast';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {createMachine, explore, computeResultValue, computeInitialCeskState} from '../abstract-machine';
import {} from '../jipda';

const read = name => fs.readFileSync(name).toString();

const ast0src = read("../prelude.js");
const interactionModel = JSON.parse(read('resources/interaction/model.txt'));
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true, interactionModel});
const s0 = computeInitialCeskState(jsSemantics, ast0src);
let c = 0;

function run(src, expected)
{
  console.log("\n" + c++ + " " + src.substring(0, 80));
  var ast = Ast.createAst(src);
  const s1 = s0.switchMachine(jsSemantics, {hardAsserts:true});
  const s2 = s1.enqueueScriptEvaluation(src);
  const resultStates = new Set();
  var system = explore([s2], s => resultStates.add(s));
  var result = computeResultValue(resultStates, concLattice.bot());
  //console.log(result.msgs.join("\n"));
  var actual = result.value;
  assertEquals(concLattice.abst1(expected), actual);
}

run("123", 123);
run("var ws=wrapService(null,'example');ws.f('abc')", "abc123");
run("var ws=wrapService(null,'example');ws.f(456)", 579);