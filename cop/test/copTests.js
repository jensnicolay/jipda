var suiteCopTests =

(function ()
{

///////////////  FLOW ANALYSIS
  
  const concLattice = new ConcLattice();
  const initialConcCeskState = computeInitialCeskState(concLattice, concAlloc, concKalloc, ast0src, ast1src);
  
  const typeLattice = new ConcTypeLattice();
  const initialTypeCeskState = computeInitialCeskState(typeLattice, concAlloc, concKalloc, ast0src, ast1src);
  
  
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
  
  
  
  
  var module = new TestSuite("suiteCopTests");
  
  function runConc(src, expected)
  {
    const system = concFlow(src);
    const result = computeResultValue(system.result);
    //printGraph(system.states);
    const actual = result.value;
    assertEquals(concLattice.abst1(expected), actual);
  }
  
  function runAbst(src, expected)
  {
    const system = abstFlow(src);
    const result = computeResultValue(system.result);
    const actual = result.value;
    assert(actual.subsumes(typeLattice.abst1(expected)));
  }
  
  
  
  module.testMsVideoEncoderConc =
      function ()
      {
        var src = read("test/resources/ms-video-encoder.js");
        runConc(src, "yes");
      }
  
  module.testMsVideoEncoderAbst =
      function ()
      {
        var src = read("test/resources/ms-video-encoder.js");
        runAbst(src, "yes");
      }
  
  
  return module;

})()
