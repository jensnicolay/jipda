  var tagAg = {};

  tagAg.object =
    function (node, time)
    {
      return new ContextAddr(node.tag, time);
    }

//  tagAg.objectProperty =
//    function (objectAddress, propertyName)
//    {
//      return new ContextAddr(objectAddress, propertyName);
//    }
//
  tagAg.closure =
    function (node, time)
    {
      return new ContextAddr(node.tag, time);
    }

  tagAg.closureProtoObject =
    function (node, time)
    {
      // +"-proto" to avoid clash with 'closure'
      return new ContextAddr("proto-"+node.tag, time);
    }

  tagAg.array =
    function (node, time)
    {
      return new ContextAddr(node.tag, time);
    }

  tagAg.string =
    function (node, time)
    {
      return new ContextAddr(node.tag, time);
    }

//  tagAg.variable =
//    function (vr, time)
//    {
//      return new ContextAddr(vr.tag, time);
//    }
//
  tagAg.benv =
    function (node, time)
    {
      // + "-env" to avoid clash with 'constructor':
      // 'new' allocates benv (this function) and new object ('constructor' function)
      // where 'node' is the application at the moment
      return new ContextAddr("env-"+node.tag, time);
    }

  tagAg.constructor =
    function (node, time)
    {
      return new ContextAddr(node.tag, time);
    }
