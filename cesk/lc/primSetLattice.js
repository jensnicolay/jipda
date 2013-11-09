function PrimSetLattice(primLattice)
{
  assertDefinedNotNull(primLattice);
  this.primLattice = primLattice;
}
PrimSetLattice.prototype = new Lattice();

PrimSetLattice.prototype.toString =
  function ()
  {
    return "<PrimSetLattice " + this.primLattice + ">";
  }

PrimSetLattice.prototype.abst =
  function (cvalues)
  {
    return cvalues.map(PrimSetLattice.prototype.abst1, this).reduce(Lattice.join);
  }

PrimSetLattice.prototype.abst1 =
  function (cvalue)
  {
    if (cvalue instanceof Addr)
    {
      return new PrimSetValue(BOT, [cvalue]);
    }
    return new PrimSetValue(this.primLattice.abst1(cvalue), []);
  }

PrimSetLattice.prototype.product =
  function (prim, as)
  {
    return new PrimSetValue(prim, as);
  }

function PrimSetValue(prim, as)
{
  this.prim = prim;
  this.as = as;
}
PrimSetValue.prototype = new LatticeValue();
PrimSetValue.prototype.equals =
  function (x)
  {
    if (x === BOT)
    {
      // !! PrimSetValue(BOT, []) is NOT valid value, should be encoded as BOT
      return false;
    }
    return this.prim.equals(x.prim)
      && this.as.setEquals(x.as);
  }
PrimSetValue.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + this.prim.hashCode();
    result = prime * result + this.as.hashCode();
    return result;
  }

PrimSetValue.prototype.accept =
  function (visitor)
  {
    return visitor.visitPrimSetValue(this);
  }

PrimSetValue.prototype.addresses =
  function ()
  {
    return this.as.slice(0);
  }

PrimSetValue.prototype.toString =
  function ()
  {
    return "[" + this.prim + ", " + this.as + "]";
  }

PrimSetValue.prototype.join =
  function (x)
  {
    if (x === BOT)
    {
      return this;
    }
    return new PrimSetValue(this.prim.join(x.prim), this.as.concat(x.as).toSet());
  }

PrimSetValue.prototype.meet =
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
    return new PrimSetValue(prim, as);
  }

PrimSetValue.prototype.compareTo =
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
