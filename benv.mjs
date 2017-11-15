import {HashMap, ArraySet} from './common.mjs';
import {BOT} from './lattice.mjs';

export default function Benv(map, global)
{
  this._map = map;
  this._global = global;
}

Benv.EMPTY_FRAME = HashMap.empty();

Benv.empty =
  function ()
  {
    return new Benv(Benv.EMPTY_FRAME, true);
  }

Benv.prototype.extend =
  function ()
  {
    return new Benv(this._map, false);
  }

Benv.prototype.toString =
    function ()
    {
      return this._map.toString();
    }

Benv.prototype.nice =
    function ()
    {
      return this._map.nice();
    }

Benv.prototype.equals =
  function (x)
  {
    return (x instanceof Benv)
      && this._global === x._global
      && this._map.equals(x._map)
  }

Benv.prototype.hashCode =
  function ()
  {
    var prime = 17;
    var result = 1;
    result = prime * result + this._map.hashCode();
    result = prime * result + this._global.hashCode();
    return result;
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
    if (!this._parents.equals(x._parents))
    {
      diff.push("<parents> " + this._parents + " -- " + x._parents);
    }
    return ">>>BENV\n" + diff.join("\n") + "<<<";
  }


Benv.prototype.add =
  function (name, value)
  {
    var map = this._map.put(name, value);
    return new Benv(map, this._global);
  }

Benv.prototype.lookup =
  function (name)
  {
    return this._map.get(name) || BOT;
  }

Benv.prototype.addresses =
  function ()
  {
    return ArraySet.from(this._map.values());
  }

Benv.prototype.narrow =
  function (names)
  {
    return new Benv(this._map.narrow(names), this.global);
  }