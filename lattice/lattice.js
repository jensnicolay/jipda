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
BOT.addresses = function () { return false };
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

function JipdaLattice(primLattice)
{
  assertDefinedNotNull(primLattice);
  this.primLattice = primLattice;
}
JipdaLattice.prototype = new Lattice();

JipdaLattice.prototype.toString =
  function ()
  {
    return "<JipdaLattice " + this.primLattice + ">";
  }

JipdaLattice.prototype.abst =
  function (cvalues)
  {
    return cvalues.map(JipdaLattice.prototype.abst1, this).reduce(Lattice.join);
  }

JipdaLattice.prototype.abst1 =
  function (cvalue)
  {
    if (cvalue instanceof Addr)
    {
      return new JipdaValue(BOT, [cvalue]);
    }
    return new JipdaValue(this.primLattice.abst1(cvalue), []);
  }

JipdaLattice.prototype.product =
  function (prim, as)
  {
    return new JipdaValue(prim, as);
  }

function JipdaValue(prim, as)
{
  this.prim = prim;
  this.as = as;
}
JipdaValue.prototype = new LatticeValue();
JipdaValue.prototype.equals =
  function (x)
  {
    if (x === BOT)
    {
      // !! JipdaValue(BOT, []) is NOT valid value, should be encoded as BOT
      return false;
    }
    return this.prim.equals(x.prim)
      && this.as.setEquals(x.as);
  }
JipdaValue.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + this.prim.hashCode();
    result = prime * result + this.as.hashCode();
    return result;
  }

JipdaValue.prototype.accept =
  function (visitor)
  {
    return visitor.visitJipdaValue(this);
  }

JipdaValue.prototype.addresses =
  function ()
  {
    return this.as.slice(0);
  }

JipdaValue.prototype.toString =
  function ()
  {
    return "[" + this.prim + ", " + this.as + "]";
  }

JipdaValue.prototype.join =
  function (x)
  {
    if (x === BOT)
    {
      return this;
    }
    return new JipdaValue(this.prim.join(x.prim), this.as.concat(x.as).toSet());
  }

JipdaValue.prototype.meet =
  function (x)
  {
    if (x === BOT)
    {
      return BOT;
    }
    var prim = this.prim.meet(x.prim);
    var as = this.as.removeAll(x.as);
    if (prim === BOT && as.length === 0)
    {
      return BOT;
    }
    return new JipdaValue(prim, as);
  }

JipdaValue.prototype.compareTo =
  function (x)
  {
    if (x === BOT)
    {
      return 1;
    }
    
    if (x === this)
    {
      return 0;
    }

    var c1 = this.prim.compareTo(x.prim);
    if (c1 === undefined)
    {
      return undefined;
    }
    var c2 = Lattice.subsumeComparison(this.as, x.as);
    return Lattice.joinCompareResults(c1, c2);
  }
