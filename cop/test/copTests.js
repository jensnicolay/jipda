var suiteCopTests =

(function ()
{
  var module = new TestSuite("suiteCopTests");
  
  const concLattice = new ConcLattice();
  const initialCeskState = computeInitialCeskState(concLattice);
  
  function printGraph(states)
  {
    for (const state of states)
    {
        print(state._id, "[" + (state._successors ? [...state._successors].map(t => t.state._id) : "") + "]", state);
    }
  }
  
  
  function run(src, expected)
  {
    var ast = Ast.createAst(src);
    var cesk = jsCesk({a:concAlloc, kalloc:concKalloc, l: concLattice, errors:true});
    var system = cesk.explore(ast, initialCeskState);
    var result = computeResultValue(system.result);
    result.msgs.join("\n");
    //printGraph(system.states);
    var actual = result.value;
    assertEquals(concLattice.abst1(expected), actual);
  }
  
  
  module.testMsVideoEncoder =
      function ()
      {
        var src = read("test/resources/ms-video-encoder.js");
        run(src, undefined);
      }
  
  
  return module;

})()
