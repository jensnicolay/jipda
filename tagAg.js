
function createTagAg()
{
var tagAg = {};

  tagAg.toString = function () {return "tagAg"};

  tagAg.object =
    function (node, time)
    {
      return "obj-" + node.tag;
    }

  tagAg.closure =
    function (node, benva, store, kont, c)
    {
      return "clo-" + node.tag;
    }

  tagAg.closureProtoObject =
    function (node, benva, store, kont, c)
    {
      return "proto-" + node.tag;
    }
  
  tagAg.array =
      function (node, time)
      {
        if (node.type === "NewExpression")
        {
          return "arr";
        }
        return "arr-" + node.tag;
      }
  
  tagAg.error =
      function (node, time)
      {
        return "err-" + node.tag;
      }
  
  tagAg.string =
    function (node, time)
    {
      return "str-" + node.tag;
    }

  tagAg.constructor =
    function (node, application)
    {
      return "ctr-" + node.tag;
    }
  
  tagAg.vr =
    function (node, ctx)
    {
      return "var-" + node.tag;
    }
  
  return tagAg;
}
