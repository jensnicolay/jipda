function interproceduralDependencies(etg, ss)
{
  
  function toCalledFunctions(frame)
  {
    if (frame.appliesFunctions)
    {
      return frame.appliesFunctions();
    }
    return [];
  }
  
  var funReads = HashMap.empty();
  var funWrites = HashMap.empty();
  etg.edges().forEach(
    function (edge)
    {
      var trace = edge.trace;
      if (trace)
      {
        var functionsOnStack = ss.get(edge.source).values().flatMap(toCalledFunctions);
        trace.forEach(
          function (el)
          {
            el.dispatch({
              read:function (x)
              {
                functionsOnStack.forEach(
                  function (f)
                  {
                    funReads = funReads.put(f, (funReads.get(f) || ArraySet.empty()).add(x.address));
                  })
              },
              write:function (x)
              {
                functionsOnStack.forEach(
                  function (f)
                  {
                    funWrites = funWrites.put(f, (funWrites.get(f) || ArraySet.empty()).add(x.address));
                  })          
              }
            }) // for each trace element
          }) // for each trace
      }
    }) // for each edge
  print("funReads", funReads);
  print("funWrites", funWrites);
}