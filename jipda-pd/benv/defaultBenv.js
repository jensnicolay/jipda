function DefaultBenv()
{
  function Benv(Class)
  {
    this.Class = Class;
    this.frame = [];
    this.parents = [];
    this.Call = [];
    this.PrimitiveValue = BOT;
   }
  
  Benv.prototype.isBenv = true;
  
  Benv.prototype.toString =
    function ()
    {
  //    return "<" + this.Class + ": " + this.frame.map(function (entry) {return entry[0] + "->" + entry[1]}).join("|") + ">";
      return "<" + this.Class + " " + this.names() + ">";
    };
    
  Benv.prototype.nice =
    function ()
    {
      return "[[Class]] " + this.Class + "\n" + this.frame.map(function (entry) {return entry.name + " --> " + entry.value}).join("\n");
    }
      
  Benv.prototype.accept =
    function (visitor)
    {
      return visitor.visitBenv(this);
    }
  
//  function updateFrame(frame, name, value)
//  {
//    var concNames = !!name.conc;
//    if (concNames)
//    {
//      // attempt strong update
//      var newFrame = [];
//      var cleaned = false;
//      for (var i = 0; i < frame.length; i++)
//      {
//        var entry = frame[i];
//        var entryName = entry.name; 
//        var c = entryName.compareTo(name);
//        if (c <= 0)
//        {
//          if (!entryName.conc) // TODO turn into assert
//          {
//            return frame.addFirst({name:name,value:value});
//          }
//          cleaned = true;
//        }
//        else
//        {
//          newFrame.push(entry);
//        }
//      }  
//      if (cleaned)
//      {
//        return newFrame.addFirst({name:name,value:value});
//      }
//      else
//      {
//        return frame.addFirst({name:name,value:value});
//      }
//    }
//    else
//    {
//      return frame.addFirst({name:name,value:value});
//    }
//  }
    
  function strongUpdateFrame(frame, name, value)
  {
    var newFrame = [];
    for (var i = 0; i < frame.length; i++)
    {
      var entry = frame[i];
      var entryName = entry.name; 
      var c = entryName.compareTo(name);
      if (c <= 0)
      {
      }
      else
      {
        newFrame.push(entry);
      }
    }
    return newFrame.addFirst({name:name, value:value});
  }
    
  function weakUpdateFrame(frame, name, value)
  {
    var newFrame = [];
    for (var i = 0; i < frame.length; i++)
    {
      var entry = frame[i];
      var entryName = entry.name; 
      var c = entryName.compareTo(name);
      if (c <= 0)
      {
        value = value.join(entry.value);
      }
      else
      {
        newFrame.push(entry);
      }
    }
    return newFrame.addFirst({name:name, value:value});
  }
    
  Benv.prototype.add =
    function (name, value)
    {  
      assertTrue(value instanceof JipdaValue || value === BOT, value);
      
      var result = new Benv(this.Class);
//      result.frame = !!name.conc ? strongUpdateFrame(this.frame, name, value) : weakUpdateFrame(this.frame, name, value);
      result.frame = strongUpdateFrame(this.frame, name, value);
//      print("add", name, value, result.frame.map(function (entry) {return entry.name + ":" + entry.value}).join(","));
      result.Call = this.Call;
      result.Prototype = this.Prototype;
      result.parents = this.parents;
      result.PrimitiveValue = this.PrimitiveValue;
      return result;
    }
    
  Benv.prototype.lookup =
    function (name)
    {
      var result = BOT;
      for (var i = 0; i < this.frame.length; i++)
      {
        var entry = this.frame[i];
        var entryName = entry.name; 
        var c = name.compareTo(entryName);
        if (c <= 0)
        {
          result = result.join(entry.value);
        }
      }
      return result;
    };
      
  Benv.prototype.conc =
    function ()
    {
      return [this];
    }
  
  Benv.prototype.join =
    function (other)
    {
      if (other === BOT)
      {
        return this;
      }    
      var result = new Benv(this.Class.concat(other.Class).toSet());
      result.Call = this.Call.concat(other.Call).toSet();
      result.Prototype = this.Prototype.join(other.Prototype);
      result.parents = this.parents.concat(other.parents).toSet();
      result.PrimitiveValue = this.PrimitiveValue.join(other.PrimitiveValue);
      var frame = this.frame;
      other.frame.forEach(function (entry) {frame = weakUpdateFrame(frame, entry.name, entry.value)});
      result.frame = frame;
      return result;
    }
  
Benv.prototype.equals =
  function (x)
  {
    return this.compareTo(x) === 0;
  }

Benv.prototype.subsumes =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (!this.Class.subsumes(x.Class) 
        || !this.parents.subsumes(x.parents) 
        || !this.Prototype.subsumes(x.Prototype)
        || !this.Call.subsumes(x.Call)
        || !this.PrimitiveValue.subsumes(x.PrimitiveValue))
    {
      return false;
    }
    for (var i = 0; i < this.frame.length; i++)
    {
      var thisEntry = this.frame[i];
      var thisName = thisEntry.name;
      var thisValue = this.lookup(thisName);
      var xValue = x.lookup(thisName);
      if (!thisValue.subsumes(xValue))
      {
        return false;
      }
    }
    return true;
  }

Benv.prototype.diff = //DEBUG
  function (x)
  {
    var diff = [];
    if (!this.Class.equals(x.Class))
    {
      diff.push("[[Class]]\t" + this.Class + " -- " + x.Class);
    }
    if (!this.parents.setEquals(x.parents))
    {
      diff.push("[[parents]]\t" + this.parents + " -- " + x.parents);
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
    for (var i = 0; i < this.frame.length; i++)
    {
      var thisEntry = this.frame[i];
      var thisName = thisEntry.name;
      var thisValue = this.lookup(thisName);
      var xValue = x.lookup(thisName);
      if (!thisValue.equals(xValue))
      {
        diff.push(thisName + "\t" + thisValue + " -- " + xValue);
      }
    }
    for (var i = 0; i <x.frame.length; i++)
    {
      var xEntry = x.frame[i];
      var xName = xEntry.name;
      var xValue = x.lookup(xName);
      var thisValue = this.lookup(xName);
      if (thisValue === BOT)
      {
        diff.push(xName + "\t" + thisValue + " -- " + xValue);
      }
    }
    return ">>>BENV\n" + diff.join("\n") + "<<<";
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
  
  Benv.prototype.names = 
    function ()
    {
      return this.frame.map(function (entry) { return entry.name; }).toSet();
    }
    
//  Benv.prototype.values = 
//    function ()
//    {
//      return this.frame.map(function (entry) { return entry.value; }).toSet();
//    }
  
  Benv.prototype.addresses = 
    function ()
    {
      return this.frame.flatMap(function (entry) {return entry.value.addresses()}).toSet();
    }
  
  Benv.prototype.isObject =
    function ()
    {
      return this.Class.indexOf(Ecma.Class.OBJECT) > -1;
    }
  
  Benv.prototype.isArray =
    function ()
    {
      return this.Class.indexOf(Ecma.Class.ARRAY) > -1;
    }
  
  Benv.prototype.isString =
    function ()
    {
      return this.Class.indexOf(Ecma.Class.STRING) > -1;
    }
  
  Benv.prototype.isFunction =
    function ()
    {
      return this.Class.indexOf(Ecma.Class.FUNCTION) > -1;
    }
  
  var module = {};
  
  module.createEnvironment =
    function (parenta)
    {
      var benv = new Benv(["Env"]); // TODO introduce constant? (need a classifier here because of joining)
      benv.parents = [parenta]; // no ECMA internal property exists for 'outer environment' (10.2)
      benv.Prototype = BOT; // should be BOT and not abst(null) for example (when merging with other non-env Benvs)
      return benv;    
    }
  
  module.createObject =
    function (Prototype)
    {
      var benv = new Benv([Ecma.Class.OBJECT]);
      benv.Prototype = Prototype;
      return benv;
    }
  
  module.createString =
    function (prim, STRINGPA)
    {
      var benv = new Benv([Ecma.Class.STRING]);
      benv.Prototype = STRINGPA;
      benv.PrimitiveValue = prim;
      return benv;
    }
  
  module.createArray =
    function (ARRAYPA)
    {
      var benv = new Benv([Ecma.Class.ARRAY]);
      benv.Prototype = ARRAYPA;
      return benv;
    }

  module.createFunction =
    function (Call, FUNCTIONPA)
    {
      var benv = new Benv([Ecma.Class.FUNCTION]);
      benv.Prototype = FUNCTIONPA;
      benv.Call = [Call];
      return benv;
    }
  
  return module;
}