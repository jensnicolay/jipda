function Analysis(dsg)
{
  this.dsg = dsg;
}

Analysis.prototype.values =
  function (node)
  {
    var qs = this.dsg.etg.edges().flatMap(
      function (e)
      {
        return (e.g.isPush && e.target.node === node) ? [e.source] : [];
      });
    var q1s = qs.flatMap(function (q) {return this.dsg.stepFwOver(q)}, this);
    var q2s = q1s.flatMap(function (q1) {return this.dsg.popValues(q1)}, this);
    return q2s.map(function (q2) {return q2.value}).reduce(Lattice.join, BOT);
  }

Analysis.prototype.declarations =
  function (node)
  {
    var qs = this.dsg.etg.edges().flatMap(
      function (e)
      {
        return (e.g.isPush && e.target.node === node) ? [e.target] : [];
      });
    var q1s = qs.flatMap(function (q) {return this.dsg.declarations(q)}, this);
    return q1s.map(function (q1) {return q1.node.type === "VariableDeclaration" ? q1.node.declarations[0] : q1.node});
  }

Analysis.prototype.isPureFunction =
  function (f)
  {
    
    function filterMarks(etg, f)
    {
      return etg.edges().reduce(
        function (result, edge)
        {
          var marks = edge.marks || [];
          return result.concat(marks.filter(f))
        }, []);
    }

    var dsg = this.dsg;
    
    var globalReadAddresses = ArraySet.from(filterMarks(dsg.etg, function (mark) {return mark.isRead}).map(function (mark) {return mark.address}));
    var globalWriteAddresses = ArraySet.from(filterMarks(dsg.etg, function (mark) {return mark.isWrite}).map(function (mark) {return mark.address}));
    var constants = globalReadAddresses.subtract(globalWriteAddresses);
    print("constants", constants);
    
    var objectAllocStates = dsg.etg.nodes().filter(function (s) {return s.node && s.node.type === "ObjectExpression"});
    var allocs = objectAllocStates.reduce(
      function (result, s)
      {
        var valueStates = dsg.values(s);
        var value = valueStates.map(function (q) {return q.value}).reduce(Lattice.join, BOT);
        var allocatedAddresses = ArraySet.from(value.addresses());
        var executions = dsg.executions(s); 
        return executions.reduce(
          function (result, execution)
          {
            return result.put(execution, allocatedAddresses)
          }, result);
      }, LatticeMap.empty(ArraySet.empty()));
    print("allocs", allocs);
    
    var objectAllocStates = dsg.etg.nodes().filter(function (s) {return s.node && s.node.type === "ObjectExpression"});
    var tallocs = objectAllocStates.reduce(
      function (result, s)
      {
        var valueStates = dsg.values(s);
        var value = valueStates.map(function (q) {return q.value}).reduce(Lattice.join, BOT);
        var allocatedAddresses = ArraySet.from(value.addresses());
        var cflows = dsg.cflows(s); 
        print("talloc", s, cflows);
        return cflows.reduce(
          function (result, cflow)
          {
            return result.put(cflow, allocatedAddresses)
          }, result);
      }, LatticeMap.empty(ArraySet.empty()));
    print("tallocs", tallocs);
    
    var rws = dsg.etg.edges().reduce(
      function (result, e)
      {
        var marks = e.marks || [];
        var rwMarks = marks.filter(function (mark) {return mark.isRead || mark.isWrite});
        var rwAddresses = ArraySet.from(rwMarks.flatMap(function (mark) {return mark.address}));
        var preStack = Pushdown.preStackUntil(e.source, function () {return false}, dsg.etg, dsg.ecg);
        var applications = preStack.visited.values().map(function (e) {return e.target}).filter(function (q) {return q.fun});
        return applications.reduce(
          function (result, application)
          {
            return result.put(application, rwAddresses);
          }, result);
      }, LatticeMap.empty(ArraySet.empty()));
    print("rws", rws);
    ////
    var applications = dsg.etg.nodes().filter(function (q) {return q.fun === f});
    return applications.every(
      function (application)
      {
        var benva = application.extendedBenva;
        var allocAddresses = allocs.get(application);
        var tallocAddresses = tallocs.get(application);
        var rwAddresses = rws.get(application).values();
        print("~rw ", application, "benva", benva, "aa", allocAddresses, "rwa", rwAddresses);
        var safeAccesses = rwAddresses.every(
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
          });
        var returnStates = dsg.values(application);
        var returnAddresses = returnStates.map(function (returnState) {return returnState.value}).reduce(Lattice.join).addresses();
        print("~ret", application, "ra", returnAddresses, "taa", tallocAddresses);
        var safeReturn = returnAddresses.every(function (a) {return !tallocAddresses.contains(a)});
        return safeAccesses && safeReturn;
      })
  }