(function ()
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
    var desc = $BASE$.newPropertyDescriptor();
    var hasEnumerable = HasProperty(Obj, "enumerable");
    if (hasEnumerable)
    {
      var enum_ = ToBoolean(Get(Obj, "enumerable"));
      $BASE$.assignInternal(desc, "[[Enumerable]]", enum_);
    }
    var hasConfigurable = HasProperty(Obj, "configurable");
    if (hasConfigurable)
    {
      var conf = ToBoolean(Get(Obj, "configurable"));
      $BASE$.assignInternal(desc, "[[Configurable]]", conf);
    }
    var hasValue = HasProperty(Obj, "value");
    if (hasValue)
    {
      var value = Get(Obj, "value");
      $BASE$.assignInternal(desc, "[[Value]]", value);
    }
    var hasGet = HasProperty(Obj, "get");
    if (hasGet)
    {
      var getter = Get(Obj, "get");
      if (!IsCallable(getter) && getter !== undefined)
      {
        throw new TypeError("non-callable getter");
      }
      $BASE$.assignInternal(desc, "[[Get]]", getter);
    }
    var hasSet = HasProperty(Obj, "set");
    if (hasSet)
    {
      var setter = Get(Obj, "set");
      if (!IsCallable(setter) && setter !== undefined)
      {
        throw new TypeError("non-callable setter");
      }
      $BASE$.assignInternal(desc, "[[Set]]", setter);
    }
    if ($BASE$.hasInternalProperty(desc, "[[Get]]") || $BASE$.hasInternalProperty(desc, "[[Set]]"))
    {
      if ($BASE$.hasInternalProperty(desc, "[[Value]]") || $BASE$.hasInternalProperty(desc, "[[Writable]]"))
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
  
  // 7.1.2
  function ToBoolean(argument)
  {
    if (argument === undefined)
    {
      return false;
    }
    if (argument === null)
    {
      return false;
    }
    if (typeof argument === "boolean")
    {
      return argument;
    }
    if (typeof argument === "number")
    {
      if (argument === 0 || isNaN(argument))
      {
        return false;
      }
      return true;
    }
    if (typeof argument === "symbol")
    {
      return true;
    }
    if (typeof argument === "object")
    {
      return true;
    }
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
  
  // 7.1.13
  function ToObject(argument)
  {
    if (argument === undefined)
    {
      throw new TypeError("cannot convert undefined to object");
    }
    if (argument === null)
    {
      throw new TypeError("cannot convert null to object");
    }
    if (typeof argument === "number")
    {
      throw new TypeError("NYI: number");
    }
    if (typeof argument === "string")
    {
      return $BASE$.StringCreate(argument);
    }
    if (typeof argument === "symbol")
    {
      throw new TypeError("NYI: symbol");
    }
    return argument;
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
    if ($BASE$.hasInternal(argument, "[[Call]]"))
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
  
  // 7.2.9
  function SameValue(x, y)
  {
    if (typeof x !== typeof y)
    {
      return false;
    }
    if (typeof x === "number")
    {
      if (isNaN(x) && isNaN(y))
      {
        return true;
      }
      if ($BASE$.isPositiveZero(x) && $BASE$.isNegativeZero(y))
      {
        return false;
      }
      if ($BASE$.isNegativeZero(x) && $BASE$.isPositiveZero(y))
      {
        return false;
      }
      if ($BASE.sameNumberValue(x, y))
      {
        return true;
      }
      return false;
    }
    return SameValueNonNumber(x, y);
  }
  
  // 7.2.11
  function SameValueNonNumber(x, y)
  {
    assert(typeof x !== "number");
    assert(typeof x === typeof y);
    if (x === undefined)
    {
      return true;
    }
    if (x === null)
    {
      return true;
    }
    if (typeof x === "string")
    {
      return $BASE$.sameStringValue(x, y);
    }
    if (typeof x === "boolean")
    {
      return $BASE$.sameBooleanValue(x, y);
    }
    if (typeof x === "symbol")
    {
      throw new Error("NYI");
    }
    return $BASE$.sameObjectValue(x, y);
  }
  
  // 7.3.1
  function Get(O, P)
  {
    assert(typeof O === "object");
    assert(IsPropertyKey(P));
    return $BASE$.callInternal(O, "[[Get]]", P, O);
  }
  
  // 7.3.7
  function DefinePropertyOrThrow(O, P, desc)
  {
    assert(typeof O === "object");
    assert(IsPropertyKey(P));
    var success = $BASE$.callInternal(O, "[[DefineOwnProperty]]", P, desc);
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
    return $BASE$.callInternal(O, "[[HasProperty]]", P);
  }
  
  // 7.3.19
  function OrdinaryHasInstance(C, O)
  {
    if (IsCallable(C) === false)
    {
      return false;
    }
    if ($BASE$.hasInternal(C, "[[BoundTargetFunction]]"))
    {
      var BC = $BASE$.lookupInternal(C, "[[BoundTargetFunction]]");
      return InstanceofOperator(O, BC);
    }
    if (typeof O !== "object")
    {
      return false;
    }
    var P = Get(C, "prototype");
    if (typeof P !== "object")
    {
      throw new TypeError("non-object prototype");
    }
    while (true)
    {
      var O = $BASE$.callInternal(O, "[[GetPrototypeOf]]");
      if (O === null)
      {
        return false;
      }
      if (SameValue(P, O) === true)
      {
        return true;
      }
      print("not same VALUE", P, O);
    }
  }
  
  // 9.1.1.1
  function OrdinaryGetPrototypeOf(O)
  {
    return $BASE$.lookupInternal(O, "[[Prototype]]");
  }
  
  // 9.1.5.1
  function OrdinaryGetOwnProperty(O, P)
  {
    assert(IsPropertyKey(P));
    var X = $BASE$.getOwnProperty(O, P);
    if (!X)
    {
      return undefined;
    }
    var D = $BASE$.createPropertyDescriptor();
    if ($BASE$.isDataProperty(X))
    {
      $BASE$.setDescriptorValue(D, $BASE$.getDescriptorValue(X));
      $BASE$.setDescriptorWritable(D, $BASE$.getDescriptorWritable(X));
    }
    else
    {
      $BASE$.setDescriptorGet(D, $BASE$.getDescriptorGet(X));
      $BASE$.setDescriptorSet(D, $BASE$.getDescriptorSet(X));
    }
    $BASE$.setDescriptorEnumerable(D, $BASE$.getDescriptorEnumerable(X));
    $BASE$.setDescriptorConfigurable(D, $BASE$.getDescriptorConfigurable(X));
    return D;
  }
  
  // 9.1.7.1
  function OrdinaryHasProperty(O, P)
  {
    assert(IsPropertyKey(P));
    var hasOwn = $BASE$.callInternal(O, "[[GetOwnProperty]]", P);
    if (hasOwn !== undefined)
    {
      return true;
    }
    var parent = $BASE$.callInternal(O, "[[GetPrototypeOf]]", P);
    if (parent !== null)
    {
      return $BASE$.callInternal(parent, "[[HasProperty]]", P);
    }
    return false;
  }
  
  // 9.1.8.1
  // implemented in base
  
  // 12.10.4
  function InstanceofOperator(O, C)
  {
    if (typeof C !== "object")
    {
      throw new TypeError("not an object");
    }
    var instOfHandler = undefined; // TODO step 2
    if (instOfHandler !== undefined)
    {
      throw new Error("NYI");
    }
    if (IsCallable(C) === false)
    {
      throw new TypeError("not a callable");
    }
    return OrdinaryHasInstance(C, O);
  }
  
  
  var globalObject = {};
  globalObject["undefined"] = undefined;
  globalObject["NaN"] = NaN;
  
  return globalObject;
  
})();