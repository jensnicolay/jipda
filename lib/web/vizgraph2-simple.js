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
      dot += i + " [label=\"\",style=filled,fillcolor=black];\n";
    });
  ilinks.forEach(
    function (link)
    {
        dot += link.source + " -> " + link.target + " [style=bold,arrowsize=1.5];\n";        
    });
  dot += "}";
  print("HERE", dot);
  var svg = Viz(dot, "svg");
  element.append(svg);
 return {nodes:nodes, edges:edges, frames:frames};
}