var suiteJipdaDepTests = 

(function () 
{
  var module = new TestSuite("suiteJipdaDepTests");

  function createCesk(cc)
  {
    cc = cc || {};
    return jsCesk({a:cc.a || tagAg, p:cc.p || new Lattice1()});
  }
  
  module.testPurity1 =
    function ()
    {
      var src = "function f(){}; f()"
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
  
  module.testPurity2 =
    function ()
    {
      var src = "function f(){var x=true;x=false;return x;} f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity3 =
    function ()
    {
      var src = "var z=false; function f() {z=true}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity4 =
    function ()
    {
      var src = "var z=false; function f() {return z}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity5 =
    function ()
    {
      var src = "var z=false; function f() {return z}; z=true; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    } 
  
  
  module.testPurity6 =
    function ()
    {
      var src = "var z=false;function f(){g()}; function g(){h()}; function h(){z=true}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity7 =
    function ()
    {
      var src = "function f(){var l=0; function g() {l=l+1}; g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
      var g = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "g"})[0];
      assertFalse(ana.isPureFunction(g));
    }
    
  module.testPurity8 =
    function ()
    {
      var src = "function f(){var o={}; o.x=3}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity9 =
    function ()
    {
      var src = "function f(){function g() {var o={x:3}; return o}; return g().x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity10 =
    function ()
    {
      var src = "function f(){function g() {var o={x:{}}; return o}; return g().x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity11 =
    function ()
    {
      var src = "function f(){var o={}; function g() {o.x=4}; g(); return o.x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity12 =
    function ()
    {
      var src = "var z=0; function f(){var o={}; function g() {z=z+1;o.x=z}; g(); return o.x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity13 =
    function ()
    {
      var src = "function f(){function g() {var o={x:3}; return o}; return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity14 =
    function ()
    {
      var src = "var o={x:3}; function f(){return o}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity15 =
    function ()
    {
      var src = "function f(){function g(){return {x:3}}; return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
  
  module.testPurity16 =
    function ()
    {
      var src = "function g() {var o={x:3}; return o}; function f(){return g().x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity17 =
    function ()
    {
      var src = "function g() {var o={x:{}}; return o}; function f(){return g().x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity18 =
    function ()
    {
      var src = "function g(p) {p.x=4}; function f(){var o={}; g(o); return o.x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity19 =
    function ()
    {
      var src = "var z=0; function g(p) {z=z+1;p.x=z}; function f(){var o={}; g(o); return o.x}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity20 =
    function ()
    {
      var src = "function g() {var o={x:3}; return o}; function f(){return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity21 =
    function ()
    {
      var src = "var o={x:3}; function f(p){return p}; f(o)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity22 =
    function ()
    {
      var src = "function g(){return {x:3}}; function f(){return g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity23 =
    function ()
    {
      var src = "function g() {var o={x:3}; return o}; function f(h){return h().x}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity24 =
    function ()
    {
      var src = "function g() {var o={x:{}}; return o}; function f(h){return h().x}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity25 =
    function ()
    {
      var src = "function g(p) {p.x=4}; function f(h){var o={}; h(o); return o.x}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(ana.isPureFunction(f));
    }
    
  module.testPurity26 =
    function ()
    {
      var src = "var z=0; function g(p) {z=z+1;p.x=z}; function f(h){var o={}; h(o); return o.x}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity27 =
    function ()
    {
      var src = "function g() {var o={x:3}; return o}; function f(h){return h()}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  module.testPurity28 =
    function ()
    {
      var src = "function g(){return {x:3}}; function f(h){return h()}; f(g)";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var dsg = new Pushdown().analyze(ast, cesk);
      var ana = new Analysis(dsg);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(ana.isPureFunction(f));
    }
    
  return module;

})()
