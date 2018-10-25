import {TrieMap} from './common';
import {BOT} from './lattice';

function StoreValue(aval, fresh)
{
  this.aval = aval;
  this.fresh = (fresh === undefined) ? 1 : fresh;
}

StoreValue.aval =
  function (storeValue)
  {
    return storeValue.aval;
  }

StoreValue.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    return this.aval.equals(x.aval)
      && this.fresh === x.fresh
  }

StoreValue.prototype.hashCode =
  function ()
  {
    const prime = 31;
    let result = 1;
    result = prime * result + this.aval.hashCode();
    result = prime * result + this.fresh;
    return result;    
  }

StoreValue.prototype.subsumes =
  function (x)
  {
    return this.aval.subsumes(x.aval);
  }

StoreValue.prototype.compareTo =
  function (x)
  {
    return this.aval.compareTo(x.aval);
  }

StoreValue.prototype.toString =
  function ()
  {
    return this.aval.toString();
  }

StoreValue.prototype.update =
  function (aval)
  {
    if (this.fresh === 1)
    {
      return this.strongUpdate(aval);
    }
    return this.weakUpdate(aval);
  }
  
StoreValue.prototype.strongUpdate =
  function (aval)
  {
    return new StoreValue(aval, 1);
  }

StoreValue.prototype.weakUpdate =
  function (aval)
  {
    return new StoreValue(this.aval.join(aval), 2);
  }

StoreValue.prototype.join =
  function (x)
  {
    if (x === BOT)
    {
      return this;
    }
    return new StoreValue(this.aval.join(x.aval), Math.max(this.fresh, x.fresh));
  }
  
//StoreValue.prototype.reset =
//  function ()
//  {
//    return new StoreValue(BOT, 0);      
//  }

StoreValue.prototype.addresses =
  function ()
  {
    return this.aval.addresses();
  }
  

///////////////


export default function Store(map)
{
  this.map = map;
}

Store.empty =
  function ()
  {
    return new Store(TrieMap.empty());
  }

Store.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
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
            diff.push(address + ":\n\t" + value + " (" + value.fresh + ")\n\t" + xvalue + " (" + xvalue.fresh + ")");            
//          }
          if (value.aval.isBenv && xvalue.aval.isBenv)
          {
            diff.push(value.aval.diff(xvalue.aval))
          }
        }
      }
      else
      {
        diff.push(address + ":\n\t" + value + " (" + value.fresh + ")\n\t<undefined>");
      }
    }
    const xentries = x.map.entries();
    for (let i = 0; i < xentries.length; i++)
    {
      const xentry = xentries[i];
      const address = xentry[0];
      const xvalue = xentry[1];
      const value = this.map.get(address);
      if (!value)
      {
        diff.push(address + ":\n\t<undefined>\n\t" + xvalue + " (" + xvalue.fresh + ")");
      }
    }
    return diff.join("\n");
  }

Store.prototype.toString =
  function ()
  {
    const entries = this.map.entries();
    return "{" + entries.map(
      function (entry)
      {
        return entry[0] + " =" + entry[1].fresh + "=> " + entry[1];
      }).join(",") + "}";
  }

Store.prototype.nice =
  function ()
  {
    const entries = this.map.entries();
    return "\n{\n" + entries.map(
      function (entry)
      {
        return entry[0] + " =" + entry[1].fresh + "=> " + entry[1];
      }).join("\n") + "\n}";
  }

Store.prototype.lookupAval =
  function (address)
  {
    const value = this.map.get(address);
    if (value)
    {
      return value.aval;
    }
    throw new Error("address not found:" + address);
  };
  
Store.prototype.allocAval =
  function (address, aval)
  {
    const value = this.map.get(address);
    if (value && value.fresh !== 0)
    {
      const weaklyUpdatedValue = value.weakUpdate(aval);
      const store = new Store(this.map.put(address, weaklyUpdatedValue)); 
      return store;
    }
    const newValue = new StoreValue(aval);
    return new Store(this.map.put(address, newValue));
  };
      
Store.prototype.weakAllocAval =
  function (address, aval)
  {
    const value = this.map.get(address);
    const weaklyUpdatedValue = value ? value.weakUpdate(aval) : new StoreValue(aval, 2);
    const store = new Store(this.map.put(address, weaklyUpdatedValue)); 
    return store;
  };
        
Store.prototype.updateAval =
  function (address, aval)
  {
    const value = this.map.get(address);
    if (value)
    {
      const updatedValue = value.update(aval);
//      print("UPDATED", address, updatedValue);
      return new Store(this.map.put(address, updatedValue));
    }
    throw new Error("Store.updateAval: no abstract value at address " + address);
  };
  
Store.prototype.join =
  function (store)
  {
    return new Store(this.map.join(store.map, BOT));
  }

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

Store.prototype.toJSON =
    function (key)
    {
      const entries = this.map.entries();
      return entries.map(
          function (entry)
          {
            return {key: entry[0], value: entry[1].aval};
          });
    }