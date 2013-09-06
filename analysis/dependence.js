function Dependence(analysis)
{
  this.analysis = analysis;
}


  


//function interproceduralDependencies(etg, ss)
//{
//  return etg.edges().reduce(
//    function (result, edge)
//    {
//      var marks = edge.marks || [];
//      var rws = ArraySet.from(marks.filter(function (mark) {return mark.isRead || mark.isWrite}));
//      var stack = ss.get(edge.source).values();
//      var funs = stack.flatMap(
//        function (frame)
//        {
//          return frame.isReturnMarker ? frame.callable.node.tag : []; 
//        })
//      return funs.reduce(function (result, fun) {return result.put(fun, rws)}, result);
//    }, LatticeMap.empty(ArraySet.empty()));
//}
//
//function functionPurity(etg, ss)
//{
//  var ipds = LatticeMap.empty(ArraySet.empty());
//  var reads = HashSet.empty();
//  var writes = HashSet.empty();
//  etg.edges().forEach(
//    function (edge)
//    {
//      var marks = edge.marks || [];
//      var rs = marks.flatMap(function (mark) {return mark.isRead ? [mark.address] : []});
//      var ws = marks.flatMap(function (mark) {return mark.isWrite ? [mark.address] : []});
//      var as = marks.flatMap(function (mark) {return mark.isAlloc ? [mark.address] : []});
//      reads = reads.addAll(rs);
//      writes = writes.addAll(ws);
//      var stack = ss.get(edge.source).values();
//      var funs = stack.flatMap(
//        function (frame)
//        {
//          return frame.isReturnMarker ? [[frame.callable.node.tag, frame.extendedBenva]] : []; 
//        });
//      funs.forEach(
//        function (fun)
//        {
//          ipds = ipds.put(fun, ArraySet.from(rs.concat(ws)));
//        });
//    });
//  print("ipds", ipds);
//  var constants = reads.removeAll(writes);
//  print("reads", reads);
//  print("writes", writes);
//  print("constants", constants);
//  var purity = HashMap.from(ipds.entries().map(
//    function (entry)
//    {
//      var addresses = entry.value.removeAll(constants);
//      var localEnv = entry.key[1];
//      var foreignAddresses = addresses.filter(
//        function (address)
//        {
//          return !address.base.equals(localEnv); 
//        });
//      return {key:entry.key, value:foreignAddresses};
//    }));
//  return purity;
//}
