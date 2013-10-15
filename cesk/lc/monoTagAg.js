function createMonoTagAg()
{
  var tagAg = {};
  tagAg.toString = function () {return "monoTagAg"};
  
  tagAg.variable =
    function (node)
    {
      return new MonoAddr(node.tag);
    }
  
  tagAg.procedure =
    function (node)
    {
      return new MonoAddr("proc-" + node.tag);
    }

  return tagAg;
}
