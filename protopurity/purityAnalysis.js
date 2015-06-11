function getDeclarationNode(nameNode, ast, ctx)
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

function computeMutability(ast, initial)
{
  function handleNode(node, fresh, ctx)
  {
    switch (node.type)
    {
      case "VariableDeclaration":
        node.declarations.forEach(function (declarator) {fresh = handleNode(declarator, fresh, ctx)});
        return fresh;
      case "VariableDeclarator":
        var init = node.init;
        if (init)
        {
          if (init.type === "ObjectExpression")
          {
            return fresh.add(node);          
          }
          if (init.type === "Identifier")
          {
            if (fresh.contains(getDeclarationNode(init, ast, ctx)))
            {
              return fresh.add(node);
            }
          }
          if (init.type === "ThisExpression" && isConstructorCall(ctx))
          {
            return fresh.add(node);
          }
          return fresh;
        }
        return fresh;
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
          var dn = getDeclarationNode(left, ast, ctx);
          if (right.type === "ObjectExpression")
          {
            return fresh.add(dn);          
          }
          if (right.type === "Identifier")
          {
            if (fresh.contains(getDeclarationNode(right, ast, ctx)))
            {
              return fresh.add(dn);
            }
          }
          if (right.type === "ThisExpression" && ctrCall)
          {
            return fresh.add(dn);
          }
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

function computePurity(ast, initial)
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
  
//  function freeVars(fun, ast)
//  {
//    var funNodes = Ast.nodes(fun);
//    var result = ArraySet.empty();
//    funNodes.forEach(
//      function (funNode)
//      {
//        if (funNode.name)
//        {
//          var declarationNode = Ast.declarationNode(funNode.name, funNode, ast);
//          
//        }
//      }
//  }
  
  
  function isMemberWrite(effect, ctx)
  {
    return effect.node
      && effect.node.type === "AssignmentExpression"
      && effect.node.left.type === "MemberExpression";
  }

  function outOfScope(declarationNode, fun, ast)
  {
    if (Ast.enclosingFunScope(declarationNode, ast).equals(fun))
    {
      return false;
    }
    var decl2 = Ast.findDeclarationNode(declarationNode.name || declarationNode.id.name, fun, ast);
    return !declarationNode.equals(decl2);
  }
  
  computeMutability(ast, initial);
  
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
            var name = varEffect ? getDeclarationNode(effect.name, ast, s.kont) : effect.name;
            var writeEffect = effect.isWriteEffect();
            var readEffect = effect.isReadEffect();
                
            if (varEffect)
            {
              if (writeEffect)
              {
                ctxs.forEach(
                  function (ctx)
                  {
                    var fun = ctx.callable.node;
                    if (isFreeVar(name, fun, ast))
                    {
                      print(effect.node, "PROC: free var write effect", effect, fun);
                      markProcedure(fun);
                    }
                  })
              }
              else
              {
                ctxs.forEach(
                  function (ctx)
                  {
                    var fun = ctx.callable.node;
                    if (localVarEffect(name, fun))
                    {
                      return;
                    }
                    
                  })
              }
            } // end var effect
            else // member effect
            {
              if (writeEffect)
              {
                
                if (effect.node.object)
                {
                  if (effect.node.object.type === "ThisExpression" && isConstructorCall(s.kont))
                  {
                    return;
                  }
                  
                  if (effect.node.object.type === "Identifier")
                  {
                    var dn = getDeclarationNode(effect.node.object, ast, s.kont); 
                    var fresh = s.fresh;
                    if (fresh.contains(dn))
                    {
                      return;
                    }
                  }
                }
                
                ctxs.forEach(
                  function (ctx)
                  {
                    if (ctx === EMPTY_KONT)
                    {
                      //top-level = mutable
                      return;
                    }
                    var storeAddresses = ctx.store.keys();
                    if (!Arrays.contains(address, storeAddresses)) // local
                    {
                      return;
                    }
                    
                    var fun = ctx.callable.node;
                    print("PROC:", effect.node, "in", fun);
                    markProcedure(fun);
                  }) // end for each ctx
              } // end write effect
              else // read
              {

              }
            } // end member effect
          }) // end for each effect
        todo.push(t.state);
      }) // end for each outgoing
  }
  return pmap;
}
