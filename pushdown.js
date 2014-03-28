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
    return x.isPush
      && Eq.equals(this.frame, x.frame)
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
    return "e" + (this.frame ? "(" + this.frame + ")" : "");//"\u03B5";
  }

var ceskDriver = {};

ceskDriver.PushUnchKont =
  function(source, ss, etg, ecg)
  {
    this.source = source;
    this.ss = ss;
    this.etg = etg;
    this.ecg = ecg;
  }

ceskDriver.PushUnchKont.prototype.push =
  function (frame, target, marks)
  {
    return [new Edge(this.source, new Push(frame), target, marks)];
  }

ceskDriver.PushUnchKont.prototype.pop =
  function (frameCont, marks)
  {
    return [];
  }

ceskDriver.PushUnchKont.prototype.unch =
  function (target, marks)
  {
    return [new Edge(this.source, new Unch(null), target, marks)];
  }

ceskDriver.PopKont =
  function (source, frame, ss, etg, ecg)
{
  this.source = source;
  this.frame = frame;
  this.ss = ss;
  this.etg = etg;
  this.ecg = ecg;
}

ceskDriver.PopKont.prototype.push =
  function (frame, target, marks)
  {
    return [];
  }

ceskDriver.PopKont.prototype.pop =
  function (frameCont, marks)
  {
    var frame = this.frame;
    var target = frameCont(frame);
    return [new Edge(this.source, new Pop(frame), target, marks)];
  }

ceskDriver.PopKont.prototype.unch =
  function (target, marks)
  {
    return [];
  }

ceskDriver.pushUnch =
  function (c, etg, ecg)
  {
    var kont = new ceskDriver.PushUnchKont(c, c.ss, etg, ecg);
    return c.q.next(kont);
  }

ceskDriver.pop =
  function (c, frame, etg, ecg)
  {
    var kont = new ceskDriver.PopKont(c, frame, c.ss, etg, ecg);
    return c.q.next(kont);
  }

function Conf(q, ss)
{
  assertFalse(q == null);
  this.q = q;
  this.ss = ss;
}

Conf.prototype.equals =
  function (x)
  {
    return x instanceof Conf
      && this.q.equals(x.q)
      && Eq.equals(this.ss, x.ss);
  }

Conf.prototype.hashCode =
  function ()
  {
    var prime = 19;
    var result = 1;
    result = prime * result + this.q.hashCode();
    result = prime * result + HashCode.hashCode(this.ss);
    return result;  
  }

Conf.prototype.toString =
  function ()
  {
    return "<" + this.q + " " + this.ss + ">";
  }

Conf.prototype.nice =
  function ()
  {
    return "<" + this.q + ">";
  }

function Pushdown(limitMs)
{
  this.limitMs = limitMs;
}

Pushdown.run =
  function (q0, ss0, limitMs)
  {
    var startTime = Date.now();
    var limitTime = limitMs ? (startTime + limitMs) : undefined;

    var cs = [];
    var initial = newC(q0, ss0);
    var etg = Graph.empty();
    var ecg = Graph.empty().addEdge(new Edge(initial, null, initial)); 
    var dE = [];
    var dH = [];
    var dS = [initial];
    
    function newC(q, ss)
    {
      var c = new Conf(q, ss);
      var index = Arrays.indexOf(c, cs, Eq.equals);
      if (index === -1)
      {
        c.index = cs.length;
        cs.push(c);
        return c;
      }
      return cs[index];
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
        var h1 = new Edge(c, h.g, c1);
        if (!ecg.containsEdge(h1))
        {
          var dd = Pushdown.addEmpty(c, c1, etg, ecg, ceskDriver);
          dE = dE.concat(dd[0]);
          dH = dH.concat(dd[1]);
          ecg = ecg.addEdge(h1);
        }
      }
      // push, pop, unch edges
      else if (dE.length > 0)
      {
        var e = dE.shift();
        var c = e.source;
//        var q = c.q;
        var g = e.g;
        var q1 = e.target;
        ecg = ecg.addEdge(new Edge(c, null, c));
        if (g.isPush)
        {
          var ss1 = c.ss.push(e.g.frame);
          var c1 = newC(q1, ss1);
          ecg = ecg.addEdge(new Edge(c1, null, c1));
          var dd = Pushdown.addPush(c, g.frame, c1, etg, ecg, ceskDriver);
          dE = dE.concat(dd[0]);
          dH = dH.concat(dd[1]);
          var e1 = new Edge(c, g, c1, e.marks);
          if (!etg.containsEdge(e1))
          {
            etg = etg.addEdge(e1);
            if (!etg.containsSource(c1))
            {
              dS.push(c1);
            }
          }
        }
        else if (g.isPop)
        {
          var unchEdges = Pushdown.addPop(c, g.frame, q1, etg, ecg);
          dH = dH.concat(unchEdges);
          unchEdges.forEach(
           function (h) 
           {
             var c1 = newC(q1, h.source.ss);
             ecg = ecg.addEdge(new Edge(c1, null, c1));
             var e1 = new Edge(c, g, c1, e.marks);
             if (!etg.containsEdge(e1))
             {
               etg = etg.addEdge(e1);
               if (!etg.containsSource(c1))
               {
                 dS.push(c1);
               }
             }
           });
        }
        else
        {
          var c1 = newC(q1, c.ss);
          ecg = ecg.addEdge(new Edge(c1, null, c1));
          var e1 = new Edge(c, g, c1, e.marks);
          if (!etg.containsEdge(e1))
          {
            etg = etg.addEdge(e1);
            if (!etg.containsSource(c1))
            {
              dS.push(c1);
            }
          }
          var h1 = new Edge(c, null, c1);
          if (!ecg.containsEdge(h1))
          {
            var dd = Pushdown.addEmpty(c, c1, etg, ecg, ceskDriver);
            dE = dE.concat(dd[0]);
            dH = dH.concat(dd[1]);
            ecg = ecg.addEdge(h1);
          }
        }
      }
      // control states
      else if (dS.length > 0)
      {
        if (limitTime && Date.now() > limitTime)
        {
          var err = new Error("overflow: exceeded limit time " + limitMs); 
          err.dsg = {etg:etg, ecg:ecg, initial:initial};
          throw err;
        }
        var c = dS.pop();
        //ecg = ecg.addEdge(new Edge(c, null, c));
        var dd = Pushdown.sprout(c, etg, ecg, ceskDriver);
        dE = dE.concat(dd[0]);
        dH = dH.concat(dd[1]);
      }
      else
      {
        return {etg:etg, ecg:ecg, initial:initial, time: Date.now() - startTime};
      }
    }
  }

Pushdown.addPush =
  function (c, frame, c1, etg, ecg, ceskDriver)
  { 
    var cset2 = ecg.successors(c1);
    var popEdges = cset2.flatMap(
        function (c2)
        {
          var popEdges = ceskDriver.pop(c2, frame, etg, ecg);
          return popEdges;
        });
    var ddH = popEdges.map(function (popEdge) {return new Edge(c, new Unch(frame), popEdge.target)});
    return [popEdges, ddH];
}

Pushdown.addPop =
  function (c2, frame, q3, etg, ecg)
  {
    var cset1 = ecg.predecessors(c2);
    var unchEdges = cset1.flatMap(
        function (c1)
        {
          var cset = etg.incoming(c1)
                        .filter(function (edge) {return edge.g.isPush && edge.g.frame.equals(frame)})
                        .map(function (pushEdge) {return pushEdge.source});
          return cset.map(
            function (c)
            {
              return new Edge(c, new Unch(frame), q3);
            });
        });
    return unchEdges;
  }

Pushdown.addEmpty =
  function (c2, c3, etg, ecg, ceskDriver)
  {
    var cset1 = ecg.predecessors(c2);
    var cset4 = ecg.successors(c3);
    var ddH1 = cset1.flatMap(function (c1) {return cset4.map(function (c4) {return new Edge(c1, null, c4.q)})});
    var ddH2 = cset1.map(
      function (c1) 
      {
        return new Edge(c1, null, c3.q)
      });
    var ddH3 = cset4.map(
      function (c4)
      {
        return new Edge(c2, null, c4.q)
      });
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
            var popEdges = ceskDriver.pop(c4, frame, etg, ecg);
            return popEdges;
          })
      });
    var ddH4 = pushEdges.flatMap(
        function (pushEdge)
        {
          return popEdges.map(function (popEdge) {return new Edge(pushEdge.source, new Unch(pushEdge.g.frame), popEdge.target)});
        }); 
    return [popEdges, ddH1.concat(ddH2).concat(ddH3).concat(ddH4)];
  }

Pushdown.sprout =
  function (c, etg, ecg, ceskDriver)
  {
//    print("sprout", c.index, c.q);
    var pushUnchEdges = ceskDriver.pushUnch(c, etg, ecg); 
    var ddH = pushUnchEdges
              .filter(function (pushUnchEdge) {return pushUnchEdge.g.isUnch})
              .map(function (unchEdge) {return new Edge(unchEdge.source, null, unchEdge.target)});
    return [pushUnchEdges, ddH];
  }

Pushdown.prototype.analyze =
  function (ast, cesk, override)
  {
    var initial = cesk.inject(ast, override);
    var dsg = Pushdown.run(initial.q, initial.ss, this.limitMs);
    return new Dsg(dsg.initial, dsg.etg, dsg.ecg, {time:dsg.time});
  }