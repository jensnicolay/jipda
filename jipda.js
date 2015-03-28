function concEval(src)
{
  var ast = Ast.createAst(src);
  var cesk = jsCesk({a:createConcAg(), l: new ConcLattice()});
  var system = cesk.explore(ast);
  var resultValue = graphResult(system.initial); 
  print(resultValue);
}

function typeEval(src)
{
  var ast = Ast.createAst(src);
  var cesk = jsCesk({a:createTagAg(), l: new JipdaLattice()});
  var system = cesk.explore(ast);
  var result = statesResult(system.states);
  print(result);
}