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

Benv.prototype.equals =
  function (x)
  {
    return (x instanceof Benv)
      && this._map.equals(x._map);
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
    return new Benv(map);
  }

Benv.prototype.lookup =
  function (a)
  {
    return this._map.get(a);
  }

Benv.prototype.addresses =
  function ()
  {
    return this._map.values().flatMap(function (value) {return value.addresses()});
  }