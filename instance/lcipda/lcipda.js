var cc1 = {a:createMonoTagAg(), gc:false, memo:false, name:"0cfa"};
var cc2 = {a:createMonoTagAg(), gc:false, memo:true, name:"0cfaMemo"};
var cc3 = {a:createMonoTagAg(), gc:true, memo:false, name:"0cfaGc"};
var cc4 = {a:createMonoTagAg(), gc:true, memo:true, name:"0cfaGcMemo"};
var cc5 = {a:create1cfaTagAg(), gc:false, memo:false, name:"1cfa"};
var cc6 = {a:create1cfaTagAg(), gc:false, memo:true, name:"1cfaMemo"};
var cc7 = {a:create1cfaTagAg(), gc:true, memo:false, name:"1cfaGc"};
var cc8 = {a:create1cfaTagAg(), gc:true, memo:true, name:"1cfaGcMemo"};
var ccs = [cc1, cc2, cc3, cc4, cc5, cc6, cc7, cc8];

var results;

function computeResults()
{
  
  var idSrc = {name:"id", src:"(letrec ((id (lambda (x) x))) (id 3) (id 4))"};
  var facSrc = {name:"fac", src:"(letrec ((fac (lambda (n) (if (= n 0) 1 (* n (fac (- n 1))))))) (fac 10))"};
  var gcIpdSrc = {name:"gcIpd", src:read("test/resources/gcIpdExample.scm")};
  var fibSrc = {name:"fib", src:"(letrec ((fib (lambda (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))))) (fib 4))"};
 
  var srcs = [idSrc, facSrc, gcIpdSrc, fibSrc];
  
  results = srcs.map(
    function (src)
    {
      print("=== src", src.name);
      var srcResults = ccs.map(
        function (cc)
        {
          cc = {a:cc.a, gc:cc.gc, memo:cc.memo, p:new TypeLattice(), name:cc.name};
          var sp = new SchemeParser();
          var cesk = lcCesk(cc);
          var driver = new Pushdown();
          var ast = new SchemeParser().parse(src.src)[0];
          var start = Date.now();
          var dsg = driver.analyze(ast, cesk);
          var time = Date.now() - start;
          var numStates = dsg.etg.nodes().length;
          var numEdges = dsg.etg.edges().length;
          print(cc.name, "time", time, "states", numStates, "edges", numEdges);
          return {src:src, cc:cc, time:time, numStates:numStates, numEdges:numEdges};
        });
      return {src:src, srcResults:srcResults};
    });
  print("results", results);
}

function dumpLatex()
{
  print("\\begin{tabular}{| l | ", ccs.map(function (cc) {return "l"}).join(" | "), "|}");
  print("\\hline");
  print("Progam & ", ccs.map(function (cc) {return cc.name}).join(" & "), "\\\\ \\hline");
  //print("1 & 2 & 3 & 4 & 5 & 6 & 7 & 8 & 9 \\\\");
  results.forEach(
    function (result)
    {
      var src = result.src;
      var srcResults = result.srcResults;
      var ccString = srcResults.map(
        function (cc) 
        {
          return cc.numStates + "/" + cc.numEdges + " " + cc.time + "ms"; 
        }).join(" & ");
      print(src.name, "&", ccString, "\\\\ \\hline");
    });
  print("\\end{tabular}");
}

function repl(cc)
{
  cc = cc || {};
  var sp = new SchemeParser();
  var name = cc.name || "lcipda";
  var cesk = lcCesk({a:cc.a || createMonoTagAg(), p:cc.p || new Lattice1()});
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
      resultStates.forEach(function (haltState) {print(haltState.value)});
      store = resultStates.map(function (haltState) {return haltState.store}).reduce(Lattice.join, BOT);
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
  return repl({name: "conc", p:new CpLattice(), a:concreteAg});
}

