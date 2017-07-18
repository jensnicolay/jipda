"use strict";

const concTagCtxAlloc =
    (function ()
    {
      let counter = 0;
      
      function Addr(node, ctx, ex)
      {
        this.counter = counter++;
        this.node = node;
        this.ctx = ctx;
        this.ex = ex;
      }
      
      Addr.prototype.equals =
          function (x)
          {
            return this === x;
          }
          
      Addr.prototype.hashCode =
          function ()
          {
            return this.counter;
          }
  
      Addr.prototype.toString =
          function ()
          {
            return "@" + this.counter + "-" + this.node.tag + "-" + this.ctx._id + (this.ex ? "-" + this.ex.tag : "")
          }
      
      // native allocator interface
      function native(node, ctx)
      {
        return new Addr(node, ctx);
      }
      
      function object(node, ctx)
      {
        return new Addr(node, ctx);
      }
      
      function closure(node, ctx)
      {
        return new Addr(node, ctx);
      }
      
      function closureProtoObject(node, ctx)
      {
        return new Addr(node, ctx);
      }
      
      function array(node, ctx)
      {
        return new Addr(node, ctx);
      }
      
      function error(node, ctx)
      {
        return new Addr(node, ctx);
      }
      
      function string(node, ctx)
      {
        return new Addr(node, ctx);
      }
      
      function constructor(node, ctx, ex)
      {
        return new Addr(node, ctx, ex);
      }
      
      function vr(node, ctx)
      {
        return new Addr(node, ctx);
      }
      
      return {native, object, closure, closureProtoObject, array, error, string, constructor, vr};
    })();

