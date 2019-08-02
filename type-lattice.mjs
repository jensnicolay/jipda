import {HashCode, ArraySet, assert, assertFalse} from './common.mjs';
import {BOT} from './lattice.mjs';

const UND = 1 << 0;
const NULL = 1 << 1;
const STR = 1 << 2;
const NUM = 1 << 3;
const NUMSTR = 1 << 4;
const BOOL = 1 << 5;
const EMPTY_SET = ArraySet.empty();

const TRUTHY = STR | NUM | NUMSTR | BOOL;
const FALSY = UND | NULL | STR | NUM | BOOL;

const STRINGMASK = STR | NUMSTR;
const STRINGERS = UND | NULL | BOOL | NUM;

const _NUM = new TypeValue(NUM, EMPTY_SET);
const _STR = new TypeValue(STR, EMPTY_SET);
const _BOOL = new TypeValue(BOOL, EMPTY_SET);
const _NUMSTR = new TypeValue(NUMSTR, EMPTY_SET);
const _UND = new TypeValue(UND, EMPTY_SET);
const _NULL = new TypeValue(NULL, EMPTY_SET);

function abst1(value)
{
  if (typeof value === "string")
  {
    return new Some(value);
  }
  if (typeof value === "number")
  {
    return _NUM;
  }
  if (value === true || value === false)
  {
    return new Some(value);
  }
  if (value === undefined)
  {
    return new Some(undefined); // don't use _UND: not recognized as 'precise' Some
  }
  if (value === null)
  {
    return new Some(null); // _NULL;
  }
  throw new Error("cannot abstract value " + value);
}

function eqqHelper1(prim, tvy)
{
  if (prim === undefined)
  {
   if (tvy === UND)
   {
     return new Some(true);
   }
   if (!(tvy & UND))
   {
     return new Some(false);
   }
   return _BOOL;
  }
  if (prim === null)
  {
    if (tvy === NULL)
    {
      return new Some(true);
    }
    if (!(tvy & NULL))
    {
      return new Some(false);
    }
    return _BOOL;
  }
  if (typeof prim === "number" && !(tvy & NUM))
  {
    return new Some(false);
  }
  if ((prim === true || prim === false) && !(tvy & BOOL))
  {
    return new Some(false);
  }
  if (typeof prim === "string" && !((tvy & STR) || (tvy & NUMSTR)))
  {
    return new Some(false);
  }
  return _BOOL;
}


export default {
  bot:
      function ()
      {
        return BOT;
      },
  abst:
    function (cvalues)
    {
      return cvalues.map(abst1, this).reduce((x, y) => x.join(y));
    },

  abstRef:
    function (addr)
    {
      return new TypeValue(0, ArraySet.from1(addr));
    },


  abst1,
  

  add:
    function (x, y)
    {
      if (x instanceof Some && y instanceof Some)
      {
        var result = x.prim + y.prim;
        if (typeof result === "string" && result.length < 33)
        {
          return new Some(result);
        }
      }
      var x = x.abst();
      var y = y.abst();
      
      var type = 0;
      if ((x.type & STR) || (y.type & STR))
      {
        type |= STR;
      }
      if (x.type & NUMSTR)
      {
        if (y.type & (NUMSTR | NUM))
        {
          type |= NUMSTR;
        }
        if ((y.type ^ NUMSTR) || y.isRef())
        {
          type |= STR;
        }
      }
      else if (y.type & NUMSTR)
      {
        if (x.type & NUM)
        {
          type |= NUMSTR;
        }
        type |= STR;
      }
      if (((x.type & STRINGERS) || x.isRef()) && ((y.type & STRINGERS) || y.isRef()))
      {
        type |= NUM;
      }
      return new TypeValue(type, EMPTY_SET);
    },

  lt:
    function (x, y)
    {
      return _BOOL;
    },

  lte:
    function (x, y)
    {
      return _BOOL;
    },

  gt:
    function (x, y)
    {
      return _BOOL;
    },

  gte:
    function (x, y)
    {
      return _BOOL;
    },

  sub:
    function (x, y)
    {
      return _NUM;
    },

  mul:
    function (x, y)
    {
      return _NUM;
    },

  div:
    function (x, y)
    {
      return _NUM;
    },

  rem:
    function (x, y)
    {
      return _NUM;
    },

  // eqq: function (x, y)
  // {
  //   const r = this.eqqH(x, y);
  //   console.log(x + " === " + y + " = " + r);
  //   return r;
  // },

  eqq:
    function (x, y)
    {
      if (x instanceof Some)
      {
        if (y instanceof Some)
        {
          return new Some(x.prim === y.prim);
        }
        // x some y typevalue
        if (y.type === 0)
        {
          // y ref without prim part, x only prim
          return new Some(false);
        }
        else if (!y.isRef())
        {
          // y prim without ref part, x only prim
          return eqqHelper1(x.prim, y.type);
        }
        return _BOOL;
      }
      else if (y instanceof Some)
      {
        // x typevalue y some
        if (x.type === 0)
        {
          // x ref without prim part, y only prim
          return new Some(false);
        }
        else if (!x.isRef())
        {
          // x prim without ref part, y only prim
          return eqqHelper1(y.prim, x.type);
        }
        return _BOOL;
      }

      // x typevalue y typevalue

      if (x.isNonRef() && y.isNonRef())
      {
        const tvx = x.type;
        const tvy = y.type;
        if ((tvx === UND || tvx === NULL) && tvx === tvy)
        {
          return new Some(true);
        }
        if ((tvx & NUM) && !(tvy & NUM))
        {
          return new Some(false);
        }
        if ((tvx & BOOL) && !(tvy & BOOL))
        {
          return new Some(false);
        }
        if ((tvx & STR) && !((tvy & STR) || (tvy & NUMSTR)))
        {
          return new Some(false);
        }
        return _BOOL;
      }

      if (x.type === 0 && y.type === 0)
      {
        const xn = x.as.size();
        if (xn === 1 && x.as.equals(y.as))
        {
          return new Some(true);
        }
      }

      return _BOOL;
    },

  eq:
    function (x, y)
    {
      return _BOOL;
    },

  neq:
    function (x, y)
    {
      if (x instanceof Some && y instanceof Some)
      {
        return new Some(x.prim != y.prim);
      }
      
      return _BOOL;
    },

  neqq:
      function (x, y)
      {
        if (x instanceof Some && y instanceof Some)
        {
          return new Some(x.prim !== y.prim);
        }

        return _BOOL;
      },

  binor:
    function (x, y)
    {
      return _NUM;
    },

  binxor:
    function (x, y)
    {
      return _NUM;
    },

  binand:
    function (x, y)
    {
      return _NUM;
    },

  shl:
    function (x, y)
    {
      return _NUM;
    },

  shr:
    function (x, y)
    {
      return _NUM;
    },

  shrr:
      function (x, y)
      {
        return _NUM;
      },

  max:
      function (x, y)
      {
        return _NUM;
      },

  min:
      function (x, y)
      {
        return _NUM;
      },

  not:
    function (x)
    {
      if (x instanceof Some)
      {
        return new Some(!x.prim);
      }
      
      return _BOOL;
    },

  pos: // unary +
    function (x)
    {
      return _NUM;
    },

  neg: // unary -
    function (x)
    {
      return _NUM;
    },

  binnot:
    function (x)
    {
      return _NUM;
    },

  sqrt:
    function (x)
    {
      return _NUM;
    },

  sin:
    function (x)
    {
      return _NUM;
    },

  cos:
    function (x)
    {
      return _NUM;
    },

  abs:
    function (x)
    {
      return _NUM;
    },

  round:
    function (x)
    {
      return _NUM;
    },

  floor:
    function (x)
    {
      return _NUM;
    },

  toString:
    function ()
    {
      return "JipdaLattice1-2";
    },

  sanity:
    function ()
    {
      assert(_NUM.isTruthy());
      assert(_NUM.isFalsy());
      assert(_BOOL.isTruthy());
      assert(_BOOL.isFalsy());
      assert(this.abst1(0).isFalsy());
      assert(this.abst1(1).isTruthy());
      assert(this.abst1(-1).isTruthy());
      assert(this.abst1("").isFalsy());
      assert(this.abst1("0").isTruthy());
      assert(this.abst1("xyz").isTruthy());
      assert(this.abst1(true).isTruthy());
      assert(this.abst1(false).isFalsy());
      assert((_STR.join(_UND)).subsumes(this.abst1("0")));
      assert(_STR.subsumes(_STR));
      assert(_NUMSTR.subsumes(_NUMSTR));
      assert(_STR.subsumes(_NUMSTR));
      assertFalse(_NUMSTR.subsumes(_STR));
    }
}

function Some(prim)
{
  assertFalse(typeof prim === "object" && prim !== null && prim.constructor.name === "Property", prim)
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
      // console.log("absting " + this);
      // console.trace();
      var prim = this.prim;
      if (typeof prim === "string")
      {
        if (+prim === +prim && prim !== "")
        {
          return _NUMSTR;
        }
        return _STR;
      }
      if (typeof prim === "number")
      {
        return _NUM;
      }
      if (prim === true || prim === false)
      {
        return _BOOL;
      }
      if (prim === undefined)
      {
        return _UND;
      }
      if (prim === null)
      {
        return _NULL;
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

Some.prototype.update =
    function (x)
    {
      if (x === BOT || this.equals(x))
      {
        return this;
      }
      var x1 = this.abst();
      if (!x.abst)
      {
        throw new Error("NO ABST " + x + " " + x.constructor.name + " " + this);
      }
      var x2 = x.abst();
      return x1.join(x2);
    }

Some.prototype.join = Some.prototype.update;

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
      return EMPTY_SET;
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
      return this.prim !== undefined;
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
      // return new TypeValue(STR | NUMSTR, EMPTY_SET);
      return new TypeValue(STR, EMPTY_SET);
    }

Some.prototype.charCodeAt =
    function (x)
    {
      return _NUM;
    }

  Some.prototype.startsWith =
  function (x)
  {
    return _BOOL;
  }

  Some.prototype.substring =
  function (x, y)
  {
    return _STR;
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
      return (this.type & TRUTHY) || this.isRef();
    }

TypeValue.prototype.isTrue =
    function ()
    {
      return (this.type & BOOL);
    }

TypeValue.prototype.isFalsy =
    function ()
    {
      return (this.type & FALSY);
    }

TypeValue.prototype.isFalse =
    function ()
    {
      return (this.type & BOOL);
    }

TypeValue.prototype.isUndefined =
    function ()
    {
      return (this.type & UND);
    }

TypeValue.prototype.isNonUndefined =
    function ()
    {
      return (this.type ^ UND) || this.isRef();
    }

TypeValue.prototype.isNull =
    function ()
    {
      return (this.type & NULL);
    }

TypeValue.prototype.isNonNull =
    function ()
    {
      return (this.type ^ NULL) || this.isRef();
    }

TypeValue.prototype.ToString =
    function ()
    {
      var type = (this.type & STRINGMASK);
      if ((this.type & (UND | NULL | BOOL )) || this.isRef())
      {
        type |= STR;
      }
      if (this.type & NUM)
      {
        type |= NUMSTR;
      }
      return new TypeValue(type, EMPTY_SET);
    }

TypeValue.prototype.ToNumber =
    function ()
    {
      return _NUM;
    }

TypeValue.prototype.ToUint32 =
    function ()
    {
      return _NUM;
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
        if ((type & STR) && (x.type & NUMSTR))
        {
          return true;
        }  
        return ((~type & x.type) === 0) && as.subsumes(x.as);
      }
      // x is prim only
      if (type === 0)
      {
        // this is ref only
        return false;
      }
      var xx = x.abst();
      if ((type & STR) && (xx.type & NUMSTR))
      {
        return true;
      }
      return (type & xx.type);
    }

TypeValue.prototype.join =
    function (x)
    {
      if (x === BOT)
      {
        return this;
      }
      var x2 = x.abst();
      return new TypeValue(this.type | x2.type, this.as.join(x2.as));
    }

TypeValue.prototype.update = TypeValue.prototype.join;

TypeValue.prototype.meet =
    function (x)
    {
      if (x === BOT)
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
      if (type & STR)
      {
        result.push("Str");
      }
      if (type & NUMSTR)
      {
        result.push("NumStr");
      }
      if (type & NUM)
      {
        result.push("Num");
      }
      if (type & BOOL)
      {
        result.push("Bool");
      }
      if (type & UND)
      {
        result.push("Undefined");
      }
      if (type & NULL)
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
      var type = this.type & STRINGMASK;
      if (type)
      {
        return new TypeValue(type, EMPTY_SET);
      }
      return BOT;
    }

TypeValue.prototype.projectNumber =
    function ()
    {
      var type = this.type & NUM;
      if (type)
      {
        return new TypeValue(type, EMPTY_SET);
      }
      return BOT;
    }

TypeValue.prototype.projectBoolean =
    function ()
    {
      var type = this.type & BOOL;
      if (type)
      {
        return new TypeValue(type, EMPTY_SET);
      }
      return BOT;
    }

TypeValue.prototype.projectUndefined =
    function ()
    {
      var type = this.type & UND;
      if (type)
      {
        return new TypeValue(type, EMPTY_SET);
      }
      return BOT;
    }

TypeValue.prototype.projectNull =
    function ()
    {
      var type = this.type & NULL;
      if (type)
      {
        return new TypeValue(type, EMPTY_SET);
      }
      return BOT;
    }

TypeValue.prototype.charAt =
    function (x)
    {
      // return new TypeValue(STR | NUMSTR, EMPTY_SET);
      return new TypeValue(STR, EMPTY_SET);
    }

TypeValue.prototype.charCodeAt =
    function (x)
    {
      return _NUM;
    }

TypeValue.prototype.stringLength =
    function (x)
    {
      return _NUM;
    }

TypeValue.prototype.startsWith =
    function (x)
    {
      return _BOOL;
    }

TypeValue.prototype.substring =
    function (x, y)
    {
      return _STR;
    }
  

TypeValue.prototype.parseInt =
    function ()
    {
      return _NUM;
    }
