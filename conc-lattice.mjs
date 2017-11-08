import {HashCode, ArraySet} from './common';
import {BOT} from './lattice';

export default {
  toString:
    function ()
    {
      return "ConcLattice";
    },

  abst:
    function (cvalues)
    {
      if (cvalues.length !== 1)
      {
        throw new Error();
      }
      return this.abst1(cvalues[0]);
    },

  abst1:
    function (value)
    {
      return new ConcValue(value);
    },

  abstRef:
    function (addr)
    {
      return new ConcAddr(addr);
    },

  add:
    function (x, y)
    {
      return new ConcValue(x.value + y.value);
    },

  lt:
    function (x, y)
    {
      return new ConcValue(x.value < y.value);
    },

  lte:
    function (x, y)
    {
      return new ConcValue(x.value <= y.value);
    },

  gt:
    function (x, y)
    {
      return new ConcValue(x.value > y.value);
    },

  gte:
    function (x, y)
    {
      return new ConcValue(x.value >= y.value);
    },

  sub:
    function (x, y)
    {
      return new ConcValue(x.value - y.value);
    },

  mul:
    function (x, y)
    {
      return new ConcValue(x.value * y.value);
    },

  div:
    function (x, y)
    {
      return new ConcValue(x.value / y.value);
    },

  eqq:
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
      return new ConcValue(x.value === y.value);
    },

  eq:
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
    },

  neq:
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
    },

  neqq:
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
    },

  binor:
    function (x, y)
    {
      return new ConcValue(x.value | y.value);
    },

  binxor:
    function (x, y)
    {
      return new ConcValue(x.value ^ y.value);
    },

  binand:
    function (x, y)
    {
      return new ConcValue(x.value & y.value);
    },

  shl:
    function (x, y)
    {
      return new ConcValue(x.value << y.value);
    },

  shr:
    function (x, y)
    {
      return new ConcValue(x.value >> y.value);
    },

  shrr:
    function (x, y)
    {
      return new ConcValue(x.value >>> y.value);
    },

  rem:
    function (x, y)
    {
      return new ConcValue(x.value % y.value);
    },

  binnot:
    function (x)
    {
      return new ConcValue(~x.value);
    },

  pos:
    function (x)
    {
      return new ConcValue(+x.value);
    },

  neg:
    function (x)
    {
      return new ConcValue(-x.value);
    },

  sqrt:
    function (x)
    {
      return new ConcValue(Math.sqrt(x.value));
    },

  abs:
    function (x)
    {
      return new ConcValue(Math.abs(x.value));
    },

  round:
    function (x)
    {
      return new ConcValue(Math.round(x.value));
    },

  floor:
    function (x)
    {
      return new ConcValue(Math.floor(x.value));
    },

  sin:
    function (x)
    {
      return new ConcValue(Math.sin(x.value));
    },

  cos:
    function (x)
    {
      return new ConcValue(Math.cos(x.value));
    },

  not:
    function (x)
    {
      return new ConcValue(!x.value);
    }
}


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

ConcValue.prototype.conc1 =
    function ()
    {
      return this.value;
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

ConcValue.prototype.projectUndefined =
    function ()
    {
      return (this.value === undefined) ? this : BOT;
    }

ConcValue.prototype.projectNull =
    function ()
    {
      return (this.value === null) ? this : BOT;
    }

ConcValue.prototype.projectString =
    function ()
    {
      return (typeof this.value === "string") ? this : BOT;
    }

ConcValue.prototype.projectNumber =
    function ()
    {
      return (typeof this.value === "number") ? this : BOT;
    }

ConcValue.prototype.projectBoolean =
    function ()
    {
      return (typeof this.value === "boolean") ? this : BOT;
    }

ConcValue.prototype.projectObject =
    function ()
    {
      return BOT;
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

ConcValue.prototype.isNull =
    function ()
    {
      return this.value === null;
    }

ConcValue.prototype.isNonNull =
    function ()
    {
      return this.value !== null;
    }

ConcValue.prototype.isUndefined =
    function ()
    {
      return this.value === undefined;
    }

ConcValue.prototype.isNonUndefined =
    function ()
    {
      return this.value !== undefined;
    }

ConcValue.prototype.hasSameNumberValue =
    function (x)
    {
      return new ConcValue(this.projectNumber() !== BOT
          && x instanceof ConcValue
          && this.value === x.value);
    }

ConcValue.prototype.hasSameStringValue =
    function (x)
    {
      return new Concvalue(this.projectString() !== BOT
          && x instanceof ConcValue
          && this.value === x.value)
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
      if (x === BOT)
      {
        return this;
      }
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
      return new ConcValue(false);
    }

ConcAddr.prototype.hasSameStringValue =
    function (x)
    {
      return new ConcValue(false);
    }