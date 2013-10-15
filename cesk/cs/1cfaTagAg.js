function create1cfaTagAg()
{
  var tagAg = {};
  tagAg.toString = function () {return "1cfaTagAg"};

  tagAg.closure =
    function (node, benva)
    {
      return new ContextAddr(node.tag, benva);
    }

  tagAg.benv =
    function (node, application)
    {
      return new ContextAddr("env-"+node.tag, application.tag);
    }

  return tagAg;
}
