function create1cfaTagAg()
{
  var tagAg = {};
  tagAg.toString = function () {return "1cfaTagAg"};
  
  tagAg.variable =
    function (node, time)
    {      
      return new ContextAddr(node.tag, time);
    }
  
  return tagAg;
}
