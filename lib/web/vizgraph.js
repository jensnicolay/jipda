function drawLinks(etg, ecg, meta, element, ww)
{
  var EPS = {};
  var nodes = [];
  var frames = [];
  ilinks = etg.edges().map(
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
      return new Edge(sourceIndex, label, targetIndex, link.marks);
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
        if (link.g.frame !== undefined)
        {
          label += " " + frames[link.g.frame].toString();
        }
        
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
  console.log(nodes.map(function (node, i) {return i + ":" + node}).join("\n"));
  console.log(frames.map(function (frame, i) {return i + ":" + frame}).join("\n"));
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
        var ss = frameIndexer(nodeMeta.ss.values());
      }
      var marks = node.marks ? ("\nmarks " + node.marks) : "";
      $this.attr("id", nodeIndex);
      $("title", $this).text(nodeIndex + " " + node.nice() + "\nbenva " + node.benva + marks + "\nss " + ss);
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
}