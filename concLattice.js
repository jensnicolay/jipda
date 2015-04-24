"use strict";

function ConcValue(value)
{
  this.value = value;
}

ConcValue.prototype.equals =
  function (x)
  {
    return (x instanceof ConcValue)
      && Object.is(this.value, x.value)
  }

ConcValue.prototype.hashCode =
  function ()
  {
    return HashCode.hashCode(this.value);
  }

ConcValue.prototype.addresses =
  function ()
  {
    return ArraySet.empty();
  }

ConcValue.prototype.toString =
  function ()
  {
    return String(this.value);
  }

ConcValue.prototype.join =
  function (x)
  {
    throw new Error("cannot join concrete values " + this + " and " + x);
  }

ConcValue.prototype.subsumes =
  function (x)
  {
    return this.equals(x);
  }

ConcValue.prototype.projectString =
  function (x)
  {
    return (typeof this.value === "string") ? this : BOT;
  }

ConcValue.prototype.ToString =
  function (x)
  {
    return new ConcValue(String(this.value));
  }

ConcValue.prototype.charAt =
  function (x)
  {
    return new ConcValue(this.value.charAt(x.value));
  }

ConcValue.prototype.charCodeAt =
  function (x)
  {
    return new ConcValue(this.value.charCodeAt(x.value));
  }

ConcValue.prototype.startsWith =
  function (x)
  {
    return new ConcValue(this.value.startsWith(x.value));
  }

ConcValue.prototype.stringLength =
  function (x)
  {
    return new ConcValue(this.value.length);
  }

ConcValue.prototype.parseInt =
  function ()
  {
    return new ConcValue(parseInt(this.value, 10));
  }

ConcValue.prototype.ToNumber =
  function (x)
  {
    return new ConcValue(Number(this.value));
  }

ConcValue.prototype.ToUint32 =
  function (x)
  {
    return new ConcValue(this.value >>> 0);
  }

ConcValue.prototype.isTruthy =
  function ()
  {
    return !!this.value;
  }

ConcValue.prototype.isFalsy =
  function ()
  {
    return !this.value;
  }

ConcValue.prototype.isTrue =
  function ()
  {
    return this.value === true;
  }

ConcValue.prototype.isFalse =
  function ()
  {
    return this.value === false;
  }

ConcValue.prototype.isRef =
  function ()
  {
    return false;
  }

ConcValue.prototype.isNonRef =
  function ()
  {
    return true;
  }

ConcValue.prototype.projectRef =
  function ()
  {
    return BOT;
  }

function ConcAddr(addr)
{
  this.addr = addr;
}

ConcAddr.prototype.equals =
  function (x)
  {
    return (x instanceof ConcAddr)
      && this.addr === x.addr
  }

ConcAddr.prototype.hashCode =
  function ()
  {
    var prime = 11;
    var result = 1;
    result = prime * result + this.addr.hashCode();
    return result;
  }

ConcAddr.prototype.addresses =
  function ()
  {
    return ArraySet.from1(this.addr);
  }

ConcAddr.prototype.toString =
  function ()
  {
    return String(this.addr);
  }

ConcAddr.prototype.join =
  function (x)
  {
    throw new Error("cannot join concrete addresses " + this + " and " + x);
  }

ConcAddr.prototype.subsumes =
  function (x)
  {
    return this.equals(x)
  }

ConcAddr.prototype.isTruthy =
  function ()
  {
    return true;
  }

ConcAddr.prototype.isFalsy =
  function ()
  {
    return false;
  }

ConcAddr.prototype.isTrue =
  function ()
  {
    return false;
  }

ConcAddr.prototype.isFalse =
  function ()
  {
    return false;
  }

ConcAddr.prototype.isRef =
  function ()
  {
    return true;
  }

ConcAddr.prototype.isNonRef =
  function ()
  {
    return false;
  }

ConcAddr.prototype.projectRef =
  function ()
  {
    return this;
  }

function ConcLattice()
{
}

ConcLattice.prototype.toString =
  function ()
  {
    return "ConcLattice";
  }

ConcLattice.prototype.abst =
  function (cvalues)
  {
    assertTrue(cvalues.length === 1);
    return this.abst1(cvalues[0]);
  }

ConcLattice.prototype.abst1 =
  function (value)
  {
    return new ConcValue(value);
  }

ConcLattice.prototype.abstRef =
  function (addr)
  {
    return new ConcAddr(addr);
  }

ConcLattice.prototype.add =
  function (x, y)
  {
    return new ConcValue(x.value + y.value); 
  }

ConcLattice.prototype.lt =
  function (x, y)
  {
    return new ConcValue(x.value < y.value);
  }

ConcLattice.prototype.lte =
  function (x, y)
  {
    return new ConcValue(x.value <= y.value);
  }

ConcLattice.prototype.gt =
  function (x, y)
  {
    return new ConcValue(x.value > y.value);
  }

ConcLattice.prototype.gte =
  function (x, y)
  {
    return new ConcValue(x.value >= y.value);
  }

ConcLattice.prototype.sub =
  function (x, y)
  {
    return new ConcValue(x.value - y.value);
  }

ConcLattice.prototype.mul =
  function (x, y)
  {
    return new ConcValue(x.value * y.value);
  }

ConcLattice.prototype.div =
  function (x, y)
  {
    return new ConcValue(x.value / y.value);
  }

ConcLattice.prototype.eqq =
  function (x, y)
  {
    if (x instanceof ConcAddr)
    {
      if (y instanceof ConcAddr)
      {
        return new ConcValue(x.addr.equals(y.addr));        
      }
      return new ConcValue(false);
    }
    if (y instanceof ConcAddr)
    {
      return new ConcValue(false);
    }
    return new ConcValue(x.value == y.value);
  }

ConcLattice.prototype.eq =
  function (x, y)
  {
    if (x instanceof ConcAddr)
    {
      if (y instanceof ConcAddr)
      {
        return new ConcValue(x.addr.equals(y.addr));        
      }
      return new ConcValue(false);
    }
    if (y instanceof ConcAddr)
    {
      return new ConcValue(false);
    }
    return new ConcValue(x.value == y.value);
  }

ConcLattice.prototype.neq =
  function (x, y)
  {
    if (x instanceof ConcAddr)
    {
      if (y instanceof ConcAddr)
      {
        return new ConcValue(!(x.addr.equals(y.addr)));        
      }
      return new ConcValue(true);
    }
    if (y instanceof ConcAddr)
    {
      return new ConcValue(true);
    }
    return new ConcValue(x.value != y.value);
  }

ConcLattice.prototype.neqq =
  function (x, y)
  {
    if (x instanceof ConcAddr)
    {
      if (y instanceof ConcAddr)
      {
        return new ConcValue(x.addr !== y.addr);        
      }
      return new ConcValue(true);
    }
    if (y instanceof ConcAddr)
    {
      return new ConcValue(true);
    }
    return new ConcValue(x.value !== y.value);
  }

ConcLattice.prototype.binor =
  function (x, y)
  {
    return new ConcValue(x.value | y.value);
  }

ConcLattice.prototype.binxor =
  function (x, y)
  {
    return new ConcValue(x.value ^ y.value);
  }

ConcLattice.prototype.binand =
  function (x, y)
  {
    return new ConcValue(x.value & y.value);
  }

ConcLattice.prototype.shl =
  function (x, y)
  {
    return new ConcValue(x.value << y.value);
  }

ConcLattice.prototype.shr =
  function (x, y)
  {
    return new ConcValue(x.value >> y.value);
  }

ConcLattice.prototype.shrr =
  function (x, y)
  {
    return new ConcValue(x.value >>> y.value);
  }

ConcLattice.prototype.rem =
  function (x, y)
  {
    return new ConcValue(x.value % y.value);
  }

ConcLattice.prototype.binnot =
  function (x)
  {
    return new ConcValue(~x.value);
  }

ConcLattice.prototype.neg =
  function (x)
  {
    return new ConcValue(-x.value);
  }

ConcLattice.prototype.sqrt =
  function (x)
  {
    return new ConcValue(Math.sqrt(x.value));
  }

ConcLattice.prototype.abs =
  function (x)
  {
    return new ConcValue(Math.abs(x.value));
  }

ConcLattice.prototype.round =
  function (x)
  {
    return new ConcValue(Math.round(x.value));
  }

ConcLattice.prototype.sin =
  function (x)
  {
    return new ConcValue(Math.sin(x.value));
  }

ConcLattice.prototype.cos =
  function (x)
  {
    return new ConcValue(Math.cos(x.value));
  }

ConcLattice.prototype.not =
  function (x)
  {
    return new ConcValue(!x.value);
  }

