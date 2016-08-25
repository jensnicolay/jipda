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
  //if (!declarationNode)
  //{
  //  throw new Error("no declaration node for " + nameNode);
  //}
  return declarationNode;
}

function localVar(declarationNode, fun)
{
  var local = Arrays.contains(declarationNode, Ast.nodes(fun))
  return local;
}

function localVarNotParam(declarationNode, fun)
{
  var local = !Arrays.contains(declarationNode, fun.params) && Arrays.contains(declarationNode, Ast.nodes(fun))
  return local;
}

function isConstructorCall(ctx)
{
  return ctx.ex && Ast.isNewExpression(ctx.ex);
}

const UNFRESH = false;
const FRESH = true;

function computeFreshness(system)
{
  var initial = system.initial;
  var ast = initial.node;
  var age = 0;
  var vars2fresh = new Array();
  
  function updateFreshness(target, freshness)
  {
    //print("updating freshness", target, target.tag, freshness);
    var existingFreshnessForVar = vars2fresh[target.tag];
    if (existingFreshnessForVar === undefined)
    {
      vars2fresh[target.tag] = freshness;
    }
    else if (existingFreshnessForVar === FRESH)
    {
      if (freshness === UNFRESH)
      {
        vars2fresh[target.tag] = UNFRESH;
        age++;
      }
      else
      {
        // nothing
      }
    }
  }

  function handleNode(node, s)
  {
    switch (node.type)
    {
      case "VariableDeclaration":
        var fun = s.kont.callable.node;
        if (fun) // not top-level
        {
          node.declarations.forEach(function (declarator) {handleNode(declarator, s)});
        }
        break;
      case "VariableDeclarator":
        var target = getDeclarationNode(node.id, ast); // in case declaration is actually redeclaration
        var init = node.init;
        if (init)
        {
          updateFreshness(target, getFresh(init, ast, s.kont, vars2fresh));
        }
        break;
      case "BlockStatement":
        if (node.body.length === 1)
        {
          handleNode(node.body[0], s);
        }
        break;
      case "ExpressionStatement":
        handleNode(node.expression, s);
        break;
      case "AssignmentExpression":
        if (Ast.isIdentifier(node.left))
        {
          var target = getDeclarationNode(node.left, ast);
          // check locality
          var fun = s.kont.callable.node;
          if (fun && localVar(target, fun))
          {
            // local target
            var right = node.right;
            updateFreshness(target, getFresh(right,ast, s.kont,vars2fresh));
          }
          else
          {
            // free var, conservative
            updateFreshness(target, UNFRESH);
          }
        }
        break;
      default: break;
    }
  }

  function handleState(s)
  {
    var node = s.node;
    if (!node)
    {
      return;
    }
    handleNode(node, s);
  }

  function traverseGraph()
  {
    var todo = [initial];
    var visited = new Array(system.states.count());
    while (todo.length > 0)
    {
      var s = todo.pop();
      if (visited[s._id] === age)
      {
        continue;
      }
      visited[s._id] = age;
      handleState(s);
      var outgoing = s._successors;
      outgoing.forEach(
        function (t)
        {
          todo.push(t.state);
        });
    }
  }

  traverseGraph();
  return vars2fresh;
}

function getFresh(node, ast, kont, vars2fresh)
{
  switch (node.type)
  {
    case "Identifier":
    {
      var dn = getDeclarationNode(node, ast);
      if (dn)
      {
        var fun = kont.callable.node;
        if (fun && localVarNotParam(dn, fun))
        {
          return vars2fresh[dn.tag];
        }
      }
      return UNFRESH;
    }
    case "AssignmentExpression":
      return getFresh(node.right, ast, kont, vars2fresh);
    case "ObjectExpression":
      return FRESH;
    case "NewExpression":
      return FRESH;
    case "ThisExpression":
      return isConstructorCall(kont);
//    case "VariableDeclarator": return node.init && isFresh(node.init, ast, kont, freshVars);
    default: return UNFRESH;
  }
}

function computePurity(system, freshnessFlag)
{

  var initial = system.initial;
  var ast = initial.node;

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
  
//  function localVarEffect(effectName, fun)
//  {
//    return effectName.tag > -1 && localVar(effectName, fun) // var && local
////      print(effect, ctx, "local r/w var effect");
//  }

  if (freshnessFlag)
  {
    var vars2fresh = computeFreshness(system);
  }
  
  var todo = [initial];
  var visited = new Array(system.states.count());
  while (todo.length > 0)
  {
    var s = todo.pop();
    if (visited[s._id] === age)
    {
      continue;
    }
    visited[s._id] = age;

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
            if (String(name).startsWith("__NOEFF__"))
            {
              return;
            }
            var writeEffect = effect.isWriteEffect();

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


                if (freshnessFlag && localVar(name, s.kont.callable.node))
                {
                  //print("VFRESH", s._id, name, "local in", s.kont);
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
                    //print("VPROC: var write effect", effect, fun);
                    markProcedure(fun);
                    //}
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
  
                if (freshnessFlag && effect.node)
                {
                  var fresh = getFresh(effect.node, ast, s.kont, vars2fresh);
                  if (fresh)
                  {
                    return;
                  }
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
                    //print("PPROC:", effect, "in", fun);
                    markProcedure(fun);
                  }) // end for each ctx
              }
            }
            else // read
            {
              var funOdeps = getOdeps(address, name);
              if (varEffect) {
                if (freshnessFlag && localVar(name, s.kont.callable.node)) {
                  //print("VFRESH", s._id, name, "local in", s.kont);
                  return;
                }
                ctxs.forEach(
                    function (ctx) {
                      var storeAddresses = ctx.store.keys();
                      if (!Arrays.contains(address, storeAddresses)) // local
                      {
                        return;
                      }
                      var fun = ctx.callable.node;
                      addRdep(address, name, fun);
                      if (funOdeps.contains(fun)) {
                        // print(t._id, "observer", fun.loc.start.line, effectAddress, effectName);
                        markObserver(fun);
                      }
                    })
              }
              else // member effect
              {
                if (freshnessFlag && effect.node)
                {
                  let fresh = getFresh(effect.node, ast, s.kont, vars2fresh);
                  if (fresh)
                  {
                    return;
                  }
                }
                
                ctxs.forEach(
                    function (ctx) {
                      var storeAddresses = ctx.store.keys();
                      if (!Arrays.contains(address, storeAddresses)) // local
                      {
                        return;
                      }
                      var fun = ctx.callable.node;
                      addRdep(address, name, fun);
                      if (funOdeps.contains(fun)) {
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