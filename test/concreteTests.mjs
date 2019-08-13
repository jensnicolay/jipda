import {assertEquals} from '../common.mjs';
import concLattice from '../conc-lattice.mjs';
import concAlloc from '../conc-alloc.mjs';
import concKalloc from '../conc-kalloc.mjs';
import createSemantics from '../js-semantics.mjs';
import {initializeMachine, createEvalMachine, isSuccessState} from '../abstract-machine.mjs';
import {FileResource, StringResource} from "../ast.mjs";

const preludeResource = new FileResource("../prelude.js");
const jsSemantics = createSemantics(concLattice, {errors: true});
const machine = createEvalMachine(initializeMachine(jsSemantics, concAlloc, concKalloc, preludeResource));

let c = 0;

function run(resource, expected)
{
  console.log("conc " + ++c + "\t" + resource); //src.substring(0, 80).replace(/(\r\n\t|\n|\r\t)/gm, ' '));
  const system = machine.explore(resource);
  const actual = [...system.endStates].reduce((result, s) => isSuccessState(s) ? result.join(s.value) : result, jsSemantics.lat.bot());
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

console.log("done");