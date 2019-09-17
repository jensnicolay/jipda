import {HashCode, Maps, ArrayMap, ArraySet, assertDefinedNotNull, assert} from './common.mjs';
import {BOT} from './lattice.mjs';

const ABSENT = new Absent();

export function Absent()
{
}

Absent.prototype.equals =
    function (x)
    {
      return x instanceof Absent;
    }

Absent.prototype.hashCode =
    function ()
    {
      return 83;
    }

Absent.prototype.addresses =
    function ()
    {
      return EMPTY_ADDRESS_SET;
    }

Absent.prototype.join =
    function (x)
    {
      if (x instanceof Absent)
      {
        return this;
      }
      if (x instanceof Present)
      {
        if (x.isAbsent())
        {
          return x;
        }
        return new Present(x.value, false);
      }
    }

Absent.prototype.isPresent =
    function ()
    {
      return false;
    }

Absent.prototype.isAbsent =
    function ()
    {
      return true;
    }

Absent.prototype.getValue =
    function ()
    {
      return BOT;
    }

Absent.prototype.toString =
    function ()
    {
      return "[]";
    }

export function Present(value, present)
{
  assert(value !== BOT);
  assertDefinedNotNull(value.hashCode);
  assert(typeof present === "boolean");
  this.value = value;
  this.present = present;
}

Present.from =
    function (value)
    {
      return new Present(value, true);
    }

Present.prototype.equals =
    function (x)
    {
      return x instanceof Present
          && this.value.equals(x.value)
          && this.present === x.present
    }

Present.prototype.hashCode =
    function ()
    {
      const prime = 31;
      let result = 1;
      result = prime * result + this.value.hashCode();
      result = prime * result + HashCode.hashCode(this.present);
      return result;
    }

Present.prototype.addresses =
    function ()
    {
      return this.value.addresses();
    }

Present.prototype.join =
    function (x)
    {
      if (x instanceof Absent)
      {
        if (this.isAbsent())
        {
          return this;
        }
        return new Present(this.value, false);
      }
      if (x instanceof Present)
      {
        return new Present(this.value.join(x.value), this.present && x.present);
      }
      throw new Error();
    }

Present.prototype.isPresent =
    function ()
    {
      return true;
    }

Present.prototype.isAbsent =
    function ()
    {
      return !this.present;
    }

Present.prototype.getValue =
    function ()
    {
      return this.value;
    }

Present.prototype.toString =
    function ()
    {
      return this.present ? "[" + this.value + "]" : "[?" + this.value + "]"
    }

function Record(map)
{
  assertDefinedNotNull(map);
  this.map = map;
}

Record.empty =
    function ()
    {
      return new Record(new Map());
    }

Record.prototype.add =
    function (name, value)
    {
      assert(value.addresses);
      const newMap = new Map(this.map);
      newMap.set(name, Present.from(value));
      return new Record(newMap);
    }

Record.prototype.isPresent =
    function (name)
    {
      return this.map.has(name);
    }

Record.prototype.isAbsent =
    function (name)
    {
      const value = this.map.get(name);
      return !value || value.isAbsent();
    }

Record.prototype.get =
    function (name)
    {
      const value = this.map.get(name);
      return value ? value.getValue() : BOT;
    }

Record.prototype.equals =
    function (x)
    {
      if (this === x)
      {
        return true;
      }
      return Maps.equals(this.map, x.map, (x,y) => x === y || x.equals(y));
    }

Record.prototype.join =
    function (other)
    {
      const joinedMap = Maps.join(this.map, other.map, (x,y) => x.join(y), BOT); // TODO WRONG! no introduction of Absent
      return new Record(joinedMap);
    }

Record.prototype.addresses =
    function ()
    {
      let addresses = ArraySet.empty();
      this.map.forEach((value, key) => {
        addresses = addresses.join(value.addresses())
      });
      return addresses;
    }


export function Obj(cprops, aprops, internals)
{
  assertDefinedNotNull(cprops);
  assertDefinedNotNull(aprops);
  assertDefinedNotNull(internals);
  this.cprops = cprops;
  this.aprops = aprops;
  this.internals = internals;
}

Obj.empty =
    function ()
    {
      return new Obj(ArrayMap.empty(), ArrayMap.empty(), Record.empty()); // TODO: specifically written against ArrayMap! (commons.mjs)
    }

Obj.prototype.toString =
    function ()
    {
      return "<" + this.names() + ">";
    };

Obj.prototype.addInternal =
    function (name, value)
    {
      return new Obj(this.cprops, this.aprops, this.internals.add(name, value));
    }

Obj.prototype.setInternal = // TODO duplicate w.r.t. `set`? (do we need different add/update semantics?)
    function (name, value)
    {
      return new Obj(this.cprops, this.aprops, this.internals.add(name, value));
    }

Obj.prototype.internalPresent =
    function (name)
    {
      return this.internals.isPresent(name);
    }

Obj.prototype.internalAbsent =
    function (name)
    {
      return this.internals.isAbsent(name);
    }

Obj.prototype.getInternal =
    function (name)
    {
      return this.internals.get(name);
    }

Obj.prototype.addProperty =
    function (name, value)
    {
      assert(name);
      assert(name.meet);
      if (name.conc1)
      {
        // name has single concrete rep: strong update in cprops (update of entire Obj in store can still be strong or weak)
        const newCprops = this.cprops.put(name, Present.from(value));
        return new Obj(newCprops, this.aprops, this.internals);
      }
      else
      {
        // name does not have single concrete rep: weak update in aprops
        const newAprops = this.aprops.put(name, this.aprops.get(name, ABSENT).join(Present.from(value)));
        return new Obj(this.cprops, newAprops, this.internals);
      }
    }

// Obj.prototype.propertyPresent =
//     function (name)
//     {
//       // const value = this.frame.get(name);
//       // return value !== undefined && value.isPresent(); // TODO `frame.get` should return `BOT` iso. `undefined` when no prop
//       var result = BOT;
//       this.frame.iterateEntries(
//           function (entry)
//           {
//             const entryName = entry[0];
//             if (entryName.subsumes(name) || name.subsumes(entryName))
//             {
//               result = result.join(entry[1]);
//             }
//           });
//       return result !== BOT && result.isPresent();
//     }

// Obj.prototype.propertyAbsent = // TODO expensive (hiding pres/abs behind abstr)
//     function (name)
//     {
//       var result = BOT;
//       this.frame.iterateEntries(
//           function (entry)
//           {
//             const entryName = entry[0];
//             if (entryName.subsumes(name) || name.subsumes(entryName))
//             {
//               result = result.join(entry[1]);
//             }
//           });
//       return result === BOT || result.isAbsent();
//     }

Obj.prototype.getProperty =
    function (name)
    {
      if (name.conc1)
      {
        let value = this.cprops.get(name, ABSENT);

        for (const [aname, avalue] of this.aprops)
        {
          if (aname.subsumes(name))
          {
            value = value.join(avalue);
          }
        }
        return value;
      }
      else
      {
        let value = ABSENT; // looking up abstract name always incurs imprecision!
        for (const [cname, cvalue] of this.cprops)
        {
          if (name.subsumes(cname))
          {
            value = value.join(cvalue);
          }
        }

        for (const [aname, avalue] of this.aprops)
        {
          const meet = aname.meet(name);
          if (meet !== BOT)
          {
            value = value.join(avalue);
          }
        }

        return value;
      }
    }

// Obj.prototype.conc =
//     function ()
//     {
//       return [this];
//     }

Obj.prototype.join =
    function (other)
    {
      if (other === BOT)
      {
        return this;
      }

      let newCprops = ArrayMap.empty();
      const ckeys = ArraySet.from(this.cprops.keys().concat(other.cprops.keys()));
      for (const ckey of ckeys)
      {
        newCprops = newCprops.put(ckey, this.cprops.get(ckey, ABSENT).join(other.cprops.get(ckey, ABSENT)));
      }

      let newAprops = ArrayMap.empty();
      const akeys = ArraySet.from(this.aprops.keys().concat(other.aprops.keys()));
      for (const akey of akeys)
      {
        newAprops = newAprops.put(akey, this.aprops.get(akey, ABSENT).join(other.aprops.get(akey, ABSENT)));
      }

      const newInternals = this.internals.join(other.internals);

      return new Obj(newCprops, newAprops, newInternals);
    }

Obj.prototype.equals =
    function (x)
    {
      if (this === x)
      {
        return true;
      }
      return this.cprops.equals(x.cprops)
        && this.aprops.equals(x.aprops)
        && this.internals.equals(x.internals);
    }

Obj.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.cprops.hashCode();
      result = prime * result + this.aprops.hashCode();
      // result = prime * result + this.internals.hashCode(); // NYI
      return result;
    }

Obj.prototype.diff = //DEBUG
    function (x)
    {
      var diff = [];
      if (!this.frame.equals(x.frame))
      {
        diff.push("[[frame]]\t" + this.frame.diff(x.frame));
      }
      return ">>>OBJ\n" + diff.join("\n") + "<<<";
    }

Obj.prototype.names =
    function ()
    {
      return this.cprops.keys().concat(this.aprops.keys());
    }

Obj.prototype.addresses =
    function ()
    {
      let addresses = ArraySet.empty();
      this.cprops.values().forEach(function (value) {addresses = addresses.join(value.addresses())});
      this.aprops.values().forEach(function (value) {addresses = addresses.join(value.addresses())});
      addresses = addresses.join(this.internals.addresses());
      return addresses;
    }
