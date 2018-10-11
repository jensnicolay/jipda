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
import typeLattice from "../type-lattice";
import tagAlloc from "../tag-alloc";
import aacKalloc from "../aac-kalloc";


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

  // used to be outside
  const ast0resource = new FileResource("../prelude.js");
  const ast1resource = new FileResource("../web-prelude.js");
  const jsConcSemantics = createSemantics(concLattice, {errors:true});
  const jsTypeSemantics = createSemantics(typeLattice, {errors:true});
  const {store:store0conc, kont:kont0conc} = computeInitialCeskState(jsConcSemantics, concAlloc, concKalloc, ast0resource, ast1resource);
  const {store:store0type, kont:kont0type} = computeInitialCeskState(jsTypeSemantics, concAlloc, concKalloc, ast0resource, ast1resource);

  assert(store0conc);
  assert(kont0conc);
  assert(store0type);
  assert(kont0type);
  //

  // const store0 = store0conc;
  // const kont0 = kont0conc;
  // const lat = concLattice;
  // const sem = jsConcSemantics;
  // const alloc = concAlloc;
  // const kalloc = concKalloc;

  const store0 = store0type;
  const kont0 = kont0type;
  const lat = typeLattice;
  const sem = jsTypeSemantics;
  const alloc = tagAlloc;
  const kalloc = aacKalloc;


  const explorer = new Explorer();
  const jsContext = new JsContext(sem, explorer, alloc, kalloc, store0, kont0);
  const browser = new Browser(jsContext);
  const html = new FileResource("resources/secloud/" + name + ".html");
  const actual = browser.parse(html);
  assertEquals(lat.abst1(expected), actual);

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

//run('h-dc-1', undefined);
run('p1', undefined);
run('p2', undefined);
run('p3', undefined);
run('p4', undefined);
run('p6', undefined);
run('p7', undefined);
run('p8', undefined);
run('p9', undefined);