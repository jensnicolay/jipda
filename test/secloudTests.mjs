import fs from 'fs';

import {ArraySet, assert, assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {Browser} from '../browser';
import {JsContext} from '../js-context';
import {explore, StateRegistry, computeInitialCeskState} from "../abstract-machine";
import {FileResource, nodes, StringResource} from "../ast";
import {initialStatesToDot, visitReachableStates} from "../export/dot-graph";
import {decycle} from "../lib/cycle";
import typeLattice from "../type-lattice";
import tagAlloc from "../tag-alloc";
import aacKalloc from "../aac-kalloc";


const jsConcSemantics = createSemantics(concLattice, {errors:true});
const jsTypeSemantics = createSemantics(typeLattice, {errors:true});
const ast0resource = new FileResource("../prelude.js");
const ast1resource = new FileResource("../web-prelude.js");
const ast2resource = new FileResource("resources/guardia-prelude.js");

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
  const {store:store0conc, kont:kont0conc} = computeInitialCeskState(jsConcSemantics, concAlloc, concKalloc, ast0resource, ast1resource, ast2resource);
  const {store:store0type, kont:kont0type} = computeInitialCeskState(jsTypeSemantics, concAlloc, concKalloc, ast0resource, ast1resource, ast2resource);

  assert(store0conc);
  assert(kont0conc);
  assert(store0type);
  assert(kont0type);
  //


  const store0 = store0conc;
  const kont0 = kont0conc;
  const lat = concLattice;
  const sem = jsConcSemantics;
  const alloc = concAlloc;
  const kalloc = concKalloc;

  // const store0 = store0type;
  // const kont0 = kont0type;
  // const lat = typeLattice;
  // const sem = jsTypeSemantics;
  // const alloc = tagAlloc;
  // const kalloc = aacKalloc;


  const explorer = new Explorer();
  const jsContext = new JsContext(sem, explorer, alloc, kalloc, store0, kont0);
  const browser = new Browser(jsContext);
  const html = new FileResource("resources/secloud/" + name + ".html");
  const actual = browser.parse(html);
  assertEquals(lat.abst1(expected), actual);

  const dotFileName = "resources/secloud/results/" + name + ".dot";
  fs.writeFileSync(dotFileName, initialStatesToDot(explorer.initialStates));
  console.log("written", dotFileName);


  explorer.initialStates.forEach(
      function (s)
      {
        // const ga = [...s.kont.realm.GlobalObject.addresses()][0];
        // const go = s.store.lookupAval(ga);
        // const names = go.names();
        // const globalBindings = [];
        // for (const name of names)
        // {
        //   globalBindings.push({name:name.value, value:go.lookup(name).value.Value});
        // }
        // s.globalBindings = globalBindings;
        s.fundamentalFunctions = {
          applyFunction: jsContext.evaluateScript(new StringResource("Function.prototype.apply")).d
        }
      });

  const states = [];
  visitReachableStates(explorer.initialStates, function (state)
  {
    states.push(state);

    if (state.node)
    {
      nodes(state.node.root || state.node).forEach(function (node) {
        delete node.parent;
        delete node.root;
      })
    }


    if (state.lkont[0] && state.lkont[0].constructor.name === 'OperatorKont' && state.lkont[0].node.arguments.length === 0) {
      console.log(state._id + " " + state.lkont[0].node.toString());
      const operatorValue = state.lkont[0].operatorValue;
      console.log("call " + operatorValue);
      state.functionCall = {operatorValue, operandValues: ArraySet.empty}
    }
    else if (state.lkont[0] && state.lkont[0].constructor.name === 'OperandsKont' && state.lkont[0].node.arguments.length === state.lkont[0].i) {
      console.log(state._id + " " + state.lkont[0].node.toString());
      const operatorValue = state.lkont[0].operatorValue;
      console.log("call " + operatorValue + " " + state.lkont[0].operandValues.addLast(state.value));
      state.functionCall = {operatorValue, operandValues: state.lkont[0].operandValues.addLast(state.value)}
    }
    else if (state.lkont[0] && state.lkont[0].constructor.name === 'MemberKont') {
      if (!state.lkont[0].node.computed) { // static member access?
        console.log(state._id + " " + state.lkont[0].node.toString());
        let target = state.value;
        let property = state.lkont[0].node.property.name;
        console.log("read "+ target + " " + property);
        state.propertyRead = {target, property};
      }
    } else if (state.lkont[0] && state.lkont[0].constructor.name === 'MemberPropertyKont') {
      if (state.lkont[0].node.computed) {
        console.log(state._id + " " + state.lkont[0].node.toString());
        let target = state.lkont[0].objectRef;
        let property = state.value;
        console.log("read "+ target + " " + property);
        state.propertyRead = {target, property};
      }
    } else if (state.lkont[0] && state.lkont[0].constructor.name === 'MemberAssignmentValueKont') {
      console.log(state._id + " " + state.lkont[0].node.toString());
      let target = state.lkont[0].objectRef;
      let property = state.lkont[0].nameValue;
      let newValue = state.value;
      console.log("write "+ target + " " + property + " " + newValue);
      state.propertyWrite = {target, property, newValue};
    }


    if (state.isKontState
        && String(state.lkont[0]).startsWith("rator-")
        && state.lkont[0].node.arguments.length === 0)
    {
    }

    if (state.isKontState
        && String(state.lkont[0]).startsWith("rand-")
        && state.lkont[0].i === state.lkont[0].node.arguments.length)
    {
      // for (const addr of operatorValue.addresses())
      // {
      //   const f = state.store.lookupAval(addr);
      //   for (const c of f.getInternal("[[Call]]").value)
      //   {
      //     console.log(c.node.toString());
      //   }
      // }
    }

    delete state.benv;
    delete state.store;
    delete state.kont;
    state._successors = state._successors.map(s => s._id);
  });

  const jsonFileName = "resources/secloud/results/" + name + ".json";
  fs.writeFileSync(jsonFileName, JSON.stringify(states))//, replacer));
  console.log("written", jsonFileName);
}

function replacer(key, value)
{
  console.log(key + " " + value);
  return value;
}

//run('h-dc-1', undefined);
//
run('p1', undefined);
run('p2', undefined);
run('p3', undefined);
run('p4', undefined);
run('p6', undefined);
run('p7', undefined);
run('p8', undefined);
run('p9', undefined);

 // run('call-test', undefined);