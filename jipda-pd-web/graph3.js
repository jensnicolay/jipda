function drawLinks(links, selector)
{
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
      var label = link.label;
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
      var targetIndex = Arrays.indexOf(link.target, nodes, Eq.equals);
      if (targetIndex < 0)
      {
        targetIndex = nodes.length;
        nodes[targetIndex] = link.target;
      }
      return new Transition(sourceIndex, label, targetIndex);
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
    });
  links.forEach(
    function (link)
    {
      var label = String(link.label);
      if (!link.label.isUnch)
      {
        label += frames[link.label.frame].constructor;
      }
      dot += link.source + " -> " + link.target + " [label=\"" + label + "\"];\n";
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
      $("title", $this).text(node);
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