function createMonoTagAg()
{
  var a = {};
  a.toString = function () {return "monoTagAg"};
  
  a.variable =
    function (node, time)
    {
      return new MonoAddr(node.tag);
    }
  
  return a;
}
