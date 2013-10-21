function createConcreteAg()
{
  var counter = 0;
  var a = {};
  a.toString = function () {return "concreteAg"};
  
  a.variable =
    function (node)
    {
      return new MonoAddr(counter++);
    }
  
  return a;
}
