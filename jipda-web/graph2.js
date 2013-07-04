function drawLinks(links, selector)
{
  var nodes = {};
  
  // Compute the distinct nodes from the links.
  links.forEach(function(link) {
    link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
    link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
  });
  
  var width = 1024,
      height = 1024;
      
  
  var force = d3.layout.force()
      .nodes(d3.values(nodes))
      .links(links)
      .size([width, height])
      .linkDistance(100)
      .charge(-300)
      .on("tick", tick)
      .start();
  
  var svg2 = d3.select(selector || "body").append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("pointer-events", "all")
    .append('svg:g')
      .call(d3.behavior.zoom().on("zoom", redraw))
  var svg = svg2.append('svg:g');
    
  function redraw() {
    svg.attr("transform",
        "translate(" + d3.event.translate + ")"
        + " scale(" + d3.event.scale + ")");
  }
      
  //Per-type markers, as they don't inherit styles.
  svg.append("svg:defs").selectAll("marker")
      .data(["suit", "licensing", "resolved"])
    .enter().append("svg:marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", -1.5)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
    .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");
  
  var link = svg.selectAll(".link")
      .data(force.links())
    .enter().append("g");
  
  var node = svg.selectAll(".node")
      .data(force.nodes())
    .enter().append("g")
      .attr("class", "node")
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .on("mousedown", function(d) {
          d.fixed = true;
          d3.select(this).classed("sticky", true)})
      .on("dblclick", function(d) {
          d.fixed = false;
          d3.select(this).classed("sticky", false)})
     .call(force.drag);
  
  node.append("circle")
      .attr("r", 8);
  
  node.append("text")
      .attr("x", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });
  
  var line = link.append("line")
  .attr("class", function(d) { return "link " + d.type; })
   .attr("marker-end", function(d) { return "url(#" + "resolved" + ")"; });
  
  var text = link.append("text")
      .attr('text-anchor', 'middle')
      .text(function(d) { return d.label});
  
  function xpos(s, t) {
    return s.x + (t.x - s.x) / 2;
  };
  
  function ypos(s, t) {
    return s.y + (t.y - s.y) / 2;
  };
  
  function tick() {
    line
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
  
    node
    .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    text
    .attr('x', function(d) { return xpos(d.source, d.target); })
    .attr('y', function(d) { return ypos(d.source, d.target); });
  }
  
  function mouseover() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 16);
  }
  
  function mouseout() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 8);
  }
}