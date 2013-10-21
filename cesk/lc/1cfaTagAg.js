function create1cfaTagAg()
{
  var a = {};
  a.toString = function () {return "1cfaTagAg"};
  
  a.variable =
    function (node, time)
    {      
      return new ContextAddr(node.tag, time);
    }
  
  return a;
}
