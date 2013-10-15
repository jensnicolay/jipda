  var tagAg = {};

  tagAg.object =
    function (node, time)
    {
      return new ContextAddr(node.tag, null);
    }

//  tagAg.objectProperty =
//    function (objectAddress, propertyName)
//    {
//      return new ContextAddr(objectAddress, propertyName);
//    }
//
  tagAg.closure =
    function (node, benva, store, kont, c)
    {
      return new ContextAddr(node.tag, null);
    }

  tagAg.closureProtoObject =
    function (node, benva, store, kont, c)
    {
      // +"-proto" to avoid clash with 'closure'
      return new ContextAddr("proto-"+node.tag, null);
    }

  tagAg.array =
    function (node, time)
    {
      return new ContextAddr(node.tag, null);
    }

  tagAg.string =
    function (node, time)
    {
      return new ContextAddr(node.tag, null);
    }

//  tagAg.variable =
//    function (node, benva, store, kont)
//    {
//      return new ContextAddr(node.tag, null);
//    }

  tagAg.benv =
    function (node, benva, store, kont)
    {
      // + "-env" to avoid clash with 'constructor':
      // 'new' allocates benv (this function) and new object ('constructor' function)
      // where 'node' is the application at the moment
      return new ContextAddr("env-"+node.tag, null);
    }

  tagAg.constructor =
    function (node, time)
    {
      return new ContextAddr(node.tag, null);
    }
