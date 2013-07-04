  var concreteAg = { counter: 0};

  concreteAg.object =
    function (node, time)
    {
      return new ContextAddr(this.counter++, null);
    }

//  concreteAg.objectProperty =
//    function (objectAddress, propertyName)
//    {
//      return new ContextAddr(objectAddress, propertyName);
//    }
//
  concreteAg.closure =
    function (node, time)
    {
      return new ContextAddr(this.counter++, null);
    }

  concreteAg.closureProtoObject =
    function (node, time)
    {
      return new ContextAddr(this.counter++, null);
    }

  concreteAg.array =
    function (node, time)
    {
      return new ContextAddr(this.counter++, null);
    }

  concreteAg.string =
    function (node, time)
    {
      return new ContextAddr(this.counter++, null);
    }

//  concreteAg.variable =
//    function (vr, time)
//    {
//      return new ContextAddr(this.counter++, null);
//    }
//
  concreteAg.benv =
    function (node, time)
    {
      return new ContextAddr(this.counter++, null);
    }

  concreteAg.constructor =
    function (node, time)
    {
      return new ContextAddr(this.counter++, null);
    }
