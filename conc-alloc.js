"use strict";

const concAlloc =
    (function ()
    {
      let counter = 0;
  
      // native allocator interface
      function native()
      {
        return counter++;
      }
  
      function object()
      {
        return counter++;
      }
  
      function closure()
      {
        return counter++;
      }
  
      function closureProtoObject()
      {
        return counter++;
      }
  
      function array()
      {
        return counter++;
      }
  
      function error()
      {
        return counter++;
      }
  
      function string()
      {
        return counter++;
      }
  
      function constructor()
      {
        return counter++;
      }
  
      function vr()
      {
        return counter++;
      }
      
      return {native, object, closure, closureProtoObject, array, error, string, constructor, vr};
    })();

