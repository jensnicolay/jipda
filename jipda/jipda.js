function InitState(node, benva, store)
{
  this.type = "init";
  this.node = node;
  this.benva = benva;
  this.store = store;
}
InitState.prototype.toString =
  function ()
  {
    return "(init " + this.node + " " + this.benva + ")";
  }
InitState.prototype.nice =
  function ()
  {
    return "#init " + this.node.tag;
  }
InitState.prototype.equals =
  function (x)
  {
    return this.type === x.type
      && this.node === x.node 
      && Eq.equals(this.benva, x.benva)
      && Eq.equals(this.store, x.store);
  }
InitState.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + this.node.hashCode();
    result = prime * result + this.benva.hashCode();
    return result;
  }
InitState.prototype.next =
  function (kont, c)
  {
    var frame = new HaltKont();
    return kont.push(frame, new EvalState(this.node, this.benva, this.store));
  }
InitState.prototype.addresses =
  function ()
  {
    return [this.benva];
  }
InitState.prototype.setStore =
  function (store)
  {
    return new InitState(this.node, this.benva, store);
  }

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
HaltKont.prototype.addresses =
  function ()
  {
    return [];
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

function Edge(source, g, target)
{
  assertDefinedNotNull(source);
  assertDefinedNotNull(g);
  assertDefinedNotNull(target);
  this.source = source;
  this.g = g;
  this.target = target;
}
Edge.isPop =
  function (edge)
  {
    return edge.g.isPop;
  }
Edge.isPush =
  function (edget)
  {
    return edge.g.isPush;
  }
Edge.isUnch =
  function (edge)
  {
    return edge.g.isUnch;
  }
Edge.prototype.equals =
  function (x)
  {
    return x instanceof Edge
      && Eq.equals(this.source, x.source)
      && Eq.equals(this.g, x.g)
      && Eq.equals(this.target, x.target);
  }
Edge.prototype.toString =
  function ()
  {
    return "{" + this.source.nice() + "," + this.g + "," + this.target.nice() + "}";
  }
Edge.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + this.source.hashCode();
    result = prime * result + this.g.hashCode();
    result = prime * result + this.target.hashCode();
    return result;    
  }

function EpsEdge(source, target)
{
  assertDefinedNotNull(source);
  assertDefinedNotNull(target);
  this.source = source;
  this.target = target;
}
EpsEdge.prototype.equals =
  function (x)
  {
    return x instanceof EpsEdge 
      && Eq.equals(this.source, x.source)
      && Eq.equals(this.target, x.target);
  }
EpsEdge.prototype.toString =
  function ()
  {
    return "{" + this.source.nice() + "," + this.target.nice() + "}";
  }
EpsEdge.prototype.hashCode =
  function ()
  {
    var prime = 9;
    var result = 1;
    result = prime * result + this.source.hashCode();
    result = prime * result + this.target.hashCode();
    return result;    
  }

function Etg(edges)
{
  this.edges = edges;
}

Etg.empty =
  function ()
  {
    return new Etg([]);
  }

Etg.prototype.addEdge =
  function (edge)
  {
    var edges = this.edges.addUniqueLast(edge);
    return new Etg(edges);    
  }

Etg.prototype.containsEdge =
  function (edge)
  {
    return Arrays.contains(edge, this.edges, Eq.equals);
  }

Etg.prototype.containsTarget =
  function (target)
  {
    for (var i = 0; i < this.edges.length; i++)
    {
      if (this.edges[i].target.equals(target))
      {
        return true;
      }
    }
    return false;
  }

Etg.prototype.outgoing =
  function (source)
  {
    return this.edges.filter(function (edge) {return edge.source.equals(source)});
  }

Etg.prototype.incoming =
  function (target)
  {
    return this.edges.filter(function (edge) {return edge.target.equals(target)});
  }

function Ecg(edges)
{
  this.edges = edges;
}

Ecg.empty =
  function ()
  {
    return new Ecg([]);
  }

Ecg.prototype.addEdge =
  function (edge)
  {
    var edges = this.edges.addUniqueLast(edge);
    return new Ecg(edges);
  }

Ecg.prototype.containsEdge =
  function (edge)
  {
    return Arrays.contains(edge, this.edges, Eq.equals);
  }

Ecg.prototype.successors =
  function (source)
  {
    var targets = this.edges.flatMap(function (edge) {return edge.source.equals(source) ? [edge.target] : []});
    return Arrays.deleteDuplicates(targets, Eq.equals);
  }

Ecg.prototype.predecessors =
  function (target)
  {
    var sources = this.edges.flatMap(function (edge) {return edge.target.equals(target) ? [edge.source] : []});
    return Arrays.deleteDuplicates(sources, Eq.equals);
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

var Agc = {};

Agc.collect =
  function (store, rootSet)
  {
    var reachable = Agc.addressesReachable(rootSet, store, []);
    var store2 = store.narrow(reachable);
//    print("narrowed", store.map.size(), store2.map.size());
    return store2;
  }

Agc.addressesReachable =
  function (addresses, store, reachable)
  {
    for (var i = 0; i < addresses.length; i++)
    {
      reachable = Agc.addressReachable(addresses[i], store, reachable);
    }
    return reachable;
  }

Agc.addressReachable = 
  function (address, store, reachable)
  {
    if (!(address instanceof Addr))
    {
      throw new Error(address);
    }
    if (Arrays.contains(address, reachable, Eq.equals))
    {
      return reachable;
    }
    var aval = store.lookupAval(address);
    var addresses = aval.addresses();
    return Agc.addressesReachable(addresses, store, reachable.addLast(address));
  }

function PushUnchKont(source)
{
  this.source = source;
}

PushUnchKont.prototype.push =
  function (frame, target)
  {
    return [new Edge(this.source, new Push(frame), target)];
  }

PushUnchKont.prototype.pop =
  function (frameCont)
  {
    return [];
  }

PushUnchKont.prototype.unch =
  function (target)
  {
    return [new Edge(this.source, new Unch(), target)];
  }

function PopKont(source, frame)
{
  this.source = source;
  this.frame = frame;
}

PopKont.prototype.push =
  function (frame, target)
  {
    return [];
  }

PopKont.prototype.pop =
  function (frameCont)
  {
    var frame = this.frame;
    var target = frameCont(frame);
    assertDefinedNotNull(target);
    return [new Edge(this.source, new Pop(frame), target)];
  }

PopKont.prototype.unch =
  function (target)
  {
    return [];
  }

var ceskDriver = {};

ceskDriver.pushUnch =
  function (q, stack, c)
  {
    var kont = new PushUnchKont(q);
    var edges = q.next(kont, c);
    
    var sa = stack.flatMap(function (frame) {return frame.addresses()}).toSet();
    edges.forEach(function (edge) {
      if (edge.g.isPush)
      {
        var frame = edge.g.frame;
      }
    });
    
    
    
    return edges;
  }

ceskDriver.pop =
  function (q, frame, stack, c)
  {
    var kont = new PopKont(q, frame);
    return q.next(kont, c);
  }

function GcDriver(driver)
{
  this.driver = driver;
}

GcDriver.gc =
  function (q, stack)
  {
    var stackAddresses = stack.flatMap(function (frame) {return frame.addresses()}).toSet();
    print("gc", q.nice(), stack.toSet(), "\n  " + stackAddresses);
    var store = q.store;
    var rootSet = q.addresses().concat(stackAddresses);
//    print(">>>>>>>>>>", stackAddresses);
    var store2 = Agc.collect(store, rootSet);
//    print("<<<<<<<<<<")
    var gcq = q.setStore(store2); 
    return gcq;
  }

GcDriver.prototype.pushUnch =
  function (q, stack, c)
  {
    var sa = stack.flatMap(function (frame) {return frame.addresses()}).toSet();
    var gcq = GcDriver.gc(q, stack);
    var edges = this.driver.pushUnch(gcq, stack, c); 
    return edges.map(function (edge) {return new Edge(q, edge.g, edge.target)});
  }
    
GcDriver.prototype.pop =
  function (q, frame, stack, c)
  {
    var gcq = GcDriver.gc(q, stack);
    var edges = this.driver.pop(gcq, frame, stack, c);
    return edges.map(function (edge) {return new Edge(q, edge.g, edge.target)});
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
//    c.k = cc.k || ceskDriver;
    c.k = cc.k || new GcDriver(ceskDriver);
    var c = c.e.initialize(c);
    return c;
  }

Jipda.inject =
  function (node, c, config)
  {
    config = config || {};
    return new InitState(node, config.benva || c.globala, config.store || c.store);
  }

Jipda.run =
  function (state, c)
  {
    var dsg = Jipda.dsg(state, c);
    return {initial: state, dsg:dsg};
  }

Jipda.dsg =
  function(q, c)
  {
    var etg = Etg.empty();
    var ecg = Ecg.empty().addEdge(new EpsEdge(q, q));
    var dEdH = Jipda.sprout(etg, ecg, q, c);
    return Jipda.summarize(etg, ecg, [], dEdH[0], dEdH[1], c);
  }

Jipda.summarize =
  function (etg, ecg, dS, dE, dH, c)
  {
    var ss = MultiMap.empty();
    try {
    while (true)
    {
      // epsilon edges
      if (dH.length > 0)
      {
        var h = dH[0];
        dH = dH.slice(1);
        if (!ecg.containsEdge(h))
        {
          print("dH", h, ecg.edges.length);
          ecg = ecg.addEdge(h);
          var q = h.source;
          var q1 = h.target;
//          ss = ss.putAll(q1, ss.get(q));
          ecg = ecg.addEdge(new EpsEdge(q, q)).addEdge(new EpsEdge(q1, q1));
          var dEdH = Jipda.addEmpty(etg, ecg, q, q1, c);
          dE = dE.concat(dEdH[0]);
          dH = dH.concat(dEdH[1]);
        }
      }
      // push, pop, unch edges
      else if (dE.length > 0)
      {
        var e = dE[0];
        dE = dE.slice(1);
        if (!etg.containsEdge(e))
        {
          print("dE", e, etg.edges.length);
          var q = e.source;
          var g = e.g;
          var q1 = e.target;
          if (!etg.containsTarget(q1))
          {
            dS = dS.addLast(q1);
          }            
          etg = etg.addEdge(e);
          ecg = ecg.addEdge(new EpsEdge(q, q)).addEdge(new EpsEdge(q1, q1));
          if (g.isPush)
          {
            var dEdH = Jipda.addPush(etg, ecg, q, g.frame, q1, c);
          }
          else if (g.isPop)
          {
            var dEdH = Jipda.addPop(etg, ecg, q, g.frame, q1, c);
          }
          else
          {
//            var dEdH = Jipda.addEmpty(etg, ecg, q, q1, c);
            var dEdH = [[], new EpsEdge(q, q1)];
          }
          dE = dE.concat(dEdH[0]);
          dH = dEdH[1];
        }
      }
      // control states
      else if (dS.length > 0)
      {
        var q = dS[0];
        dS = dS.slice(1);
        print("dS", q);
        ecg = ecg.addEdge(new EpsEdge(q, q));
        var dEdH = Jipda.sprout(etg, ecg, q, c);
        dE = dEdH[0];
        dH = dEdH[1];
      }
      else
      {
        return {etg:etg, ecg:ecg};
      }
    }
    } catch (e)
    {
      throw e;
      print(e);
      print(e.stack);
      return {etg:etg, ecg:ecg};
    }
  }

Jipda.sprout =
  function (etg, ecg, q, c)
  {
    var framesR = Jipda.retrospectiveStack(q, etg, ecg);
    var dE = c.k.pushUnch(q, framesR, c);
    var dH = dE
              .filter(function (edge) {return edge.g.isUnch})
              .map(function (unchEdge) {return new EpsEdge(unchEdge.source, unchEdge.target)});
    return [dE, dH];
  }

Jipda.addPush =
  function (etg, ecg, s, frame, q, c)
  { 
    var qset1 = ecg.successors(q);
    var dE = qset1.flatMap(
      function (q1)
      {
        var framesR = Jipda.retrospectiveStack(q1, etg, ecg);
        var popEdges = c.k.pop(q1, frame, framesR, c);
        return popEdges;
      });
    var dH = dE.map(function (popEdge) {return new EpsEdge(s, popEdge.target)});
    return [dE, dH];
  }

Jipda.addPop =
  function (etg, ecg, s2, frame, q, c)
  {
    var sset1 = ecg.predecessors(s2);
    var dE = [];
    var push = new Push(frame);
    var dH = sset1.flatMap(
      function (s1)
      {
        var sset = etg.incoming(s1)
                      .filter(function (edge) {return edge.g.equals(push)})
                      .map(function (pushEdge) {return pushEdge.source});
        return sset.map(
          function (s)
          {
            return new EpsEdge(s, q);
          });
      });
    return [dE, dH];
  }

Jipda.addEmpty =
  function (etg, ecg, s2, s3, c)
  {
    
    var sset1 = ecg.predecessors(s2);
    var sset4 = ecg.successors(s3);
    var dH1 = sset1.flatMap(function (s1) {return sset4.map(function (s4) {return new EpsEdge(s1, s4)})});
    var dH2 = sset1.map(
      function (s1) 
      {
        return new EpsEdge(s1, s3)
      });
    var dH3 = sset4.map(
      function (s4)
      {
        return new EpsEdge(s2, s4)
      });
    var pushEdges = sset1.flatMap(
      function (s1)
      {
        return etg.incoming(s1).filter(function (edge) {return edge.g.isPush});
      });
    var dE = sset4.flatMap(
      function (s4)
      {
        return pushEdges.flatMap(
          function (pushEdge)
          {
            var frame = pushEdge.g.frame;
            var framesR = Jipda.retrospectiveStack(s4, etg, ecg);
            var popEdges = c.k.pop(s4, frame, framesR, c);
            return popEdges;
          })
      });
    var dH4 = pushEdges.flatMap(
      function (pushEdge)
      {
        return dE.map(function (popEdge) {return new EpsEdge(pushEdge.source, popEdge.target)});
      });
    var dH = dH1.concat(dH2).concat(dH3).concat(dH4);
    return [dE, dH];
  }

Jipda.retrospectiveStack =
  function (q, etg, ecg)
  {
//    return [];
    var visited = HashSet.empty();
    var todo = [q];
    var frames = HashSet.empty();
    while (todo.length > 0)
    {
      var q = todo[0];
      todo = todo.slice(1);
      if (visited.contains(q))
      {
        continue;
      }
      visited = visited.add(q);
      var epsPredecessors = ecg.predecessors(q);
      var incomingEdges = etg.incoming(q);
      var incomingPushUnchEdges = incomingEdges.filter(function (edge) {return !edge.g.isPop});
      var incomingPushEdges = incomingPushUnchEdges.filter(function (edge) {return edge.g.isPush});
      var pushPredecessors = incomingPushUnchEdges.map(function (edge) {return edge.source});
      var pushedFrames = incomingPushEdges.map(function (pushEdge) {return pushEdge.g.frame});
      frames = frames.addAll(pushedFrames);
      todo = todo.concat(epsPredecessors).concat(pushPredecessors);
    }
    return frames.values();
  }

Jipda.prospectiveStack =
  function (q, etg, ecg)
  {
    var visited = HashSet.empty();
    var todo = [q];
    var frames = HashSet.empty();
    while (todo.length > 0)
    {
      var q = todo[0];
      todo = todo.slice(1);
      if (visited.contains(q))
      {
        continue;
      }
      visited = visited.add(q);
      var epsSuccessors = ecg.successors(q);
      var outgoingEdges = etg.outgoing(q);
      var outgoingPopUnchEdges = outgoingEdges.filter(function (edge) {return !edge.g.isPush});
      var outgoingPopEdges = outgoingPopUnchEdges.filter(function (edge) {return edge.g.isPop});
      var popSuccessors = outgoingPopUnchEdges.map(function (edge) {return edge.target});
      var poppedFrames = outgoingPopEdges.map(function (popEdge) {return popEdge.g.frame});
      frames = frames.addAll(poppedFrames);
      todo = todo.concat(epsSuccessors).concat(popSuccessors);
    }
    return frames.values();
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
