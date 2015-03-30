function concEval(src)
{
  var ast = Ast.createAst(src);
  var cesk = jsCesk({a:createConcAg(), l: new ConcLattice()});
  var system = cesk.explore(ast);
  var resultValue = computeResultValue(system.result); 
  print(resultValue);
}

function typeEval(src)
{
  var ast = Ast.createAst(src);
  var cesk = jsCesk({a:createTagAg(), l: new JipdaLattice()});
  var system = cesk.explore(ast);
  var resultValue = computeResultValue(system.result); 
  print(result.value);
}

function concEval1(src)
{
  var ast = Ast.createAst(src, {loc:true});
  var cesk = jsCesk({a:createConcAg(), l: new ConcLattice(), errors:true});
  var system = cesk.concExplore(ast);
  var result = computeResultValue(system.result);
  var resultValue = result.value;
  print(result.msgs.join("\n"));
  print(resultValue);
}

