var suiteJipdaDepTests = 

(function () 
{
  var module = new TestSuite("suiteJipdaDepTests");

  function run(src, cesk)
  {
    var ast = Ast.createAst(src);
    var actual = BOT;
    var result = new Pushdown().analyze(ast, cesk);
    return result;
  }
  
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
      var result = new Pushdown().analyze(ast, cesk);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(result.isPureFunction(f));
    }
  
  module.testPurity2 =
    function ()
    {
      var src = "function f(){var x=true;x=false;return x;} f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = new Pushdown().analyze(ast, cesk);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(result.isPureFunction(f));
    }
    
  module.testPurity3 =
    function ()
    {
      var src = "var z=false; function f() {z=true}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = new Pushdown().analyze(ast, cesk);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(result.isPureFunction(f));
    }
    
  module.testPurity4 =
    function ()
    {
      var src = "var z=false; function f() {return z}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = new Pushdown().analyze(ast, cesk);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(result.isPureFunction(f));
    }
    
  module.testPurity5 =
    function ()
    {
      var src = "var z=false; function f() {return z}; z=true; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = new Pushdown().analyze(ast, cesk);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(result.isPureFunction(f));
    } 
  
  
  module.testPurity6 =
    function ()
    {
      var src = "var z=false;function f(){g()}; function g(){h()}; function h(){z=true}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = new Pushdown().analyze(ast, cesk);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertFalse(result.isPureFunction(f));
    }
    
  module.testPurity7 =
    function ()
    {
      var src = "function f(){var l=0; function g() {l=l+1}; g()}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = new Pushdown().analyze(ast, cesk);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(result.isPureFunction(f));
      var g = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "g"})[0];
      assertFalse(result.isPureFunction(g));
    }
    
  module.testPurity8 =
    function ()
    {
      var src = "function f(){var o={}; o.x=3}; f()";
      var ast = Ast.createAst(src);
      var cesk = createCesk();
      var result = new Pushdown().analyze(ast, cesk);
      var f = Ast.nodes(ast).filter(function (node) {return node.id && node.id.name === "f"})[0];
      assertTrue(result.isPureFunction(f));
    }
    
  return module;

})()


