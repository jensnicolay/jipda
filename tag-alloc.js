"use strict";


const tagAlloc =
    (function ()
    {


    function object(node, time)
      {
        return "obj-" + node.tag;
      }
  
    function closure(node, benva, store, kont, c)
      {
        return "clo-" + node.tag;
      }
  
    function closureProtoObject(node, benva, store, kont, c)
      {
        return "proto-" + node.tag;
      }
    
    function array(node, time)
        {
          if (node.type === "NewExpression")
          {
            return "arr";
          }
          return "arr-" + node.tag;
        }
    
    function error(node, time)
        {
          return "err-" + node.tag;
        }
    
    function string(node, time)
      {
        return "str-" + node.tag;
      }
  
    function constructor(node, application)
      {
        return "ctr-" + node.tag;
      }
    
    function vr(node, ctx)
      {
        return "var-" + node.tag;
      }
      
      return {object, closure, closureProtoObject, array, error, string, constructor, vr};
})()
