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

function computeResult(fs, pmap, pmTime)
{
  var pureFuns = 0;
  fs.forEach(
    function (f, i)
    {
      var effClass = pmap.get(f);
      if (effClass === "PURE")
      {
        pureFuns++;
      }
    });  
  return {pmTime:pmTime,pureFuns:pureFuns};
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
      var fs = Ast.nodes(ast).filter(function (node) {return node.type === "FunctionDeclaration" || node.type === "FunctionExpression"});

      var sgStart = Date.now();
      var system = cesk.explore(ast);
      var sgTime = Date.now() - sgStart;
      print("sgTime", Formatter.displayTime(sgTime), "states", system.states.count());
      var calledFs = ArraySet.from(system.contexts.map(function (ctx) {return ctx.callable.node})).remove(undefined); // `undefined` = root context

      var aStart = Date.now();
      var amap = computePurity(system, false);
      var aTime = Date.now() - aStart;
      print("aTime", Formatter.displayTime(aTime));

      var faStart = Date.now();
      var famap = computePurity(system, true);
      var faTime = Date.now() - faStart;
      print("faTime", Formatter.displayTime(faTime));

      
      return {benchmark:benchmark,sgTime:sgTime,funs:fs.length,called:calledFs.count(),a:computeResult(fs,amap,aTime), fa:computeResult(fs,famap,faTime)};
    });
}

function r()
{
  return runBenchmarks();
}

function test()
{
  var results = runBenchmarks([
    "sunspider/access-nbody.js",
    "sunspider/controlflow-recursive.js",
    "sunspider/crypto-sha1.js",
    "sunspider/math-spectral-norm.js",
    "jolden/tree-add.js",
  ]);
  displayResults(results);
  return results;
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
    var aresult = result.a;
    var faresult = result.fa;
    print(Formatter.displayWidth(result.benchmark, 30),
        "flowTime", Formatter.displayTime(result.sgTime),
        "funs", Formatter.displayWidth(result.funs,4), "called ", Formatter.displayWidth(result.called,4),
        "pure a ", Formatter.displayWidth(aresult.pureFuns,4), "fa ", Formatter.displayWidth(faresult.pureFuns, 4),
        "time a ", Formatter.displayTime(aresult.pmTime), "fa ", Formatter.displayTime(faresult.pmTime)
        );
  })
}