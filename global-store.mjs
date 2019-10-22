import {BOT} from './lattice.mjs';
import {Sets, Maps, assertDefinedNotNull} from "./common.mjs";

export default function Store(i, map, globali)
{
  this.i = i; // local
  this.map = map; // global
  this.globali = globali; // global
}

Store.from =
  function (store)
  {
    return new Store(0,  new Map(store), {i:0});
  }

Store.prototype.equals =
  function (x)
  {
    return this.i === x.i;
  }

Store.prototype.toString =
  function ()
  {
    return "global@" + this.i;
  }

Store.prototype.lookup =
    function (addr)
    {
      const value = this.map.get(addr);
      if (value)
      {
        return value;
      }
      throw new Error("address not found: " + addr);
    }

Store.prototype.alloc =
    function (addr, value)
    {
      if (this.map.has(addr))
      {
        const current = this.map.get(addr);
        const updated = current.join(value);
        if (!current.equals(updated))
        {
          this.map.set(addr, updated);
          this.globali.i++;
          return new Store(this.globali.i, this.map, this.globali);
        }
        return this;
      }
      this.map.set(addr, value);
      this.globali.i++;
      return new Store(this.globali.i, this.map, this.globali);
    }   

  Store.prototype.update =
    function (addr, value)
    {
      const current = this.map.get(addr);
      const updated = current.join(value);
      if (!current.equals(updated))
      {
        this.map.set(addr, updated);
        this.globali.i++;
        return new Store(this.globali.i, this.map, this.globali);
      }
      return this;
    }

Store.prototype.has =
    function (addr)
    {
      return this.map.has(addr);
    }

Store.prototype[Symbol.iterator] =
    function* ()
    {
      yield* this.map;
    }
