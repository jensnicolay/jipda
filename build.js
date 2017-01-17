"use strict";

load("lib/esprima.js");
const ast0src = read("prelude.js");

var console = {log:print}

Array.prototype.toString =
  function ()
  {
    if (this.length === 0)
    {
      return "[]";
    }
    var s = "[";
    var i = 0;
    for (; i < this.length - 1; i++)
    {
      s += this[i] + ","; 
    }
    s += this[i] + "]";
    return s;   
  }

  load("common.js");
  load("countingStore.js");
  load("agc.js");
  load("lattice.js");
  load("abstLattice1-3.js");
  load("concLattice.js");
  load("ast.js");
  load("jsGlobals.js");
  load("jsCesk.js");
  load("tagAg.js");
  load("concreteAg.js");
  load("benv.js");
  load("object.js");
  load("jipda.js");
  load("test.js");
  
  //load("test/rjsConcreteTests.js");
  load("test/concreteTests.js");
  load("test/jipdaTests.js");