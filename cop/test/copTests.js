var suiteCopTests =

(function ()
{
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
