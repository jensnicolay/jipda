function repl(cc)
{
  cc = cc || {};
  var name = cc.name || "jipda";
  var cesk = jsCesk({a:cc.a || tagAg, p:cc.p || new Lattice1()});
  var src = "'I am Jipda!'";
  var store = cesk.store;
  while (src !== ":q")
  {
    var ast = Ast.createAst(src);
    var state = Pushdown.inject(ast, cesk, {store:store});
    try
    {
      var dsg = Pushdown.run(state);
      var resultStates = dsg.ecg.successors(state);
      resultStates.forEach(function (haltState) {print(haltState.value)});
      store = resultStates.map(function (haltState) {return haltState.store}).reduce(Lattice.join, BOT);
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

function concRepl()
{
  return repl({name: "conc", p:new CpLattice(), a:concreteAg});
}
