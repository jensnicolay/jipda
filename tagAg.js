
function createTagAg()
{
var tagAg = {};

  tagAg.toString = function () {return "tagAg"};

  tagAg.object =
    function (node, time)
    {
      return node.tag + 1024;
    }

  tagAg.closure =
    function (node, benva, store, kont, c)
    {
      return node.tag + 1024;
    }

  tagAg.closureProtoObject =
    function (node, benva, store, kont, c)
    {
      return node.tag + 10024;
    }

  tagAg.array =
    function (node, time)
    {
      if (node.type === "NewExpression")
      {
        return 20024;
      }
      return node.tag;
    }

  tagAg.string =
    function (node, time)
    {
      return node.tag + 1024;
    }

  tagAg.constructor =
    function (node, time)
    {
      return node.tag + 10024;
    }
  
  tagAg.vr =
    function (node, ctx)
    {
      return node.tag + 1024;
    }
  
  return tagAg;
}
