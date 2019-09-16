import {HashCode, Maps, HashMap, assertDefinedNotNull, assert} from './common.mjs';
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
      const joinedMap = Maps.join(this.map, other.map, (x,y) => x.join(y), BOT);
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


export function Obj(frame, internals)
{
  assertDefinedNotNull(frame);
  assertDefinedNotNull(internals);
  this.frame = frame;//Obj.EMPTY_FRAME;
  this.internals = internals;//Record.empty();
}

Obj.empty =
    function ()
    {
      return new Obj(Obj.EMPTY_FRAME, Record.empty());
    }

Obj.EMPTY_FRAME = HashMap.empty();

Obj.prototype.toString =
    function ()
    {
      return "<" + this.names() + ">";
    };

Obj.prototype.nice =
    function ()
    {
      return this.frame.nice();
    }


Obj.prototype.addInternal =
    function (name, value)
    {
      return new Obj(this.frame, this.internals.add(name, value));
    }

Obj.prototype.setInternal = // TODO duplicate w.r.t. `set`? (do we need different add/update semantics?)
    function (name, value)
    {
      return new Obj(this.frame, this.internals.add(name, value));
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
      const newFrame = this.frame.put(name, Present.from(value));
      return new Obj(newFrame, this.internals);
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
      let result = BOT;
      let met = BOT;
      this.frame.iterateEntries(
          function (entry)
          {
            const entryName = entry[0];
            const meet = entryName.meet(name)
            if (meet !== BOT)
            {
              // console.log("entryName " + entryName + " name " + name + " meet " + meet);
              met = met.join(meet);
              result = result.join(entry[1]);
            }
          });
      if (result === BOT)
      {
        return new Absent();
      }
      if (!name.conc1)
      {
        // return new Present(Property.fromData(Present.from(result.getValue().getValue().join(L_UNDEFINED)), result.getValue().getWritable(), result.getValue().getEnumerable(), result.getValue().getConfigurable()), false);
        return new Present(result.getValue(), false);
      }
      const r = met.equals(name) ? result : new Present(result.getValue(), false);
      // console.log("lookup " + name + " = " + r + " met: " + met);
      return r;
    }

Obj.prototype.conc =
    function ()
    {
      return [this];
    }

Obj.prototype.join =
    function (other)
    {
      if (other === BOT)
      {
        return this;
      }

      let newFrame = HashMap.empty();
      this.frame.iterateEntries(
        function (entry)
        {
          const key = entry[0];
          const value1 = this.getProperty(key);
          const value2 = other.getProperty(key);
          const value = value1.join(value2);
          newFrame = newFrame.put(key, value);
        }, this);
        other.frame.iterateEntries(
          function (entry)
          {
            const key = entry[0];
            const value1 = other.getProperty(key);
            const value2 = this.getProperty(key);
            const value = value1.join(value2);
            newFrame = newFrame.put(key, value);
          }, this);

      const newInternals = this.internals.join(other.internals);
      return new Obj(newFrame, newInternals);
    }

Obj.prototype.equals =
    function (x)
    {
      if (this === x)
      {
        return true;
      }
      if (!(x instanceof Obj))
      {
        return false;
      }
      return this.frame.equals(x.frame)
          && this.internals.equals(x.internals);
    }

Obj.prototype.hashCode =
    function ()
    {
      var prime = 31;
      var result = 1;
      result = prime * result + this.frame.hashCode();
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
      return this.frame.keys();
    }

//  Obj.prototype.values =
//    function ()
//    {
//      return this.frame.map(function (entry) { return entry[1]; }).toSet();
//    }

Obj.prototype.addresses =
    function ()
    {
      let addresses = ArraySet.empty();
      this.frame.values().forEach(function (value) {addresses = addresses.join(value.addresses())});
      addresses = addresses.join(this.internals.addresses());
      return addresses;
    }
