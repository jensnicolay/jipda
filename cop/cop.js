///////////////  FLOW ANALYSIS

const concLattice = new ConcLattice();
const initialConcCeskState = computeInitialCeskState(concLattice);

const typeLattice = new ConcTypeLattice();
const initialTypeCeskState = computeInitialCeskState(typeLattice);


function printGraph(states)
{
  for (const state of states)
  {
    print(state._id, "[" + (state._successors ? [...state._successors].map(t => t.state._id) : "") + "]", state);
  }
}


function concFlow(src)
{
  const ast = Ast.createAst(src);
  const cesk = jsCesk({a:concAlloc, kalloc:aacConcKalloc, l: concLattice, errors:true, hardAsserts:true});
  const system = cesk.explore(ast, initialConcCeskState);
  return system;
}

function abstFlow(src)
{
  const ast = Ast.createAst(src);
  const cesk = jsCesk({a:tagCtxAlloc, kalloc:aacKalloc, l:typeLattice, errors:true, gc:true});
  const system = cesk.explore(ast, initialTypeCeskState);
  return system;
}


///////////////  COP ANALYSIS
function computeContextMethods(system)
{
  
  const lattice = system.lattice;
  // const initial = system.initial;
  // const ast = initial.node;
  //
  // print(JSON.stringify(ast));
  
  function isExtendState(state)
  {
    return state.isKontState
            && state.kont.ex.toString().startsWith("extend(")
            && state.lkont[0]
            && state.lkont[0].objectRef
            && state.lkont[0].nameValue
            && state.lkont[0].node.type === "AssignmentExpression"
  }
  
  function getCopContext(kont)
  {
    if (kont.userContext.callable
        && kont.userContext.callable.node
        && kont.userContext.callable.node.id
        && kont.userContext.callable.node.id.name === "__ACTIVATE__"
       )
    {
      return kont.thisValue;
    }
    return BOT;
  }
  
  function lookupCopContext(kont)
  {
    const reachable = new Set();
    let result = BOT;
    const todo = [kont];
    while (todo.length > 0)
    {
      const ctx = todo.pop();
      ctx._stacks.forEach((stack) =>
      {
        const kont = stack.kont;
        if (!reachable.has(kont))
        {
          const context = getCopContext(kont);
          result = result.join(context);
          reachable.add(kont);
          todo.push(kont)
        }
      });
    }
    return result;
  }
  
  function visitState(state)
  {
    if (isExtendState(state))
    {
      const context = lookupCopContext(state.kont);
      const prop = state.store.lookupAval(state.lkont[0].benv.lookup("prop"));
      const source = state.store.lookupAval(state.lkont[0].benv.lookup("source"));
      const target = state.store.lookupAval(state.lkont[0].benv.lookup("target"));
      const sourceMethod = state.store.lookupAval(state.lkont[0].benv.lookup("sourceMethod"));

      context.addresses().forEach(
          function (contextA)
          {
            const contextObj = state.store.lookupAval(contextA);
            const contextName = contextObj.lookup(lattice.abst1("name")).value.Value;
            
            sourceMethod.addresses().forEach(
                function (sourceMethodA)
                {
                  const sourceMethodObj = state.store.lookupAval(sourceMethodA);
                  const callables = sourceMethodObj.getInternal("[[Call]]").value;
                  
                  for (const callable of callables)
                  {
                    const sourceMethodName = callable.node.loc.start.line;
                    
                    print("context", contextName);
                    print("prop", prop);
                    print("source", source);
                    print("target", target);
                    print("sourceMethod", sourceMethodName);
                    print("--------------------\n");
                  }
                });
          });
    }
  }
  
  const states = system.states;
  states.forEach(visitState);
}

//////////////////  COP TOOLS


function concCop(file)
{
  const src = read(file);
  const system = concFlow(src);
  const cms = computeContextMethods(system);
}


function t1()
{
  concCop("test/resources/ms-video-encoder.js");
}