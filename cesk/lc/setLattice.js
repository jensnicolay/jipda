function SetLattice(primLattice)
{
  assertDefinedNotNull(primLattice);
  this.primLattice = primLattice;
}
SetLattice.prototype = new Lattice();

SetLattice.prototype.toString =
  function ()
  {
    return "<SetLattice " + this.primLattice + ">";
  }

SetLattice.prototype.abst =
  function (cvalues)
  {
    return cvalues.map(SetLattice.prototype.abst1, this).reduce(Lattice.join);
  }

SetLattice.prototype.abst1 =
  function (cvalue)
  {
    if (cvalue instanceof Addr)
    {
      return new SetValue(BOT, [cvalue]);
    }
    return new SetValue(this.primLattice.abst1(cvalue), []);
  }

SetLattice.prototype.product =
  function (prim, as)
  {
    return new SetValue(prim, as);
  }

function SetValue(prim, as)
{
  this.prim = prim;
  this.as = as;
}
SetValue.prototype = new LatticeValue();
SetValue.prototype.equals =
  function (x)
  {
    if (x === BOT)
    {
      // !! SetValue(BOT, []) is NOT valid value, should be encoded as BOT
      return false;
    }
    return this.prim.equals(x.prim)
      && this.as.setEquals(x.as);
  }
SetValue.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + this.prim.hashCode();
    result = prime * result + this.as.hashCode();
    return result;
  }

SetValue.prototype.accept =
  function (visitor)
  {
    return visitor.visitSetValue(this);
  }

SetValue.prototype.addresses =
  function ()
  {
    return this.as.slice(0);
  }

SetValue.prototype.toString =
  function ()
  {
    return "[" + this.prim + ", " + this.as + "]";
  }

SetValue.prototype.join =
  function (x)
  {
    if (x === BOT)
    {
      return this;
    }
    return new SetValue(this.prim.join(x.prim), this.as.concat(x.as).toSet());
  }

SetValue.prototype.meet =
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
    return new SetValue(prim, as);
  }

SetValue.prototype.compareTo =
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
