

//function repl(config)
//{
//  config = config || {};
//  var name = config.name || "jipda";
//  var c = Jipda.context(config);
//  var src = "'I am Jipda!'";
//  var store = c.store;
//  c.e.haltKont = // TODO not a good idea: overwrites jseval
//    function (hvalue, hstore)
//    {
//      print(hvalue);
//      newStore = newStore.join(hstore);
//      return [];
//    }
//  while (src !== ":q")
//  {
//    var ast = Ast.createAst(src);
//    var state = Jipda.inject(ast, c, {store:store});
//    var previousStore = store;
//    var newStore = BOT;
//    try
//    {
//      Jipda.run(state);
//      store = newStore;
//    }
//    catch (e)
//    {
//      print(e.stack);
//    }
//    write(name + "> ");
//    src = readline();
//  }
//  print("Bye!");
//}
//
//function concRepl(config)
//{
//  config = config || {};
//  return repl({name: "conc", p:new CpLattice(), a:concreteAg, k:config.k});
//}
