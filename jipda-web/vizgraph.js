function drawLinks(links, selector)
{
  var EPS = {};
  var nodes = [];
  var frames = [];
  links = links.map(
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
          if (frameIndex < 0)
          {
            frameIndex = frames.length;
            frames[frameIndex] = frame;
          }
          label = label.isPush ? new Push(frameIndex) : new Pop(frameIndex);
        }
      }
      else
      {
        label = EPS;
      }
      var targetIndex = Arrays.indexOf(link.target, nodes, Eq.equals);
      if (targetIndex < 0)
      {
        targetIndex = nodes.length;
        nodes[targetIndex] = link.target;
      }        
      return new Edge(sourceIndex, label, targetIndex);
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
      else if (node.value)
      {
        label = String(node.value);
      }
      else
      {
        label = node.type;
      }
      dot += i + " [label=\"" + label + "\"];\n";
      if (node.ss)
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
        
        node.ss = frameIndexer(node.ss);
      }
    });
  links.forEach(
    function (link)
    {
      if (link.g !== EPS)
      {
        var label = String(link.g);
        if (!link.g.isUnch)
        {
          label += frames[link.g.frame].constructor;
        }
        label += " :: " + nodes[link.source].store.diff(nodes[link.target].store).split("\n").join(" ");
        dot += link.source + " -> " + link.target + " [label=\"" + label + "\"];\n";        
      }
      else
      {
        dot += link.source + " -> " + link.target + " [style=\"dotted\"];\n";
      }
    });
  dot += "}";
  console.log(dot)
  console.log(nodes.map(function (node, i) {return i + ":" + node}).join("\n"));
  console.log(frames.map(function (frame, i) {return i + ":" + frame}).join("\n"));
  var svg = Viz(dot, "svg");
  $("#graph").append(svg);
  $("g.node").each(
    function ()
    {
      var $this = $(this);
      var nodeIndex = $("title", $this).text();
      var node = nodes[nodeIndex];
      $this.attr("id", nodeIndex);
      $("title", $this).text(nodeIndex + " " + node.nice() + " " + node.store.map.keys().toSet() + " " + node.ss);
      var constructorName = String(node.constructor);
      constructorName = constructorName.substring(0, constructorName.length - 2);
      $this.attr("class", "node " + constructorName); // addClass doesn't seem to work
    });
//  $("g.node").each(
//    function ()
//    {
//      var $this = $(this);
//      $("title", $this).text($this.data("node"));
//    })
}