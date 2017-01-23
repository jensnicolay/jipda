"use strict";

function Internals(map)
{
  assertDefinedNotNull(map);
  this.map = map;
}

Internals.empty =
    function ()
    {
      return new Internals(new Map());
    }

Internals.internalsJoin =
    function (x, y)
    {
      if (x instanceof Set)
      {
        return Sets.union(x, y);
      }
      return x.join(y);
    }

Internals.prototype.set =
    function (name, value)
    {
      const newMap = new Map(this.map);
      newMap.set(name, value);
      return new Internals(newMap);
    }

Internals.prototype.get =
    function (name)
    {
      if (this.map.has(name))
      {
        return this.map.get(name);
      }
      throw new Error("unknown internal: " + name);
    }

Internals.prototype.has =
    function (name)
    {
      return this.map.get(name) !== undefined;
    }
    
Internals.prototype.join =
    function (other)
    {
      const joinedMap = Maps.join(this.map, other.map, Internals.internalsJoin, BOT);
      return new Internals(joinedMap);
    }
    
Internals.prototype.addresses =
    function ()
    {
      let addresses = ArraySet.empty();
      this.map.forEach((value, key) => {
        if (value instanceof Set_) // TODO hack for [[Call]]
        {
          value.forEach((val) => addresses = addresses.join(val.addresses()));
        }
        else
        {
          addresses = addresses.join(value.addresses());
        }});
      return addresses;
    }
    
    

function Obj()
  {
    this.frame = Obj.EMPTY_FRAME;
    this.internals = Internals.empty();
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
  
  function strongUpdateFrame(frame, name, value)
  {
    var newFrame = Obj.EMPTY_FRAME;
    frame.iterateEntries(
      function (entry)
      {
        var entryName = entry[0]; 
        if (name.subsumes(entryName))
        {
          // drop existing entry
        }
        else
        {
          newFrame = newFrame.put(entryName, entry[1]);
        }
      });
    return newFrame.put(name, value);
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

Obj.prototype.lookupInternal =
    function (name)
    {
      return this.internals.get(name);
    }

Obj.prototype.hasInternal =
    function (name)
    {
      return this.internals.has(name);
    }

Obj.prototype.add =
    function (name, value)
    {
      assert(name);
      assertTrue(value.constructor.name === "Property");
      assertDefinedNotNull(value.Value.subsumes);
      const result = new Obj();
      result.frame = strongUpdateFrame(this.frame, name, value);
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
        && Maps.equals(this.internals, x.internals, function (x,y) {
          
          return x === y || x.equals(y)
        
        });
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
  
  Obj.prototype.toJSON =
    function (replacer)
    {
      return JSON.stringify(this, replacer);
    }
