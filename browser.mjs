import {assert} from './common';
import jsdom  from "jsdom";
import {explore} from "./abstract-machine";
import {StringResource} from "./ast";


const { JSDOM } = jsdom;


export function Browser(jsContext)
{
  this.jsContext = jsContext;
}

Browser.prototype.parse =
    function (htmlResource)
    {
      const dom = new JSDOM(htmlResource.toSrc(),  { includeNodeLocations: true });
      dom.window.document.resource = htmlResource;
      dom.window.document.dom = dom;
      this.parseWindow(dom.window);
      const result = this.jsContext.globalObject().getProperty("$result$");
      return result.d;
    }

Browser.prototype.parseChildren =
    function (node, jsNode)
    {
      const jsChildren = jsNode.getProperty('children');
      const children = [];
      for (const c of node.children)
      {
        children.push(this.parseNode(c, jsChildren));
      }
      return children;
    }

Browser.prototype.parseWindow =
    function (window)
    {
      const jsDoc = this.parseDocument(window.document);
      const jsWindow = this.jsContext.globalObject();
      const onload = jsWindow.getProperty("document").getProperty("body").getProperty("onload");
      if (onload.isNonUndefined())
      {
        onload.call(jsWindow);
      }
    }

Browser.prototype.parseDocument =
    function (doc)
    {
      const jsDoc = this.jsContext.globalObject().getProperty("HTMLDocument").construct([]);
      this.jsContext.globalObject().assignProperty("document", jsDoc);
      this.parseChildren(doc, jsDoc);
      return jsDoc;
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
        case 'BODY': return this.parseBody(element, jsChildren);
        case 'DIV': return this.parseDiv(element, jsChildren);
        case 'HEAD': return this.parseHead(element, jsChildren);
        case 'HTML': return this.parseHtml(element, jsChildren);
        case 'META': return this.parseMeta(element, jsChildren);
        case 'SCRIPT': return this.parseScript(element, jsChildren);
        case 'TITLE': return this.parseTitle(element, jsChildren);
        case 'INPUT': return this.parseInput(element, jsChildren);
        default: throw new Error("cannot handle element name " + element.nodeName);
      }
    }

Browser.prototype.parseHtml =
    function (html, jsChildren)
    {
      const jsHtml = this.jsContext.globalObject().getProperty("HTMLHtmlElement").construct([]);
      jsChildren.push(jsHtml);
      this.parseChildren(html, jsHtml);
      return jsHtml;
    }

Browser.prototype.parseHead =
    function (head, jsChildren)
    {
      const jsHead = this.jsContext.globalObject().getProperty("HTMLHeadElement").construct([]);
      jsChildren.push(jsHead);
      this.jsContext.globalObject().getProperty("document").assignProperty("head", jsHead);
      this.parseChildren(head, jsHead);
      return jsHead;
    }

Browser.prototype.parseBody =
    function (body, jsChildren)
    {
      const jsBody = this.jsContext.globalObject().getProperty("HTMLBodyElement").construct([]);
      jsChildren.push(jsBody);
      this.jsContext.globalObject().getProperty("document").assignProperty("body", jsBody);
      this.parseChildren(body, jsBody);
      return jsBody;
    }

Browser.prototype.parseScript =
    function (script, jsChildren)
    {
      const jsScript = this.jsContext.globalObject().getProperty("HTMLScriptElement").construct([]);
      jsChildren.push(jsScript);
      //const src =‌ ‌script.getAttribute("src");
      const src = script.text;
      const stringResource = new StringResource(src, script.ownerDocument.resource);
      const posInParent = script.ownerDocument.dom.nodeLocation(script);
      stringResource.posInParent = {start:{line:posInParent.line,column:posInParent.col}};
      this.jsContext.evaluateScript(stringResource);
      return jsScript;
    }

Browser.prototype.parseTitle =
    function (title, jsChildren)
    {
      const jsTitle = this.jsContext.globalObject().getProperty("HTMLTitleElement").construct([]);
      jsChildren.push(jsTitle);
      const titleText = title.text;
      jsTitle.assignProperty("text", titleText);
      return jsTitle;
    }

Browser.prototype.parseMeta =
    function (title, jsChildren)
    {
      const jsMeta = this.jsContext.globalObject().getProperty("HTMLMetaElement").construct([]);
      jsChildren.push(jsMeta);
      return jsMeta;
    }

Browser.prototype.parseDiv =
    function (div, jsChildren)
    {
      const jsDiv = this.jsContext.globalObject().getProperty("HTMLDivElement").construct([]);
      jsChildren.push(jsDiv);
      const id = div.getAttribute("id");
      if (id)
      {
        jsDiv.assignProperty("id", id);
      }
      this.parseChildren(div, jsDiv);
      return jsDiv;
    }

//Added by Scull

Browser.prototype.click = 
    function(elemID)
    { 
      const jsWindow = this.jsContext.globalObject();
      const getElementById = jsWindow.getProperty("document").getProperty("getElementById");
      //TODO: Continue Here!
    }

Browser.prototype.parseInput =
    function (input, jsChildren)
    {
      const jsInput = this.jsContext.globalObject().getProperty("HTMLInputElement").construct([]);
      jsChildren.push(jsInput);
      const id = input.getAttribute("id");
      if (id)
      {
        jsInput.assignProperty("id", id);
      }
      const type = input.getAttribute("type");
      jsInput.assignProperty("type",type || "input");

      //Following: https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers
      const onclick = input.getAttribute("onclick");
      if (onclick)
      { 
        const handler = this.jsContext.createFunction(["param1", "param2"], onclick); //Not supported, waiting for Jen's support
        jsInput.assignProperty("onclick", handler);
      }
      this.parseChildren(input, jsInput);
      return jsInput;
    }