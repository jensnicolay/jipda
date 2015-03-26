var suiteJipdaDepTests = 

(function () 
{
  var module = new TestSuite("suiteJipdaDepTests");

  function createCesk(cc)
  {
    cc = cc || {};
    return jsCesk({a:cc.a || createTagAg(), l:new JipdaLattice()});
  }

  function isPureFunction(f, result)
  {
    var pmap = computePurity(result.initial, result.sstore);
    return pmap.get(f) === "PURE";
  }
  
  module.DDDtestPurity1 =
    function ()
    {
      var src = "function f(){}; f()"
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
  
  module.testPurity2 =
    function ()
    {
      var src = "function f(){var x=true;x=false;return x;} f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity3 =
    function ()
    {
      var src = "var z=false; function f() {z=true}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(isPureFunction(f, result));
    }
    
  module.testPurity4 =
    function ()
    {
      var src = "var z=false; function f() {return z}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity5a = 
    function ()
    {
      var src = "var z=false; function f() {return z}; z=true; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    } 
  
  module.testPurity5b = 
    function ()
    {
      var src = "var z=false; function f() {return z}; z=true; f(); f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    } 
  
  module.testPurity5c = 
    function ()
    {
      var src = "var z=false; function f() {return z}; f(); z=true; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(isPureFunction(f, result));
    } 
  
  module.testPurity5d = 
    function ()
    {
      var src = "var z=false; function f() {return z}; f(); f(); z=true;";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    } 
  
  module.testPurity6 =
    function ()
    {
      var src = "var z=false;function f(){g()}; function g(){h()}; function h(){z=true}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(isPureFunction(f, result));
    }
    
  module.testPurity7 =
    function ()
    {
      var src = "function f(){var x=0; function g() {x=x+1}; g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
      var g = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "g"})[0];
      assertFalse(isPureFunction(g, result));
    }
    
  module.testPurity8 =
    function ()
    {
      var src = "function f(){var o={}; o.x=3}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity9 =
    function ()
    {
      var src = "function f(){function g() {var o={x:3}; return o}; return g().x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity10 =
    function ()
    {
      var src = "function f(){function g() {var o={x:{}}; return o}; return g().x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity11 =
    function ()
    {
      var src = "function f(){var o={}; function g() {o.x=4}; g(); return o.x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity12 =
    function ()
    {
      var src = "var z=0; function f(){var o={}; function g() {z=z+1;o.x=z}; g(); return o.x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(isPureFunction(f, result));
    }
    
  module.testPurity13 =
    function ()
    {
      var src = "function f(){function g() {var o={x:3}; return o}; return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity14 =
    function ()
    {
      var src = "var o={x:3}; function f(){return o}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity15 =
    function ()
    {
      var src = "function f(){function g(){return {x:3}}; return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
  
  module.testPurity16 =
    function ()
    {
      var src = "function g() {var o={x:3}; return o}; function f(){return g().x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity17 =
    function ()
    {
      var src = "function g() {var o={x:{}}; return o}; function f(){return g().x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity18 =
    function ()
    {
      var src = "function g(p) {p.x=4}; function f(){var o={}; g(o); return o.x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity19 =
    function ()
    {
      var src = "var z=0; function g(p) {z=z+1;p.x=z}; function f(){var o={}; g(o); return o.x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(isPureFunction(f, result));
    }
    
  module.testPurity20 = // returns object
    function ()
    {
      var src = "function g() {var o={x:3}; return o}; function f(){return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity21 =
    function ()
    {
      var src = "var o={x:3}; function f(p){return p}; f(o)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity22 =
    function ()
    {
      var src = "function g(){return {x:3}}; function f(){return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity23 =
    function ()
    {
      var src = "function g() {var o={x:3}; return o}; function f(h){return h().x}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity24 =
    function ()
    {
      var src = "function g() {var o={x:{}}; return o}; function f(h){return h().x}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity25 =
    function ()
    {
      var src = "function g(p) {p.x=4}; function f(h){var o={}; h(o); return o.x}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity26 =
    function ()
    {
      var src = "var z=0; function g(p) {z=z+1;p.x=z}; function f(h){var o={}; h(o); return o.x}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(isPureFunction(f, result));
    }
    
  module.testPurity27 =
    function ()
    {
      var src = "function g() {var o={x:3}; return o}; function f(h){return h()}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity28 = // returns a
    function ()
    {
      var src = "function g(){return {x:3}}; function f(h){return h()}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity29 =
    function ()
    {
      var src = "function f(){function g(){var l=3; return l}; return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }

  module.testPurity30 =
    function ()
    {
      var src = "function g(){var l=3; return l}; function f(){return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity31 =
    function ()
    {
      var src = "function g(){var l=3; return l}; function f(h){return h()}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
    
  module.testPurity32 =
    function ()
    {
      var src = "function f(){var l=3;function g(){return l}; l=l+1; return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
  
  module.testPurity33 =
    function ()
    {
      var src = "function f(){var l=3;function g(){l=l+1;return l}; l=l+1; return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
  
  module.testPurity34 = // returns a
    function ()
    {
      var src = "function f(){var o={}; function g() {return {x:o}}; return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
  
  module.testPurity35 =
    function ()
    {
      var src = "var o={x:{}}; function f(){o.x.y=123}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(isPureFunction(f, result));
    }
  
  module.testPurity36 =
    function ()
    {
      var src = "function f(){function g() {var o={x:3}; o.x=o.x+1; return o}; return g().x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }
  
  module.testFib =
    function ()
    {
      var src = "function fib(n){if (n<2) {return n}; return fib(n-1)+fib(n-2)};fib(4)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "fib"})[0];
      assertTrue(isPureFunction(f, result));
    }
  
  module.testPurity37 = 
    function ()
    {
      var src = "var z=false; var x=true; function f() {return z}; f(); x=false; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = cesk.explore(ast);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(isPureFunction(f, result));
    }   
  
  return module;

})()
