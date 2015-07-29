function getDeclarationNode(nameNode, ast)
{
  if (!nameNode.name)
  {
    throw new Error("not a name node:" + nameNode);
  }
  var declarationNode = nameNode._declarationNode;
  if (!declarationNode)
  {
    declarationNode = Ast.findDeclarationNode(nameNode.name, nameNode, ast);
    nameNode._declarationNode = declarationNode;
  }
  if (!declarationNode)
  {
    throw new Error("no declaration node for " + nameNode);
  }
  return declarationNode;
}

function declarationNodeLocalToFun(declarationNode, fun)
{
  var local = Arrays.contains(declarationNode, fun.params) || Arrays.contains(declarationNode, Ast.nodes(fun))
  return local;
}

function isConstructorCall(ctx)
{
  return ctx.ex && Ast.isNewExpression(ctx.ex);
}

function isFreeVar(declarationNode, fun, ast)
{
  var enclosingScope = Ast.enclosingFunScope(declarationNode, ast);
  var free = !fun.equals(enclosingScope) && Arrays.contains(fun, Ast.nodes(enclosingScope.body));
  return free;
}

function computeFreshness(ast, initial)
{
  function handleNode(node, fresh, ctx)
  {
    switch (node.type)
    {
      case "VariableDeclaration":
        node.declarations.forEach(function (declarator) {fresh = handleNode(declarator, fresh, ctx)});
        return fresh;
      case "VariableDeclarator":
        var dn = getDeclarationNode(node.id, ast);
        if (!node.init)
        {
          return fresh;
        }
        if (isFresh(node.init, ast, ctx, fresh))
        {
          return fresh.add(dn);
        }
        return fresh.remove(dn);
      case "BlockStatement":
        if (node.body.length === 1)
        {
          return handleNode(node.body[0], fresh, ctx);
        }
        return fresh;
      case "ExpressionStatement":
        return handleNode(node.expression, fresh, ctx);
      case "AssignmentExpression":
        var left = node.left;
        var right = node.right;
        if (left.type === "Identifier")
        {
          var dn = getDeclarationNode(left, ast);
          if (isFresh(right, ast, ctx, fresh))
          {
            return fresh.add(dn);
          }
          return fresh.remove(dn);
        }
        return fresh;
      default:
        return fresh;
    }
  }
  
  function handleState(s)
  {
    var node = s.node;
    var fresh = s.fresh;
    if (!node)
    {
      return fresh;
    }
    var ctx = s.kont;
    return handleNode(node, fresh, ctx);
  }
    
  var todo = [[initial, HashMap.empty()]];
  while (todo.length > 0)
  {
    var config = todo.pop();
    var s = config[0];
    if (s.fresh)
    {
      continue
    }
    var handler = config[1];
    var fresh = handler.get(s.kont);
    if (!fresh)
    {
      fresh = ArraySet.empty();
    }
    s.fresh = fresh; 
    
    var newFresh = handleState(s);
    var newHandler = handler.put(s.kont, newFresh);
    
    var outgoing = s._successors;
    outgoing.forEach(
      function (t) 
      {
        todo.push([t.state, newHandler]);
      });
  }
}

function isFresh(node, ast, kont, freshVars)
{
  switch (node.type)
  {
    case "Identifier":
    {
      var dn = getDeclarationNode(node, ast);
      return freshVars.contains(dn);
    }
    case "AssignmentExpression":
      return isFresh(node.right, ast, kont, freshVars);
    case "ObjectExpression": return true;
    case "NewExpression": return true;
    case "ThisExpression": return isConstructorCall(kont);
//    case "VariableDeclarator": return node.init && isFresh(node.init, ast, kont, freshVars);
    default: return false;
  }
}

function computePurity(ast, initial)
{
  function stackContexts(kont) 
  {
    var todo = [kont];
    var visited = ArraySet.empty();
    while (todo.length > 0)
    {
      var kont = todo.pop();
      if (kont.ex === null || visited.contains(kont))
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
  
  function fresh(s)
  {
    var effectNode;
    if (s.node)
    {
      effectNode = s.node;
    }
    if (s.value && s.lkont[0].node)
    {
      effectNode = s.lkont[0].node;
    }
    assert(effectNode);
    if (effectNode.type === "AssignmentExpression")
    {
      if (effectNode.left.object)
      {
        return isFresh(effectNode.left.object, ast, s.kont, s.fresh);
      }
    }
    return false;
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
    return result;
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
    return result;
  }
  
  function localVarEffect(effectName, fun)
  {
    return effectName.tag > -1 && declarationNodeLocalToFun(effectName, fun) // var && local
//      print(effect, ctx, "local r/w var effect");
  }
  
  computeFreshness(ast, initial);
  
  var todo = [initial];
  while (todo.length > 0)
  {
    var s = todo.pop();
    if (s._purity === age) 
    {
      continue;
    }
    s._purity = age;
    
    var ctxs = stackContexts(s.kont);
    ctxs.forEach(function (ctx)
      {
        var fun = ctx.callable.node;
        if (fun)
        {
          markPure(fun);
        }
      });
    
    var outgoing = s._successors;
    outgoing.forEach(
      function (t) 
      {
        var effects = t.effects || [];
        effects.forEach(
          function (effect) 
          {
            var address = effect.address;
            var varEffect = effect.name.tag > -1;
            var name = varEffect ? getDeclarationNode(effect.name, ast) : effect.name;
            var writeEffect = effect.isWriteEffect();
            var readEffect = effect.isReadEffect();
            
            if (writeEffect)
            {
              if (varEffect)
              {
                var funRdeps = getRdeps(address, name);
                funRdeps.forEach(
                  function (funRdep)
                  {
  //                      print(t._id, "r->o", funRdep.loc.start.line, effectAddress, effectName);
                    addOdep(address, name, funRdep);
                  })
                ctxs.forEach(
                  function (ctx)
                  {
                    var fun = ctx.callable.node;
                    if (isFreeVar(name, fun, ast))
                    {
//                      print(effect.node, "PROC: free var write effect", effect, fun);
                      markProcedure(fun);
                    }
                  })
              }
              else // member effect
              {
                var funRdeps = getRdeps(address, name);
                funRdeps.forEach(
                  function (funRdep)
                  {
  //                      print(t._id, "r->o", funRdep.loc.start.line, effectAddress, effectName);
                    addOdep(address, name, funRdep);
                  })

                if (fresh(s, ast))
                {
                  return;
                }

                ctxs.forEach(
                  function (ctx)
                  {
                    var storeAddresses = ctx.store.keys();
                    if (!Arrays.contains(address, storeAddresses)) // local
                    {
                      return;
                    }
                    
                    var fun = ctx.callable.node;
//                    print("PROC:", effectNode, "in", fun);
                    markProcedure(fun);
                  }) // end for each ctx
              }
            }
            else // read
            {
              var funOdeps = getOdeps(address, name);
              if (varEffect)
              {
                ctxs.forEach(
                  function (ctx)
                  {
                    var fun = ctx.callable.node;
                    if (localVarEffect(name, fun))
                    {
                      return;
                    }
                    if (isFreeVar(name, fun, ast))
                    {                                        
                    }
                    else
                    {
                      return;
                    }
                    addRdep(address, name, fun);
                    if (funOdeps.contains(fun))
                    {
                      // print(t._id, "observer", fun.loc.start.line, effectAddress, effectName);
                      markObserver(fun);
                    }                    
                  })
              }
              else // member
              {
                if (fresh(s, ast))
                {
                  print("fresh for reading!");
                  return;
                }
                
                ctxs.forEach(
                  function (ctx)
                  {
                    var fun = ctx.callable.node;
                    var storeAddresses = ctx.store.keys();
                    if (!Arrays.contains(address, storeAddresses)) // local
                    {
                      return;
                    }
  //                print(effect, ctx, "non-local read addr effect");
  //                print(t._id, "->r", fun.loc.start.line, effectAddress, effectName);
                    addRdep(address, name, fun);
                    if (funOdeps.contains(fun))
                    {
                      // print(t._id, "observer", fun.loc.start.line, effectAddress, effectName);
                      markObserver(fun);
                    }                    
                  })
              }
          }
        });
        todo.push(t.state);
      })
  }
  return pmap;
}
