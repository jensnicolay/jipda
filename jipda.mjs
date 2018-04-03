import fs from 'fs';
import concLattice from "./conc-lattice.mjs";
import createSemantics from "./js-semantics.mjs";
import concAlloc from "./conc-alloc.mjs";
import concKalloc from "./conc-kalloc.mjs";
import {computeInitialCeskState, Explorer} from "./abstract-machine.mjs";
import {JsContext} from "./js-context.mjs";
import readline from 'readline';
import {Browser} from './browser.mjs';
import dotGraph from './export/dot-graph.mjs';

/*

b   browser
r   repl
g   graph

 */

const read = name => fs.readFileSync(name).toString();

const args = process.argv;
let repl = false;
let jsContext = null;
let browser = null;
let graph;
let inputFileName;

function evalPrint(src)
{
  const jsValue = jsContext.evaluateScript(src);
  const value = jsValue.d;
  console.log(value.toString());
}

if (args.length === 2)
{
  const ast0src = read("prelude.js");
  const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
  const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0src);
  jsContext = new JsContext(jsSemantics, new Explorer(), store0, kont0);
  repl = true;
}
else if (args.length === 3)
{
  const ast0src = read("prelude.js");
  const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
  const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0src);
  jsContext = new JsContext(jsSemantics, new Explorer(), store0, kont0);
  const src = read(args[2]);
  evalPrint(src);
}
else if (args.length === 4)
{
  const options = args[2].split('');
  inputFileName = args[3];
  const ast0src = read("prelude.js");
  graph = options.includes('g');
  const o_browser = options.includes('b');
  repl = options.includes('r');

  const ast1src = o_browser ? read("web-prelude.js") : "";
  const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
  const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0src, ast1src);
  jsContext = new JsContext(jsSemantics, new Explorer(), store0, kont0);
  const src = read(inputFileName);
  if (o_browser)
  {
    browser = new Browser(jsContext);
    const value = browser.parse(src);
    console.log(value.toString());
  }
  else
  {
    evalPrint(src);
  }
}
else
{
  throw new Error();
}

function finalize()
{
  if (graph)
  {
    const g = dotGraph(jsContext.explorer.stateRegistry.states);
    const outputFileName = inputFileName + ".dot";
    fs.writeFileSync(outputFileName, g);
    console.log("wrote " + outputFileName);
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

