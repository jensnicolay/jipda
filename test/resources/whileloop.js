function split(stringValue, spl)
{
  let result = [];
  let cur = 0;
  while (cur < stringValue.length)
  {
    var next = stringValue.indexOf(spl, cur);
    if (next < 0)
    {
      next = stringValue.length;
    }
    var sub = stringValue.substring(cur, next);
    result.push(sub);
    cur = next + spl.length;
    // print(cur, next, sub);
  }
  return result;
}

split('0,1,hello', ',').length