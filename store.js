"use strict";
"use strong";

function Store(map)
{
  this.map = map;
}

Store.empty =
  function ()
  {
    return new Store(HashMap.empty());
  }

Store.prototype.equals =
  function (x)
  {
    if (!(x instanceof Store))
    {
      return false;
    }
    return this.map.equals(x.map);
  }

Store.prototype.hashCode =
  function ()
  {
    return this.map.hashCode();
  }

//Store.prototype.compareTo =
//  function (x)
//  {
//    return Lattice.subsumeComparison(this, x);
//  }
  
Store.prototype.subsumes =
  function (x)
  {
    if (!(x instanceof Store))
    {
      return false;
    }
    return this.map.subsumes(x.map);
  }

Store.prototype.diff = // debug
  function (x)
  {
    const diff = [];
    const entries = this.map.entries();
    for (let i = 0; i < entries.length; i++)
    {
      const entry = entries[i];
      const address = entry[0];
      const value = entry[1];
      const xvalue = x.map.get(address);
      if (xvalue)
      {
        if (!value.equals(xvalue))
        {
//          else
//          {
            diff.push(address + ":\n\t" + value + "\n\t" + xvalue);            
//          }
          if (value.aval.isBenv && xvalue.aval.isBenv)
          {
            diff.push(value.aval.diff(xvalue.aval))
          }
        }
      }
      else
      {
        diff.push(address + ":\n\t" + value + "\n\t<undefined>");
      }
    }
    const xentries = x.map.entries();
    for (i = 0; i < xentries.length; i++)
    {
      const xentry = xentries[i];
      const address = xentry[0];
      const xvalue = xentry[1];
      const value = this.map.get(address);
      if (!value)
      {
        diff.push(address + ":\n\t<undefined>\n\t" + xvalue);
      }
    }
    return diff.join("\n");
  }

Store.prototype.toString =
  function ()
  {
    return this.map.toString();
  }

Store.prototype.nice =
  function ()
  {
    return this.map.nice(); 
  }

Store.prototype.lookupAval =
  function (address)
  {
    const value = this.map.get(address);
    if (value)
    {
      return value;
    }
    throw new Error("no value at address " + address + "\n" + this.nice());
  }
  
Store.prototype.allocAval =
  function (address, aval)
  {
    const map = this.map;
    const newValue = (map.get(address) || BOT).join(aval);
    return new Store(map.put(address, newValue));
  }
    
Store.prototype.updateAval =
  function (address, aval)
  {
    const map = this.map;
    const value = map.get(address);
    if (value === undefined)
    {
      throw new Error("no value at address " + address);  
    }
    return new Store(map.put(address, value.join(aval)));
  }
  
//Store.prototype.join =
//  function (store)
//  {
//    return new Store(this.map.join(result.map));
//  }

Store.prototype.narrow =
  function (addresses)
  {
    return new Store(this.map.narrow(addresses));
  }

Store.prototype.keys =
  function ()
  {
    return this.map.keys();
  }
