import { Character } from './character.mjs';
import * as JSXNode from './jsx-nodes.mjs';
import { JSXSyntax } from './jsx-syntax.mjs';
import * as Node from './nodes.mjs';
import { Parser } from './parser.mjs';
import { TokenName } from './token.mjs';
import { XHTMLEntities } from './xhtml-entities.mjs';
TokenName[100 /* Identifier */] = 'JSXIdentifier';
TokenName[101 /* Text */] = 'JSXText';
// Fully qualified element name, e.g. <svg:path> returns "svg:path"
function getQualifiedElementName(elementName) {
    let qualifiedName;
    switch (elementName.type) {
        case JSXSyntax.JSXIdentifier:
            const id = elementName;
            qualifiedName = id.name;
            break;
        case JSXSyntax.JSXNamespacedName:
            const ns = elementName;
            qualifiedName = getQualifiedElementName(ns.namespace) + ':' +
                getQualifiedElementName(ns.name);
            break;
        case JSXSyntax.JSXMemberExpression:
            const expr = elementName;
            qualifiedName = getQualifiedElementName(expr.object) + '.' +
                getQualifiedElementName(expr.property);
            break;
        /* istanbul ignore next */
        default:
            break;
    }
    return qualifiedName;
}
export class JSXParser extends Parser {
    constructor(code, options, delegate) {
        super(code, options, delegate);
    }
    parsePrimaryExpression() {
        return this.match('<') ? this.parseJSXRoot() : super.parsePrimaryExpression();
    }
    startJSX() {
        // Unwind the scanner before the lookahead token.
        this.scanner.index = this.startMarker.index;
        this.scanner.lineNumber = this.startMarker.line;
        this.scanner.lineStart = this.startMarker.index - this.startMarker.column;
    }
    finishJSX() {
        // Prime the next lookahead.
        this.nextToken();
    }
    reenterJSX() {
        this.startJSX();
        this.expectJSX('}');
        // Pop the closing '}' added from the lookahead.
        if (this.config.tokens) {
            this.tokens.pop();
        }
    }
    createJSXNode() {
        this.collectComments();
        return {
            index: this.scanner.index,
            line: this.scanner.lineNumber,
            column: this.scanner.index - this.scanner.lineStart
        };
    }
    createJSXChildNode() {
        return {
            index: this.scanner.index,
            line: this.scanner.lineNumber,
            column: this.scanner.index - this.scanner.lineStart
        };
    }
    scanXHTMLEntity(quote) {
        let result = '&';
        let valid = true;
        let terminated = false;
        let numeric = false;
        let hex = false;
        while (!this.scanner.eof() && valid && !terminated) {
            const ch = this.scanner.source[this.scanner.index];
            if (ch === quote) {
                break;
            }
            terminated = (ch === ';');
            result += ch;
            ++this.scanner.index;
            if (!terminated) {
                switch (result.length) {
                    case 2:
                        // e.g. '&#123;'
                        numeric = (ch === '#');
                        break;
                    case 3:
                        if (numeric) {
                            // e.g. '&#x41;'
                            hex = (ch === 'x');
                            valid = hex || Character.isDecimalDigit(ch.charCodeAt(0));
                            numeric = numeric && !hex;
                        }
                        break;
                    default:
                        valid = valid && !(numeric && !Character.isDecimalDigit(ch.charCodeAt(0)));
                        valid = valid && !(hex && !Character.isHexDigit(ch.charCodeAt(0)));
                        break;
                }
            }
        }
        if (valid && terminated && result.length > 2) {
            // e.g. '&#x41;' becomes just '#x41'
            const str = result.substr(1, result.length - 2);
            if (numeric && str.length > 1) {
                result = String.fromCharCode(parseInt(str.substr(1), 10));
            }
            else if (hex && str.length > 2) {
                result = String.fromCharCode(parseInt('0' + str.substr(1), 16));
            }
            else if (!numeric && !hex && XHTMLEntities[str]) {
                result = XHTMLEntities[str];
            }
        }
        return result;
    }
    // Scan the next JSX token. This replaces Scanner#lex when in JSX mode.
    lexJSX() {
        const cp = this.scanner.source.charCodeAt(this.scanner.index);
        // < > / : = { }
        if (cp === 60 || cp === 62 || cp === 47 || cp === 58 || cp === 61 || cp === 123 || cp === 125) {
            const value = this.scanner.source[this.scanner.index++];
            return {
                type: 7 /* Punctuator */,
                value: value,
                lineNumber: this.scanner.lineNumber,
                lineStart: this.scanner.lineStart,
                start: this.scanner.index - 1,
                end: this.scanner.index
            };
        }
        // " '
        if (cp === 34 || cp === 39) {
            const start = this.scanner.index;
            const quote = this.scanner.source[this.scanner.index++];
            let str = '';
            while (!this.scanner.eof()) {
                const ch = this.scanner.source[this.scanner.index++];
                if (ch === quote) {
                    break;
                }
                else if (ch === '&') {
                    str += this.scanXHTMLEntity(quote);
                }
                else {
                    str += ch;
                }
            }
            return {
                type: 8 /* StringLiteral */,
                value: str,
                lineNumber: this.scanner.lineNumber,
                lineStart: this.scanner.lineStart,
                start: start,
                end: this.scanner.index
            };
        }
        // ... or .
        if (cp === 46) {
            const n1 = this.scanner.source.charCodeAt(this.scanner.index + 1);
            const n2 = this.scanner.source.charCodeAt(this.scanner.index + 2);
            const value = (n1 === 46 && n2 === 46) ? '...' : '.';
            const start = this.scanner.index;
            this.scanner.index += value.length;
            return {
                type: 7 /* Punctuator */,
                value: value,
                lineNumber: this.scanner.lineNumber,
                lineStart: this.scanner.lineStart,
                start: start,
                end: this.scanner.index
            };
        }
        // `
        if (cp === 96) {
            // Only placeholder, since it will be rescanned as a real assignment expression.
            return {
                type: 10 /* Template */,
                value: '',
                lineNumber: this.scanner.lineNumber,
                lineStart: this.scanner.lineStart,
                start: this.scanner.index,
                end: this.scanner.index
            };
        }
        // Identifer can not contain backslash (char code 92).
        if (Character.isIdentifierStart(cp) && (cp !== 92)) {
            const start = this.scanner.index;
            ++this.scanner.index;
            while (!this.scanner.eof()) {
                const ch = this.scanner.source.charCodeAt(this.scanner.index);
                if (Character.isIdentifierPart(ch) && (ch !== 92)) {
                    ++this.scanner.index;
                }
                else if (ch === 45) {
                    // Hyphen (char code 45) can be part of an identifier.
                    ++this.scanner.index;
                }
                else {
                    break;
                }
            }
            const id = this.scanner.source.slice(start, this.scanner.index);
            return {
                type: 100 /* Identifier */,
                value: id,
                lineNumber: this.scanner.lineNumber,
                lineStart: this.scanner.lineStart,
                start: start,
                end: this.scanner.index
            };
        }
        return this.scanner.lex();
    }
    nextJSXToken() {
        this.collectComments();
        this.startMarker.index = this.scanner.index;
        this.startMarker.line = this.scanner.lineNumber;
        this.startMarker.column = this.scanner.index - this.scanner.lineStart;
        const token = this.lexJSX();
        this.lastMarker.index = this.scanner.index;
        this.lastMarker.line = this.scanner.lineNumber;
        this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
        if (this.config.tokens) {
            this.tokens.push(this.convertToken(token));
        }
        return token;
    }
    nextJSXText() {
        this.startMarker.index = this.scanner.index;
        this.startMarker.line = this.scanner.lineNumber;
        this.startMarker.column = this.scanner.index - this.scanner.lineStart;
        const start = this.scanner.index;
        let text = '';
        while (!this.scanner.eof()) {
            const ch = this.scanner.source[this.scanner.index];
            if (ch === '{' || ch === '<') {
                break;
            }
            ++this.scanner.index;
            text += ch;
            if (Character.isLineTerminator(ch.charCodeAt(0))) {
                ++this.scanner.lineNumber;
                if (ch === '\r' && this.scanner.source[this.scanner.index] === '\n') {
                    ++this.scanner.index;
                }
                this.scanner.lineStart = this.scanner.index;
            }
        }
        this.lastMarker.index = this.scanner.index;
        this.lastMarker.line = this.scanner.lineNumber;
        this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
        const token = {
            type: 101 /* Text */,
            value: text,
            lineNumber: this.scanner.lineNumber,
            lineStart: this.scanner.lineStart,
            start: start,
            end: this.scanner.index
        };
        if ((text.length > 0) && this.config.tokens) {
            this.tokens.push(this.convertToken(token));
        }
        return token;
    }
    peekJSXToken() {
        const state = this.scanner.saveState();
        this.scanner.scanComments();
        const next = this.lexJSX();
        this.scanner.restoreState(state);
        return next;
    }
    // Expect the next JSX token to match the specified punctuator.
    // If not, an exception will be thrown.
    expectJSX(value) {
        const token = this.nextJSXToken();
        if (token.type !== 7 /* Punctuator */ || token.value !== value) {
            this.throwUnexpectedToken(token);
        }
    }
    // Return true if the next JSX token matches the specified punctuator.
    matchJSX(value) {
        const next = this.peekJSXToken();
        return next.type === 7 /* Punctuator */ && next.value === value;
    }
    parseJSXIdentifier() {
        const node = this.createJSXNode();
        const token = this.nextJSXToken();
        if (token.type !== 100 /* Identifier */) {
            this.throwUnexpectedToken(token);
        }
        return this.finalize(node, new JSXNode.JSXIdentifier(token.value));
    }
    parseJSXElementName() {
        const node = this.createJSXNode();
        let elementName = this.parseJSXIdentifier();
        if (this.matchJSX(':')) {
            const namespace = elementName;
            this.expectJSX(':');
            const name = this.parseJSXIdentifier();
            elementName = this.finalize(node, new JSXNode.JSXNamespacedName(namespace, name));
        }
        else if (this.matchJSX('.')) {
            while (this.matchJSX('.')) {
                const object = elementName;
                this.expectJSX('.');
                const property = this.parseJSXIdentifier();
                elementName = this.finalize(node, new JSXNode.JSXMemberExpression(object, property));
            }
        }
        return elementName;
    }
    parseJSXAttributeName() {
        const node = this.createJSXNode();
        let attributeName;
        const identifier = this.parseJSXIdentifier();
        if (this.matchJSX(':')) {
            const namespace = identifier;
            this.expectJSX(':');
            const name = this.parseJSXIdentifier();
            attributeName = this.finalize(node, new JSXNode.JSXNamespacedName(namespace, name));
        }
        else {
            attributeName = identifier;
        }
        return attributeName;
    }
    parseJSXStringLiteralAttribute() {
        const node = this.createJSXNode();
        const token = this.nextJSXToken();
        if (token.type !== 8 /* StringLiteral */) {
            this.throwUnexpectedToken(token);
        }
        const raw = this.getTokenRaw(token);
        return this.finalize(node, new Node.Literal(token.value, raw));
    }
    parseJSXExpressionAttribute() {
        const node = this.createJSXNode();
        this.expectJSX('{');
        this.finishJSX();
        if (this.match('}')) {
            this.tolerateError('JSX attributes must only be assigned a non-empty expression');
        }
        const expression = this.parseAssignmentExpression();
        this.reenterJSX();
        return this.finalize(node, new JSXNode.JSXExpressionContainer(expression));
    }
    parseJSXAttributeValue() {
        return this.matchJSX('{') ? this.parseJSXExpressionAttribute() :
            this.matchJSX('<') ? this.parseJSXElement() : this.parseJSXStringLiteralAttribute();
    }
    parseJSXNameValueAttribute() {
        const node = this.createJSXNode();
        const name = this.parseJSXAttributeName();
        let value = null;
        if (this.matchJSX('=')) {
            this.expectJSX('=');
            value = this.parseJSXAttributeValue();
        }
        return this.finalize(node, new JSXNode.JSXAttribute(name, value));
    }
    parseJSXSpreadAttribute() {
        const node = this.createJSXNode();
        this.expectJSX('{');
        this.expectJSX('...');
        this.finishJSX();
        const argument = this.parseAssignmentExpression();
        this.reenterJSX();
        return this.finalize(node, new JSXNode.JSXSpreadAttribute(argument));
    }
    parseJSXAttributes() {
        const attributes = [];
        while (!this.matchJSX('/') && !this.matchJSX('>')) {
            const attribute = this.matchJSX('{') ? this.parseJSXSpreadAttribute() :
                this.parseJSXNameValueAttribute();
            attributes.push(attribute);
        }
        return attributes;
    }
    parseJSXOpeningElement() {
        const node = this.createJSXNode();
        this.expectJSX('<');
        const name = this.parseJSXElementName();
        const attributes = this.parseJSXAttributes();
        const selfClosing = this.matchJSX('/');
        if (selfClosing) {
            this.expectJSX('/');
        }
        this.expectJSX('>');
        return this.finalize(node, new JSXNode.JSXOpeningElement(name, selfClosing, attributes));
    }
    parseJSXBoundaryElement() {
        const node = this.createJSXNode();
        this.expectJSX('<');
        if (this.matchJSX('/')) {
            this.expectJSX('/');
            const name = this.parseJSXElementName();
            this.expectJSX('>');
            return this.finalize(node, new JSXNode.JSXClosingElement(name));
        }
        const name = this.parseJSXElementName();
        const attributes = this.parseJSXAttributes();
        const selfClosing = this.matchJSX('/');
        if (selfClosing) {
            this.expectJSX('/');
        }
        this.expectJSX('>');
        return this.finalize(node, new JSXNode.JSXOpeningElement(name, selfClosing, attributes));
    }
    parseJSXEmptyExpression() {
        const node = this.createJSXChildNode();
        this.collectComments();
        this.lastMarker.index = this.scanner.index;
        this.lastMarker.line = this.scanner.lineNumber;
        this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
        return this.finalize(node, new JSXNode.JSXEmptyExpression());
    }
    parseJSXExpressionContainer() {
        const node = this.createJSXNode();
        this.expectJSX('{');
        let expression;
        if (this.matchJSX('}')) {
            expression = this.parseJSXEmptyExpression();
            this.expectJSX('}');
        }
        else {
            this.finishJSX();
            expression = this.parseAssignmentExpression();
            this.reenterJSX();
        }
        return this.finalize(node, new JSXNode.JSXExpressionContainer(expression));
    }
    parseJSXChildren() {
        const children = [];
        while (!this.scanner.eof()) {
            const node = this.createJSXChildNode();
            const token = this.nextJSXText();
            if (token.start < token.end) {
                const raw = this.getTokenRaw(token);
                const child = this.finalize(node, new JSXNode.JSXText(token.value, raw));
                children.push(child);
            }
            if (this.scanner.source[this.scanner.index] === '{') {
                const container = this.parseJSXExpressionContainer();
                children.push(container);
            }
            else {
                break;
            }
        }
        return children;
    }
    parseComplexJSXElement(el) {
        const stack = [];
        while (!this.scanner.eof()) {
            el.children = el.children.concat(this.parseJSXChildren());
            const node = this.createJSXChildNode();
            const element = this.parseJSXBoundaryElement();
            if (element.type === JSXSyntax.JSXOpeningElement) {
                const opening = element;
                if (opening.selfClosing) {
                    const child = this.finalize(node, new JSXNode.JSXElement(opening, [], null));
                    el.children.push(child);
                }
                else {
                    stack.push(el);
                    el = { node, opening, closing: null, children: [] };
                }
            }
            if (element.type === JSXSyntax.JSXClosingElement) {
                el.closing = element;
                const open = getQualifiedElementName(el.opening.name);
                const close = getQualifiedElementName(el.closing.name);
                if (open !== close) {
                    this.tolerateError('Expected corresponding JSX closing tag for %0', open);
                }
                if (stack.length > 0) {
                    const child = this.finalize(el.node, new JSXNode.JSXElement(el.opening, el.children, el.closing));
                    el = stack[stack.length - 1];
                    el.children.push(child);
                    stack.pop();
                }
                else {
                    break;
                }
            }
        }
        return el;
    }
    parseJSXElement() {
        const node = this.createJSXNode();
        const opening = this.parseJSXOpeningElement();
        let children = [];
        let closing = null;
        if (!opening.selfClosing) {
            const el = this.parseComplexJSXElement({ node, opening, closing, children });
            children = el.children;
            closing = el.closing;
        }
        return this.finalize(node, new JSXNode.JSXElement(opening, children, closing));
    }
    parseJSXRoot() {
        // Pop the opening '<' added from the lookahead.
        if (this.config.tokens) {
            this.tokens.pop();
        }
        this.startJSX();
        const element = this.parseJSXElement();
        this.finishJSX();
        return element;
    }
    isStartOfExpression() {
        return super.isStartOfExpression() || this.match('<');
    }
}
