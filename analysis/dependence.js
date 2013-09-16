function Dependence(analysis)
{
  this.analysis = analysis;
}


Dependence.prototype.isPureFunction =
  function (f)
  {
    var analysis = this.analysis;
    var globalReadAddresses = ArraySet.from(Pushdown.filterMarks(analysis.etg, function (mark) {return mark.isRead}).map(function (mark) {return mark.address}));
    var globalWriteAddresses = ArraySet.from(Pushdown.filterMarks(analysis.etg, function (mark) {return mark.isWrite}).map(function (mark) {return mark.address}));
    var constants = globalReadAddresses.subtract(globalWriteAddresses);
    print("constants", constants);
    var objectAllocStates = analysis.etg.nodes().filter(function (s) {return s.node && s.node.type === "ObjectExpression"});
    var allocs = objectAllocStates.reduce(
      function (result, s)
      {
        var valueStates = Pushdown.valueOf(s, analysis.etg, analysis.ecg).targets.values();
        var value = valueStates.map(function (q) {return q.value || BOT}).reduce(Lattice.join);
        print("s", s, "valueStates", valueStates, "value", value);
        var allocatedAddresses = ArraySet.from(value.addresses());
        var executions = analysis.executions(s); 
        return executions.reduce(
          function (result, execution)
          {
            return result.put(execution, allocatedAddresses)
          }, result);
      }, LatticeMap.empty(ArraySet.empty()));
    print("allocs", allocs);
    var rws = analysis.etg.edges().reduce(
      function (result, e)
      {
        var marks = e.marks || [];
        var rwMarks = marks.filter(function (mark) {return mark.isRead || mark.isWrite});
        var rwAddresses = ArraySet.from(rwMarks.flatMap(function (mark) {return mark.address}));
        var preStack = Pushdown.preStackUntil(e.source, function () {return false}, analysis.etg, analysis.ecg);
        var applications = preStack.visited.values().map(function (e) {return e.target}).filter(function (q) {return q.fun});
        return applications.reduce(
          function (result, application)
          {
            return result.put(application, rwAddresses);
          }, result);
      }, LatticeMap.empty(ArraySet.empty()));
    print("rws", rws);
    ////
    var applications = analysis.etg.nodes().filter(function (q) {return q.fun === f});
    return applications.every(
      function (application)
      {
        var benva = application.extendedBenva;
        var allocAddresses = allocs.get(application);
        var rwAddresses = rws.get(application).values();
        return rwAddresses.every(
          function (rwa)
          {
            if (constants.contains(rwa))
            {
              return true;
            }
            var base = rwa.base;
            if (base.equals(benva))
            {
              return true;
            }
            return allocAddresses.contains(base);
          }) 
      })
  }