function D3ForceGraph(containerSelector, linkTypes, config)
{
  config = config || {};
  var w = config.width == null ? 480 : config.width, h = config.height == null ? 480 : config.height;
  var svg = d3.select(containerSelector).append("svg:svg").attr("width", w).attr("height",
      h);

  // Per-type markers, as they don't inherit styles.
  svg.append("svg:defs").selectAll("marker").data(
      linkTypes).enter().append("svg:marker").attr(
      "id", String).attr("viewBox", "0 -5 10 10").attr("refX", 15).attr("refY",
      -1.5).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient",
      "auto").append("svg:path").attr("d", "M0,-5L10,0L0,5");
  
  this.force = d3.layout.force().nodes([]).links([]).size([ w, h ])
  .linkDistance(150).charge(-360);

  this.pp = svg.append("svg:g");
  this.cc = svg.append("svg:g");
  this.tt = svg.append("svg:g");
}

// node: {id, ...}
D3ForceGraph.prototype.registerNode =
  function (nodeCheck, nodeNew)
  {
    var nodes = this.force.nodes();
    var nodeCheckFunction = nodeCheck instanceof Function;
    var e = nodeCheckFunction ? nodeCheck : Eq.checker(nodeCheck);
    for (var i = 0; i < nodes.length; i++)
    {
      if (e(nodes[i]))
      {
        return nodes[i];
      }
    }
    var node;
    if (!nodeNew)
    {
      if (nodeCheckFunction)
      {
        throw new Error("got node check function, expected node value");
      }
      node = nodeCheck;
    }
    else
    {
      node = nodeNew();
    }
    nodes.push(node);
    return node;
  }

// link: {source, target, [type], ...}
D3ForceGraph.prototype.addLink =
  function (link)
  {
    this.force.links().push(link);
  }


D3ForceGraph.prototype.update =
  function ()
  {
    var path, circle, text;

    this.pp.selectAll("path").data(this.force.links()).enter().append("svg:path").attr(
        "class", function(d)
        {
          return "link " + d.type;
        }).attr("marker-end", function(d)
    {
      return "url(#" + d.type + ")";
    });

    this.cc.selectAll("circle").data(this.force.nodes()).enter().append("svg:circle")
        .attr("r", 6).attr("class", function (d) { return d.type }).call(this.force.drag);

    text = this.tt.selectAll("g.ttt").data(this.force.nodes()).enter().append("svg:g")
        .attr("class", "ttt");

    // A copy of the text with a thick white stroke for legibility.
    text.append("svg:text").attr("x", 8).attr("y", ".31em").attr("class",
        "shadow").text(function(d)
    {
      return d.toString();
    });

    text.append("svg:text").attr("x", 8).attr("y", ".31em").text(function(d)
    {
      return d.toString();
    });

    path = this.pp.selectAll("path");
    circle = this.cc.selectAll("circle");
    text = this.tt.selectAll("g.ttt");

    // Use elliptical arc path segments to doubly-encode directionality.
    function tick()
    {
      path.attr("d", function(d)
      {
        var dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, dr = Math
            .sqrt(dx * dx + dy * dy);
        return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr
            + " 0 0,1 " + d.target.x + "," + d.target.y;
      });

      circle.attr("transform", function(d)
      {
        return "translate(" + d.x + "," + d.y + ")";
      });

      text.attr("transform", function(d)
      {
        return "translate(" + d.x + "," + d.y + ")";
      });
    }
        
    this.force.on("tick", tick).start();  
  };

