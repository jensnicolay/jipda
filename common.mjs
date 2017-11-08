export const Arrays = {
  flatten: function (arr)
  {
    const result = [];
    for (const x of arr)
    {
      for (const y of x)
      {
        result.push(y);
      }
    }
    return result;
  },
  
  flatmap: function (arr, f, th)
  {
    return Arrays.flatten(arr.map(f, th));
  }
}

export const Maps = {
  join: function (x, y, join)
  {
    const result = new Map(x);
    for (const [key, yvalue] of y)
    {
      if (result.hasKey(key))
      {
        const xvalue = result.get(key);
        const value = join(xvalue, yvalue); // "lazy" join: only computed when necessary
        result.set(key, value);
      }
    }
    return result;
  },
  
  narrow: function (x, keys)
  {
    const result = new Map();
    for (const key of keys)
    {
      result.set(key, x.get(key));
    }
    return result;
  }
}

