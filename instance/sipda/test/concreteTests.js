var suiteConcreteTests = 
  
(function () 
{
  var module = new TestSuite("suiteConcreteTests");
  
  function run(src, expected)
  {
    var ast = new SchemeParser().parse(src)[0];
    var lat = new CpLattice();
    var cesk = schemeCesk({a:concreteAg, p: new CpLattice()});
    var result = new Pushdown().analyze(ast, cesk);
    var actual = result.stepFwOver(result.initial).map(function (q) {return q.value}).reduce(Lattice.join, BOT);
    assertEquals(cesk.l.abst1(expected), actual);    
  }

  module.test1 =
    function ()
    {
      run("42", 42);
      run("#t", true);
      run("#f", false);
    }
        
  module.test2 =
    function ()
    {
      run("(begin 41 42)", 42);
    }
            
  module.test3 =
    function ()
    {
      run("(begin (define a 1) a)", 1);
      run("(begin (define a 2) (+ a a))", 4);
      run("(begin (define a 2) (define b 3) (* a b))", 6);
      run("(begin (define a 3) (define b 4) (define c 5) (- a b c))", -6);
//      run("var a = 4; a = 5; a;", 5); SET!
    };
    
  module.test4 =
    function ()
    {
      run("(begin (define pi (lambda () 3)) (pi) (pi))", 3); 
      // repeat test with (define (pi) 3)
    };
    
  module.test5 =
    function ()
    {
      run("(begin (define sq (lambda (x) (* x x))) (sq 5))", 25);
      // repeat test with (define (sq x) ...)
      run("(begin (define sq (lambda (x) (* x x))) (sq 5) (sq 6))", 36);
    };

//  module.test15 =
//    function ()
//    {
//      runStr("var z = false; var writez = function () { z = 123; }; var readz = function() { return z; }; [writez(), readz()];", "[undefined,123]");
//    };
//
//  module.test16 =
//    function ()
//    {
//      run("var f = function (x) { return function (y) { return x + y; }; }; f(1)(2);", 3);
//    };
//    
//  module.test17a =
//    function ()
//    {
//      var arrayStr = "[0 === 0, 0 !== 0, 1 === 0, 1 !== 0]";
//      var expected = String(eval(arrayStr));
//      runStr(arrayStr, expected);
//    };    
//    
//  module.test17b =
//    function ()
//    {
//      var arrayStr = "[3<4,3<=4,3>4,3>=4,3<3,3<=3,3>3,3>=3,4<3,4<=3,4>3,4>=3]";
//      var expected = String(eval(arrayStr));
//      runStr(arrayStr, expected);
//    };    
//    
//  module.test18a =
//    function ()
//    {
//      run("var f = function() { if (0 === 0) { return 'true'; } else { return 'false' }}; f();", "true");
//      run("var f = function() { if (0 !== 0) { return 'true'; } else { return 'false' }}; f();", "false");
//      run("var f = function() { if (0 === 0) { if (0 === 1) { return 'true1';} else { return 'false1';}} else { return 'false';}}; f();", "false1");
//      run("var f = function() { if (0 === 0) { return 'true'; } return 'false'}; f();", "true");
//      run("var f = function() { if (0 !== 0) { return 'true'; } return 'false'}; f();", "false");
//    };
//    
//  module.test19a =
//    function ()
//    {
//      run("var count = function (n) {if (n===0) {return 'done';} else {return count(n-1);}}; count(20);", "done");
//    };
//    
//    
//  module.test22a =
//    function ()
//    {
//      runStr("[1,2,3].concat([4,5]);", "[1,2,3,4,5]");
//    };  
//    
//  module.test22b =
//    function ()
//    {
//      runStr("function f() { return [1,2] }; f().concat([3,4,5]);", "[1,2,3,4,5]");
//    };  
//    
//
//  module.test23 =
//    function ()
//    {
//      runStr("var appender=function (h, a, b) {return h(a).concat(h(b))}; var lister=function (g) {return function (x) { return [g(x)]; };}; var square=function (y) { return y*y;}; appender(lister(square), 42, 43);", "[1764,1849]");
//    };  
//
//    
//  module.test24 =
//    function ()
//    {
//      runStr("var z = []; var appender=function (h, a, b) {return h(a).concat(h(b));}; var lister=function (g) {return function (x) { return [g(x)]; };}; var conser=function (y) { z = [y, z]; return z;}; appender(lister(conser), 42, 43);", "[[42,[]],[43,[42,[]]]]");
//    };  
//    
//
//  module.test25 =
//    function ()
//    {
//      run("var z=0; var f=function () {z=z+1;}; f(); f(); f(); f(); z;", 4);
//      run("var z=0; var f=function (i) { if (i<4) {z=z+1;f(i+1);}}; f(0); z;", 4);
//    }
//    
//  module.test27a =
//    function ()
//    {
//      run("var z=0; var s=0; var f=function (i) {if (z === 7) {s=s+1} if (i<10) {z=z+1;f(i+1);}}; f(0); s;", 1);
//      run("var z=0; var c=false; var f=function (i) {if (z === 7) {c=true} if (i<10) {z=z+1;f(i+1);}}; f(0); c;", true);
//      run("var z=0; var c=false; var f=function (i) {if (z === 7) {c=true} if (i<10) {z=z+1;f(i+1);}}; f(0); z;", 10);
//    };
//    
//  module.test28 =
//    function ()
//    {
//      runStr("var o = {}; o;", "{}");
//      runStr("var o = {x:3,y:4}; o;", "{y:4,x:3}"); // TODO: order follows environments (cons)
//      run("var o = {x:3,y:4}; o.y;", 4);
//      run("var o = {square:function (x) {return x*x;}}; o.square(4);", 16);
//      run("var o = {x:3}; o.x=4; o.x;", 4);
//      run("var o = {x:3}; o.x=4; o.x=5; o.x;", 5);
//      run("var o = {x:3}; var p = {y:o}; p.y.x;", 3);
//      run("var o = {x:3}; var p = o; p.x;", 3);
//    };
//    
//  module.test36 =
//    function ()
//    {
//      runStr("var o={z:[]}; var appender=function (h, a, b) {return h(a).concat(h(b))}; var lister=function (g) {return function (x) { return [g(x)]; };}; var conser=function (y) { o.z = [y, o.z]; return o.z;}; appender(lister(conser), 42, 43);", "[[42,[]],[43,[42,[]]]]");
//    }  
//    
//  module.test37 =
//    function ()
//    {
//      run("var x=0; var o = {x:3, f:function() {return x;}}; o.f();", 0);
//    }
//    
//    
//  module.test38 =
//    function ()
//    {
//      run("function sq(x) {return x*x;}; sq(5); sq(6);", 36);
//    }  
//    
//  module.test39 =
//    function ()
//    {
//      run("function C() { this.x = 42; } var o = new C(); o.x;", 42);
//      run("function C(xx) { this.x = xx; } var o = new C(43); o.x;", 43);
//      run("function C(xx) { this.x = xx; } var o = new C(43); var oo = new C(42); oo.x + o.x;", 85);
//      run("function C(xx) { this.x = xx; } var o = new C(43); var oo = new C(42); o.x = oo.x; o.x;", 42);
//    }  
//
//  module.test43a = // http://jsperf.com/access-object-properties-via-closure-vs-this/2
//    function ()
//    {
//      run("function C(n) {var nn=n; this.f=function () {nn=nn+1;return nn;}}; var o=new C(3); o.f(); o.f(); o.f();", 6);
//      run("function C(n) {this.nn=n; this.f=function () {this.nn=this.nn+1;return this.nn;}}; var o=new C(30); o.f(); o.f(); o.f();", 33);
//      run("function C(n) {var self=this; self.nn=n; self.f=function () {self.nn=self.nn+1;return this.nn;}}; var o=new C(300); o.f(); o.f(); o.f();", 303);
//    };  
//
//  module.test44a =
//    function ()
//    {
//      run("var n = 123;function HotDog(){this.n = 456;this.getN = function () { return n; };}; var myHotDog = new HotDog(); myHotDog.getN();", 123);
//      run("var n = 123;function HotDog(){this.n = 456;this.getN = function () { return this.n; };}; var myHotDog = new HotDog(); myHotDog.getN();", 456);
//      run("var n = 123;function HotDog(){this.n = 456;this.getN = function () { return this.n; };}; var myHotDog = new HotDog(); var x = myHotDog.getN;x();", 123);
//    }  
//    
//  module.test45a =
//    function ()
//    {
//      run("var o={f:function() { return this;}}; o.f() === o;", true);
//      run("var o={f:function() { return this;}}; ((function() {return o;})()).f() === o;", true);
//      run("var o={f:function() { return this;}}; var x = o.f; x() === this;", true);
//    };  
//
//  module.test46x =
//    function ()
//    {
//      run("var H = function () {this.f=function () {this.getN=function () {return 999;}}};var m=new H(); var m2=new m.f(); m2.getN();", 999);
//      run("var n=123;function H() {this.n=456;this.f=function () {this.n=789;this.getN=function () {return this.n;}}};var m=new H();var m2=new m.f();m2.getN();", 789);
//      run("var n=123;function H(){this.n=456;this.f=function () {this.n=789;this.getN=function () {return this.n;}};this.m=new this.f();this.x=this.m.getN;this.nn=this.x()};var m2=new H();m2.nn;", 456);
//    };  
//
//  module.test47a =
//    function ()
//    {
//      run("var Foo = {}; Foo.method = function() { function test() { return this; }; return test();}; this === Foo.method();", true);
//      run("var Foo = {}; Foo.method = function() { var that=this; function test() { return that; }; return test();}; this === Foo.method();", false);
//      run("var Foo = {}; Foo.method = function() { var that=this; function test() { return that; }; return test() === this;}; Foo.method();", true);
//    }  
//
//  module.test48a =
//    function ()
//    {
//      run("function C() { var x=3; this.y=4; }; var o = new C(); o.x;", undefined);
//      run("function C() { var x=3; this.y=4; this.f=function() { return x + this.y}}; var o = new C(); o.f();", 7);
//    };  
//
//  module.test48c =
//    function ()
//    {
//      try
//      {
//        run("function C() { var x=3; this.y=4; this.f=function() { return x + y}}; var o = new C(); o.f();", undefined);
//      }
//      catch (e)
//      {
//        assertTrue(e.toString().startsWith("Error: ReferenceError")); // TODO not stable
//        return;
//      }
//      assertTrue(false); // fail
//    };  
//
//  module.test48d =
//    function ()
//    {
//      run("function C() { var x=3; this.y=4; this.f=function() { return this.x}}; var o = new C(); o.f();", undefined);
//    };  
//
//  module.test49 =
//    function ()
//    {
//      run("var o={}; var i=5; o[0]=1;o[2*3]=2; o[i+1]+o[0];", 3);
//      run("var o={}; var i=5; function f1() {o[0]=1}; function f2() {return o[2*3]=2}; f1(); f2();", 2);
//      run("var o=[]; var i=5; function f1() {o[0]=1}; function f2() {return o[2*3]=2}; f1(); f2();", 2);
//    };
//    
//  module.test52a =
//    function ()
//    {
//      runStr("var Circle=function (radius) {this.radius = radius;}; Circle.prototype;", "{constructor:<[Function] [prototype]>}");
//      runStr("function Circle(radius) {this.radius = radius;}; Circle.prototype;", "{constructor:<[Function] [prototype]>}");
//      run("function Circle(radius) {this.radius = radius;}; Circle.prototype.y=123;Circle.prototype.y;", 123);
//      run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.y=123;Circle.prototype.y;", 123);
//      run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1); x.n;", 123);
//      run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1);var y=new Circle(2);", 123);
//      run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1);var y=new Circle(2);x.radius+y.radius;", 3);
//      run("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.n=123;var x=new Circle(1);x.n;", 123);
//      runStr("var Circle=function (radius) {this.radius = radius;}; Circle.prototype.area=function () { return 3*this.radius*this.radius;}; var x=new Circle(3), y=new Circle(4); [x.area(), y.area()];", "[27,48]");
//      run("var Circle=function (radius) {return function() {return radius}}; var x=new Circle(432);x();", 432);
//    } 
//
//  module.test58a =
//    function ()
//    {
//      run("var z = 0; z++;", 0);
//      run("var z = 0; ++z;", 1);
//      run("var z = 0; z++; z;", 1);
//      run("var z = 0; ++z; z;", 1);
//      run("var z = 3; z++ + z;", 7);
//      run("var z = 3; ++z + z;", 8);
//    } 
//
//
//  module.test59a =
//    function ()
//    {
//      run("var o = {x:3}; o.x++;", 3);
//      run("var o = {x:3}; ++o.x;", 4);
//      run("var o = {x:3}; o.x++; o.x;", 4);
//      run("var o = {x:3}; ++o.x; o.x;", 4);
//      run("var o = {x:3}; o.x++ + o.x;", 7);
//      run("var o = {x:3}; ++o.x + o.x;", 8);
//    }
//
//  module.test60a =
//    function ()
//    {
//      run("var o={x:3}; var f=function() {return o}; f()['x']++ + o.x;", 7);
//      run("var o={x:3}; var f=function() {return o}; ++f()['x'] + o.x;", 8);
//    } 
//
//  module.test61a =
//    function ()
//    {
//      run("for (var i=0; i<3; i++) i;", 2);
//      run("for (var i=0; i<3; i++) i; i;", 3);
//      run("for (var i=0; false; i++) 123; i;", 0);
//      run("for (var i=0; false; i++) 123;", undefined);
//    } 
//
//  module.test65 =
//    function ()
//    {
//      runStr("var ar = []; for (var i = 0; i < 10; i++) {ar[i] = i;}; ar;", "[0,1,2,3,4,5,6,7,8,9]");
//    } 
//
//  module.test66 =
//    function ()
//    {
//      run("function Xyz(n) { this.n = n }; var p = Xyz; p(123); n;", 123);
//    }
//
//  module.test67 =
//    function ()
//    {
//      run("Object.prototype === Function.prototype", false);
//      run("Function.prototype === String.prototype", false);
//      run("String.prototype === Object.prototype", false);
//      run("Array.prototype === Function.prototype", false);
//      run("Array.prototype === String.prototype", false);
//      run("Array.prototype === Object.prototype", false);
//    }
//
//  module.test68 =
//    function ()
//    {
//      run("var o = new Object(); Object.prototype.a = 123; o.a;", 123);
//    }
//
//  module.test69 =
//    function ()
//    {
//      var src = read("test/resources/tajs2009.js");
//      run(src, "jens");
//    }
//
//  module.test70a =
//    function ()
//    {
//      run("[].xyz;", undefined);
//      run("({}).xyz;", undefined);
//      run("(function () {}).xyz;", undefined);
//    }
//
//  module.test71a =
//    function ()
//    {
//      runStr("var x = []; x.push(1); x;", "[1]");
//      run("var x = []; x.push(1); x.length;", 1);
//    }
//
//  module.test72 =
//    function ()
//    {
//      run("var x;", undefined);
//    }
//
//  module.test73a =
//    function ()
//    {
//      run("var b = 3; if (b) 1; else 2;", 1);
//      run("var b; if (b) 1; else 2;", 2);
//      run("var b = 0; if (b) 1; else 2;", 2);
//      run("var b = null; if (b) 1; else 2;", 2);
//      run("var b = NaN; if (b) 1; else 2;", 2);
//      run("var b = ''; if (b) 1; else 2;", 2);
//      run("var b = 'gvd'; if (b) 1; else 2;", 1);
//    }
//
//  module.test74 =
//    function ()
//    {
//      run("var b = -23; b;", -23);
//    }
//
//  module.test75a =
//    function ()
//    {
//      run("try { throw 42 } catch (e) { 43 }", 43);
//      run("try { throw 42 } catch (e) { e }", 42);
//      run("try { 123 } catch (e) { e }", 123);
//    }
//
//  module.test76a =
//    function ()
//    {
//      run("(new Array()).length", 0);
//      run("var a = new Array(10); a.length", 10);
//      run("var a = new Array(10); a[3] = 3; a.length", 10);
//    }
//
//  module.test77 =
//    function ()
//    {
//      var arrayStr = "[0 || 1, 1 || 0, 0 && 1, 1 && 0, true || false, false || true, true && false, false && true]";
//      var expected = String(eval(arrayStr));
//      runStr(arrayStr, expected);
//    }
//
//  module.test78a =
//    function ()
//    {
//      run("var a = 0; for (var i = 0; i < 10; i++); a = 1; a;", 1);
//      run("var i = 0; for (; i < 3; i++) {i}", 2);
//    }
//
//  module.test79a =
//    function ()
//    {
//      var src = read("test/resources/loopy1.js");
//      run(src, true);
//    }
//
//  module.test79b =
//    function ()
//    {
//      var src = read("test/resources/loopy2.js");
//      run(src, true);
//    }
//
//  module.test80 =
//    function ()
//    {
//      var src = read("test/resources/nssetup.js");
//      run(src, true);
//    }
//
//  module.test81a =
//    function ()
//    {
//      var arrayStr = "var x = {x:1, valueOf: function () { return 3 }, toString: function () { return '3'}}; var y = {y:1, valueOf: function () { return 4 }}; var z = {y:1, toString: function () { return '5' }}; " + 
//        "[undefined==undefined,null==null,NaN==3,4==NaN,NaN==NaN,3==3,+0==-0,-0==+0,3==4,3==3.0,3==3.01," +
//        "'abc'=='abc',''=='','abc'=='ab',true==true,false==false,true==false,false==true," +
//        "x==x,x==y,null==undefined,undefined==null,3=='3','3'==3,3=='4','4'==3," +
//        "true==0,true==1,false==0,false==1,0==true,0==false,1==true,1==false," + 
//        "x==3,x==4,y==3,y==4,z==4,z==5,3==x,4==x,3==y,4==y,4==z,5==z,x==null,y==undefined,z==NaN,null==z,undefined==y,NaN==x," +
//        "x==x,x==y]";
//      var expected = String(eval(arrayStr));
//      runStr(arrayStr, expected);
//    }
//
//  module.test81b =
//    function ()
//    {
//      var arrayStr = "var x = {x:1, valueOf: function () { return 3 }, toString: function () { return '3'}}; var y = {y:1, valueOf: function () { return 4 }}; var z = {y:1, toString: function () { return '5' }}; " + 
//        "[undefined!=undefined,null!=null,NaN!=3,4!=NaN,NaN!=NaN,3!=3,+0!=-0,-0!=+0,3!=4,3!=3.0,3!=3.01," +
//        "'abc'!='abc',''!='','abc'!='ab',true!=true,false!=false,true!=false,false!=true," +
//        "x!=x,x!=y,null!=undefined,undefined!=null,3!='3','3'!=3,3!='4','4'!=3," +
//        "true!=0,true!=1,false!=0,false!=1,0!=true,0!=false,1!=true,1!=false," + 
//        "x!=3,x!=4,y!=3,y!=4,z!=4,z!=5,3!=x,4!=x,3!=y,4!=y,4!=z,5!=z,x!=null,y!=undefined,z!=NaN,null!=z,undefined!=y,NaN!=x," +
//        "x!=x,x!=y]";
//      var expected = String(eval(arrayStr));
//      runStr(arrayStr, expected);
//    }
//
//  module.test81c =
//    function ()
//    {
//      var arrayStr = "var x = {x:1, valueOf: function () { return 3 }, toString: function () { return '3'}}; var y = {y:1, valueOf: function () { return 4 }}; var z = {y:1, toString: function () { return '5' }}; " + 
//        "[undefined===undefined,null===null,NaN===3,4===NaN,NaN===NaN,3===3,+0===-0,-0===+0,3===4,3===3.0,3===3.01," +
//        "'abc'==='abc',''==='','abc'==='ab',true===true,false===false,true===false,false===true," +
//        "x===x,x===y,null===undefined,undefined===null,3==='3','3'===3,3==='4','4'===3," +
//        "true===0,true===1,false===0,false===1,0===true,0===false,1===true,1===false," + 
//        "x===3,x===4,y===3,y===4,z===4,z===5,3===x,4===x,3===y,4===y,4===z,5===z,x===null,y===undefined,z===NaN,null===z,undefined===y,NaN===x," +
//        "x===x,x===y]";
//      var expected = String(eval(arrayStr));
//      runStr(arrayStr, expected);
//    }
//
//  module.test81d =
//    function ()
//    {
//      var arrayStr = "var x = {x:1, valueOf: function () { return 3 }, toString: function () { return '3'}}; var y = {y:1, valueOf: function () { return 4 }}; var z = {y:1, toString: function () { return '5' }}; " + 
//      "[undefined!==undefined,null!==null,NaN!==3,4!==NaN,NaN!==NaN,3!==3,+0!==-0,-0!==+0,3!==4,3!==3.0,3!==3.01," +
//      "'abc'!=='abc',''!=='','abc'!=='ab',true!==true,false!==false,true!==false,false!==true," +
//      "x!==x,x!==y,null!==undefined,undefined!==null,3!=='3','3'!==3,3!=='4','4'!==3," +
//      "true!==0,true!==1,false!==0,false!==1,0!==true,0!==false,1!==true,1!==false," + 
//      "x!==3,x!==4,y!==3,y!==4,z!==4,z!==5,3!==x,4!==x,3!==y,4!==y,4!==z,5!==z,x!==null,y!==undefined,z!==NaN,null!==z,undefined!==y,NaN!==x," +
//      "x!==x,x!==y]";
//      var expected = String(eval(arrayStr));
//      runStr(arrayStr, expected);
//    }
//
//  module.test81e =
//    function ()
//    {
//      var arrayStr = "var x = {x:1, valueOf: function () { return 3 }, toString: function () { return '3'}}; var y = {y:1, valueOf: function () { return 4 }}; var z = {y:1, toString: function () { return '5' }}; " + 
//      "[undefined+undefined,null+null,NaN+3,4+NaN,NaN+NaN,3+3,+0+-0,-0+(+0),3+4,3+3.0,3+3.01," +
//      "'abc'+'abc',''+'','abc'+'ab',true+true,false+false,true+false,false+true," +
//      "null+undefined,undefined+null,3+'3','3'+3,3+'4','4'+3," +
//      "true+0,true+1,false+0,false+1,0+true,0+false,1+true,1+false," + 
//      "x+3,x+4,y+3,y+4,z+4,z+5,3+x,4+x,3+y,4+y,4+z,5+z,x+null,y+undefined,z+NaN,null+z,undefined+y,NaN+x," +
//      "x+x,x+y,x+z,y+x,z+x,y+z,z+y]";
//      var expected = String(eval(arrayStr));
//      runStr(arrayStr, expected);
//    }
//
//  module.test82a =
//    function ()
//    {
//      run("function F() { }; F.prototype.constructor === F", true);
//      run("function F(x) { this.x = x }; var f = new F(123); f.constructor === F.prototype.constructor", true);
//    }
//  
//  module.test82b =
//    function ()
//    {
//      run("Object.getPrototypeOf(Object.prototype)", null);
//      run("function F() {}; var f = new F(); Object.getPrototypeOf(f) === F.prototype", true);
//    }
//
//  module.test82c =
//    function ()
//    {
//      run("Object.prototype.constructor === Object", true);
//      run("Function.prototype.constructor === Function", true);
//      run("Array.prototype.constructor === Array", true);
//    }
//
//  module.test82d =
//    function ()
//    {
//      run("var o = {}; var oo = Object.create(o); Object.getPrototypeOf(oo) === o;", true);
//      run("function S() {}; S.prototype.x = 123; function F() {};  F.prototype = Object.create(S.prototype); var f = new F(); f.x", 123);
//    }
//
//  module.test83 =
//    function ()
//    {
//      run("var o = {}; o.constructor === Object", true);
//    }
//
//  module.test84a =
//    function ()
//    {
//      run("switch (123) {}", undefined);
//      run("switch (1) {case 1: 999}", 999);
//      run("switch (1) {case 0: 888; case 1: 999}", 999);
//      run("switch (1) {case 0: 888; case 1: 999; case 2: 666}", 666);
//      run("switch (1) {default: 999}", 999);
//      run("switch (1) {case 0: 888; default: 999}", 999);
//      run("switch (1) {case 0: 888; default: 999; case 2: 666}", 666);
//    }
//
//  module.test85a =
//    function ()
//    {
//      run("switch (1) {case 1: 999; break;}", 999);
//      run("switch (1) {case 1: 999; case 2: break;}", 999);
//      run("switch (1) {case 1: 999; case 2: break; default: 666}", 999);
//      run("switch (1) {case 0: 888; default: 999; break; case 1: 666;}", 666);
//    }
//
//  module.test86a =
//    function ()
//    {
//      run("function f() {switch(1) {case 1: return 999 }}; f();", 999);
//      run("function f() {switch(1) {case 0: return 888; case 1: return 999 }}; f();", 999);
//    }
//
//  module.test87a =
//    function ()
//    {
//      run("{999}", 999);
//      run("{42; 43;}", 43);
//      run("ll:{42; break ll; 43;}", 42);
//    }
//
//  module.test88a =
//    function ()
//    {
//      run("function f(){return a;function a(){return 1};var a=4;function a(){return 2;}}; f()();", 2);
//      run("function f(){return a;var a=4;function a(){return 1};function a(){return 2;}}; f()();", 2);
//      run("function f(){var a=4;function a(){return 1};function a(){return 2;};return a;}; f();", 4);
//      run("var foo = 1; function bar() { if (!foo) { var foo = 10; } return foo;} bar();", 10);
//      run("var a = 1; function b() { a = 10; return; function a() {}}; b(); a;", 1);
//    }
//  
//  module.test89 =
//    function ()
//    { 
//      run("[].map(function () {}).length", 0);
//      run("[3].map(function (x) {return x*x}).length", 1);
//      run("[3].map(function (x) {return x*x})[0]", 9);
//      run("[3,4].map(function (x) {return x*x}).length", 2);
//      run("[3,4].map(function (x) {return x*x}).length", 2);
//      run("[3,4].map(function (x) {return x*x})[1]", 16);
//      run("var arr=new Array(10); arr.map(function () {return 123}).length", 10);
//      run("var arr=new Array(3); arr.map(function () {return 123})[1]", undefined);
//      run("var x=1; function f() { var x=2; return [9,9,9].map(function () {return this.x})}; f()[0];", 1);
//      run("var x=1; function f() { var x=2; return [9,9,9].map(function () {return this.x}, {x:3})}; f()[0];", 3);
//      run("var ar=[1,2,3].map(function (x) { return x*x*x }); ar[1]", 8);
//      runStr("var arr = [1,2,3,4,5,6,7,8,9,10]; function f(x,y) {return x+y}; arr.map(f)", "[1,3,5,7,9,11,13,15,17,19]");
//    }
//  
//  module.test90 =
//    function ()
//    { 
//      runExc("[].reduce(function () {})");
//      run("[].reduce(function () {}, 123)", 123);
//      run("[3].reduce(function (x,y) {return x+y})", 3);
//      run("[3].reduce(function (x,y) {return x+y}, 4)", 7);
//      run("[3,4].reduce(function (x,y) {return x+y})", 7);
//      run("[3,4].reduce(function (x,y) {return x+y}, 5)", 12);
//    }
//
//  module.test91 =
//    function ()
//    { 
//      run("function Circle(x,y,r){this.x=x;this.y=y;this.r=r};function area(s){return 3*s.r*s.r};var circles=[[10,100,4],[-10,-10,3],[0,50,5]].map(function (xyr){return new Circle(xyr[0], xyr[1], xyr[2])});var totalArea = circles.map(area).reduce(function (x,y) {return x+y});totalArea",150);
//    }
//  
//  module.test92 =
//    function ()
//    {
//      run("[].filter(function() {return true}).length", 0);
//      run("[].filter(function() {return false}).length", 0);
//      runStr("[1,2,3].filter(function() {return true})", "[1,2,3]");
//      run("[1,2,3].filter(function() {return false}).length", 0);
//      runStr("[1,2,3,4,5].filter(function(arg) {return arg%2})", "[1,3,5]");
//    }
//  
//  module.test93 =
//    function ()
//    {
//      run(read("test/resources/books.js"), 2);
//    }
//  
////  module.test94 =
////    function ()
////    {
////      run("for (var i = 0; i < 2000; i++) { 123 }", 123); // bug: throws JS stack overflow
////      run("var a = [1,2,3]; for (var i = 0; i < 900; i++) { a[2] = 123 }", 123); // bug: throws JS stack overflow
////    }
//  
//  module.test95 =
//    function ()
//    {
//      run("String()", "");
//      run("String('123')", "123");
//      run("String(456)", "456");
//      run("String(true)", "true");
//    }
//  
//  module.test96 =
//    function ()
//    {
//      run("new String().length", 0);
//      run("new String('').length", 0);
//      run("new String('123').length", 3);
//      run("String().length", 0);
//      run("''.length", 0);
//      run("'123'.length", 3);
//    }
//  
  
//    module.testChurchNums =
//      function ()
//      {
//        run(read("test/resources/churchNums.js"), true);    
//      }
    
    module.testGcIpd =
      function ()
      {
        run(read("test/resources/gcIpdExample.scm"), 36);    
      }
    
//    module.testRotate = TOO SLOW
//      function ()
//      {
//        run(read("test/resources/rotate.scm"), "hallo");    
//      }
    
    module.testFib =
      function ()
      {
        run("(begin (define fib (lambda (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2)))))) (fib 4))", 3);
      }
    
    module.testFac =
      function ()
      {
        run("(begin (define f (lambda (n) (if (= n 0) 1 (* n (f (- n 1)))))) (f 10))", 3628800);
      }
    
    module.test101 =
      function ()
      {
        run("(begin (define g (lambda () 1)) (define f (lambda (n) (if (= n 0) 0 (+ (f (- n 1)) (g))))) (f 10))", 10);
      }
    
        
  return module;
  
})()
