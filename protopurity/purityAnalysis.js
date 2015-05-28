function getDeclarationNode(nameNode, ast)
{
//  if (!nameNode.name)
//  {
//    throw new Error("not a name node: " + nameNode);
//  }
  var declarationNode = nameNode._declarationNode;
  if (!declarationNode)
  {
    declarationNode = Ast.findDeclarationNode(nameNode, ast);
    nameNode._declarationNode = declarationNode;
  }
//  if (!declarationNode)
//  {
//    throw new Error("no declaration node for " + nameNode);
//  }
  return declarationNode;
}

function declarationNodeLocalToFun(declarationNode, fun)
{
  var local = Arrays.contains(declarationNode, fun.params) || Arrays.contains(declarationNode, Ast.nodes(fun))
  return local;
}

function isConstructorCall(ctx)
{
  return Ast.isNewExpression(ctx.ex);
}

var MUTABLE = "MUT";
var IMMUTABLE = "IMM";

function getType(node, ctxHandler, ast)
{
  switch (node.type)
  {
    case "ThisExpression":
      return ctxHandler.env.get("this");
    case "Identifier":
      return getType(getDeclarationNode(node, ast), ctxHandler, ast);
    case "VariableDeclarator":
      return ctxHandler.env.get(node);
    default:
      return IMMUTABLE;
  }
}

function computeMutability(ast, initial)
{

  var handlers = new MutableHashMap(); 
  var age = 0;
  
  function updateType(node, type, ctxHandler)
  {
    assert(type);
    var current = ctxHandler.env.get(node);
    if (current)
    {
      if (current.equals(type))
      {
        return;
      }
      if (current === IMMUTABLE)
      {
        return;
      }      
    }
    ctxHandler.env.put(node, type);
    //print(node, "-->", type);
    age++;      
  }
  
  function handleNode(node, fun, ctxHandler)
  {
    switch (node.type)
    {
      case "VariableDeclaration":
        node.declarations.forEach(function (declarator) {handleNode(declarator, fun, ctxHandler)});
        break;
      case "VariableDeclarator":
        var id = node.id;
        var init = node.init;
        updateType(node, init ? getType(init, ctxHandler, ast) : IMMUTABLE, ctxHandler);
        break;
      case "BlockStatement":
        if (node.body.length === 1)
        {
          handleNode(node.body[0], fun, ctxHandler);
        }
        break;
      case "ExpressionStatement":
        handleNode(node.expression, fun, ctxHandler);
        break;
      case "AssignmentExpression":
        var left = node.left;
        var right = node.right;
//        if (left.type === "Identifier")
        {
          updateType(getDeclarationNode(left, ast), getType(right, ctxHandler, ast), ctxHandler);          
        }
        break;
      case "ReturnStatement":
        break;
      default: ;//print("did not handle", node.type, node);
    }
  }
  
  function handleState(s)
  {
    var ctx = s.kont;
    if (!ctx.callable)
    {
      return;
    }
    var fun = ctx.callable.node;
    var ctxHandler = handlers.get(ctx);
    if (!ctxHandler)
    {
      ctxHandler = {env:new MutableHashMap()};
      handlers.put(ctx, ctxHandler);
      var params = fun.params;
      params.forEach(function (param) {updateType(param, IMMUTABLE, ctxHandler)});
      updateType("this", isConstructorCall(ctx) ? MUTABLE : IMMUTABLE, ctxHandler);
      //markPure(fun);
      //age++;
    }
    
    if (s.node)
    {
      handleNode(s.node, fun, ctxHandler);
    }
  }
  
  var todo = [initial];
  while (todo.length > 0)
  {
    var s = todo.pop();
    if (s._mutability === age) 
    {
      continue;
    }
    s._mutability = age;
    
    handleState(s);
    
    var outgoing = s._successors;
    outgoing.forEach(
      function (t) 
      {
        todo.push(t.state);
      });
  }
  return handlers;
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
  
  var mutability = computeMutability(ast, initial);
  print("mutability computed");
  
  function isMutable(node, ctx, ast)
  {
    if (ctx === EMPTY_KONT)
    {
      return true;
    }
    var ctxHandler = mutability.get(ctx);
    assert(ctxHandler);
    var type = getType(node, ctxHandler, ast);
    return type === MUTABLE;
  }
  
  function isLocalWriteEffect(effect, ctx)
  {
    if (effect.node)
    {
      if (effect.node.type === "AssignmentExpression" && effect.node.left.type === "MemberExpression")
      {
        //print("mutable?", s.lkont[0].node.left.object, "in", s.lkont[0].node);
        if (isMutable(effect.node.left.object, ctx, ast))
        {
          //print("MUTABLE", s.lkont[0].node);
          return true;
        }
      }
    }
    return false;
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
              var funRdeps = getRdeps(address, name);
              funRdeps.forEach(
                function (funRdep)
                {
//                  print(t._id, "r->o", funRdep.loc.start.line, effectAddress, effectName);
                  addOdep(address, name, funRdep);
                });
              
              if (isLocalWriteEffect(effect, s.kont))
              {
                return;
              }
                
                
              ctxs.forEach(
                function (ctx)
                {
                  var fun = ctx.callable.node;
                  assert(fun);
                    if (localVarEffect(name, fun))
                    {
                      return;
                    }
                    

                    var storeAddresses = ctx.store.keys();
                    if (Arrays.contains(address, storeAddresses)) // non-local
                    {
                          print(effect, ctx, "non-local write addr effect");
                          print(s, "procedure", fun.loc.start.line, address, name);
                      markProcedure(fun);
                    }
                    else // local
                    {
//                          print(effect, ctx, "local r/w addr effect");
                    }
                  }) // end for each ctx
            } // end write effect
            else // read
            {
              var funOdeps = getOdeps(address, name);
              ctxs.forEach(
                function (ctx)
                {
                  var fun = ctx.callable.node;
                  assert(fun);
                  if (localVarEffect(name, fun))
                  {
                    return;
                  }

                  var storeAddresses = ctx.store.keys();
                  if (Arrays.contains(address, storeAddresses)) // non-local
                  {
//                          print(effect, ctx, "non-local read addr effect");
//                          print(t._id, "->r", fun.loc.start.line, effectAddress, effectName);
                      addRdep(address, name, fun);
                      if (funOdeps.contains(fun))
                      {
                        // print(t._id, "observer", fun.loc.start.line, effectAddress, effectName);
                        markObserver(fun);
                      }
                  }
                  else // local
                  {
//                        print(effect, ctx, "local r/w addr effect");
                  }
                }) // end for each ctx
            }
          }) // end for each effect
        todo.push(t.state);
      }) // end for each outgoing
  }
  return pmap;
}
