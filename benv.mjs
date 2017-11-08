import {Maps} from './common';

export default function Benv(map)
{
  this.map = map;
}


function Benv(map = new Map())
{
  this.map = map;
}

Benv.prototype.get =
  function (name)
  {
    const address = this.map.get(address);
    if (entry)
    {
      return entry.value;
    }
    throw new Error("address not found:" + address);
  };
  
Store.prototype.alloc =
  function (address, value)
  {
    const existingEntry = this.map.get(address);
    if (existingEntry)
    {
      const existingValue = existingEntry.value;
      if (existingEntry.fresh)
      {
        const updatedMap = new Map(this.map);
        if (existingValue.equals(value))
        {
          const updatedEntry = {fresh:false, value}
          updatedMap.set(address, updatedEntry);
          return new Store(updatedMap);
        }
        const updatedEntry = {fresh:false, value:existingEntry.value.join(value)}
        updatedMap.set(address, updatedEntry);
        return new Store(updatedMap);
      }
      else
      {
        if (existingValue.equals(value))
        {
          return this;
        }
        const updatedMap = new Map(this.map);
        const updatedEntry = {fresh:false, value:existingEntry.value.join(value)}
        updatedMap.set(address, updatedEntry);
        return new Store(updatedMap);
      }
    }
    const updatedMap = new Map(this.map);
    const entry = {fresh:true, value};
    updatedMap.set(address, entry);
    return new Store(updatedMap);
  };
      
  
Store.prototype.update =
  function (address, aval)
  {
    const existingEntry = this.map.get(address);
    if (existingEntry)
    {
      const existingValue = existingEntry.value;
      if (existingValue.equals(value))
      {
        return this;
      }
      const updatedMap = new Map(this.map);
      if (existingEntry.fresh)
      {
        const updatedEntry = {fresh:true, value}
        updatedMap.set(address, updatedEntry);
        return new Store(updatedMap);
      }
      const updatedEntry = {fresh:false, value:existingEntry.value.join(value)}
      updatedMap.set(address, updatedEntry);
      return new Store(updatedMap);
    }
    throw new Error("no value at address " + address);
  };
  
Store.prototype.join =
  function (store)
  {
    return new Store(Maps.join(this.map, store.map, (x, y) => ({fresh: false, value: x.value.join(y.value)}))); // "lazy" join
  }

Store.prototype.narrow =
  function (addresses)
  {
    return new Store(Maps.narrow(this.map, addresses));
  }

Store.prototype.keys =
  function ()
  {
    return this.map.keys();
  }
