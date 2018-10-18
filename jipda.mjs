import fs from 'fs';
import argvf from 'minimist';
import Repl from 'repl';
import {decycle} from './lib/cycle';

import concLattice from "./conc-lattice.mjs";
import typeLattice from "./type-lattice";
import createSemantics from "./js-semantics.mjs";
import concAlloc from "./conc-alloc.mjs";
import concKalloc from "./conc-kalloc.mjs";
import {computeInitialCeskState, explore} from "./abstract-machine.mjs";
import {JsContext} from "./js-context.mjs";
import readline from 'readline';
import {Browser} from './browser.mjs';
import tagAlloc from "./tag-alloc";
import aacKalloc from "./aac-kalloc";
import {StateRegistry} from "./abstract-machine";
import {statesToDot} from "./export/dot-graph";
import {FileResource, StringResource} from "./ast";

/*

b   browser
r   JIPDA repl
R   node repl
g   graph
 */

const read = name => fs.readFileSync(name).toString();

const argv = argvf(process.argv.slice(2));

//console.log("::" + JSON.stringify(argv));

const nodeRepl = argv.R;

const json = argv.j;

const graph = argv.g;

const browser = argv.b;

const inputFileName = argv._[0];

const repl = !inputFileName || argv.r;

console.log("input file: " + inputFileName);
console.log("browser: " + browser);
console.log("JSON: " + json);
console.log("graph: " + graph);
console.log("JIPDA repl: " + repl);
console.log("node repl: " + nodeRepl);

let lattice;
let alloc;
let kalloc;
if (argv.lattice === 'type')
{
  lattice = typeLattice;
  alloc = tagAlloc;
  kalloc = aacKalloc;
}
else
{
  lattice = concLattice;
  alloc = concAlloc;
  kalloc = concKalloc;
}

console.log("lattice: " + lattice);

let jsContext = null;

const ast0src = new FileResource("prelude.js");
const ast1src = browser ? new FileResource("web-prelude.js") : new StringResource("");

const jsSemantics = createSemantics(lattice, {errors: true});
const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, concAlloc, concKalloc, ast0src, ast1src);

function Explorer()
{
  this.stateRegistry = new StateRegistry();
}

Explorer.prototype.explore =
    function (initialStates, onEndState)
    {
      return explore(initialStates, onEndState, undefined, undefined, this.stateRegistry);
    }



jsContext = new JsContext(jsSemantics, new Explorer(), alloc, kalloc, store0, kont0);
if (inputFileName)
{
//  const src = read(inputFileName);
  const resource = new FileResource(inputFileName);
  if (browser)
  {
    const browser = new Browser(jsContext);
    const value = browser.parse(resource);
    console.log(value.toString());
  }
  else
  {
    evalPrint(resource);
  }
}

function evalPrint(resource)
{
  const jsValue = jsContext.evaluateScript(resource);
  const value = jsValue.d;
  console.log(value.toString());
}


function finalize()
{
  if (json)
  {
    const stringified = JSON.stringify(decycle(jsContext.explorer.stateRegistry.states));
    const outputFileName = (inputFileName || "jipda") + ".json";
    fs.writeFileSync(outputFileName, stringified);
    console.log("wrote " + outputFileName);
  }
  if (graph)
  {
    const g = statesToDot(jsContext.explorer.stateRegistry.states);
    const outputFileName = (inputFileName || "jipda") + ".dot";
    fs.writeFileSync(outputFileName, g);
    console.log("wrote " + outputFileName);
  }
  if (nodeRepl)
  {
    Repl.start("node> ").context.jsContext = jsContext;
  }
}

if (repl)
{
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function r()
  {
    rl.question('> ', src =>
    {
      if (src === ":q")
      {
        rl.close();
        finalize();
        return;
      }
      evalPrint(new StringResource(src))
      r();
    })
  }
  r();
}
else
{
  finalize();
}




