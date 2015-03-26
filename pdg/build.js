"use strict";

load("../lib/esprima.js");

var console = {log:print}

Array.prototype.toString =
  function ()
  {
    if (this.length === 0)
    {
      return "[]";
    }
    var s = "[";
    for (var i = 0; i < this.length - 1; i++)
    {
      s += this[i] + ","; 
    }
    s += this[i] + "]";
    return s;   
  }

function b()
{
  load("../common.js");
  load("../countingStore.js");
  load("../agc.js");
  load("../lattice.js");
  load("../abstLattice1-2.js");
  load("../concLattice.js");
  load("../ast.js");
  load("../jsCesk.js");
  load("../tagAg.js");
  load("../concreteAg.js");
  load("../benv.js");
  load("../object.js");
  load("../test.js");

  load("pdg.js");
  
  //load("test/TODOTests.js")
}

b();