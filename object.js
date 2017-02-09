"use strict";

function Obj(proto)
  {
    assertDefinedNotNull(proto);
    this.frame = Obj.EMPTY_FRAME;
    this.Prototype = proto;
    this.Call = BOT;
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


Obj.prototype.add =
    function (name, value)
    {
      assert(name);
      const result = new Obj(this.Prototype);
      result.frame = strongUpdateFrame(this.frame, name, value);
      result.Call = this.Call;
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
      var result = new Obj(this.Prototype.join(other.Prototype));
      result.frame = this.frame.join(other.frame, BOT);
      result.Call = this.Call.join(other.Call);
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
    return this.Prototype.equals(x.Prototype)
        && this.Call.equals(x.Call)
        && this.frame.equals(x.frame);
  }

Obj.prototype.hashCode =
  function ()
  {
    var prime = 11;
    var result = 1;
    result = prime * result + this.Prototype.hashCode();
    result = prime * result + this.Call.hashCode();
    result = prime * result + this.frame.hashCode();
    return result;
  }

Obj.prototype.diff = //DEBUG
  function (x)
  {
    var diff = [];
    if (!this.Prototype.equals(x.Prototype))
    {
      diff.push("[[Prototype]]\t" + this.Prototype + " -- " + x.Prototype);
    }
    if (!this.Call.equals(x.Call))
    {
      diff.push("[[Call]]\t" + this.Call + " -- " + x.Call);
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
    
  Obj.prototype.addresses =
    function ()
    {
      let addresses = this.Prototype.addresses().join(this.Call.addresses());
      this.frame.values().forEach(
          function (value)
          {
            addresses = addresses.join(value.addresses())
          });
      return addresses;
    }