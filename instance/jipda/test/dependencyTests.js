var suiteJipdaDepTests = 

(function () 
{
  var module = new TestSuite("suiteJipdaDepTests");

  function run(src, cesk)
  {
    var ast = Ast.createAst(src);
    Ast.printTree(ast);
    var actual = BOT;
    var result = new Pushdown().analyze(ast, cesk);
    return result;
  }
  
  function createCesk(cc)
  {
    cc = cc || {};
    return jsCesk({a:cc.a || tagAg, p:cc.p || new Lattice1()});
  }
  
  module.test1 =
    function ()
    {
      var cesk = createCesk();
      var result = run("var z=false;function f(){g()}; function g(){h()}; function h(){z=true}; f()", cesk);
      interproceduralDependencies(result.dsg.etg, result.dsg.ss);
    }
    
  return module;

})()


