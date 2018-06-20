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
  global.CharacterData = CharacterData;
  global.Text = Text;
  global.Element = Element;
  global.HTMLElement = HTMLElement;
  global.HTMLHtmlElement = HTMLHtmlElement;
  global.HTMLHeadElement = HTMLHeadElement;
  global.HTMLBodyElement = HTMLBodyElement;
  global.HTMLScriptElement = HTMLScriptElement;
  global.HTMLDivElement = HTMLDivElement;

  function Node()
  {
  }

  Node.prototype.insertBefore =
      function (node, child)
      {
        this.children.push(node); // TODO
      }

  Node.prototype.appendChild =
      function (node)
      {
        this.children.push(node);
      }

  function ParentNode() // mixin
  {
    this.children = [];
  }
  ParentNode.prototype.getElementById =
      function (id)
      {
        return getElementById(this, id);
      }

  function getElementById(node, id)
  {
    var children = node.children;
    var l = children.length;
    for (var i = 0; i < l; i++)
    {
      var child = children[i];
      if (child.id === id)
      {
        return child;
      }
      var desc = getElementById(child, id);
      if (desc)
      {
        return desc;
      }
    }
    return null;
  }

  function Document()
  {
    Node.call(this);
    ParentNode.call(this);
  }
  Document.prototype = Object.create(Node.prototype);
  Document.prototype.constructor = Document;
  // mixin ParentNode
  Document.prototype.getElementById = ParentNode.prototype.getElementById;
  // end


  Document.prototype.createElement =
      function (localName)
      {
        if (localName === "div")
        {
          return new HTMLDivElement();
        }
        throw new Error("no custom element support yet");
      }

  Document.prototype.createTextNode =
      function (data)
      {
          return new Text(data);
      }

  function HTMLDocument()
  {
    Document.call(this);
  }
  HTMLDocument.prototype = Object.create(Document.prototype);
  HTMLDocument.prototype.constructor = HTMLDocument;

  function CharacterData()
  {
    // this.data = "";
  }
  CharacterData.prototype = Object.create(Node.prototype);
  CharacterData.prototype.constructor = CharacterData;

  function Text(data)
  {
    //CharacterData.call(this);
    this.data = data;
  }
  Text.prototype = Object.create(CharacterData.prototype);
  Text.prototype.constructor = Text;


  function Element()
  {
    Node.call(this);
    ParentNode.call(this);
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
  HTMLHtmlElement.prototype.tagName = "HTML";


  function HTMLHeadElement()
  {
    HTMLElement.call(this);
  }
  HTMLHeadElement.prototype = Object.create(HTMLElement.prototype);
  HTMLHeadElement.prototype.constructor = HTMLHeadElement;
  HTMLHeadElement.prototype.tagName = "HEAD";

  function HTMLBodyElement()
  {
    HTMLElement.call(this);
  }
  HTMLBodyElement.prototype = Object.create(HTMLElement.prototype);
  HTMLBodyElement.prototype.constructor = HTMLBodyElement;
  HTMLBodyElement.prototype.tagName = "BODY";

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