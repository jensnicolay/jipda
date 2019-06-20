(function (global)
{
  function assert(c)
  {
    if (!c)
    {
      throw new Error("Assertion failed");
    }
  }

  global.window = global; // TODO add/create actual Window object
  global.alert = function (x) {print("(Window.alert) " + x)};
  global.open = function (url, windowName, windowFeatures) {print("(Window.open) " + url)};
  global.fetch = function (url) {print("(Window.fetch) " + url)}; //TODO: 
  global.location = new Location();
  global.CharacterData = CharacterData;
  global.Document = Document;
  global.Element = Element;
  global.HTMLBodyElement = HTMLBodyElement;
  global.HTMLDivElement = HTMLDivElement;
  global.HTMLDocument = HTMLDocument;
  global.HTMLElement = HTMLElement;
  global.HTMLHeadElement = HTMLHeadElement;
  global.HTMLHtmlElement = HTMLHtmlElement;
  global.HTMLMetaElement = HTMLMetaElement;
  global.HTMLIframeElement = HTMLIframeElement;
  global.HTMLImageElement = HTMLImageElement;
  global.HTMLScriptElement = HTMLScriptElement;
  global.HTMLTitleElement = HTMLTitleElement;
  global.Node = Node;
  global.Text = Text;
  global.XMLHttpRequest = XMLHttpRequest;
  global.HTMLInputElement = HTMLInputElement;
  global.Event = Event;
  global.EventTarget = EventTarget;

  function Location()
  {
  }

  Location.prototype.assign =
      function (x)
      {
        print("(Location.assign) " + x);
      }

  function XMLHttpRequest()
  {
  }

  XMLHttpRequest.prototype.open =
      function (method, url)
      {
        print("(XHR.open) " + method + " " + url);
      }

  XMLHttpRequest.prototype.send =
      function (body)
      {
        print("(XHR.Send) " + body);
      }

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
    this.cookie = "";
    this.location = global.location; // must be shared with Window
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
        if (localName === "iframe")
        {
          return new HTMLIframeElement();
        }
        if (localName === "img")
        {
          return new HTMLImageElement();
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

  function HTMLTitleElement()
  {
    HTMLElement.call(this);
  }
  HTMLTitleElement.prototype = Object.create(HTMLElement.prototype);
  HTMLTitleElement.prototype.constructor = HTMLTitleElement;

  function HTMLMetaElement()
  {
    HTMLElement.call(this);
  }
  HTMLMetaElement.prototype = Object.create(HTMLElement.prototype);
  HTMLMetaElement.prototype.constructor = HTMLMetaElement;

  function HTMLIframeElement()
  {
    HTMLElement.call(this);
  }
  HTMLIframeElement.prototype = Object.create(HTMLElement.prototype);
  HTMLIframeElement.prototype.constructor = HTMLIframeElement;

  function HTMLImageElement()
  {
    HTMLElement.call(this);
    this.src = "";
  }
  HTMLImageElement.prototype = Object.create(HTMLElement.prototype);
  HTMLImageElement.prototype.constructor = HTMLImageElement;

  function HTMLInputElement()
  {
    HTMLElement.call(this);
  }
  HTMLInputElement.prototype = Object.create(HTMLElement.prototype);
  HTMLInputElement.prototype.constructor = HTMLInputElement;
  HTMLInputElement.prototype.tagName = "INPUT";

  function EventTarget(){
    this.listeners = {} // new Map? if they are implemented!
  }

  EventTarget.prototype.addEventListener =
      function(type, callback)
      {
        if(!this.listeners[type])
        {
          this.listeners[type] = [];
        }
        this.listeners[type].push(callback);
      }

  EventTarget.prototype.removeEventListener =
      function(type, callback)
      {
        if(!this.listeners[type]) 
        {
          return;
        }
        var callbacks = this.listeners[type];

        for (let i = 0; i < callbacks.length; i++) 
        {
          var cb = callback[i];
          if(cb === callback)
          {
            callbacks.splice(i,1);
            return;
          }
        }
      }  

  EventTarget.prototype.dispatchEvent =
      function(event)
      {
        if(!this.listeners[event.type])
        {
          return true;
        }
        var callbacks = this.listeners[event.type];

        for (var i = 0; i < callbacks.length; i++) 
        {
          var cb = callbacks[i];
          cb.call(this, event);
        }
        return !event.defaultPrevented;
      }

  function Event(type){
    this.type = type;
    this.target = undefined;
    //this.bubbles = true;
  }
  Event.prototype.stopPropagation = 
      function()
      {
       //TODO: this.bubbles = false;
      }  
  Event.prototype.stopImmediatePropagation =
      function()
      {
        //TODO:
      }
  Event.prototype.preventDefault = 
      function()
      {
        //TODO:
      }

})(this);

//const body = new this.HTMLBodyElement();
//console.log(body.children);