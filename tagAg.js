
function createTagAg()
{
var tagAg = {};

  tagAg.toString = function () {return "tagAg"};

  tagAg.object =
    function (node, time)
    {
      return node.tag;
    }

  tagAg.closure =
    function (node, benva, store, kont, c)
    {
      return node.tag;
    }

  tagAg.closureProtoObject =
    function (node, benva, store, kont, c)
    {
      // +"-proto" to avoid clash with 'closure'
      return node.tag;
    }

  tagAg.array =
    function (node, time)
    {
//      return "arr@"+node.tag;
      return node.tag;
    }

  tagAg.string =
    function (node, time)
    {
      return node.tag;
    }

  tagAg.constructor =
    function (node, time)
    {
      return node.tag + 10000;
    }
  
  tagAg.vr =
    function (node, ctx)
    {
      return node.tag;
    }
  

  
  return tagAg;
}
