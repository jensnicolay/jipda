(function (global)
{
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
  
  // 19.5.6.2
  var TypeErrorPrototype = Object.create(Error.prototype);
  $BASE$.addIntrinsic("%TypeError%", TypeErrorPrototype)
  
  // 19.5.6.3.2
  TypeErrorPrototype.message = "";
  // 19.5.6.3.3
  TypeErrorPrototype.name = "TypeError";
  
  // 19.5.6.1.1
  function TypeError(message)
  {
    this.message = message; // TODO String(message);
    $BASE$.assignInternal(this, "[[ErrorData]]", undefined);
  }
  // 19.5.6.2.1
  TypeError.prototype = TypeErrorPrototype;
  // 19.5.6.2
  TypeError.name = "TypeError";
  
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
      if ($BASE$.hasInternal(value, "[[StringData]]"))
      {
        return $BASE$.lookupInternal(value, "[[StringData]]");
      }
    }
    
    throw new TypeError("cannot convert to string: " + value);
  }
  
  // 21.1.3.25
  String.prototype.toString =
      function ()
      {
        return thisStringValue(this);
      }
  
  // 22.1.3.7
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
      
  // 22.1.3.12
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
      
  // 22.1.3.16
  Array.prototype.map =
      function (f)
      {
        var result = [];
        for (var i = 0; i < this.length; i++)
        {
          result.push(f(this[i]))
        }
        return result;
      }
      
})(this);