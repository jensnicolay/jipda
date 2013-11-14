var ccs = [];
ccs.push({gc:false, memo:false, name:"GC off, memo off"});
ccs.push({gc:false, memo:true, name:"GC off, memo on"});
ccs.push({gc:true, memo:false, name:"GC on, memo off"});
ccs.push({gc:true, memo:true, name:"GC on, memo on"});

var ags = [];
ags.push({a:createMonoTagAg(), name:"0CFA"});
ags.push({a:create1cfaTagAg(), name:"1CFA"});

var results;

function computeResult(src, cc)
{
  var time;
  try
  {
    var sp = new SchemeParser();
    var cesk = lcCesk(cc);
    var driver = new Pushdown(cc.limitMs);
    var ast = new SchemeParser().parse(src)[0];
    var start = Date.now();
    var dsg = driver.analyze(ast, cesk);
    var numStates = dsg.etg.nodes().length;
    var numEdges = dsg.etg.edges().length;
    var numMemoEdges = dsg.etg.edges().reduce(function (numMemoEdges, e) {return numMemoEdges + (e.marks === "MEMO" ? 1 : 0)}, 0);
    var time = dsg.time;
    print(cc.name, "time", time, "states", numStates, "edges", numEdges, "memoEdges", numMemoEdges);
    return {time:time, numStates:numStates, numEdges:numEdges, numMemoEdges:numMemoEdges};
  }
  catch (e)
  {
    time = time || (start ? (Date.now() - start) : null);
    print("after", time, e);
    return {cc:cc, error:e, time:time};            
  }
}

function computeResults(limitMin, x)
{
  var totalStart = Date.now();
  var sources = [];
  if (!x || x === 1)
  {
//  sources.push({name:"id", src:"(letrec ((id (lambda (x) x))) (id 3) (id 4))"});
//  sources.push({name:"rotate", src:read("test/resources/rotate.scm")});
    sources.push({name:"fac", src:"(letrec ((fac (lambda (n) (if (= n 0) 1 (* n (fac (- n 1))))))) (fac 10))"});
    sources.push({name:"gcipd", src:read("test/resources/gcIpdExample.scm")});
    sources.push({name:"fib", src:"(letrec ((fib (lambda (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))))) (fib 4))"});
    sources.push({name:"mj09", src:read("test/resources/mj09.scm")});
    sources.push({name:"eta", src:read("test/resources/eta.scm")});
    sources.push({name:"kcfa2", src:read("test/resources/kcfa2.scm")});    
    sources.push({name:"blur", src:read("test/resources/blur.scm")});
  }
  if (!x || x === 2)
  {
    sources.push({name:"loop2", src:read("test/resources/loop2.scm")});
    sources.push({name:"kcfa3", src:read("test/resources/kcfa3.scm")});
  }
  if (!x || x === 3)
  {
    sources.push({name:"primtest", src:read("test/resources/primtest.scm")});
  }
  if (!x || x === 4)
  {
    sources.push({name:"factor", src:read("test/resources/factor.scm")});
  }
  if (!x || x === 5)
  {
    sources.push({name:"rsa", src:read("test/resources/rsa.scm")});
  }
  if (!x || x === 6)
  {
    sources.push({name:"sat", src:read("test/resources/sat.scm")});
  }
  if (!x || x === 7)
  {
    sources.push({name:"cpstak", src:read("test/resources/cpstak.scm")});
  }
  if (!x || x === 8)
  {
//    sources.push({name:"regex", src:read("test/resources/regex.scm")});
//  sources.push({name:"church", src:read("test/resources/churchNums.scm")});
  }
  results = sources.map(
    function (src)
    {
      print("=== src", src.name);
      var srcResults = ccs.map(
        function (ccc)
        {
          var acResults = ags.map(
            function (ac)
            {
              var cc = {a:ac.a, gc:ccc.gc, memo:ccc.memo, l:new TypeLattice(), name:ccc.name, limitMs:limitMin * 60000};
              return computeResult(src.src, cc);
            });
          return {cc:ccc, acResults:acResults};
        });
      return {src:src, srcResults:srcResults};
    });
  print("results", results);
  var totalTime = Date.now() - totalStart;
  print("total time", Math.abs(totalTime/60000), "minutes");
}

function cr(x)
{
  return computeResults(30, x);
}

function dumpLatex()
{
  
  function timeString(ms)
  {
    if (ms < 100)
    {
      return "\\epsilon";
    }
    else if (ms < 10000)
    {
      return Math.round(ms / 100) / 10 + "''";
    }
    else
    {
      return Math.round(ms / 1000) + "''";
    }
  }
  
  print("\\begin{tabular}{| l | l ||", ccs.map(function (cc) {return "l"}).join(" | "), "|}");
  print("\\hline");
  print("Progam & Polyvariance &", ccs.map(function (cc) {return cc.name}).join(" & "), "\\\\ \\hline");
  //print("1 & 2 & 3 & 4 & 5 & 6 & 7 & 8 & 9 \\\\");
  var fixedAcString = "$\\begin{matrix}" + ags.map(function (ac) {return "\\textrm{" + ac.name + "}"}).join("\\\\") + "\\end{matrix}$";
  results.forEach(
    function (result)
    {
      var src = result.src;
      var srcResults = result.srcResults;
      var ccString = srcResults.map(
        function (cc)
        {
          return "$\\begin{matrix} " + cc.acResults.map(
            function (ac) 
            {
              if (ac.error)
              {
                var errorText = String(ac.error);
                if (errorText.indexOf("overflow") !== -1)
                {
                  return "\\infty";
                }
                return errorText;
              }
              return (ac.numStates + "/" + ac.numEdges + (cc.cc.memo ? ("(" + ac.numMemoEdges + ")") : "" ) + "\\quad" + timeString(ac.time)); 
            }).join(" \\\\ ") + " \\end{matrix}$";          
        }).join(" & ");
      print(src.name, "&", fixedAcString, "&", ccString, "\\\\ \\hline");
    });
  print("\\end{tabular}");
}

function repl(cc)
{
  cc = cc || {};
  var sp = new SchemeParser();
  var name = cc.name || "lcipda";
  var cesk = lcCesk({a:cc.a || createMonoTagAg(), l:cc.l || new Lattice1()});
  var src = "\"I am " + name + "\"";
  var store = cesk.store;
  var driver = new Pushdown();
  while (src !== ":q")
  {
    var ast = sp.parse(src)[0];
    try
    {
      var result = driver.analyze(ast, cesk, {store:store});
      print("(states " + result.etg.nodes().length + " edges " + result.etg.edges().length + ")");
      var resultStates = result.stepFwOver(result.initial);
      resultStates.forEach(function (haltState) {print(haltState.q.value)});
      store = resultStates.map(function (haltState) {return haltState.q.store}).reduce(Lattice.join, BOT);
    }
    catch (e)
    {
      print(e.stack);
    }
    write(name + "> ");
    src = readline();
  }
  print("Bye!");
}

function concRepl()
{
  return repl({name: "conc", p:new CpLattice(), a:createConcreteAg()});
}

