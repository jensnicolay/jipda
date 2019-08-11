import {HashMap, ArraySet, assertDefinedNotNull, Maps, assert} from './common.mjs';
import {BOT} from './lattice.mjs';

function Prop(value, must)
{
  this.value = value;
  this.must = must;
}

Prop.fromValue =
    function (value)
    {
      return new Prop(value, true);
    }

Prop.prototype.equals =
    function (other)
    {
      if (this === other)
      {
        return true;
      }
      return this.value.equals(other.value)
          && this.must === other.must
    }

Prop.prototype.hashCode =
    function ()
    {
      return this.value.hashCode();
    }

Prop.prototype.update =
    function (x)
    {
      return this.join(x);
    }
    
Prop.prototype.join =
    function (other)
    {
      if (other === BOT || this === other)
      {
        return this;
      }
      return new Prop(this.value.join(other.value), this.must && other.must);
    }
    
Prop.prototype.addresses =
    function ()
    {
      return this.value.addresses();
    }

Prop.prototype.toString =
    function ()
    {
      return String(this.value);
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

Record.internalsJoin =
    function (x, y)
    {
      return x.join(y);
    }

Record.prototype.set =
    function (name, value)
    {
      const newMap = new Map(this.map);
      newMap.set(name, Prop.fromValue(value));
      return new Record(newMap);
    }

Record.prototype.get =
    function (name)
    {
      if (this.map.has(name))
      {
        return this.map.get(name);
      }
      return BOT;
    }

Record.prototype.equals =
    function (x)
    {
      if (this === x)
      {
        return true;
      }
      return Maps.equals(this.maps, x.maps,
          function (x,y)
          {
            return x === y || x.equals(y)
          });
    }

Record.prototype.join =
    function (other)
    {
      const joinedMap = Maps.join(this.map, other.map, Record.internalsJoin, BOT);
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
Record.prototype.toString =
    function ()
    {
      return Maps.toString(this.map);
    }

export function Obj()
  {
    this.frame = Obj.EMPTY_FRAME;
    this.internals = Record.empty();
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
      
  Obj.prototype.accept =
    function (visitor)
    {
      return visitor.visitObj(this);
    }
  
  function updateFrame(frame, name, value)
  {
    if (name.conc1)
    {
      return frame.put(name, value);
    }
    // let newFrame = Obj.EMPTY_FRAME;
    // let newValue = value;
    // frame.iterateEntries(
    //   function (entry)
    //   {
    //     var entryName = entry[0];
    //     if (name.subsumes(entryName))
    //     {
    //       // drop existing entry, but keep prev
    //       newValue = newValue.join(entry[1]);
    //     }
    //     else
    //     {
    //       newFrame = newFrame.put(entryName, entry[1]);
    //     }
    //   });
    // return newFrame.put(name, value);

    if (frame.get(name) && !frame.get(name).update)
    {
      console.log("!!!");
    }

    return frame.put(name, (frame.get(name) || BOT).update(value));
  }


Obj.prototype.setInternal =
    function (name, value)
    {
      
      const result = new Obj();
      result.frame = this.frame;
  
      const newInternals = this.internals.set(name, value);
      result.internals = newInternals;

      return result;
    }

Obj.prototype.getInternal =
    function (name)
    {
      return this.internals.get(name);
    }

Obj.prototype.add =
    function (name, value)
    {
      assert(name);
      const prop = Prop.fromValue(value);
      const result = new Obj();
      result.frame = updateFrame(this.frame, name, prop);
      result.internals = this.internals;
      return result;
    }

    
  Obj.prototype.lookup =
    function (name)
    {
      var result = BOT;
      this.frame.iterateEntries(
        function (entry)
        {
          const entryName = entry[0];
          if (entryName.subsumes(name) || name.subsumes(entryName))
          {
            result = result.join(entry[1]);
          }
        });
      return result;
    }

  Obj.prototype.conc =
    function ()
    {
      return [this];
    }

  Obj.prototype.update =
      function (x)
      {
        return x;
      }
    
  Obj.prototype.join =
    function (other)
    {
      if (other === BOT)
      {
        return this;
      }    
      var result = new Obj();
      result.frame = this.frame.join(other.frame, BOT);
      result.internals = this.internals.join(other.internals);
      return result;
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
    var prime = 11;
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
  
  // Obj.prototype.toJSON =
  //   function (replacer)
  //   {
  //     return JSON.stringify(this, replacer);
  //   }
