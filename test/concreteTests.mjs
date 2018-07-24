import fs from 'fs';

import {assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';
import {FileResource, StringResource} from "../ast";

const ast0resource = new FileResource("../prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const s0 = computeInitialCeskState(jsSemantics, ast0resource);

let c = 0;

function run(resource, expected)
{
  console.log("conc " + ++c + "\t" + resource); //src.substring(0, 80).replace(/(\r\n\t|\n|\r\t)/gm, ' '));
  const s1 = s0.switchMachine(jsSemantics, {hardAsserts: true});
  const s2 = s1.enqueueScriptEvaluation(resource);
  let actual = jsSemantics.lat.bot();
  const system = explore([s2], s => {
    if (isSuccessState(s))
    {
      actual = actual.join(s.value);
    }
    else if (s.isThrowState)
    {
      throw new Error(s.value + "\n" + s.value.addresses().map(addr => s.store.lookupAval(addr).lookup(jsSemantics.lat.abst1("message")).value.Value).join());
    }
    else if (s.isErrorState)
    {
      throw new Error(s.node.loc.start.line + ": " + s.msg);
    }
    else
    {
      throw new Error("no progress: " + s);
    }
  });
  assertEquals(concLattice.abst1(expected), actual);
}

function runSource(src, expected)
{
  return run(new StringResource(src), expected);
}


runSource("var z = false; var writez = function () { z = 123; }; var readz = function() { return z; }; [writez(), readz()].toString();", "undefined,123");
runSource("[1,2,3].concat([4,5]).toString()", "1,2,3,4,5");
runSource("function f() { return [1,2] }; f().concat([3,4,5]).toString();", "1,2,3,4,5");
runSource("var appender=function (h, a, b) {return h(a).concat(h(b))}; var lister=function (g) {return function (x) { return [g(x)]; };}; var square=function (y) { return y*y;}; appender(lister(square), 42, 43).toString();", "1764,1849");
runSource("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.area=function () { return 3*this.radius*this.radius;}; var x=new Circle(3), y=new Circle(4); [x.area(), y.area()].toString();", "27,48"); // TODO arrays
runSource("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar.toString();", "0,1,2,3,4,5,6,7,8,9");
runSource("var x = []; x.push(1); x.toString();", "1");
runSource("var glob=[]; try { try {throw new Error('oops')} finally {glob.push(1)}} catch (ex) {glob.push(ex.message)};glob.toString()", "1,oops");
runSource("var numbers=[4,2,5,1,3];numbers.sort(function (a, b) {return a - b});numbers.toString()", "1,2,3,4,5");
runSource("var myFish = ['angel', 'clown', 'mandarin', 'sturgeon']; myFish.splice(2, 1);myFish.toString()", "angel,clown,sturgeon");
