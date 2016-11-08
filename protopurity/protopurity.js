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
  var obsFuns = 0;
  var procFuns = 0;
  fs.forEach(
    function (f, i)
    {
      var effClass = pmap.get(f);
      if (effClass === "PURE")
      {
        pureFuns++;
      }
      else if (effClass === "OBS")
      {
        obsFuns++;
      }
      else if (effClass === "PROC")
      {
        procFuns++;
      }
      //else
      //{
      //  throw new Error("Helaba!");
      //}
    });  
  return {pmTime:pmTime,pureFuns:pureFuns,obsFuns:obsFuns,procFuns:procFuns};
}

function runBenchmarks(benchmarks)
{
  
  function transitions(initial)
  {
    let ts = [];
    let todo = [initial];
    while (todo.length > 0)
    {
      let s = todo.pop();
      s._successors.forEach(
          function (t)
          {
            if (isFinite(t._id))
            {
              return;
            }
            t._id = ts.push(ts) - 1;
            todo.push(t.state);
          });
    }
    return ts;
  }
  
  var bprefix = "../test/resources/";
  benchmarks = benchmarks ||
                    ["fib.js",
                     "gcIpdExample.js",
                     // "navier-stokes-light.js",
                     // "sunspider/access-nbody.js",
                     // "sunspider/controlflow-recursive.js",
                     // "sunspider/crypto-sha1.js",
                     // "sunspider/math-spectral-norm.js",
                     // "jolden/tree-add.js",
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
      var ts = transitions(system.initial);
      print("sgTime", Formatter.displayTime(sgTime), "states", system.states.length, "edges", ts.length);
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
    //"sunspider/controlflow-recursive.js",
    //"sunspider/crypto-sha1.js",
    //"sunspider/math-spectral-norm.js",
    //"jolden/tree-add.js",
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
    "octane/richards.js",
    "jolden/bisort.js",
    "jolden/em3d.js",
    "jolden/mst.js"
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
        "a  time",  Formatter.displayTime(aresult.pmTime), "pure", Formatter.displayWidth(aresult.pureFuns,4), "obs", Formatter.displayWidth(aresult.obsFuns,4), "proc", Formatter.displayWidth(aresult.procFuns,4),
        "fa time",  Formatter.displayTime(faresult.pmTime), "pure", Formatter.displayWidth(faresult.pureFuns,4), "obs", Formatter.displayWidth(faresult.obsFuns,4), "proc", Formatter.displayWidth(faresult.procFuns,4)
        );
  })
}

function paperTest()
{
  const benchmarks = [
      "fib.js",
    // "sunspider/access-nbody.js",
    // "sunspider/controlflow-recursive.js",
    // "sunspider/crypto-sha1.js",
    // "sunspider/math-spectral-norm.js",
    // "jolden/tree-add.js",
    // "navier-stokes-conc.js",   // CONC!
    // "octane/richards.js",
    // "jolden/bisort.js",
    //   "jolden/em3d.js",
    //   "jolden/mst.js"
    ];
  
  const PURE="PURE", OBS="OBS", PROC="PROC";
  
  function createTypeCesk(ast)
  {
    return jsCesk({a:createTagAg(), l:new JipdaLattice()});
  }
  
  function createConcCesk(ast)
  {
    return jsCesk({a:createConcAg(), l:new ConcLattice()});
  }
  
  
  function test(benchmark)
  {
    var src = read(bprefix + benchmark);
    var ast = Ast.createAst(src);
    var allFuns = Ast.nodes(ast).filter(function (node) {return node.type === "FunctionDeclaration" || node.type === "FunctionExpression"});
   
    var concCesk = createConcCesk(ast);
    var concResult = concCesk.explore(ast);
    print("explored conc");
    var concMap = computePurity(concResult, false);
    var concP = computeResult(allFuns, concMap, 0);
    print("a conc   ", concP.pureFuns, concP.obsFuns, concP.procFuns);
    
    var faConcMap = computePurity(concResult, true);
    //displayPurity(ast, concMap);
    //displayPurity(ast, faConcMap);
    assertEquals(concMap, faConcMap, "fa conc equality");
    var faConcP = computeResult(allFuns, faConcMap, 0);
    print("fa conc  ", faConcP.pureFuns, faConcP.obsFuns, faConcP.procFuns);

    
    var typeCesk = createTypeCesk(ast);
    var typeResult = typeCesk.explore(ast);
    print("explored type");
    var typeMap = computePurity(typeResult, false);
    for (var i = 0; i < allFuns.length; i++)
    {
      var f = allFuns[i];
      var funName = f.id ? f.id.name : f.loc;
      var expected = concMap.get(f);
      var actual = typeMap.get(f);
      if (expected===PROC)
      {
        assertTrue(actual===PROC, "a subsumption " + funName);
      }
      else if (expected===OBS)
      {
        assertTrue((actual===PROC)||(actual===OBS), "a subsumption " + funName);
      }
    }
    var typeP = computeResult(allFuns, typeMap, 0);
    print("a type   ", typeP.pureFuns, typeP.obsFuns, typeP.procFuns);
  
  
    var faTypeMap = computePurity(typeResult, true);
    for (var i = 0; i < allFuns.length; i++)
    {
      var f = allFuns[i];
      var funName = f.id ? f.id.name : f.loc;
      var expected = concMap.get(f);
      var actual = faTypeMap.get(f);
      if (expected===PROC)
      {
        assertTrue(actual===PROC, "fa subsumption " + funName);
      }
      else if (expected===OBS)
      {
        assertTrue((actual===PROC)||(actual===OBS), "fa subsumption " + funName);
      }
    }
    var faTypeP = computeResult(allFuns, faTypeMap, 0);
    print("fa type  ", faTypeP.pureFuns, faTypeP.obsFuns, faTypeP.procFuns);

    var concFuns = concMap.keys();
    var faTypePc = computeResult(concFuns, faTypeMap, 0);
    print("fa type c", faTypePc.pureFuns, faTypePc.obsFuns, faTypePc.procFuns);
    return {benchmark, concP, faConcP, typeP, faTypeP, faTypePc};
  }
  var bprefix = "../test/resources/";
  var results = benchmarks.map(
      function (benchmark)
      {
        print("=======================");
        print(benchmark);
        return test(benchmark);
      });
  results.forEach(
      function (result)
      {
        print("=======================");
        print(result.benchmark);
        var concP = result.concP;
        print("a conc   ", concP.pureFuns, concP.obsFuns, concP.procFuns);
        // var faConcP = result.faConcP;
        // print("fa conc  ", faConcP.pureFuns, faConcP.obsFuns, faConcP.procFuns);
        var faTypePc = result.faTypePc;
        print("fa type c", faTypePc.pureFuns, faTypePc.obsFuns, faTypePc.procFuns);
        var typeP = result.typeP;
        print("a type   ", typeP.pureFuns, typeP.obsFuns, typeP.procFuns);
        var faTypeP = result.faTypeP;
        print("fa type  ", faTypeP.pureFuns, faTypeP.obsFuns, faTypeP.procFuns);
      })
}