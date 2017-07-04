"use strict";


const tagAlloc =
    (function ()
    {


    function object(node)
      {
        return "obj-" + node.tag;
      }
  
    function closure(node)
      {
        return "clo-" + node.tag;
      }
  
    function closureProtoObject(node)
      {
        return "proto-" + node.tag;
      }
    
    function array(node)
        {
          if (node.type === "NewExpression")
          {
            return "arr";
          }
          return "arr-" + node.tag;
        }
    
    function error(node)
        {
          return "err-" + node.tag;
        }
    
    function string(node)
      {
        return "str-" + node.tag;
      }
  
    function constructor(node)
      {
        return "ctr-" + node.tag;
      }
    
    function vr(node)
      {
        return "var-" + node.tag;
      }
      
      return {object, closure, closureProtoObject, array, error, string, constructor, vr};
})()
