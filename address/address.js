function Addr()
{
}

Addr.isAddress =
  function(value)
  {
    return value instanceof Addr;
  }


//// 

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

function ContextAddr(base, context)
{
  assertDefinedNotNull(base);
//  assertDefinedNotNull(context);
  this.base = base; 
  this.context = context;
}
ContextAddr.prototype = Object.create(Addr.prototype);

ContextAddr.prototype.accept =
  function (visitor)
  {
    return visitor.visitContextAddr(this);
  }

ContextAddr.base =
  function (addr)
  {
    return addr.base;
  }

ContextAddr.context =
  function (addr)
  {
    return addr.context;
  }

ContextAddr.prototype.toString =
  function ()
  {
    return this.base + "@" + this.context;
  }

ContextAddr.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (!(x instanceof ContextAddr))
    {
      return false;
    }
    return Eq.equals(this.base, x.base) && Eq.equals(this.context, x.context);
  }

ContextAddr.prototype.subsumes =
  function (x)
  {
    return this.equals(x);
  }

ContextAddr.prototype.hashCode =
  function ()
  {
    var prime = 71;
    var result = 1;
    result = prime * result + this.base.hashCode();
    result = prime * result + HashCode.hashCode(this.context);
    return result;
  }
