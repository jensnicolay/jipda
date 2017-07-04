"use strict";

const ConcTypeLattice = (function ()
{
  TypeValue.UND = 1 << 0;
  TypeValue.NULL = 1 << 1;
  TypeValue.STR = 1 << 2;
  TypeValue.NUM = 1 << 3;
  TypeValue.NUMSTR = 1 << 4;
  TypeValue.BOOL = 1 << 5;
  TypeValue.EMPTY_SET = ArraySet.empty();
  
  TypeValue.TRUTHY = TypeValue.STR | TypeValue.NUM | TypeValue.NUMSTR | TypeValue.BOOL;
  TypeValue.FALSY = TypeValue.UND | TypeValue.NULL | TypeValue.STR | TypeValue.NUM | TypeValue.BOOL;
  
  TypeValue.STRINGMASK = TypeValue.STR | TypeValue.NUMSTR;
  TypeValue.STRINGERS = TypeValue.UND | TypeValue.NULL | TypeValue.BOOL | TypeValue.NUM;
  
  TypeValue._NUM = new TypeValue(TypeValue.NUM, TypeValue.EMPTY_SET);
  TypeValue._STR = new TypeValue(TypeValue.STR, TypeValue.EMPTY_SET);
  TypeValue._BOOL = new TypeValue(TypeValue.BOOL, TypeValue.EMPTY_SET);
  TypeValue._NUMSTR = new TypeValue(TypeValue.NUMSTR, TypeValue.EMPTY_SET);
  TypeValue._UND = new TypeValue(TypeValue.UND, TypeValue.EMPTY_SET);
  TypeValue._NULL = new TypeValue(TypeValue.NULL, TypeValue.EMPTY_SET);
  
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
        return false;
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
          return TypeValue._STR;
        }
        if (typeof prim === "number")
        {
          return TypeValue._NUM;
        }
        if (prim === true || prim === false)
        {
          return TypeValue._BOOL;
        }
        if (prim === undefined)
        {
          return TypeValue._UND;
        }
        if (prim === null)
        {
          return TypeValue._NULL;
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
  
  Some.prototype.meet =
      function (x)
      {
        if (x === BOT || this.equals(x))
        {
          return BOT;
        }
        var x1 = this.abst();
        var x2 = x.abst();
        return x1.meet(x2);
      }
  
  Some.prototype.addresses =
      function ()
      {
        return TypeValue.EMPTY_SET;
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
  
  Some.prototype.isNull =
      function ()
      {
        return this.prim === null;
      }
  
  Some.prototype.isNonNull =
      function ()
      {
        return this.prim !== null;
      }
  
  Some.prototype.isUndefined =
      function ()
      {
        return this.prim === undefined;
      }
  
  Some.prototype.isNonUndefined =
      function ()
      {
        return this.prim !== null;
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
  
  Some.prototype.projectObject =
      function ()
      {
        return BOT;
      }
  
  Some.prototype.projectUndefined =
      function ()
      {
        if (this.prim === undefined)
        {
          return this;
        }
        return BOT;
      }
  
  Some.prototype.projectNull =
      function ()
      {
        if (this.prim === null)
        {
          return this;
        }
        return BOT;
      }
  
  Some.prototype.charAt =
      function (x)
      {
        return new TypeValue(TypeValue.STR | TypeValue.NUMSTR, TypeValue.EMPTY_SET);
      }
  
  Some.prototype.charCodeAt =
      function (x)
      {
        return TypeValue._NUM;
      }
  
  Some.prototype.startsWith =
      function (x)
      {
        return TypeValue._BOOL;
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
  
  Some.prototype.conc1 =
      function ()
      {
        return this.prim;
      }
  
  function ConcAddr(addr)
  {
    assertDefinedNotNull(addr);
    this.addr = addr;
  }
  
  ConcAddr.prototype.equals =
      function (x)
      {
        if (this === x)
        {
          return true;
        }
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
        if (x === BOT || this.equals(x))
        {
          return this;
        }
        const xx = this.abst();
        const yy = x.abst();
        return xx.join(yy);
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
  
  ConcAddr.prototype.isNull =
      function ()
      {
        return false;
      }
  
  ConcAddr.prototype.isNonNull =
      function ()
      {
        return true;
      }
  
  ConcAddr.prototype.isUndefined =
      function ()
      {
        return false;
      }
  
  ConcAddr.prototype.isNonUndefined =
      function ()
      {
        return true;
      }
  
  ConcAddr.prototype.projectString =
      function ()
      {
        return BOT;
      }
  
  ConcAddr.prototype.projectNumber =
      function ()
      {
        return BOT;
      }
  
  ConcAddr.prototype.projectBoolean =
      function ()
      {
        return BOT;
      }
  
  ConcAddr.prototype.projectObject =
      function ()
      {
        return this;
      }
  
  ConcAddr.prototype.projectUndefined =
      function ()
      {
        return BOT;
      }
  
  ConcAddr.prototype.projectNull =
      function ()
      {
        return BOT;
      }
  
  ConcAddr.prototype.hasSameNumberValue =
      function (x)
      {
        return new Some(false);
      }
  
  ConcAddr.prototype.hasSameStringValue =
      function (x)
      {
        return new Some(false);
      }
      
  ConcAddr.prototype.abst =
      function ()
      {
        return new TypeValue(0, ArraySet.from1(this.addr));
      }
      
  function TypeValue(type, as)
  {
    this.type = type;
    this.as = as;
  }
  
  TypeValue.prototype.equals =
      function (x)
      {
        return (x instanceof TypeValue)
            && this.type === x.type
            && this.as.equals(x.as)
      }
  TypeValue.prototype.hashCode =
      function ()
      {
        var prime = 31;
        var result = 1;
        result = prime * result + this.type;
        result = prime * result + this.as.hashCode();
        return result;
      }
  
  TypeValue.prototype.isTruthy =
      function ()
      {
        return (this.type & TypeValue.TRUTHY) || this.isRef();
      }
  
  TypeValue.prototype.isTrue =
      function ()
      {
        return (this.type & TypeValue.BOOL);
      }
  
  TypeValue.prototype.isFalsy =
      function ()
      {
        return (this.type & TypeValue.FALSY);
      }
  
  TypeValue.prototype.isFalse =
      function ()
      {
        return (this.type & TypeValue.FALSY);
      }
  
  TypeValue.prototype.isUndefined =
      function ()
      {
        return (this.type & TypeValue.UND);
      }
  
  TypeValue.prototype.isNonUndefined =
      function ()
      {
        return (this.type ^ TypeValue.UND) || this.isRef();
      }
  
  TypeValue.prototype.isNull =
      function ()
      {
        return (this.type & TypeValue.NULL);
      }
  
  TypeValue.prototype.isNonNull =
      function ()
      {
        return (this.type ^ TypeValue.NULL) || this.isRef();
      }
  
  TypeValue.prototype.ToString =
      function ()
      {
        var type = (this.type & TypeValue.STRINGMASK);
        if ((this.type & (TypeValue.UND | TypeValue.NULL | TypeValue.BOOL )) || this.isRef())
        {
          type |= TypeValue.STR;
        }
        if (this.type & TypeValue.NUM)
        {
          type |= TypeValue.NUMSTR;
        }
        return new TypeValue(type, TypeValue.EMPTY_SET);
      }
  
  TypeValue.prototype.ToNumber =
      function ()
      {
        return TypeValue._NUM;
      }
  
  TypeValue.prototype.ToUint32 =
      function ()
      {
        return TypeValue._NUM;
      }
  
  TypeValue.prototype.abst =
      function ()
      {
        return this;
      }
  
  TypeValue.prototype.subsumes =
      function (x)
      {
        if (x === BOT)
        {
          return true;
        }
        var type = this.type;
        var as = this.as;
        if (x instanceof TypeValue)
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
  
  TypeValue.prototype.join =
      function (x)
      {
        if (x === BOT || this.equals(x))
        {
          return this;
        }
        var x2 = x.abst();
        return new TypeValue(this.type | x2.type, this.as.join(x2.as));
      }
  
  TypeValue.prototype.meet =
      function (x)
      {
        if (x === BOT)
        {
          return BOT;
        }
        if (this.equals(x))
        {
          return BOT;
        }
        var x2 = x.abst();
        return new TypeValue(this.type ^ x2.type, this.as.meet(x2.as));
      }
  
  TypeValue.prototype.addresses =
      function ()
      {
        return this.as;
      }
  
  TypeValue.prototype.toString =
      function ()
      {
        var result = [];
        var type = this.type;
        if (type & TypeValue.STR)
        {
          result.push("Str");
        }
        if (type & TypeValue.NUMSTR)
        {
          result.push("NumStr");
        }
        if (type & TypeValue.NUM)
        {
          result.push("Num");
        }
        if (type & TypeValue.BOOL)
        {
          result.push("Bool");
        }
        if (type & TypeValue.UND)
        {
          result.push("Undefined");
        }
        if (type & TypeValue.NULL)
        {
          result.push("Null");
        }
        if (this.as.count() > 0)
        {
          result.push(this.as);
        }
        return "{" + result.join(",") + "}";
      }
  
  TypeValue.prototype.isNonRef =
      function ()
      {
        return this.type;
      }
  
  TypeValue.prototype.isRef =
      function ()
      {
        return this.as.count() > 0;
      }
  
  TypeValue.prototype.projectObject =
      function ()
      {
        if (this.isRef())
        {
          return new TypeValue(0, this.as);
        }
        return BOT;
      }
  
  TypeValue.prototype.projectString =
      function ()
      {
        var type = this.type & TypeValue.STRINGMASK;
        if (type)
        {
          return new TypeValue(type, TypeValue.EMPTY_SET);
        }
        return BOT;
      }
  
  TypeValue.prototype.projectNumber =
      function ()
      {
        var type = this.type & TypeValue.NUM;
        if (type)
        {
          return new TypeValue(type, TypeValue.EMPTY_SET);
        }
        return BOT;
      }
  
  TypeValue.prototype.projectBoolean =
      function ()
      {
        var type = this.type & TypeValue.BOOL;
        if (type)
        {
          return new TypeValue(type, TypeValue.EMPTY_SET);
        }
        return BOT;
      }
  
  TypeValue.prototype.projectUndefined =
      function ()
      {
        var type = this.type & TypeValue.UND;
        if (type)
        {
          return new TypeValue(type, TypeValue.EMPTY_SET);
        }
        return BOT;
      }
  
  TypeValue.prototype.projectNull =
      function ()
      {
        var type = this.type & TypeValue.NULL;
        if (type)
        {
          return new TypeValue(type, TypeValue.EMPTY_SET);
        }
        return BOT;
      }
  
  TypeValue.prototype.charAt =
      function (x)
      {
        return new TypeValue(TypeValue.STR | TypeValue.NUMSTR, TypeValue.EMPTY_SET);
      }
  
  TypeValue.prototype.charCodeAt =
      function (x)
      {
        return TypeValue._NUM;
      }
  
  TypeValue.prototype.stringLength =
      function (x)
      {
        return TypeValue._NUMSTR;
      }
  
  TypeValue.prototype.startsWith =
      function (x)
      {
        return TypeValue._BOOL;
      }
  
  TypeValue.prototype.parseInt =
      function ()
      {
        return TypeValue._NUM;
      }
  
  
  function TypeLattice()
  {
  }
  
  TypeLattice.prototype.abst =
      function (cvalues)
      {
        return cvalues.map(TypeLattice.prototype.abst1, this).reduce(Lattice.join);
      }
  
  TypeLattice.prototype.abstRef =
      function (addr)
      {
        return new ConcAddr(addr);
      }
  
  
  TypeLattice.prototype.abst1 =
      function (value)
      {
        return new Some(value);
      }
  
  TypeLattice.prototype.NUMBER = TypeValue._NUM;
  TypeLattice.prototype.BOOL = TypeValue._BOOL;
  TypeLattice.prototype.UNDEFINED = TypeValue._UND;
  
  TypeLattice.prototype.add =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          var result = x.prim + y.prim;
          return new Some(result);
        }
        var x = x.abst();
        var y = y.abst();
        
        var type = 0;
        if ((x.type & TypeValue.STR) || (y.type & TypeValue.STR))
        {
          type |= TypeValue.STR;
        }
        if (x.type & TypeValue.NUMSTR)
        {
          if (y.type & (TypeValue.NUMSTR | TypeValue.NUM))
          {
            type |= TypeValue.NUMSTR;
          }
          if ((y.type ^ TypeValue.NUMSTR) || y.isRef())
          {
            type |= TypeValue.STR;
          }
        }
        else if (y.type & TypeValue.NUMSTR)
        {
          if (x.type & TypeValue.NUM)
          {
            type |= TypeValue.NUMSTR;
          }
          type |= TypeValue.STR;
        }
        if (((x.type & TypeValue.STRINGERS) || x.isRef()) && ((y.type & TypeValue.STRINGERS) || y.isRef()))
        {
          type |= TypeValue.NUM;
        }
        return new TypeValue(type, TypeValue.EMPTY_SET);
      }
  
  TypeLattice.prototype.lt =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          var result = x.prim < y.prim;
          return new Some(result);
        }
        
        return this.BOOL;
      }
  
  TypeLattice.prototype.lte =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          var result = x.prim <= y.prim;
          return new Some(result);
        }

        return this.BOOL;
      }
  
  TypeLattice.prototype.gt =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          var result = x.prim > y.prim;
          return new Some(result);
        }
        
        return this.BOOL;
      }
  
  TypeLattice.prototype.gte =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          var result = x.prim >= y.prim;
          return new Some(result);
        }
        
        return this.BOOL;
      }
  
  TypeLattice.prototype.sub =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          var result = x.prim - y.prim;
          return new Some(result);
        }
  
        return this.NUMBER;
      }
  
  TypeLattice.prototype.mul =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          var result = x.prim * y.prim;
          return new Some(result);
        }
        
        return this.NUMBER;
      }
  
  TypeLattice.prototype.div =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          var result = x.prim / y.prim;
          return new Some(result);
        }
  
        return this.NUMBER;
      }
  
  TypeLattice.prototype.rem =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          var result = x.prim % y.prim;
          return new Some(result);
        }
  
        return this.NUMBER;
      }
  
  TypeLattice.prototype.eqq =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          return new Some(x.prim === y.prim);
        }
        
        if (x instanceof ConcAddr && y instanceof ConcAddr)
        {
          return new Some(x.equals(y));
        }
  
        if (x instanceof ConcAddr && y instanceof Some)
        {
          return new Some(false);
        }
  
        if (x instanceof Some && y instanceof ConcAddr)
        {
          return new Some(false);
        }
  
        return this.BOOL;
      }
  
  TypeLattice.prototype.eq =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          var result = x.prim == y.prim;
          return new Some(result);
        }
  
        if (x instanceof ConcAddr && y instanceof ConcAddr)
        {
          return new Some(x.equals(y));
        }
  
        return this.BOOL;
      }
  
  TypeLattice.prototype.neq =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          return new Some(x.prim != y.prim);
        }
  
        if (x instanceof ConcAddr && y instanceof ConcAddr)
        {
          return new Some(!x.equals(y));
        }
  
        return this.BOOL;
      }
  
  TypeLattice.prototype.neqq =
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          return new Some(x.prim !== y.prim);
        }
  
        if (x instanceof ConcAddr && y instanceof ConcAddr)
        {
          return new Some(!x.equals(y));
        }
  
        if (x instanceof ConcAddr && y instanceof Some)
        {
          return new Some(true);
        }
  
        if (x instanceof Some && y instanceof ConcAddr)
        {
          return new Some(true);
        }
  
        return this.BOOL;
      }
  
  TypeLattice.prototype.binor =
      function (x, y)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.binxor =
      function (x, y)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.binand =
      function (x, y)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.shl =
      function (x, y)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.shr =
      function (x, y)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.shrr =
      function (x, y)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.not =
      function (x)
      {
        if (x instanceof Some)
        {
          return new Some(!x.prim);
        }
        
        return this.BOOL;
      }
  
  TypeLattice.prototype.pos = // unary +
      function (x)
      {
        if (x instanceof Some)
        {
          var result = +x.prim;
          return new Some(result);
        }
        
        return this.NUMBER;
      }
  
  TypeLattice.prototype.neg = // unary -
      function (x)
      {
        if (x instanceof Some)
        {
          var result = -x.prim;
          return new Some(result);
        }
  
        return this.NUMBER;
      }
  
  TypeLattice.prototype.binnot =
      function (x)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.sqrt =
      function (x)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.sin =
      function (x)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.cos =
      function (x)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.abs =
      function (x)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.round =
      function (x)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.floor =
      function (x)
      {
        return this.NUMBER;
      }
  
  TypeLattice.prototype.toString =
      function ()
      {
        return "JipdaLattice1-2";
      }
  
  TypeLattice.prototype.sanity =
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
  return TypeLattice;
})();