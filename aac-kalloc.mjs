import {assertDefinedNotNull} from './common.mjs';

export default function (callable, operandValues, store)
{
  return new Context(callable, operandValues, store);
}


function Context(callable, operandValues, store)
{
  assertDefinedNotNull(callable);
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
