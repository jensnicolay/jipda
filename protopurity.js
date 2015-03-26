function displayTime(ms)
{
  var min = Math.floor(ms / 60000);
  var sec = Math.floor((ms % 60000) / 1000);
  return min + "'" + (sec < 10 ? "0" : "") + sec + "\"";
}

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

function runBenchmarks(benchmarks)
{
  var bprefix = "test/resources/";
  benchmarks = benchmarks ||
                    ["fib.js",
                     "gcIpdExample.js",
                     "navier-stokes-light.js",
                     "sunspider/controlflow-recursive.js",
                     "sunspider/access-nbody.js"]
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

      print("sgTime", displayTime(sgTime), "states", system.numStates);

      var pmStart = Date.now();
      var pmap = computePurity(system.initial, system.sstore);
      var pmTime = Date.now() - pmStart;
      
      print("pmTime", displayTime(pmTime), "count", pmap.count());
      
      displayPurity(ast, pmap);
      
      var result = {};
      print();
      return result;
    });
}

function r()
{
  b();
  return runBenchmarks();
}

function serverTest()
{
  runBenchmarks([
                 "octane/navier-stokes.js", 
                 "octane/richards.js",
                 "sunspider/3d-cube.js",
                 "octane/splay.js"]);
}

function concEval(src)
{
  var ast = Ast.createAst(src);
  var cesk = jsCesk({a:createConcAg(), l: new ConcLattice()});
  var s = cesk.explore(ast);
  print(s.value);
}

function typeEval(src)
{
  var ast = Ast.createAst(src);
  var cesk = jsCesk({a:createTagAg(), l: new JipdaLattice()});
  var system = cesk.explore(ast);
  var result = statesResult(system.states);
  print(result);
}


/*******/

var Pdg = {};

Pdg.declarationOf =
  function (nameNode, ast)
  {
    assert(nameNode.name);
    var result = nameNode._declarationOf; 
    if (!result)
    {
      result = Ast.findDeclarationNode(nameNode, ast);
      nameNode._declarationOf = result;
    }
    return result;
  }

Pdg._explore =
  function (ast)
  {
    var result = ast._system;
    if (!result)
    {
      var cesk = jsCesk({a:createTagAg(), l: new JipdaLattice()});
      result = cesk.explore(ast);
      ast._system = result;
      var states = [];
      var todo = [result.initial];
      while (todo.length > 0)
      {
        var s = todo.pop();
        if (states[s._id])
        {
          continue;
        }
        states[s._id] = s;
        s._successors.forEach(
         function (t)
          {
            todo.push(t.state);
          });  
      }
      result.states = states;
      result.isAtomic = cesk.isAtomic;
      result.evalAtomic = cesk.evalAtomic;
    }
    return result;
  }

Pdg.getCallExpression =
  function (node)
  {
    if (Ast.isCallExpression(node))
    {
      return node;
    }
    if (node.type === "ExpressionStatement")
    {
      return Pdg.getCallExpression(node.expression);
    }
  }

Pdg.values =
  function (node, ast)
  {
    var result = node._values;
    if (!result)
    {
      var system = Pdg._explore(ast);
      var states = system.states;
      var result = BOT;
      function handle(s, n)
      {
        if (n === node)
        {
          var todo = s._successors.map(function (t) {return t.state});
          var visited = ArraySet.empty();
          while (todo.length > 0)
          {
            var ss = todo.pop();
            if (visited.contains(ss))
            {
              continue;
            }
            visited = visited.add(ss);
            if (ss.kont.equals(s.kont) && ss.lkont.equals(s.lkont))
            {
              result = result.join(ss.value);
              continue;
            }
            ss._successors.forEach(function (t) {todo.push(t.state)});
          }
        }
        else if (n.type === "ExpressionStatement")
        {
          return handle(s, n.expression);
        }
        else
        {
          var children = Ast.children(n);
          var i = 0;
          while (i < children.length && system.isAtomic(children[i]))
          {
            if (children[i] === node)
            {
              result = result.join(system.evalAtomic(children[i], s.benv, s.store, []));
            }
            i++;
          }
        }
      }
      states.forEach(
        function (s)
        {
          if (s.node)
          {
            var n = s.node;
            if (n)
            {
              handle(s, n);
            }
          }
        });
      node._values = result;
    }
    return result;
  }

Pdg.functionsCalled =
  function (callNode, ast)
  {
    var callExpression = Pdg.getCallExpression(callNode);
    var result = callNode._functionsCalled;
    if (!result)
    {
      result = [];
      var system = Pdg._explore(ast);
      var sstore = system.sstore;
      sstore.forEach(
        function (entry)
        {
          var ctx = entry[0];
          var ex = ctx.ex;
          if (ex === callExpression)
          {
            var callable = ctx.callable;
            if (callable.node)
            {
              result.push(callable.node);
            }
          }
        });
      callNode._functionsCalled = result;
    }
    return result;
  }