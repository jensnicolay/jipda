import fs from 'fs';

import concLattice from '../conc-lattice.mjs';
import concAlloc from '../conc-alloc.mjs';
import concKalloc from '../conc-kalloc.mjs';
import createSemantics from '../js-semantics.mjs';
import {initializeMachine, createEvalMachine, isSuccessState} from '../abstract-machine.mjs';
import {FileResource, StringResource} from "../ast.mjs";
import {initialStatesToDot} from "../export/dot-graph.mjs";
import typeLattice from "../type-lattice.mjs";
import aacKalloc from "../aac-kalloc.mjs";
import tagAlloc from "../tag-alloc.mjs";

const preludeResource = new FileResource("../prelude.js");
const webPreludeResource = new FileResource("../web-prelude.js");
const jsConcSemantics = createSemantics(concLattice, {errors: true});
const jsTypeSemantics = createSemantics(typeLattice, {errors: true});

function concMachine()
{
  return createEvalMachine(initializeMachine(jsConcSemantics, concAlloc, concKalloc, preludeResource));
}

function concMachineWeb()
{
  return createEvalMachine(initializeMachine(jsConcSemantics, concAlloc, concKalloc, preludeResource, webPreludeResource));
}

function concMachineNoPrel()
{
  return createEvalMachine(initializeMachine(jsConcSemantics, concAlloc, concKalloc));
}

function typeMachine()
{
  return createEvalMachine(initializeMachine(jsTypeSemantics, concAlloc, concKalloc, preludeResource)).switchConfiguration(jsTypeSemantics, tagAlloc, aacKalloc);
}

function typeMachineNoPrel()
{
  return createEvalMachine(initializeMachine(jsTypeSemantics, tagAlloc, aacKalloc));
}


function run(resource, machine, cc)
{
  const system = machine.explore(resource, cc);
  const actual = [...system.endStates].reduce((result, s) => isSuccessState(s) ? result.join(s.value) : result, machine.semantics.lat.bot());
  console.log("result value: "+ actual);
  return system;
}

function runSource(src, machine, cc)
{
  return run(new StringResource(src), machine, cc);
}

function runFile(path, machine, cc)
{
  return run(new FileResource(path), machine, cc);
}


//const system = runFile("resources/simple-gc-test.js", typeMachine(), {pruneGraph: false});
const system = runSource("'1 2 3'.split(' ')", typeMachine(), {pruneGraph: true});
console.log("visited states: %i", system.statistics.numStatesVisited);
console.log("reachable states: %i", system.statistics.numStatesReachable);
if (system.statistics.pruned)
{
  console.log("reachable states after pruning: %i", system.statistics.numStatesReachablePruned);
}
const initialStates = system.initialStates;
const dot = initialStatesToDot(initialStates);
fs.writeFileSync('graph.dot', dot);
