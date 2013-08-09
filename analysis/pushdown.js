function InitState(node, benva, store, cesk, haltFrame)
{
  this.type = "init";
  this.node = node;
  this.benva = benva;
  this.store = store;
  this.cesk = cesk;
  this.haltFrame = haltFrame;
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
  function (kont)
  {
    return kont.push(this.haltFrame, this.cesk.evalState(this.node, this.benva, this.store));
  }
InitState.prototype.addresses =
  function ()
  {
    return [this.benva];
  }
InitState.prototype.setStore =
  function (store)
  {
    return new InitState(this.node, this.benva, store, this.cesk, this.haltFrame);
  }

function HaltKont(applyHalt)
{
  this.applyHalt = applyHalt;
}
HaltKont.prototype.toString =
  function ()
  {
    return "halt";
  }
HaltKont.prototype.apply =
  function (value, store, kont)
  {
    return this.applyHalt(value, store, kont);
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
    return new Etg(HashSet.empty(131));
  }

Etg.prototype.addEdge =
  function (edge)
  {
    var edges = this.edges.add(edge);
    return new Etg(edges);    
  }

Etg.prototype.containsEdge =
  function (edge)
  {
    return this.edges.contains(edge);
  }

Etg.prototype.containsTarget =
  function (target)
  {
    var edges = this.edges.values();
    for (var i = 0; i < edges.length; i++)
    {
      if (edges[i].target.equals(target))
      {
        return true;
      }
    }
    return false;
  }

Etg.prototype.outgoing =
  function (source)
  {
    return this.edges.values().filter(function (edge) {return edge.source.equals(source)});
  }

Etg.prototype.incoming =
  function (target)
  {
    return this.edges.values().filter(function (edge) {return edge.target.equals(target)});
  }

function Ecg(edges)
{
  this.edges = edges;
}

Ecg.empty =
  function ()
  {
    return new Ecg(HashSet.empty(131));
  }

Ecg.prototype.addEdge =
  function (edge)
  {
    var edges = this.edges.add(edge);
    return new Ecg(edges);
  }

Ecg.prototype.containsEdge =
  function (edge)
  {
    return this.edges.contains(edge);
  }

Ecg.prototype.successors =
  function (source)
  {
    var targets = this.edges.values().flatMap(function (edge) {return edge.source.equals(source) ? [edge.target] : []});
    return Arrays.deleteDuplicates(targets, Eq.equals);
  }

Ecg.prototype.predecessors =
  function (target)
  {
    var sources = this.edges.values().flatMap(function (edge) {return edge.target.equals(target) ? [edge.source] : []});
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
  function (q, stack)
  {
    var kont = new PushUnchKont(q);
    var edges = q.next(kont);
    
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
  function (q, frame, stack)
  {
    var kont = new PopKont(q, frame);
    return q.next(kont);
  }

function GcDriver(driver)
{
  this.driver = driver;
}

GcDriver.gc =
  function (q, stack)
  {
    var stackAddresses = stack.flatMap(function (frame) {return frame.addresses()}).toSet();
//    print("gc", q.nice(), stack.toSet(), "\n  " + stackAddresses);
    var store = q.store;
    var rootSet = q.addresses().concat(stackAddresses);
    var store2 = Agc.collect(store, rootSet);
    var gcq = q.setStore(store2); 
    return gcq;
  }

GcDriver.prototype.pushUnch =
  function (q, stack)
  {
    var sa = stack.flatMap(function (frame) {return frame.addresses()}).toSet();
    var gcq = GcDriver.gc(q, stack);
    var edges = this.driver.pushUnch(gcq, stack); 
    return edges.map(function (edge) {return new Edge(q, edge.g, edge.target)});
  }
    
GcDriver.prototype.pop =
  function (q, frame, stack)
  {
    var gcq = GcDriver.gc(q, stack);
    var edges = this.driver.pop(gcq, frame, stack);
    return edges.map(function (edge) {return new Edge(q, edge.g, edge.target)});
  }


var Pushdown = {};

Pushdown.inject =
  function (node, cesk, applyHalt, override)
  {
    override = override || {};
    var haltFrame = new HaltKont(applyHalt);
    return new InitState(node, override.benva || cesk.globala, override.store || cesk.store, cesk, haltFrame);
  }

Pushdown.run =
  function (state)
  {
    var dsg = Pushdown.dsg(state);
    return {initial: state, dsg:dsg};
  }

Pushdown.dsg =
  function(q)
  {
  //var k = ceskDriver;
    var k = new GcDriver(ceskDriver);
  
    var etg = Etg.empty();
    var ecg = Ecg.empty();
    var ss = MultiMap.empty();
    var dE = [];
    var dH = [];
    var dS = [q];
    
    function sprout(q)
    {
      var frames = ss.get(q).values();
      var pushUnchEdges = k.pushUnch(q, frames); 
      dE = dE.concat(pushUnchEdges);
      dH = dH.concat(pushUnchEdges
                .filter(function (pushUnchEdge) {return pushUnchEdge.g.isUnch})
                .map(function (unchEdge) {return new EpsEdge(unchEdge.source, unchEdge.target)}));
    }

    function addPush(s, frame, q)
    { 
      ss = ss.putAll(q, ss.get(s).add(frame).values());
      var qset1 = ecg.successors(q);
      dE = dE.concat(qset1.flatMap(
        function (q1)
        {
          ss = ss.putAll(q1, ss.get(q).values());
          var frames = ss.get(q1).values();
          var popEdges = k.pop(q1, frame, frames);
          return popEdges;
        }));
      dH = dH.concat(dE.map(function (popEdge) {return new EpsEdge(s, popEdge.target)}));
    }

    function addPop(s2, frame, q)
    {
      var sset1 = ecg.predecessors(s2);
      var push = new Push(frame);
      dH = dH.concat(sset1.flatMap(
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
        }));
    }

    function addEmpty(s2, s3)
    {
      ss = ss.putAll(s3, ss.get(s2).values());
      var sset1 = ecg.predecessors(s2);
      var sset4 = ecg.successors(s3);
      dH = dH.concat(sset1.flatMap(function (s1) {return sset4.map(function (s4) {return new EpsEdge(s1, s4)})}));
      dH = dH.concat(sset1.map(
        function (s1) 
        {
          return new EpsEdge(s1, s3)
        }));
      dH = dH.concat(sset4.map(
        function (s4)
        {
          return new EpsEdge(s2, s4)
        }));
      var pushEdges = sset1.flatMap(
        function (s1)
        {
          return etg.incoming(s1).filter(function (edge) {return edge.g.isPush});
        });
      var popEdges = sset4.flatMap(
        function (s4)
        {
          ss = ss.putAll(s4, ss.get(s3).values());
          return pushEdges.flatMap(
            function (pushEdge)
            {
              var frame = pushEdge.g.frame;
              var frames = ss.get(s4).values();
              var popEdges = k.pop(s4, frame, frames);
              return popEdges;
            })
        });
      dE = dE.concat(popEdges);
      dH = dH.concat(pushEdges.flatMap(
        function (pushEdge)
        {
          return popEdges.map(function (popEdge) {return new EpsEdge(pushEdge.source, popEdge.target)});
        }));
    }
    
    while (true)
    {
      // epsilon edges
      if (dH.length > 0)
      {
        var h = dH[0];
        dH = dH.slice(1);
        if (!ecg.containsEdge(h))
        {
//          print("dH", h, ecg.edges.length);
          ecg = ecg.addEdge(h);
          var q = h.source;
          var q1 = h.target;
          ecg = ecg.addEdge(new EpsEdge(q, q)).addEdge(new EpsEdge(q1, q1));
          addEmpty(q, q1);
        }
      }
      // push, pop, unch edges
      else if (dE.length > 0)
      {
        var e = dE[0];
        dE = dE.slice(1);
        if (!etg.containsEdge(e))
        {
//          print("dE", e, etg.edges.length);
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
            addPush(q, g.frame, q1);
          }
          else if (g.isPop)
          {
            addPop(q, g.frame, q1);
          }
          else
          {
            addEmpty(q, q1);
          }
        }
      }
      // control states
      else if (dS.length > 0)
      {
        var q = dS[0];
        dS = dS.slice(1);
//        print("dS", q);
        ecg = ecg.addEdge(new EpsEdge(q, q));
        sprout(q);
      }
      else
      {
        return {etg:etg, ecg:ecg, ss:ss};
      }
    }
  }


Pushdown.retrospectiveStack =
  function (s, etg, ecg) //, ss)
  {
//    return [];
    var visited = HashSet.empty();
    var todo = [s];
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
    var rvalues = frames.values();
//    var cvalues = ss.get(s).values();
//    assertSetEquals(rvalues, cvalues);
    return rvalues;
  }

Pushdown.prospectiveStack =
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
