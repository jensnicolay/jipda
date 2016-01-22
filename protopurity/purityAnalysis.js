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

const UNFRESH = false;
const FRESH = true;

function computeFreshness(system)
{
  var initial = system.initial;
  var ast = initial.node;
  var age = 0;
  //var states2vars2fresh = new Array(system.states.count());
  var vars2fresh = new Array();

  function stackPop(kont)
  {
    var result = ArraySet.empty();
    var seen = ArraySet.empty();
    var todo = [kont];
    while (todo.length > 0)
    {
      var kont = todo.pop();
      if (seen.contains(kont))
      {
        continue;
      }
      seen = seen.add(kont);
      if (kont._stacks)
      {
        kont._stacks.forEach(
            function (stack)
            {
              var lkont2 = stack[0];
              var kont2 = stack[1];
              if (lkont2.length > 0)
              {
                result = result.add([lkont2,kont2]);
              }
              else
              {
                todo.push([kont2]);
              }
            })
      }
    }
    return result;
  }

  function handleFrame(fresh, s, frame, kont)
  {
    switch (frame.constructor.name)
    {
      case "VariableDeclaratorKont":
        // always local target
        //var vars2fresh = states2vars2fresh[s._id];
        //if (!vars2fresh)
        //{
        //  vars2fresh = [];
        //  states2vars2fresh[s._id] = vars2fresh;
        //}
        var existingFreshnessForVar = vars2fresh[frame.node.id.tag];
        if (existingFreshnessForVar === undefined)
        {
          vars2fresh[frame.node.id.tag] = fresh;
        }
        else if (existingFreshnessForVar === FRESH)
        {
          if (fresh === UNFRESH)
          {
            vars2fresh[frame.node.id.tag] = UNFRESH;
            age++;
          }
          else
          {
            // nothing
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
    var frames;
    var lkont = s.lkont;
    if (lkont.length === 0)
    {
      frames = stackPop(s.kont);
    }
    else
    {
      frames = ArraySet.from([[lkont, s.kont]]);
    }
    frames.forEach(
        function (frameKont)
        {
          handleFrame(false, s, frameKont[0][0], frameKont[1]);
        });
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

function isFresh(node, ast, kont, vars2fresh)
{
  switch (node.type)
  {
    case "Identifier":
    {
      var dn = getDeclarationNode(node, ast);
      var fun = kont.callable.node;
      if (fun && declarationNodeLocalToFun(dn, fun))
      {
        return vars2fresh[dn.tag] === FRESH;
      }
      return false;
    }
    case "AssignmentExpression":
      return isFresh(node.right, ast, kont, vars2fresh);
    case "ObjectExpression":
      return true;
    case "NewExpression":
      return true;
    case "ThisExpression":
      return isConstructorCall(kont);
//    case "VariableDeclarator": return node.init && isFresh(node.init, ast, kont, freshVars);
    default: return false;
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
        return isFresh(effectNode.left.object, ast, s.kont, vars2fresh);
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
  
  //function markObserver(fun)
  //{
  //  var current = pmap.get(fun);
  //  if (current === "OBS" || current === "PROC")
  //  {
  //    return ;
  //  }
  //  pmap = pmap.put(fun, "OBS");
  //  age++;
  //}
  
  function markPure(fun)
  {
    var current = pmap.get(fun);
    if (!current)
    {
      pmap = pmap.put(fun, "PURE");
      //age++;
    } 
  }
  
  //function addRdep(addr, name, fun)
  //{
  //  var currentRdep = rdep.get([addr, name]) || ArraySet.empty();
  //  if (currentRdep.contains(fun))
  //  {
  //    return;
  //  }
  //  rdep = rdep.put([addr, name], currentRdep.add(fun));
  //  age++;
  //}
  //
  //function getRdeps(addr, name)
  //{
  //  var result = ArraySet.empty();
  //  rdep.iterateEntries(
  //    function (entry)
  //    {
  //      var key = entry[0];
  //      if (subsumes(key, addr, name))
  //      {
  //        result = result.join(entry[1]);
  //      }
  //    });
  //  return result;
  //}
  //
  //function addOdep(addr, name, fun)
  //{
  //  var currentOdep = odep.get([addr, name]) || ArraySet.empty();
  //  if (currentOdep.contains(fun))
  //  {
  //    return;
  //  }
  //  odep = odep.put([addr, name], currentOdep.add(fun));
  //  age++;
  //}
  //
  //function getOdeps(addr, name)
  //{
  //  var result = ArraySet.empty();
  //  odep.iterateEntries(
  //    function (entry)
  //    {
  //      var key = entry[0];
  //      if (subsumes(key, addr, name))
  //      {
  //        result = result.join(entry[1]);
  //      }
  //    });
  //  return result;
  //}
  
  function localVarEffect(effectName, fun)
  {
    return effectName.tag > -1 && declarationNodeLocalToFun(effectName, fun) // var && local
//      print(effect, ctx, "local r/w var effect");
  }
  
  var vars2fresh = computeFreshness(system);
  
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
            var writeEffect = effect.isWriteEffect();

            if (writeEffect)
            {
              if (varEffect)
              {

                if (freshnessFlag && declarationNodeLocalToFun(name, s.kont.callable.node))
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
                if (freshnessFlag && fresh(s))
                {
                  //print("OFRESH", s._id, "fresh in", s.kont);
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
                    //print("PPROC:", effect, "in", fun);
                    markProcedure(fun);
                  }) // end for each ctx
              }
            }
            else // read
            {
            }
        });
        todo.push(t.state);
      })
  }
  return pmap;
}