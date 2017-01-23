function computeInitialCeskState(lat)
{
  const ast0 = Ast.createAst(ast0src);
  const prelCesk = jsCesk({a:concAlloc, kalloc: concKalloc, l:lat, gc: true, errors:true});
  const prelSystem = prelCesk.explore(ast0);
  const prelResult = prelSystem.result;
  if (prelResult.size !== 1)
  {
    throw new Error("wrong number of prelude results: " + prelResult.size);
  }
  const prelStore = [...prelResult][0].store;
  const prelRealm = prelSystem.realm;//[...prelResult][0].realm;
  return {store:prelStore, realm:prelRealm};
}


function concEval(src)
{
  var ast = Ast.createAst(src);
  var cesk = jsCesk({a:createConcAg(), l: new ConcLattice()});
  var system = cesk.explore(ast);
  var result = computeResultValue(system.result); 
  print(result.value);
}

function typeEval(src)
{
  var ast = Ast.createAst(src);
  var cesk = jsCesk({a:createTagAg(), l: new TypeLattice(), ast0src});
  var system = cesk.explore(ast);
  var result = computeResultValue(system.result); 
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

function serverTest()
{
  var padStr = "                                                              ";
  function cut(x, n)
  {
    return (x + padStr).slice(0,n); 
  }
  function pad(x, n)
  {
    var s = String(x);
    if (s.length > n)
    {
      return s;
    }
    return (x + padStr).slice(0,n); 
  }
  var bprefix = "test/resources/";
  var benchmarks =
                    ["return1.js",
                     "fib.js",
                     "gcIpdExample.js",
                     "rotate.js",
                     "access-nbody-mod.js",
                     "sunspider/controlflow-recursive.js",
                     "crypto-sha1-mod.js",
                     "sunspider/math-spectral-norm.js",
                     ]
  var r = benchmarks.forEach(
    function (benchmark)
    {
      var src = read(bprefix + benchmark);
      var ast = Ast.createAst(src);
      var cesk = jsCesk({a:createTagAg(), l:new TypeLattice(), errors:true});
      var system = cesk.explore(ast);
      var result = computeResultValue(system.result);
      var resultValue = result.value;
      print(cut(benchmark,32), pad(Math.round(system.time),8), pad(system.states.count(),8), pad(system.result.count(),4), pad(system.contexts.count(), 6), pad(resultValue,20));
      if (result.msgs.length > 0)
      {
        result.msgs.join("\n");
      }
    });
}
