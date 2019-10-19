import fs from 'fs';

import {assertEquals, assert} from '../common.mjs';
import {FileResource, StringResource} from "../ast.mjs";
import concLattice from '../conc-lattice.mjs';
import concAlloc from '../conc-alloc.mjs';
import concKalloc from '../conc-kalloc.mjs';
import createSemantics from '../js-semantics.mjs';
import {initializeMachine, createEvalMachine, isSuccessState} from '../abstract-machine.mjs';
import typeLattice from "../type-lattice.mjs";
import aacKalloc from "../aac-kalloc.mjs";
import tagAlloc from "../tag-alloc.mjs";
import {JsContext} from '../js-context.mjs';
import {Browser} from '../browser.mjs';
import {initialStatesToDot} from "../export/dot-graph.mjs";


const preludeResource = new FileResource("../prelude.js");
const webPreludeResource = new FileResource("../web-prelude.js");

const jsConcSemantics = createSemantics(concLattice, {errors: true});
const jsTypeSemantics = createSemantics(typeLattice, {errors:true});


let c = 0;

function concMachine()
{
  return initializeMachine(jsConcSemantics, concAlloc, concKalloc, preludeResource, webPreludeResource);
}

function typeMachine()
{
  const system0 = initializeMachine(jsTypeSemantics, concAlloc, concKalloc, preludeResource, webPreludeResource);
  system0.alloc = tagAlloc;
  system0.kalloc = aacKalloc;
  return system0;
}

function run(resource, system0, cc)
{
  const jsContext = new JsContext(system0.semantics, system0.endState.store, system0.endState.kont, system0.alloc, system0.kalloc);
  const browser = new Browser(jsContext);
  browser.parse(resource);
  const result = jsContext.globalObject().getProperty("$result$");
  return jsContext.system();
}

function runSource(src, machine, cc)
{
  return run(new StringResource(src), machine, cc);
}

function runFile(path, machine, cc)
{
  return run(new FileResource(path), machine, cc);
}

//run("<body><div id='hopla'></div><script>$result$ = document.getElementById('hopla').id</script></body>", "hopla");


const system = runFile("resources/html/scull4.html", 
	typeMachine(), {pruneGraph: false});
const initialStates = system.initialStates;
const dot = initialStatesToDot(initialStates);
fs.writeFileSync('webGraph.dot', dot);
