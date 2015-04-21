function computePurity(ast, initial, sstore)
{
  function stackContexts(kont) 
  {
    var todo = [kont];
    var visited = ArraySet.empty();
    while (todo.length > 0)
    {
      var kont = todo.pop();
      if (kont === EMPTY_KONT || visited.contains(kont))
      {
        continue;
      }
      visited = visited.add(kont);
      var stacks = kont._stacks;
      stacks.values().forEach(
        function (stack)
        {
          var kont = stack[1];          
          todo.push(kont);
        });
    }
    return visited.values();
  }
  
  function subsumes(key, addr, name)
  {
    if (!key[0].equals(addr))
    {
      return false;
    }
    if (isFinite(key[1].tag))
    {
      return name === key[1];
    }
    if (!isFinite(name.tag))
    {
      return key[1].subsumes(name);      
    }
    return false; 
  }
  
  function getDeclarationNode(nameNode)
  {
    var declarationNode = nameNode._declarationNode;
    if (!declarationNode)
    {
      declarationNode = Ast.findDeclarationNode(nameNode, ast);
      nameNode._declarationNode = declarationNode;
    }
    return declarationNode;
  }
  
  function declarationNodeLocalToFun(declarationNode, fun)
  {
    var local = Arrays.contains(declarationNode, fun.params) || Arrays.contains(declarationNode, Ast.nodes(fun))
    return local;
  }
  
  var pmap = HashMap.empty(); // fun -> {PURE, OBSERVER, PROC}
  var rdep = HashMap.empty(); // [addr, name] -> P(fun): read deps
  var odep = HashMap.empty(); // [addr, name] -> P(fun): if written, then mark funs as obs
  var age = 0;
  
  function markProcedure(fun)
  {
    var current = pmap.get(fun);
    if (current === "PROC")
    {
      return 0;
    }
    pmap = pmap.put(fun, "PROC");
    age++;
  }
  
  function markObserver(fun)
  {
    var current = pmap.get(fun);
    if (current === "OBS" || current === "PROC")
    {
      return ;
    }
    pmap = pmap.put(fun, "OBS");
    age++;
  }
  
  function markPure(fun)
  {
    var current = pmap.get(fun);
    if (!current)
    {
      pmap = pmap.put(fun, "PURE");
      //age++;
    } 
  }
  
  function addRdep(addr, name, fun)
  {
    var currentRdep = rdep.get([addr, name]) || ArraySet.empty();
    if (currentRdep.contains(fun))
    {
      return;
    }
    rdep = rdep.put([addr, name], currentRdep.add(fun));
    age++;
  }
  
  function getRdeps(addr, name)
  {
    var result = ArraySet.empty();
    rdep.iterateEntries(
      function (entry)
      {
        var key = entry[0];
        if (subsumes(key, addr, name))
        {
          result = result.join(entry[1]);
        }
      });
    return result.values();
  }
  
  function addOdep(addr, name, fun)
  {
    var currentOdep = odep.get([addr, name]) || ArraySet.empty();
    if (currentOdep.contains(fun))
    {
      return;
    }
    odep = odep.put([addr, name], currentOdep.add(fun));
    age++;
  }
  
  function getOdeps(addr, name)
  {
    var result = ArraySet.empty();
    odep.iterateEntries(
      function (entry)
      {
        var key = entry[0];
        if (subsumes(key, addr, name))
        {
          result = result.join(entry[1]);
        }
      });
    return result.values();
  }

  var todo = [initial];
  while (todo.length > 0)
  {
    var s = todo.pop();
    if (s._purity === age) 
    {
      continue;
    }
    s._purity = age;
    var outgoing = s._successors;
    var ctxs = stackContexts(s.kont, sstore);
    ctxs.forEach(function (ctx)
        {
          var fun = ctx.callable.node;
          if (fun)
          {
            markPure(fun);
          }
        });
    outgoing.forEach(
      function (t) 
      {
        var effects = t.effects || [];
        effects.forEach(
          function (effect) 
          {
            var effectAddress = effect.address;
            var effectName = effect.name.tag > -1 ? getDeclarationNode(effect.name) : effect.name;
            
            if (effect.isWriteEffect()) // write
            {
              var funRdeps = getRdeps(effectAddress, effectName);
              funRdeps.forEach(
                function (funRdep)
                {
//                  print(t._id, "r->o", funRdep.loc.start.line, effectAddress, effectName);
                  addOdep(effectAddress, effectName, funRdep);
                })
            }
            else // read
            {
              var funOdeps = getOdeps(effectAddress, effectName);
              funOdeps.forEach(
                function (funOdep)
                {
//                  print(t._id, "observer", funOdep.loc.start.line, effectAddress, effectName);
                  markObserver(funOdep);
                })
            }
            
            ctxs.forEach(
              function (ctx)
              {
                var fun = ctx.callable.node;
                if (fun)
                {
                  if (effectName.tag > -1 && declarationNodeLocalToFun(effectName, fun)) // var && local
                  {
//                    print(effect, ctx, "local r/w var effect");
                    return;
                  }

                  var storeAddresses = ctx.store.keys();
                  if (Arrays.contains(effectAddress, storeAddresses)) // non-local
                  {
                    if (effect.isWriteEffect())
                    {
//                      print(effect, ctx, "non-local write addr effect");
//                      print(t._id, "procedure", fun.loc.start.line, effectAddress, effectName);
                      markProcedure(fun);
                    }
                    else // read
                    {
//                      print(effect, ctx, "non-local read addr effect");
//                      print(t._id, "->r", fun.loc.start.line, effectAddress, effectName);
                      addRdep(effectAddress, effectName, fun);
                    }
                  }
                  else // local
                  {
//                    print(effect, ctx, "local r/w addr effect");
                  }
                }
              }) // end for each ctx
          }) // end for each effect
        todo.push(t.state);
      }) // end for each outgoing
  }
  return pmap;
}
