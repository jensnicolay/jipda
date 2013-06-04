  var concreteAg = { counter: 0};

  concreteAg.object =
    function (node, time)
    {
      return new ContextAddr(this.counter++, time);
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
      return new ContextAddr(this.counter++, time);
    }

  concreteAg.closureProtoObject =
    function (node, time)
    {
      return new ContextAddr(this.counter++, time);
    }

  concreteAg.array =
    function (node, time)
    {
      return new ContextAddr(this.counter++, time);
    }

  concreteAg.string =
    function (node, time)
    {
      return new ContextAddr(this.counter++, time);
    }

//  concreteAg.variable =
//    function (vr, time)
//    {
//      return new ContextAddr(this.counter++, time);
//    }
//
  concreteAg.benv =
    function (node, time)
    {
      return new ContextAddr(this.counter++, time);
    }

  concreteAg.constructor =
    function (node, time)
    {
      return new ContextAddr(this.counter++, time);
    }
