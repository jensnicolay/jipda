import {BOT} from './lattice.mjs';
import {Sets, Maps, assertFalse} from "./common.mjs";

function Entry(value, fresh)
{
  // assertFalse(value === BOT && fresh === false);
  this.value = value;
  this.fresh = fresh;
}

Entry.prototype.equals =
  function (other)
  {
    if (this === other)
    {
      return true;
    }
    return this.value.equals(other.value)
      && this.fresh === other.fresh;
  }

Entry.prototype.hashCode =
  function ()
  {
    var prime = 31;
    var result = 1;
    result = prime * result + this.value.hashCode();
    result = prime * result + Hashcode.hashCode(this.fresh);
    return result;
}

Entry.prototype.join =
  function (other)
  {
    if (other === BOT)
    {
      return this;
    }
    return new Entry(this.value.join(other.value), this.fresh && other.fresh);
  }

Entry.prototype.subsumes =
  function (other)
  {
    if (other === BOT)
    {
      return true;
    }
    return this.value.subsumes(other.value) && (!this.fresh || other.fresh);
  }

Entry.prototype.toString =
  function ()
  {
    return "[" + this.value + ", fresh: " + this.fresh + "]";
  }

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
      const entry = this.map.get(addr);
      return entry ? entry.value : undefined;
    }

Store.prototype.alloc =
    function (addr, value)
    {
      const existingEntry = this.map.get(addr);
      const newMap = new Map(this.map);
      if (existingEntry)
      {
        newMap.set(addr, new Entry(existingEntry.value.join(value), false));
      }
      else
      {
        newMap.set(addr, new Entry(value, true));
      }
      return new Store(newMap);
    }

  Store.prototype.update =
    function (addr, value)
    {
      const existingEntry = this.map.get(addr);
      if (existingEntry)
      {
        const newMap = new Map(this.map);
        if (existingEntry.fresh)
        {
          newMap.set(addr, new Entry(value, true));
        }
        else
        {
          newMap.set(addr, new Entry(existingEntry.value.join(value), false));
        }
        return new Store(newMap);
      }
      else
      {
        console.warn("addr " + addr + " does not exist");
        return undefined;
        // const newMap = new Map(this.map);
        // newMap.set(addr, new Entry(value, true));
        // return new Store(newMap);        
        //throw new Error("addr " + addr + " does not exist");
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