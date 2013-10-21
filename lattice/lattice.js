function Lattice()
{
  // abst
  // abst1
  // apply
}

//15.4
/** @return false if not an array index, else the UInt32 representation */
Lattice.prototype.isStringArrayIndex =
  function (value)
  {
    var uspn = value.ToUInt32();
    var suspn = uspn.ToString();
    var length;
    if (suspn.equals(value) 
        && this.isTrue(this.lt(uspn, this.abst1(Ecma.POW_2_32))))
    {
      return uspn;
    }
    return false;
  }

Lattice.join = // TODO move this to LatticeValue
  function (x, y)
  {
    if (x === BOT)
    {
      return y;
    }
    return x.join(y);
  }

Lattice.joinCompareResults = // TODO move this to LatticeValue?
  function (x, y)
  {
    if (x === y)
    {
      return x;
    }
    if (x === 0)
    {
      return y;
    }
    if (y === 0)
    {
      return x;
    }
    return undefined;
  }

// performs comparison based on subsumption only
Lattice.subsumeComparison =
  function (x1, x2)
  {
    var s1 = x1.subsumes(x2);
    var s2 = x2.subsumes(x1);
    return s1 ? (s2 ? 0 : 1) : (s2 ? -1 : undefined);
  }

function LatticeValue()
{
  //// ToBoolean
  //// ToString
  //// ToNumber
  //// ToUint32
  //// join
  //// meet
  //// compareTo
  //// (conc)
}
  
LatticeValue.prototype.addresses =
  function ()
  {
    return [];
  }

LatticeValue.prototype.equals =
  function (x)
  {
    return this.compareTo(x) === 0;
  }

LatticeValue.prototype.subsumes =
  function (x)
  {
    return this.compareTo(x) >= 0;
  }

LatticeValue.ToNumber =
  function (x)
  {
    if (x === undefined)
    {
      return NaN;
    }
    if (x === null)
    {
      return 0;
    }
    if (x === true)
    {
      return 1;
    }
    if (x === false)
    {
      return 0;
    }
    if (typeof x === "number")
    {
      return x;
    }
    if (typeof x === "string")
    {
      x = x.trim();
      if (x === "Infinity" || x === "+Infinity")
      {
        return Infinity;
      }
      if (x === "-Infinity")
      {
        return Infinity;
      }
      if (x.startsWith("0x") || x.startsWith("0X"))
      {
        return parseInt(x, 16);
      }
      if (x.indexOf(".") > -1)
      {
        return parseFloat(x);
      }
      return parseInt(x, 10);
    }
    throw new Error(x);
  }

LatticeValue.ToUInt32 =
  function (x)
  {
    var n = LatticeValue.ToNumber(x);
    if (isNaN(n) || n === 0 || n === Infinity || n === -Infinity)
    {
      return 0;
    }
    var p = Ecma.sign(n) * Math.floor(Math.abs(n));
    var i = p % Ecma.POW_2_32;
    return i;  
  }

LatticeValue.ToString =
  function (x)
  {
    if (x === undefined)
    {
      return "undefined";
    }
    if (x === null)
    {
      return "null";
    }
    if (x === true)
    {
      return "true";
    }
    if (x === false)
    {
      return "false";
    }
    if (typeof x === "number")
    {
      return x.toString();
    }
    if (typeof x === "string")
    {
      return x;
    }
    throw new Error(x);
  }
  
//9.2
LatticeValue.ToBoolean =
  function (x)
  {
    return x ? true : false;
  }

//9.5
LatticeValue.ToInt32 =
  function (x)
  {
    var n = LatticeValue.ToNumber(x);
    if (isNaN(n) || n === 0 || n === Infinity || n === -Infinity)
    {
      return 0;
    }
    var p = Ecma.sign(n) * Math.floor(Math.abs(n));
    var i = p % Ecma.POW_2_32;
    if (i >= Ecma.POW_2_31)
    {
      return i - Ecma.POW_2_32;
    }
    return i;
  }


var BOT = Object.create(new LatticeValue()); // should be 'const', but gives problems with rebuilding 
BOT.join = function (other) { return other };
BOT.meet = function (other) { return BOT };
BOT.compareTo = function (other) { return other === BOT ? 0 : -1 };
BOT.isAddress = function () { return false };
BOT.addresses = function () { return [] };
BOT.conc = function () { return [] };
BOT.toString = function () { return "_" };
BOT.nice = function () { return "_" };
BOT.ToBoolean = function () { return BOT };
BOT.ToString = function () { return BOT };
BOT.ToUInt32 = function () { return BOT };
BOT.ToInt32 = function () { return BOT };
BOT.ToNumber = function () { return BOT };
BOT.accept = function (visitor) { return visitor.visitBOT(this) };
BOT.hashCode = function () { return 0 };

///////////////////////////////////////////////////////


var identityLattice = Object.create(new LatticeValue());
identityLattice.join = function () { return this };
identityLattice.compareTo = function () { return 0 };

///////////////////////////////////////////////////////

