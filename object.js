"use strict";
 
function Obj()
  {
    this.frame = Obj.EMPTY_FRAME;
    this.internals = new Map(); // TODO remove this, expect proper init (param)?
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
      
      //assert(value.subsumes);
      
      const result = new Obj();
      result.frame = this.frame;
  
      const newMap = new Map(this.internals);
      newMap.set(name, value);
      result.internals = newMap;

      return result;
    }


Obj.prototype.add =
    function (name, value)
    {
      assert(name);
      assertTrue(value.constructor.name === "Property");
      assertDefinedNotNull(value.Value.subsumes);
      var result = new Obj();
      result.frame = strongUpdateFrame(this.frame, name, value);
      
      result.internals = this.internals;
      
      return result;
    }

Obj.prototype.lookupInternal =
    function (name)
    {
      return this.internals.get(name);
    }
    
    
  Obj.prototype.lookup =
    function (name)
    {
      var result = BOT;
      this.frame.iterateEntries(
        function (entry)
        {
          var entryName = entry[0];
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
    
  Obj.internalsJoin =
      function (x, y)
      {
        if (x instanceof Set)
        {
          return Sets.union(x, y);
        }
        return x.join(y);
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
      
      result.internals = Maps.join(this.internals, other.internals, Obj.internalsJoin, BOT);
      
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
        && Maps.subsumes(this.internals, x.internals, function (x,y) {
          
          if (!x.subsumes) {print(x)};
          
          return x.subsumes(y)
        
        
        }, BOT)
        && Maps.subsumes(x.internals, this.internals, function (x,y) {return x.subsumes(y)}, BOT)
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
      this.internals.forEach((value, key) => {
        if (value instanceof Set_) // TODO hack for [[Call]]
        {
          value.forEach((val) => addresses = addresses.join(val.addresses()));
        }
        else if (value instanceof Set) // TODO hack for internal methods
        {
          // nothing (needs expansion if Sets can contain storables
        }
        else
        {
          if (!value.addresses) {print(value, value instanceof Set_); readline()};
          addresses = addresses.join(value.addresses());
        }
        });
      return addresses;
    }
  
  Obj.prototype.toJSON =
    function (replacer)
    {
      return JSON.stringify(this, replacer);
    }

  Obj.createFunction =
    function (Call, FUNCTIONPA)
    {
      var benv = new Obj();
      benv = benv.setInternal("[[Prototype]]", FUNCTIONPA);
      benv = benv.setInternal("[[Call]]", ArraySet.from1(Call));
      return benv;
    }
