import fs from 'fs';

import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {initializeMachine, isSuccessState} from '../abstract-machine';
import {FileResource, StringResource} from "../ast";
import {initialStatesToDot} from "../export/dot-graph";
import typeLattice from "../type-lattice";
import aacKalloc from "../aac-kalloc";
import tagAlloc from "../tag-alloc";

const ast0resource = new FileResource("../prelude.js");
const jsConcSemantics = createSemantics(concLattice, {errors: true});
const jsTypeSemantics = createSemantics(typeLattice, {errors: true});
const concMachine = initializeMachine(jsConcSemantics, concAlloc, concKalloc, ast0resource);
const typeMachine = initializeMachine(jsTypeSemantics, concAlloc, concKalloc, ast0resource).switchConfiguration(jsTypeSemantics, tagAlloc, aacKalloc);


function run(resource, machine)
{
  const system = machine.explore(resource);
  const actual = [...system.endStates].reduce((result, s) => isSuccessState(s) ? result.join(s.value) : result, machine.semantics.lat.bot());
  console.log("result value: "+ actual);
  return system;
}

function runSource(src, machine)
{
  return run(new StringResource(src), machine);
}

function runFile(path, machine)
{
  return run(new FileResource(path), machine);
}


// runSource("var o=Object.create({}, {x:{value:42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", false);
// runSource("var o=Object.create({}, {x:{value:42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", false);
// runSource("var o=Object.create({}, {x:{value:42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", false);


const system = runSource("var o=Object.create({}, {x:{value:42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", typeMachine);
const initialStates = system.initialStates;
const dot = initialStatesToDot(initialStates);
fs.writeFileSync('graph.dot', dot);
