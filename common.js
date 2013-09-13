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
      if (!x.equals)
      {
        throw new Error("argh: " + x);
      }
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
    if (!x)
    {
      return 0;
    }
    if (x === true || typeof x === "number")
    {
      return x >>> 0; 
    }
    return x.hashCode();
  }
  
var Visitor = {};
Visitor.accept = function (visitor) {return function (x) {return x.accept ? x.accept(visitor) : String(x)}};
  
Boolean.prototype.equals =
	function (x)
	{
		return this.valueOf() === x.valueOf();
	};
	
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
    var hash = 0, i, char;
    if (this.length == 0) return hash;
    for (i = 0; i < this.length; i++)
    {
      val = HashCode.hashCode(this[i]);
      hash = ((hash<<5) - hash) + val;
      hash = hash & hash;
    }
    return hash;
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
    var hash = 0, i, char;
    if (this.length == 0) return hash;
    for (i = 0; i < this.length; i++)
    {
      char = this.charCodeAt(i);
      hash = ((hash<<5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
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
    return !isNaN(x);
  }
  
Function.prototype.toString =
	function ()
	{
		return this.name + "()";
	};

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

Collections.add =
  function (collection, value)
  {
    return collection.add(value);
  }

Collections.addAll =
  function (collection, values)
  {
    return collection.addAll(values);
  }

Collections.size =
  function (collection)
  {
    return collection.size();
  }

Collections.values =
  function (collection)
  {
    return collection.values();
  }

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
    return this.subsumes(x) && x.subsumes(this);
  }

Map.prototype.removeAll =
  function (keys)
  {
    return keys.reduce(function (result, key) {return result.remove(key)}, this);
  }

Map.prototype.hashCode =
  function ()
  {
    return this.mapEntries(function (x) {return HashCode.hashCode(x.key) ^ HashCode.hashCode(x.value)}).reduce(function (acc, x) {return acc + x});
  }


function HashMap(entries)
{
  this._entries = entries;
}
HashMap.prototype = Object.create(Map.prototype);

HashMap.empty =
  function (size)
  {
    var entries = new Array(size || 13);
    entries.size = 0;
    return new HashMap(entries);
  }

HashMap.from =
  function (arr)
  {
    return arr.reduce(function (result, entry) {return result.put(entry.key, entry.value)}, HashMap.empty());
  }

HashMap.prototype.put =
  function (key, value)
  {
    var hash = Math.abs(key.hashCode()) % this._entries.length;
    var buckets = this._entries[hash];
    if (!buckets)
    {
      var newBuckets = [{key:key, value:value}];
    }
    else
    {
      for (var i = 0; i < buckets.length; i++)
      {
        var bucket = buckets[i];
        if (Eq.equals(key, bucket.key))
        {
          var newBuckets = buckets.slice(0);
          newBuckets[i] = {key:key, value:value};
          var newEntries = this._entries.slice(0);
          newEntries[hash] = newBuckets;
          newEntries.size = this.size(); 
          return new HashMap(newEntries);      
        }
      }
      var newBuckets = buckets.slice(0);
      newBuckets[i] = {key:key, value:value};      
    }
    var newEntries = this._entries.slice(0);
    newEntries[hash] = newBuckets;
    newEntries.size = this.size() + 1;
    return new HashMap(newEntries);      
  }

HashMap.prototype.get =
  function (key, bot)
  {
    var hash = Math.abs(key.hashCode()) % this._entries.length;
    var buckets = this._entries[hash];    
    if (!buckets)
    {
      return bot;
    }
    for (var i = 0; i < buckets.length; i++)
    {
      var bucket = buckets[i];
      if (Eq.equals(key, bucket.key))
      {
        return bucket.value;
      }
    }
    return bot;
  }

HashMap.prototype.remove =
  function (key)
  {
    var hash = Math.abs(key.hashCode()) % this._entries.length;
    var buckets = this._entries[hash];
    if (!buckets)
    {
      return this;
    }
    for (var i = 0; i < buckets.length; i++)
    {
      var bucket = buckets[i];
      if (Eq.equals(key, bucket.key))
      {
        var newBuckets = buckets.slice(0, i).concat(buckets.slice(i + 1));
        var newEntries = this._entries.slice(0);
        newEntries[hash] = newBuckets;
        newEntries.size = this.size() - 1; 
        return new HashMap(newEntries);
      }
    }
    return this;        
  }

HashMap.prototype.entries =
  function ()
  {
    return this._entries.flatten();
  }

HashMap.prototype.iterateEntries =
  function (f, th)
  {
    var buckets = this._entries;
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
    return this._entries.flatten().map(function (bucket) {return bucket.key});
  }

HashMap.prototype.values =
  function ()
  {
    return this._entries.flatten().map(function (bucket) {return bucket.value});
  }

HashMap.prototype.size =
  function ()
  {
    return this._entries.size;
  }

HashMap.prototype.clear =
  function ()
  {
    var entries = new Array(this._entries.length);
    entries.size = 0;
    return new HashMap(entries);
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

function LatticeMap(map, bot)
{
  this._map = map;
  this.bot = bot;
}
LatticeMap.empty =
  function (bot, size)
  {
    return new LatticeMap(HashMap.empty(size), bot);
  }
LatticeMap.prototype.put =
  function (key, value)
  {
    var existing = this._map.get(key, this.bot);
    return new LatticeMap(this._map.put(key, existing.join(value)), this.bot);
  }
LatticeMap.prototype.get =
  function (key)
  {
    return this._map.get(key, this.bot);
  }
LatticeMap.prototype.size =
  function ()
  {
    return this._map.size();
  }
LatticeMap.prototype.toString =
  function ()
  {
    return this._map.toString();
  }
LatticeMap.prototype.entries =
  function ()
  {
    return this._map.entries();
  }
LatticeMap.prototype.map =
  function (f, ths)
  {
    return new LatticeMap(this._map.map(f, ths));
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
    var xValues = this.values();
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
    var values = this.values();
    for (var i = 0; i < values.length; i++)
    {
      if (!x.contains(values[i]))
      {
        return false;
      }
    }
    return true;
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
    return new HashSet(HashMap.empty(size));
  }

HashSet.from =
  function (arr)
  {
    return arr.reduce(function (result, x) {return result.add(x)}, HashSet.empty());
  }

HashSet.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (!x.values)
    {
      return false;
    }
    var thisValues = this.values();
    var xValues = x.values();
    return thisValues.setEquals(xValues);
  }

HashSet.prototype.hashCode =
  function ()
  {
    return this.values().hashCode();
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
    if (existing)
    {
      return this;
    }
    return new HashSet(this._map.put(value, value));
  }

HashSet.prototype.addAll =
  function (values)
  {
    return values.reduce(Collections.add, this);
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
    return existing;
  }

HashSet.prototype.filter =
  function (f, ths)
  {
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
    return new ArraySet(arr.slice(0));
  }

ArraySet.prototype.equals =
  function (x)
  {
    if (this === x)
    {
      return true;
    }
    if (!x.values)
    {
      return false;
    }
    var thisValues = this.values();
    var xValues = x.values();
    return thisValues.setEquals(xValues);
  }

ArraySet.prototype.hashCode =
  function ()
  {
    return this._arr.hashCode();
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
    return values.reduce(Collections.add, this);
  }

ArraySet.prototype.remove =
  function (value)
  {
    var index = Arrays.indexOf(value, this._arr, Eq.equals);
    if (index === -1)
    {
      return this;
    }
    return new ArraySet(this._arr.slice(0, index).concat(this._arr.slice(index + 1)));
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


/*
 * Deque interface
 * 
 * equals, hashCode (based on values)
 * addFirst, addLast
 * removeFirst, removeLast
 * size
 *  
 */
function ArrayDeque(arr)
{
  this._arr = arr;
}

ArrayDeque.empty =
  function ()
  {
    return new ArrayDeque([]);
  }

ArrayDeque.prototype.addFirst =
  function (x)
  {
    var arr = this._arr.slice(0).unshift(x);
    return new ArrayDeque(arr);
  }

ArrayDeque.prototype.addLast =
  function (x)
  {
    var arr = this._arr.slice(0).push(x);
    return new ArrayDeque(arr);
  }

ArrayDeque.prototype.removeFirst =
  function ()
  {
    var arr = this._arr.slice(0).shift(1);
    return new ArrayDeque(arr);
  }

ArrayDeque.prototype.removeLast =
  function ()
  {
    var arr = this._arr.slice(0).pop();
    return new ArrayDeque(arr);
  }

ArrayDeque.prototype.value =
  function ()
  {
    return this._value;
  }

ArrayDeque.prototype.size =
  function ()
  {
    return this._arr.length;
  }

ArrayDeque.prototype.toString =
  function ()
  {
    return this._arr.toString();
  }


/*
 * Queue interface
 * 
 * equals, hashCode (based on values)
 * add, remove
 * size
 *  
 */
function ArrayQueue(arr)
{
  this._arr = arr;
}

ArrayQueue.empty =
  function ()
  {
    return new ArrayQueue([]);
  }

ArrayQueue.prototype.add =
  function (x)
  {
    var arr = this._arr.slice(0).push(x);
    return new ArrayQueue(arr);
  }

ArrayQueue.prototype.peek =
  function ()
  {
    if (this._arr.length === 0)
    {
      throw new Error("queue empty");
    }
    return this._arr[0];
  }

ArrayQueue.prototype.remove =
  function ()
  {
    var arr = this._arr.slice(0).shift(1);
    return new ArrayQueue(arr);
  }

ArrayQueue.prototype.size =
  function ()
  {
    return this._arr.length;
  }

ArrayQueue.prototype.isEmpty =
  function ()
  {
    return this._arr.length > 0;
  }

ArrayQueue.prototype.toString =
  function ()
  {
    return this._arr.toString();
  }