const fs = require('fs');
const esprima = require('esprima');

eval(String(fs.readFileSync("../common.js")).substring(14));
eval(String(fs.readFileSync("../countingStore.js")).substring(14));
eval(String(fs.readFileSync("../agc.js")).substring(14));
eval(String(fs.readFileSync("../lattice.js")).substring(14));
eval(String(fs.readFileSync("../type-lattice.js")).substring(14));
eval(String(fs.readFileSync("../ast.js")).substring(14));
eval(String(fs.readFileSync("../jsCesk.js")).substring(14));
eval(String(fs.readFileSync("../conc-alloc.js")).substring(14));
eval(String(fs.readFileSync("../conc-kalloc.js")).substring(14));
eval(String(fs.readFileSync("../aac-kalloc.js")).substring(14));
eval(String(fs.readFileSync("../tag-alloc.js")).substring(14));
eval(String(fs.readFileSync("../benv.js")).substring(14));
eval(String(fs.readFileSync("../object.js")).substring(14));

var performance = Date;

var appRouter = function(app) {
  
  app.get("/", function(req, res) {
    
    const ast0src = fs.readFileSync("../prelude.js").toString()
    const typeLattice = new TypeLattice();
    const initialCeskState = computeInitialCeskState(typeLattice, concAlloc, concKalloc, ast0src);
  
    const src = req.query.src;
    
    console.log("parsing:")
    console.log(src);
    
    var start = Date.now();
    const ast = Ast.createAst(src);
    const cesk = jsCesk({a:tagAlloc,  kalloc:aacKalloc, l:typeLattice, errors:true, gc:true});
    const system = cesk.explore(ast, initialCeskState);
  
  
    var time = Date.now() - start;
    //    console.profileEnd(profileName);
    var initial = system.initial;
    result = system.result;
    var contexts = system.contexts;
    console.log("analysis took " + time + " ms");
    var states = system.states;
    console.log(states.length + " states; " + result.size + " results; " + contexts.length + " contexts");
    var result = computeResultValue(system.result);
    var resultValue = result.value;
    console.log("result value " + resultValue);
    if (result.msgs.length > 0)
    {
      console.log(result.msgs.join("\n"));
    }
  
    states.forEach(function (state)
    {
      state.store = null;
      state.kont = null;
      state._successors = state._successors.map(s => s._id);
    })
    
    var json = JSON.stringify(states);
    
    res.send(json);
  });
  
}

module.exports = appRouter;