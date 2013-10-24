function drawLinks(etg, ecg, meta, element, ww)
{
  var EPS = {};
  var nodes = [];
  var edges = etg.edges().sort(function (link1, link2) {return link1.index - link2.index});
  var frames = [];
  
  function nodeIndexer(x)
  {
    if (Array.isArray(x))
    {
      return x.map(nodeIndexer)
    }
    else
    {
      return Arrays.indexOf(x, nodes, Eq.equals);
    }
  }
  
  function frameIndexer(x)
  {
    if (Array.isArray(x))
    {
      return x.map(frameIndexer)
    }
    else
    {
      return Arrays.indexOf(x, frames, Eq.equals);
    }
  }
  
  ilinks = edges.map(
    function (link)
    {
      var sourceIndex = Arrays.indexOf(link.source, nodes, Eq.equals);
      if (sourceIndex < 0)
      {
        sourceIndex = nodes.length;
        nodes[sourceIndex] = link.source;
      }
      var label = link.g;
      if (label)
      {
        var frame = label.frame;
        if (frame)
        {
          var frameIndex = Arrays.indexOf(frame, frames, Eq.equals);
          if (frameIndex === -1)
          {
            frameIndex = frames.length;
            frames[frameIndex] = frame;
          }
          label = label.isPush ? new Push(frameIndex) : (label.isPop ? new Pop(frameIndex) : new Unch(frameIndex));
        }
      }
      else
      {
        label = EPS;
      }
      var targetIndex = Arrays.indexOf(link.target, nodes, Eq.equals);
      if (targetIndex === -1)
      {
        targetIndex = nodes.length;
        nodes[targetIndex] = link.target;
      }
      var ilink = new Edge(sourceIndex, label, targetIndex, link.marks);
      ilink.index = link.index;
      return ilink;
    });
  
  var dot = "digraph fsm {";//rankdir=LR;\n";
  nodes.forEach(
    function (node, i)
    {
      var label;
      if (node.node)
      {
        label = String(node.node).substring(0,20);
      }
      else if (node.value !== undefined)
      {
        label = String(node.value);
      }
      else
      {
        label = node.type;
      }
      dot += i + " [label=\"" + label + "\"];\n";
    });
  ilinks.forEach(
    function (link)
    {
      if (link.g !== EPS)
      {
        var label = String(link.g);
        if (link.g.frame !== null)
        {
          label += " " + frames[link.g.frame].toString();
        }
        label += " (" + link.index + ")";
        if (link.marks)
        {
          label += " " + link.marks;
        }
//        label += " :: " + nodes[link.source].store.diff(nodes[link.target].store).split("\n").join(" ");
        dot += link.source + " -> " + link.target + " [label=\"" + label + "\"];\n";        
      }
      else
      {
        dot += link.source + " -> " + link.target + " [style=\"dotted\"];\n";
      }
    });
  dot += "}";
  console.log(dot);
//  console.log(nodes.map(function (node, i) {return i + ":" + node}).join("\n"));
//  console.log(frames.map(function (frame, i) {return i + ":" + frame}).join("\n"));
  var svg = Viz(dot, "svg");
  element.append(svg);
  $("g.node", ww.document).each(
    function ()
    {
      var $this = $(this);
      var nodeIndex = $("title", $this).text();
      var node = nodes[nodeIndex];
      var nodeMeta = meta.get(node);
      if (nodeMeta)
      {
        if (nodeMeta.ss)
        {
          var ss = frameIndexer(nodeMeta.ss.values());
        }
        if (nodeMeta.tf)
        {
          var tf = frameIndexer(nodeMeta.tf.values());
        }
      }
      var marks = node.marks ? ("\nmarks " + node.marks) : "";
      $this.attr("id", nodeIndex);
      var tooltip = nodeIndex + " " + node.nice();
      tooltip += "\nbenva " + node.benva + marks;
      tooltip += "\neps pre " + nodeIndexer(ecg.predecessors(node));        
      tooltip += "\neps succ " + nodeIndexer(ecg.successors(node));        
      tooltip += "\nss " + ss;
      $("title", $this).text(tooltip);
      var constructorName = String(node.constructor);
      constructorName = constructorName.substring(0, constructorName.length - 2);
      $this.attr("class", "node " + constructorName); // addClass doesn't seem to work
      $this.dblclick(function ()
      {
        var newwindow=ww.open();
        var newdocument=newwindow.document;
        var nfa = Pushdown.epsilonReachableGraph(node, etg, ecg);
        newdocument.write("<html><head><link rel='stylesheet' href='jipda.css' type='text/css'/></head><body><div id='nfa'></div></body>");
        var el2 = $(newdocument).find("#nfa");
        drawLinks(nfa, Graph.empty(), meta, el2, newwindow);
        newdocument.close();
      });
    });
//  $("g.node").each(
//    function ()
//    {
//      var $this = $(this);
//      $("title", $this).text($this.data("node"));
//    })
  return {nodes:nodes, edges:edges, frames:frames};
}