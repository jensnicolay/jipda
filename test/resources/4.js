function Foo(bar)
{
  this.bar = bar;
}

function f(foo)
{
  foo.bar;
}

var foo = new Foo(true);
f(foo)
foo.bar