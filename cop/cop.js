"use strict";


// function installBackEdges(states)
// {
//   states.forEach(
//       function (state)
//       {
//         if (state._successors)
//         {
//           for (const succ of state._successors)
//           {
//             if (!s)
//           }
//         }
//       })
// }

const Q = {};

//Q.findCreation(addr, )

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
    if (state.isEvalState && state.node.toString().startsWith("target[prop]="))
    {
          // print(state._id, state.node.loc.start.line, state.node.toString(),
          //   state.benv.lookup("prop"),
          //   state.benv.lookup("context"),
          //   state.benv.lookup("sourceMethod"),
          //   state.benv.lookup("targetMethod"))
      return true;
    }
    
    return false;
  }
  
  function getContextName(contextObj)
  {
    const contextName = contextObj.lookup(lattice.abst1("name")).value.Value;
    return contextName;
  }
  
  function visitState(state)
  {
    if (isExtendState(state))
    {
      const contextRef = state.store.lookupAval(state.benv.lookup("context"));
      const sourceMethodRef = state.store.lookupAval(state.benv.lookup("sourceMethod"));
      const targetMethodRef = state.store.lookupAval(state.benv.lookup("targetMethod"));
      const prop = state.store.lookupAval(state.benv.lookup("prop"));

      contextRef.addresses().forEach(
          function (contextA)
          {
            const contextObj = state.store.lookupAval(contextA);
            
            sourceMethodRef.addresses().forEach(
                function (sourceMethodA)
                {
                  const sourceMethodObj = state.store.lookupAval(sourceMethodA);
                  const scallables = sourceMethodObj.getInternal("[[Call]]").value;
                  
                  for (const sourceMethodCallable of scallables)
                  {
                    targetMethodRef.addresses().forEach(
                        function (targetMethodA)
                        {
                          const targetMethodObj = state.store.lookupAval(targetMethodA);
                          const tcallables = targetMethodObj.getInternal("[[Call]]").value;
        
                          for (const targetMethodCallable of tcallables)
                          {
                            result.push({context:contextObj, prop, sourceMethod:sourceMethodCallable, targetMethod:targetMethodCallable});
  
                            print("context", getContextName(contextObj));
                            print("prop", prop);
                            print("source", sourceMethodCallable.node.id.name);
                            print("target", targetMethodCallable.node.id.name);
                            print("--------------------\n");
                          }
                        })
                  }
                });
          });
    }
  }
  
  const states = system.states;
  const result = [];
  states.forEach(visitState);
  return result;
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