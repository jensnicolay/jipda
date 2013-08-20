function repl(cc)
{
  cc = cc || {};
  var name = cc.name || "jipda";
  var cesk = jsCesk({a:cc.a || tagAg, p:cc.p || new Lattice1()});
  var src = "'I am Jipda!'";
  var store = cesk.store;
  var newStore;
  var applyHalt =
    function (value, store)
    {
      print(value);
      newStore = newStore.join(store);
      return [];
    }
  while (src !== ":q")
  {
    var ast = Ast.createAst(src);
    var state = Pushdown.inject(ast, cesk, applyHalt, {store:store});
    try
    {
      newStore = BOT;
      Pushdown.run(state);
      store = newStore;
    }
    catch (e)
    {
      print(e.stack);
    }
    write(name + "> ");
    src = readline();
  }
  print("Bye!");
}

function concRepl(config)
{
  config = config || {};
  return repl({name: "conc", p:new CpLattice(), a:concreteAg});
}
