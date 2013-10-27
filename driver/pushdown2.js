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
    return "e";//"\u03B5";
  }

function PushUnchKont(source, stack, etg, ecg)
{
  this.source = source;
  this.stack = stack;
  this.etg = etg;
  this.ecg = ecg;
}

PushUnchKont.prototype.addresses =
  function ()
  {
    return this.stack.values();
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

function PopKont(source, frame, stack, etg, ecg)
{
  this.source = source;
  this.frame = frame;
  this.stack = stack;
  this.etg = etg;
  this.ecg = ecg;
}

PopKont.prototype.addresses =
  function ()
  {
    return this.stack.values();
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
    return [new Edge(this.source, new Pop(frame), target, marks)];
  }

PopKont.prototype.unch =
  function (target, marks)
  {
    return [];
  }

var ceskDriver = {};

ceskDriver.pushUnch =
  function (c, etg, ecg)
  {
    var kont = new PushUnchKont(c, c.ss, etg, ecg);
    return c.q.next(kont);
  }

ceskDriver.pop =
  function (c, frame, etg, ecg)
  {
    var kont = new PopKont(c, frame, c.ss, etg, ecg);
    return c.q.next(kont);
  }

function C(q, ss)
{
  this.q = q;
  this.ss = ss;
}

C.prototype.equals =
  function (x)
  {
    return x instanceof C
      && this.q.equals(x.q)
      && Eq.equals(this.ss, x.ss);
  }

C.prototype.hashCode =
  function ()
  {
    var prime = 19;
    var result = 1;
    result = prime * result + this.q.hashCode();
    result = prime * result + HashCode.hashCode(this.ss);
    return result;  
  }

C.prototype.toString =
  function ()
  {
    return "<" + this.q + " " + this.ss + ">";
  }

C.prototype.nice =
  function ()
  {
    return "<" + this.q + ">";
  }

function Pushdown()
{
}

Pushdown.run =
  function (q)
  {
    var k = ceskDriver;

    var etg = Graph.empty();
    var ecg = Graph.empty();
    var cs = [];
    var initial = newC(q, ArraySet.empty());
    var dE = [];
    var dH = [];
    var dS = [initial];
    
    function newC(q, ss)
    {
      var c = new C(q, ss);
      var index = Arrays.indexOf(c, cs, Eq.equals);
      if (index === -1)
      {
        c.index = cs.length;
        cs.push(c);
        return c;
      }
      return cs[index];
    }
    
    function sprout(c)
    {
      var pushUnchEdges = k.pushUnch(c, etg, ecg); 
      dE = dE.concat(pushUnchEdges);
      dH = dH.concat(pushUnchEdges
                .filter(function (pushUnchEdge) {return pushUnchEdge.g.isUnch})
                .map(function (unchEdge) {return new Edge(unchEdge.source, null, unchEdge.target)}));
    }

    function addPush(c, frame, cq)
    { 
      var cset1 = ecg.successors(cq);
      var popEdges = cset1.flatMap(
          function (c1)
          {
            var popEdges = k.pop(c1, frame, etg, ecg);
//            print("c", c.index, "c1", c1.index, "pop edges", popEdges.map(function (e) {return new Edge(e.source.index, e.g, e.target)}));
            return popEdges;
          });
      dE = dE.concat(popEdges);
      dH = dH.concat(popEdges.map(function (popEdge) {return new Edge(c, new Unch(frame), popEdge.target)}));
    }

    function addPop(c2, frame, q)
    {
      var cset1 = ecg.predecessors(c2);
      var push = new Push(frame);
      var unchEdges = cset1.flatMap(
          function (c1)
          {
            var cset = etg.incoming(c1)
                          .filter(function (edge) {return edge.g.equals(push)})
                          .map(function (pushEdge) {return pushEdge.source});
            return cset.map(
              function (c)
              {
                return new Edge(c, new Unch(frame), q);
              });
          });
      dH = dH.concat(unchEdges);
      return unchEdges;
    }

    function addEmpty(c2, c3)
    {
      var cset1 = ecg.predecessors(c2);
      var cset4 = ecg.successors(c3);
      dH = dH.concat(cset1.flatMap(function (c1) {return cset4.map(function (c4) {return new Edge(c1, null, c4.q)})}));
      dH = dH.concat(cset1.map(
        function (c1) 
        {
          return new Edge(c1, null, c3.q)
        }));
      dH = dH.concat(cset4.map(
        function (c4)
        {
          return new Edge(c2, null, c4.q)
        }));
      var pushEdges = cset1.flatMap(
        function (c1)
        {
          return etg.incoming(c1).filter(function (edge) {return edge.g.isPush});
        });
      var popEdges = cset4.flatMap(
        function (c4)
        {
          return pushEdges.flatMap(
            function (pushEdge)
            {
              var frame = pushEdge.g.frame;
              var popEdges = k.pop(c4, frame, etg, ecg);
//              print("->c1 push", pushEdges.map(function (e) {return new Edge(e.source.index, e.g, e.target.index)}), "c2", c2.index, "c3", c3.index, "c4-> pop", popEdges.map(function (e) {return new Edge(e.source.index, e.g, e.target)}));
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
    
//    try {
    while (true)
    {
      // epsilon edges
      if (dH.length > 0)
      {
        var h = dH.shift();
        var c = h.source;
        var q1 = h.target;
        var c1 = newC(q1, c.ss);
        ecg = ecg.addEdge(new Edge(c, null, c)).addEdge(new Edge(c1, null, c1));
        var h1 = new Edge(c, null, c1);
        if (!ecg.containsEdge(h1))
        {
          addEmpty(c, c1);
          ecg = ecg.addEdge(h1);
        }
      }
      // push, pop, unch edges
      else if (dE.length > 0)
      {
        var e = dE.shift();
        var c = e.source;
        var q = c.q;
        var g = e.g;
        var q1 = e.target;
        ecg = ecg.addEdge(new Edge(c, null, c));
        if (g.isPush)
        {
          var ss1 = c.ss.addAll(e.g.frame.addresses());
          var c1 = newC(q1, ss1);
          ecg = ecg.addEdge(new Edge(c1, null, c1));
          addPush(c, g.frame, c1);
          var e1 = new Edge(c, g, c1);
          if (!etg.containsEdge(e1))
          {
            etg = etg.addEdge(e1);
            dS.push(c1);
          }
        }
        else if (g.isPop)
        {
          var unchEdges = addPop(c, g.frame, q1);
          unchEdges.forEach(
           function (h) 
           {
             var c1 = newC(q1, h.source.ss);
             ecg = ecg.addEdge(new Edge(c1, null, c1));
             var e1 = new Edge(c, g, c1);
             if (!etg.containsEdge(e1))
             {
               etg = etg.addEdge(e1);
               dS.push(c1);
             }
           });
        }
        else
        {
          var c1 = newC(q1, c.ss);
          ecg = ecg.addEdge(new Edge(c1, null, c1));
          var e1 = new Edge(c, g, c1);
          if (!etg.containsEdge(e1))
          {
            etg = etg.addEdge(e1);
            dS.push(c1);
          }
          var h1 = new Edge(c, null, c1);
          if (!ecg.containsEdge(h1))
          {
            addEmpty(c, c1);
            ecg = ecg.addEdge(h1);
          }
        }
      }
      // control states
      else if (dS.length > 0)
      {
        var c = dS.shift();
        ecg = ecg.addEdge(new Edge(c, null, c));
        sprout(c);
      }
      else
      {
        return {etg:etg, ecg:ecg, initial:initial};
      }
    }
  }

Pushdown.pushPredecessors =
  function (s, etg)
  {
    return etg.incoming(s).filter(function (e) {return e.g.isPush}).map(Edge.source);
  }

Pushdown.popSuccessors =
  function (s, etg)
  {
    return etg.outgoing(s).filter(function (e) {return e.g.isPop}).map(Edge.target);
  }

Pushdown.epsPopSuccessors =
  function (s, etg, ecg)
  {
    var etgSuccs = etg.outgoing(s).filter(function (e) {return !e.g.isPush}).map(Edge.target);
    var ecgSuccs = ecg.successors(s);
    return etgSuccs.concat(ecgSuccs);
  }

Pushdown.framePredecessors =
  function (s, frame, ecg)
  {
    return ecg.incoming(s).flatMap(
      function (h)
      {
        return (h.g && h.g.frame.equals(frame)) ? [h.source] : [];
      });
  }

Pushdown.preStack =
  function (s, etg, ecg)
  {
    function nextEdges(q)
    {
      var incomingEtg = etg.incoming(q).filter(function (edge) {return !edge.g.isPop});
      var incomingEcg = ecg.incoming(q);
      return incomingEtg.concat(incomingEcg);        
    }

    var visited = ArraySet.empty();
    var todo = nextEdges(s);
    while (todo.length > 0)
    {
      var e = todo.shift();
      if (visited.contains(e))
      {
        continue;
      }
      visited = visited.add(e);
      todo = todo.concat(nextEdges(e.source));        
    }
    return visited.values();
  }

Pushdown.preStackFrames =
  function (s, etg, ecg)
  {
    var preStack = Pushdown.preStack(s, etg, ecg);
    return preStack.flatMap(function (eh) {return (eh.g && eh.g.frame && !eh.g.isUnch) ? [eh.g.frame]: []}).toSet();
  }

Pushdown.preStackUntil =
  function (s, fe, etg, ecg)
  {
  
    function nextEdges(q)
    {
      var incomingEtg = etg.incoming(q).filter(function (edge) {return !edge.g.isPop});
      var incomingEcg = ecg.incoming(q);
      return incomingEtg.concat(incomingEcg);        
    }
  
    var targets = ArraySet.empty();
    var visited = ArraySet.empty();
    var todo = nextEdges(s);
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
      todo = todo.concat(nextEdges(e.source));        
    }
    return {targets:targets,visited:visited}; // TODO values() 
  }

Pushdown.pathsBwTo =
  function (s, target, etg)
  {
    var todo = [s];
    var visited = ArraySet.empty();
    var paths = ArraySet.empty();
    while (todo.length > 0)
    {
      var q = todo.shift();
      if (q.equals(target) || visited.contains(q))
      {
        continue;
      }
      visited = visited.add(q);
      var incoming = etg.incoming(q);
      paths = paths.addAll(incoming);
      var qs = incoming.map(Edge.source);
      todo = todo.concat(qs);
    }
    return paths.values();
  }

Pushdown.valueFor =
  function (s, etg, ecg)
  {
    var popPredecessors = etg.incoming(s).flatMap(function (e) {return e.g.isPop ? [e.source] : []});
    var epsPredecessors = popPredecessors.flatMap(function (q) {return ecg.predecessors(q)});
    return epsPredecessors;
  }

Pushdown.prototype.analyze =
  function (ast, cesk, override)
  {
    var initial = cesk.inject(ast, override);
    var dsg = Pushdown.run(initial);
    return new Dsg(dsg.initial, dsg.etg, dsg.ecg);
  }

function Dsg(initial, etg, ecg, ss)
{
  this.initial = initial;
  this.etg = etg;
  this.ecg = ecg;
  this.ss = ss;
}

Dsg.prototype.stepFwOver =
  function (s)
  {
    var successors = this.ecg.outgoing(s).flatMap(function (h) {return h.g ? [h.target] : []});
    return successors;
  }

Dsg.prototype.stepBwOver =
  function (s)
  {
    var predecessors = this.ecg.incoming(s).flatMap(function (h) {return h.g ? [h.source] : []});
    return predecessors;
  }

//Dsg.prototype.matchingPush =
//  function (e)
//  {
//    var frame = e.g.frame;
//    var qs = this.ecg.incoming(e.target).flatMap(function (h) {return (h.g && h.g.frame.equals(frame) ? [h.source] : []}));
//    return this.etg.outgoing.flatMap(function (e1) {return e1.g.isPush && e1.g.frame.equals(frame)});
//  }

Dsg.prototype.popValues = 
  function (s)
  {
    var targets = ArraySet.empty();
    var visited = ArraySet.empty();
    var todo = [s];
    while (todo.length > 0)
    {
      var q = todo.shift();
      if (visited.contains(q))
      {
        continue;
      }
      visited = visited.add(q);
      if (q.value)
      {
        targets = targets.add(q);
        continue;
      }
      todo = todo.concat(Pushdown.epsPopSuccessors(q, this.etg, this.ecg));
    }
    return targets.values();
  }

Dsg.prototype.values =
  function (s)
  {
    var qs = Pushdown.pushPredecessors(s, this.etg);
    var q1s = qs.flatMap(function (q) {return this.stepFwOver(q)}, this);
    return q1s.flatMap(function (q1) {return this.popValues(q1)}, this);
  }


Dsg.prototype.executions =
  function (s)
  {
    var edges = Pushdown.preStackUntil(s, function (e) {return e.source.fun}, this.etg, this.ecg).targets;
    return edges.values().map(Edge.source);
  }

Dsg.prototype.cflows =
  function (s)
  {
    var edges = Pushdown.preStackUntil(s, function () {return false}, this.etg, this.ecg).visited;
    return edges.values().flatMap(function (e) {return e.source.fun ? [e.source] : []});
  }

Dsg.prototype.declarations =
  function (s)
  {
    var name = s.node.name;
    var etg = this.etg;
    var ecg = this.ecg;
    var targets = ArraySet.empty();
    var visited = ArraySet.empty();
    var todo = [s];
    while (todo.length > 0)
    {
      var q = todo.shift();
      if (visited.contains(q))
      {
        continue;
      }
      visited = visited.add(q);
      if (q.node && q.node.type === "VariableDeclaration" && q.node.declarations[0].id.name === name)
      {
        targets = targets.add(q);
        continue;
      }
      var incoming = etg.incoming(q);
      todo = incoming.reduce(
        function (todo, e)
        {
          if (e.g.isPop && e.g.frame.isMarker)
          {
            return todo.concat(Pushdown.framePredecessors(q, e.g.frame, ecg));
          }
          return todo.addLast(e.source);
        }, todo);
    }
    return targets.values();
  }

