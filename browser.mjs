import {assert} from './common';
import jsdom  from "jsdom";


const { JSDOM } = jsdom;


export function Browser(jsContext)
{
  this.jsContext = jsContext;
}

Browser.prototype.parse =
    function (html)
    {
      const dom = new JSDOM(html);
      this.parseWindow(dom.window);
      const result = this.jsContext.globalObject().getProperty("$result$");
      return result.d;
    }

Browser.prototype.parseChildren =
    function (node)
    {
      const jsChildren = this.jsContext.createArray();
      for (const c of node.children)
      {
        const jsChild = this.parseNode(c);
        jsChildren.push(jsChild);
      }
      return jsChildren;
    }

Browser.prototype.parseWindow =
    function (window)
    {
      const jsDoc = this.parseDocument(window.document);
      this.jsContext.globalObject().assignProperty("document", jsDoc);
    }

Browser.prototype.parseDocument =
    function (doc)
    {
      const jsDoc = this.jsContext.globalObject().getProperty("HTMLDocument").construct([]);
      const jsChildren = this.parseChildren(doc);
      jsDoc.assignProperty("children", jsChildren);
      return jsDoc;
    }

Browser.prototype.parseNode =
    function (node)
    {
      switch (node.nodeType)
      {
        case 1: return this.parseElement(node);
        default: throw new Error("cannot handle node type " + node.nodeType);
      }
    }

Browser.prototype.parseElement =
    function (element)
    {
      switch (element.nodeName)
      {
        case 'HTML': return this.parseHtml(element);
        case 'HEAD': return this.parseHead(element);
        case 'BODY': return this.parseBody(element);
        case 'SCRIPT': return this.parseScript(element);
        default: throw new Error("cannot handle element name " + element.nodeName);
      }
    }

Browser.prototype.parseHtml =
    function (html)
    {
      const jsHtml = this.jsContext.globalObject().getProperty("HTMLHtmlElement").construct([]);
      const jsChildren = this.parseChildren(html);
      jsHtml.assignProperty("children", jsChildren);
      return jsHtml;
    }

Browser.prototype.parseHead =
    function (head)
    {
      return this.parseChildren(head);
    }

Browser.prototype.parseBody =
    function (body)
    {
      return this.parseChildren(body);
    }

Browser.prototype.parseScript =
    function (script)
    {
      const jsScript = this.jsContext.globalObject().getProperty("HTMLScriptElement").construct([]);
      const src = script.text;
      this.jsContext.evaluateScript(src);
      return jsScript;
    }


