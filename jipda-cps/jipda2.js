function EvalState(node, benva, store, kont)
{
  this.node = node;
  this.benva = benva;
  this.store = store;
  this.kont = kont;
}

EvalState.prototype.next =
  function (c)
  {
    return c.e.evalNode(this.node, this.benva, this.store, this.kont, c);
  }

function HaltKont()
{
}
HaltKont.prototype.toString =
  function ()
  {
    return "<halt>";
  }
HaltKont.prototype.apply =
  function (value, store, kont, c)
  {
    return c.e.haltKont(value, store, kont, c);
  }

function JipdaLattice(primLattice)
{
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

JipdaLattice.prototype.join =
  function (prim, as)
  {
    return new JipdaValue(prim, as);
  }

function JipdaValue(prim, as)
{
  assertDefinedNotNull(prim);
  assertDefinedNotNull(as);
  this.prim = prim;
  this.as = as;
}
JipdaValue.prototype = new LatticeValue();

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

var Jipda = {};

Jipda.context =
  function (cc)
  {
    // complete the user config
    var c = {};
    c.a = cc.a || tagAg;
    c.b = cc.b || new DefaultBenv();
    c.e = cc.e || jseval;
    c.p = cc.p || new Lattice1();
    c.l = cc.l || new JipdaLattice(c.p);    
  //  var performGc = config.gc === undefined ? true : config.gc;
  //  var k = config.k === undefined ? 1 : config.k;
  //  var visited = config.visited || new DefaultVisitedStrategy(performGc ? gc : function (store) {return store}); // TODO make this mandatory param
    var c = c.e.initialize(c);
    return c;
  }

Jipda.inject =
  function (node, c, config)
  {
    config = config || {};
    return new EvalState(node, config.benva || c.globala, config.store || c.store, config.kont || [new HaltKont()]);
  }

Jipda.run =
  function (state, c)
  {
    var states = [state];
    while (states.length > 0)
    {
      var state = states[0];
      var next = state.next(c);
      states = states.slice(1).concat(next);
    }
    return {};
  }

function repl(config)
{
  config = config || {};
  var name = config.name || "jipda";
  var c = Jipda.context(config);
  var src = "'I am Jipda!'";
  var store = c.store;
  c.e.haltKont =
    function (hvalue, hstore)
    {
      print(hvalue);
      newStore = newStore.join(hstore);
      return [];
    }
  while (src !== ":q")
  {
    var ast = Ast.createAst(src);
    var state = Jipda.inject(ast, c, {store:store});
    var previousStore = store;
    var newStore = BOT;
    try
    {
      Jipda.run(state, c);
      store = newStore;
    }
    catch (e)
    {
      print(e.stack);
    }
    write(name + "> ");
    src = readline();
  }
  print("Bye!");
}

function concRepl(config)
{
  config = config || {};
  return repl({name: "conc", p:new CpLattice(), a:concreteAg, k:config.k});
}
