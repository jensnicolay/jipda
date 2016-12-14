
function createCkAg()
{
var ckAg = {};
let counter = 0;

  function concAlloc()
  {
    return "conc-" + counter++;
  }
  
  ckAg.toString = function () {return "ckAg"};
  
  ckAg.object =
    function (node, time)
    {
      return concAlloc();
    }
  
  ckAg.closure =
    function (node, benva, store, kont, c)
    {
      return concAlloc();
    }
  
  ckAg.closureProtoObject =
    function (node, benva, store, kont, c)
    {
      return concAlloc();
    }
  
  ckAg.array =
      function (node, time)
      {
        return concAlloc();
      }
  
  ckAg.error =
      function (node, time)
      {
        return concAlloc();
      }
  
  ckAg.string =
    function (node, time)
    {
      return concAlloc();
    }
  
  ckAg.constructor =
    function (node, application)
    {
      return concAlloc();
    }
  
  ckAg.vr =
    function (node, kont)
    {
      if (kont.topmostApplicationReachable())
      {
        return "var-" + node.tag;
      }
      return concAlloc();
    }
  
  return ckAg;
}
