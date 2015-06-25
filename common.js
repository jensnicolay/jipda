"use strict";

var HashCode = {};
HashCode.hashCode =
  function (x)
  {
    if (x === undefined || x === null)
    {
      return 0; 
    }
//    if (!x.hashCode) {
//      print("NO HASHCODE", x, x.constructor)
//      };
    return x.hashCode();
  }
HashCode.bump = (function (bumpCounter) {return function () {return bumpCounter++}})(113);
  
var Visitor = {};
Visitor.accept = function (visitor) {return function (x) {return x.accept ? x.accept(visitor) : String(x)}};
  
//Boolean.prototype.equals =
//  function (x)
//  {
//    return this.valueOf() === x;
//  }
//  
Boolean.prototype.hashCode =
  function ()
  {
    return this.valueOf() ? 1231 : 1237;
  }
//
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
  
//Array.prototype.toString =
//  function ()
//  {
//    // return "[" + this.join(",") + "]"; doesn't work for [undefined]
//    if (this.length === 0)
//    {
//      return "[]";
//    }
//    var s = "[";
//    for (var i = 0; i < this.length - 1; i++)
//    {
//      s += this[i] + ","; 
//    }
//    s += this[i] + "]";
//    return s;   
//  };

Array.prototype.flatten =
  function ()
  {
    if (this.length === 0)
    {
      return this;
    }
    var result = this[0];
    for (var i = 1; i < this.length; i++)
    {
      result = result.concat(this[i]);
    }
    return result;
  }

Array.prototype.flatMap =
  function (f, th)
  {
    return this.map(f, th).flatten();
  }
  
Array.prototype.addFirst =
  function (x)
  {
    return [x].concat(this);
  } 

Array.prototype.addLast =
  function (x)
  {
    var result = this.slice(0);
    result.push(x);
    return result;
  } 
  
Array.prototype.addUniqueLast =
  function (x)
  {
    if (Arrays.contains(x, this))
    {
      return this;
    }
    return this.addLast(x);
  }
 
Array.prototype.toSet = 
  function ()
  {
    var result = [];
    for (var i = 0; i < this.length; i++)
    {
      var x = this[i];
      if (Arrays.indexOf(x, result) === -1)
      {
        result.push(x);
      }
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
      if (xi !== thisi && xi && !xi.equals(thisi))
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
    
var Arrays = {};

Arrays.indexOf =
  function (x, arr)
  {
    if (x && x.equals)
    {
      for (var i = 0; i < arr.length; i++)
      {
        if (x === arr[i] || x.equals(arr[i]))
        {
          return i;
        }
      }
      return -1;      
    }
    for (var i = 0; i < arr.length; i++)
    {
      if (x === arr[i])
      {
        return i;
      }
    }
    return -1;
  }

Arrays.removeFirst =
  function (x, arr)
  {
    var index = Arrays.indexOf(x, arr);
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
  function (x, arr)
  {
    return arr.filter(function (y) {return (x !== y && x && !x.equals(y))});
  }

Arrays.removeAll =
  function (xs, arr)
  {
    return xs.reduce(function (arr, x) {return Arrays.remove(x, arr)}, arr);
  }

Arrays.keepAll =
  function (xs, arr)
  {
    return arr.filter(function (x) {return Arrays.contains(x, xs)});
  }


Arrays.contains =
  function (x, arr)
  {
    return Arrays.indexOf(x, arr) > -1;
  }

/**
 * Returns new array.
 */
Arrays.member =
  function (x, arr)
  {
    return arr.slice(Arrays.indexOf(x, arr));
  }

/**
 * O(n^2)
 */
Arrays.deleteDuplicates =
  function (arr)
  {
    var result = [];
    for (var i = 0; i < arr.length; i++)
    {
      var x = arr[i];
      if (!Arrays.contains(x, result))
      {
        result.push(x);
      }
    }
    return result;
  }

Arrays.union =
  function (arr1, arr2)
  {
    var result = arr1.slice(0);
    for (var i = 0; i < arr2.length; i++)
    {
      var x = arr2[i];
      if (!Arrays.contains(x, result))
      {
        result.push(x);
      }
    }
    return result;
  }

Arrays.intersection =
  function (arr1, arr2)
  {
    var result = [];
    for (var i = 0; i < arr1.length; i++)
    {
      var x = arr1[i];
      if (Arrays.contains(x, arr2))
      {
        result.push(x);
      }
    }
    return result;
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
  function (key, arr)
  {
    return arr.reduce(function (acc, x) {return (x[0] === key || (x[0] && x[0].equals(key))) ? acc.concat([x[1]]) : acc});
  }

Arrays.get =
  function (x, arr)
  {
    for (var i = 0; i < arr.length; i++)
    {
      var arri = arr[i];
      if (x === arri || x.equals(arri))
      {
        return arri;
      }
    }
    return undefined;      
  }

String.prototype.startsWith =
  function (s)
  {
    return this.lastIndexOf(s, 0) === 0;
  }
  
String.prototype.endsWith = 
  function (s)
  {
    return this.indexOf(s, this.length - s.length) !== -1;
  }
  
String.prototype.equals =
  function (x)
  {
    return this === x; 
  }
  
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
  
//Function.prototype.toString =
//  function ()
//  {
//    return this.name + "()";
//  };    
  
// debug
//function d(value) { print(Array.prototype.slice.call(arguments)); return value; }
//function dreadline() { var str = readline(); if (str === ":b") { throw new Error(":b"); }}

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
  if (ArraySet.from(expected).equals(ArraySet.from(actual)))
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

function assert(actual, msg)
{
  if (actual)
  {
    return;
  }
  throw new Error(msg || "assert: got " + actual);
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

function Map_()
{
}

Map_.prototype.subsumes =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (this.count() < x.count())
    {
      return false;
    }
    return x.iterateEntries(
      function (entry)
      {
        var value = this.get(entry[0]);
        return value !== undefined && value.subsumes(entry[1]);
      }, this);
  }

Map_.prototype.compareTo =
  function (x)
  {
    var s1 = this.subsumes(x);
    var s2 = x.subsumes(this);
    return s1 ? (s2 ? 0 : 1) : (s2 ? -1 : undefined);
  }

Map_.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (this.hashCode() !== x.hashCode())
    {
      return false;
    }
    if (this.count() !== x.count())
    {
      return false;
    }
    return this.everyEntry(
        function (entry)
        {
          var xValue = x.get(entry[0]);
          return xValue !== undefined && entry[1].equals(xValue);
        });
  }

Map_.prototype.hashCode =
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
          result = (result + (31 * HashCode.hashCode(entry[0]) ^ HashCode.hashCode(entry[1]))) >> 0;
        });
    this._hashCode = result;
    return result;
  }

Map_.prototype.putAll =
  function (map)
  {
    return map.entries().reduce(function (result, entry) {return result.put(entry[0], entry[1])}, this);
  }

Map_.prototype.join =
  function (map, bot)
  {
    return this.joinWith(map, function (x, y) {return x.join(y)}, bot);
  }

Map_.prototype.joinWith =
  function (x, join, bot)
  {
    var result = this;
    x.iterateEntries(
      function (entry)
      {
        var key = entry[0];
        var thisValue = this.get(key) || bot;
        var xValue = entry[1];
        var value = join(thisValue, xValue);
        result = result.put(key, value);
      }, this);
    return result;
  }

//Map_.prototype.removeAll =
//  function (keys)
//  {
//    var result = this.clear();
//    this.iterateEntries(
//      function (entry)
//      {
//        var key = entry[0];
//        if (!Arrays.contains(key, keys, Eq.equals))
//        {
//          result = result.put(key, entry[1]);
//        }
//      });
//    return result;
//  }

Map_.prototype.narrow =
  function (keys)
  {
    var result = this.clear();
    this.iterateEntries(
      function (entry)
      {
        var key = entry[0];
        if (keys.contains(key))
        {
          result = result.put(key, entry[1]);
        }
      });
    return result;
  }

Map_.prototype.diff = // debug
  function (x)
  {
    var diff = [];
    var entries = this.entries();
    for (var i = 0; i < entries.length; i++)
    {
      var entry = entries[i];
      var key = entry[0];
      var value = entry[1];
      var xvalue = x.get(key);
      if (xvalue)
      {
        if (!value.equals(xvalue))
        {
          if (value.diff)
          {
            diff.push(key + ":**\n\t" + value.diff(xvalue) + "**");
          }
          else
          {
            diff.push(key + ":\n\t" + value + "\n\t" + xvalue);            
          }
        }
      }
      else
      {
        diff.push(key + ":\n\t" + value + "\n\t<undefined>");
      }
    }
    var xentries = x.entries();
    for (i = 0; i < xentries.length; i++)
    {
      var xentry = xentries[i];
      key = xentry[0];
      xvalue = xentry[1];
      var value = this.get(key);
      if (!value)
      {
        diff.push(key + ":\n\t<undefined>\n\t" + xvalue);
      }
    }
    return diff.join("\n");
  }

function ArrayMap(arr)
{
  this._arr = arr
}
ArrayMap.prototype = Object.create(Map_.prototype);
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
      var entryKey = entry[0];
      if (key === entryKey || key.equals(entryKey))
      {
        var entryValue = entry[1]; 
        if (value === entryValue || value.equals(entryValue))
        {
          return this;
        }
        var newArr = arr.slice(0);
        newArr[i] = [key, value];
        return new ArrayMap(newArr);
      }
    }
    var newArr = arr.slice(0);
    newArr.push([key, value]);
    return new ArrayMap(newArr);  
  }

ArrayMap.prototype.get =
  function (key)
  {
    var arr = this._arr;
    for (var i = 0; i < arr.length; i++)
    {
      var entry = arr[i];
      var entryKey = entry[0]; 
      if (key === entryKey || key.equals(entryKey))
      {
        return entry[1];
      }
    }
    return undefined;
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

ArrayMap.prototype.someValue =
  function (f, th)
  {
    return this._arr.some(function (entry) {return f.call(th, entry[1])});
  }

ArrayMap.prototype.everyValue =
  function (f, th)
  {
    return this._arr.some(function (entry) {return f.call(th, entry[1])});
  }

ArrayMap.prototype.someEntry =
  function (f, th)
  {
    return this._arr.some(f, th);
  }

ArrayMap.prototype.everyEntry =
  function (f, th)
  {
    return this._arr.every(f, th);
  }

ArrayMap.prototype.keys =
  function ()
  {
    return this._arr.map(function (entry) {return entry[0]});
  }

ArrayMap.prototype.values =
  function ()
  {
    return this._arr.map(function (entry) {return entry[1]});
  }

ArrayMap.prototype.size =
  function ()
  {
    return this._arr.length;
  }

ArrayMap.prototype.count =
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
    return this._arr.map(function (entry) {return entry[0] + " -> " + entry[1]}).toString();
  }

ArrayMap.prototype.nice =
  function ()
  {
    return this._arr.map(function (entry) {return entry[0] + " -> " + entry[1]}).join("\n");
  }

function HashMap(buckets)
{
  this._buckets = buckets;
}
HashMap.prototype = Object.create(Map_.prototype);

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
    return arr.reduce(function (result, entry) {return result.put(entry[0], entry[1])}, HashMap.empty());
  }

HashMap.prototype.put =
  function (key, value)
  {
    var keyHash = key.hashCode();
    var index = (keyHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];
    if (!entries)
    {
      var newEntries = [[key, value]];
    }
    else
    {
      for (var i = 0; i < entries.length; i++)
      {
        var entry = entries[i];
        var entryKey = entry[0];
        if (key === entryKey || key.equals(entryKey))
        {
          var newEntries = entries.slice(0);
          newEntries[i] = [key, value];
          var newBuckets = this._buckets.slice(0);
          newBuckets[index] = newEntries;
          newBuckets.size = this._buckets.size; 
          return new HashMap(newBuckets);      
        }
      }
      var newEntries = entries.slice(0);
      newEntries[i] = [key, value];      
    }
    var newBuckets = this._buckets.slice(0);
    newBuckets[index] = newEntries;
    newBuckets.size = this._buckets.size + 1;
    return new HashMap(newBuckets);      
  }

HashMap.prototype.get =
  function (key)
  {
    var keyHash = key.hashCode();
    var index = (keyHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];    
    if (entries)
    {
      for (var i = 0; i < entries.length; i++)
      {
        var entry = entries[i];
        var entryKey = entry[0];
        if (key === entryKey || key.equals(entryKey))
        {
          return entry[1];
        }
      }
    }
    return undefined;
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
      var entryKey = entry[0];
      if (key === entrykey || key.equals(entryKey))
      {
        var newEntries = entries.slice(0, i).concat(entries.slice(i + 1));
        var newBuckets = this._buckets.slice(0);
        newBuckets[index] = newEntries;
        newBuckets.size = this._buckets.size - 1; 
        return new HashMap(newBuckets);
      }
    }
    return this;        
  }

HashMap.prototype.entries =
  function ()
  {
    var result = [];
    var buckets = this._buckets;
    for (var i = 0; i < buckets.length; i++)
    {
      var bucket = buckets[i];
      if (bucket)
      {
        result = result.concat(bucket);
      }
    }
    return result;
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

HashMap.prototype.someValue =
  function (f, th)
  {
    return this._buckets.some(function (bucket) {return bucket.some(function (entry) {return f.call(th, entry[1])})});
  }

HashMap.prototype.everyValue =
  function (f, th)
  {
    return this._buckets.every(function (bucket) {return bucket.every(function (entry) {return f.call(th, entry[1])})});
  }

HashMap.prototype.someEntry =
  function (f, th)
  {
    return this._buckets.some(function (bucket) {return bucket.some(f, th)});
  }

HashMap.prototype.everyEntry =
  function (f, th)
  {
    return this._buckets.every(function (bucket) {return bucket.every(f, th)});
  }

HashMap.prototype.keys =
  function ()
  {
    return this.entries().map(function (entry) {return entry[0]});
  }

HashMap.prototype.values =
  function ()
  {
    return this.entries().map(function (entry) {return entry[1]});
  }

HashMap.prototype.size =
  function ()
  {
    return this._buckets.length;
  }

HashMap.prototype.count =
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
    return this.entries().map(function (entry) {return entry[0] + " -> " + entry[1]}).toString();
  }

HashMap.prototype.nice =
  function ()
  {
    return this.entries().map(function (entry) {return entry[0] + " -> " + entry[1]}).join("\n");
  }

function MutableHashMap(size)
{
  this._buckets = new Array(size || 59);
  this._count = 0;
}
//MutableHashMap.prototype = Object.create(Map_.prototype);

MutableHashMap.empty =
  function (size)
  {
    return new MutableHashMap(size);
  }

MutableHashMap.from =
  function (arr)
  {
    var map = new HashMap(arr.length);
    for (var i = 0; i < arr.length; i++)
    {
      var entry = arr[i];
      map.put(entry[0], entry[1]);
    }
  }

MutableHashMap.prototype.dist = // DEBUG
  function ()
  {
    return this._buckets.map(function (b) {return b ? b.length : "X"}).join(",");
  }

MutableHashMap.prototype.put =
  function (key, value)
  {
    var keyHash = key.hashCode();
    var index = (keyHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];
    if (!entries)
    {
      this._buckets[index] = [[key, value]];
    }
    else
    {
      for (var i = 0; i < entries.length; i++)
      {
        var entry = entries[i];
        var entryKey = entry[0];
        if (key === entryKey || key.equals(entryKey))
        {
          entry[1] = value;
          return;      
        }
      }
      entries.push([key, value]);
    }
    this._count++;
  }

MutableHashMap.prototype.get =
  function (key)
  {
    var keyHash = key.hashCode();
    var index = (keyHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];    
    if (entries)
    {
      for (var i = 0; i < entries.length; i++)
      {
        var entry = entries[i];
        var entryKey = entry[0];
        if (key === entryKey || key.equals(entryKey))
        {
          return entry[1];
        }
      }
    }
    return undefined;
  }

MutableHashMap.prototype.remove =
  function (key)
  {
    var keyHash = key.hashCode();
    var index = (keyHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];
    if (!entries)
    {
      return;
    }
    for (var i = 0; i < entries.length; i++)
    {
      var entry = entries[i];
      var entryKey = entry[0];
      if (key === entrykey || key.equals(entryKey))
      {
        entries.splice(i, 1);
        this._count--;
        return;
      }
    }
  }

MutableHashMap.prototype.entries =
  function ()
  {
    var result = [];
    var buckets = this._buckets;
    for (var i = 0; i < buckets.length; i++)
    {
      var bucket = buckets[i];
      if (bucket)
      {
        result = result.concat(bucket);
      }
    }
    return result;
  }

MutableHashMap.prototype.iterateEntries =
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

MutableHashMap.prototype.forEach =
  function (f, th)
  {
    this._buckets.forEach(function (bucket) {bucket.forEach(f, th)});
  }

MutableHashMap.prototype.someValue =
  function (f, th)
  {
    return this._buckets.some(function (bucket) {return bucket.some(function (entry) {return f.call(th, entry[1])})});
  }

MutableHashMap.prototype.everyValue =
  function (f, th)
  {
    return this._buckets.every(function (bucket) {return bucket.every(function (entry) {return f.call(th, entry[1])})});
  }

MutableHashMap.prototype.someEntry =
  function (f, th)
  {
    return this._buckets.some(function (bucket) {return bucket.some(f, th)});
  }

MutableHashMap.prototype.everyEntry =
  function (f, th)
  {
    return this._buckets.every(function (bucket) {return bucket.every(f, th)});
  }

MutableHashMap.prototype.keys =
  function ()
  {
    return this.entries().map(function (entry) {return entry[0]});
  }

MutableHashMap.prototype.values =
  function ()
  {
    return this.entries().map(function (entry) {return entry[1]});
  }

MutableHashMap.prototype.size =
  function ()
  {
    return this._buckets.length;
  }

MutableHashMap.prototype.count =
  function ()
  {
    return this._count;
  }

MutableHashMap.prototype.clear =
  function ()
  {
    return new MutableHashMap(this._buckets.length);
  }

MutableHashMap.prototype.toString =
  function ()
  {
    return this.entries().map(function (entry) {return entry[0] + " -> " + entry[1]}).toString();
  }

MutableHashMap.prototype.nice =
  function ()
  {
    return this.entries().map(function (entry) {return entry[0] + " -> " + entry[1]}).join("\n");
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
    if (this.count() < x.count())
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
    if (this.count() !== x.count())
    {
      return false;
    }
    if (this.hashCode() !== x.hashCode())
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
    return new ArraySet(Arrays.deleteDuplicates(arr));
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
    var index = Arrays.indexOf(value, this._arr);
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
    return new ArraySet(Arrays.removeFirst(value, this._arr));
  }

ArraySet.prototype.removeAll =
  function (values)
  {
    return new ArraySet(values.reduce(function (arr, value) {return Arrays.removeFirst(value, arr)}, this._arr));
  }

ArraySet.prototype.retainAll =
  function (values)
  {
    return new ArraySet(this._arr.filter(function (x) {return Arrays.contains(x, values)}));
  }

ArraySet.prototype.contains =
  function (value)
  {
    return Arrays.contains(value, this._arr);
  }

ArraySet.prototype.values =
  function ()
  {
    return this._arr.slice(0);
  }

ArraySet.prototype.map =
  function (f, th)
  {
    return this._arr.map(f, th);
  }

ArraySet.prototype.size =
  function ()
  {
    return this._arr.length;
  }

ArraySet.prototype.count =
  function ()
  {
    return this._arr.length;
  }

ArraySet.prototype.toString =
  function ()
  {
    return "{set:" + this._arr.join(",") + "}";
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

ArraySet.prototype.filter =
  function (f, ths)
  {
    return new ArraySet(this._arr.filter(f, ths));
  }

ArraySet.prototype.flatMap =
  function (f, ths)
  {
    return this._arr.flatMap(f, ths);
  }

ArraySet.prototype.forEach =
  function (f, th)
  {
    this._arr.forEach(f, th);
  }

ArraySet.prototype.reduce =
  function (f, init)
  {
    return this._arr.reduce(f, init);
  }

ArraySet.prototype.some =
  function (f, th)
  {
    return this._arr.some(f, th);
  }

ArraySet.prototype.every =
  function (f, th)
  {
    return this._arr.every(f, th);
  }

function MutableArraySet(x)
{
  this._arr = (Array.isArray(x)) ? x.slice(0) : [];
}
//MutableArraySet.prototype = Object.create(Set.prototype);

MutableArraySet.empty =
  function (x)
  {
    return new MutableArraySet();
  }
MutableArraySet.from =
  function (arr)
  {
    return new MutableArraySet(arr);
  }

MutableArraySet.from1 =
  function (x)
  {
    return new MutableArraySet([x]);
  }

MutableArraySet.prototype.clear =
  function ()
  {
    this._arr = [];
  }

MutableArraySet.prototype.add =
  function (value)
  {
    var index = Arrays.indexOf(value, this._arr);
    if (index > -1)
    {
      return;
    }
    this._arr.push(value);
  }

MutableArraySet.prototype.addAll =
  function (values)
  {
    for (var i = 0; i < values.length; i++)
    {
      this.add(values[i]);
    }
  }

//MutableArraySet.prototype.remove =
//  function (value)
//  {
//  }

//ArraySet.prototype.removeAll =
//  function (values)
//  {
//  }

//ArraySet.prototype.retainAll =
//  function (values)
//  {
//  }

MutableArraySet.prototype.contains =
  function (value)
  {
    return Arrays.contains(value, this._arr);
  }

MutableArraySet.prototype.values =
  function ()
  {
    return this._arr.slice(0);
  }

MutableArraySet.prototype.map =
  function (f, th)
  {
    return this._arr.map(f, th);
  }

MutableArraySet.prototype.size =
  function ()
  {
    return this._arr.length;
  }

MutableArraySet.prototype.count =
  function ()
  {
    return this._arr.length;
  }

MutableArraySet.prototype.toString =
  function ()
  {
    return "{set!:" + this._arr.join(",") + "}";
  }

MutableArraySet.prototype.nice =
  function ()
  {
    return this.toString();
  }

MutableArraySet.prototype.iterateValues =
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

MutableArraySet.prototype.filter =
  function (f, ths)
  {
    return new ArraySet(this._arr.filter(f, ths));
  }

MutableArraySet.prototype.flatMap =
  function (f, ths)
  {
    return this._arr.flatMap(f, ths);
  }

MutableArraySet.prototype.forEach =
  function (f, th)
  {
    this._arr.forEach(f, th);
  }

MutableArraySet.prototype.reduce =
  function (f, init)
  {
    return this._arr.reduce(f, init);
  }

MutableArraySet.prototype.some =
  function (f, th)
  {
    return this._arr.some(f, th);
  }

MutableArraySet.prototype.every =
  function (f, th)
  {
    return this._arr.every(f, th);
  }

function MutableHashSet(size)
{
  this._buckets = new Array(size || 31);
  this._count = 0;
}
//MutableArraySet.prototype = Object.create(Set.prototype);

MutableHashSet.empty =
  function (size)
  {
    return new MutableHashSet(size);
  }
MutableHashSet.from =
  function (arr)
  {
    var set = new MutableHashSet(Math.max(31, arr.length));
    for (var i = 0; i < arr.length; i++)
    {
      set.add(arr[i]);
    }
    return set;
  }

MutableHashSet.from1 =
  function (x)
  {
    var set = new MutableHashSet();
    set.add(x);
    return set;
  }

MutableHashSet.prototype.dist = // DEBUG
  function ()
  {
    return this._buckets.map(function (b) {return b ? b.length : "X"}).join(",");
  }

MutableHashSet.prototype.clear =
  function ()
  {
    this._buckets = new Array(this._buckets.length);
  }

MutableHashSet.prototype.add =
  function (value)
  {
    var valueHash = value.hashCode();
    var index = (valueHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];
    if (!entries)
    {
      this._buckets[index] = [value];
      this._count++;
    }
    else
    {
      if (!Arrays.contains(value, entries))
      {
        entries.push(value);
        this._count++;
      }
    }
  }

MutableHashSet.prototype.addAll =
  function (values)
  {
    for (var i = 0; i < values.length; i++)
    {
      this.add(values[i]);
    }
  }

MutableHashSet.prototype.contains =
  function (value)
  {
    var valueHash = value.hashCode();
    var index = (valueHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];
    return !!entries && Arrays.contains(value, entries);
  }

MutableHashSet.prototype.get =
  function (value)
  {
    var valueHash = value.hashCode();
    var index = (valueHash >>> 0) % this._buckets.length;
    var entries = this._buckets[index];
    if (entries)
    {
      return Arrays.get(value, entries);
    }
    return undefined;
  }

MutableHashSet.prototype.values =
  function ()
  {
    var result = [];
    for (var i = 0; i < this._buckets.length; i++)
    {
      var bucket = this._buckets[i];
      if (bucket)
      {
        result = result.concat(bucket);
      }
    }
    return result;
  }

MutableHashSet.prototype.size =
  function ()
  {
    return this._buckets.length;
  }

MutableHashSet.prototype.count =
  function ()
  {
    return this._count;
  }

MutableHashSet.prototype.toString =
  function ()
  {
    return "{hset!:" + this.values().join(",") + "}";
  }

MutableHashSet.prototype.nice =
  function ()
  {
    return this.toString();
  }

MutableHashSet.prototype.filter =
  function (f, ths)
  {
    throw new Error("NYI");
  }

MutableHashSet.prototype.flatMap =
  function (f, ths)
  {
    throw new Error("NYI");
  }

MutableHashSet.prototype.forEach =
  function (f, th)
  {
    for (var i = 0; i < this._buckets.length; i++)
    {
      var bucket = this._buckets[i];
      if (bucket)
      {
        bucket.forEach(f, th);
      }
    }
  }

MutableHashSet.prototype.map =
  function (f, th)
  {
    var result = [];
    for (var i = 0; i < this._buckets.length; i++)
    {
      var bucket = this._buckets[i];
      if (bucket)
      {
        result = result.concat(bucket.map(f, th));
      }
    }
    return result;
  }

MutableHashSet.prototype.reduce =
  function (f, init)
  {
    throw new Error("NYI");
  }

MutableHashSet.prototype.some =
  function (f, th)
  {
    throw new Error("NYI");
  }

MutableHashSet.prototype.every =
  function (f, th)
  {
    throw new Error("NYI");
  }

function TrieMap(node, size)
{
  this._node = node;
  this._size = size;
}
TrieMap.prototype = Object.create(Map_.prototype);

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
    return arr.reduce(function (result, entry) {return result.put(entry[0], entry[1])}, TrieMap.empty());
  }

TrieMap.prototype.clear =
  function ()
  {
    return TrieMap.empty();
  }

TrieMap.prototype.get =
  function (key)
  {
    var hash = key.hashCode();
    return this._node.get(key, hash);
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

TrieMap.prototype.someValue =
  function (f, th)
  {
    return this._node.someValue(f, th);
  }

TrieMap.prototype.everyValue =
  function (f, th)
  {
    return this._node.everyValue(f, th);
  }

TrieMap.prototype.someEntry =
  function (f, th)
  {
    return this._node.someEntry(f, th);
  }

TrieMap.prototype.everyEntry =
  function (f, th)
  {
    return this._node.everyEntry(f, th);
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
    return -1;
  }

TrieMap.prototype.count =
  function ()
  {
    return this._size;
  }

TrieMap.prototype.toString =
  function ()
  {
    return this.entries().map(function (entry) {return entry[0] + " -> " + entry[1]}).join("\n");
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
    return new TrieMap.BitmapNode(new Array(32), 0);
  }

TrieMap.BitmapNode.from =
  function (key, hash, value, level)
  {
    var index = TrieMap.mask(hash, level);
    var arr = new Array(32);
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
  function (key, hash)
  {
    var index = TrieMap.mask(hash, this._level);
    var node = this._arr[index];
    return node ? node.get(key, hash) : undefined;
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

TrieMap.BitmapNode.prototype.someValue =
  function (f, th)
  {
    return this._arr.some(
      function (node)
      {
        return node.someValue(f, th);
      });
  }

TrieMap.BitmapNode.prototype.everyValue =
  function (f, th)
  {
    return this._arr.every(
      function (node)
      {
        return node.everyValue(f, th);
      });
  }

TrieMap.BitmapNode.prototype.someEntry =
  function (f, th)
  {
    return this._arr.some(
      function (node)
      {
        return node.someEntry(f, th);
      });
  }

TrieMap.BitmapNode.prototype.everyEntry =
  function (f, th)
  {
    return this._arr.every(
      function (node)
      {
        return node.everyEntry(f, th);
      });
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
  function (key, hash)
  {
    return this._key.equals(key) ? this._value : undefined;
  }

TrieMap.LeafNode.prototype.iterateEntries =
  function (f, th)
  {
    return f.call(th, [this._key, this._value]);
  }

TrieMap.LeafNode.prototype.everyValue =
  function (f, th)
  {
    return f.call(th, this._value);
  }

TrieMap.LeafNode.prototype.someValue =
  function (f, th)
  {
    return f.call(th, this._value);
  }

TrieMap.LeafNode.prototype.someEntry =
  function (f, th)
  {
    return f.call(th, [this._key, this._value]);
  }

TrieMap.LeafNode.prototype.everyEntry =
  function (f, th)
  {
    return f.call(th, [this._key, this._value]);
  }

TrieMap.LeafNode.prototype.entries =
  function ()
  {
    return [[this._key,this._value]];
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
    return new TrieMap.CollisionNode([[key,value]]);
  }

TrieMap.CollisionNode.prototype.put =
  function (key, hash, value, sizeBox)
  {
    var arr = this._arr;
    for (var i = 0; i < arr.length; i++)
    {
      var entry = arr[i];
      var entryKey = entry[0]; 
      if (key === entryKey || key.equals(entryKey))
      {
        var entryValue = entry[1]; 
        if (value === entryValue || value.equals(entryValue))
        {
          return this;
        }
        var newArr = arr.slice(0);
        newArr[i] = [key,value]; 
        return new TrieMap.CollisionNode(newArr);
      }
    }
    var newArr = arr.slice(0);
    newArr.push([key,value]);
    sizeBox[0]++;
    return new TrieMap.CollisionNode(newArr);  
  }

TrieMap.CollisionNode.prototype.get =
  function (key, hash)
  {
    var arr = this._arr;
    for (var i = 0; i < arr.length; i++)
    {
      var entry = arr[i];
      var entryKey = entry[0];
      if (key === entryKey || key.equals(entryKey))
      {
        return entry[1];
      }
    }
    return undefined;
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

TrieMap.CollisionNode.prototype.everyValue =
  function (f, th)
  {
    return this._arr.every(function (x) {return f.call(th, x[1])});
  }

TrieMap.CollisionNode.prototype.someValue =
  function (f, th)
  {
    return this._arr.some(function (x) {return f.call(th, x[1])});
  }

TrieMap.CollisionNode.prototype.someEntry =
  function (f, th)
  {
    return this._arr.some(f, th);
  }

TrieMap.CollisionNode.prototype.everyEntry =
  function (f, th)
  {
    return this._arr.every(f, th);
  }

TrieMap.CollisionNode.prototype.keys =
  function ()
  {
    return this._arr.map(function (entry) {return entry[0]});
  }

TrieMap.CollisionNode.prototype.values =
  function ()
  {
    return this._arr.map(function (entry) {return entry[1]});
  }

TrieMap.CollisionNode.prototype.toString =
  function ()
  {
    return this._arr.map(function (entry) {return entry[0] + " -> " + entry[1]}).toString();
  }


function Indexer()
{
  this.cache = [];
}

Indexer.prototype.index =
  function (x)
  {
    var i = Arrays.indexOf(x, this.cache);
    if (i == -1)
    {
      i = this.cache.push(x) - 1;
    }
    return i;
  }

Indexer.prototype.toArray =
  function ()
  {
    return this.slice(0);
  }

var Formatter = {};
Formatter.displayTime =
  function (ms)
  {
    var min = Math.floor(ms / 60000);
    var sec = Math.floor((ms % 60000) / 1000);
    return min + "'" + (sec < 10 ? "0" : "") + sec + "\"";
  }
Formatter.displayWidth =
  function (s, w)
  {
    return (s+"                                          ").substring(0,w);
  }