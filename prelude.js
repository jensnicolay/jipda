(function (global)
{
  function assert(c)
  {
    if (!c)
    {
      throw new Error("Assertion failed");
    }
  }
  
  // 19.1.2.2
  Object.create =
      function (O, Properties)
      {
        if (!(typeof O === "object" || O === null))
        {
          throw new TypeError("19.1.2.2");
        }
        var obj = $BASE$.ObjectCreate(O);
        print("properties"); print(Properties);
        if (Properties !== undefined)
        {
          return ObjectDefineProperties(obj, Properties);
        }
        return obj;
      }
  
  // 19.1.2.3.1
  function ObjectDefineProperties(O, Properties)
    {
      if (typeof O !== "object")
      {
        throw new TypeError();
      }
      var props = $BASE$.ToObject(Properties);
      var keys = $BASE$.callInternal(props, "[[OwnPropertyKeys]]");
      var descriptors = [];
      for (var nextKey of keys)
      {
        var propDesc = $BASE$.callInternal(props, "[[GetOwnProperty]]", [nextKey]);
        if (propDesc !== undefined && $BASE$.lookupInternal(propDesc, "[[Enumerable]]"))
        {
          var descObj = $BASE$.callInternal(props, "[[Get]]", nextKey);
          var desc = $BASE$.ToPropertyDescriptor(descObj);
          descriptors.push([nextKey, desc]);
        }
      }
      for (var pair of descriptors)
      {
        var P = pair[0];
        var desc = pair[1];
        $BASE$.DefinePropertyOrThrow(O, P, desc);
      }
      return O;
    }
  
  // 19.1.2.4
  Object.defineProperty =
      function (O, P, Attributes)
      {
        if (typeof O !== "object")
        {
          throw new TypeError("Object.defineProperty called on non-object");
        }
        var key = $BASE$.ToPropertyKey(P);
        var desc = $BASE$.ToPropertyDescriptor(Attributes);
        $BASE$.DefinePropertyOrThrow(O, key, desc);
        return O;
      }

  // 19.1.2.11
  Object.getPrototypeOf =
      function (O)
      {
        var obj = $BASE$.ToObject(O);
        return $BASE$.callInternal(obj, "[[GetPrototypeOf]]");
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