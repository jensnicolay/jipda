"use strict";

JipdaValue.UND = 1 << 0;
JipdaValue.NULL = 1 << 1;
JipdaValue.STR = 1 << 2;
JipdaValue.NUM = 1 << 3;
JipdaValue.NUMSTR = 1 << 4;
JipdaValue.BOOL = 1 << 5;
JipdaValue.EMPTY_SET = ArraySet.empty();

JipdaValue.TRUTHY = JipdaValue.STR | JipdaValue.NUM | JipdaValue.NUMSTR | JipdaValue.BOOL;
JipdaValue.FALSY = JipdaValue.UND | JipdaValue.NULL | JipdaValue.STR | JipdaValue.NUM | JipdaValue.BOOL;

JipdaValue.STRINGMASK = JipdaValue.STR | JipdaValue.NUMSTR;
JipdaValue.STRINGERS = JipdaValue.UND | JipdaValue.NULL | JipdaValue.BOOL | JipdaValue.NUM;

JipdaValue._NUM = new JipdaValue(JipdaValue.NUM, JipdaValue.EMPTY_SET);
JipdaValue._STR = new JipdaValue(JipdaValue.STR, JipdaValue.EMPTY_SET);
JipdaValue._BOOL = new JipdaValue(JipdaValue.BOOL, JipdaValue.EMPTY_SET);
JipdaValue._NUMSTR = new JipdaValue(JipdaValue.NUMSTR, JipdaValue.EMPTY_SET);
JipdaValue._UND = new JipdaValue(JipdaValue.UND, JipdaValue.EMPTY_SET);
JipdaValue._NULL = new JipdaValue(JipdaValue.NULL, JipdaValue.EMPTY_SET);

function Some(prim)
{
  this.prim = prim;
}

Some.prototype.equals =
    function (x)
    {
      if (x === this)
      {
        return true;
      }
      if (x instanceof Some)
      {
        return Object.is(this.prim, x.prim);
      }
    }

Some.prototype.hashCode =
    function ()
    {
      return HashCode.hashCode(this.prim);
    }

Some.prototype.abst =
    function ()
    {
      var prim = this.prim;
      if (typeof prim === "string")
      {
        if (+prim === +prim && prim !== "")
        {
          return JipdaValue._NUMSTR;
        }
        return JipdaValue._STR;
      }
      if (typeof prim === "number")
      {
        return JipdaValue._NUM;
      }
      if (prim === true || prim === false)
      {
        return JipdaValue._BOOL;
      }
      if (prim === undefined)
      {
        return JipdaValue._UND;
      }
      if (prim === null)
      {
        return JipdaValue._NULL;
      }
      throw new Error("cannot abstract value " + prim);
    }

Some.prototype.isTruthy =
    function ()
    {
      return !!this.prim;
    }

Some.prototype.isTrue =
    function ()
    {
      return this.prim === true;
    }

Some.prototype.isFalsy =
    function ()
    {
      return !this.prim;
    }

Some.prototype.isFalse =
    function ()
    {
      return this.prim === false;
    }

Some.prototype.ToString =
    function ()
    {
      return new Some(String(this.prim));
    }

Some.prototype.ToNumber =
    function ()
    {
      return new Some(Number(this.prim));
    }

Some.prototype.ToUint32 =
    function ()
    {
      return new Some(this.prim >>> 0);
    }

Some.prototype.subsumes =
    function (x)
    {
      if (x === BOT)
      {
        return true;
      }
      if (x instanceof Some)
      {
        return this.equals(x);
      }
      return false;
    }

Some.prototype.join =
    function (x)
    {
      if (x === BOT || this.equals(x))
      {
        return this;
      }
      var x1 = this.abst();
      var x2 = x.abst();
      return x1.join(x2);
    }

Some.prototype.addresses =
    function ()
    {
      return JipdaValue.EMPTY_SET;
    }

Some.prototype.isRef =
    function ()
    {
      return false;
    }

Some.prototype.isNonRef =
    function ()
    {
      return true;
    }

Some.prototype.toString =
    function ()
    {
      return String(this.prim);
    }

Some.prototype.projectString =
    function ()
    {
      if (typeof this.prim === "string")
      {
        return this;
      }
      return BOT;
    }

Some.prototype.projectNumber =
    function ()
    {
      if (typeof this.prim === "number")
      {
        return this;
      }
      return BOT;
    }

Some.prototype.projectBoolean =
    function ()
    {
      if (typeof this.prim === "boolean")
      {
        return this;
      }
      return BOT;
    }

Some.prototype.charAt =
    function (x)
    {
      return new JipdaValue(JipdaValue.STR | JipdaValue.NUMSTR, JipdaValue.EMPTY_SET);
    }

Some.prototype.charCodeAt =
    function (x)
    {
      return JipdaValue._NUM;
    }

Some.prototype.startsWith =
    function (x)
    {
      return JipdaValue._BOOL;
    }

Some.prototype.stringLength =
    function (x)
    {
      return new Some(this.prim.length);
    }

Some.prototype.parseInt =
    function ()
    {
      return new Some(parseInt(this.prim, 0));
    }

function JipdaValue(type, as)
{
  this.type = type;
  this.as = as;
}

JipdaValue.prototype.equals =
    function (x)
    {
      return (x instanceof JipdaValue)
          && this.type === x.type
          && this.as.equals(x.as)
    }
JipdaValue.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.type;
      result = prime * result + this.as.hashCode();
      return result;
    }

JipdaValue.prototype.isTruthy =
    function ()
    {
      return (this.type & JipdaValue.TRUTHY) || this.isRef();
    }

JipdaValue.prototype.isTrue =
    function ()
    {
      return (this.type & JipdaValue.BOOL);
    }

JipdaValue.prototype.isFalsy =
    function ()
    {
      return (this.type & JipdaValue.FALSY);
    }

JipdaValue.prototype.ToString =
    function ()
    {
      var type = (this.type & JipdaValue.STRINGMASK);
      if ((this.type & (JipdaValue.UND | JipdaValue.NULL | JipdaValue.BOOL )) || this.isRef())
      {
        type |= JipdaValue.STR;
      }
      if (this.type & JipdaValue.NUM)
      {
        type |= JipdaValue.NUMSTR;
      }
      return new JipdaValue(type, JipdaValue.EMPTY_SET);
    }

JipdaValue.prototype.ToNumber =
    function ()
    {
      return JipdaValue._NUM;
    }

JipdaValue.prototype.ToUint32 =
    function ()
    {
      return JipdaValue._NUM;
    }

JipdaValue.prototype.abst =
    function ()
    {
      return this;
    }

JipdaValue.prototype.subsumes =
    function (x)
    {
      if (x === BOT)
      {
        return true;
      }
      var type = this.type;
      var as = this.as;
      if (x instanceof JipdaValue)
      {
        return ((~type & x.type) === 0) && as.subsumes(x.as);
      }
      if (as.count() > 0)
      {
        return false;
      }
      var xx = x.abst();
      return (type & xx.type);
    }

JipdaValue.prototype.join =
    function (x)
    {
      if (x === BOT)
      {
        return this;
      }
      var x2 = x.abst();
      return new JipdaValue(this.type | x2.type, this.as.join(x2.as));
    }

JipdaValue.prototype.addresses =
    function ()
    {
      return this.as;
    }

JipdaValue.prototype.toString =
    function ()
    {
      var result = [];
      var type = this.type;
      if (type & JipdaValue.STR)
      {
        result.push("Str");
      }
      if (type & JipdaValue.NUMSTR)
      {
        result.push("NumStr");
      }
      if (type & JipdaValue.NUM)
      {
        result.push("Num");
      }
      if (type & JipdaValue.BOOL)
      {
        result.push("Bool");
      }
      if (type & JipdaValue.UND)
      {
        result.push("Undefined");
      }
      if (type & JipdaValue.NULL)
      {
        result.push("Null");
      }
      if (this.as.count() > 0)
      {
        result.push(this.as);
      }
      return "{" + result.join(",") + "}";
    }

JipdaValue.prototype.isNonRef =
    function ()
    {
      return this.type;
    }

JipdaValue.prototype.isRef =
    function ()
    {
      return this.as.count() > 0;
    }

JipdaValue.prototype.projectRef =
    function ()
    {
      if (this.isRef())
      {
        return new JipdaValue(0, this.as);
      }
      return BOT;
    }

JipdaValue.prototype.projectString =
    function ()
    {
      var type = this.type & JipdaValue.STRINGMASK;
      if (type)
      {
        return new JipdaValue(type, JipdaValue.EMPTY_SET);
      }
      return BOT;
    }

JipdaValue.prototype.projectNumber =
    function ()
    {
      var type = this.type & JipdaValue.NUM;
      if (type)
      {
        return new JipdaValue(type, JipdaValue.EMPTY_SET);
      }
      return BOT;
    }

JipdaValue.prototype.projectBoolean =
    function ()
    {
      var type = this.type & JipdaValue.BOOL;
      if (type)
      {
        return new JipdaValue(type, JipdaValue.EMPTY_SET);
      }
      return BOT;
    }

JipdaValue.prototype.charAt =
    function (x)
    {
      return new JipdaValue(JipdaValue.STR | JipdaValue.NUMSTR, JipdaValue.EMPTY_SET);
    }

JipdaValue.prototype.charCodeAt =
    function (x)
    {
      return JipdaValue._NUM;
    }

JipdaValue.prototype.stringLength =
    function (x)
    {
      return JipdaValue._NUMSTR;
    }

JipdaValue.prototype.startsWith =
    function (x)
    {
      return JipdaValue._BOOL;
    }

JipdaValue.prototype.parseInt =
    function ()
    {
      return JipdaValue._NUM;
    }




function JipdaLattice()
{
}

JipdaLattice.prototype.abst =
    function (cvalues)
    {
      return cvalues.map(JipdaLattice.prototype.abst1, this).reduce(Lattice.join);
    }

JipdaLattice.prototype.abstRef =
    function (addr)
    {
      return new JipdaValue(0, ArraySet.from1(addr));
    }


JipdaLattice.prototype.abst1 =
    function (value)
    {
      if (typeof value === "string")
      {
        return new Some(value);
      }
      if (typeof value === "number")
      {
        return JipdaValue._NUM;
      }
      if (value === true || value === false)
      {
        return JipdaValue._BOOL;
      }
      if (value === undefined)
      {
        return JipdaValue._UND;
      }
      if (value === null)
      {
        return JipdaValue._NULL;
      }
      throw new Error("cannot abstract value " + value);
    }

JipdaLattice.prototype.NUMBER = JipdaValue._NUM;
JipdaLattice.prototype.BOOL = JipdaValue._BOOL;
JipdaLattice.prototype.UNDEFINED = JipdaValue._UND;

JipdaLattice.prototype.add =
    function (x, y)
    {
      if (x instanceof Some && y instanceof Some)
      {
        var result = x.prim + y.prim;
        if (typeof result === "string" && result.length > 32)
        {
          return JipdaValue._STR;
        }
        return new Some(result);
      }
      var x = x.abst();
      var y = y.abst();
      
      var type = 0;
      if ((x.type & JipdaValue.STR) || (y.type & JipdaValue.STR))
      {
        type |= JipdaValue.STR;
      }
      if (x.type & JipdaValue.NUMSTR)
      {
        if (y.type & (JipdaValue.NUMSTR | JipdaValue.NUM))
        {
          type |= JipdaValue.NUMSTR;
        }
        if ((y.type ^ JipdaValue.NUMSTR) || y.isRef())
        {
          type |= JipdaValue.STR;
        }
      }
      else if (y.type & JipdaValue.NUMSTR)
      {
        if (x.type & JipdaValue.NUM)
        {
          type |= JipdaValue.NUMSTR;
        }
        type |= JipdaValue.STR;
      }
      if (((x.type & JipdaValue.STRINGERS) || x.isRef()) && ((y.type & JipdaValue.STRINGERS) || y.isRef()))
      {
        type |= JipdaValue.NUM;
      }
      return new JipdaValue(type, JipdaValue.EMPTY_SET);
    }

JipdaLattice.prototype.lt =
    function (x, y)
    {
      return this.BOOL;
    }

JipdaLattice.prototype.lte =
    function (x, y)
    {
      return this.BOOL;
    }

JipdaLattice.prototype.gt =
    function (x, y)
    {
      return this.BOOL;
    }

JipdaLattice.prototype.gte =
    function (x, y)
    {
      return this.BOOL;
    }

JipdaLattice.prototype.sub =
    function (x, y)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.mul =
    function (x, y)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.div =
    function (x, y)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.rem =
    function (x, y)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.eqq =
    function (x, y)
    {
      return this.BOOL;
    }

JipdaLattice.prototype.eq =
    function (x, y)
    {
      return this.BOOL;
    }

JipdaLattice.prototype.neq =
    function (x, y)
    {
      return this.BOOL;
    }

JipdaLattice.prototype.binor =
    function (x, y)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.binxor =
    function (x, y)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.binand =
    function (x, y)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.shl =
    function (x, y)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.shr =
    function (x, y)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.shrr =
    function (x, y)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.not =
    function (x)
    {
      return this.BOOL;
    }

JipdaLattice.prototype.neg =
    function (x)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.binnot =
    function (x)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.sqrt =
    function (x)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.sin =
    function (x)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.cos =
    function (x)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.abs =
    function (x)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.round =
    function (x)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.floor =
    function (x)
    {
      return this.NUMBER;
    }

JipdaLattice.prototype.toString =
    function ()
    {
      return "JipdaLattice1-2";
    }

JipdaLattice.prototype.sanity =
    function ()
    {
      assert(this.NUMBER.isTruthy());
      assert(this.NUMBER.isFalsy());
      assert(this.BOOL.isTruthy());
      assert(this.BOOL.isFalsy());
      assert(this.abst1(0).isFalsy());
      assert(this.abst1(1).isTruthy());
      assert(this.abst1(-1).isTruthy());
      assert(this.abst1("").isFalsy());
      assert(this.abst1("0").isTruthy());
      assert(this.abst1("xyz").isTruthy());
      assert(this.abst1(true).isTruthy());
      assert(this.abst1(false).isFalsy());
    }
