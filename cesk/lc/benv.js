function Benv(map)
{
  assertDefinedNotNull(map);
  this._map = map;
}

Benv.empty =
  function ()
  {
    return new Benv(HashMap.empty());
  }

Benv.prototype.isBenv = true;

Benv.prototype.toString =
  function ()
  {
    return this._map.nice();
  }

Benv.prototype.equals =
  function (x)
  {
    return (x instanceof Benv)
      && this._map.equals(x._map)
  }

Benv.prototype.hashCode =
  function ()
  {
    return this._map.hashCode();
  }

Benv.prototype.subsumes =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    return this._map.subsumes(x._map);
  }

Benv.prototype.compareTo =
  function (x)
  {
    if (this.subsumes(x))
    {
      if (x.subsumes(this))
      {
        return 0;
      }
      return 1;
    }
    if (x.subsumes(this))
    {
      return -1;
    }
    return undefined;
  }

Benv.prototype.diff = //DEBUG
  function (x)
  {
    var diff = [];
    var thisNames = this._map.keys();
    var xNames = x._map.keys();
    for (var i = 0; i < thisNames.length; i++)
    {
      var thisName = thisNames[i];
      var thisValue = this.lookup(thisName);
      var xValue = x.lookup(thisName);
      if (!thisValue.equals(xValue))
      {
        diff.push(thisName + "\t" + thisValue + " -- " + xValue);
      }
    }
    for (var i = 0; i < xNames.length; i++)
    {
      var xName = xNames[i];
      var xValue = x.lookup(xName);
      var thisValue = this.lookup(xName);
      if (thisValue === BOT)
      {
        diff.push(xName + "\t" + thisValue + " -- " + xValue);
      }
    }
    return ">>>BENV\n" + diff.join("\n") + "<<<";
  }


Benv.prototype.add =
  function (name, value)
  {
    assertDefinedNotNull(name);
    assertTrue(value instanceof Addr);
    var map = this._map.put(name, value);
    return new Benv(map);
  }

Benv.prototype.lookup =
  function (name)
  {
    return this._map.get(name, BOT);
  }

Benv.prototype.join =
  function (x)
  {
    var map = this._map.join(x._map);
    var result = new Benv(map); 
    return result;
  } 

Benv.prototype.addresses =
  function ()
  {
    var frameAddresses = this._map.values();
    return frameAddresses;
  }