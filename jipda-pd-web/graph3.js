function drawLinks(links, selector)
{
  
//  var nodes = Object.create(null);
//  
//  // Compute the distinct nodes from the links.
//  links.forEach(function(link) {
//    link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
//    link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
//  });
//  
//  var id = 0;
//  nodes.forEach(function (node) {node.id})

  
  var dot = "digraph fsm {rankdir=LR;\n";
  links.forEach(
    function (link)
    {
      dot += "\"" + link.source + "\" -> \"" + link.target + "\" [label=\"" + link.label + "\"];\n";
    });
  dot += "}";
  console.log(dot)
  var svg = Viz(dot, "svg");
  $("#graph").append(svg);
}