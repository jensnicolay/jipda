"use strict";

var Agc = {};

Agc.collect =
  function (store, rootSet)
  {
    var reachable = MutableHashSet.empty(); 
    Agc.addressesReachable(rootSet, store, reachable);
    if (reachable.count() === store.map.count()) // we can do this since we have subsumption
    {
      return store;
    }
    var store2 = store.narrow(reachable);
    return store2;
  }

Agc.addressesReachable =
  function (addresses, store, reachable)
  {
    addresses.forEach(function (address) {Agc.addressReachable(address, store, reachable)});
  }

Agc.addressReachable = 
  function (address, store, reachable)
  {
    if (reachable.contains(address))
    {
      return;
    }
    var aval = store.lookupAval(address);
    var addresses = aval.addresses();
    reachable.add(address);
    Agc.addressesReachable(addresses, store, reachable);
  }
