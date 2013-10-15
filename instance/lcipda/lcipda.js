function repl(cc)
{
  cc = cc || {};
  var sp = new SchemeParser();
  var name = cc.name || "sipda";
  var cesk = lcCesk({a:cc.a || tagAg, p:cc.p || new Lattice1()});
  var src = "\"I am " + name + "\"";
  var store = cesk.store;
  var driver = new Pushdown();
  while (src !== ":q")
  {
    var ast = sp.parse(src)[0];
    try
    {
      var result = driver.analyze(ast, cesk, {store:store});
      print("(states " + result.etg.nodes().length + " edges " + result.etg.edges().length + ")");
      var resultStates = result.stepFwOver(result.initial);
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
