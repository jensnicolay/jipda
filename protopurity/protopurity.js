function displayPurity(ast, pmap)
{
  var fs = Ast.nodes(ast).filter(function (node) {return node.type === "FunctionDeclaration" || node.type === "FunctionExpression"});
  fs.map(
    function (f, i)
    {
      print("line", f.loc.start.line, pmap.get(f) || "???", String(f).substring(0,40));
      return {};
    });
}

function computeResult(benchmark, ast, pmap, sgTime, pmTime)
{
  var pureFuns = 0;
  var fs = Ast.nodes(ast).filter(function (node) {return node.type === "FunctionDeclaration" || node.type === "FunctionExpression"});
  fs.forEach(
    function (f, i)
    {
      var effClass = pmap.get(f);
      if (effClass === "PURE" || effClass === "OBS")
      {
        pureFuns++;
      }
    });  
  return {benchmark:benchmark,sgTime:sgTime,pmTime:pmTime,funs:fs.length,pureFuns:pureFuns};
}

function runBenchmarks(benchmarks)
{
  var bprefix = "../test/resources/";
  benchmarks = benchmarks ||
                    ["fib.js",
                     "gcIpdExample.js",
                     "navier-stokes-light.js",
                     "sunspider/access-nbody.js",
                     "sunspider/controlflow-recursive.js",
                     "sunspider/crypto-sha1.js",
                     "sunspider/math-spectral-norm.js",
                     "jolden/tree-add.js",
                     ]
                    //;
  return benchmarks.map(
    function (benchmark)
    {
      print("=======================");
      print(benchmark);
      var src = read(bprefix + benchmark);
      var ast = Ast.createAst(src, {loc:true});
      var cesk = jsCesk({a:createTagAg(), l:new JipdaLattice()});
      
      var sgStart = Date.now();
      var system = cesk.explore(ast);
      var sgTime = Date.now() - sgStart;

      print("sgTime", Formatter.displayTime(sgTime), "states", system.states.count());

      var pmStart = Date.now();
      var pmap = computePurity(ast, system.initial, system.contexts);
      var pmTime = Date.now() - pmStart;
      
      print("pmTime", Formatter.displayTime(pmTime), "count", pmap.count());
      
      displayPurity(ast, pmap);
      print();
      
      return computeResult(benchmark,ast,pmap,sgTime,pmTime);
    });
}

function r()
{
  return runBenchmarks();
}

function serverTest()
{
  var results = runBenchmarks([
                 "sunspider/access-nbody.js",
                 "sunspider/controlflow-recursive.js",
                 "sunspider/crypto-sha1.js",
                 "sunspider/math-spectral-norm.js",
                 "jolden/tree-add.js",
                 "octane/navier-stokes.js", 
                 "octane/richards.js"
                 //"sunspider/3d-cube.js"
                 //"octane/splay.js"
                 ]);
  displayResults(results);
  return results;
}

function displayResults(results)
{
  results.forEach(function (result)
    {
      print(Formatter.displayWidth(result.benchmark, 30),
          Formatter.displayWidth(result.funs,4),
          Formatter.displayWidth(result.pureFuns,4),
          Formatter.displayTime(result.sgTime),
          Formatter.displayTime(result.pmTime));
    })
}