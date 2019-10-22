import {BOT} from './lattice.mjs';
import {Sets, Maps, assertDefinedNotNull} from "./common.mjs";

export default function Store(map)
{
  this.map = map;
}

Store.empty =
  function ()
  {
    return new Store(new Map());
  }

Store.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    return Maps.equals(this.map, x.map, (x, y) => x.equals(y));
  }

Store.prototype.subsumes =
  function (x)
  {
    return Maps.subsumes(this.map, x.map, (x, y) => x.subsumes(y), BOT);
  }

Store.prototype.join =
    function (other)
    {
      return new Store(Maps.join(this.map, other.map, (x ,y) => x.join(y), BOT));
    }

Store.prototype.diff = // debug
  function (x)
  {
    const thisas = new Set(this.map.keys());
    const xas = new Set(x.map.keys());
    
    const as = Sets.union(thisas, xas);
    for (const a of as)
    {
      const thisvalue = this.map.get(a);
      const xvalue = x.map.get(a);
      if (thisvalue)
      {
        if (xvalue)
        {
          if (!thisvalue.equals(xvalue))
          {
            console.log(a + ":\n\t" + thisvalue + "\n\t" + xvalue);
            if (thisvalue.constructor.name === "Obj" && xvalue.constructor.name === "Obj")
            {
              console.log(thisvalue.diff(xvalue));
            }
          }
        }
        else
        {
          console.log(a + ":\n\t" + thisvalue + "\n\t<undefined>");
        }
      }
      else
      {
        console.log(a + ":\n\t<undefined>\n\t" + xvalue);
      }
    }
  }

Store.prototype.toString =
  function ()
  {
    return String(this.map);
  }

Store.prototype.nice =
  function ()
  {
    return String(this.map);
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
      const existingValue = this.map.get(addr);
      const newMap = new Map(this.map);
      if (existingValue)
      {
        newMap.set(addr, existingValue.join(value));
      }
      else
      {
        newMap.set(addr, value);
      }
      return new Store(newMap);
    }

  Store.prototype.update =
    function (addr, value)
    {
      const existingValue = this.map.get(addr);
      if (existingValue)
      {
        const newMap = new Map(this.map);
        newMap.set(addr, existingValue.join(value));
        return new Store(newMap);
      }
      else
      {
        throw new Error("addr " + addr + " does not exist");
      }
    }

Store.prototype.has =
    function (addr)
    {
      return this.map.has(addr);
    }

Store.prototype.narrow =
    function (addresses)
    {
      const newMap = new Map();
      for (const [key, value] of this.map)
      {
        if (addresses.contains(key))
        {
          newMap.set(key, value);
        }
      }
      return new Store(newMap);
    }