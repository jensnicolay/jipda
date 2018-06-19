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
  global.Node = Node;
  global.Document = Document;
  global.HTMLDocument = HTMLDocument;
  global.Element = Element;
  global.HTMLElement = HTMLElement;
  global.HTMLHtmlElement = HTMLHtmlElement;
  global.HTMLHeadElement = HTMLHeadElement;
  global.HTMLBodyElement = HTMLBodyElement;
  global.HTMLScriptElement = HTMLScriptElement;
  global.HTMLDivElement = HTMLDivElement;

  function Node()
  {
    this.children = [];
  }

  Node.prototype.appendChild =
      function (node)
      {
        this.children.push(node);
        return node;
      }

  function Document()
  {
    Node.call(this);
  }
  Document.prototype = Object.create(Node.prototype);
  Document.prototype.constructor = Document;

  Document.prototype.createElement =
      function (localName)
      {
        if (localName === "div")
        {
          return new HTMLDivElement();
        }
        throw new Error("no custom element support yet");
      }

  function HTMLDocument()
  {
    Document.call(this);
  }
  HTMLDocument.prototype = Object.create(Document.prototype);
  HTMLDocument.prototype.constructor = HTMLDocument;


  function Element()
  {
    Node.call(this);
  }
  Element.prototype = Object.create(Node.prototype);
  Element.prototype.constructor = Element;

  function HTMLElement()
  {
    Element.call(this);
  }
  HTMLElement.prototype = Object.create(Element.prototype);
  HTMLElement.prototype.constructor = HTMLElement;

  function HTMLHtmlElement()
  {
    HTMLElement.call(this);
  }
  HTMLHtmlElement.prototype = Object.create(HTMLElement.prototype);
  HTMLHtmlElement.prototype.constructor = HTMLHtmlElement;

  function HTMLHeadElement()
  {
    HTMLElement.call(this);
  }
  HTMLHeadElement.prototype = Object.create(HTMLElement.prototype);
  HTMLHeadElement.prototype.constructor = HTMLHeadElement;

  function HTMLBodyElement()
  {
    HTMLElement.call(this);
  }
  HTMLBodyElement.prototype = Object.create(HTMLElement.prototype);
  HTMLBodyElement.prototype.constructor = HTMLBodyElement;

  function HTMLScriptElement()
  {
    HTMLElement.call(this);
  }
  HTMLScriptElement.prototype = Object.create(HTMLElement.prototype);
  HTMLScriptElement.prototype.constructor = HTMLScriptElement;

  function HTMLDivElement()
  {
    HTMLElement.call(this);
  }
  HTMLDivElement.prototype = Object.create(HTMLElement.prototype);
  HTMLDivElement.prototype.constructor = HTMLDivElement;


})(this);

//const body = new this.HTMLBodyElement();
//console.log(body.children);