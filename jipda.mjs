import fs from 'fs';
import concLattice from "./conc-lattice.mjs";
import createSemantics from "./js-semantics.mjs";
import concAlloc from "./conc-alloc.mjs";
import concKalloc from "./conc-kalloc.mjs";
import {computeInitialCeskState} from "./abstract-machine.mjs";
import {JsContext} from "./js-context.mjs";
import readline from 'readline';
import {Browser} from "./browser.mjs";

const read = name => fs.readFileSync(name).toString();

const args = process.argv;
let repl = false;
let jsContext = null;
let browser = null;

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
  jsContext = new JsContext(jsSemantics, store0, kont0);
  repl = true;
}
else if (args.length === 3)
{
  const ast0src = read("prelude.js");
  const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
  const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0src);
  jsContext = new JsContext(jsSemantics, store0, kont0);
  const src = read(args[2]);
  evalPrint(src);
}
else if (args.length === 4)
{
  const ast0src = read("prelude.js");
  const options = args[2].split('');

  const o_browser = options.includes('b');

  const ast1src = o_browser ? read("web-prelude.js") : "";
  const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
  const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0src, ast1src);
  jsContext = new JsContext(jsSemantics, store0, kont0);
  const src = read(args[3]);
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
  repl = options.includes('r');
}
else
{
  throw new Error();
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
      evalPrint(src)
      r();
    })
  }
  r();
 // rl.close();
}