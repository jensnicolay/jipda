function Edge(source, g, target, marks)
{
  this.source = source;
  this.g = g;
  this.target = target;
  this.marks = marks;
}
Edge.source = 
  function (edge)
  {
    return edge.source;
  }
Edge.target = 
  function (edge)
  {
    return edge.target;
  }
Edge.prototype.equals =
  function (x)
  {
    return x instanceof Edge
      && Eq.equals(this.source, x.source)
      && Eq.equals(this.g, x.g)
      && Eq.equals(this.target, x.target)
      && Eq.equals(this.marks, x.marks)
  }
Edge.prototype.toString =
  function ()
  {
    return "{" + this.source + "," + this.g + "," + this.target + "}";
  }
Edge.prototype.hashCode =
  function ()
  {
    var prime = 7;
    var result = 1;
    result = prime * result + this.source.hashCode();
    result = prime * result + HashCode.hashCode(this.g);
    result = prime * result + this.target.hashCode();
    result = prime * result + HashCode.hashCode(this.marks);
    return result;    
  }

function Graph(edges)
{
  this._edges = edges;
}

Graph.empty =
  function ()
  {
    return new Graph(ArraySet.empty(131));
  }

Graph.prototype.equals =
  function (x)
  {
    return x instanceof Graph
      && this._edges.equals(x._edges);
  }

Graph.prototype.hashCode =
  function ()
  {
    return this._edges.hashCode();
  }

Graph.prototype.join =
  function (x)
  {
    return new Graph(this._edges.join(x._edges));
  }

Graph.prototype.edges =
  function ()
  {
    return this._edges.values();
  }

Graph.prototype.addEdge =
  function (edge)
  {
    var edges = this._edges;
    if (edges.contains(edge))
    {
      return this;
    }
    edge.index = edges.size();
    return new Graph(edges.add(edge));    
  }

Graph.prototype.addEdges =
  function (edges)
  {
    return edges.reduce(function (edges, edge) {return edges.add(edge)}, this._edges);    
  }

//Graph.prototype.removeEdge =
//  function (edge)
//  {
//    return new Graph(this._edges.remove(edge));
//  }
//
//Graph.prototype.removeEdges =
//  function (edges)
//  {
//    return new Graph(this._edges.removeAll(edges));
//  }

Graph.prototype.containsEdge =
  function (edge)
  {
    return this._edges.contains(edge);
  }

Graph.prototype.containsSource =
  function (source)
  {
    var edges = this._edges.values();
    for (var i = 0; i < edges.length; i++)
    {
      if (edges[i].source.equals(source))
      {
        return true;
      }
    }
    return false;
  }

Graph.prototype.containsTarget =
  function (target)
  {
    var edges = this._edges.values();
    for (var i = 0; i < edges.length; i++)
    {
      if (edges[i].target.equals(target))
      {
        return true;
      }
    }
    return false;
  }

Graph.prototype.outgoing =
  function (source)
  {
    return this._edges.values().filter(function (edge) {return edge.source.equals(source)});
  }

Graph.prototype.incoming =
  function (target)
  {
    return this._edges.values().filter(function (edge) {return edge.target.equals(target)});
  }

Graph.prototype.successors =
  function (source)
  {
    var targets = this._edges.values().flatMap(function (edge) {return edge.source.equals(source) ? [edge.target] : []});
    return Arrays.deleteDuplicates(targets, Eq.equals);
  }

Graph.prototype.predecessors =
  function (target)
  {
    var sources = this._edges.values().flatMap(function (edge) {return edge.target.equals(target) ? [edge.source] : []});
    return Arrays.deleteDuplicates(sources, Eq.equals);
  }

Graph.prototype.nodes =
  function ()
  {
    var nodes = this._edges.values().flatMap(function (edge) {return [edge.source, edge.target]});
    return Arrays.deleteDuplicates(nodes, Eq.equals);
  }

//Graph.prototype.filterEdges =
//  function (f)
//  {
//    return new Graph(this._edges.filter(f));
//  }
