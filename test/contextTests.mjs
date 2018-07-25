import {assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {} from '../jipda';
import {Browser} from '../browser';
import {FileResource} from '../ast';
import {JsContext} from '../js-context';
import {computeInitialCeskState} from "../abstract-machine.mjs";

const ast0resource = new FileResource("../prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const {store:store0, kont:kont0} = computeInitialCeskState(jsSemantics, ast0resource);

let c = 0;

function run(f, expected)
{
  console.log("test " + c++ + "\n");
  const jsContext = new JsContext(jsSemantics, store0, kont0);
  const actual = f(jsContext);
  assertEquals(concLattice.abst1(expected), actual);
}


run(context => {
  return context.semantics.lat.abst1(undefined);
}, undefined);

run(context => {
  context.createFunction();

  return context.semantics.lat.abst1(undefined);
}, undefined);
