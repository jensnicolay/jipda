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
    if (this._hashCode !== undefined)
    {
      return this._hashCode;
    }
    var prime = 7;
    var result = 1;
    result = prime * result + this.source.hashCode();
    result = prime * result + HashCode.hashCode(this.g);
    result = prime * result + this.target.hashCode();
    result = prime * result + HashCode.hashCode(this.marks);
    this._hashCode = result;
    return result;
  }

function Graph(edges)
{
  this._edges = edges;
}

Graph.empty =
  function ()
  {
    return new Graph(new HashSet(TrieMap.empty()));
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
    return !this._edges.iterateValues(
      function (edge)
      {
        return !edge.source.equals(source);
      });
  }

Graph.prototype.containsTarget =
  function (target)
  {
    return !this._edges.iterateValues(
        function (edge)
        {
          return !edge.target.equals(target);
        });
  }

Graph.prototype.outgoing =
  function (source)
  {
    var result = [];
    this._edges.iterateValues(
      function (edge)
      {
        if (edge.source.equals(source))
        {
          result.push(edge);
        }
      });
    return result;
  }

Graph.prototype.incoming =
  function (target)
  {
    var result = [];
    this._edges.iterateValues(
      function (edge)
      {
        if (edge.target.equals(target))
        {
          result.push(edge);
        }
      });
    return result;
  }

Graph.prototype.successors =
  function (source)
  {
    var result = [];
    this._edges.iterateValues(
      function (edge)
      {
        if (edge.source.equals(source))
        {
          result.push(edge.target);
        }
      });
    return Arrays.deleteDuplicates(result, Eq.equals);
  }

Graph.prototype.predecessors =
  function (target)
  {
    var result = [];
    this._edges.iterateValues(
      function (edge)
      {
        if (edge.target.equals(target))
        {
          result.push(edge.source);
        }
      });
    return Arrays.deleteDuplicates(result, Eq.equals);
  }

Graph.prototype.nodes =
  function ()
  {
    var result = [];
    this._edges.iterateValues(
      function (edge)
      {
        result.push(edge.source);
        result.push(edge.target);
      });
    return Arrays.deleteDuplicates(result, Eq.equals);
  }

//Graph.prototype.filterEdges =
//  function (f)
//  {
//    return new Graph(this._edges.filter(f));
//  }
