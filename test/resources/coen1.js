function Rect(w, h) {
 this.width = w;
 this.height = h;
}

Rect.prototype.toString = function() {
 return "a Rectangle";
};

function defAccessors(prop) {
 Rect.prototype["get"+ prop] =
   function() { return this[prop]; };
}

defAccessors("width");

var r = new Rect(20, 30);
r.getwidth();