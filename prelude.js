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
        let obj = $BASE$.ObjectCreate(O);
        if (Properties !== undefined)
        {
          return $BASE$.ObjectDefineProperties(obj, Properties);
        }
        return obj;
      }
      
  // 19.1.2.3
  Object.defineProperties = $BASE$.ObjectDefineProperties;
  
  // // 19.1.2.3.1
  // function ObjectDefineProperties(O, Properties)
  //   {
  //     if (typeof O !== "object")
  //     {
  //       throw new TypeError();
  //     }
  //     var props = $BASE$.ToObject(Properties);
  //     var keys = $BASE$.callInternal(props, "[[OwnPropertyKeys]]");
  //     var descriptors = [];
  //     for (var nextKey of keys)
  //     {
  //       var propDesc = $BASE$.callInternal(props, "[[GetOwnProperty]]", nextKey);
  //       if (propDesc !== undefined && $BASE$.lookupInternal(propDesc, "[[Enumerable]]"))
  //       {
  //         var descObj = $BASE$.callInternal(props, "[[Get]]", nextKey);
  //         var desc = $BASE$.ToPropertyDescriptor(descObj);
  //         descriptors.push([nextKey, desc]);
  //       }
  //     }
  //     for (var pair of descriptors)
  //     {
  //       var P = pair[0];
  //       var desc = pair[1];
  //       $BASE$.DefinePropertyOrThrow(O, P, desc);
  //     }
  //     return O;
  //   }
  
  // 19.1.2.4
  Object.defineProperty =
      function (O, P, Attributes)
      {
        if (typeof O !== "object")
        {
          throw new TypeError("Object.defineProperty called on non-object");
        }
        let key = $BASE$.ToPropertyKey(P);
        let desc = $BASE$.ToPropertyDescriptor(Attributes);
        $BASE$.DefinePropertyOrThrow(O, key, desc);
        return O;
      }

  // 19.1.2.8
  // Object.getOwnPropertyDescriptor =

  // 19.1.2.11
  Object.getPrototypeOf =
      function (O)
      {
        var obj = $BASE$.ToObject(O);
        return $BASE$.callInternal(obj, "[[GetPrototypeOf]]");
      }

  // 19.1.3.3
  Object.defineProperty(Object.prototype, "isPrototypeOf",
      {
        value:
            function (V)
            {
              if (typeof V !== "object")
              {
                return false;
              }
              var O = $BASE$.ToObject(this);
              while (true)
              {
                V = $BASE$.callInternal(V, "[[GetPrototypeOf]]");
                if (V === null)
                {
                  return false;
                }
                if ($BASE$.SameValue(O, V))
                {
                  return true;
                }
              }
            },
        writable:true, enumerable:false, configurable: true
      })

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
  let TypeErrorPrototype = Object.create(Error.prototype);
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


  // 21.1.3.18
  String.prototype.slice =
  function (begin, end)
  {
    return this.substring(begin, end);   //FIXME: There are differences between substring and slice!
  }

  // 21.1.3.19
  String.prototype.split =
    function (spl)
    {
      var stringValue = thisStringValue(this);
      var result = [];
      var cur = 0;
      while (cur < stringValue.length)
      {
        var next = stringValue.indexOf(spl, cur);
        if (next < 0)
        {
          next = stringValue.length;
        }
        var sub = stringValue.substring(cur, next);
        result.push(sub);
        // print(cur, next, spl.length, sub);
        cur = next + spl.length;
      }
        return result;
    }

  // 21.1.3.22
  String.prototype.substring =
      function (start, end)
      {
        var S = String(this);
        var len = S.length;
        var intStart = start; // TODO ToInteger
        var intEnd;
        if (end === undefined)
        {
          intEnd = len;
        }
        else
        {
          intEnd = end; // TODO ToInteger
        }
        var finalStart = Math.min(Math.max(intStart, 0), len);
        var finalEnd = Math.min(Math.max(intEnd, 0), len);
        var from = Math.min(finalStart, finalEnd);
        var to = Math.max(finalStart, finalEnd);

        var R = "";
        for (var i = from; i < to; i++)
        {
          R += S.charAt(i);
        }
        return R;
      }

  // 21.1.3.25
  String.prototype.toString =
      function ()
      {
        return thisStringValue(this);
      }

  // 21.1.3.8
  String.prototype.indexOf = 
      function(searchString, start) 
      { 
        if (typeof start !== 'number') 
        {
          start = 0;
        }
        if (searchString === undefined) 
        {
          return -1;
        } else if (searchString === '') 
        {
          return this.length < start ? this.length : start;
        } 
        else 
        {
          var searchLength = searchString.length;
          var count = 0;
          
          for (var i = start; i < this.length - searchLength + 1; i++) 
          {
            for (var j = 0; j < searchLength; j++) 
            {
              if (this.charAt(i + j) === searchString.charAt(j))
              {
                count = count + 1;
                if (count === searchLength)
                {
                  return i;
                }
              } else 
              {
                count = 0;
                break;
              }
            }
          }
          return -1;
        }
    }

  // 21.1.3.7
  String.prototype.includes = 
      function (searchString, start)
      {
        if (typeof start !== 'number') 
        {
          start = 0;
        }
        
        if (start + searchString.length > this.length) 
        {
          return false;
        }
         else 
        {
          return this.indexOf(searchString, start) !== -1;
        }
      }

  // 22.1.3.1
  Array.prototype.concat =
      function (argument) // TODO: multiple args
      {
        let result = [];
        for (var i = 0; i < this.length; i++)
        {
          result.push(this[i]);
        }
        for (var j = 0; j < argument.length; j++)
        {
          result.push(argument[j]);
        }
        return result;
      }

  // 22.1.3.5
  Array.prototype.every = 
      function (f)
      {
        for (var i = 0; i < this.length; i++) 
        {
          var x = this[i];
          if(!f(x))
          {
            return false;
          }
        }
        return true;
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
      
  // 22.1.3.8
  Array.prototype.find =
      function (f, thisArg)
      {
        for (var i = 0; i < this.length; i++)
        {
         var x = this[i];
          if (f.call(thisArg, x))
          {
            return x;
          }
        }
        return undefined;
      }

  // 22.1.3.12
  Array.prototype.forEach =
      function (f)
      {
        for (var i = 0; i < this.length; i++)
        {
          f(this[i]);
        }
      }
      
  // 22.1.3.14
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

  // 22.1.3.15
  Array.prototype.join =
    function (separator)
    {
      var len = this.length;
      if (separator === undefined)
      {
        sep = ",";
      }
      else
      {
        sep = String(separator);
      }
      var R = "";
      var k = 0;
      while (k < len)
      {
        if (k > 0)
        {
          R += sep;
        }
        var element = this[k];
        var next;
        if (element === undefined || element === null)
        {
          next = "";
        }
        else
        {
          next = String(element);
          //print("element", element, "next", next);
        }
        R += next;
        k += 1;
        //print("::", R, k);
      }
      return R;
    }

  // 22.1.3.18
  Array.prototype.map =
      function (f, thisArg)
      {
        let result = [];
        for (let i = 0; i < this.length; i++)
        {
          var x = this[i];
          if (x === undefined)
          {
            result.push(undefined);
          }
          else
          {
            result.push(f.call(thisArg, this[i], i));
          }
        }
        return result;
      }
      
  // 22.1.3.19
  Array.prototype.pop =
      function()
      {
        if (this.length > 0)
        {
          var r = this[this.length - 1];
          this.length = this.length - 1;
          return r;
        }
        return undefined;
      }

  // 22.1.3.20
  // Array.prototype.push: impl

  // 22.1.3.21
  Array.prototype.reduce =
      function (f, initialValue)
      {
        var result;
        var start;
        if (initialValue === undefined) // TODO not correct, should be absence check (# of args)
        {
          if (this.length === 0)
          {
            throw new TypeError("Reduce of empty array with no initial value");
          }
          result = this[0];
          start = 1;
        }
        else
        {
          result = initialValue;
          start = 0;
        }

        for (var i = start; i < this.length; i++)
        {
          result = f(result, this[i]);
        }
        return result;
      }

  // 22.1.3.26
  Array.prototype.some =
      function (f, thisArg)
      {
        for (var i = 0; i < this.length; i++)
        {
          var x = this[i];
          if (f.call(thisArg, x))
          {
            return true;
          }
        }
        return false;
      }

  function insertionSort(arr, f)
  {
    for (i = 1; i < arr.length; i++)
    {
      var x = arr[i];
      var j = i - 1;
      while (j >= 0 && f(arr[j], x) > 0)
      {
        arr[j+1] = arr[j]
        j--;
      }
      arr[j+1] = x;
    }
    return arr;
  }
  
  // 22.1.3.27
  Array.prototype.sort =
      function (f)
      {
        if (f === undefined)
        {
          throw new Error("22.1.3.25 - NYI");
        }
        return insertionSort(this, f);
      }
      
  // 22.1.3.28
  Array.prototype.splice =
      function (index, c)
      {
        for (i = index + c; i < this.length; i++)
        {
          this[i - c] = this[i];
        }
        this.length = this.length - c;
        return undefined; //FIXME: See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
      }

})(this);
