dsg1 = DsgBuilder.empty().addPush("A",1,"B").addPush("B",2,"C").addPop("C",2,"D").addPop("D",1,"E").addPush("B",3,"F").addPush("F",5,"G").addPop("G",5,"D").addPop("D",3,"B").toDsg("A")
  
dsg2 = DsgBuilder.empty().addPush("A",1,"B").addPush("B",2,"C").addPop("C",2,"D").addPop("D",1,"E").addPush("B",3,"F").addPush("F",5,"G").addPop("G",5,"D").addPop("D",3,"B").addPush("F",4,"H").addPush("H",5,"I").addPop("I",5,"D").addPop("D",4,"F").toDsg("A")
  
dsg3 = DsgBuilder.empty().addPush("A",1,"B").addPush("B",2,"C").addPop("C",2,"D").addPop("D",1,"E").addPush("D",3,"B").addPop("D",3,"F").addUnch("F", "D").toDsg("A");

dsg4 = DsgBuilder.empty().addPush("A",1,"B").addPush("B",2,"C").addPop("C",2,"D").addPop("D",1,"E").addPush("B",3,"B").addPop("D",3,"D").toDsg("A");

dsg5 = DsgBuilder.empty().addPush("A",3,"B").addPush("B",9,"C").addPop("C",9,"D").addPop("D",3,"E").addPush("E",4,"B").addPop("D",4,"F").toDsg("A");

dsg6 = DsgBuilder.empty().addPush("A",5,"B").addPop("B",5,"C").addPush("C",6,"B").addPop("B",6,"D");