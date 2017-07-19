"use strict";

const tagCtxAlloc =
    (function ()
    {
      function Addr(node, type, ctx, ex)
      {
        this.node = node;
        this.type = type;
        this.ctx = ctx;
        this.ex = ex;
      }
      
      Addr.prototype.equals =
          function (x)
          {
            if (this === x)
            {
              return true;
            }
            return this.node === x.node
                && this.type === x.type
                && this.ctx === x.ctx
                && this.ex === x.ex
          }
          
      Addr.prototype.hashCode =
          function ()
          {
            var prime = 31;
            var result = 1;
            result = prime * result + this.node.tag;
            result = prime * result + HashCode.hashCode(this.type);
            result = prime * result + this.ctx._id;
            result = prime * result + HashCode.hashCode(this.ex);
            return result;
          }
          
      Addr.prototype.toString =
          function ()
          {
            return "@" + this.node.tag + "-" + this.ctx._id + (this.ex ? "-" + this.ex.tag : "")
          }
      
      // native allocator interface
      // function native(node, ctx)
      // {
      //   return new Addr(node, ctx);
      // }
      
      function object(node, ctx)
      {
        return new Addr(node, "obj", ctx);
      }
      
      function closure(node, ctx)
      {
        return new Addr(node, "clo", ctx);
      }
      
      function closureProtoObject(node, ctx)
      {
        return new Addr(node, "proto", ctx);
      }
      
      function array(node, ctx)
      {
        return new Addr(node, "arr", ctx);
      }
      
      function error(node, ctx)
      {
        return new Addr(node, "err", ctx);
      }
      
      function string(node, ctx)
      {
        return new Addr(node, "str", ctx);
      }
      
      function constructor(node, ctx, ex)
      {
        return new Addr(node, "crt", ctx, ex);
      }
      
      function vr(node, ctx)
      {
        return new Addr(node, "var", ctx);
      }
      
      return {object, closure, closureProtoObject, array, error, string, constructor, vr};
    })();

