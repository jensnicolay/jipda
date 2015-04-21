function Foo(bar)
{
  this.bar = bar;
}

function f()
{
  var foo2 = new Foo(false);
  foo2.bar = true;
  return foo2.bar;
}

f()
