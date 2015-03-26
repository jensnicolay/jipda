"use strict";

function Edge(source, g, target)
{
  this.source = source;
  this.g = g;
  this.target = target;
  var prime = 7;
  var result = 1;
  result = prime * result + this.source.hashCode();
  result = prime * result + HashCode.hashCode(this.g);
  result = prime * result + this.target.hashCode();
  this._hashCode = result;
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
      && (this.source === x.source || this.source.equals(x.source))
      && (this.g === x.g || (this.g && this.g.equals(x.g)))
      && (this.target === x.target || this.target.equals(x.target))
  }
Edge.prototype.toString =
  function ()
  {
    return "{" + this.source + "," + this.g + "," + this.target + "}";
  }
Edge.prototype.hashCode =
  function ()
  {
    return this._hashCode;
  }

function Graph(fw, bw)
{
  this._fw = fw;
  this._bw = bw;
}

Graph._emptySet = ArraySet.empty();

Graph.empty =
  function ()
  {
    return new Graph(new TrieMap.empty(), new TrieMap.empty());
  }

Graph.prototype.equals =
  function (x)
  {
    return x instanceof Graph
      && this._fw.equals(x._fw);
  }

Graph.prototype.hashCode =
  function ()
  {
    return this._fw.hashCode();
  }

Graph.prototype.toString =
  function ()
  {
    return this.nodes().length + "/" + this.edges().length;
  }

Graph.prototype.join =
  function (x)
  {
    return new Graph(this._fw.join(x._fw), this._bw.join(x._bw));
  }

Graph.prototype.addEdge =
  function (edge)
  {
    var fw = this._fw;
    var source = edge.source;
    var fwedges = fw.get(source) || Graph._emptySet;
    if (fwedges.contains(edge))
    {
      return this;
    }
    fwedges = fwedges.add(edge);
    fw = fw.put(source, fwedges);
    var target = edge.target;
    var bw = this._bw;
    var bwedges = bw.get(target) || Graph._emptySet;
    bwedges = bwedges.add(edge);
    bw = bw.put(target, bwedges);
    return new Graph(fw, bw);    
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
    var source = edge.source;
    var fwedges = this._fw.get(source) || Graph._emptySet;
    return fwedges.contains(edge);
  }

Graph.prototype.containsSource =
  function (source)
  {
    var fwedges = this._fw.get(source);
    return !!fwedges;
  }

Graph.prototype.containsTarget =
  function (target)
  {
    var bwedges = this._bw.get(target);
    return !!bwedges;
  }

Graph.prototype.outgoing =
  function (source)
  {
    var fwedges = this._fw.get(source) || Graph._emptySet;
    return fwedges.values();
  }

Graph.prototype.incoming =
  function (target)
  {
    var bwedges = this._bw.get(target) || Graph._emptySet;
    return bwedges.values();
  }

Graph.prototype.successors =
  function (source)
  {
    var fwedges = this._fw.get(source) || Graph._emptySet;
    return Arrays.deleteDuplicates(fwedges.values().map(Edge.target));
  }

Graph.prototype.predecessors =
  function (target)
  {
    var bwedges = this._bw.get(target) || Graph._emptySet;
    return Arrays.deleteDuplicates(bwedges.values().map(Edge.source));
  }

Graph.prototype.nodes =
  function ()
  {
    return Arrays.union(this._fw.keys(), this._bw.keys());
  }

Graph.prototype.edges =
  function ()
  {
    return this._fw.values().flatMap(function (x) {return x.values()});
  }
