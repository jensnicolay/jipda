import fs from 'fs';

import {assert, assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {Browser} from '../browser';
import {JsContext} from '../js-context';
import {explore, StateRegistry, computeInitialCeskState} from "../abstract-machine";
import {FileResource, nodes} from "../ast";
import {initialStatesToDot} from "../export/dot-graph";
import {decycle} from "../lib/cycle";

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
  assertEquals(concLattice.abst1(expected), actual);

  const dotFileName = "resources/secloud/results/" + name + ".dot";
  fs.writeFileSync(dotFileName, initialStatesToDot(explorer.initialStates));
  console.log("written", dotFileName);


  const states = explorer.stateRegistry.states;
  states.forEach(function (state)
  {
    delete state.benv;
    delete state.store;
    delete state.kont;

    if (state.node)
    {
      nodes(state.node.root || state.node).forEach(function (node) {
        delete node.parent;
        delete node.root;
      })
    }

    state._successors = state._successors.map(s => s._id);
  });
  const states2 = states;//decycle(states);

  const jsonFileName = "resources/secloud/results/" + name + ".json";
  fs.writeFileSync(jsonFileName, JSON.stringify(states2));
  console.log("written", jsonFileName);
}

run('h-dc-1', undefined);
