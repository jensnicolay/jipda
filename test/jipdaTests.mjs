import fs from 'fs';

import {assert} from '../common';
import Ast from '../ast';
import {BOT} from '../lattice';
import concAlloc from '../conc-alloc';
import concKalloc from '../conc-kalloc';
import typeLattice from '../type-lattice';
import tagAlloc from '../tag-alloc';
import aacKalloc from '../aac-kalloc';
import {createMachine, explore, computeResultValue, computeInitialCeskState} from '../abstract-machine';
import {} from '../jipda';
import createSemantics from '../js-semantics';
import {TestSuite} from '../test';

typeLattice.sanity();


const read = name => fs.readFileSync(name).toString();

const ast0src = read("../prelude.js");

var module = new TestSuite("suiteJipdaTests");

const preludeJsSemantics = createSemantics(typeLattice, concAlloc, concKalloc, {errors:true});
const s0 = computeInitialCeskState(preludeJsSemantics, ast0src);
const typeJsSemantics = createSemantics(typeLattice, tagAlloc, aacKalloc, {errors:true});

function run(src, expected)
{
  var ast = Ast.createAst(src);
  const s1 = s0.switchMachine(typeJsSemantics, {gc:true});
  const s2 = s1.enqueueScriptEvaluation(src);
  const resultStates = new Set();
  var system = explore([s2], s => resultStates.add(s));
  var result = computeResultValue(resultStates, typeLattice.bot());
  result.msgs.join("\n");
  var actual = result.value;
  assert(actual.subsumes(expected));
}

module.test1a =
function ()
{
  run("42", typeLattice.abst1(42));
}

module.test2 =
function ()
{
  var src = "function f(){}; f()";
  run(src, typeLattice.abst1(undefined));
}

module.test12a =
function ()
{
  var src = "var sq = function (x) {return x * x;}; sq(5); sq(6)";
  run(src, typeLattice.abst1(36));
}

module.test12b =
function ()
{
  var src = "function sq(x) {return x * x;}; sq(5); sq(6)";
  run(src, typeLattice.abst1(36));
}

module.test19a =
function ()
{
  var src = "var count = function (n) {if (n===0) {return 'done'} else {return count(n-1)}}; count(200)";
  run(src, typeLattice.abst1("done"));
}

module.test19b =
function ()
{
  var src = "var count = function (n) {if (n===0) {return 'done';} else {return count(n-1);}}; count(200)";
  run(src, typeLattice.abst1("done"));
};

module.test20a =
function ()
{
 var src = "function f() {f()}; f()";
 run(src, BOT);
}

module.test20b =
function ()
{
 var src = "var t = function (x) {return t(x+1)}; t(0)";
 run(src, BOT);
}


module.test26a =
function ()
{
  var src = "var z=0; var f=function (i) { if (i<4) {z=z+1;f(i+1);}}; f(0); z";
  run(src, typeLattice.abst1(4));
}

module.test27a =
function ()
{
  var src = "var z=0; var s=0; var f=function (i) {if (z === 7) {s=s+1} if (i<10) {z=z+1;f(i+1);}}; f(0); s";
  run(src, typeLattice.abst1(1));
}

module.test27b =
function ()
{
  var src = "var z=0; var c=false; var f=function (i) {if (z === 7) {c=true} if (i<10) {z=z+1;f(i+1);}}; f(0); c";
  run(src, typeLattice.abst1(true));
}

//  module.test61a = TODO: `for` always returns undefined (pass bodyValue to ForTestKont?)
//  	function ()
//  	{
//  		var src = "for (var i=0; i<3; i++) i;";
//      var cesk = createCesk();
//      run(src, typeLattice.abst1(2));
//  	}	

module.test61b =
function ()
{
  var src = "for (var i=0; i<3; i++) i; i;";
  run(src, typeLattice.abst1(3));
}

//  module.test64 =
//    function ()
//    {
//      var ast = createAst("for (var i=0; true; i++) i; i;");
//      var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:4, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(BOT, actual);
//    } 
//  
//  module.test65 =
//    function ()
//    {
//      var ast = createAst("var ar = []; for (var i = 0; i < 1000; i++) {ar[i] = i;}; ar;");
//      var lat = new LatN(1);
//      var jipda = new Jipda({lattice: lat, k:4, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      //assertEquals("{100}", actual);
//    } 
//  
//  module.test76a =
//    function ()
//    {
//      var src = "var a = new Array(10); a.length";
//      var ast = createAst(src);
//      var lat = new LatN(1);
//      var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(10), actual); 
//    }
//  
//  module.test76b =
//    function ()
//    {
//      var src = "var a = new Array(10); a[3] = 3; a.length";
//      var ast = createAst(src);
//      var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(10), actual); 
//    }
//  
//  module.test78a =
//    function ()
//    {
//      var src = "var a = 0; for (var i = 0; i < 1000; i++); a = 1; a";
//      var ast = createAst(src);
//      var lat = new LatN(2);
//      var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      // property addresses:
////      assertEquals(jipda.lattice.abst1(1), actual); // threaded heap: {1}, single-threaded heap: {1,0}
//      assertEquals(jipda.lattice.abst1(1), actual);
//    }
//  
//  module.test80 =
//    function ()
//    {
//      var src = read("resources/nssetup.js");
//      var ast = createAst(src);
//      var lat = new LatN(1);
//      var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(true), actual);
//    }
//  
//  module.test81a =
//    function ()
//    {
//      // GC bug: primitives should add receiver + operands to root
//      var src = "[1,2,3].map(function (x) { return x + 1 })";
//      var ast = createAst(src);
//      var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      //assertEquals(jipda.lattice.abst1(true), actual); TODO when abstract printer       
//    }
//  
//  module.test81b =
//    function ()
//    {
//    // GC bug: primitives should add operator + operands to root
//      var src = "[2,3,4].map(function (x) { return x*x*x })[1]";
//      var ast = createAst(src);
//      var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(27), actual);       
//    }
//  
//  module.test81c =
//    function ()
//    {
//      var src = "[2,3,4].reduce(function (x,y) {return x+y})";
//      var ast = createAst(src);
//      var lat = new LatN(1);var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(9), actual);       
//    }
//  
//  module.test82 =
//    function ()
//    {
//      var src = "var o1={x:1}; var o2={x:2}; var o=$join(o1,o2); o.x";
//      var ast = createAst(src);
//      var lat = new LatN(2);var jipda = new Jipda({lattice: lat, k:1, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst([1,2]), actual);           
//    }
//  
//  module.test83 =
//    function ()
//    {
//      var src = "var a=[]; for (var i = 0; i < 1000; i++) { a.push({x:5}) }"; // (bug) should not crash
//      var ast = createAst(src);
//      var lat = new Lattice1();
//      var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(lat.Num, actual.user);           
//    }
//  
//  module.test84 =
//    function ()
//    {
//      var src = "function f(){for (var i = 0; i < 10; i++){var j = i * i;} return j;}; f()";
//      var ast = createAst(src);
//      var lat = new Lattice1();
//      var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(lat.Num, actual.user);           
//    }
//  
//  module.test85 =
//    function ()
//    {
//      var src = "var num = $join(1,2); function fib(n) {if (n<2) {return n} else {return fib(n-1)+fib(n-2)}}; fib(num);";
//      var ast = createAst(src);
//      var lat = new Lattice1(); 
//      var jipda = new Jipda({lattice: lat, k:0, a: tagAg});
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(lat.Num, actual.user);           
//    }
//  
//  module.test86 =
//    function ()
//    {
//      var src = read("resources/nssetup.js");
//      var ast = createAst(src);
//      var lat = new Lattice1(); 
//      var jipda = new Jipda({lattice: lat, k:2, a: tagAg}); // for k < 2, we always join same scope (extended benv) for reset()
//      var result = jipda.evalNode(ast);
//      var actual = result.map(State.topOfStack).reduce(Lattice.join, BOT);
//      assertEquals(jipda.lattice.abst1(true), actual);
//      var store = result.map(State.store).reduce(Lattice.join, BOT);
//      var slv = store.lookupAval(jipda.globalObject).lookup(lat.abst1("solver")).value;
//      assertTrue(slv.addresses().length === 1);
//      assertTrue(slv.user === BOT);
//    }

 module.testGcIpd =
   function ()
   {
     var src = read("resources/gcIpdExample.js");
     run(src, typeLattice.abst1(36));
   }
 
 module.testLoopy1 =
   function ()
   {
     var src = read("resources/loopy1.js");
     run(src, typeLattice.abst1(true));
   }
 
 module.testLoopy2 =
   function ()
   {
     var src = read("resources/loopy2.js");
     run(src, typeLattice.abst1(true));
   }
 
 module.testNssetup =
   function ()
   {
     var src = read("resources/nssetup.js");
     run(src, typeLattice.abst1(true));
   }
 
 module.testTajs2009 =
   function ()
   {
     var src = read("resources/tajs2009.js");
     run(src, typeLattice.abst1("jens"));
   }
 
module.testRotate =
  function ()
  {
    var src = read("resources/rotate.js");
    run(src, typeLattice.abst([5, true, "hallo"]));
  }

module.testFac =
  function ()
  {
    var src = "function f(n) {if (n === 0) {return 1} else {return n*f(n-1)}}; f(10)";
    run(src, typeLattice.abst1(3628800));
  }

module.testFib =
  function ()
  {
    var src = "var fib = function (n) {if (n<2) {return n} return fib(n-1)+fib(n-2)}; fib(4)";
    run(src, typeLattice.abst1(3));
  }
  
module.test100 =
  function ()
  {
    var src = "var z=false; function f(n) {if (n===10) {g()}; if (n>0) {f(n-1)}}; function g() {z=true}; f(20); z"
    run(src, typeLattice.abst1(true));
  }

module.test101 =
  function ()
  {
    var src = "function g(){return 1}; function f(n){if (n === 0){return 0} else return f(n-1)+g()}; f(10)";
    run(src, typeLattice.abst1(10));
  }

module.test102 = // bug in call member with arg: this pointer passed was always global this
  function ()
  {
    var src = "function Scheduler() {this.queueCount=0}; Scheduler.prototype.addIdleTask=function (x) {return this.addRunningTask};Scheduler.prototype.addRunningTask=999;function runRichards() {var scheduler=new Scheduler();return scheduler.addIdleTask(123)};runRichards()";
    run(src, typeLattice.abst1(999));
  }

module.test103 = // bug in call member with arg: this pointer passed was always global this
  function ()
  {
    var src = "function Scheduler() {this.queueCount=0}; Scheduler.prototype.addIdleTask=function (x) {return this.addRunningTask};Scheduler.prototype.addRunningTask=999;function runRichards() {var scheduler=new Scheduler();return scheduler.addIdleTask(123)};runRichards()";
    run(src, typeLattice.abst1(999));
  }

module.test104a =
  function ()
  {
    var src = "var x = 'hela'; for (var i=0; i<4; i++) {x += x}; x";
    run(src, typeLattice.abst1("helahelahelahelahelahelahelahelahelahelahelahelahelahelahelahela"));
  }

module.test104b =
  function ()
  {
    var src = "var x = 'hela'; while (true) {x += x}";
    run(src, BOT);
  }

module.test105 =
  function ()
  {
    var src = "function f(p){if (p) {p.x=4} else {p={}};return p};var o=f();f(o)"
  }

module.testCoen1 =
  function ()
  {
    var src = read("resources/coen1.js")
    run(src, typeLattice.abst1(20));
  }

//    module.testChurchNums =
//    function ()
//    {
//      var src = read("resources/churchNums.js");
//      var cesk = createCesk();
//      run(src, typeLattice.abst([true, false]));
//    }    


// simplest of GC tests
//    
//    function f(x)
//    {
//        return x;
//    }
//
//    function g(y)
//    {
//        return f(y);
//    }
//
//    g(1);
//    g(2);
//

export default module;

