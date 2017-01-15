const aacKalloc =
    (function ()
    {
      
      function Context(callable, operandValues, store)
      {
        this.callable = callable;
        this.operandValues = operandValues;
        this.store = store;
      }
      
      Context.prototype.equals =
          function (other)
          {
            if (this === other)
            {
              return true;
            }
            return this.callable.equals(other.callable)
              && this.operandValues.equals(other.operandValues)
              && this.store.equals(other.store)
          }
          
      return function (callable, operandValues, store)
      {
        return new Context(callable, operandValues, store);
      }
    })();

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
