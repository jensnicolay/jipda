import {assert} from './common';
import jsdom  from "jsdom";
import {explore} from "./abstract-machine";


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
        this.parseNode(c, jsChildren);
      }
    }

Browser.prototype.parseWindow =
    function (window)
    {
      this.parseDocument(window.document);
    }

Browser.prototype.parseDocument =
    function (doc)
    {
      const jsDoc = this.jsContext.globalObject().getProperty("HTMLDocument").construct([]);
      this.jsContext.globalObject().assignProperty("document", jsDoc);
      this.parseChildren(doc, jsDoc);
    }

Browser.prototype.parseNode =
    function (node, jsChildren)
    {
      switch (node.nodeType)
      {
        case 1: return this.parseElement(node, jsChildren);
        default: throw new Error("cannot handle node type " + node.nodeType);
      }
    }

Browser.prototype.parseElement =
    function (element, jsChildren)
    {
      switch (element.nodeName)
      {
        case 'HTML': return this.parseHtml(element, jsChildren);
        case 'HEAD': return this.parseHead(element, jsChildren);
        case 'BODY': return this.parseBody(element, jsChildren);
        case 'SCRIPT': return this.parseScript(element, jsChildren);
        default: throw new Error("cannot handle element name " + element.nodeName);
      }
    }

Browser.prototype.parseHtml =
    function (html, jsChildren)
    {
      const jsHtml = this.jsContext.globalObject().getProperty("HTMLHtmlElement").construct([]);
      jsChildren.push(jsHtml);
      this.parseChildren(html, jsHtml);
    }

Browser.prototype.parseHead =
    function (head, jsChildren)
    {
      const jsHead = this.jsContext.globalObject().getProperty("HTMLHeadElement").construct([]);
      jsChildren.push(jsHead);
      this.parseChildren(head, jsHead);
    }

Browser.prototype.parseBody =
    function (body, jsChildren)
    {
      const jsBody = this.jsContext.globalObject().getProperty("HTMLBodyElement").construct([]);
      jsChildren.push(jsBody);
      this.parseChildren(body, jsBody);
    }

Browser.prototype.parseScript =
    function (script, jsChildren)
    {
      const jsScript = this.jsContext.globalObject().getProperty("HTMLScriptElement").construct([]);
      jsChildren.push(jsScript);
      const src = script.text;
      this.jsContext.evaluateScript(src);
      return jsScript;
    }


