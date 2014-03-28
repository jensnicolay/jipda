var Eq =
  {
    equals:function (x, y)
    {
      if (Object.is(x,y))
      {
        return true;
      }
      if (x === undefined || y === undefined || x === null || y === null)
      {
        return false;
      }
//      if (!x.equals)
//      {
//        throw new Error("argh: " + x);
//        return false;
//      }
      return x.equals(y);
    }
  }

Eq.checker =
  function (x)
  {
    return function (y) { return Eq.equals(x,y); }; 
  };  
  
var HashCode = {};
HashCode.hashCode =
  function (x)
  {
    if (x === undefined || x === null)
    {
      return 0; 
    }
    if (!x.hashCode) {
      print(x, x.constructor)
      };
    return x.hashCode();
  }
  
var Visitor = {};
Visitor.accept = function (visitor) {return function (x) {return x.accept ? x.accept(visitor) : String(x)}};
  
Boolean.prototype.equals =
  function (x)
  {
    return this.valueOf() === x.valueOf();
  };
  
Boolean.prototype.hashCode =
  function ()
  {
    return this.valueOf() ? 1231 : 1237;
  }

Number.prototype.equals =
  function (x)
  {
    return this.valueOf() === x; 
  };
  
Number.prototype.hashCode =
  function ()
  {
    return this.valueOf();
  }
  
Array.prototype.toString =
  function ()
  {
    // return "[" + this.join(",") + "]"; doesn't work for [undefined]
    if (this.length === 0)
    {
      return "[]";
    }
    var s = "[";
    for (var i = 0; i < this.length - 1; i++)
    {
      s += this[i] + ","; 
    }
    s += this[i] + "]";
    return s;   
  };

Array.prototype.memberAt =
  function (x)
  {
    for (var i = 0; i < this.length; i++)
    {
      var el = this[i];
      if (Eq.equals(x, el))
      {
        return i;
      }
    }
    return -1;
  };

Array.prototype.flatten =
  function ()
  {
    return this.reduce(function (p, c) {return p.concat(c)}, []);
  };

Array.prototype.flatMap =
  function (f, th)
  {
    return this.map(f, th).flatten();
  };
  
Array.prototype.addFirst =
  function (x)
  {
    return [x].concat(this);
  };    

Array.prototype.addLast =
  function (x)
  {
    if (Array.isArray(x))
    {
      return this.concat([x]);
    }
    return this.concat(x);
  };    
  
Array.prototype.addUniqueLast =
  function (x)
  {
    if (this.memberAt(x) > -1)
    {
      return this;
    }
    return this.addLast(x);
  };
  
Array.prototype.remove =
  function (x)
  {
    var i = this.memberAt(x);
    if (i === -1)
    {
      return this.slice(0);
    }
    return this.slice(0, i).concat(this.slice(i+1));
  }
  
Array.prototype.removeAll =
  function (xs)
  {
    return this.flatMap(
      function (el)
      {
        if (xs.memberAt(el) > -1)
        {
          return [];
        }
        return [el];
      });
  }

Array.prototype.keepAll =
  function (xs)
  {
    return this.flatMap(
      function (el)
      {
        if (xs.memberAt(el) === -1)
        {
          return [];
        }
        return [el];
      });
  }

Array.prototype.toSet = 
  function ()
  {
    var result = [];
    for (var i = 0; i < this.length; i++)
    {
      result = result.addUniqueLast(this[i]);
    }
    return result;
  }
  
Array.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (x === undefined || x === null)
    {
      return false;
    }
    var length = x.length;
    if (this.length != length)
    {
      return false;
    }
    for (var i = 0; i < length; i++)
    {
      var xi = x[i];
      var thisi = this[i];
      if (!Eq.equals(xi, thisi))
      {
        return false;
      }
    }
    return true;
  };
  
Array.prototype.hashCode =
  function()
  {
    var l = this.length;
    if (l === 0)
    {
      return 0;
    }
    var result = 1;
    for (var i = 0; i < l; i++)
    {
      result = (31 * result + HashCode.hashCode(this[i])) >> 0;
    }
    return result;
  }
    
Array.prototype.setHashCode =
  function()
  {
    var l = this.length;
    if (l === 0)
    {
      return 0;
    }
    var result = 1;
    for (var i = 0; i < l; i++)
    {
      result = result ^ HashCode.hashCode(this[i]);
    }
    return result;
  }
      
Array.prototype.subsumes =
  function (xs)
  {
    for (var i = 0; i < xs.length; i++)
    {
      if (this.memberAt(xs[i]) === -1)
      {
        return false;
      }
    }
    return true;
  };
    
Array.prototype.setEquals =
  function (x)
  {
    var length = x.length;
    if (this.length != length)
    {
      return false;
    }
    for (var i = 0; i < length; i++)
    {
      var xi = x[i];
      if (this.memberAt(xi) === -1)
      {
        return false;
      }
    }
    return true;
  }

Array.prototype.addEntry =
  function (key, value)
  {
    return this.addFirst([key, value]); 
  };
  
Array.prototype.getEntry =
  function (key)
  {
    for (var i = 0; i < this.length; i++)
    {
      var entry = this[i];
      var entryKey = entry[0];
      if (Eq.equals(key, entryKey))
      {
        return entry;
      }
    }
    return false;
  }

Array.prototype.getValue =
  function (key)
  {
    return this.getEntry(key)[1];
  }

Array.prototype.updateEntry =
  function (key, value)
  {
    for (var i = 0; i < this.length; i++)
    {
      var entry = this[i];
      var entryKey = entry[0];
      if (Eq.equals(entryKey, key))
      {
        return this.slice(0, i).concat([[entryKey, value]]).concat(this.slice(i + 1));
      }
    }
    return this.concat([[key, value]]);
  };
  
Array.prototype.entryKeys =
  function ()
  {
    return this.map(
      function (entry)
      {
        return entry[0];
      });
  } 
  
Array.prototype.entryValues =
  function ()
  {
    return this.map(
      function (entry)
      {
        return entry[1];
      });
  } 

Array.prototype.getSetEntry =
  function (key)
  {
    var entry = this.getEntry(key);
    if (entry)
    {
      return entry[1];
    }
    return [];
  } 
  
Array.prototype.updateSetEntry =
  function (key, value)
  {
    for (var i = 0; i < this.length; i++)
    {
      var entry = this[i];
      var entryKey = entry[0];
      if (Eq.equals(entryKey, key))
      {
        return this.slice(0, i).concat([[key, entry[1].addUniqueLast(value)]]).concat(this.slice(i + 1));
      }
    }
    return this.concat([[key, [value]]]);
  };
  
var Arrays = {};
  
Arrays.indexOf =
  function (x, arr, eq)
  {
    for (var i = 0; i < arr.length; i++)
    {
      if (eq(x, arr[i]))
      {
        return i;
      }
    }
    return -1;
  }

Arrays.removeFirst =
  function (x, arr, eq)
  {
    var index = Arrays.indexOf(x, arr, eq);
    if (index === -1)
    {
      return arr;
    }
    return Arrays.removeIndex(index);
  }

Arrays.removeIndex =
  function (index, arr)
  {
    return arr.slice(0, index).concat(arr.slice(index + 1));
  }

Arrays.remove =
  function (x, arr, eq)
  {
    return arr.filter(function (y) {return !eq(y, x)});
  }

Arrays.removeAll =
  function (xs, arr, eq)
  {
    return xs.reduce(function (arr, x) {return Arrays.remove(x, arr, Eq.equals)}, arr);
  }


Arrays.contains =
  function (x, arr, eq)
  {
    return Arrays.indexOf(x, arr, eq) > -1;
  }

/**
 * Returns new array.
 */
Arrays.member =
  function (x, arr, eq)
  {
    return arr.slice(Arrays.indexOf(x, arr, eq));
  }

/**
 * O(n^2)
 */
Arrays.deleteDuplicates =
  function (arr, eq)
  {
    return arr.reduce(
      function (acc, x)
      {
        return Arrays.indexOf(x, acc, eq) === -1 ? acc.concat([x]) : acc; 
      }, []);
  }

Arrays.union =
  function (arr1, arr2, eq)
  {
    return Arrays.deleteDuplicates(arr1.concat(arr2), eq);
  }

// subset of 2 distinct elements of arr
Arrays.twoCombinations =
  function (arr)
  {
    var result = [];
    for (var i = 0; i < arr.length - 1; i++)
    {
      for (var j = i + 1; j < arr.length; j++)
      {
        result.push([arr[i], arr[j]]);
      }
    }
    return result;
  }

Arrays.cartesianProduct =
  function (arr)
  {
    if (arr.length === 0)
    {
      return [];
    }
    if (arr.length === 1)
    {
       return arr[0].map(
        function (x)
        {
          return [x];
        });
    }
    var rest = Arrays.cartesianProduct(arr.slice(1));
    return arr[0].flatMap(
      function (x)
      {
        return rest.map(
          function (y) 
          { 
            return y.addFirst(x);
          });
      });
  };


Arrays.keys =
  function (arr)
  {
    return arr.map(function (x) {return x[0]});
  }

Arrays.values =
  function (key, arr, eq)
  {
    return arr.reduce(function (acc, x) {return eq(x[0], key) ? acc.concat([x[1]]) : acc});
  }

String.prototype.startsWith =
  function (s)
  {
    return this.lastIndexOf(s, 0) === 0;
  };
  
String.prototype.endsWith = 
  function (s)
  {
    return this.indexOf(s, this.length - s.length) !== -1;
  };
  
String.prototype.equals =
  function (x)
  {
    return this.localeCompare(x) === 0; 
  };
  
String.prototype.hashCode =
  function()
  {
    var l = this.length;
    if (l === 0)
    {
      return 0;
    }
    var result = 1;
    for (var i = 0; i < l; i++)
    {
      result = (31 * result + this.charCodeAt(i)) >> 0;
    }
    return result;
  }

var Character = {};

Character.isWhitespace =
  function (x)
  {
    return x === " " || x === "\n" || x === "\t" || x === "\r";
  }
  
Character.isDigit =
  function (x)
  {
    return x === "0" || x === "1" || x === "2" || x === "3" || x === "4" || x === "5" || x === "6" || x === "7" || x === "8" || x === "9";
  }
  
Function.prototype.toString =
  function ()
  {
    return this.name + "()";
  };    
  
// debug
function d(value) { print(Array.prototype.slice.call(arguments)); return value; }
function dreadline() { var str = readline(); if (str === ":b") { throw new Error(":b"); }}

// assertions
function assertEquals(expected, actual, msg)
{
  if (expected === undefined && actual === undefined)
  {
    return;
  }
  if (expected !== undefined && (expected === actual || (expected.equals && expected.equals(actual))))
  {
    return;
  }
  throw new Error(msg || "assertEquals: expected " + expected + ", got " + actual);
}

function assertSetEquals(expected, actual)
{
  if (expected.toSet().setEquals(actual.toSet()))
  {
    return;
  }
  throw new Error("assertSetEquals: expected " + expected + ", got " + actual + "\ndiff " + expected.removeAll(actual) + "\n     " + actual.removeAll(expected)); 
}

function assertNotEquals(expected, actual)
{
  if (expected !== actual && !expected.equals(actual))
  {
    return;
  }
  throw new Error("assertNotEquals: not expected " + expected + ", got " + actual);
}

function assertTrue(actual, msg)
{
  if (actual === true)
  {
    return;
  }
  throw new Error(msg || "assertTrue: got " + actual);
}

function assertFalse(actual)
{
  if (actual === false)
  {
    return;
  }
  throw new Error("assertFalse: got " + actual);
}

function assertNaN(actual)
{
  if (isNaN(actual))
  {
    return;
  }
  throw new Error("assertNaN: got " + actual);
}

function assertDefinedNotNull(actual, msg)
{
  if (actual === undefined || actual === null)
  {
    throw new Error(msg || "assertDefinedNotNull: got " + actual);
  }
}


// ECMA
var Ecma = { POW_2_31 : Math.pow(2,31), POW_2_32 : Math.pow(2,32)};

// 5.2 (not included here are equivalent Math.* functions)
Ecma.sign =
  function (x)
  {
    // per 5.2: "sign is never used in standard for x = 0"
    return (x < 0 ? -1 : 1);
  };

// 8.6.2
Ecma.Class =
  {
    OBJECT: "Object", 
    FUNCTION: "Function", 
    ARRAY: "Array", 
    ARGUMENTS: "Arguments", 
    STRING: "String", 
    BOOLEAN: "Boolean", 
    NUMBER: "Number",
    MATH: "Math",
    DATE: "Date",
    REGEXP: "RegExp",
    ERROR: "Error",
    JSON: "JSON"
  };

var Collections = {};

/*
 * Map interface
 * 
 * equals/hashCode TODO
 * put
 * get
 * entries
 * keys
 * values
 * size
 * clear
 *  
 */

function Map()
{
}

Map.prototype.subsumes =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (this.size() < x.size())
    {
      return false;
    }
    return x.iterateEntries(
      function (entry)
      {
        var value = this.get(entry.key);
        return value !== undefined && value.subsumes(entry.value);
      }, this);
  }

Map.prototype.compareTo =
  function (x)
  {
    var s1 = this.subsumes(x);
    var s2 = x.subsumes(this);
    return s1 ? (s2 ? 0 : 1) : (s2 ? -1 : undefined);
  }

Map.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (this.size() !== x.size())
    {
      return false;
    }
    return this.iterateEntries(
        function (entry)
        {
          var xValue = x.get(entry.key);
          return xValue !== undefined && entry.value.equals(xValue);
        });
  }

Map.prototype.hashCode =
  function ()
  {
    if (this._hashCode !== undefined)
    {
      return this._hashCode;
    }
    var result = 1;
    this.iterateEntries(
        function (entry)
        {
          result = (result + (31 * HashCode.hashCode(entry.key) ^ HashCode.hashCode(entry.value))) >> 0;
        });
    this._hashCode = result;
    return result;
  }

Map.prototype.putAll =
  function (map)
  {
    return map.entries().reduce(function (result, entry) {return result.put(entry.key, entry.value)}, this);
  }

Map.prototype.join =
  function (map, bot)
  {
    return this.joinWith(map, function (x, y) {return x.join(y)}, bot);
  }

Map.prototype.joinWith =
  function (x, join, bot)
  {
    print("joinWith TO CHECK");
    var result = this;
    return x.iterateEntries(
      function (entry)
      {
        var key = entry.key;
        var thisValue = this.get(key, bot);
        var xValue = entry.value;
        var value = join(thisValue, xValue);
        result = result.put(key, value);
      }, this);
  }

//Map.prototype.removeAll =
//  function (keys)
//  {
//    var result = this.clear();
//    this.iterateEntries(
//      function (entry)
//      {
//        var key = entry.key;
//        if (!Arrays.contains(key, keys, Eq.equals))
//        {
//          result = result.put(key, entry.value);
//        }
//      });
//    return result;
//  }

Map.prototype.narrow =
  function (keys)
  {
    var result = this.clear();
    this.iterateEntries(
      function (entry)
      {
        var key = entry.key;
        if (Arrays.contains(key, keys, Eq.equals))
        {
          result = result.put(key, entry.value);
        }
      });
    return result;
  }

function ArrayMap(arr)
{
  this._arr = arr
}
ArrayMap.prototype = Object.create(Map.prototype);
ArrayMap.empty =
  function ()
  {
    return new ArrayMap([]);
  }
ArrayMap.from =
  function (arr)
  {
    return new ArrayMap(arr);
  }
ArrayMap.prototype.put =
  function (key, value)
  {
    var arr = this._arr;
    for (var i = 0; i < arr.length; i++)
    {
      var entry = arr[i];
      if (Eq.equals(entry.key, key))
      {
        if (Eq.equals(entry.value, value))
        {
          return this;
        }
        var newArr = arr.slice(0);
        newArr[i] = {key:key,value:value};
        return new ArrayMap(newArr);
      }
    }
    var newArr = arr.slice(0);
    newArr.push({key:key,value:value});
    return new ArrayMap(newArr);  
  }

ArrayMap.prototype.get =
  function (key, bot)
  {
    var arr = this._arr;
    for (var i = 0; i < arr.length; i++)
    {
      var entry = arr[i];
      if (Eq.equals(entry.key, key))
      {
        return entry.value;
      }
    }
    return bot;
  }

ArrayMap.prototype.entries =
  function ()
  {
    return this._arr.slice(0);
  }

ArrayMap.prototype.iterateEntries =
  function (f, th)
  {
    var arr = this._arr;
    for (var i = 0; i < arr.length; i++)
    {
      if (f.call(th, arr[i]) === false)
      {
        return false;
      }
    }
    return true;
  }

ArrayMap.prototype.keys =
  function ()
  {
    return this._arr.map(function (entry) {return entry.key});
  }

ArrayMap.prototype.values =
  function ()
  {
    return this._arr.map(function (entry) {return entry.value});
  }

ArrayMap.prototype.size =
  function ()
  {
    return this._arr.length;
  }

ArrayMap.prototype.clear =
  function ()
  {
    return new ArrayMap([]);
  }

ArrayMap.prototype.toString =
  function ()
  {
    return this._arr.map(function (entry) {return entry.key + " -> " + entry.value}).toString();
  }

ArrayMap.prototype.nice =
  function ()
  {
    return this._arr.map(function (entry) {return entry.key + " -> " + entry.value}).join("\n");
  }

function HashMap(buckets)
{
  this._buckets = buckets;
}
HashMap.prototype = Object.create(Map.prototype);

HashMap.empty =
  function (size)
  {
    var buckets = new Array(size || 13);
    buckets.size = 0;
    return new HashMap(buckets);
  }

HashMap.from =
  function (arr)
  {
    return arr.reduce(function (result, entry) {return result.put(entry.key, entry.value)}, HashMap.empty());
  }

HashMap.prototype.put =
  function (key, value)
  {
    var keyHash = key.hashCode();
    var index = (keyHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];
    if (!entries)
    {
      var newEntries = [{key:key, value:value}];
    }
    else
    {
      for (var i = 0; i < entries.length; i++)
      {
        var entry = entries[i];
        if (Eq.equals(key, entry.key))
        {
          var newEntries = entries.slice(0);
          newEntries[i] = {key:key, value:value};
          var newBuckets = this._buckets.slice(0);
          newBuckets[index] = newEntries;
          newBuckets.size = this.size(); 
          return new HashMap(newBuckets);      
        }
      }
      var newEntries = entries.slice(0);
      newEntries[i] = {key:key, value:value};      
    }
    var newBuckets = this._buckets.slice(0);
    newBuckets[index] = newEntries;
    newBuckets.size = this.size() + 1;
    return new HashMap(newBuckets);      
  }

HashMap.prototype.get =
  function (key, bot)
  {
    var keyHash = key.hashCode();
    var index = (keyHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];    
    if (!entries)
    {
      return bot;
    }
    for (var i = 0; i < entries.length; i++)
    {
      var entry = entries[i];
      if (Eq.equals(key, entry.key))
      {
        return entry.value;
      }
    }
    return bot;
  }

HashMap.prototype.remove =
  function (key)
  {
    var keyHash = key.hashCode();
    var index = (keyHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];
    if (!entries)
    {
      return this;
    }
    for (var i = 0; i < entries.length; i++)
    {
      var entry = entries[i];
      if (Eq.equals(key, entry.key))
      {
        var newEntries = entries.slice(0, i).concat(entries.slice(i + 1));
        var newBuckets = this._buckets.slice(0);
        newBuckets[index] = newEntries;
        newBuckets.size = this.size() - 1; 
        return new HashMap(newBuckets);
      }
    }
    return this;        
  }

HashMap.prototype.entries =
  function ()
  {
    return this._buckets.flatten();
  }

HashMap.prototype.iterateEntries =
  function (f, th)
  {
    var buckets = this._buckets;
    for (var i = 0; i < buckets.length; i++)
    {
      var bucket = buckets[i];
      if (bucket)
      {
        for (var j = 0; j < bucket.length; j++)
        {
          if (f.call(th, bucket[j]) === false)
          {
            return false;
          }
        }        
      }
    }
    return true;
  }

HashMap.prototype.keys =
  function ()
  {
    return this._buckets.flatten().map(function (entry) {return entry.key});
  }

HashMap.prototype.values =
  function ()
  {
    return this._buckets.flatten().map(function (entry) {return entry.value});
  }

HashMap.prototype.size =
  function ()
  {
    return this._buckets.size;
  }

HashMap.prototype.clear =
  function ()
  {
    var buckets = new Array(this._buckets.length);
    buckets.size = 0;
    return new HashMap(buckets);
  }

HashMap.prototype.toString =
  function ()
  {
    return this.entries().map(function (entry) {return entry.key + " -> " + entry.value}).toString();
  }

HashMap.prototype.nice =
  function ()
  {
    return this.entries().map(function (entry) {return entry.key + " -> " + entry.value}).join("\n");
  }

/*
 * Set interface
 * 
 * equals, hashCode (based on values)
 * add
 * addAll
 * contains
 * values
 * size
 *  
 */
function Set()
{
}

Set.prototype.subsumes =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (this.size() < x.size())
    {
      return false;
    }
    var xValues = x.values();
    for (var i = 0; i < xValues.length; i++)
    {
      if (!this.contains(xValues[i]))
      {
        return false;
      }
    }
    return true;
  }

Set.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (this.size() !== x.size())
    {
      return false;
    }
    return this.iterateValues(function (value) {return x.contains(value)}); 
//    var values = this.values();
//    for (var i = 0; i < values.length; i++)
//    {
//      if (!x.contains(values[i]))
//      {
//        return false;
//      }
//    }
//    return true;
  }

Set.prototype.hashCode =
  function ()
  {
    if (this._hashCode !== undefined)
    {
      return this._hashCode;
    }
    var result = this.values().setHashCode(); 
    this._hashCode = result;
    return result;
  }

Set.prototype.compareTo =
  function (x)
  {
    var s1 = this.subsumes(x);
    var s2 = x.subsumes(this);
    return s1 ? (s2 ? 0 : 1) : (s2 ? -1 : undefined);
  }

Set.prototype.join =
  function (x)
  {
    return x.values().reduce(function (result, value) {return result.add(value)}, this);
  } 

Set.prototype.meet =
  function (x)
  {
    return this.values().reduce(function (result, value) {return x.contains(value) ? result.add(value) : result}, this.clear());
  } 

Set.prototype.subtract =
  function (x)
  {
    return this.values().reduce(function (result, value) {return x.contains(value) ? result : result.add(value)}, this.clear());
  } 

function HashSet(map)
{
  this._map = map;
}
HashSet.prototype = Object.create(Set.prototype);

HashSet.empty =
  function (size)
  {
    return new HashSet(TrieMap.empty());
  }

HashSet.from =
  function (arr)
  {
    return arr.reduce(function (result, x) {return result.add(x)}, HashSet.empty());
  }

HashSet.prototype.clear =
  function ()
  {
    return new HashSet(this._map.clear());
  }

HashSet.prototype.add =
  function (value)
  {
    var existing = this._map.get(value);
    if (existing === undefined)
    {
      return new HashSet(this._map.put(value, value));
    }
    return this;
  }

HashSet.prototype.addAll =
  function (values)
  {
    var result = this;
    for (var i = 0; i < values.length; i++)
    {
      result = result.add(values[i]);
    }
    return result;
  }

HashSet.prototype.remove =
  function (value)
  {
    return new HashSet(this._map.remove(value));
  }

HashSet.prototype.removeAll =
  function (values)
  {
    return new HashSet(this._map.removeAll(values));
  }

HashSet.prototype.contains =
  function (value)
  {
    var existing = this._map.get(value);
    return existing !== undefined;
  }

HashSet.prototype.filter =
  function (f, ths)
  {
    print("filter");
    return HashSet.from(this.values().filter(f, ths));
  }

HashSet.prototype.values =
  function ()
  {
    return this._map.values();
  }

HashSet.prototype.size =
  function ()
  {
    return this._map.size();
  }

HashSet.prototype.toString =
  function ()
  {
    return this._map.values().toString();
  }

HashSet.prototype.nice =
  function ()
  {
    return this.toString();
  }

HashSet.prototype.iterateValues =
  function (f, th)
  {
    return this._map.iterateEntries(function (entry) {return f.call(th, entry.value)});
  }

function ArraySet(arr)
{
  this._arr = arr;
}
ArraySet.prototype = Object.create(Set.prototype);

ArraySet.empty =
  function ()
  {
    return new ArraySet([]);
  }
ArraySet.from =
  function (arr)
  {
    return new ArraySet(Arrays.deleteDuplicates(arr, Eq.equals));
  }

ArraySet.from1 =
  function (x)
  {
    return new ArraySet([x]);
  }

ArraySet.prototype.clear =
  function ()
  {
    return new ArraySet([]);
  }


ArraySet.prototype.add =
  function (value)
  {
    var index = Arrays.indexOf(value, this._arr, Eq.equals);
    if (index > -1)
    {
      return this;
    }
    return new ArraySet(this._arr.concat([value]));
  }

ArraySet.prototype.addAll =
  function (values)
  {
    var result = this;
    for (var i = 0; i < values.length; i++)
    {
      result = result.add(values[i]);
    }
    return result;
  }

ArraySet.prototype.remove =
  function (value)
  {
    return new ArraySet(Arrays.removeFirst(value, this._arr, Eq.equals));
  }

ArraySet.prototype.removeAll =
  function (values)
  {
    return new ArraySet(values.reduce(function (arr, value) {return Arrays.removeFirst(value, arr, Eq.equals)}, this._arr));
  }

ArraySet.prototype.contains =
  function (value)
  {
    var index = Arrays.indexOf(value, this._arr, Eq.equals);
    return index > -1;
  }

ArraySet.prototype.filter =
  function (f, ths)
  {
    return new ArraySet(this._arr.filter(f, ths));
  }

ArraySet.prototype.values =
  function ()
  {
    return this._arr.slice(0);
  }

ArraySet.prototype.mapValues =
  function (f, th)
  {
    return this._arr.map(f, th);
  }

ArraySet.prototype.size =
  function ()
  {
    return this._arr.length;
  }

ArraySet.prototype.toString =
  function ()
  {
    return this._arr.toString();
  }

ArraySet.prototype.nice =
  function ()
  {
    return this.toString();
  }

ArraySet.prototype.iterateValues =
  function (f, th)
  {
    var arr = this._arr;
    for (var i = 0; i < arr.length; i++)
    {
      if (f.call(th, arr[i]) === false)
      {
        return false;
      }
    }
    return true;
  }


function TrieMap(node, size)
{
  this._node = node;
  this._size = size;
}
TrieMap.prototype = Object.create(Map.prototype);

TrieMap.mask =
  function (x, p)
  {
    return (x >>> p) & 31;
  }

TrieMap.empty =
  function ()
  {
    return new TrieMap(TrieMap.BitmapNode.empty(), 0);
  }

TrieMap.from =
  function (arr)
  {
    return arr.reduce(function (result, entry) {return result.put(entry.key, entry.value)}, TrieMap.empty());
  }

TrieMap.prototype.clear =
  function ()
  {
    return TrieMap.empty();
  }

TrieMap.prototype.get =
  function (key, bot)
  {
    var hash = key.hashCode();
    return this._node.get(key, hash, bot);
  }

TrieMap.prototype.put =
  function (key, value)
  {
    var sizeBox = [this._size];
    var hash = key.hashCode();
    var node = this._node.put(key, hash, value, sizeBox);
    return new TrieMap(node, sizeBox[0]);
  }

TrieMap.prototype.remove =
  function (key)
  {
    throw new Error("TODO");
  }

TrieMap.prototype.entries =
  function ()
  {
    return this._node.entries();
  }

TrieMap.prototype.iterateEntries =
  function (f, th)
  {
    return this._node.iterateEntries(f, th);
  }

TrieMap.prototype.keys =
  function ()
  {
    return this._node.keys();
  }

TrieMap.prototype.values =
  function ()
  {
    return this._node.values();
  }

TrieMap.prototype.size =
  function ()
  {
    return this._size;
  }

TrieMap.prototype.toString =
  function ()
  {
    return this.entries().map(function (entry) {return entry.key + " -> " + entry.value}).join("\n");
  }

TrieMap.BitmapNode =
  function(arr, level)
  {
    this._arr = arr;
    this._level = level;
  }

TrieMap.BitmapNode.empty =
  function ()
  {
    return new TrieMap.BitmapNode(new Array(31), 0);
  }

TrieMap.BitmapNode.from =
  function (key, hash, value, level)
  {
    var index = TrieMap.mask(hash, level);
    var arr = new Array(31);
    arr[index] = (level === 30 ? TrieMap.CollisionNode.from(key, value) : new TrieMap.LeafNode(key, hash, value, level + 5));
    return new TrieMap.BitmapNode(arr, level); 
  }

TrieMap.BitmapNode.prototype.put =
  function (key, hash, value, sizeBox)
  {
    var level = this._level;
    var arr = this._arr;
    var index = TrieMap.mask(hash, level);
    var node = arr[index];
    var newNode;
    if (node)
    {
      var newNode = node.put(key, hash, value, sizeBox);
      if (node === newNode)
      {
        return this;
      }
    }
    else
    {
      newNode = (level === 30 ? TrieMap.CollisionNode.from(key, value) : new TrieMap.LeafNode(key, hash, value, level + 5));
      sizeBox[0]++;
    }
    var newArr = arr.slice(0);
    newArr[index] = newNode;
    return new TrieMap.BitmapNode(newArr, level); 
  }

TrieMap.BitmapNode.prototype.get =
  function (key, hash, bot)
  {
    var index = TrieMap.mask(hash, this._level);
    var node = this._arr[index];
    return node ? node.get(key, hash, bot) : bot;
  }

TrieMap.BitmapNode.prototype.iterateEntries =
  function (f, th)
  {
    for (var i = 0; i < 32; i++)
    {
      var node = this._arr[i];
      if (node)
      {
        if (node.iterateEntries(f, th) === false)
        {
          return false;
        }
      }
    }
    return true;
  }

TrieMap.BitmapNode.prototype.entries =
  function ()
  {
    var result = [];
    for (var i = 0; i < 32; i++)
    {
      var node = this._arr[i];
      if (node)
      {
        result = result.concat(node.entries());
      }
    }
    return result;
  }

TrieMap.BitmapNode.prototype.keys =
  function ()
  {
    var result = [];
    for (var i = 0; i < 32; i++)
    {
      var node = this._arr[i];
      if (node)
      {
        result = result.concat(node.keys());
      }
    }
    return result;
  }

TrieMap.BitmapNode.prototype.values =
  function ()
  {
    var result = [];
    for (var i = 0; i < 32; i++)
    {
      var node = this._arr[i];
      if (node)
      {
        result = result.concat(node.values());
      }
    }
    return result;
  }

TrieMap.LeafNode =
  function (key, hash, value, level)
  {
    this._key = key;
    this._hash = hash;
    this._value = value;
    this._level = level;
  }

TrieMap.LeafNode.prototype.put =
  function (key, hash, value, sizeBox)
  {
    if (this._key.equals(key))
    {
      return new TrieMap.LeafNode(key, hash, value, this._level);
    }
    var node = TrieMap.BitmapNode.from(this._key, this._hash, this._value, this._level);
    return node.put(key, hash, value, sizeBox);
  }

TrieMap.LeafNode.prototype.get =
  function (key, hash, bot)
  {
    return this._key.equals(key) ? this._value : bot;
  }

TrieMap.LeafNode.prototype.iterateEntries =
  function (f, th)
  {
    return f.call(th, {key:this._key,value:this._value});
  }

TrieMap.LeafNode.prototype.entries =
  function ()
  {
    return [{key:this._key,value:this._value}];
  }

TrieMap.LeafNode.prototype.keys =
  function ()
  {
    return [this._key];
  }

TrieMap.LeafNode.prototype.values =
  function ()
  {
    return [this._value];
  }

TrieMap.CollisionNode =
  function (arr)
  {
    this._arr = arr;
  }

TrieMap.CollisionNode.from =
  function (key, value)
  {
    return new TrieMap.CollisionNode([{key:key,value:value}]);
  }

TrieMap.CollisionNode.prototype.put =
  function (key, hash, value, sizeBox)
  {
    var arr = this._arr;
    for (var i = 0; i < arr.length; i++)
    {
      var entry = arr[i];
      if (Eq.equals(entry.key, key))
      {
        if (Eq.equals(entry.value, value))
        {
          return this;
        }
        var newArr = arr.slice(0);
        newArr[i] = {key:key,value:value}; 
        return new TrieMap.CollisionNode(newArr);
      }
    }
    var newArr = arr.slice(0);
    newArr.push({key:key,value:value});
    sizeBox[0]++;
    return new TrieMap.CollisionNode(newArr);  
  }

TrieMap.CollisionNode.prototype.get =
  function (key, hash, bot)
  {
    var arr = this._arr;
    for (var i = 0; i < arr.length; i++)
    {
      var entry = arr[i];
      if (Eq.equals(entry.key, key))
      {
        return entry.value;
      }
    }
    return bot;
  }

TrieMap.CollisionNode.prototype.entries =
  function ()
  {
    return this._arr.slice(0);
  }

TrieMap.CollisionNode.prototype.iterateEntries =
  function (f, th)
  {
    var arr = this._arr;
    for (var i = 0; i < arr.length; i++)
    {
      if (f.call(th, arr[i]) === false)
      {
        return false;
      }
    }
    return true;
  }

TrieMap.CollisionNode.prototype.keys =
  function ()
  {
    return this._arr.map(function (entry) {return entry.key});
  }

TrieMap.CollisionNode.prototype.values =
  function ()
  {
    return this._arr.map(function (entry) {return entry.value});
  }

TrieMap.CollisionNode.prototype.toString =
  function ()
  {
    return this._arr.map(function (entry) {return entry.key + " -> " + entry.value}).toString();
  }