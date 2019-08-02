import {BOT} from './lattice';
import {Maps} from "./common";

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
  // reminder: `alloc` and `update` only create new `Store` instance when actual change occurs,
  // therefore in monotonic scenario `===` can be used to check store equality (mucho cheaper!)
  function (x)
  {
    console.warn("unintended?");
    if (!(x instanceof Store))
    {
      return false;
    }
    return Maps.equals(this.map, x.map, (x, y) => x.equals(y));
  }

Store.prototype.subsumes =
  function (x)
  {
    if (!(x instanceof Store))
    {
      return false;
    }
    return Maps.subsumes(this.map, x.map, x.subsumes(y), BOT);
  }

// Store.prototype.join =
//     function (store)
//     {
//       return new Store(this.map.join(store.map, BOT));
//     }

// Store.prototype.diff = // debug
//   function (x)
//   {
//     const diff = [];
//     const entries = this.map.entries();
//     for (let i = 0; i < entries.length; i++)
//     {
//       const entry = entries[i];
//       const address = entry[0];
//       const value = entry[1];
//       const xvalue = x.map.get(address);
//       if (xvalue)
//       {
//         if (!value.equals(xvalue))
//         {
// //          else
// //          {
//             diff.push(address + ":\n\t" + value + "\n\t" + xvalue);
// //          }
//           if (value.constructor.name === "Obj" && xvalue.constructor.name === "Obj")
//           {
//             diff.push(value.diff(xvalue))
//           }
//         }
//       }
//       else
//       {
//         diff.push(address + ":\n\t" + value + "\n\t<undefined>");
//       }
//     }
//     const xentries = x.map.entries();
//     for (let i = 0; i < xentries.length; i++)
//     {
//       const xentry = xentries[i];
//       const address = xentry[0];
//       const xvalue = xentry[1];
//       const value = this.map.get(address);
//       if (!value)
//       {
//         diff.push(address + ":\n\t<undefined>\n\t" + xvalue);
//       }
//     }
//     return diff.join("\n");
//   }

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
  function (address)
  {
    const value = this.map.get(address);
    if (value)
    {
      return value;
    }
    throw new Error("no value at address " + address + "\n" + this.nice());
  }
  
Store.prototype.alloc =
  function (addr, value)
  {
    const map = this.map;
    const current = map.get(addr);
    if (current)
    {
      const updated = current.join(value);
      if (current.equals(updated))
      {
        return [this, false];
      }
      const map2 = new Map(map);
      map2.set(addr, updated);
      return [new Store(map2), true];
    }
    const map2 = new Map(map);
    map2.set(addr, value);
    return [new Store(map2), true];
  }
    
Store.prototype.update =
  function (addr, value)
  {
    const map = this.map;
    const current = map.get(addr);
    const updated = current.update(value);
    if (current.equals(updated))
    {
      return [this, false];
    }
    const map2 = new Map(map);
    map2.set(addr, updated);
    return [new Store(map2), true];
  }
  
Store.prototype.narrow =
  function (addresses)
  {
    throw new Error("TODO");
    // return new Store(this.map.narrow(addresses));
  }