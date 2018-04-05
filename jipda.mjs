import fs from 'fs';
import argvf from 'minimist';
import Repl from 'repl';

import concLattice from "./conc-lattice.mjs";
import typeLattice from "./type-lattice";
import createSemantics from "./js-semantics.mjs";
import concAlloc from "./conc-alloc.mjs";
import concKalloc from "./conc-kalloc.mjs";
import {computeInitialCeskState, Explorer} from "./abstract-machine.mjs";
import {JsContext} from "./js-context.mjs";
import readline from 'readline';
import {Browser} from './browser.mjs';
import dotGraph from './export/dot-graph.mjs';
import tagAlloc from "./tag-alloc";
import aacKalloc from "./aac-kalloc";

/*

b   browser
r   JIPDA repl
R   node repl
g   graph
 */

const read = name => fs.readFileSync(name).toString();

const argv = argvf(process.argv.slice(2));

const nodeRepl = argv.R;

const graph = argv.g;

const browser = argv.b;

const inputFileName = argv._[0];

const repl = !inputFileName || argv.r;

console.log("input file: " + inputFileName);
console.log("browser: " + browser);
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

function evalPrint(src)
{
  const jsValue = jsContext.evaluateScript(src);
  const value = jsValue.d;
  console.log(value.toString());
}

const ast0src = read("prelude.js");
const ast1src = browser ? read("web-prelude.js") : "";

const jsPreludeSemantics = createSemantics(lattice, concAlloc, concKalloc, {errors: true});
const {store:store0, kont:kont0} = computeInitialCeskState(jsPreludeSemantics, ast0src, ast1src);

const jsSemantics = createSemantics(lattice, alloc, kalloc, {errors:true});
jsContext = new JsContext(jsSemantics, new Explorer(), store0, kont0);
if (inputFileName)
{
  const src = read(inputFileName);
  if (browser)
  {
    const browser = new Browser(jsContext);
    const value = browser.parse(src);
    console.log(value.toString());
  }
  else
  {
    evalPrint(src);
  }
}

function finalize()
{
  if (graph)
  {
    const g = dotGraph(jsContext.explorer.stateRegistry.states);
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
      evalPrint(src)
      r();
    })
  }
  r();
}
else
{
  finalize();
}




