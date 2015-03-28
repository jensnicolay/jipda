function createConcAg()
{
  var concreteAg = {};
  concreteAg.toString = function () {return "concAg"};
  var __conca__ = 1024;
  
  function storeToAddr(store)
  {
    return String();
  }

  // the prefixes are necessary for when a CESK step generates more than one address
  // without allocating it in the store
  // (other solution: cache next steps so that generated addresses are stable)
  
  concreteAg.object =
    function (node, benva, store, kont)
    {
    return __conca__++;
    }

  concreteAg.closure =
    function (node, benva, store, kont)
    {
    return __conca__++;
    }

  concreteAg.closureProtoObject =
    function (node, benva, store, kont)
    {
    return __conca__++;
    }

  concreteAg.array =
    function (node, benva, store, kont)
    {
    return __conca__++;
    }

  concreteAg.string =
    function (node, benva, store, kont)
    {
    return __conca__++;
    }

  concreteAg.benv =
    function (node, benva, store, kont)
    {
    return __conca__++;
    }

  concreteAg.constructor =
    function (node, benva, store, kont)
    {
    return __conca__++;
    }
  
  concreteAg.vr =
    function (name, ctx)
    {
      return __conca__++;
    }
  
  return concreteAg;
}
