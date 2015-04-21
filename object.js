"use strict";

function Obj(Class)
  {
    this.Class = Class;
    this.frame = Obj.EMPTY_FRAME;
    this.Call = Obj.EMPTY_CALLS;
    this.PrimitiveValue = BOT;
   }
  
  Obj.EMPTY_FRAME = HashMap.empty();
//  Obj.EMPTY_CLASS = HashSet.empty();
  Obj.EMPTY_CALLS = ArraySet.empty();
  
  Obj.prototype.isObj = true;
  
  Obj.prototype.toString =
    function ()
    {
  //    return "<" + this.Class + ": " + this.frame.map(function (entry) {return entry[0] + "->" + entry[1]}).join("|") + ">";
      return "<" + this.Class + " " + this.names() + ">";
    };
    
  Obj.prototype.nice =
    function ()
    {
      return "[[Class]] " + this.Class + "\n" + this.frame.nice();
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
    
  function weakUpdateFrame(frame, name, value)
  {
    var newFrame = Obj.EMPTY_FRAME;
    frame.iterateEntries(
      function (entry)
      {
        var entryName = entry[0]; 
        if (name.subsumes(entryName))
        {
          value = value.join(entry[1]);
        }
        else
        {
          newFrame = newFrame.put(entryName, entry[1]);
        }
      });
    return newFrame.put(name, value);
  }
    
  Obj.prototype.add =
    function (name, value)
    {
      assert(name);
      assert(value);
      var result = new Obj(this.Class);
      result.frame = strongUpdateFrame(this.frame, name, value);
      result.Call = this.Call;
      result.Prototype = this.Prototype;
      result.PrimitiveValue = this.PrimitiveValue;
      return result;
    }
    
  Obj.prototype.weakAdd =
    function (name, value)
    {
      assert(name);
      assert(value);
      var result = new Obj(this.Class);
      result.frame = weakUpdateFrame(this.frame, name, value);
      result.Call = this.Call;
      result.Prototype = this.Prototype;
      result.PrimitiveValue = this.PrimitiveValue;
      return result;
    }
    
  Obj.prototype.lookup =
    function (name)
    {
      var result = BOT;
      var found = false;
      this.frame.iterateEntries(
        function (entry)
        {
          var entryName = entry[0]; 
          if (entryName.subsumes(name))
          {
            result = result.join(entry[1]);
            found = true;
          }          
          else if (name.subsumes(entryName))
          {
            result = result.join(entry[1]);
          }          
        })
      return [result, found];
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
      var result = new Obj(this.Class.join(other.Class));
      result.Call = this.Call.join(other.Call);
      result.Prototype = this.Prototype.join(other.Prototype);
      result.PrimitiveValue = this.PrimitiveValue.join(other.PrimitiveValue);
//      var frame = this.frame;
//      other.frame.iterateEntries(function (entry) {frame = weakUpdateFrame(frame, entry[0], entry[1])});
//      result.frame = frame;
      result.frame = this.frame.join(other.frame, BOT);
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
    return this.Class.equals(x.Class) 
        && this.Prototype.equals(x.Prototype)
        && this.Call.equals(x.Call)
        && this.PrimitiveValue.equals(x.PrimitiveValue)
        && this.frame.equals(x.frame);
  }

Obj.prototype.hashCode =
  function ()
  {
    var prime = 11;
    var result = 1;
    result = prime * result + this.Class.hashCode();
    result = prime * result + this.Prototype.hashCode();
    result = prime * result + this.Call.hashCode();
    result = prime * result + this.PrimitiveValue.hashCode();
    result = prime * result + this.frame.hashCode();
    return result;
  }

Obj.prototype.subsumes =
  function (x)
  { 
    if (this === x)
    {
      return true;
    }
    if (!this.Class.subsumes(x.Class) 
        || !this.Prototype.subsumes(x.Prototype)
        || !this.Call.subsumes(x.Call)
        || !this.PrimitiveValue.subsumes(x.PrimitiveValue))
    {
      return false;
    }
    return x.frame.iterateEntries(
      function (entry)
      {
        var name = entry[0];
        var xValue = entry[1];
        var thisValueFound = this.lookup(name);
        var thisValue = thisValueFound[0];
        var found = thisValueFound[1];
        if (!thisValue.subsumes(xValue) || !found.subsumes(name))
        {
          return false;
        }
      }, this)
  }

Obj.prototype.diff = //DEBUG
  function (x)
  {
    var diff = [];
    if (!this.Class.equals(x.Class))
    {
      diff.push("[[Class]]\t" + this.Class + " -- " + x.Class);
    }
    if (!this.Prototype.equals(x.Prototype))
    {
      diff.push("[[Prototype]]\t" + this.Prototype + " -- " + x.Prototype);
    }
    if (!this.Call.equals(x.Call))
    {
      diff.push("[[Call]]\t" + this.Call + " -- " + x.Call);
    }
    if (!this.PrimitiveValue.equals(x.PrimitiveValue))
    {
      diff.push("[[prim]]\t" + this.PrimitiveValue + " -- " + x.PrimitiveValue);
    }
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
      var addresses = this.Prototype.addresses();
      this.Call.forEach(function (callable) {addresses = addresses.join(callable.addresses())});
      this.frame.values().forEach(function (value) {addresses = addresses.join(value.addresses())});
      return addresses;
    }
  
  Obj.prototype.isObject =
    function ()
    {
      return this.Class.contains(Ecma.Class.OBJECT);
    }
  
  Obj.prototype.isArray =
    function ()
    {
      return this.Class.contains(Ecma.Class.ARRAY);
    }
  
  Obj.prototype.isString =
    function ()
    {
      return this.Class.contains(Ecma.Class.STRING);
    }
  
  Obj.prototype.isFunction =
    function ()
    {
      return this.Class.contains(Ecma.Class.FUNCTION);
    }
  
  Obj.prototype.toJSON =
    function (replacer)
    {
      return JSON.stringify(this, replacer);
    }  
  
  Obj.createObject =
    function (Prototype)
    {
      var benv = new Obj(ArraySet.from1(Ecma.Class.OBJECT));
      benv.Prototype = Prototype;
      return benv;
    }
  
  Obj.createArray =
    function (ARRAYPA)
    {
      var benv = new Obj(ArraySet.from1(Ecma.Class.ARRAY));
      benv.Prototype = ARRAYPA;
      return benv;
    }

  Obj.createError =
    function (ERRORPA)
    {
      var benv = new Obj(ArraySet.from1(Ecma.Class.ERROR));
      benv.Prototype = ERRORPA;
      return benv;
    }

  Obj.createFunction =
    function (Call, FUNCTIONPA)
    {
      var benv = new Obj(ArraySet.from1(Ecma.Class.FUNCTION));
      benv.Prototype = FUNCTIONPA;
      benv.Call = ArraySet.from1(Call);
      return benv;
    }
