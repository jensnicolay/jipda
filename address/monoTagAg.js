function createMonoTagAg()
{
  var tagAg = {};
  tagAg.toString = function () {return "monoTagAg"};
  
  function MonoAddr(base)
  {
    assertDefinedNotNull(base);
    this.base = base; 
  }
  MonoAddr.prototype = Object.create(Addr.prototype);

  MonoAddr.prototype.accept =
    function (visitor)
    {
      return visitor.visitMonoAddr(this);
    }

  MonoAddr.base =
    function (addr)
    {
      return addr.base;
    }

  MonoAddr.prototype.toString =
    function ()
    {
      return this.base + "@";
    }

  MonoAddr.prototype.equals =
    function (x)
    {
      if (this === x)
      {
        return true;
      }
      if (!(x instanceof MonoAddr))
      {
        return false;
      }
      return Eq.equals(this.base, x.base);
    }

  MonoAddr.prototype.subsumes =
    function (x)
    {
      return this.equals(x);
    }

  MonoAddr.prototype.hashCode =
    function ()
    {
      var prime = 71;
      var result = 1;
      result = prime * result + this.base.hashCode();
      return result;
    }


  tagAg.object =
    function (node)
    {
      return new MonoAddr(node.tag);
    }

  tagAg.closure =
    function (node)
    {
      return new MonoAddr(node.tag);
    }

  tagAg.closureProtoObject =
    function (node)
    {
      // +"-proto" to avoid clash with 'closure'
      return new MonoAddr("proto-"+node.tag);
    }

  tagAg.array =
    function (node)
    {
      return new MonoAddr(node.tag);
    }

  tagAg.string =
    function (node)
    {
      return new MonoAddr(node.tag);
    }

  tagAg.benv =
    function (node)
    {
      // + "-env" to avoid clash with 'constructor':
      // 'new' allocates benv (this function) and new object ('constructor' function)
      // where 'node' is the application at the moment
      return new MonoAddr("env-"+node.tag);
    }

  tagAg.constructor =
    function (node)
    {
      return new MonoAddr(node.tag);
    }

  return tagAg;
}
