var Agc = {};

Agc.collect =
  function (store, rootSet)
  {
    var reachable = Agc.addressesReachable(rootSet, store, []);
    var store2 = store.narrow(reachable);
//    print("narrowed", store.map.size(), store2.map.size());
    return store2;
  }

Agc.addressesReachable =
  function (addresses, store, reachable)
  {
    for (var i = 0; i < addresses.length; i++)
    {
      reachable = Agc.addressReachable(addresses[i], store, reachable);
    }
    return reachable;
  }

Agc.addressReachable = 
  function (address, store, reachable)
  {
    if (!(address instanceof Addr))
    {
      throw new Error("not an address: " + address);
    }
    if (Arrays.contains(address, reachable, Eq.equals))
    {
      return reachable;
    }
    var aval = store.lookupAval(address);
    var addresses = aval.addresses();
    return Agc.addressesReachable(addresses, store, reachable.addLast(address));
  }
