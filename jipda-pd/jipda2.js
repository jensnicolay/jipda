function HaltKont(marks)
{
  this.marks = marks || [];
}
HaltKont.prototype.toString =
  function ()
  {
    return "halt";
  }
HaltKont.prototype.mark =
  function (mark)
  {
    return new HaltKont(this.marks.addUniqueLast(mark));
  }
HaltKont.prototype.apply =
  function (value, store, kont, c)
  {
    return c.e.haltKont(value, store, kont, c);
  }
HaltKont.prototype.hashCode =
  function ()
  {
    return 0;
  }
HaltKont.prototype.equals =
  function (x)
  {
    return this === x;
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
    return new EvalState(node, config.benva || c.globala, config.store || c.store, []);
  }

Jipda.run =
  function (state, c)
  {
    var halt = new HaltKont();
    state.kont = state.kont.addFirst(halt);
    var transitions = HashSet.empty(131);
    transitions = transitions.add(new Transition(new EvalState(state.node, state.benva, state.store, []), new Push(halt), state.toControlState()));
    var states = [state];
    var counter = 0;
    while (states.length > 0)
    {
      var from = states[0];
      if (counter > 32768)
      {
        throw new Error("state space overflow");
      }
      var candidates = from.next(c);
      var fromKont = from.kont;
      var fl = fromKont.length;
      var next = candidates.filter(
        function (to)
        {
          var toKont = to.kont;
          var tl = toKont.length;
          var stackAct;
          if (tl - 1 === fl)
          {
            var frame = toKont[0];
            stackAct = new Push(frame);
          }
          else if (tl === fl)
          {
            stackAct = new Unch();
          }
          else if (tl + 1 === fl)
          {
            var frame = fromKont[0];
            stackAct = new Pop(frame);
          }
          else
          {
            throw new Error("illegal stack change " + from + "->" + to + "\n" + fromKont + "->" + toKont);
          }
          var fromControlState = from.toControlState();
          var toControlState = to.toControlState();
          transition = new Transition(fromControlState, stackAct, toControlState);
  //        var existing = transitions.get(transition);
          if (transitions.contains(transition))
          {
            print("rejecting", transition);
            return false;            
          }
          transitions = transitions.add(transition);
          return true;
        });
      states = states.slice(1).concat(next);
    }
    return {initial: state, transitions:transitions.values(), counter:counter};
  }

function repl(config)
{
  config = config || {};
  var name = config.name || "jipda";
  var c = Jipda.context(config);
  var src = "'I am Jipda!'";
  var store = c.store;
  c.e.haltKont = // TODO not a good idea: overwrites jseval
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

function Transition(source, label, target)
{
  this.source = source;
  this.label = label;
  this.target = target;
}
Transition.prototype.equals =
  function (x)
  {
//    if (this.toString() === x.toString())
//    {
//      print(this);
//      print(x);
//      print();
//    }
    return Eq.equals(this.source, x.source)
      && Eq.equals(this.label, x.label)
      && Eq.equals(this.target, x.target);
  }
Transition.prototype.toString =
  function ()
  {
    return this.source + "==(" + this.label + ")==>" + this.target;
  }
Transition.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + this.source.hashCode();
    result = prime * result + this.label.hashCode();
    result = prime * result + this.target.hashCode();
    return result;    
  }
function Push(frame)
{
  this.isPush = true;
  this.frame = frame;
}
Push.prototype.equals =
  function (x)
  {
    return x.isPush && Eq.equals(this.frame, x.frame);
  }
Push.prototype.hashCode =
  function ()
  {
    var prime = 11;
    var result = 1;
    result = prime * result + this.frame.hashCode();
    return result;    
  }
Push.prototype.toString =
  function ()
  {
    return "+" + this.frame;
  }
function Pop(frame)
{
  this.isPop = true;
  this.frame = frame;
}
Pop.prototype.equals =
  function (x)
  {
    return x.isPop && Eq.equals(this.frame, x.frame);
  }
Pop.prototype.hashCode =
  function ()
  {
    var prime = 13;
    var result = 1;
    result = prime * result + this.frame.hashCode();
    return result;    
  }
Pop.prototype.toString =
  function ()
  {
    return "-" + this.frame;
  }
function Unch()
{
  this.isUnch = true;
}
Unch.prototype.equals =
  function (x)
  {
    return x.isUnch;
  }
Unch.prototype.hashCode =
  function ()
  {
    var prime = 17;
    var result = 1;
    result = prime * result;
    return result;    
  }
Unch.prototype.toString =
  function ()
  {
    return "e";//"\u03B5";
  }

function addressReachable(address, store, reachable)
{
  if (Arrays.indexOf(address, reachable, Eq.equals) > -1)
  {
    return reachable;
  }
  var value = store.lookupAval(address);
  return valueReachable(value, store, address);
}

function addressesReachable(addresses, store, reachable)
{
  return addresses.reduce(function (reachable, address) {return addressReachable(address, store, reachable)}, reachable);
}

function valueReachable(value, store, reachable)
{
  var addresses = value.addresses();
  return addressesReachable(addresses, store, reachable);  
}

function valuesReachable(values, store, reachable)
{
  return values.reduce(function (reachable, value) {return valueReachable(value, store, reachable)}, reachable);
}

