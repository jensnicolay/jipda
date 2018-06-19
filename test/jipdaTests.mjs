import fs from 'fs';

import {assertEquals, assert} from '../common';
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';
import typeLattice from "../type-lattice";
import aacKalloc from "../aac-kalloc";
import tagAlloc from "../tag-alloc";

const read = name => fs.readFileSync(name).toString();

const ast0src = read("../prelude.js");

const jsConcSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const s0Conc = computeInitialCeskState(jsConcSemantics, ast0src);

const jsPreludeTypeSemantics = createSemantics(typeLattice, concAlloc, concKalloc, {errors:true});
const s0Type = computeInitialCeskState(jsPreludeTypeSemantics, ast0src);
const jsTypeSemantics = createSemantics(typeLattice, tagAlloc, aacKalloc, {errors:true});

let c = 0;

function run(src, expected)
{
  console.log(++c + "\t" + src.substring(0, 80).replace(/(\r\n\t|\n|\r\t)/gm, ' '));

  process.stdout.write("conc ");
  const s1Conc = s0Conc.switchMachine(jsConcSemantics, {hardAsserts: true});
  const s2Conc = s1Conc.enqueueScriptEvaluation(src);
  let actualConc = jsConcSemantics.lat.bot();
  const systemConc = explore([s2Conc], s =>
  {
    if (isSuccessState(s))
    {
      actualConc = actualConc.join(s.value);
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
  if (!concLattice.abst1(expected).equals(actualConc))
  {
    throw new Error("expected " + expected + ", got " + actualConc);
  }

  process.stdout.write("type ");
  const s1Type = s0Type.switchMachine(jsTypeSemantics, {hardAsserts: true});
  const s2Type = s1Type.enqueueScriptEvaluation(src);
  let actualType = jsTypeSemantics.lat.bot();
  const systemType = explore([s2Type], s => {
    if (isSuccessState(s))
    {
      actualType = actualType.join(s.value);
    }
    else if (s.isThrowState)
    {
      console.warn(s.value + "\n" + s.value.addresses().map(addr => s.store.lookupAval(addr).lookup(jsTypeSemantics.lat.abst1("message")).value.Value).join());
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
  if (!actualType.subsumes(jsTypeSemantics.lat.abst1(expected)))
  {
    throw new Error(actualType + " does not subsume " + expected);
  }

  console.log();
}

function runEval(...tests)
{
  for (const t of tests)
  {
    run(t, eval(t));
  }
}


run("42", 42);
run("undefined", undefined);
run("41; 42;", 42);
run("var a = 1;", undefined);
run("var a = 1; a;", 1);
run("var a = 2; a+a;", 4);
run("var a = 2, b = 3; a*b;", 6);
run("var a = 3, b = 4, c = 5; a-b-c;", -6);
run("var a = 4; a = 5; a;", 5);
run("function f(){}; f()", undefined);
run("var pi = function () {return 3;}; pi(); pi();", 3);
run("function pi() {return 3;}; pi(); pi();", 3);
run("var sq = function (x) {return x * x;}; sq(5);", 25);
run("function sq(x) {return x * x;}; sq(5);", 25);
run("var sq = function (x) {return x * x;}; sq(5); sq(6);", 36);
run("var z = false; var writez = function () { z = 123; }; var readz = function() { return z; }; writez();", undefined);
run("var z = false; var writez = function () { z = 123; }; var readz = function() { return z; }; writez(); readz();", 123);
run("var f = function (x) { return function (y) { return x + y; }; }; f(1)(2);", 3);
runEval("0 === 0", "0 !== 0", "1 === 0", "1 !== 0");
runEval("3<4","3<=4","3>4","3>=4", "3<3", "3<=3", "3>3", "3>=3", "4<3", "4<=3", "4>3", "4>=3");
run("var f = function() { if (0 === 0) { return 'true'; } else { return 'false' }}; f();", "true");
run("var f = function() { if (0 !== 0) { return 'true'; } else { return 'false' }}; f();", "false");
run("var f = function() { if (0 === 0) { if (0 === 1) { return 'true1';} else { return 'false1';}} else { return 'false';}}; f();", "false1");
run("var f = function() { if (0 === 0) { return 'true'; } return 'false'}; f();", "true");
run("var f = function() { if (0 !== 0) { return 'true'; } return 'false'}; f();", "false");
run("var count = function (n) {if (n===0) {return 'done';} else {return count(n-1);}}; count(20);", "done");
run("[1,2,3].concat([4,5])[0]", 1);
run("[1,2,3].concat([4,5])[1]", 2);
run("[1,2,3].concat([4,5])[2]", 3);
run("[1,2,3].concat([4,5])[3]", 4);
run("[1,2,3].concat([4,5])[4]", 5);
run("[1,2,3].concat([4,5]).length", 5);
run("function f() { return [1,2] }; f().concat([3,4,5]).length;", 5);
run("function f() { return [1,2] }; f().concat([3,4,5])[0];", 1);
run("function f() { return [1,2] }; f().concat([3,4,5])[4];", 5);
run("var appender=function (h, a, b) {return h(a).concat(h(b))}; var lister=function (g) {return function (x) { return [g(x)]; };}; var square=function (y) { return y*y;}; appender(lister(square), 42, 43)[0];", 1764);
run("var appender=function (h, a, b) {return h(a).concat(h(b))}; var lister=function (g) {return function (x) { return [g(x)]; };}; var square=function (y) { return y*y;}; appender(lister(square), 42, 43)[1];", 1849);
//      runStr("var z = []; var appender=function (h, a, b) {return h(a).concat(h(b));}; var lister=function (g) {return function (x) { return [g(x)]; };}; var conser=function (y) { z = [y, z]; return z;}; appender(lister(conser), 42, 43);", "[[42,[]],[43,[42,[]]]]");
run("var z=0; var f=function () {z=z+1;}; f(); f(); f(); f(); z;", 4);
run("var z=0; var f=function (i) { if (i<4) {z=z+1;f(i+1);}}; f(0); z;", 4);
run("var z=0; var s=0; var f=function (i) {if (z === 7) {s=s+1} if (i<10) {z=z+1;f(i+1);}}; f(0); s;", 1);
run("var z=0; var c=false; var f=function (i) {if (z === 7) {c=true} if (i<10) {z=z+1;f(i+1);}}; f(0); c;", true);
run("var z=0; var c=false; var f=function (i) {if (z === 7) {c=true} if (i<10) {z=z+1;f(i+1);}}; f(0); z;", 10);
//      runStr("var o = {}; o;", "{}");
//      runStr("var o = {x:3,y:4}; o;", "{y:4,x:3}"); // TODO: order follows environments (cons)
run("var o = {x:3,y:4}; o.y;", 4);
run("var o = {square:function (x) {return x*x;}}; o.square(4);", 16);
run("var o = {x:3}; o.x=4; o.x;", 4);
run("var o = {x:3}; o.x=4; o.x=5; o.x;", 5);
run("var o = {x:3}; var p = {y:o}; p.y.x;", 3);
run("var o = {x:3}; var p = o; p.x;", 3);
// module.test36 = // TODO: needs correct Array.proto.toString
//     run("var o={z:[]}; var appender=function (h, a, b) {return h(a).concat(h(b))}; var lister=function (g) {return function (x) { return [g(x)]; };}; var conser=function (y) { o.z = [y, o.z]; return o.z;}; appender(lister(conser), 42, 43).toString()", "42,,43,42,");
run("var x=0; var o = {x:3, f:function() {return x;}}; o.f();", 0);
run("function sq(x) {return x*x;}; sq(5); sq(6);", 36);
run("function C() { this.x = 42; } var o = new C(); o.x;", 42);
run("function C(xx) { this.x = xx; } var o = new C(43); o.x;", 43);
run("function C(xx) { this.x = xx; } var o = new C(43); var oo = new C(42); oo.x + o.x;", 85);
run("function C(xx) { this.x = xx; } var o = new C(43); var oo = new C(42); o.x = oo.x; o.x;", 42);
run("function C(n) {var nn=n; this.f=function () {nn=nn+1;return nn;}}; var o=new C(3); o.f(); o.f(); o.f();", 6);
run("function C(n) {this.nn=n; this.f=function () {this.nn=this.nn+1;return this.nn;}}; var o=new C(30); o.f(); o.f(); o.f();", 33);
run("function C(n) {var self=this; self.nn=n; self.f=function () {self.nn=self.nn+1;return this.nn;}}; var o=new C(300); o.f(); o.f(); o.f();", 303);
run("var n = 123;function HotDog(){this.n = 456;this.getN = function () { return n; };}; var myHotDog = new HotDog(); myHotDog.getN();", 123);
run("var n = 123;function HotDog(){this.n = 456;this.getN = function () { return this.n; };}; var myHotDog = new HotDog(); myHotDog.getN();", 456);
run("var n = 123;function HotDog(){this.n = 456;this.getN = function () { return this.n; };}; var myHotDog = new HotDog(); var x = myHotDog.getN;x();", 123);
run("var o={f:function() { return this;}}; o.f() === o;", true);
run("var o={f:function() { return this;}}; ((function() {return o;})()).f() === o;", true);
run("var o={f:function() { return this;}}; var x = o.f; x() === this;", true);
run("var H = function () {this.f=function () {this.getN=function () {return 999;}}};var m=new H(); var m2=new m.f(); m2.getN();", 999);
run("var n=123;function H() {this.n=456;this.f=function () {this.n=789;this.getN=function () {return this.n;}}};var m=new H();var m2=new m.f();m2.getN();", 789);
run("var n=123;function H(){this.n=456;this.f=function () {this.n=789;this.getN=function () {return this.n;}};this.m=new this.f();this.x=this.m.getN;this.nn=this.x()};var m2=new H();m2.nn;", 456);
run("var Foo = {}; Foo.method = function() { function test() { return this; }; return test();}; this === Foo.method();", true); // strict: false
run("var Foo = {}; Foo.method = function() { var that=this; function test() { return that; }; return test();}; this === Foo.method();", false);
run("var Foo = {}; Foo.method = function() { var that=this; function test() { return that; }; return test() === this;}; Foo.method();", true);
run("function C() { var x=3; this.y=4; }; var o = new C(); o.x;", undefined);
run("function C() { var x=3; this.y=4; this.f=function() { return x + this.y}}; var o = new C(); o.f();", 7);
//        run("function C() { var x=3; this.y=4; this.f=function() { return x + y}}; var o = new C(); o.f();", undefined);
run("function C() { var x=3; this.y=4; this.f=function() { return this.x}}; var o = new C(); o.f();", undefined);
run("var o={}; var i=5; o[0]=1;o[2*3]=2; o[i+1]+o[0];", 3);
run("var o={}; var i=5; function f1() {o[0]=1}; function f2() {return o[2*3]=2}; f1(); f2();", 2);
run("var o=[]; var i=5; function f1() {o[0]=1}; function f2() {return o[2*3]=2}; f1(); f2();", 2);
run("function Circle(radius) {this.radius = radius;}; Circle.prototype.y=123;Circle.prototype.y;", 123);
run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.y=123;Circle.prototype.y;", 123);
run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1); x.n;", 123);
//      run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1);var y=new Circle(2);", 123); // TODO: LVPS
run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1);var y=new Circle(2);x.radius+y.radius;", 3);
run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1);x.n;", 123);
run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.area=function () { return 3*this.radius*this.radius;}; var x=new Circle(3), y=new Circle(4); x.area()", 27);
run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.area=function () { return 3*this.radius*this.radius;}; var x=new Circle(3), y=new Circle(4); y.area()", 48);
run("var Circle=function (radius) {return function() {return radius}}; var x=new Circle(432);x();", 432);
run("var z = 0; z++;", 0);
run("var z = 0; ++z;", 1);
run("var z = 0; z++; z;", 1);
run("var z = 0; ++z; z;", 1);
run("var z = 3; z++ + z;", 7);
run("var z = 3; ++z + z;", 8);
run("var o = {x:3}; o.x++;", 3);
run("var o = {x:3}; ++o.x;", 4);
run("var o = {x:3}; o.x++; o.x;", 4);
run("var o = {x:3}; ++o.x; o.x;", 4);
run("var o = {x:3}; o.x++ + o.x;", 7);
run("var o = {x:3}; ++o.x + o.x;", 8);
//     run("var o={x:3}; var f=function() {return o}; f()['x']++ + o.x;", 7);
//     run("var o={x:3}; var f=function() {return o}; ++f()['x'] + o.x;", 8);
run("for (var i=0; i<3; i++) i;", 2);
run("for (var i=0; i<3; i++) i; i;", 3);
run("for (var i=0; false; i++) 123; i;", 0);
run("for (var i=0; false; i++) 123;", undefined);
run("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar.length", 10);
run("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar[0]+ar[1]+ar[2]+ar[3]+ar[4]+ar[5]", 0+1+2+3+4+5);
run("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar[9]", 9);
run("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar[10]", undefined);
run("function Xyz(n) { this.n = n }; var p = Xyz; p(123); n;", 123);
run("Object.prototype === Function.prototype", false);
run("Function.prototype === String.prototype", false);
run("String.prototype === Object.prototype", false);
run("Array.prototype === Function.prototype", false);
run("Array.prototype === String.prototype", false);
run("Array.prototype === Object.prototype", false);
run("var o = new Object(); Object.prototype.a = 123; o.a;", 123);
run(read("resources/tajs2009.js"), "jens");
run("[].xyz;", undefined);
run("({}).xyz;", undefined);
run("(function () {}).xyz;", undefined);
run("var x = []; x.push(1); x[0]", 1);
run("var x = []; x.push(1); x.length;", 1);
run("var x;", undefined);
run("var b = 3; if (b) 1; else 2;", 1);
run("var b; if (b) 1; else 2;", 2);
run("var b = 0; if (b) 1; else 2;", 2);
run("var b = null; if (b) 1; else 2;", 2);
run("var b = NaN; if (b) 1; else 2;", 2);
run("var b = ''; if (b) 1; else 2;", 2);
run("var b = 'gvd'; if (b) 1; else 2;", 1);
run("var b = -23; b;", -23);
run("try { throw 42 } catch (e) { 43 }", 43);
run("try { throw 42 } catch (e) { e }", 42);
run("try { 123 } catch (e) { e }", 123);

// FIXME run("var glob=[]; try { try {throw new Error('oops')} finally {glob.push(1)}} catch (ex) {glob.push(ex.message)};glob[0] + glob[1]", "1oops");

run("try {123} finally {456}", 123);
run("(new Array()).length", 0);
run("var a = new Array(10); a.length", 10);
run("var a = new Array(10); a[3] = 3; a.length", 10);
run("var a = []; a[3] = 3; a.length", 4);
runEval("0 || 1", "1 || 0", "0 && 1", "1 && 0", "true || false", "false || true", "true && false", "false && true");
run("var a = 0; for (var i = 0; i < 10; i++); a = 1; a;", 1);
run("var i = 0; for (; i < 3; i++) {i}", 2);
run(read("resources/loopy1.js"), true);
run(read("resources/loopy2.js"), true);
run(read("resources/nssetup.js"), true);
run("undefined === undefined", true);
run("undefined === null", false);
run("undefined === true", false);
run("undefined === false", false);
run("undefined === 'abc'", false);
run("undefined === +0", false);
run("undefined === -0", false);
run("undefined === NaN", false);
run("undefined === +Infinity", false);
run("undefined === -Infinity", false);

run("null === undefined", false);
run("null === null", true);
run("null === true", false);
run("null === false", false);
run("null === 'abc'", false);
run("null === +0", false);
run("null === -0", false);
run("null === NaN", false);
run("null === +Infinity", false);
run("null === -Infinity", false);

run("true === undefined", false);
run("true === null", false);
run("true === true", true);
run("true === false", false);
run("true === 'abc'", false);
run("true === +0", false);
run("true === -0", false);
run("true === NaN", false);
run("true === +Infinity", false);
run("true === -Infinity", false);

run("false === undefined", false);
run("false === null", false);
run("false === true", false);
run("false === false", true);
run("false === 'abc'", false);
run("false === +0", false);
run("false === -0", false);
run("false === NaN", false);
run("false === +Infinity", false);
run("false === -Infinity", false);

run("'abc' === undefined", false);
run("'abc' === null", false);
run("'abc' === true", false);
run("'abc' === false", false);
run("'abc' === 'abc'", true);
run("'abc' === +0", false);
run("'abc' === -0", false);
run("'abc' === NaN", false);
run("'abc' === +Infinity", false);
run("'abc' === -Infinity", false);

run("+0 === undefined", false);
run("+0 === null", false);
run("+0 === true", false);
run("+0 === false", false);
run("+0 === 'abc'", false);
run("+0 === +0", true);
run("+0 === -0", true);
run("+0 === NaN", false);
run("+0 === +Infinity", false);
run("+0 === -Infinity", false);

run("-0 === undefined", false);
run("-0 === null", false);
run("-0 === true", false);
run("-0 === false", false);
run("-0 === 'abc'", false);
run("-0 === +0", true);
run("-0 === -0", true);
run("-0 === NaN", false);
run("-0 === +Infinity", false);
run("-0 === -Infinity", false);

run("NaN === undefined", false);
run("NaN === null", false);
run("NaN === true", false);
run("NaN === false", false);
run("NaN === 'abc'", false);
run("NaN === +0", false);
run("NaN === -0", false);
run("NaN === NaN", false);
run("NaN === +Infinity", false);
run("NaN === -Infinity", false);

run("+Infinity === undefined", false);
run("+Infinity === null", false);
run("+Infinity === true", false);
run("+Infinity === false", false);
run("+Infinity === 'abc'", false);
run("+Infinity === +0", false);
run("+Infinity === -0", false);
run("+Infinity === +Infinity", true);
run("+Infinity === -Infinity", false);

run("-Infinity === undefined", false);
run("-Infinity === null", false);
run("-Infinity === true", false);
run("-Infinity === false", false);
run("-Infinity === 'abc'", false);
run("-Infinity === +0", false);
run("-Infinity === -0", false);
run("-Infinity === +Infinity", false);
run("-Infinity === -Infinity", true);
run("function F() { }; F.prototype.constructor === F", true);
run("function F(x) { this.x = x }; var f = new F(123); f.constructor === F.prototype.constructor", true);
run("Object.getPrototypeOf(Object.prototype)", null);
run("function F() {}; var f = new F(); Object.getPrototypeOf(f) === F.prototype", true);
run("Object.prototype.constructor === Object", true);
run("Function.prototype.constructor === Function", true);
run("Array.prototype.constructor === Array", true);
run("var o = {}; var oo = Object.create(o); Object.getPrototypeOf(oo) === o;", true);
run("function S() {}; S.prototype.x = 123; function F() {};  F.prototype = Object.create(S.prototype); var f = new F(); f.x", 123);
run("var o = Object.create(null); Object.getPrototypeOf(o) === null", true);
run("var o = {}; Object.getPrototypeOf(o) === Object.prototype", true);
run("var o = {}; o.constructor === Object", true);
//      run("switch (123) {}", undefined);
//      run("switch (1) {case 1: 999}", 999);
//      run("switch (1) {case 0: 888; case 1: 999}", 999);
//      run("switch (1) {case 0: 888; case 1: 999; case 2: 666}", 666);
//      run("switch (1) {default: 999}", 999);
//      run("switch (1) {case 0: 888; default: 999}", 999);
//      run("switch (1) {case 0: 888; default: 999; case 2: 666}", 666);
//      run("switch (1) {case 1: 999; break;}", 999);
//      run("switch (1) {case 1: 999; case 2: break;}", 999);
//      run("switch (1) {case 1: 999; case 2: break; default: 666}", 999);
//      run("switch (1) {case 0: 888; default: 999; break; case 1: 666;}", 666);
//      run("function f() {switch(1) {case 1: return 999 }}; f();", 999);
//      run("function f() {switch(1) {case 0: return 888; case 1: return 999 }}; f();", 999);
//      run("{999}", 999);
//      run("{42; 43;}", 43);
//      run("ll:{42; break ll; 43;}", 42);
run("function f(){return a;function a(){return 1};var a=4;function a(){return 2;}}; f()();", 2);
run("function f(){return a;var a=4;function a(){return 1};function a(){return 2;}}; f()();", 2);
run("function f(){var a=4;function a(){return 1};function a(){return 2;};return a;}; f();", 4);
run("var foo = 1; function bar() { if (!foo) { var foo = 10; } return foo;} bar();", 10);
run("var a = 1; function b() { a = 10; return; function a() {}}; b(); a;", 1);
run("[].map(function () {}).length", 0);
run("[3].map(function (x) {return x*x}).length", 1);
run("[3].map(function (x) {return x*x})[0]", 9);
run("[3,4].map(function (x) {return x*x}).length", 2);
run("[3,4].map(function (x) {return x*x}).length", 2);
run("[3,4].map(function (x) {return x*x})[1]", 16);
run("var arr=new Array(10); arr.map(function () {return 123}).length", 10);
run("var arr=new Array(3); arr.map(function () {return 123})[1]", undefined);
//run("var x=1; function f() { var x=2; return [9,9,9].map(function () {return this.x})}; f()[0];", 1); // non-strict only
run("var x=1; function f() { var x=2; return [9,9,9].map(function () {return this.x}, {x:3})}; f()[0];", 3);
run("var ar=[1,2,3].map(function (x) { return x*x*x }); ar[1]", 8);
run("var arr = [1,2,3,4,5,6,7,8,9,10]; function f(x,y) {return x+y}; arr.map(f).toString()", "1,3,5,7,9,11,13,15,17,19");
run("var glob=false; try {[].reduce(function () {})} catch (ex) {glob=true};glob", true);
run("[].reduce(function () {}, 123)", 123);
run("[3].reduce(function (x,y) {return x+y})", 3);
run("[3].reduce(function (x,y) {return x+y}, 4)", 7);
run("[3,4].reduce(function (x,y) {return x+y})", 7);
run("[3,4].reduce(function (x,y) {return x+y}, 5)", 12);
run("function Circle(x,y,r){this.x=x;this.y=y;this.r=r};function area(s){return 3*s.r*s.r};var circles=[[10,100,4],[-10,-10,3],[0,50,5]].map(function (xyr){return new Circle(xyr[0], xyr[1], xyr[2])});var totalArea = circles.map(area).reduce(function (x,y) {return x+y});totalArea", 150);
run("[].filter(function() {return true}).length", 0);
run("[].filter(function() {return false}).length", 0);
run("[1,2,3].filter(function() {return true}).toString()", "1,2,3");
run("[1,2,3].filter(function() {return false}).length", 0);
run("[1,2,3,4,5].filter(function(arg) {return arg%2}).toString()", "1,3,5");
run(read("resources/books.js"), 2);
//     run("for (var i = 0; i < 2000; i++) { 123 }", 123); // bug: throws JS stack overflow
//     run("var a = [1,2,3]; for (var i = 0; i < 900; i++) { a[2] = 123 }", 123); // bug: throws JS stack overflow
run("String()", "");
run("String('123')", "123");
run("String(456)", "456");
run("String(true)", "true");
//      run("new String().length", 0);
//      run("new String('').length", 0);
//      run("new String('123').length", 3);
//      run("String().length", 0);
//      run("''.length", 0);
//      run("'123'.length", 3);
// FIXME timeout run(read("resources/churchNums.js"), true);
run(read("resources/gcIpdExample.js"), 36);
run(read("resources/rotate.js"), "hallo");
run("var fib = function (n) {if (n<2) {return n} return fib(n-1)+fib(n-2)}; fib(4)", 3);
run("function f(n) {if (n === 0) {return 1} else {return n*f(n-1)}}; f(10)", 3628800);
run("function g(){return 1}; function f(n){if (n === 0){return 0} else return f(n-1)+g()}; f(10)", 10);
run("function g() {function f() {return iii}; var iii = 13; return f()}; g()", 13);
run("for (var i = 0; i < 10; i++){if (i === 7){break}}; i", 7);
run("var i = 0; while (i < 10){if (i === 7){break}; i++}; i", 7);
run("var x = 'hela'; for (var i=0; i<4; i++) {x += x}; x", "helahelahelahelahelahelahelahelahelahelahelahelahelahelahelahela");
run("var o={}; o != null", true);
run("var o={}; o != undefined", true);
run("var o={}; o != true", true);
run("var o={}; o != false", true);
run("var o={}; o != 123", true);
run("var o={}; o != 'o'", true);
run("var o={}; var p={}; o != p", true);
run("var o={}; o != o", false);
run("var o={}; o == null", false);
run("var o={}; o == undefined", false);
run("var o={}; o == true", false);
run("var o={}; o == false", false);
run("var o={}; o == 123", false);
run("var o={}; o == 'o'", false);
run("var o={}; var p={}; o == p", false);
run("var o={}; o == o", true);
run(read("resources/return1.js"), 123);
run(read("resources/coen1.js"), 20);
run("var o={}; Object.defineProperty(o, 'x', {value:42}); o.x", 42);
run("var o={}; Object.defineProperty(o, 'x', {value:42}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", false);
run("var o={}; Object.defineProperty(o, 'x', {value:42}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", false);
run("var o={}; Object.defineProperty(o, 'x', {value:42}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", false);
run("var o=Object.create({}, {x:{value:42}}); o.x", 42);
run("var o=Object.create({}, {x:{value:42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", false);
run("var o=Object.create({}, {x:{value:42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", false);
run("var o=Object.create({}, {x:{value:42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", false);
run("var o={x:42}; var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", true);
run("var o={x:42}; var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", true);
run("var o={x:42}; var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", true);
run("var o = Object.defineProperty({}, 'x',{get:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); typeof p.get", "function");
run("var o = Object.defineProperty({}, 'x',{get:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", undefined);
run("var o = Object.defineProperty({}, 'x',{get:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", false);
run("var o = Object.defineProperty({}, 'x',{get:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", false);
run("var o = Object.defineProperty({}, 'x',{set:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); typeof p.set", "function");
run("var o = Object.defineProperty({}, 'x',{set:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", undefined);
run("var o = Object.defineProperty({}, 'x',{set:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", false);
run("var o = Object.defineProperty({}, 'x',{set:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", false);
run("TypeError.prototype instanceof Error", true);
run("TypeError.prototype === Error", false);
run("TypeError.prototype === Error.prototype", false);
run("new TypeError('123').toString()", "TypeError: 123");
run("'123'.toString()", "123");
run("typeof 'abc'", "string");
run("typeof 123", "number");
run("typeof {}", "object");
run("typeof true", "boolean");
run("typeof false", "boolean");
run("typeof undefined", "undefined");
run("typeof null", "object");
run("typeof function () {}", "function");
run("var o = {x:123};o.hasOwnProperty('x')", true);
run("var o = {x:123};o.hasOwnProperty('y')", false);
run("var o = {}; o instanceof Object", true);
run("var glob = []; for (var p in {x:42}) {glob.push(p)}; glob.length===1 && glob[0]==='x'", true);
run("var glob = []; for (var p in {x:42, y:43}) {glob.push(p)}; glob.length===2 && glob.indexOf('x') > -1 && glob.indexOf('y') > -1", true);
run("var x={a:1}; function Y() {this.b=2};Y.prototype=x;var obj=new Y();var glob=[];for (var prop in obj) {glob.push(prop)};glob.length===2 && glob.indexOf('a')>-1 && glob.indexOf('b')>-1", true);
run("function sq(x) {return x*x}; sq.call(null, 4)", 16);
run("function sq(x) {return this}; sq.call(42, 4)", 42);
run("var glob=null;function sq(x) {glob=42}; sq.call(null);glob", 42);
run("function sq(x) {return x*x}; sq.apply(null, [4])", 16);
run("function sq(x) {return this}; sq.apply(42, [4])", 42);
run("var glob=null;function sq(x) {glob=42}; sq.apply(null);glob", 42);
run("function hh(...args) {return args[1]}; hh(41,42,43)", 42);
run("function hh(x, ...args) {return args[1]}; hh(41,42,43)", 43);
run("Object.getOwnPropertyNames({x:42}).toString()", "x");
run("Object.getOwnPropertyNames({}).length", 0);
run("var ps = Object.getOwnPropertyNames({x:42,y:43});ps.length===2 && ps.indexOf('x')>-1 && ps.indexOf('y')>-1", true);
// run("var trees=['redwood','bay','cedar','oak','maple'];0 in trees", true); // TODO: ToPropertyKey
// run("var trees=['redwood','bay','cedar','oak','maple'];3 in trees", true);
// run("var trees=['redwood','bay','cedar','oak','maple'];6 in trees", false);
run("var trees=['redwood','bay','cedar','oak','maple'];'bay' in trees", false);
run("var trees=['redwood','bay','cedar','oak','maple'];'length' in trees", true);
// run("'PI' in Math", true);
run("var mycar = {make: 'Honda', model: 'Accord', year: 1998};'make' in mycar", true);
run("var mycar = {make: 'Honda', model: 'Accord', year: 1998};'model' in mycar", true);
run("var mycar = {make: 'Honda', model: 'Accord', year: 1998};'floeper' in mycar", false);
// run("var color1 = new String('green');'length' in color1", true);
// run("var glob=false;var color2 = 'coral';try{'length' in color1} catch (ex) {glob=true};glob", true);
// module.test119 = TODO: NYI
//       run("var o = Object.defineProperty({}, 'a',{get:function(){return 42}});o.a", 42);
//       run("var o={};var bValue=38;Object.defineProperty(o,'b',{get:function() {return bValue},set:function(newValue) {bValue=newValue},enumerable:true,configurable:true});o.b=42;o.b===bValue", true)
run("var inventory = [{name: 'apples', quantity: 2},{name: 'bananas', quantity: 0},{name: 'cherries', quantity: 5}];function findCherries(fruit) {return fruit.name === 'cherries'};inventory.find(findCherries).quantity", 5);
run("var numbers=[4,2,5,1,3];numbers.sort(function (a, b) {return a - b});numbers[0]===1&&numbers[4]===5", true);
run("var numbers=[4,2,5,1,3];numbers.sort(function (a, b) {return a - b});numbers[0]<numbers[1]&&numbers[1]<numbers[2]&&numbers[2]<numbers[3]&&numbers[3]<numbers[4]", true);
run("var myFish = ['angel','clown','mandarin','sturgeon']; myFish.splice(2, 1);myFish[0]==='angel'&&myFish[1]==='clown'&&myFish[2]==='sturgeon'&&myFish.length===3", true);
run("var o={};!!o", true);
run("var o = {}; Object.prototype.isPrototypeOf(o);", true);
run("var p = {}; var o = Object.create(p); p.isPrototypeOf(o)", true);
run(read("resources/inheritance1.js"), true);
run("aBRaCADabrA".toLowerCase(), "abracadabra");

// 20.1.3
run("Object.getPrototypeOf(Number.prototype) === Object.prototype", true);
run("Object.getPrototypeOf(Number) === Function.prototype", true);
run("Number(2) === 2", true);
run("new Number(2) === 2", false);
