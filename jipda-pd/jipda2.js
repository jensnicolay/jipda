function EvalState(node, benva, store, kont)
{
  this.node = node;
  this.benva = benva;
  this.store = store;
  this.kont = kont;
}
EvalState.prototype.toControlState =
  function ()
  {
    return new EvalState(this.node, this.benva, this.store, null);
  }
EvalState.prototype.toString =
  function ()
  {
    return "#eval " + this.node.tag;
  }
EvalState.prototype.equals =
  function (x)
  {
    return this.node === x.node && Eq.equals(this.benva, x.benva) && Eq.equals(this.store, x.store) && Eq.equals(this.kont, x.kont);
  }
EvalState.prototype.subsumes =
  function (x)
  {
    return this.node === x.node && this.benva.subsumes(x.benva) && this.store.subsumes(x.store) && this.kont.subsumes(x.kont);
  }
EvalState.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + node.hashCode();
    result = prime * result + benva.hashCode();
    result = prime * result + store.hashCode();
    result = prime * result + kont.hashCode();
    return result;
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
    return "halt";
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

function StoreValue(aval, fresh)
{
  assertDefinedNotNull(aval);
  assertDefinedNotNull(aval.join);
  assertDefinedNotNull(aval.equals); 
  assertDefinedNotNull(aval.compareTo); 
  this.aval = aval;
  this.fresh = (fresh === undefined) ? 1 : fresh;
}

StoreValue.aval =
  function (storeValue)
  {
    return storeValue.aval;
  }

StoreValue.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    return this.aval.equals(x.aval);
  }

StoreValue.prototype.compareTo =
  function (x)
  {
    // TODO does freshness plays a role in subsumption? Current answer: no.
    return this.aval.compareTo(x.aval);
  }

StoreValue.prototype.toString =
  function ()
  {
    return this.aval.toString();
  }

StoreValue.prototype.update =
  function (aval)
  {
    if (this.fresh === 1)
    {
      return this.strongUpdate(aval);
    }
    return this.weakUpdate(aval);
  }
  
StoreValue.prototype.strongUpdate =
  function (aval)
  {
    return new StoreValue(aval, 1);
  }

StoreValue.prototype.weakUpdate =
  function (aval)
  {
    return new StoreValue(this.aval.join(aval), 2);
  }

StoreValue.prototype.join =
  function (x)
  {
    if (x === BOT)
    {
      return this;
    }
    return new StoreValue(this.aval.join(x.aval), Math.max(this.fresh, x.fresh));
  }
  
StoreValue.prototype.reset =
  function ()
  {
    return new StoreValue(BOT, 0);      
  }
  
function Store(map)
{
  this.map = map || new HashMap();
}

Store.prototype.equals =
  function (x)
  {
    return this.compareTo(x) === 0;
  }

Store.prototype.compareTo =
  function (x)
  {
    return Lattice.subsumeComparison(this, x);
  }
  
Store.prototype.subsumes =
  function (x)
  {
    var xentries = x.map.entries();
    for (var i = 0; i < xentries.length; i++)
    {
      var xentry = xentries[i];
      var address = xentry.key;
      var thisStoreValue = this.map.get(address);
      if (!thisStoreValue)
      {
        return false;
      }
      var xStoreValue = xentry.value;
      var c = xStoreValue.compareTo(thisStoreValue);
      if (c === undefined || c > 0)
      {
        return false;
      }
    }
    return true;
  }

Store.prototype.diff = // debug
  function (x)
  {
    var diff = [];
    var entries = this.map.entries();
    for (var i = 0; i < entries.length; i++)
    {
      var entry = entries[i];
      var address = entry.key;
      var value = entry.value;
      var xvalue = x.map.get(address);
      if (xvalue)
      {
        if (!value.equals(xvalue))
        {
//          else
//          {
            diff.push(address + ":\n\t" + value + " (" + value.fresh + ")\n\t" + xvalue + " (" + xvalue.fresh + ")");            
//          }
          if (value.aval.isBenv && xvalue.aval.isBenv)
          {
            diff.push(value.aval.diff(xvalue.aval))
          }
        }
      }
      else
      {
        diff.push(address + ":\n\t" + value + " (" + value.fresh + ")\n\t<undefined>");
      }
    }
    var xentries = x.map.entries();
    for (i = 0; i < xentries.length; i++)
    {
      xentry = xentries[i];
      address = xentry.key;
      xvalue = xentry.value;
      var value = this.map.get(address);
      if (!value)
      {
        diff.push(address + ":\n\t<undefined>\n\t" + xvalue + " (" + xvalue.fresh + ")");
      }
    }
    return diff.join("\n");
  }

Store.prototype.toString =
  function ()
  {
    var entries = this.map.entries();
    return "{" + entries.map(
      function (entry)
      {
        return entry.key + " =" + entry.value.fresh + "=> " + entry.value;
      }).join(",") + "}";
  }

Store.prototype.nice =
  function ()
  {
  var entries = this.map.entries();
    return "\n{\n" + entries.map(
      function (entry)
      {
        return entry.key + " =" + entry.value.fresh + "=> " + entry.value;
      }).join("\n") + "\n}";
  }

Store.prototype.lookupAval =
  function (address)
  {
    var value = this.map.get(address);
    if (value)
    {
      return value.aval;
    }
    throw new Error("Store.lookupAval: no abstract value for address " + address + "\n" + this.nice());
  };
  
Store.prototype.allocAval =
  function (address, aval, undef)
  {
    assertDefinedNotNull(address);
    assertTrue(aval === BOT /*|| aval instanceof JipdaValue */|| aval.isBenv, "need JipdaValue or Benv");
    var value = this.map.get(address);
    if (value && value.fresh !== 0)
    {
      var weaklyUpdatedValue = value.weakUpdate(aval);
//      print("REALLOCATED", address, weaklyUpdatedValue, msg ? msg : "", "-- was", entry);
      var store = new Store(this.map.put(address, weaklyUpdatedValue)); 
      store.weak = true; // hackety hack?
      return store;
    }
    var newValue = new StoreValue(aval);
//    print("ALLOCATED", address, newValue, msg ? msg : "", "-- was", entry);
    return new Store(this.map.put(address, newValue));
  };
  
Store.prototype.updateAval =
  function (address, aval, msg)
  {
    assertTrue((aval instanceof JipdaValue) || aval.isBenv, "need JipdaValue or Benv");
    var value = this.map.get(address);
    if (value)
    {
      var updatedValue = value.update(aval);
//      print("UPDATED", address, updatedValue, msg ? msg : "", "-- was", entry);
      return new Store(this.map.put(address, updatedValue));
    }
    throw new Error("Store.updateAval: no abstract value at address " + address);
  };
  
Store.prototype.join =
  function (store)
  {
    if (store === BOT)
    {
      return this;
    }
    var result = new HashMap();
    var addresses = this.map.keys().concat(store.map.keys()).toSet();
    addresses.forEach(
      function (address)
      {
        var thisValue = this.map.get(address) || BOT;
        var otherValue = store.map.get(address) || BOT;
        var joinedValue = thisValue.join(otherValue);
        result = result.put(address, joinedValue);
      }, this);
    return new Store(result);
  }

Store.prototype.narrow =
  function (addresses)
  {
    var result = new HashMap();
    var entries = this.map.entries();
    for (var i = 0; i < entries.length; i++)
    {
      var entry = entries[i];
      var address = entry.key;
      if (addresses.memberAt(address) > -1)
      {
        result = result.put(address, entry.value);
      }
//      if (address instanceof Addr)
//      {
//        var reset = entry[1].reset();
//        print("reset address", address, "before", entry[1], "after", reset);
//        return [[address, reset]];
//      }
    }
    return new Store(result);
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
    var transitions = [];
    var counter = 0;
    while (states.length > 0)
    {
      print(counter++, transitions.length);
      var from = states[0];
      var next = from.next(c);
      var fromKont = from.kont;
      var fl = fromKont.length;
      next.forEach(function (to)
      {
        var toKont = to.kont;
        var tl = toKont.length;
        var l = transitions.length;
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
        transitions = transitions.addUniqueLast(transition);
//        if (transitions.length === l)
//        {
//          print("done?");
//        }
      });
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

function Transition(from, label, to)
{
  this.from = from;
  this.label = label;
  this.to = to;
}
Transition.prototype.equals =
  function (x)
  {
    return Eq.equals(this.from, x.from) && Eq.equals(this.label, x.label) && Eq.equals(this.to, x.to);
  }
Transition.prototype.toString =
  function ()
  {
    return this.from + "==(" + this.label + ")==>" + this.to;
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
function Unch()
{
  this.isUnch = true;
}
Unch.prototype.equals =
  function (x)
  {
    return x.isUnch;
  }