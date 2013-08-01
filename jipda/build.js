load("../lib/esprima.js");

var console = {log:print}

function b()
{
  load("../common.js");
  load("../store.js");
  load("../ast.js");
  load("../lattice/lattice.js");
  load("../lattice/lattice1.js");
  load("../lattice/setLattice.js");
  load("../lattice/cpLattice.js");
  load("../address/address.js");
  load("../address/tagAg.js");
  load("../address/concreteAg.js");
  load("../benv/defaultBenv.js");
  load("../eval.js");
  load("../test.js");
  load("jipda.js");
  
//  load("test/astTests.js");
//  load("test/benvTests.js");
//  load("test/concreteTests.js");
  load("test/jipdaTests.js");
//  load("test/jsAnalysisTests.js");  
//  load("test/coverageTests.js");
//  load("test/latticeTests.js");  
}

b();