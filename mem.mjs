function ObjGraoh(map = new Map(), successors = new Map())
{
  this.obj = obj;
  this.successors = successors;
}

ObjGraph.prototype.operation =
    function (op, ...args)
    {
      const opObj = [op].concat(args);
      const successor = successors.get(op);
  if (successor)
  {
    return successor;
  }
  const updatedMap = new Map(this.map);
  updatedMap.set(address, value);
  const successor = new Store(updatedMap);
  this.successors.set(op, successor);
}