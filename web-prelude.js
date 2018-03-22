(function (global)
{
  function assert(c)
  {
    if (!c)
    {
      throw new Error("Assertion failed");
    }
  }

  global.window = global;
  global.HTMLDocument = function () {};
  global.HTMLHtmlElement = function () {};
  global.HTMLScriptElement = function () {};


})(this);