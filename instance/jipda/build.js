load("../../lib/esprima.js");

var console = {log:print}

function b()
{
  load("../../common.js");
  load("../../store/store.js");
  load("../../agc.js");
  load("../../test.js");
  load("../../lattice/lattice.js");
  load("../../lattice/lattice1.js");
  load("../../lattice/setLattice.js");
  load("../../lattice/cpLattice.js");
  load("../../address/address.js");
  load("../../address/tagAg.js");
  load("../../address/concreteAg.js");
  load("../../driver/graph.js");
  load("../../driver/pushdown.js");
  load("../../ast/jsEsprima.js");
  load("../../cesk/cesk.js");
  load("../../cesk/jsCesk.js");
  load("../../analysis/analysis.js");
  load("defaultBenv.js");
  load("jipda.js");
  
//  load("test/astTests.js");
//  load("test/benvTests.js");
  load("test/concreteTests.js");
  load("test/jipdaTests.js");
//  load("test/dependenceTests.js");  
//  load("test/coverageTests.js");
//  load("test/latticeTests.js");  
}

b();