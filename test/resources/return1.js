function A()
{
}

A.prototype.f =
  function ()
{
  return this;
}

function B()
{
  var a = new A();
  a.f(); // doesn't `return`!
}

B.prototype.x = 123;

var b = new B();
b.x