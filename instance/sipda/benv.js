function Benv(map, parentas)
{
  assertDefinedNotNull(map);
  assertFalse(Arrays.contains(undefined, map.values(), Eq.equals));
  this._map = map;
  this.parentas = parentas; 
}

Benv.empty =
  function (parenta)
  {
    return new Benv(HashMap.empty(), parenta ? [parenta] : []);
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
      && Eq.equals(this.parentas, x.parentas)
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
    if (!this.parentas.subsumes(x.parentas)) 
    {
      return false;
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

Benv.prototype.add =
  function (name, a)
  {
    assertDefinedNotNull(name);
    assertDefinedNotNull(a);
    var map = this._map.put(name, [a]);
    return new Benv(map, this.parentas);
  }

Benv.prototype.lookup =
  function (name)
  {
    return this._map.get(name, []);
  }

Benv.prototype.join =
  function (x)
  {
    return new Benv(this._map.joinWith(x._map, function (y, z) {return Arrays.union(y, z, Eq.equals)}, []), Arrays.union(this.parentas, x.parentas, Eq.equals));
  } 

Benv.prototype.addresses =
  function ()
  {
    return this.parentas.concat(this._map.values().flatten());
  }