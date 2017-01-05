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
  function assert(c)
  {
    if (!c)
    {
      throw new Error("Assertion failed");
    }
  }
  
  // 6.2.4.5
  function ToPropertyDescriptor(Obj)
  {
    if (typeof Obj !== "object")
    {
      throw new TypeError("non-object property descriptor");
    }
    var desc = Object.create(null);
    var hasEnumerable = HasProperty(Obj, "enumerable");
    if (hasEnumerable)
    {
      var enum_ = ToBoolean(Get(Obj, "enumerable"));
      desc["[[Enumerable]]"] = enum_;
    }
    var hasConfigurable = HasProperty(Obj, "configurable");
    if (hasConfigurable)
    {
      var conf = ToBoolean(Get(Obj, "configurable"));
      desc["[[Configurable]]"] = conf;
    }
    var hasValue = HasProperty(Obj, "value");
    if (hasValue)
    {
      var value = Get(Obj, "value");
      desc["[[Value]]"] = value;
    }
    var hasGet = HasProperty(Obj, "get");
    if (hasGet)
    {
      var getter = Get(Obj, "get");
      if (!IsCallable(getter) && getter !== undefined)
      {
        throw new TypeError("non-callable getter");
      }
      desc["[[Get]]"] = getter;
    }
    var hasSet = HasProperty(Obj, "set");
    if (hasSet)
    {
      var setter = Get(Obj, "set");
      if (!IsCallable(setter) && setter !== undefined)
      {
        throw new TypeError("non-callable setter");
      }
      desc["[[Set]]"] = setter;
    }
    if (desc["[[Get]]"] || desc["[[Set]]"])
    {
      if (desc["[[Value]]"] || desc["[[Writable]]"])
      {
        throw new TypeError("[[Value]] or [[Writable]] incompatible with [[Get]] or [[Set]]");
      }
    }
    return desc;
  }
  
  
  // 7.1.1
  function ToPrimitive(input, PreferredType)
  {
    if (input === undefined)
    {
      return input;
    }
    if (input === null)
    {
      return input;
    }
    if (typeof input === "boolean")
    {
      return input;
    }
    if (typeof input === "number")
    {
      return input;
    }
    if (typeof input === "string")
    {
      return input;
    }
    if (typeof input === "symbol")
    {
      return input;
    }
    assert(typeof input === "object");
    
    
    var hint;
    if (PreferredType === undefined)
    {
      hint = "default";
    }
    else if (PreferredType === "String")
    {
      hint = "string";
    }
    else
    {
      assert(PreferredType === "Number")
      hint = "number";
    }
    // TODO step 4
    // TODO step 5
    if (hint === "default")
    {
      hint = "number";
    }
    return OrdinaryToPrimitive(input, hint);
  }
  
  // 7.1.1.1
  function OrdinaryToPrimitive(O, hint)
  {
    assert(typeof O === "object");
    assert(hint === "string" || hint === "number");
  
    if (hint === "string")
    {
      //methodNames = ["toString", "valueOf"];
      var method = Get(O, "toString");
      if (IsCallable(method))
      {
        var result = Call(method, O);
        if (typeof result !== "object")
        {
          return result;
        }
      }
      var method = Get(O, "valueOf");
      if (IsCallable(method))
      {
        var result = Call(method, O);
        if (typeof result !== "object")
        {
          return result;
        }
      }
    }
    else
    {
      //methodNames = ["valueOf", "toString"];
      var method = Get(O, "valueOf");
      if (IsCallable(method))
      {
        var result = Call(method, O);
        if (typeof result !== "object")
        {
          return result;
        }
      }
      var method = Get(O, "toString");
      if (IsCallable(method))
      {
        var result = Call(method, O);
        if (typeof result !== "object")
        {
          return result;
        }
      }
    }
    //var methodNames; TODO implement for .. of and iterators
    // if (hint === "string")
    // {
    //   methodNames = ["toString", "valueOf"];
    // }
    // else
    // {
    //   methodNames = ["valueOf", "toString"];
    // }
    // for (var name of methodNames)
    // {
    //   var method = Get(O, name);
    //   if (IsCallable(method))
    //   {
    //     var result = Call(method, O);
    //     if (typeof result !== "object")
    //     {
    //       return result;
    //     }
    //   }
    // }
    throw new TypeError("cannot convert to primitive");
  }
  
  // 7.1.12
  function ToString(argument)
  {
    if (argument === undefined)
    {
      return "undefined";
    }
    if (argument === null)
    {
      return "null";
    }
    if (argument === true)
    {
      return "true";
    }
    if (argument === false)
    {
      return "false";
    }
    if (typeof argument === "number")
    {
      return numberToString(argument);
    }
    if (typeof argument === "string")
    {
      return argument;
    }
    if (typeof argument === "symbol")
    {
      throw new TypeError("cannot convert symbol to string");
    }
    assert(typeof argument === "object");
    var primValue = ToPrimitive(argument, "String");
    return ToString(primValue);
  }
  
  // 7.1.12.1
  function numberToString(m)
  {
    if (isNaN(m))
    {
      return "NaN";
    }
    if (m === +0 || m === -0)
    {
      return "0";
    }
    if (m < 0)
    {
      return "-" + ToString(-m);
    }
    if (m === +Infinity)
    {
      return "Infinity";
    }
    return $BASE$.positiveNumberToString(m);
  }
  
  // 7.1.14
  function ToPropertyKey(argument)
  {
    var key = ToPrimitive(argument, "String");
    if (typeof key === "symbol")
    {
      return key;
    }
    return ToString(key);
  }
  
  // 7.2.3
  function IsCallable(argument)
  {
    if (typeof argument !== "object")
    {
      return false;
    }
    if ($BASE$.hasInternal("[[Call]]"))
    {
      return true;
    }
    return false;
  }
  
  // 7.2.7
  function IsPropertyKey(argument)
  {
    if (typeof argument === "string")
    {
      return true;
    }
    if (typeof argument === "symbol")
    {
      return true;
    }
    return false;
  }
  
  // 7.3.1
  function Get(O, P)
  {
    assert(typeof O === "object");
    assert(IsPropertyKey(P));
    return O["[[Get]]"](P, O);
  }
  
  // 7.3.7
  function DefinePropertyOrThrow(O, P, desc)
  {
    assert(typeof O === "object");
    assert(IsPropertyKey(P));
    var success = O["[[DefineOwnProperty]]"](P, desc);
    if (success === false)
    {
      throw new TypeError("defining property failed");
    }
    return success;
  }
  
  // 7.3.10
  function HasProperty(O, P)
  {
    assert(typeof O === "object");
    assert(IsPropertyKey(P));
    return O["[[HasProperty]]"](P);
  }
  
  // 9.1.7
  
  
  // 19.1.2.4
  Object.defineProperty =
      function (O, P, Attributes)
      {
        if (typeof O !== "object")
        {
          throw new TypeError("Object.defineProperty called on non-object");
        }
        var key = ToPropertyKey(P);
        var desc = ToPropertyDescriptor(Attributes);
        DefinePropertyOrThrow(O, key, desc);
        return O;
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
    this["[[ErrorData]]"] = undefined;
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
  global.String.prototype.toString =
      function ()
      {
        return thisStringValue(this);
      }
      
  global["$META$"] =
      {
        
      }
})(this);