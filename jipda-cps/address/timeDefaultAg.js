var timeDefaultAg = {};

timeDefaultAg.object =
  function (node, time)
  {
    return new ContextAddr("obj-"+node.tag, time);
  }

//timeDefaultAg.objectProperty =
//  function (objectAddress, propertyName)
//  {
//    return new ContextAddr(objectAddress, propertyName);
//  }
//
timeDefaultAg.closure =
  function (node, time)
  {
    return new ContextAddr("fun-"+node.tag, time);
  }

timeDefaultAg.closureProtoObject =
  function (node, time)
  {
    return new ContextAddr("proto-"+node.tag, time); /*node.body*/
  }

timeDefaultAg.array =
  function (node, time)
  {
    return new ContextAddr("array-"+node.tag, time);
  }

timeDefaultAg.string =
  function (node, time)
  {
    return new ContextAddr("string-"+node.tag, time);
  }

//timeDefaultAg.variable =
//  function (vr, time)
//  {
//    return new ContextAddr(vr, time);
//  }
//
timeDefaultAg.benv = // TODO change this to environment
  function (node, time)
  {
    return new ContextAddr("env-"+node.tag, time);
  }

timeDefaultAg.constructor =
  function (node, time)
  {
    return new ContextAddr("ctr-"+node.tag, time);
  }
