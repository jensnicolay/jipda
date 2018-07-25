import fs from 'fs';

import {assert, assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {Browser} from '../browser';
import {JsContext} from '../js-context';
import {explore, StateRegistry, computeInitialCeskState} from "../abstract-machine";
import {FileResource} from "../ast";
import {initialStatesToDot} from "../export/dot-graph";

const ast0resource = new FileResource("../prelude.js");
const ast1resource = new FileResource("../web-prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0resource, ast1resource);

assert(store0);
assert(kont0);

function Explorer()
{
  this.stateRegistry = new StateRegistry();
  this.initialStates = [];
}

Explorer.prototype.explore =
    function (initialStates, onEndState)
    {
      const system = explore(initialStates, onEndState, undefined, undefined, this.stateRegistry);
      system.initialStates.forEach(s => this.initialStates.push(s));
      return system;
    }


let c = 0;

function run(name, expected)
{
  console.log(++c + "\t" + name);
  const explorer = new Explorer();
  const jsContext = new JsContext(jsSemantics, explorer, store0, kont0);
  const browser = new Browser(jsContext);
  //const html1 = fs.readFileSync("resources/secloud/" + name + ".js");
  const html = new FileResource("resources/secloud/" + name + ".html");
  const actual = browser.parse(html);
  const initialStates = explorer.initialStates;
  const dot = initialStatesToDot(initialStates);
  fs.writeFileSync("resources/secloud/" + name + ".dot", dot);
  assertEquals(concLattice.abst1(expected), actual);
}

run('h-dc-1', undefined);
