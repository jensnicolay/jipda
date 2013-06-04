function LGraph(config)
{
  this.config = config;
  this.nodes = [];
  this.links = [];
  this.linkTypes = [];
}

LGraph.prototype.addNode =
  function (node)
  {
    var i = this.nodes.memberAt(node);
    if (i === -1)
    {
      this.nodes.push(node);
      return node;
    }
    return this.nodes[i];
  }

LGraph.prototype.addLink =
  function (link)
  {
    var i = this.links.memberAt(link);
    if (i === -1)
    {
      this.links.push(link);
      var type = link.type;
      if (link.type)
      {
        this.linkTypes = this.linkTypes.addUniqueLast(type);
      }
      return link;
    }
    return this.links[i];
  }

LGraph.prototype.draw =
  function (containerSelector)
  {
  
  function click(d) {
    console.log(d);
  }
  
  var w = this.config.w || 960; var h = this.config.h || 500;
  var labelDistance = 0;

  var vis = d3.select(containerSelector).append("svg:svg").attr("width", w).attr("height", h);
  
  // Per-type markers, as they don't inherit styles.
  vis.append("svg:defs").selectAll("marker").data(
      this.linkTypes).enter().append("svg:marker").attr(
      "id", String).attr("viewBox", "0 -5 10 10").attr("refX", 15).attr("refY",
      0).attr("markerWidth", 4).attr("markerHeight", 6).attr("orient",
      "auto").append("svg:path").attr("d", "M0,-5L10,0L0,5");  

  var labelAnchors = [];
  var labelAnchorLinks = [];

  this.nodes.forEach(function (node, i) {
  labelAnchors.push({
    node : node
  });
  labelAnchors.push({
    node : node
  });
  labelAnchorLinks.push({
    source : i * 2,
    target : i * 2 + 1,
    weight : 1
  });
});

  var force = d3.layout.force().size([w, h]).nodes(this.nodes).links(this.links).gravity(1).linkDistance(50).charge(-3000).linkStrength(function(x) {
    return x.weight * 10
  });


  force.start();

  var force2 = d3.layout.force().nodes(labelAnchors).links(labelAnchorLinks).gravity(0).linkDistance(0).linkStrength(8).charge(-100).size([w, h]);
  force2.start();

  var link = vis.selectAll("line.link").data(this.links).enter().append("svg:line").attr("class", function (d) {return "link " + (d.type || "")}).attr("marker-end", function(d)
      {
    return "url(#" + d.type + ")";
  });;

  var node = vis.selectAll("g.node").data(force.nodes()).enter().append("svg:g").attr("class", "node");
  node.append("svg:circle").attr("r", 5).style("fill", "#555").style("stroke", "#FFF").style("stroke-width", 3);
  node.on("click", click);
  node.call(force.drag);

  var anchorLink = vis.selectAll("line.anchorLink").data(labelAnchorLinks)//.enter().append("svg:line").attr("class", "anchorLink").style("stroke", "#999");

  var anchorNode = vis.selectAll("g.anchorNode").data(force2.nodes()).enter().append("svg:g").attr("class", "anchorNode");
  anchorNode.append("svg:circle").attr("r", 0).style("fill", "#FFF");
    anchorNode.append("svg:text").text(function(d, i) {
    return i % 2 == 0 ? "" : d.node.label
  }).style("fill", "#555").style("font-family", "Arial").style("font-size", 12);

  var updateLink = function() {
    this.attr("x1", function(d) {
      return d.source.x;
    }).attr("y1", function(d) {
      return d.source.y;
    }).attr("x2", function(d) {
      return d.target.x;
    }).attr("y2", function(d) {
      return d.target.y;
    });

  }

  var updateNode = function() {
    this.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });

  }


  force.on("tick", function() {

    force2.start();

    node.call(updateNode);

    anchorNode.each(function(d, i) {
      if(i % 2 == 0) {
        d.x = d.node.x;
        d.y = d.node.y;
      } else {
        var b = this.childNodes[1].getBBox();

        var diffX = d.x - d.node.x;
        var diffY = d.y - d.node.y;

        var dist = Math.sqrt(diffX * diffX + diffY * diffY);

        var shiftX = b.width * (diffX - dist) / (dist * 2);
        shiftX = Math.max(-b.width, Math.min(0, shiftX));
        var shiftY = 5;
        this.childNodes[1].setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
      }
    });


    anchorNode.call(updateNode);

    link.call(updateLink);
    anchorLink.call(updateLink);

  }); 
}


