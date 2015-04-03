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
      result = ArraySet.empty();
      var system = Pdg._explore(ast);
      var contexts = system.contexts;
      contexts.forEach(
        function (ctx)
        {
          var ex = ctx.ex;
          if (ex === callExpression)
          {
            var callable = ctx.callable;
            if (callable.node)
            {
              result = result.add(callable.node);
            }
          }
        });
      callNode._functionsCalled = result;
    }
    return result;
  }