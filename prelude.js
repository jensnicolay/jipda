Array.prototype.map =
    function (f)
    {
      var result = [];
      for (var i = 0; i < this.length; i++)
      {
        result.push(f(this[i]))
      }
      ;
      return result;
    }

Array.prototype.filter =
    function (f)
    {
      var result = [];
      for (var i = 0; i < this.length; i++)
      {
        var x = this[i];
        if (f(x))
        {
          (result.push(x))
        }
      }
      return result;
    }

Array.prototype.indexOf =
    function (x)
    {
      for (var i = 0; i < this.length; i++)
      {
        if (this[i]===x)
        {
          return i
        }
      }
      return -1;
    }

// 19.5.3.4
Error.prototype.toString =
    function ()
    {
      var name = this.name;
      if (name === undefined)
      {
        name = "Error";
      }
      else
      {
        name = name.toString();
      }
      var message = this.message;
      if (message === undefined)
      {
        message = "";
      }
      else
      {
        message = message.toString();
      }
      if (name === "")
      {
        return message;
      }
      if (message === "")
      {
        return name;
      }
      return name + ": " + message;
    }
    
; // important semicolon (for parsing purposes)

(function (global)
{
  // TODO ES262 ref
  var TypeErrorPrototype = new Error();
  
  function TypeError(message)
  {
    this.message = message;
  }
  TypeError.prototype = TypeErrorPrototype;
  
  global.TypeError = TypeError;

  // 21.1.3
  function thisStringValue(value)
  {
    if (typeof value === "string")
    {
      return value;
    }
    
    if (typeof value === "object")
    {
      if ($META$.HasStringDataInternalSlot(value))
      {
        return $META$.GetStringDataInternalSlot(value);
      }
    }
    
    throw new TypeError("cannot convert to string: " + value);
  }
  
  // 21.1.3.25
  global.String.prototype.toString =
      function ()
      {
        return thisStringValue(this);
      }
})(this);