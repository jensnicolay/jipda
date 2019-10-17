import {assert} from './common.mjs';
import jsdom  from "jsdom";
import {} from "./abstract-machine.mjs";
import {StringResource} from "./ast.mjs";


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
      // const result = this.jsContext.globalObject().getProperty("$result$");
      // return result.d;
      return null; // useful return value?
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
        case 'TD': return this.parseTd(element, jsChildren);
        case 'TR': return this.parseTr(element, jsChildren);
        case 'TABLE': return this.parseTable(element, jsChildren);
        case 'TBODY': return this.parseTBody(element, jsChildren);
        case 'P': return this.parseP(element, jsChildren);
        case 'A': return this.parseA(element, jsChildren);
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
      const onload = body.getAttribute("onload");
      if(onload)
      {
        const handler = this.jsContext.createFunction([], onload);
        jsBody.assignProperty("onload",handler);
      }
      const className = body.getAttribute("class");
      if (className)
      {
        jsBody.assignProperty("className", className);
      }
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
      const className = div.getAttribute("class");
      if (className)
      {
        jsDiv.assignProperty("className", className);
      }
      this.parseChildren(div, jsDiv);
      return jsDiv;
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
      const className = input.getAttribute("class");
      if (className)
      {
        jsInput.assignProperty("className", className);
      }
      const type = input.getAttribute("type");
      jsInput.assignProperty("type", type || "input");

      const value = input.getAttribute("value");
      jsInput.assignProperty("value", value);

      //Following: https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers
      const onclick = input.getAttribute("onclick");
      if (onclick)
      { 
        const handler = this.jsContext.createFunction([], onclick);
        jsInput.assignProperty("onclick", handler);
      }
      this.parseChildren(input, jsInput);
      return jsInput;
    }

Browser.prototype.parseTd =
    function (td, jsChildren)
    {
      const jsTd = this.jsContext.globalObject().getProperty("HTMLTableCellElement").construct([]);
      jsChildren.push(jsTd);
      const id = td.getAttribute("id");
      if (id)
      {
        jsTd.assignProperty("id", id);
      }
      const className = td.getAttribute("class");
      if (className)
      {
        jsTd.assignProperty("className", className);
      }
      this.parseChildren(td, jsTd);
      return jsTd;
    }

Browser.prototype.parseTr =
    function (tr, jsChildren)
    {
      const jsTr = this.jsContext.globalObject().getProperty("HTMLTableRowElement").construct([]);
      jsChildren.push(jsTr);
      const id = tr.getAttribute("id");
      if (id)
      {
        jsTr.assignProperty("id", id);
      }
      const className = tr.getAttribute("class");
      if (className)
      {
        jsTr.assignProperty("className", className);
      }
      this.parseChildren(tr, jsTr);
      return jsTr;
    } 

Browser.prototype.parseTBody =
    function (tbody,jsChildren)
    {
      const jsTBody = this.jsContext.globalObject().getProperty("HTMLTableSectionElement").construct([]);
      jsChildren.push(jsTBody);

      const id = tbody.getAttribute("id");
      if (id)
      {
        jsTBody.assignProperty("id", id);
      }
      const className = tbody.getAttribute("class");
      if (className)
      {
        jsTBody.assignProperty("className", className);
      }
       this.parseChildren(tbody, jsTBody);
      return jsTBody;
    }

Browser.prototype.parseTable =
    function (table, jsChildren)
    {
      const jsTable = this.jsContext.globalObject().getProperty("HTMLTableElement").construct([]);
      jsChildren.push(jsTable);
      const id = table.getAttribute("id");
      if (id)
      {
        jsTable.assignProperty("id", id);
      }
      const className = table.getAttribute("class");
      if (className)
      {
        jsTable.assignProperty("className", className);
      }
      this.parseChildren(table, jsTable);
      return jsTable;
    }

Browser.prototype.parseP =
    function (paragraph, jsChildren)
    {
      const jsParagraph = this.jsContext.globalObject().getProperty("HTMLParagraphElement").construct([]);
      jsChildren.push(jsParagraph);
      const id = paragraph.getAttribute("id");
      if (id)
      {
        jsParagraph.assignProperty("id", id);
      }
      const className = paragraph.getAttribute("class");
      if(className)
      {
        jsParagraph.assignProperty("className",className);
      }
      this.parseChildren(paragraph, jsParagraph);
      return jsParagraph;
    }
    
Browser.prototype.parseA =
    function (anchor, jsChildren)
    {
      const jsAnchor = this.jsContext.globalObject().getProperty("HTMLAnchorElement").construct([]);
      jsChildren.push(jsAnchor);
      jsAnchor.assignProperty("href",anchor.getAttribute("href"));
      const id = anchor.getAttribute("id");
      if (id)
      {
        jsAnchor.assignProperty("id", id);
      }
      const className = anchor.getAttribute("class");
      if(className)
      {
        jsAnchor.assignProperty("className",className);
      }
      this.parseChildren(anchor, jsAnchor);
      return jsAnchor;
    }

Browser.prototype.click =
    function(elemID)
    {
      const jsWindow = this.jsContext.globalObject();
      const getElementById = jsWindow.getProperty("document").getProperty("getElementById");
      //TODO: Continue Here!
    }

