"use strict";

load("../lib/esprima.js");

var console = {log:print};

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
  };

  load("../common.js");
  load("../countingStore.js");
  load("../agc.js");
  load("../lattice.js");
  load("../abstLattice1-2.js");
  load("../concLattice.js");
  load("../ast.js");
  load("../jsCesk.js");
  load("../tag-alloc.js");
  load("../conc-alloc.js");
  load("../benv.js");
  load("../object.js");
  load("../test.js");
  
  load("purityAnalysis.js");
  load("protopurity.js");
  
  load("test/purityTests.js");

// ~/git/v8/v8/out.gn/x64.release/d8 --harmony --max_old_space_size=8192 --shell build.js