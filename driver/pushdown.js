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

function HaltKont(rootSet)
{
  this.rootSet = rootSet;
}
HaltKont.prototype.toString =
  function ()
  {
    return "halt";
  }
HaltKont.prototype.apply =
  function (value, store, kont)
  {
    return [];
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
    return this.rootSet;
  }
  
function Edge(source, g, target, marks)
{
  assertDefinedNotNull(source);
  assertDefinedNotNull(target);
  this.source = source;
  this.g = g;
  this.target = target;
  this.marks = marks;
}
Edge.source = 
  function (edge)
  {
    return edge.source;
  }
Edge.target = 
  function (edge)
  {
    return edge.target;
  }
Edge.prototype.equals =
  function (x)
  {
    return x instanceof Edge
      && Eq.equals(this.source, x.source)
      && Eq.equals(this.g, x.g)
      && Eq.equals(this.target, x.target)
      && Eq.equals(this.marks, x.marks)
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
    result = prime * result + HashCode.hashCode(this.g);
    result = prime * result + this.target.hashCode();
    result = prime * result + HashCode.hashCode(this.marks);
    return result;    
  }

function Graph(edges)
{
  this._edges = edges;
}

Graph.empty =
  function ()
  {
    return new Graph(HashSet.empty(131));
  }

Graph.prototype.equals =
  function (x)
  {
    return x instanceof Graph
      && this._edges.equals(x._edges);
  }

Graph.prototype.hashCode =
  function ()
  {
    return this._edges.hashCode();
  }

Graph.prototype.join =
  function (x)
  {
    return new Graph(this._edges.join(x._edges));
  }

Graph.prototype.edges =
  function ()
  {
    return this._edges.values();
  }

Graph.prototype.addEdge =
  function (edge)
  {
    var edges = this._edges.add(edge);
    return new Graph(edges);    
  }

Graph.prototype.addEdges =
  function (edges)
  {
    return new Graph(this._edges.addAll(edges));    
  }

Graph.prototype.removeEdge =
  function (edge)
  {
    return new Graph(this._edges.remove(edge));
  }

Graph.prototype.removeEdges =
  function (edges)
  {
    return new Graph(this._edges.removeAll(edges));
  }

Graph.prototype.containsEdge =
  function (edge)
  {
    return this._edges.contains(edge);
  }

Graph.prototype.containsTarget =
  function (target)
  {
    var edges = this._edges.values();
    for (var i = 0; i < edges.length; i++)
    {
      if (edges[i].target.equals(target))
      {
        return true;
      }
    }
    return false;
  }

Graph.prototype.outgoing =
  function (source)
  {
    return this._edges.values().filter(function (edge) {return edge.source.equals(source)});
  }

Graph.prototype.incoming =
  function (target)
  {
    return this._edges.values().filter(function (edge) {return edge.target.equals(target)});
  }

Graph.prototype.successors =
  function (source)
  {
    var targets = this._edges.values().flatMap(function (edge) {return edge.source.equals(source) ? [edge.target] : []});
    return Arrays.deleteDuplicates(targets, Eq.equals);
  }

Graph.prototype.predecessors =
  function (target)
  {
    var sources = this._edges.values().flatMap(function (edge) {return edge.target.equals(target) ? [edge.source] : []});
    return Arrays.deleteDuplicates(sources, Eq.equals);
  }

Graph.prototype.nodes =
  function ()
  {
    var nodes = this._edges.values().flatMap(function (edge) {return [edge.source, edge.target]});
    return Arrays.deleteDuplicates(nodes, Eq.equals);
  }

Graph.prototype.filterEdges =
  function (f)
  {
    return new Graph(this._edges.filter(f));
  }

function Push(frame)
{
  this.frame = frame;
}
Push.prototype.isPush = true;
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
  this.frame = frame;
}
Pop.prototype.isPop = true;
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
function Unch(frame)
{
  this.frame = frame;
}
Unch.prototype.isUnch = true;
Unch.prototype.equals =
  function (x)
  {
    return x.isUnch && Eq.equals(this.frame, x.frame);
  }
Unch.prototype.hashCode =
  function ()
  {
    var prime = 17;
    var result = 1;
    result = prime * result + HashCode.hashCode(this.frame);
    return result;    
  }
Unch.prototype.toString =
  function ()
  {
    return "e(" + this.frame + ")"//"\u03B5";
  }

function PushUnchKont(source)
{
  this.source = source;
}

PushUnchKont.prototype.push =
  function (frame, target, marks)
  {
    return [new Edge(this.source, new Push(frame), target, marks)];
  }

PushUnchKont.prototype.pop =
  function (frameCont, marks)
  {
    return [];
  }

PushUnchKont.prototype.unch =
  function (target, marks)
  {
    return [new Edge(this.source, new Unch(null), target, marks)];
  }

function PopKont(source, frame)
{
  this.source = source;
  this.frame = frame;
}

PopKont.prototype.push =
  function (frame, target, marks)
  {
    return [];
  }

PopKont.prototype.pop =
  function (frameCont, marks)
  {
    var frame = this.frame;
    var target = frameCont(frame);
    assertDefinedNotNull(target);
    return [new Edge(this.source, new Pop(frame), target, marks)];
  }

PopKont.prototype.unch =
  function (target, marks)
  {
    return [];
  }

var ceskDriver = {};

ceskDriver.pushUnch =
  function (q, stack)
  {
    var kont = new PushUnchKont(q);
    return q.next(kont);
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
    return edges.map(function (edge) {return new Edge(q, edge.g, edge.target, edge.marks)});
  }


function Pushdown()
{
}

Pushdown.inject =
  function (node, cesk, override)
  {
    override = override || {};
    var haltFrame = new HaltKont([cesk.globala]);
    return new InitState(node, override.benva || cesk.globala, override.store || cesk.store, cesk, haltFrame);
  }

Pushdown.run =
  function(q)
  {
  //var k = ceskDriver;
    var k = new GcDriver(ceskDriver);
  
    var etg = Graph.empty();
    var ecg = Graph.empty();
    var emptySet = ArraySet.empty();
    var ss = HashMap.empty().put(q, emptySet);
    var dE = [];
    var dH = [];
    var dS = [q];
    
    function propagateStack(s1, s2)
    {
      var currentSource = ss.get(s1, emptySet);
      var currentTarget = ss.get(s2, emptySet);
      var target = currentSource.join(currentTarget);
      ss = ss.put(s2, target);
    }
    
    function sprout(q)
    {
      var frames = ss.get(q, emptySet).values();
      var pushUnchEdges = k.pushUnch(q, frames); 
      dE = dE.concat(pushUnchEdges);
//      dH = dH.concat(pushUnchEdges
//                .filter(function (pushUnchEdge) {return pushUnchEdge.g.isUnch})
//                .map(function (unchEdge) {return new EpsEdge(unchEdge.source, unchEdge.target)}));
    }

    function addPush(s, frame, q)
    { 
      propagateStack(s, q);
      ss = ss.put(q, ss.get(q).add(frame));
      var qset1 = ecg.successors(q);
      dE = dE.concat(qset1.flatMap(
        function (q1)
        {
          propagateStack(q, q1);
          var frames = ss.get(q1).values();
          var popEdges = k.pop(q1, frame, frames);
          return popEdges;
        }));
      dH = dH.concat(dE.map(function (popEdge) {return new Edge(s, new Unch(frame), popEdge.target)}));
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
              return new Edge(s, new Unch(frame), q);
            });
        }));
    }

    function addEmpty(s2, s3)
    {
      propagateStack(s2, s3);
      var sset1 = ecg.predecessors(s2);
      var sset4 = ecg.successors(s3);
      dH = dH.concat(sset1.flatMap(function (s1) {return sset4.map(function (s4) {return new Edge(s1, null, s4)})}));
      dH = dH.concat(sset1.map(
        function (s1) 
        {
          return new Edge(s1, null, s3)
        }));
      dH = dH.concat(sset4.map(
        function (s4)
        {
          return new Edge(s2, null, s4)
        }));
      var pushEdges = sset1.flatMap(
        function (s1)
        {
          return etg.incoming(s1).filter(function (edge) {return edge.g.isPush});
        });
      var popEdges = sset4.flatMap(
        function (s4)
        {
          propagateStack(s3, s4);
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
          return popEdges.map(function (popEdge) {return new Edge(pushEdge.source, new Unch(pushEdge.g.frame), popEdge.target)});
        }));
    }
    
    while (true)
    {
      // epsilon edges
      if (dH.length > 0)
      {
        var h = dH.shift();
        if (!ecg.containsEdge(h))
        {
//          print("dH", h, ecg.edges.length);
          ecg = ecg.addEdge(h);
          var q = h.source;
          var q1 = h.target;
          ecg = ecg.addEdge(new Edge(q, null, q)).addEdge(new Edge(q1, null, q1));
          addEmpty(q, q1);
        }
      }
      // push, pop, unch edges
      else if (dE.length > 0)
      {
        var e = dE.shift();
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
          ecg = ecg.addEdge(new Edge(q, null, q)).addEdge(new Edge(q1, null, q1));
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
        var q = dS.shift();
//        print("dS", q);
        ecg = ecg.addEdge(new Edge(q, null, q));
        sprout(q);
      }
      else
      {
        return {etg:etg, ecg:ecg, ss:ss};
      }
    }
  }

Pushdown.preStackNfa =
  function (s, etg, ecg)
  {
    var visited = HashSet.empty();
    var todo = [s];
    var edges = HashSet.empty();
    while (todo.length > 0)
    {
      var q = todo.shift();
      if (visited.contains(q))
      {
        continue;
      }
      visited = visited.add(q);
      var incomingEdges = etg.incoming(q);
      var incomingPushUnchEdges = incomingEdges.filter(function (edge) {return !edge.g.isPop});
      if (incomingPushUnchEdges.length === 0)
      {
        var incomingEpsFrameEdges = ecg.incoming(q).filter(function (epsEdge) {return epsEdge.g});
        edges = edges.addAll(incomingEpsFrameEdges);
        var predecessors = incomingEpsFrameEdges.map(function (edge) {return edge.source});
      }
      else
      {
        edges = edges.addAll(incomingPushUnchEdges);
        var predecessors = incomingPushUnchEdges.map(function (edge) {return edge.source});
      }
      todo = todo.concat(predecessors);
    }
    return new Graph(edges);
  }

Pushdown.stepOver =
  function (s, fs)
  {
    var etg = Graph.empty();
    var ecg = Graph.empty();
    var dE = [this.etg.outgoing(s)];
    while (dE.length > 0)
    {
      var e = dE.shift();
      if (etg.contains(e))
      {
        continue;
      }
      etg = etg.addEdge(e);
      var q = e.target; 
      if (fs(q))
      {
        var epsSuccessors = this.ecg.successors(q);
        dE = dE.concat(epsSuccessors.flatMap(function (succ) {return this.etg.outgoing(succ)}, this));
      }
      else
      {
        dE = dE.concat(this.etg.outgoing(q));
      }
      ecg = ecg.addEdges(this.ecg.outgoing(q));
    }
    return {etg:etg, ecg:ecg};
  }


Pushdown.stepIn =
  function (s, etg, ecg)
  {
    var targets = ecg.successors(s);
    var newEtg = Graph.empty();
    var newEcg = Graph.empty();
    var todo = etg.outgoing(s);
    while (todo.length > 0)
    {
      var edge = todo.shift();
      if (newEtg.containsEdge(edge))
      {
        continue;
      }
      newEtg = newEtg.addEdge(edge);
      newEcg = newEcg.addEdges(ecg.outgoing(edge.source));
      if (Arrays.contains(edge.target, targets, Eq.equals))
      {
        continue;
      }
      todo = todo.concat(etg.outgoing(edge.target));
    }
    return {etg:newEtg, ecg:newEcg};
  }

Pushdown.forwardUntil =
  function (s, fe, etg)
  {
    var targets = HashSet.empty();
    var visited = HashSet.empty();
    var todo = etg.outgoing(s);
    while (todo.length > 0)
    {
      var e = todo.shift();
      if (visited.contains(e))
      {
        continue;
      }
      visited = visited.add(e);
      if (fe(e))
      {
        targets.push(e);
        break;
      }
      var q = e.target;
      var outgoing = etg.outgoing(q);
      todo = todo.concat(outgoing);
    }
    return {visited:visited, targets:targets};
  }

Pushdown.rewindUntil =
  function (s, fe, etg)
  {
    var targets = HashSet.empty();
    var visited = HashSet.empty();
    var todo = etg.incoming(s);
    while (todo.length > 0)
    {
      var e = todo.shift();
      if (visited.contains(e))
      {
        continue;
      }
      visited = visited.add(e);
      if (fe(e))
      {
        targets.push(e);
        break;
      }
      var q = e.source;
      var incoming = etg.incoming(q);
      todo = todo.concat(incoming);
    }
    return {visited:visited, targets:targets};
  }

Pushdown.preStackUntil =
  function (s, fe, etg, ecg)
  {
    var targets = HashSet.empty();
    var visited = HashSet.empty();
    var todo = etg.incoming(s);
    while (todo.length > 0)
    {
      var e = todo.shift();
      if (visited.contains(e))
      {
        continue;
      }
      visited = visited.add(e);
      if (fe(e))
      {
        targets = targets.add(e);
        break;
      }
      var q = e.source;
      var incomingEtg = etg.incoming(q).filter(function (edge) {return !edge.g.isPop});
      var incomingEcg = ecg.incoming(q);
      todo = todo.concat(incomingEtg).concat(incomingEcg);        
    }
    return {targets:targets,visited:visited};
  }

Pushdown.filterMarks =
  function (etg, f)
  {
    return etg.edges().reduce(
      function (result, edge)
      {
        var marks = edge.marks || [];
        return result.concat(marks.filter(f))
      }, []);
  }

Pushdown.valueOf = 
  function (s, etg, ecg)
  {
    var incomingPushEdges = etg.incoming(s).filter(function (e) {return e.g.isPush});
    var pushPredecessors = incomingPushEdges.map(Edge.source);
    var epsSuccessors = pushPredecessors.flatMap(Graph.prototype.successors, ecg);
    return {targets:ArraySet.from(epsSuccessors), visited:null/*TODO incomingPush + epsSucc*/};
  }

Pushdown.prototype.analyze =
  function (ast, cesk)
  {
    var initial = Pushdown.inject(ast, cesk);
    var dsg = Pushdown.run(initial);
    return new Dsg(initial, dsg.etg, dsg.ecg, dsg.ss);
  }

function Dsg(initial, etg, ecg, ss)
{
  this.initial = initial;
  this.etg = etg;
  this.ecg = ecg;
  this.ss = ss;
}

////

Dsg.prototype.valueOf =
  function (node)
  {
    var evalPushEdges = this.etg.edges().filter(
      function (edge)
      {
        return edge.g.isPush && edge.target.node === node;
      });
    var preEvalStates = evalPushEdges.map(Edge.source);
    var epsSuccessors = preEvalStates.flatMap(Graph.prototype.successors, this.ecg);
    var values = epsSuccessors.map(function (q) {return q.value || BOT});
    return values.reduce(Lattice.join, BOT);
  }

Dsg.prototype.executions =
  function (s)
  {
    var edges = Pushdown.preStackUntil(s, function (e) {return e.source.fun}, this.etg, this.ecg).targets;
    return edges.values().map(function (e) {return e.source});
  }

Dsg.prototype.isPureFunction =
  function (f)
  {
    var globalReadAddresses = ArraySet.from(Pushdown.filterMarks(this.etg, function (mark) {return mark.isRead}).map(function (mark) {return mark.address}));
    var globalWriteAddresses = ArraySet.from(Pushdown.filterMarks(this.etg, function (mark) {return mark.isWrite}).map(function (mark) {return mark.address}));
    var constants = globalReadAddresses.subtract(globalWriteAddresses);
    print("constants", constants);
    var objectAllocStates = this.etg.nodes().filter(function (s) {return s.node && s.node.type === "ObjectExpression"});
    var that = this;
    var allocs = objectAllocStates.reduce(
      function (result, s)
      {
        var valueStates = Pushdown.valueOf(s, that.etg, that.ecg).targets.values();
        var value = valueStates.map(function (q) {return q.value || BOT}).reduce(Lattice.join);
        print("s", s, "valueStates", valueStates, "value", value);
        var allocatedAddresses = ArraySet.from(value.addresses());
        var executions = that.executions(s); 
        return executions.reduce(
          function (result, execution)
          {
            return result.put(execution, allocatedAddresses)
          }, result);
      }, LatticeMap.empty(ArraySet.empty()));
    print("allocs", allocs);
    var rws = this.etg.edges().reduce(
      function (result, e)
      {
        var marks = e.marks || [];
        var rwMarks = marks.filter(function (mark) {return mark.isRead || mark.isWrite});
        var rwAddresses = ArraySet.from(rwMarks.flatMap(function (mark) {return mark.address}));
        var preStack = Pushdown.preStackUntil(e.source, function () {return false}, that.etg, that.ecg);
        var applications = preStack.visited.values().map(function (e) {return e.target}).filter(function (q) {return q.fun});
        return applications.reduce(
          function (result, application)
          {
            return result.put(application, rwAddresses);
          }, result);
      }, LatticeMap.empty(ArraySet.empty()));
    print("rws", rws);
    ////
    var applications = this.etg.nodes().filter(function (q) {return q.fun === f});
    return applications.every(
      function (application)
      {
        var benva = application.extendedBenva;
        var allocAddresses = allocs.get(application);
        var rwAddresses = rws.get(application).values();
        return rwAddresses.every(
          function (rwa)
          {
            if (constants.contains(rwa))
            {
              return true;
            }
            var base = rwa.base;
            if (base.equals(benva))
            {
              return true;
            }
            return allocAddresses.contains(base);
          }) 
      })
  }