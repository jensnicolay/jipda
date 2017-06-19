var suiteCopTests =

(function ()
{
  var module = new TestSuite("suiteCopTests");
  
  const concLattice = new ConcLattice();
  const initialConcCeskState = computeInitialCeskState(concLattice);
  
  const typeLattice = new TypeLattice();
  const initialTypeCeskState = computeInitialCeskState(typeLattice);
  
  
  function printGraph(states)
  {
    for (const state of states)
    {
        print(state._id, "[" + (state._successors ? [...state._successors].map(t => t.state._id) : "") + "]", state);
    }
  }
  
  
  function runConc(src, expected)
  {
    const ast = Ast.createAst(src);
    const cesk = jsCesk({a:concAlloc, kalloc:concKalloc, l: concLattice, errors:true, hardAsserts:true});
    const system = cesk.explore(ast, initialConcCeskState);
    const result = computeResultValue(system.result);
    result.msgs.join("\n");
    //printGraph(system.states);
    const actual = result.value;
    assertEquals(concLattice.abst1(expected), actual);
  }
  
  function runAbst(src, expected)
  {
    const ast = Ast.createAst(src);
    const cesk = jsCesk({a:tagAlloc,  kalloc:aacLightKalloc, l:typeLattice, errors:true, gc:true});
    const system = cesk.explore(ast, initialTypeCeskState);
    const result = computeResultValue(system.result);
    const actual = result.value;
    assert(actual.subsumes(expected));
  }
  
  
  
  module.XXXtestMsVideoEncoderConc =
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
