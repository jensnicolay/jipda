import fs from 'fs';

import {assert} from './common';
import Ast from './ast';
import {BOT} from './lattice';
import concAlloc from './conc-alloc';
import concKalloc from './conc-kalloc';
import typeLattice from './type-lattice';
import tagAlloc from './tag-alloc';
import aacKalloc from './aac-kalloc';
import createSemantics from './js-semantics';
import {createMachine, run, computeResultValue, computeInitialCeskState} from './abstract-machine';
import {} from './jipda';

const read = name => fs.readFileSync(name).toString();
const ast0src = read("prelude.js");
const jsConcSemantics = createSemantics(typeLattice, concAlloc, concKalloc, {errors: true});
const initialCeskState = computeInitialCeskState(jsConcSemantics, ast0src);
const args = process.argv.slice(2);
const src = read(args[0]);

console.log(run2(src));

function run2(src)
{
  const ast = Ast.createAst(src);
  const jsTypeSemantics = createSemantics(typeLattice, tagAlloc, aacKalloc, {errors: true});
  const s0 = createMachine(jsTypeSemantics, {hardAsserts:true, initialState: initialCeskState});
  const s1 = s0.enqueueScriptEvaluation(src);
  const resultStates = new Set();
  const system = run([s1], s => resultStates.add(s));
  const result = computeResultValue(resultStates, concLattice.bot());
  result.msgs.join("\n");
  const actual = result.value;
  return actual;
}

