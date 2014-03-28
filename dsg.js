function Dsg(initial, etg, ecg, data)
{
  this.initial = initial;
  this.etg = etg;
  this.ecg = ecg;
  this.time = data.time;
}

Dsg.isPushEdge =
  function (e)
  {
    return e.g && e.g.isPush;
  }

Dsg.incomingPushEdges =
  function (s, etg)
  {
    return etg.incoming(s).filter(Dsg.isPushEdge);
  }

Dsg.outgoingPushEdges =
  function (s, etg)
  {
    return etg.outgoing(s).filter(Dsg.isPushEdge);
  }

Dsg.pushPredecessors =
  function (s, etg)
  {
    return Dsg.incomingPushEdges(s, etg).map(Edge.source);
  }

Dsg.pushSuccessors =
  function (s, etg)
  {
    return Dsg.outgoingPushEdges(s, etg).map(Edge.target);
  }

Dsg.isPopEdge =
  function (e)
  {
    return e.g && e.g.isPop;
  }

Dsg.incomingPopEdges =
  function (s, etg)
  {
    return etg.incoming(s).filter(Dsg.isPopEdge);
  }

Dsg.outgoingPopEdges =
  function (s, etg)
  {
    return etg.outgoing(s).filter(Dsg.isPopEdge);
  }

Dsg.popPredecessors =
  function (s, etg)
  {
    return Dsg.incomingPopEdges(s, etg).map(Edge.source);
  }

Dsg.popSuccessors =
  function (s, etg)
  {
    return Dsg.outgoingPopEdges(s, etg).map(Edge.target);
  }

Dsg.isUnchEdge =
  function (e)
  {
    return e.g && e.g.isUnch;
  }

Dsg.incomingUnchEdges =
  function (s, etg)
  {
    return etg.incoming(s).filter(Dsg.isUnchEdge);
  }

Dsg.outgoingUnchEdges =
  function (s, etg)
  {
    return etg.outgoing(s).filter(Dsg.isUnchEdge);
  }

Dsg.unchPredecessors =
  function (s, etg)
  {
    return Dsg.incomingUnchEdges(s, etg).map(Edge.source);
  }

Dsg.unchSuccessors =
  function (s, etg)
  {
    return Dsg.outgoingUnchEdges(s, etg).map(Edge.target);
  }

Dsg.epsPopSuccessors =
  function (s, etg, ecg)
  {
    var etgSuccs = Dsg.popSuccessors(s, etg);
    var ecgSuccs = ecg.successors(s);
    return etgSuccs.concat(ecgSuccs);
  }

Dsg.epsPushPredecessors =
  function (s, etg, ecg)
  {
    var etgPreds = Dsg.pushSuccessors(s, etg);
    var ecgPreds = ecg.predecessors(s);
    return etgPreds.concat(ecgPreds);
  }

Dsg.epsMatchingPredecessors =
  function (s, ecg)
  {
    return ecg.incoming(s).flatMap(
      function (h)
      {
        return (h.g && h.g.frame) ? [h.source] : [];
      });
  }

Dsg.epsMatchingSuccessors =
  function (s, ecg)
  {
    return ecg.outgoing(s).flatMap(
      function (h)
      {
        return (h.g && h.g.frame) ? [h.target] : [];
      });
  }

Dsg.fwReachable =
  function (etg, ecg)
  {
    function next(target, root)
    {
      var todo = [];
      Dsg.outgoingPushEdges(target, etg).forEach(
        function (pushEdge)
        {
          todo.push([pushEdge, null]);
          var epsPush = ecg.successors(pushEdge.target);
          var frame = pushEdge.g.frame;
          epsPush.forEach(
            function (s2)
            {
              Dsg.outgoingPopEdges(s2, etg).forEach(
                function (popEdge)
                {
                  if (popEdge.g.frame.equals(frame))
                  {
                    todo.push([popEdge, root]);
                  }
                })
            })
        });
      Dsg.outgoingUnchEdges(target, etg).forEach(
        function (unchEdge)
        {
          todo.push([unchEdge, root]);
        });
      if (root !== null)
      {
        Dsg.outgoingPopEdges(target, etg).forEach(
          function (popEdge)
          {
            var frame = popEdge.g.frame;
            var epsRoot = ecg.predecessors(root);
            epsRoot.forEach(
              function (s2) 
              {
                Dsg.incomingPushEdges(s2, etg).forEach(
                  function (rootPushEdge)
                  {
                    if (rootPushEdge.g.frame.equals(frame))
                    {
                      todo.push([popEdge, rootPushEdge.source]);
                    }
                  });
              });
          });
      }
      return todo;
    }

    return function (s)
    {
      var todo = next(s, s);
      var visited = HashSet.empty();
      while (todo.length > 0)
      {
        var re = todo.shift();
        if (visited.contains(re))
        {
          continue;
        }
        visited = visited.add(re);
        var e = re[0];
        var root = re[1];
        var target = e.target;
        todo = todo.concat(next(target, root));
      }
      return visited.values().map(function (re) {return re[0]});
    }
  }

Dsg.bwReachable =
  function (etg, ecg)
  {
    function next(source, onlyPop)
    {
      var todo = [];
      Dsg.incomingPopEdges(source, etg).forEach(
        function (popEdge)
        {
          todo.push([popEdge, true]);
          var epsPop = ecg.predecessors(popEdge.source);
          var frame = popEdge.g.frame;
          epsPop.forEach(
            function (s2)
            {
              Dsg.incomingPushEdges(s2, etg).forEach(
                function (pushEdge)
                {
                  if (pushEdge.g.frame.equals(frame))
                  {
                    todo.push([pushEdge, false]);
                  }
                })
            })
        });
      if (!onlyPop)
      {
        Dsg.incomingUnchEdges(source, etg).forEach(
          function (unchEdge)
          {
            todo.push([unchEdge, false]);
          });
        Dsg.incomingPushEdges(source, etg).forEach(
          function (pushEdge)
          {
            todo.push([pushEdge, false]);
          });
      }
      return todo;
    }

    return function (s)
    {
      var todo = next(s, false);
      var visited = HashSet.empty();
      while (todo.length > 0)
      {
        var re = todo.shift();
        if (visited.contains(re))
        {
          continue;
        }
        visited = visited.add(re);
        var e = re[0];
        var onlyPop = re[1];
        var source = e.source;
        todo = todo.concat(next(source, onlyPop));
      }
      return visited.values().map(function (re) {return re[0]});
    }
  }

Dsg.bwStack =
  function (s, etg, ecg)
  {
    function nextEdges(q)
    {
      var incomingPushEdges = Dsg.incomingPushEdges(q, etg);
      var incomingEpsEdges = ecg.incoming(q);
      return incomingPushEdges.concat(incomingEpsEdges);        
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

Dsg.valuesOf =
  function (etg, ecg)
  {
    return function (s)
    {
      var epsPreds = ecg.predecessors(s);
      var pushPreds = epsPreds.flatMap(function (s) {return Dsg.pushPredecessors(s, etg)});
      var stepOvers = pushPreds.flatMap(Dsg.stepFwOver(ecg));
      return stepOvers;
    }
  }

Dsg.stepFwOver =
  function (ecg)
  {
    return function (s)
    {
      var successors = ecg.outgoing(s).flatMap(function (h) {return h.g ? [h.target] : []});
      return successors;
    }
  }

Dsg.prototype.stepFwOver =
  function (s)
  {
    return Dsg.stepFwOver(this.ecg)(s);
  }


Dsg.prototype.stepBwOver =
  function (s)
  {
    var predecessors = this.ecg.incoming(s).flatMap(function (h) {return h.g ? [h.source] : []});
    return predecessors;
  }

Dsg.prototype.topOfStack =
  function (s)
  {
    var etg = this.etg;
    var ecg = this.ecg;
    var epsPreds = ecg.predecessors(s);
    var incomingPushes = epsPreds.flatMap(function (q) {return etg.incoming(q).filter(function (e) {return e.g.isPush})});
    var frames = incomingPushes.map(function (e) {return e.g.frame});
    return frames;
  }


////////////////////

function DsgBuilder(etg, ecg)
{
  this.etg = etg;
  this.ecg = ecg;
}

DsgBuilder.empty =
  function ()
  {
    return new DsgBuilder(Graph.empty(), Graph.empty());
  }

DsgBuilder.epsClose =
  function (epsEdges, etg, ecg)
  {
    return epsEdges.reduce(
      function (ecg, epsEdge)
      {
        if (ecg.containsEdge(epsEdge))
        {
          return ecg;
        }
        var source = epsEdge.source;
        var target = epsEdge.target;
        ecg = ecg.addEdge(epsEdge);
        var epsPreds = ecg.predecessors(source);
        var epsPredEdges = epsPreds.map(function (epsPred) {return new Edge(epsPred, null, target)});
        var epsSuccs = ecg.successors(target);
        var epsSuccEdges = epsSuccs.map(function (epsSucc) {return new Edge(source, null, epsSucc)});
        var epsPredSuccEdges = epsPreds.flatMap(function (epsPred) {return epsSuccs.map(function (epsSucc) {return new Edge(epsPred, null, epsSucc)})});
        var pushEdges = epsPreds.flatMap(function (epsPred) {return etg.incoming(epsPred).filter(function (e) {return e.g.isPush})});
        var epsFrameEdges = pushEdges.flatMap(
          function (pushEdge)
          {
            var frame = pushEdge.g.frame;
            var popEdges = epsSuccs.flatMap(function (epsSucc) {return etg.outgoing(epsSucc).filter(function (e) {return e.g.isPop && e.g.frame.equals(frame)})});
            return popEdges.map(function (popEdge) {return new Edge(pushEdge.source, new Unch(frame), popEdge.target)});
          })
        return DsgBuilder.epsClose(epsPredEdges.concat(epsSuccEdges).concat(epsPredSuccEdges).concat(epsFrameEdges), etg, ecg);
      }, ecg);
  }

DsgBuilder.prototype.addPush =
  function (source, frame, target)
  {
    var etg = this.etg;
    var ecg = this.ecg;
    etg = etg.addEdge(new Edge(source, new Push(frame), target));
    ecg = ecg.addEdge(new Edge(source, null, source));
    ecg = ecg.addEdge(new Edge(target, null, target));
    var epsSuccs = ecg.successors(target);
    var popEdges = epsSuccs.flatMap(function (epsSucc) {return etg.outgoing(epsSucc).filter(function (e) {return e.g.isPop && e.g.frame.equals(frame)})});
    var epsEdges = popEdges.map(function (popEdge) {return new Edge(source, new Unch(frame), popEdge.target)});
    ecg = DsgBuilder.epsClose(epsEdges, etg, ecg);
    return new DsgBuilder(etg, ecg);
  }

DsgBuilder.prototype.addPop =
  function (source, frame, target)
  {
    var etg = this.etg;
    var ecg = this.ecg;
    etg = etg.addEdge(new Edge(source, new Pop(frame), target));
    ecg = ecg.addEdge(new Edge(source, null, source));
    ecg = ecg.addEdge(new Edge(target, null, target));
    var epsPreds = ecg.predecessors(source);
    var pushEdges = epsPreds.flatMap(function (epsPred) {return etg.incoming(epsPred).filter(function (e) {return e.g.isPush && e.g.frame.equals(frame)})});
    var epsEdges = pushEdges.map(function (pushEdge) {return new Edge(pushEdge.source, new Unch(frame), target)});
    ecg = DsgBuilder.epsClose(epsEdges, etg, ecg);
    return new DsgBuilder(etg, ecg);
  }

DsgBuilder.prototype.addUnch =
  function (source, target)
  {
    var etg = this.etg;
    var ecg = this.ecg;
    etg = etg.addEdge(new Edge(source, new Unch(null), target));
    ecg = ecg.addEdge(new Edge(source, null, source));
    ecg = ecg.addEdge(new Edge(target, null, target));
    var epsEdges = [new Edge(source, null, target)];
    ecg = DsgBuilder.epsClose(epsEdges, etg, ecg);
    return new DsgBuilder(etg, ecg);
  }

DsgBuilder.prototype.toDsg =
  function (initial)
  {
    return new Dsg(initial, this.etg, this.ecg, {});
  }
