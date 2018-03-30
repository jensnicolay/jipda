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

  function Element()
  {
    this.children = [];
  }

  function HTMLDocument()
  {
  }
  HTMLDocument.prototype = new Element();


  global.HTMLDocument = function ()
  {
    this.children = [];
  };
  global.HTMLHtmlElement = function ()
  {
    this.children = [];
  };
  global.HTMLHeadElement = function ()
  {

  };
  global.HTMLBodyElement = function () {};
  global.HTMLScriptElement = function () {};


})(this);