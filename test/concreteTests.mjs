import fs from 'fs';

import {assertEquals} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';

const read = name => fs.readFileSync(name).toString();

const ast0src = read("../prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const s0 = computeInitialCeskState(jsSemantics, ast0src);

let c = 0;

function run(src, expected)
{
  console.log("conc " + ++c + "\t" + src.substring(0, 80).replace(/(\r\n\t|\n|\r\t)/gm, ' '));
  const s1 = s0.switchMachine(jsSemantics, {hardAsserts: true});
  const s2 = s1.enqueueScriptEvaluation(src);
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


run("var z = false; var writez = function () { z = 123; }; var readz = function() { return z; }; [writez(), readz()].toString();", "undefined,123");
run("[1,2,3].concat([4,5]).toString()", "1,2,3,4,5");
run("function f() { return [1,2] }; f().concat([3,4,5]).toString();", "1,2,3,4,5");
run("var appender=function (h, a, b) {return h(a).concat(h(b))}; var lister=function (g) {return function (x) { return [g(x)]; };}; var square=function (y) { return y*y;}; appender(lister(square), 42, 43).toString();", "1764,1849");
run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.area=function () { return 3*this.radius*this.radius;}; var x=new Circle(3), y=new Circle(4); [x.area(), y.area()].toString();", "27,48"); // TODO arrays
run("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar.toString();", "0,1,2,3,4,5,6,7,8,9");
run("var x = []; x.push(1); x.toString();", "1");
run("var glob=[]; try { try {throw new Error('oops')} finally {glob.push(1)}} catch (ex) {glob.push(ex.message)};glob.toString()", "1,oops");
run("var numbers=[4,2,5,1,3];numbers.sort(function (a, b) {return a - b});numbers.toString()", "1,2,3,4,5");
run("var myFish = ['angel', 'clown', 'mandarin', 'sturgeon']; myFish.splice(2, 1);myFish.toString()", "angel,clown,sturgeon");
