function computePurity(initial, sstore)
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
      var stacks = sstore.get(kont);
      stacks.values().forEach(
        function (stack)
        {
          var kont = stack[1];          
          todo.push(kont);
        });
    }
    return visited.values();
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
        if (key[0].equals(addr) && key[1].subsumes(name))
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
        if (key[0].equals(addr) && key[1].subsumes(name))
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
            var effectName = effect.name;
            if (effect.isWriteEffect())
            {
              ctxs.forEach(
                function (ctx)
                {
                  var storeAddresses = ctx.store.keys();
                  var fun = ctx.callable.node;
                  if (fun)
                  {
                    if (Arrays.contains(effectAddress, storeAddresses))
                    {
                      //print(t._id, "procedure", fun.loc.start.line, effectAddress, effectName);
                      markProcedure(fun);
                    }                  
                  }
                });
              var funRdeps = getRdeps(effectAddress, effectName);
              funRdeps.forEach(
                function (funRdep)
                {
                  addOdep(effectAddress, effectName, funRdep);
                })
            }
            else if (effect.isReadEffect())
            {
              ctxs.forEach(
                function (ctx)
                {
                  var storeAddresses = ctx.store.keys();
                  var fun = ctx.callable.node;
                  if (fun)
                  {
                    if (Arrays.contains(effectAddress, storeAddresses))
                    {
                      addRdep(effectAddress, effectName, fun);
                    }
                  }
                });
              var funOdeps = getOdeps(effectAddress, effectName);
              funOdeps.forEach(
                function (funOdep)
                {
                  //print(t._id, "observer", funOdep.loc.start.line, effectAddress, effectName);
                  markObserver(funOdep);
                })
            }
          })
        todo.push(t.state);
      })
  }
  return pmap;
}
