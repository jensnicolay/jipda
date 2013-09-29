function Benv(map, parenta)
{
  assertDefinedNotNull(map);
  this._map = map;
  this.parenta = parenta; 
}

Benv.empty =
  function (parenta)
  {
    return new Benv(HashMap.empty(), parenta);
  }

Benv.prototype.toString =
  function ()
  {
    return this._map.nice();
  }

Benv.prototype.equals =
  function (x)
  {
    return (x instanceof Benv)
      && this._map.equals(x._map);
  }

Benv.prototype.subsumes =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (!this.parents.subsumes(x.parents)) 
    {
      return false;
    }
    var entries = this._map.entries();
    for (var i = 0; i < entries.length; i++)
    {
      var thisEntry = entries[i];
      var thisName = thisEntry.key;
      var thisValue = thisEntry.value;
      var xValue = x.lookup(thisName);
      if (!thisValue.subsumes(xValue))
      {
        return false;
      }
    }
    return true;
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

Benv.prototype.hashCode =
  function ()
  {
    return this._map.hashCode();
  }

Benv.prototype.subsumes =
  function (x)
  {
    return this._map.subsumes(x._map);
  }

Benv.prototype.add =
  function (a, value)
  {
    var map = this._map.put(a, value);
    return new Benv(map, this.parenta);
  }

Benv.prototype.lookup =
  function (a)
  {
    return this._map.get(a);
  }

Benv.prototype.addresses =
  function ()
  {
    return this.parenta ? [this.parenta].concat(this._map.values()) : this._map.values();
  }