var suiteJipdaDepTests = 

(function ()
{
  var module = new TestSuite("suiteJipdaDepTests");
  
  function createTypeCesk(ast)
  {
    return jsCesk({a: createTagAg(), l: new JipdaLattice()});
  }
  
  function createConcCesk(ast)
  {
    return jsCesk({a: createConcAg(), l: new ConcLattice()});
  }
  
  var PURE = "PURE", OBS = "OBS", PROC = "PROC";
  
  function test(src, checks)
  {
    var ast = Ast.createAst(src);
    var concCesk = createConcCesk(ast);
    var concResult = concCesk.explore(ast);
    var concMap = computePurity(concResult, false);
    for (var i = 0; i < checks.length; i += 2)
    {
      var funName = checks[i];
      var expected = checks[i + 1];
      var f = Ast.nodes(ast).filter(function (node)
      {
        return node.id && node.id.name === funName
      })[0];
      var actual = concMap.get(f);
      assertEquals(expected, actual, "equality " + funName + " expected " + expected + ", was " + actual);
    }
    
    var faConcMap = computePurity(concResult, true);
    assertEquals(concMap, faConcMap, "fa conc equality");
    
    var typeCesk = createTypeCesk(ast);
    var typeResult = typeCesk.explore(ast);
    var typeMap = computePurity(typeResult, false);
    for (var i = 0; i < checks.length; i += 2)
    {
      var funName = checks[i];
      var expected = checks[i + 1];
      var f = Ast.nodes(ast).filter(function (node)
      {
        return node.id && node.id.name === funName
      })[0];
      var actual = typeMap.get(f);
      if (expected === PROC)
      {
        assertTrue(actual === PROC, "a subsumption " + funName);
      }
      else if (expected === OBS)
      {
        assertTrue((actual === PROC) || (actual === OBS), "a subsumption " + funName);
      }
    }
    
    var faTypeMap = computePurity(typeResult, true);
    for (var i = 0; i < checks.length; i += 2)
    {
      var funName = checks[i];
      var expected = checks[i + 1];
      var f = Ast.nodes(ast).filter(function (node)
      {
        return node.id && node.id.name === funName
      })[0];
      var actual = faTypeMap.get(f);
      if (expected === PROC)
      {
        assertTrue(actual === PROC, "fa subsumption " + funName);
      }
      else if (expected === OBS)
      {
        assertTrue((actual === PROC) || (actual === OBS), "fa subsumption " + funName);
      }
    }
  }
  
  
  module.testPurity1 =
      function ()
      {
        var src = "function f(){}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity2 =
      function ()
      {
        var src = "function f(){var x=true;x=false;return x;} f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity3 =
      function ()
      {
        var src = "var z=false; function f() {z=true}; f()";
        test(src, ["f", PROC]);
      }
  
  module.testPurity4 =
      function ()
      {
        var src = "var z=false; function f() {return z}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity4p = // idempotent write to prop on global obj
      function ()
      {
        var src = "while (true) {var z=false; function f() {return z}; f()}";
        test(src, ["f", OBS]);
      }
  
  module.testPurity4v = // idempotent write to var of g
      function ()
      {
        var src = "function g(){while (true) {var z=false; function f() {return z}; f()}};g()";
        test(src, ["f", OBS]);
      }
  
  module.testPurity4vv = // write to var of f
      function ()
      {
        var src = "while (true) {function f() {var z=false; return z}; f()}";
        test(src, ["f", PURE]);
      }
  
  // f OBS atm
  //module.testPurity4vvv = // write to var of h
  //    function ()
  //    {
  //      var src = "while (true) {function h(){var z=false;function f() {return z}; f()};h()}";
  //      test(src, ["f", PURE]);
  //    }
  
  module.testPurity5a =
      function ()
      {
        var src = "var z=false; function f() {return z}; z=true; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity5ab =
      function ()
      {
        var src = "var z=false; function f() {return z}; z=true; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity5b =
      function ()
      {
        var src = "var z=false; function f() {return z}; z=true; f(); f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity5bc =
      function ()
      {
        var src = "var z=false; function f() {return z}; z=true; f(); f(); function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity5c =
      function ()
      {
        var src = "var z=false; function f() {return z}; f(); z=true; f()";
        test(src, ["f", OBS]);
      }
  
  module.testPurity5cb =
      function ()
      {
        var src = "var z=false; function f() {return z}; f(); f(); z=true; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true);";
        test(src, ["f", OBS]);
      }
  
  module.testPurity5d =
      function ()
      {
        var src = "var z=false; function f() {return z}; f(); f(); z=true;";
        test(src, ["f", PURE]);
      }
  
  module.testPurity5db =
      function ()
      {
        var src = "var z=false; function f() {return z}; f(); function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity6 =
      function ()
      {
        var src = "var z=false;function f(){g()}; function g(){h()}; function h(){z=true}; f()";
        test(src, ["f", PROC]);
      }
  
  module.testPurity6b =
      function ()
      {
        var src = "var z=false;function f(){g()}; function g(){h()}; function h(){z=true}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PROC]);
      }
  
  module.testPurity6c =
      function ()
      {
        var src = "function f(){var z=false; function g(){h()}; function h(){z=true}; g()};f()";
        test(src, ["f", PURE, "g", PROC, "h", PROC]);
      }
  
  module.testPurity7 =
      function ()
      {
        var src = "function f(){var x=0; function g() {x=x+1}; g()}; f()";
        test(src, ["f", PURE, "g", PROC]);
      }
  
  module.testPurity7b =
      function ()
      {
        var src = "function f(){var x=0; function g() {x=x+1}; g()}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE, "g", PROC]);
      }
  
  module.testPurity8 =
      function ()
      {
        var src = "function f(){var o={}; o.x=3}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity8b =
      function ()
      {
        var src = "function f(){var o={}; o.x=3}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity9 =
      function ()
      {
        var src = "function f(){function g() {var o={x:3}; return o}; return g().x}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity10 =
      function ()
      {
        var src = "function f(){function g() {var o={x:{}}; return o}; return g().x}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity11 =
      function ()
      {
        var src = "function f(){var o={}; function g() {o.x=4}; g(); return o.x}; f()";
        test(src, ["f", PURE, "g", PROC]);
      }
  
  module.testPurity11b =
      function ()
      {
        var src = "function f(){var o={}; function g() {o.x=4}; g(); return o.x}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity12 =
      function ()
      {
        var src = "var z=0; function f(){var o={}; function g() {z=z+1;o.x=z}; g(); return o.x}; f()";
        test(src, ["f", PROC]);
      }
  
  module.testPurity12b =
      function ()
      {
        var src = "var z=0; function f(){var o={}; function g() {z=z+1;o.x=z}; g(); return o.x}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PROC]);
      }
  
  module.testPurity13 =
      function ()
      {
        var src = "function f(){function g() {var o={x:3}; return o}; return g()}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity14 =
      function ()
      {
        var src = "var o={x:3}; function f(){return o}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity15 =
      function ()
      {
        var src = "function f(){function g(){return {x:3}}; return g()}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity16 =
      function ()
      {
        var src = "function g() {var o={x:3}; return o}; function f(){return g().x}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity17 =
      function ()
      {
        var src = "function g() {var o={x:{}}; return o}; function f(){return g().x}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity17b =
      function ()
      {
        var src = "function g() {var o={x:{}}; return o}; function f(){return g().x}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE, "g", PURE]);
      }
  
  module.testPurity18 =
      function ()
      {
        var src = "function g(p) {p.x=4}; function f(){var o={}; g(o); return o.x}; f()";
        test(src, ["f", PURE, "g", PROC]);
      }
  
  module.testPurity18b =
      function ()
      {
        var src = "function g(p) {p.x=4}; function f(){var o={}; g(o); return o.x}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity19 =
      function ()
      {
        var src = "var z=0; function g(p) {z=z+1;p.x=z}; function f(){var o={}; g(o); return o.x}; f()";
        test(src, ["f", PROC]);
      }
  
  module.testPurity19b =
      function ()
      {
        var src = "var z=0; function g(p) {z=z+1;p.x=z}; function f(){var o={}; g(o); return o.x}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PROC]);
      }
  
  module.testPurity20 =
      function ()
      {
        var src = "function g() {var o={x:3}; return o}; function f(){return g()}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity21 =
      function ()
      {
        var src = "var o={x:3}; function f(p){return p}; f(o)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity22 =
      function ()
      {
        var src = "function g(){return {x:3}}; function f(){return g()}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity23 =
      function ()
      {
        var src = "function g() {var o={x:3}; return o}; function f(h){return h().x}; f(g)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity24 =
      function ()
      {
        var src = "function g() {var o={x:{}}; return o}; function f(h){return h().x}; f(g)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity25 =
      function ()
      {
        var src = "function g(p) {p.x=4}; function f(h){var o={}; h(o); return o.x}; f(g)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity25b =
      function ()
      {
        var src = "function g(p) {p.x=4}; function f(h){var o={}; h(o); return o.x}; function l(b) {if (b) {f(g);return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity26 =
      function ()
      {
        var src = "var z=0; function g(p) {z=z+1;p.x=z}; function f(h){var o={}; h(o); return o.x}; f(g)";
        test(src, ["f", PROC]);
      }
  
  module.testPurity26b =
      function ()
      {
        var src = "var z=0; function g(p) {z=z+1;p.x=z}; function f(h){var o={}; h(o); return o.x}; function l(b) {if (b) {f(g);return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PROC]);
      }
  
  module.testPurity27 =
      function ()
      {
        var src = "function g() {var o={x:3}; return o}; function f(h){return h()}; f(g)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity28 =
      function ()
      {
        var src = "function g(){return {x:3}}; function f(h){return h()}; f(g)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity28b =
      function ()
      {
        var src = "function g(){return {x:3}}; function f(h){return h()}; function l(b) {if (b) {f(g);return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity29 =
      function ()
      {
        var src = "function f(){function g(){var l=3; return l}; return g()}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity29b =
      function ()
      {
        var src = "function f(){function g(){var l=3; return l}; return g()}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity30 =
      function ()
      {
        var src = "function g(){var l=3; return l}; function f(){return g()}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity30b =
      function ()
      {
        var src = "function g(){var l=3; return l}; function f(){return g()}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity31 =
      function ()
      {
        var src = "function g(){var l=3; return l}; function f(h){return h()}; f(g)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity31b =
      function ()
      {
        var src = "function g(){var l=3; return l}; function f(h){return h()}; function l(b) {if (b) {f(g);return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity32 =
      function ()
      {
        var src = "function f(){var l=3;function g(){return l}; l=l+1; return g()}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity32b =
      function ()
      {
        var src = "function f(){var l=3;function g(){return l}; l=l+1; return g()}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity33 =
      function ()
      {
        var src = "function f(){var l=3;function g(){l=l+1;return l}; l=l+1; return g()}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity33b =
      function ()
      {
        var src = "function f(){var l=3;function g(){l=l+1;return l}; l=l+1; return g()}; function l(b) {if (b) {f();return l(false)}; return 'done'}; l(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity34 =
      function ()
      {
        var src = "function f(){var o={}; function g() {return {x:o}}; return g()}; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity34b =
      function ()
      {
        var src = "function f(){var o={}; function g() {return {x:o}}; return g()}; for (var i=0; i<10; i++) f();";
        test(src, ["f", PURE, "g", PURE]);
      }
  
  module.testPurity35 =
      function ()
      {
        var src = "var o={x:{}}; function f(){o.x.y=123}; f()";
        test(src, ["f", PROC]);
      }
  
  module.testPurity36 =
      function ()
      {
        var src = "function f(){function g() {var o={x:3}; o.x=o.x+1; return o}; return g().x}; f()";
        test(src, ["f", PURE, "g", PURE]);
      }
  
  module.testFib =
      function ()
      {
        var src = "function fib(n){if (n<2) {return n}; return fib(n-1)+fib(n-2)};fib(4)";
        test(src, ["fib", PURE]);
      }
  
  module.testPurity37 =
      function ()
      {
        var src = "var z=false; var x=true; function f() {return z}; f(); x=false; f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity38 =
      function ()
      {
        var src = "var o={};function f(){return o.x};f();o.x = 123;f()";
        test(src, ["f", OBS]);
      }
  
  module.testPurity39 =
      function ()
      {
        var src = "var o={};var p=Object.create(o);function f(){return p.x};f();p.x=123;f()";
        test(src, ["f", OBS]);
      }
  
  module.testPurity39o =
      function ()
      {
        var src = "function g(){var o={};var p=Object.create(o);function f(){return p.x};f();p.x=123;f()};g()";
        test(src, ["f", OBS, "g", PURE]);
      }
  
  module.testPurity40 =
      function ()
      {
        var src = "var o={};var p=Object.create(o);function f(){return p.x};f();o.x=123;f()";
        test(src, ["f", OBS]);
      }
  
  module.testPurity40o =
      function ()
      {
        var src = "function g(){var o={};var p=Object.create(o);function f(){return p.x};f();o.x=123;f()};g()";
        test(src, ["f", OBS, "g", PURE]);
      }
  
  module.testPurity41 =
      function ()
      {
        var src = "var o={};var p=Object.create(o);function f(){return o.x};f();p.x=123;f()";
        test(src, ["f", PURE]);
      }
  
  module.testPurity41o =
      function ()
      {
        var src = "function g() {var o={};var p=Object.create(o);function f(){return o.x};f();p.x=123;f()};g()";
        test(src, ["f", PURE, "g", PURE]);
      }
  
  module.testPurity42 =
      function ()
      {
        var src = "function f(x){var xx = x;return xx};f(f(123))";
        test(src, ["f", PURE]);
      }
  
  module.testPurity43 =
      function ()
      {
        var src = "function f(){var x=1;function g(){return x};g();x=5;return g()};f()";
        test(src, ["f", PURE, "g", OBS]);
      }
  
  module.testPurity44 =
      function ()
      {
        var src = "function f(n){if (n===0) return 'done'; return f(n-1)}; f(3)";
        test(src, ["f", PURE]);
      }
  
  module.testPurity45 =
      function ()
      {
        var src = "function F(x){this.x=x};new F(3);";
        test(src, ["F", PURE]);
      }
  
  module.testPurity46 =
      function ()
      {
        var src = "var o={}; function f(){function g() {o.x=4}; g(); return o.x}; f()";
        test(src, ["f", PROC, "g", PROC]);
      }
  
  module.testPurity47 =
      function ()
      {
        var src = "function f(){var o={}; o.g=function g(){this.x=4}; o.g()}; f()";
        test(src, ["f", PURE, "g", PROC]);
      }
  
  module.testPurity48 =
      function ()
      {
        var src = "function f(){var o={}; function g(p){p.x=4}; g(o)}; f()";
        test(src, ["f", PURE, "g", PROC]);
      }
  
  module.testPurity49 =
      function ()
      {
        var src = "function f(){var o={};function g(p){h(p)};function h(q){q.x=4};g(o)};f()";
        test(src, ["f", PURE, "g", PROC, "h", PROC]);
      }
  
  module.testPurity50 =
      function ()
      {
        var src = "function f(){var o=g();o.x=4;function g(){return {}}};f()";
        test(src, ["f", PURE, "g", PURE]);
      }
  
  module.testPurity51 =
      function ()
      {
        var src = "function f(p){if (p) {p.x=4} else {p={}};return p};var o=f();f(o)";
        test(src, ["f", PROC]);
      }
  
  module.testPurity51b =
      function ()
      {
        var src = "function f(p){var a=p;if (p) {a.x=4} else {p={}};return p};var o=f();f(o)";
        test(src, ["f", PROC]);
      }
  
  module.testPurity52 =
      function ()
      {
        var src = "function f(){var x=10;function g(){return x};x;g();x=11;g()};f()";
        test(src, ["f", PURE, "g", OBS]);
      }
  
  module.testPurity52o =
      function ()
      {
        var src = "function f(){var o={x:10};function g(){return o.x};o.x;g();o.x=11;g()};f()";
        test(src, ["f", PURE, "g", OBS]);
      }
  
  module.testPurity53 =
      function ()
      {
        var src = "function glob(){var z=false;function h(){z=true};function g(){h()};function f(){g()};f()};glob()";
        test(src, ["f", PROC, "g", PROC, "h", PROC, "glob", PURE]);
      }
  
  module.testPurity54 =
      function ()
      {
        var src = "function f(b) {if (b) {var z={}; z.x=true; return f(false)}; return 'done'};f(true)"
        test(src, ["f", PURE]);
      }
  
  module.testPurity54b =
      function ()
      {
        var src = "var z={};function f(b) {if (b) {var y={}; y.x=true; y=z; y.x=false; return f(false)}; return 'done'};f(true)"
        test(src, ["f", PROC]);
      }
  
  module.testPurity54c =
      function ()
      {
        var src = "var z={};function f(b) {if (b) {var y={}; y.x=true; var y=z; y.x=false; return f(false)}; return 'done'};f(true)"
        test(src, ["f", PROC]);
      }
  
  module.testPurity55 =
      function ()
      {
        var src = "var z={};function f(b) {if (b) {var y=z; y={}; y.x=false; return f(false)}; return 'done'};f(true)"
        test(src, ["f", PURE]);
      }
  
  module.testTreenode1 =
      function ()
      {
        var src = read("test/resources/treenode1.js");
        test(src, ["TreeNode", PURE, "f", PURE]);
      }
  
  module.testTreenode =
      function ()
      {
        var src = read("test/resources/treenode.js");
        test(src, ["TreeNode", PURE, "f", PURE]);
      }
  
  module.testPurity56 =
      function ()
      {
        var src = "var o={};function f() {var p={};function g(){p=o};g();p.x=123};f()";
        test(src, ["f", PROC, "g", PROC]);
      }
  
  module.testPurity57 =
      function ()
      {
        var src = "function global(){function f(h) {h()};(function (z){function g() {z=false};f(g)})(true)};global()";
        test(src, ["global", PURE, "f", PROC, "g", PROC]);
      }
  
  module.testPurity58 =
      function ()
      {
        var src = "function f(p) {if (p) {var z={};function g() {z=p}; g(); z.x=3; f(false); return z}; return 'done'};f({})";
        test(src, ["f", PROC, "g", PROC]);
      }
  
  // synced with Scheme purity
  
  module.testPuritys61 =
      function ()
      {
        var src = "function f(h) {var z=true; if (h) return h(); return f(function g() {z=false})};f(false)";
        test(src, ["f", PROC, "g", PROC]);
      }
  
  module.testPuritys62 =
      function ()
      {
        var src = "function f(h) {var z={}; if (h) return h(); return f(function g() {z.x=123})};f(false)";
        test(src, ["f", PROC, "g", PROC]);
      }
  
  module.testPuritys62b =
      function ()
      {
        var src = "function f(h) {var z={x:456}; if (h) return h(); return f(function g() {z.x=123})};f(false)";
        test(src, ["f", PROC, "g", PROC]);
      }
  
  module.testPuritys62c =
      function ()
      {
        var src = "function f(h) {var z=[]; if (h) return h(); return f(function g() {z[0]=123})};f(false)";
        test(src, ["f", PROC, "g", PROC]);
      }
  
  module.testPuritys62d =
      function ()
      {
        var src = "function f(h) {var z=[456]; if (h) return h(); return f(function g() {z[0]=123})};f(false)";
        test(src, ["f", PROC, "g", PROC]);
      }
  
  module.testPuritys63 =
      function ()
      {
        var src = "function f(b) {if (b) {var x;var y;x=y={};x.car=3;return f(false)}; return 'done'};f(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPuritys65 =
      function ()
      {
        var src = "function f(b) {if (b) {var x;var y;x=y={};x.car=3;f(false);return x}; return 'done'};f(true)";
        test(src, ["f", PURE]);
      }
  
  module.testPuritys66 =
      function ()
      {
        var src = "function f(p) {var o={};if (p) {p.x=3} else f(o)}; f(false)";
        test(src, ["f", PROC]);
      }
  
  module.testPuritys67 =
      function ()
      {
        var src = "function f(b) {if (b) {var z={};function g() {z.x=3}; g(); f(false); return z}; return 'done'};f(true)";
        test(src, ["f", PURE, "g", PROC]);
      }
  
  module.testPurity68 =
      function ()
      {
        var src = "var solver=null;function setupNavierStokes(){solver = new FluidField(null)};function FluidField(canvas){};setupNavierStokes()";
        test(src, ["setupNavierStokes", PROC]);
      }
  
  module.testPurity69 =
      function ()
      {
        var src = "function f(i){var o = new Object();if (i === 5){return o};o.x = 12;f(i+1);return o};f(0)";
        test(src, ["f", PURE]);
      }
      
  return module;

})()
