function createMonoTagAg()
{
  var tagAg = {};
  tagAg.toString = function () {return "monoTagAg"};
  
  tagAg.variable =
    function (node, application)
    {
      return new MonoAddr(node.tag);
    }
  
  return tagAg;
}
