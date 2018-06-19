import fs from 'fs';

import {assert, assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {Browser} from '../browser';
import {JsContext} from '../js-context';
import {explore, StateRegistry, computeInitialCeskState} from "../abstract-machine.mjs";
import dotGraph from '../export/dot-graph';

const read = name => fs.readFileSync(name).toString();
const ast0src = read("../prelude.js");
const ast1src = read("../web-prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0src, ast1src);

assert(store0);
assert(kont0);

function Explorer()
{
  this.stateRegistry = new StateRegistry();
}

Explorer.prototype.explore =
    function (initialStates, onEndState)
    {
      return explore(initialStates, onEndState, undefined, undefined, this.stateRegistry);
    }


let c = 0;

function run(name, expected)
{
  console.log(++c + "\t" + name);
  const explorer = new Explorer();
  const jsContext = new JsContext(jsSemantics, explorer, store0, kont0);
  const browser = new Browser(jsContext);
  //const html1 = fs.readFileSync("resources/secloud/" + name + ".js");
  const html =
      "<html>\n" +
      "<body>\n" +
      "</body>\n" +
      "<script src=\"resources/secloud/" + name + ".js\"></script>\n" +
      "</html>"
  const actual = browser.parse(html);
  const states = explorer.stateRegistry.states;
  const dot = dotGraph(states);
  fs.writeFileSync("resources/secloud/" + name + ".dot", dot);
  assertEquals(concLattice.abst1(expected), actual);
}

run('h-dc-1', undefined);
