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
    return this.aval.equals(x.aval);
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
  
StoreValue.prototype.reset =
  function ()
  {
    return new StoreValue(BOT, 0);      
  }

StoreValue.prototype.addresses =
  function ()
  {
    return this.aval.addresses();
  }
  

///////////////


function Store(map)
{
  this.map = map || HashMap.empty(31);
}

Store.prototype.equals =
  function (x)
  {
    return this.compareTo(x) === 0;
  }

Store.prototype.compareTo =
  function (x)
  {
    return Lattice.subsumeComparison(this, x);
  }
  
Store.prototype.subsumes =
  function (x)
  {
    var xentries = x.map.entries();
    for (var i = 0; i < xentries.length; i++)
    {
      var xentry = xentries[i];
      var address = xentry.key;
      var thisStoreValue = this.map.get(address);
      if (!thisStoreValue)
      {
        return false;
      }
      var xStoreValue = xentry.value;
      var c = xStoreValue.compareTo(thisStoreValue);
      if (c === undefined || c > 0)
      {
        return false;
      }
    }
    return true;
  }

Store.prototype.diff = // debug
  function (x)
  {
    var diff = [];
    var entries = this.map.entries();
    for (var i = 0; i < entries.length; i++)
    {
      var entry = entries[i];
      var address = entry.key;
      var value = entry.value;
      var xvalue = x.map.get(address);
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
    var xentries = x.map.entries();
    for (i = 0; i < xentries.length; i++)
    {
      xentry = xentries[i];
      address = xentry.key;
      xvalue = xentry.value;
      var value = this.map.get(address);
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
    var entries = this.map.entries();
    return "{" + entries.map(
      function (entry)
      {
        return entry.key + " =" + entry.value.fresh + "=> " + entry.value;
      }).join(",") + "}";
  }

Store.prototype.nice =
  function ()
  {
  var entries = this.map.entries();
    return "\n{\n" + entries.map(
      function (entry)
      {
        return entry.key + " =" + entry.value.fresh + "=> " + entry.value;
      }).join("\n") + "\n}";
  }

Store.prototype.lookupAval =
  function (address)
  {
    var value = this.map.get(address);
    if (value)
    {
      return value.aval;
    }
    throw new Error("Store.lookupAval: no abstract value for address " + address + "\n" + this.nice());
  };
  
Store.prototype.allocAval =
  function (address, aval, undef)
  {
    assertDefinedNotNull(address);
    assertDefinedNotNull(aval);
    var value = this.map.get(address);
    if (value && value.fresh !== 0)
    {
      var weaklyUpdatedValue = value.weakUpdate(aval);
//      print("REALLOCATED", address, weaklyUpdatedValue);
      var store = new Store(this.map.put(address, weaklyUpdatedValue)); 
      store.weak = true; // hackety hack?
      return store;
    }
    var newValue = new StoreValue(aval);
//    print("ALLOCATED", address, newValue);
    return new Store(this.map.put(address, newValue));
  };
  
Store.prototype.updateAval =
  function (address, aval, msg)
  {
    var value = this.map.get(address);
    if (value)
    {
      var updatedValue = value.update(aval);
//      print("UPDATED", address, updatedValue);
      return new Store(this.map.put(address, updatedValue));
    }
    throw new Error("Store.updateAval: no abstract value at address " + address);
  };
  
Store.prototype.join =
  function (store)
  {
    if (store === BOT)
    {
      return this;
    }
    var result = this.map.clear();
    var addresses = this.map.keys().concat(store.map.keys()).toSet();
    addresses.forEach(
      function (address)
      {
        var thisValue = this.map.get(address) || BOT;
        var otherValue = store.map.get(address) || BOT;
        var joinedValue = thisValue.join(otherValue);
        result = result.put(address, joinedValue);
      }, this);
    return new Store(result);
  }

Store.prototype.narrow =
  function (addresses)
  {
    var result = this.map.clear();
    var entries = this.map.entries();
    for (var i = 0; i < entries.length; i++)
    {
      var entry = entries[i];
      var address = entry.key;
      if (addresses.memberAt(address) > -1)
      {
        result = result.put(address, entry.value);
      }
//      else // DEBUG
//      {
//        print("dropping", entry.key, entry.value);
//      }
    }
    return new Store(result);
  }
//
//Store.prototype.addresses =
//  function ()
//  {
//    return this.map.values().flatMap(function (value) {return value.addresses()});
//  }
