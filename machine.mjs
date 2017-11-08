import {Arrays} from './common'

export default function createMachine(semantics, global, config)
{
  return new Machine(semantics, global, config);
}

function Machine(semantics, global, config)
{
  this.semantics = semantics;
  this.global = global;
  this.config = config;
}

Machine.prototype.initialize =
    function (benv, store, lkont, kont, kstore)
    {
      return new States(this.semantics.initialize(benv, store, lkont, kont, kstore, this));
    }

Machine.prototype.enqueue =
    function (queueName, job, store, lkont, kont, kstore)
    {
      return new States(this.semantics.enqueue(queueName, job, store, lkont, kont, kstore, this));
    }

Machine.prototype.evaluate =
    function (exp, benv, store, lkont, kont, kstore)
    {
      return new States([new EvalState(exp, benv, store, lkont, kont, kstore)]);
    }

Machine.prototype.continue =
    function (value, store, lkont, kont, kstore)
    {
      return new States([new KontState(value, store, lkont, kont, kstore)]);
    }
    
    

Machine.prototype.abst1 =
    function (value)
    {
      return this.config.lat.abst1(value);
    }

Machine.prototype.abstRef =
    function (value)
    {
      return this.config.lat.abstRef(value);
    }
    
Machine.prototype.undefinedValue =
    function ()
    {
      return this.config.lat.abst1(undefined);
    }

Machine.prototype.storeAlloc =
    function (store, addr, value)
    {
      assert(value);
      assert(value.toString);
      assert(value.addresses);
      return store.allocAval(addr, value);
    }

Machine.prototype.storeUpdate =
    function (store, addr, value)
    {
      assert(value);
      assert(value.toString);
      assert(value.addresses);
      return store.updateAval(addr, value);
    }
    
Machine.prototype.storeLookup =
    function (store, addr)
    {
      return store.lookupAval(addr);
    }



function States(states) // no defensive copy: public ctr (on Machine) should do this
{
  this.states = states;
}

States.prototype.enqueue =
    function (queueName, job, store, lkont, kont, kstore, machine)
    {
      return new States(Arrays.flatmap(this.states, state => state.enqueue(queueName, job, store, lkont, kont, kstore, machine)));
    }

function EvalState(exp, benv, store, lkont, kont, kstore)
{
  this.exp = exp;
  this.benv = benv;
  this.store = store;
  this.lkont = lkont;
  this.kont = kont;
  this.kstore = kstore;
}

EvalState.prototype.next =
    function (machine)
    {
      return new States(machine.semantics.evaluate(this.exp, this.benv, this.store, this.lkont, this.kont, this.kstore, machine));
    }

function KontState(value, store, lkont, kont, kstore)
{
  this.value = value;
  this.store = store;
  this.lkont = lkont;
  this.kont = kont;
  this.kstore = kstore;
}

KontState.prototype.next =
    function (machine)
    {
      return new States(machine.semantics.continue(this.value, this.store, this.lkont, this.kont, this.kstore, machine));
    }

KontState.prototype.enqueue =
    function (queueName, job, store, lkont, kont, kstore, machine)
    {
      return new States(machine.semantics.enqueue(queueName, job, store, lkont, kont, kstore, machine));
    }