function b()
{
  load("../../common.js");
  load("../../store/store.js");
  load("../../agc.js");
  load("../../test.js");
  load("../../ast/scheme.js");
  load("../../lattice/lattice.js");
  load("../../lattice/lattice1.js");
  load("../../lattice/cpLattice.js");
  load("../../lattice/setLattice.js");
  load("../../address/address.js");
  load("../../driver/graph.js");
  load("../../driver/pushdown2.js");
  load("../../cesk/lc/typeLattice.js");
  load("../../cesk/lc/monoTagAg.js");
  load("../../cesk/lc/1cfaTagAg.js");
  load("../../cesk/lc/concreteAg.js");
  load("../../cesk/lc/lcCesk.js");
  load("../../cesk/lc/benv.js");
  load("lcipda.js");

  load("test/concreteTests.js");
  load("test/lcipdaTests.js");
}

b();