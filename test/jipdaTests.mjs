import fs from 'fs';

import {assertEquals, assert} from '../common';
import {FileResource, StringResource} from "../ast";
import concLattice from '../conc-lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import createSemantics from '../js-semantics';
import {computeInitialCeskState, explore, isSuccessState} from '../abstract-machine';
import typeLattice from "../type-lattice";
import aacKalloc from "../aac-kalloc";
import tagAlloc from "../tag-alloc";

const ast0resource = new FileResource("../prelude.js");

const jsConcSemantics = createSemantics(concLattice, {errors: true});
const jsTypeSemantics = createSemantics(typeLattice, {errors:true});

const s0Conc = computeInitialCeskState(jsConcSemantics, concAlloc, concKalloc, ast0resource);
const s0Type = computeInitialCeskState(jsTypeSemantics, concAlloc, concKalloc, ast0resource);

let c = 0;

function run(resource, expected)
{
  console.log(++c + "\t" + resource);

  process.stdout.write("conc ");
  const s1Conc = s0Conc.switchMachine(jsConcSemantics, concAlloc, concKalloc, {hardAsserts: true});

  const s2Conc = s1Conc.enqueueScriptEvaluation(resource);
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
  const s1Type = s0Type.switchMachine(jsTypeSemantics, tagAlloc, aacKalloc, {hardAsserts: true});
  const s2Type = s1Type.enqueueScriptEvaluation(resource);
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
    if (!actualType.abst().subsumes(jsTypeSemantics.lat.abst1(expected)))
    {
      throw new Error(actualType + " does not subsume " + expected);
    }
    console.warn("required abst on abstract value");
  }

  console.log();
}

function runSource(src, expected)
{
  return run(new StringResource(src), expected);
}

function runFile(path, expected)
{
  return run(new FileResource(path), expected);
}

function runEval(...tests)
{
  for (const t of tests)
  {
    runSource(t, eval(t));
  }
}

runSource("var x = 9; this.x", 9);
runSource("let x = 9; this.x", undefined);

runSource("42", 42);
runSource("undefined", undefined);
runSource("41; 42;", 42);
runSource("var a = 1;", undefined);
runSource("var a = 1; a;", 1);
runSource("var a = 2; a+a;", 4);
runSource("var a = 2, b = 3; a*b;", 6);
runSource("var a = 3, b = 4, c = 5; a-b-c;", -6);
runSource("var a = 4; a = 5; a;", 5);
// runSource("let a = 1;", undefined);
// runSource("let a = 1; a;", 1);
// runSource("let a = 2; a+a;", 4);
// runSource("let a = 2, b = 3; a*b;", 6);
// runSource("let a = 3, b = 4, c = 5; a-b-c;", -6);
// runSource("let a = 4; a = 5; a;", 5);
runSource("function f(){}; f()", undefined);
runSource("var pi = function () {return 3;}; pi(); pi();", 3);
runSource("function pi() {return 3;}; pi(); pi();", 3);
runSource("var sq = function (x) {return x * x;}; sq(5);", 25);
runSource("function sq(x) {return x * x;}; sq(5);", 25);
runSource("var sq = function (x) {return x * x;}; sq(5); sq(6);", 36);
runSource("var z = false; var writez = function () { z = 123; }; var readz = function() { return z; }; writez();", undefined);
runSource("var z = false; var writez = function () { z = 123; }; var readz = function() { return z; }; writez(); readz();", 123);
runSource("var f = function (x) { return function (y) { return x + y; }; }; f(1)(2);", 3);
runEval("0 === 0", "0 !== 0", "1 === 0", "1 !== 0");
runEval("3<4","3<=4","3>4","3>=4", "3<3", "3<=3", "3>3", "3>=3", "4<3", "4<=3", "4>3", "4>=3");
runSource("var f = function() { if (0 === 0) { return 'true'; } else { return 'false' }}; f();", "true");
runSource("var f = function() { if (0 !== 0) { return 'true'; } else { return 'false' }}; f();", "false");
runSource("var f = function() { if (0 === 0) { if (0 === 1) { return 'true1';} else { return 'false1';}} else { return 'false';}}; f();", "false1");
runSource("var f = function() { if (0 === 0) { return 'true'; } return 'false'}; f();", "true");
runSource("var f = function() { if (0 !== 0) { return 'true'; } return 'false'}; f();", "false");
runSource("var count = function (n) {if (n===0) {return 'done';} else {return count(n-1);}}; count(20);", "done");
runSource("[1,2,3].concat([4,5])[0]", 1);
runSource("[1,2,3].concat([4,5])[1]", 2);
runSource("[1,2,3].concat([4,5])[2]", 3);
runSource("[1,2,3].concat([4,5])[3]", 4);
runSource("[1,2,3].concat([4,5])[4]", 5);
runSource("[1,2,3].concat([4,5]).length", 5);
runSource("function f() { return [1,2] }; f().concat([3,4,5]).length;", 5);
runSource("function f() { return [1,2] }; f().concat([3,4,5])[0];", 1);
runSource("function f() { return [1,2] }; f().concat([3,4,5])[4];", 5);
runSource("var appender=function (h, a, b) {return h(a).concat(h(b))}; var lister=function (g) {return function (x) { return [g(x)]; };}; var square=function (y) { return y*y;}; appender(lister(square), 42, 43)[0];", 1764);
runSource("var appender=function (h, a, b) {return h(a).concat(h(b))}; var lister=function (g) {return function (x) { return [g(x)]; };}; var square=function (y) { return y*y;}; appender(lister(square), 42, 43)[1];", 1849);
//      runStr("var z = []; var appender=function (h, a, b) {return h(a).concat(h(b));}; var lister=function (g) {return function (x) { return [g(x)]; };}; var conser=function (y) { z = [y, z]; return z;}; appender(lister(conser), 42, 43);", "[[42,[]],[43,[42,[]]]]");
runSource("var z=0; var f=function () {z=z+1;}; f(); f(); f(); f(); z;", 4);
runSource("var z=0; var f=function (i) { if (i<4) {z=z+1;f(i+1);}}; f(0); z;", 4);
runSource("var z=0; var s=0; var f=function (i) {if (z === 7) {s=s+1} if (i<10) {z=z+1;f(i+1);}}; f(0); s;", 1);
runSource("var z=0; var c=false; var f=function (i) {if (z === 7) {c=true} if (i<10) {z=z+1;f(i+1);}}; f(0); c;", true);
runSource("var z=0; var c=false; var f=function (i) {if (z === 7) {c=true} if (i<10) {z=z+1;f(i+1);}}; f(0); z;", 10);
//      runStr("var o = {}; o;", "{}");
//      runStr("var o = {x:3,y:4}; o;", "{y:4,x:3}"); // TODO: order follows environments (cons)
runSource("var o = {x:3,y:4}; o.y;", 4);
runSource("var o = {square:function (x) {return x*x;}}; o.square(4);", 16);
runSource("var o = {x:3}; o.x=4; o.x;", 4);
runSource("var o = {x:3}; o.x=4; o.x=5; o.x;", 5);
runSource("var o = {x:3}; var p = {y:o}; p.y.x;", 3);
runSource("var o = {x:3}; var p = o; p.x;", 3);
// module.test36 = // TODO: needs correct Array.proto.toString
//     run("var o={z:[]}; var appender=function (h, a, b) {return h(a).concat(h(b))}; var lister=function (g) {return function (x) { return [g(x)]; };}; var conser=function (y) { o.z = [y, o.z]; return o.z;}; appender(lister(conser), 42, 43).toString()", "42,,43,42,");
runSource("var x=0; var o = {x:3, f:function() {return x;}}; o.f();", 0);
runSource("function sq(x) {return x*x;}; sq(5); sq(6);", 36);
runSource("function C() { this.x = 42; } var o = new C(); o.x;", 42);
runSource("function C(xx) { this.x = xx; } var o = new C(43); o.x;", 43);
runSource("function C(xx) { this.x = xx; } var o = new C(43); var oo = new C(42); oo.x + o.x;", 85);
runSource("function C(xx) { this.x = xx; } var o = new C(43); var oo = new C(42); o.x = oo.x; o.x;", 42);
runSource("function C(n) {var nn=n; this.f=function () {nn=nn+1;return nn;}}; var o=new C(3); o.f(); o.f(); o.f();", 6);
runSource("function C(n) {this.nn=n; this.f=function () {this.nn=this.nn+1;return this.nn;}}; var o=new C(30); o.f(); o.f(); o.f();", 33);
runSource("function C(n) {var self=this; self.nn=n; self.f=function () {self.nn=self.nn+1;return this.nn;}}; var o=new C(300); o.f(); o.f(); o.f();", 303);
runSource("var n = 123;function HotDog(){this.n = 456;this.getN = function () { return n; };}; var myHotDog = new HotDog(); myHotDog.getN();", 123);
runSource("var n = 123;function HotDog(){this.n = 456;this.getN = function () { return this.n; };}; var myHotDog = new HotDog(); myHotDog.getN();", 456);
runSource("var n = 123;function HotDog(){this.n = 456;this.getN = function () { return this.n; };}; var myHotDog = new HotDog(); var x = myHotDog.getN;x();", 123);
runSource("var o={f:function() { return this;}}; o.f() === o;", true);
runSource("var o={f:function() { return this;}}; ((function() {return o;})()).f() === o;", true);
runSource("var o={f:function() { return this;}}; var x = o.f; x() === this;", true);
runSource("var H = function () {this.f=function () {this.getN=function () {return 999;}}};var m=new H(); var m2=new m.f(); m2.getN();", 999);
runSource("var n=123;function H() {this.n=456;this.f=function () {this.n=789;this.getN=function () {return this.n;}}};var m=new H();var m2=new m.f();m2.getN();", 789);
runSource("var n=123;function H(){this.n=456;this.f=function () {this.n=789;this.getN=function () {return this.n;}};this.m=new this.f();this.x=this.m.getN;this.nn=this.x()};var m2=new H();m2.nn;", 456);
runSource("var Foo = {}; Foo.method = function() { function test() { return this; }; return test();}; this === Foo.method();", true); // strict: false
runSource("var Foo = {}; Foo.method = function() { var that=this; function test() { return that; }; return test();}; this === Foo.method();", false);
runSource("var Foo = {}; Foo.method = function() { var that=this; function test() { return that; }; return test() === this;}; Foo.method();", true);
runSource("function C() { var x=3; this.y=4; }; var o = new C(); o.x;", undefined);
runSource("function C() { var x=3; this.y=4; this.f=function() { return x + this.y}}; var o = new C(); o.f();", 7);
//        run("function C() { var x=3; this.y=4; this.f=function() { return x + y}}; var o = new C(); o.f();", undefined);
runSource("function C() { var x=3; this.y=4; this.f=function() { return this.x}}; var o = new C(); o.f();", undefined);
runSource("var o={}; var i=5; o[0]=1;o[2*3]=2; o[i+1]+o[0];", 3);
runSource("var o={}; var i=5; function f1() {o[0]=1}; function f2() {return o[2*3]=2}; f1(); f2();", 2);
runSource("var o=[]; var i=5; function f1() {o[0]=1}; function f2() {return o[2*3]=2}; f1(); f2();", 2);
runSource("function Circle(radius) {this.radius = radius;}; Circle.prototype.y=123;Circle.prototype.y;", 123);
runSource("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.y=123;Circle.prototype.y;", 123);
runSource("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1); x.n;", 123);
//      run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1);var y=new Circle(2);", 123); // TODO: LVPS
runSource("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1);var y=new Circle(2);x.radius+y.radius;", 3);
runSource("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1);x.n;", 123);
runSource("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.area=function () { return 3*this.radius*this.radius;}; var x=new Circle(3), y=new Circle(4); x.area()", 27);
runSource("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.area=function () { return 3*this.radius*this.radius;}; var x=new Circle(3), y=new Circle(4); y.area()", 48);
runSource("var Circle=function (radius) {return function() {return radius}}; var x=new Circle(432);x();", 432);
runSource("var z = 0; z++;", 0);
runSource("var z = 0; ++z;", 1);
runSource("var z = 0; z++; z;", 1);
runSource("var z = 0; ++z; z;", 1);
runSource("var z = 3; z++ + z;", 7);
runSource("var z = 3; ++z + z;", 8);
runSource("var o = {x:3}; o.x++;", 3);
runSource("var o = {x:3}; ++o.x;", 4);
runSource("var o = {x:3}; o.x++; o.x;", 4);
runSource("var o = {x:3}; ++o.x; o.x;", 4);
runSource("var o = {x:3}; o.x++ + o.x;", 7);
runSource("var o = {x:3}; ++o.x + o.x;", 8);
//     run("var o={x:3}; var f=function() {return o}; f()['x']++ + o.x;", 7);
//     run("var o={x:3}; var f=function() {return o}; ++f()['x'] + o.x;", 8);
runSource("for (var i=0; i<3; i++) i;", 2);
runSource("for (var i=0; i<3; i++) i; i;", 3);
runSource("for (var i=0; false; i++) 123; i;", 0);
runSource("for (var i=0; false; i++) 123;", undefined);
runSource("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar.length", 10);
runSource("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar[0]+ar[1]+ar[2]+ar[3]+ar[4]+ar[5]", 0+1+2+3+4+5);
runSource("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar[9]", 9);
runSource("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar[10]", undefined);
runSource("function Xyz(n) { this.n = n }; var p = Xyz; p(123); n;", 123);
runSource("Object.prototype === Function.prototype", false);
runSource("Function.prototype === String.prototype", false);
runSource("String.prototype === Object.prototype", false);
runSource("Array.prototype === Function.prototype", false);
runSource("Array.prototype === String.prototype", false);
runSource("Array.prototype === Object.prototype", false);
runSource("var o = new Object(); Object.prototype.a = 123; o.a;", 123);
runFile("resources/tajs2009.js", "jens");
runSource("[].xyz;", undefined);
runSource("({}).xyz;", undefined);
runSource("(function () {}).xyz;", undefined);
runSource("var x = []; x.push(1); x[0]", 1);
runSource("var x = []; x.push(1); x.length;", 1);
runSource("var x;", undefined);
runSource("var b = 3; if (b) 1; else 2;", 1);
runSource("var b; if (b) 1; else 2;", 2);
runSource("var b = 0; if (b) 1; else 2;", 2);
runSource("var b = null; if (b) 1; else 2;", 2);
runSource("var b = NaN; if (b) 1; else 2;", 2);
runSource("var b = ''; if (b) 1; else 2;", 2);
runSource("var b = 'gvd'; if (b) 1; else 2;", 1);
runSource("var b = -23; b;", -23);
runSource("try { throw 42 } catch (e) { 43 }", 43);
runSource("try { throw 42 } catch (e) { e }", 42);
runSource("try { 123 } catch (e) { e }", 123);

// FIXME run("var glob=[]; try { try {throw new Error('oops')} finally {glob.push(1)}} catch (ex) {glob.push(ex.message)};glob[0] + glob[1]", "1oops");

runSource("try {123} finally {456}", 123);
runSource("(new Array()).length", 0);
runSource("var a = new Array(10); a.length", 10);
runSource("var a = new Array(10); a[3] = 3; a.length", 10);
runSource("var a = []; a[3] = 3; a.length", 4);
runEval("0 || 1", "1 || 0", "0 && 1", "1 && 0", "true || false", "false || true", "true && false", "false && true");
runSource("var a = 0; for (var i = 0; i < 10; i++); a = 1; a;", 1);
runSource("var i = 0; for (; i < 3; i++) {i}", 2);
runFile("resources/loopy1.js", true);
runFile("resources/loopy2.js", true);
runFile("resources/nssetup.js", true);

runEval("undefined === undefined", "undefined === null", "undefined === true", "undefined === false", "undefined === 'abc'", "undefined === +0",
    "undefined === -0", "undefined === NaN", "undefined === +Infinity", "undefined === -Infinity")
runEval("null === undefined", "null === null", "null === true", "null === false", "null === 'abc'", "null === +0", "null === -0", "null === NaN", "null === +Infinity",
    "null === -Infinity");
runEval("true === undefined", "true === null", "true === true", "true === false", "true === 'abc'", "true === +0", "true === -0", "true === NaN", "true === +Infinity",
    "true === -Infinity")
runEval("false === undefined", "false === null", "false === true", "false === false", "false === 'abc'", "false === +0", "false === -0", "false === NaN", "false === +Infinity",
    "false === -Infinity");
runEval("'abc' === undefined", "'abc' === null", "'abc' === true", "'abc' === false", "'abc' === 'abc'", "'abc' === +0", "'abc' === -0", "'abc' === NaN", "'abc' === +Infinity",
    "'abc' === -Infinity");
runEval("+0 === undefined", "+0 === null", "+0 === true", "+0 === false", "+0 === 'abc'", "+0 === +0", "+0 === -0", "+0 === NaN", "+0 === +Infinity", "+0 === -Infinity");
runEval("-0 === undefined", "-0 === null", "-0 === true", "-0 === false", "-0 === 'abc'", "-0 === +0", "-0 === -0", "-0 === NaN", "-0 === +Infinity", "-0 === -Infinity");
runEval("NaN === undefined", "NaN === null", "NaN === true", "NaN === false", "NaN === 'abc'", "NaN === +0", "NaN === -0", "NaN === NaN", "NaN === +Infinity",
    "NaN === -Infinity");
runEval("+Infinity === undefined", "+Infinity === null", "+Infinity === true", "+Infinity === false", "+Infinity === 'abc'", "+Infinity === +0", "+Infinity === -0",
    "+Infinity === +Infinity", "+Infinity === -Infinity");
runEval("-Infinity === undefined", "-Infinity === null", "-Infinity === true", "-Infinity === false", "-Infinity === 'abc'", "-Infinity === +0", "-Infinity === -0",
    "-Infinity === +Infinity", "-Infinity === -Infinity");

runSource("function F() { }; F.prototype.constructor === F", true);
runSource("function F(x) { this.x = x }; var f = new F(123); f.constructor === F.prototype.constructor", true);
runSource("Object.getPrototypeOf(Object.prototype)", null);
runSource("function F() {}; var f = new F(); Object.getPrototypeOf(f) === F.prototype", true);
runSource("Object.prototype.constructor === Object", true);
runSource("Function.prototype.constructor === Function", true);
runSource("Array.prototype.constructor === Array", true);
runSource("var o = {}; var oo = Object.create(o); Object.getPrototypeOf(oo) === o;", true);
runSource("function S() {}; S.prototype.x = 123; function F() {};  F.prototype = Object.create(S.prototype); var f = new F(); f.x", 123);
runSource("var o = Object.create(null); Object.getPrototypeOf(o) === null", true);
runSource("var o = {}; Object.getPrototypeOf(o) === Object.prototype", true);
runSource("var o = {}; o.constructor === Object", true);
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
runSource("function f(){return a;function a(){return 1};var a=4;function a(){return 2;}}; f()();", 2);
runSource("function f(){return a;var a=4;function a(){return 1};function a(){return 2;}}; f()();", 2);
runSource("function f(){var a=4;function a(){return 1};function a(){return 2;};return a;}; f();", 4);
runSource("var foo = 1; function bar() { if (!foo) { var foo = 10; } return foo;} bar();", 10);
runSource("var a = 1; function b() { a = 10; return; function a() {}}; b(); a;", 1);
runSource("[].map(function () {}).length", 0);
runSource("[3].map(function (x) {return x*x}).length", 1);
runSource("[3].map(function (x) {return x*x})[0]", 9);
runSource("[3,4].map(function (x) {return x*x}).length", 2);
runSource("[3,4].map(function (x) {return x*x}).length", 2);
runSource("[3,4].map(function (x) {return x*x})[1]", 16);
runSource("var arr=new Array(10); arr.map(function () {return 123}).length", 10);
runSource("var arr=new Array(3); arr.map(function () {return 123})[1]", undefined);
//run("var x=1; function f() { var x=2; return [9,9,9].map(function () {return this.x})}; f()[0];", 1); // non-strict only
runSource("var x=1; function f() { var x=2; return [9,9,9].map(function () {return this.x}, {x:3})}; f()[0];", 3);
runSource("var ar=[1,2,3].map(function (x) { return x*x*x }); ar[1]", 8);
runSource("var arr = [1,2,3,4,5,6,7,8,9,10]; function f(x,y) {return x+y}; arr.map(f).toString()", "1,3,5,7,9,11,13,15,17,19");
runSource("var glob=false; try {[].reduce(function () {})} catch (ex) {glob=true};glob", true);
runSource("[].reduce(function () {}, 123)", 123);
runSource("[3].reduce(function (x,y) {return x+y})", 3);
runSource("[3].reduce(function (x,y) {return x+y}, 4)", 7);
runSource("[3,4].reduce(function (x,y) {return x+y})", 7);
runSource("[3,4].reduce(function (x,y) {return x+y}, 5)", 12);
runSource("function Circle(x,y,r){this.x=x;this.y=y;this.r=r};function area(s){return 3*s.r*s.r};var circles=[[10,100,4],[-10,-10,3],[0,50,5]].map(function (xyr){return new Circle(xyr[0], xyr[1], xyr[2])});var totalArea = circles.map(area).reduce(function (x,y) {return x+y});totalArea", 150);
runSource("[].filter(function() {return true}).length", 0);
runSource("[].filter(function() {return false}).length", 0);
runSource("[1,2,3].filter(function() {return true}).toString()", "1,2,3");
runSource("[1,2,3].filter(function() {return false}).length", 0);
runSource("[1,2,3,4,5].filter(function(arg) {return arg%2}).toString()", "1,3,5");
runFile("resources/books.js", 2);
//     run("for (var i = 0; i < 2000; i++) { 123 }", 123); // bug: throws JS stack overflow
//     run("var a = [1,2,3]; for (var i = 0; i < 900; i++) { a[2] = 123 }", 123); // bug: throws JS stack overflow

runEval("String()", "String('123')", "String(456)", "String(true)");
//runSource("new String().length", 0);
//runSource("new String('').length", 0);
//runSource("new String('123').length", 3);
runSource("String().length", 0);
runSource("String('123').length", 3);
runSource("''.length", 0);
runSource("'123'.length", 3);
// FIXME timeout run(read("resources/churchNums.js"), true);
runFile("resources/gcIpdExample.js", 36);
runFile("resources/rotate.js", "hallo");
runSource("var fib = function (n) {if (n<2) {return n} return fib(n-1)+fib(n-2)}; fib(4)", 3);
runSource("function f(n) {if (n === 0) {return 1} else {return n*f(n-1)}}; f(10)", 3628800);
runSource("function g(){return 1}; function f(n){if (n === 0){return 0} else return f(n-1)+g()}; f(10)", 10);
runSource("function g() {function f() {return iii}; var iii = 13; return f()}; g()", 13);
runSource("for (var i = 0; i < 10; i++){if (i === 7){break}}; i", 7);
runSource("var i = 0; while (i < 10){if (i === 7){break}; i++}; i", 7);
runSource("var x = 'hela'; for (var i=0; i<4; i++) {x += x}; x", "helahelahelahelahelahelahelahelahelahelahelahelahelahelahelahela");
runSource("var o={}; o != null", true);
runSource("var o={}; o != undefined", true);
runSource("var o={}; o != true", true);
runSource("var o={}; o != false", true);
runSource("var o={}; o != 123", true);
runSource("var o={}; o != 'o'", true);
runSource("var o={}; var p={}; o != p", true);
runSource("var o={}; o != o", false);
runSource("var o={}; o == null", false);
runSource("var o={}; o == undefined", false);
runSource("var o={}; o == true", false);
runSource("var o={}; o == false", false);
runSource("var o={}; o == 123", false);
runSource("var o={}; o == 'o'", false);
runSource("var o={}; var p={}; o == p", false);
runSource("var o={}; o == o", true);
runFile("resources/return1.js", 123);
runFile("resources/coen1.js", 20);
runSource("var o={}; Object.defineProperty(o, 'x', {value:42}); o.x", 42);
runSource("var o={}; Object.defineProperty(o, 'x', {value:42}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", false);
runSource("var o={}; Object.defineProperty(o, 'x', {value:42}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", false);
runSource("var o={}; Object.defineProperty(o, 'x', {value:42}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", false);
runSource("var o=Object.create({}, {x:{value:42}}); o.x", 42);
runSource("var o=Object.create({}, {x:{value:42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", false);
runSource("var o=Object.create({}, {x:{value:42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", false);
runSource("var o=Object.create({}, {x:{value:42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", false);
runSource("var o={x:42}; var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", true);
runSource("var o={x:42}; var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", true);
runSource("var o={x:42}; var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", true);
runSource("var o = Object.defineProperty({}, 'x',{get:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); typeof p.get", "function");
runSource("var o = Object.defineProperty({}, 'x',{get:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", undefined);
runSource("var o = Object.defineProperty({}, 'x',{get:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", false);
runSource("var o = Object.defineProperty({}, 'x',{get:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", false);
runSource("var o = Object.defineProperty({}, 'x',{set:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); typeof p.set", "function");
runSource("var o = Object.defineProperty({}, 'x',{set:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.writable", undefined);
runSource("var o = Object.defineProperty({}, 'x',{set:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.enumerable", false);
runSource("var o = Object.defineProperty({}, 'x',{set:function(){return 42}}); var p = Object.getOwnPropertyDescriptor(o, 'x'); p.configurable", false);
runSource("TypeError.prototype instanceof Error", true);
runSource("TypeError.prototype === Error", false);
runSource("TypeError.prototype === Error.prototype", false);
runSource("new TypeError('123').toString()", "TypeError: 123");
runSource("'123'.toString()", "123");
runEval("typeof 'abc'", "typeof 123", "typeof {}", "typeof true", "typeof false", "typeof undefined", "typeof null", "typeof function () {}");
runSource("var o = {x:123};o.hasOwnProperty('x')", true);
runSource("var o = {x:123};o.hasOwnProperty('y')", false);
runSource("var o = {}; o instanceof Object", true);
runSource("var glob = []; for (var p in {x:42}) {glob.push(p)}; glob.length===1 && glob[0]==='x'", true);
runSource("var glob = []; for (var p in {x:42, y:43}) {glob.push(p)}; glob.length===2 && glob.indexOf('x') > -1 && glob.indexOf('y') > -1", true);
runSource("var x={a:1}; function Y() {this.b=2};Y.prototype=x;var obj=new Y();var glob=[];for (var prop in obj) {glob.push(prop)};glob.length===2 && glob.indexOf('a')>-1 && glob.indexOf('b')>-1", true);
runSource("function sq(x) {return x*x}; sq.call(null, 4)", 16);
runSource("function sq(x) {return this}; sq.call(42, 4)", 42);
runSource("var glob=null;function sq(x) {glob=42}; sq.call(null);glob", 42);
runSource("function sq(x) {return x*x}; sq.apply(null, [4])", 16);
runSource("function sq(x) {return this}; sq.apply(42, [4])", 42);
runSource("var glob=null;function sq(x) {glob=42}; sq.apply(null);glob", 42);
runSource("function hh(...args) {return args[1]}; hh(41,42,43)", 42);
runSource("function hh(x, ...args) {return args[1]}; hh(41,42,43)", 43);
runSource("Object.getOwnPropertyNames({x:42}).toString()", "x");
runSource("Object.getOwnPropertyNames({}).length", 0);
runSource("var ps = Object.getOwnPropertyNames({x:42,y:43});ps.length===2 && ps.indexOf('x')>-1 && ps.indexOf('y')>-1", true);
// run("var trees=['redwood','bay','cedar','oak','maple'];0 in trees", true); // TODO: ToPropertyKey
// run("var trees=['redwood','bay','cedar','oak','maple'];3 in trees", true);
// run("var trees=['redwood','bay','cedar','oak','maple'];6 in trees", false);
runSource("var trees=['redwood','bay','cedar','oak','maple'];'bay' in trees", false);
runSource("var trees=['redwood','bay','cedar','oak','maple'];'length' in trees", true);
// run("'PI' in Math", true);
runSource("var mycar = {make: 'Honda', model: 'Accord', year: 1998};'make' in mycar", true);
runSource("var mycar = {make: 'Honda', model: 'Accord', year: 1998};'model' in mycar", true);
runSource("var mycar = {make: 'Honda', model: 'Accord', year: 1998};'floeper' in mycar", false);
// run("var color1 = new String('green');'length' in color1", true);
// run("var glob=false;var color2 = 'coral';try{'length' in color1} catch (ex) {glob=true};glob", true);
// module.test119 = TODO: NYI
//       run("var o = Object.defineProperty({}, 'a',{get:function(){return 42}});o.a", 42);
//       run("var o={};var bValue=38;Object.defineProperty(o,'b',{get:function() {return bValue},set:function(newValue) {bValue=newValue},enumerable:true,configurable:true});o.b=42;o.b===bValue", true)
runSource("var inventory = [{name: 'apples', quantity: 2},{name: 'bananas', quantity: 0},{name: 'cherries', quantity: 5}];function findCherries(fruit) {return fruit.name === 'cherries'};inventory.find(findCherries).quantity", 5);
runSource("var numbers=[4,2,5,1,3];numbers.sort(function (a, b) {return a - b});numbers[0]===1&&numbers[4]===5", true);
runSource("var numbers=[4,2,5,1,3];numbers.sort(function (a, b) {return a - b});numbers[0]<numbers[1]&&numbers[1]<numbers[2]&&numbers[2]<numbers[3]&&numbers[3]<numbers[4]", true);
runSource("var myFish = ['angel','clown','mandarin','sturgeon']; myFish.splice(2, 1);myFish[0]==='angel'&&myFish[1]==='clown'&&myFish[2]==='sturgeon'&&myFish.length===3", true);
runSource("var o={};!!o", true);
runSource("var o = {}; Object.prototype.isPrototypeOf(o);", true);
runSource("var p = {}; var o = Object.create(p); p.isPrototypeOf(o)", true);
runFile("resources/inheritance1.js", true);
// FIXME runSource("aBRaCADabrA".toLowerCase(), "abracadabra");
runSource("(function(){}).constructor === Function", true);
runSource("(Function())()", undefined);
runSource("(new Function())()", undefined);
runSource("(Function(''))()", undefined);
runSource("(new Function(''))()", undefined);
runSource("(Function ('a','return a'))(123)", 123);
runSource("(new Function ('a','return a'))(123)", 123);
runSource("(Function ('a', 'b', 'return a+b'))(123,456)", 579);
runSource("(new Function ('a', 'b', 'return a+b'))(123,456)", 579);


// 20.1.3
runSource("Object.getPrototypeOf(Number.prototype) === Object.prototype", true);
runSource("Object.getPrototypeOf(Number) === Function.prototype", true);
runSource("Number(2) === 2", true);
runSource("new Number(2) === 2", false);


//22.1.3.23
runSource("[42].some(function(x){ return x === 42})", true);
runSource("[].some(function(x){ return x === 42})", false);
runSource("[1, 2, -1, 42, 12].some(function(x){ return x === 42})", true);

// // 22.1.3.5
runSource("[].every(function(x){ return x > 0})", true);
runSource("[-1].every(function(x){ return x > 0})", false);
runSource("[2,3,4,0].every(function(x){ return x > 0})", false);
runSource("[2,3,4,10].every(function(x){ return x > 0})", true);

 //String.prototype.length
 runSource("var t = 'aBRaCADabrA'; '123'.length", 3); 
 //21.1.3.7
 runSource("var t = 'aBRaCADabrA'; t.length", 11);
 
 //String.prototype.indexOf
 runSource("var t = 'aBRaCADabrA'; t.indexOf('BR')", 1);
 runSource("'Hello World'.indexOf('')", 0);
 runSource("''.indexOf('')", 0);
 runSource("'Blue Whale'.indexOf('Blue')",0)     
 runSource("'Blue Whale'.indexOf('Blute')",-1);    
 runSource("'Blue Whale'.indexOf('Whale', 0)",5);  
 runSource("'Blue Whale'.indexOf('Whale', 5)",5);  
 runSource("'Blue Whale'.indexOf('Whale', 7)",-1);  
 runSource("'Blue Whale'.indexOf('')",0);          
 runSource("'Blue Whale'.indexOf('', 9)",9);       
 runSource("'Blue Whale'.indexOf('', 10)",10);     
 runSource("'Blue Whale'.indexOf('', 11)",10);    


