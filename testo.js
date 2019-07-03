var spl = "access_token=";
var stringValue = 'kajshdlkjasdkasjdhkajshd.com?access_token=sshshshshsh;; access_token=123'
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
  cur = next + spl.length;
}
console.log(result);