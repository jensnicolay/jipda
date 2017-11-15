import { JSXSyntax } from './jsx-syntax.mjs';
/* tslint:disable:max-classes-per-file */
export class JSXClosingElement {
    constructor(name) {
        this.type = JSXSyntax.JSXClosingElement;
        this.name = name;
    }
}
export class JSXElement {
    constructor(openingElement, children, closingElement) {
        this.type = JSXSyntax.JSXElement;
        this.openingElement = openingElement;
        this.children = children;
        this.closingElement = closingElement;
    }
}
export class JSXEmptyExpression {
    constructor() {
        this.type = JSXSyntax.JSXEmptyExpression;
    }
}
export class JSXExpressionContainer {
    constructor(expression) {
        this.type = JSXSyntax.JSXExpressionContainer;
        this.expression = expression;
    }
}
export class JSXIdentifier {
    constructor(name) {
        this.type = JSXSyntax.JSXIdentifier;
        this.name = name;
    }
}
export class JSXMemberExpression {
    constructor(object, property) {
        this.type = JSXSyntax.JSXMemberExpression;
        this.object = object;
        this.property = property;
    }
}
export class JSXAttribute {
    constructor(name, value) {
        this.type = JSXSyntax.JSXAttribute;
        this.name = name;
        this.value = value;
    }
}
export class JSXNamespacedName {
    constructor(namespace, name) {
        this.type = JSXSyntax.JSXNamespacedName;
        this.namespace = namespace;
        this.name = name;
    }
}
export class JSXOpeningElement {
    constructor(name, selfClosing, attributes) {
        this.type = JSXSyntax.JSXOpeningElement;
        this.name = name;
        this.selfClosing = selfClosing;
        this.attributes = attributes;
    }
}
export class JSXSpreadAttribute {
    constructor(argument) {
        this.type = JSXSyntax.JSXSpreadAttribute;
        this.argument = argument;
    }
}
export class JSXText {
    constructor(value, raw) {
        this.type = JSXSyntax.JSXText;
        this.value = value;
        this.raw = raw;
    }
}
