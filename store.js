"use strict";

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
    var diff = [];
    var entries = this.map.entries();
    for (var i = 0; i < entries.length; i++)
    {
      var entry = entries[i];
      var address = entry[0];
      var value = entry[1];
      var xvalue = x.map.get(address);
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
    var xentries = x.map.entries();
    for (i = 0; i < xentries.length; i++)
    {
      var xentry = xentries[i];
      address = xentry[0];
      xvalue = xentry[1];
      var value = this.map.get(address);
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
    var value = this.map.get(address);
    if (value)
    {
      return value;
    }
    throw new Error("no value at address " + address + "\n" + this.nice());
  }
  
Store.prototype.allocAval =
  function (address, aval)
  {
    var map = this.map;
    var newValue = (map.get(address) || BOT).join(aval);
    return new Store(map.put(address, newValue));
  }
    
Store.prototype.updateAval =
  function (address, aval)
  {
    var map = this.map;
    var value = map.get(address);
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
