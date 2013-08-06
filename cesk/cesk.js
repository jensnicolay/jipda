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
