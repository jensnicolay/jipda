import {BOT} from './lattice.mjs';
import {Maps} from "./common.mjs";

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
    // console.warn("unintended?");
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

  Store.prototype.join =
      function (other)
      {
        return new Store(Maps.join(this.map, other.map, (x ,y) => x.join(y), BOT));
      }

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

Store.prototype.get =
    function (addr)
    {
      return this.map.get(addr);
    }
Store.prototype.set =
    function (addr, value)
    {
      const newMap = new Map(this.map);
      newMap.set(addr, value);
      return new Store(newMap);
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