var suiteBenvTests = new TestSuite("benvTests");

//suiteBenvTests.test1 =
//  function ()
//  {
//    var lat = new LatN(3);
//    var benvFactory = new DefaultBenv();
//    var benv = benvFactory.createObject(lat.abst1(null));
//    benv = benv.add(lat.abst([1]), 1);
//    assertEquals("[{1}]", benv.names());
//    assertEquals("[1]", benv.lookup(lat.abst([1])).addresses);
//    assertTrue(benv.lookup(lat.abst([1])).directMatch);
//    assertEquals("[]", benv.lookup(lat.abst([3])).addresses);
//    assertFalse(benv.lookup(lat.abst([3])).directMatch);
//  };
//  
//suiteBenvTests.test2 =
//  function ()
//  {
//    var lat = new LatN(3);
//    var benvFactory = new DefaultBenv();
//    var benv = benvFactory.createObject(lat.abst1(null));
//    benv = benv.add(lat.abst([1]), 1);
//    benv = benv.add(lat.abst([2]), 2);
//    assertEquals("[{2},{1}]", benv.names());
//    assertEquals("[1]", benv.lookup(lat.abst([1])).addresses);
//    assertTrue(benv.lookup(lat.abst([1])).directMatch);
//    assertEquals("[2]", benv.lookup(lat.abst([2])).addresses);
//    assertTrue(benv.lookup(lat.abst([2])).directMatch);
//    assertEquals("[]", benv.lookup(lat.abst([3])).addresses);
//    assertFalse(benv.lookup(lat.abst([3])).directMatch);
//  };
//  
//suiteBenvTests.test3 =
//  function ()
//  {
//    var lat = new LatN(3);
//    var benvFactory = new DefaultBenv();
//    var benv = benvFactory.createObject(lat.abst1(null));
//    benv = benv.add(lat.abst([1]), 1);
//    benv = benv.add(lat.abst([1,2]), 2);
//    assertEquals("[{1,2}]", benv.names());
//    assertEquals("[2,1]", benv.lookup(lat.abst([1])).addresses);
//    assertFalse(benv.lookup(lat.abst([1])).directMatch);
//    assertEquals("[2,1]", benv.lookup(lat.abst([2])).addresses);
//    assertFalse(benv.lookup(lat.abst([2])).directMatch);
//    assertEquals("[2,1]", benv.lookup(lat.abst([2,1])).addresses);
//    assertTrue(benv.lookup(lat.abst([2,1])).directMatch);
//    assertEquals("[]", benv.lookup(lat.abst([3])).addresses);
//    assertFalse(benv.lookup(lat.abst([3])).directMatch);
//  };
//        
//suiteBenvTests.test4 =
//  function ()
//  {
//    var lat = new LatN(3);
//    var benvFactory = new DefaultBenv();
//    var benv = benvFactory.createObject(lat.abst1(null));
//    benv = benv.add(lat.abst([1,2,3]), 3);
//    benv = benv.add(lat.abst([1,2,4]), 4);
//    benv = benv.add(lat.abst([1,2]), 2);
//    assertEquals("[{1,2,4},{1,2,3}]", benv.names());
//    assertEquals("[2,4,3]", benv.lookup(lat.abst([1])).addresses);
//    assertFalse(benv.lookup(lat.abst([1])).directMatch);
//    assertEquals("[2,4,3]", benv.lookup(lat.abst([2])).addresses);
//    assertFalse(benv.lookup(lat.abst([2])).directMatch);
//    assertEquals("[2,3]", benv.lookup(lat.abst([2,3])).addresses);
//    assertFalse(benv.lookup(lat.abst([2,3])).directMatch);
//    assertEquals("[2,4]", benv.lookup(lat.abst([1,2,4])).addresses);
//    assertTrue(benv.lookup(lat.abst([1,2,4])).directMatch);
//    assertEquals("[]", benv.lookup(lat.abst([99])).addresses);
//    assertFalse(benv.lookup(lat.abst([99])).directMatch);
//  };
//          
//suiteBenvTests.test5 =
//  function ()
//  {
//    var lat = new LatN(3);
//    var benvFactory = new DefaultBenv();
//    var b1 = benvFactory.createObject(lat.abst1(null));
//    var b2 = benvFactory.createObject(lat.abst1(null));
//    var n1 = lat.abst(["f"]);
//    var n2 = lat.abst(["f"]);
//    assertEquals(0, n1.compareTo(n2));
//    assertEquals(0, n2.compareTo(n1));
//    b1 = b1.add(n1, 1);
//    b2 = b2.add(n2, 2);
//    var b3 = b1.join(b2);
//    assertEquals("[{f}]", b3.names());
//    assertEquals("[1,2]", b3.lookup(lat.abst(["f"])).addresses);
//  }
//
//suiteBenvTests.test6a =
//  function ()
//  {
//    var lat = new LatN(3);
//    var benvFactory = new DefaultBenv();
//    var benv = benvFactory.createObject(lat.abst1(null));
//    var n1 = lat.abst(["f"]);
//    var n2 = lat.abst(["g"]);
//    benv = benv.add(n1, 1);
//    benv = benv.add(n2, 2);
//    benv = benv.add(n1, 3);    
//    assertEquals("[{g},{f}]", benv.names());
//    assertEquals("[3,1]", benv.lookup(n1).addresses);
//  }
//
//suiteBenvTests.test6b =
//  function ()
//  {
//    var lat = new LatN(3);
//    var benvFactory = new DefaultBenv();
//    var benv = benvFactory.createObject(lat.abst1(null));
//    var n1 = lat.abst(["f"]);
//    var n2 = lat.abst(["g"]);
//    benv = benv.add(n2, 2);
//    benv = benv.add(n1, 1);
//    benv = benv.add(n1, 3);    
//    assertEquals("[{f},{g}]", benv.names());
//    assertEquals("[3,1]", benv.lookup(n1).addresses);
//  }
//
//// join should be "order-preserving", because order matters when comparing benv frames
//// NOT TRUE: but order matters (can matter?) for 'for ... in'
//suiteBenvTests.test7 =
//  function ()
//  {
//    var lat = new LatN(1);
//    var benvFactory = new DefaultBenv();
//    var b1 = benvFactory.createObject(lat.abst1(null));
//    var b2 = benvFactory.createObject(lat.abst1(null));
//    b1.Prototype = BOT;
//    b2.Prototype = BOT;
//    b1 = b1.add(lat.abst([1]), 1);
//    b2 = b2.add(lat.abst([2]), 2);
//    assertEquals("[{1},{2}]", b1.join(b2).names()); // assume names() is ltr
//  }