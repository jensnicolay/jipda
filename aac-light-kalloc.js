"use strict";

const aacLightKalloc =
    (function ()
    {
      
      function Context(callable, operandValues)
      {
        assertDefinedNotNull(callable);
        this.callable = callable;
        this.operandValues = operandValues;
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
          }
      
      return function (callable, operandValues, store)
      {
        return new Context(callable, operandValues);
      }
    })();
