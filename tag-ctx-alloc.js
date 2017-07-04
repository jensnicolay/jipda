"use strict";


const tagCtxAlloc =
    (function ()
    {


    function object(node, kont)
      {
        return "obj-" + node.tag + "-" + kont._id;
      }
  
    function closure(node, kont)
      {
        return "clo-" + node.tag + "-" + kont._id;
      }
  
    function closureProtoObject(node, kont)
      {
        return "proto-" + node.tag + "-" + kont._id;
      }
    
    function array(node, kont)
        {
          return "arr-" + node.tag + "-" + kont._id;
        }
      
    function error(node, kont)
        {
          return "err-" + node.tag + "-" + kont._id;
        }
    
    function string(node, kont)
      {
        return "str-" + node.tag + "-" + kont._id;
      }
  
    function constructor(node, kont, ex)
      {
        return "ctr-" + node.tag + "-" + kont._id + "-" + ex.tag;
      }
    
    function vr(node, kont)
      {
        return "var-" + node.tag + "-" + kont._id;
      }
      
      return {object, closure, closureProtoObject, array, error, string, constructor, vr};
})()
