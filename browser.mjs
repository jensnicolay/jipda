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
    function (node, jsNode)
    {
      const jsChildren = jsNode.getProperty('children');
      for (const c of node.children)
      {
        const jsChild = this.parseNode(c);
        jsChildren.push(jsChild);
      }
    }

Browser.prototype.parseWindow =
    function (window)
    {
      const jsDoc = this.jsContext.globalObject().getProperty("HTMLDocument").construct([]);
      this.jsContext.globalObject().assignProperty("document", jsDoc);
      this.parseDocument(window.document, jsDoc);
    }

Browser.prototype.parseDocument =
    function (doc, jsDoc)
    {
      this.parseChildren(doc, jsDoc);
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
      this.parseChildren(html, jsHtml);
      return jsHtml;
    }

Browser.prototype.parseHead =
    function (head)
    {
      const jsHead = this.jsContext.globalObject().getProperty("HTMLHeadElement").construct([]);
      this.parseChildren(head, jsHead);
      return jsHead;
    }

Browser.prototype.parseBody =
    function (body)
    {
      const jsBody = this.jsContext.globalObject().getProperty("HTMLBodyElement").construct([]);
      this.parseChildren(body, jsBody);
      return jsBody;
    }

Browser.prototype.parseScript =
    function (script)
    {
      const jsScript = this.jsContext.globalObject().getProperty("HTMLScriptElement").construct([]);
      const src = script.text;
      this.jsContext.evaluateScript(src);
      return jsScript;
    }


