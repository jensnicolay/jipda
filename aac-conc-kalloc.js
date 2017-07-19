"use strict";

const aacConcKalloc =
    (function ()
    {
      
      let counter = 0;
      
      function Context(callable, operandValues, store)
      {
        assertDefinedNotNull(callable);
        this.callable = callable;
        this.operandValues = operandValues;
        this.store = store;
        this.counter = counter++;
      }
      
      Context.prototype.equals =
          function (other)
          {
            if (this === other)
            {
              return true;
            }
            return this.counter === other.counter
                && this.callable.equals(other.callable)
                && this.operandValues.equals(other.operandValues)
                && this.store.equals(other.store)
          }
      
      return function (callable, operandValues, store)
      {
        return new Context(callable, operandValues, store);
      }
    })();
