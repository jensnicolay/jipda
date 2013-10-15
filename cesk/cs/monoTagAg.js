function createMonoTagAg()
{
  var tagAg = {};
  tagAg.toString = function () {return "monoTagAg"};
  
  tagAg.closure =
    function (node)
    {
      return new MonoAddr(node.tag);
    }

  tagAg.benv =
    function (node)
    {
      return new MonoAddr("env-"+node.tag);
    }

  return tagAg;
}
