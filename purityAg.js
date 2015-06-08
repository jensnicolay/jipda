
function createPurityAg(ast)
{
var purityAg = {};

  purityAg.toString = function () {return "purityAg"};

  purityAg.object =
    function (node, time)
    {
      return "obj-"+node.tag;
    }

  purityAg.closure =
    function (node, benva, store, kont, c)
    {
      return "clo-" + node.tag;
    }

  purityAg.closureProtoObject =
    function (node, benva, store, kont, c)
    {
      return "proto-" + node.tag;
    }

  purityAg.array =
    function (node, time)
    {
      if (node.type === "NewExpression")
      {
        return "arr";
      }
      return "arr-" + node.tag;
    }

  purityAg.string =
    function (node, time)
    {
      return "str-" + node.tag;
    }

  purityAg.constructor =
    function (node, application)
    {
      return "ctr-" + application.tag;
    }
  
  purityAg.vr =
    function (node, ctx)
    {
      return "var-" + node.tag;
    }
  
  return purityAg;
}
