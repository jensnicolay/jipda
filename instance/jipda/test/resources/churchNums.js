function plus(n1, n2)
{
  return function(f)
  {
    return function(x)
    {
      return n1(f)(n2(f)(x));
    }
  }
}

function mult(n1, n2)
{
  return function(f)
  {
    return n2(n1(f));
  }
}

function pred(n)
{
  return function(f)
  {
    return function(x)
    {
      return n(function(g)
      {
        return function(h)
        {
          return h(g(f));
        }
      })(function(ignored)
      {
        return x;
      })(function(id)
      {
        return id;
      });
    }
  }
}
function sub(n1, n2)
{
  return n2(pred)(n1);
}

function church0(f)
{
  return function(x)
  {
    return x;
  }
}

function church1(f)
{
  return function(x)
  {
    return f(x);
  }
}

function church2(f)
{
  return function(x)
  {
    return f(f(x));
  }
}

function church3(f)
{
  return function(x)
  {
    return f(f(f(x)));
  }
}

function isChurch0(n)
{
  return n(function(x)
  {
    return false;
  })(true);
}

function isChurchEq(n1, n2)
{
  if (isChurch0(n1))
  {
    return isChurch0(n2);
  }
  else
  {
    if (isChurch0(n2))
    {
      return false;
    }
    else
    {
      return isChurchEq(sub(n1, church1), sub(n2, church1));
    }
  }
}

isChurchEq(mult(church2, plus(church1, church3)), plus(mult(church2, church1),
    mult(church2, church3)));