var Trait = (function(){
  
  var call = Function.prototype.call;
  
  /**
   * An ad hoc version of bind that only binds the 'this' parameter.
   */
  var bindThis = function(fun, self) {
    function funcBound(...arguments) {
      return fun.apply(self, arguments);
    }
    return funcBound;
  }
  
  function makeConflictAccessor(name) {
    var accessor = function(var_args) {
      throw new Error("Conflicting property: "+name);
    };
    Object.freeze(accessor.prototype);
    return Object.freeze(accessor);
  };
  
  function makeRequiredPropDesc(name) {
    return Object.freeze({
      value: undefined,
      enumerable: false,
      required: true
    });
  }
  
  function makeConflictingPropDesc(name) {
    var conflict = makeConflictAccessor(name);
    return Object.freeze({
      value: conflict,
      enumerable: false,
      conflict: true
    });
  }
  
  /**
   * Are x and y not observably distinguishable?
   */
  function identical(x, y) {
    if (x === y) {
      // 0 === -0, but they are not identical
      return x !== 0 || 1/x === 1/y;
    } else {
      // NaN !== NaN, but they are identical.
      // NaNs are the only non-reflexive value, i.e., if x !== x,
      // then x is a NaN.
      return x !== x && y !== y;
    }
  }
  
  // Note: isSameDesc should return true if both
  // desc1 and desc2 represent a 'required' property
  // (otherwise two composed required properties would be turned into
  // a conflict)
  function isSameDesc(desc1, desc2) {
    // for conflicting properties, don't compare values because
    // the conflicting property values are never equal
    if (desc1.conflict && desc2.conflict) {
      return true;
    } else {
      return (   desc1.get === desc2.get
      && desc1.set === desc2.set
      && identical(desc1.value, desc2.value)
      && desc1.enumerable === desc2.enumerable
      && desc1.required === desc2.required
      && desc1.conflict === desc2.conflict);
    }
  }
  
  function freezeAndBind(meth, self) {
    return Object.freeze(bindThis(meth, self));
  }
  
  /* makeSet(['foo', ...]) => { foo: true, ...}
   *
   * makeSet returns an object whose own properties represent a set.
   *
   * Each string in the names array is added to the set.
   *
   * To test whether an element is in the set, perform:
   *   hasOwnProperty(set, element)
   */
  function makeSet(names) {
    var set = {};
    names.forEach(function (name) {
      set[name] = true;
    });
    return Object.freeze(set);
  }
  
  // == singleton object to be used as the placeholder for a required
  // property ==
  
  var required = Object.freeze({
    toString: function() { return '<Trait.required>'; }
  });
  
  // == The public API methods ==
  
  /**
   * var newTrait = trait({ foo:required, ... })
   *
   * @param object an object record (in principle an object literal)
   * @returns a new trait describing all of the own properties of the object
   *          (both enumerable and non-enumerable)
   *
   * As a general rule, 'trait' should be invoked with an object
   * literal, since the object merely serves as a record
   * descriptor. Both its identity and its prototype chain are
   * irrelevant.
   *
   * Data properties bound to function objects in the argument will be
   * flagged as 'method' properties. The prototype of these function
   * objects is frozen.
   *
   * Data properties bound to the 'required' singleton exported by
   * this module will be marked as 'required' properties.
   *
   * The <tt>trait</tt> function is pure if no other code can witness
   * the side-effects of freezing the prototypes of the methods. If
   * <tt>trait</tt> is invoked with an object literal whose methods
   * are represented as in-place anonymous functions, this should
   * normally be the case.
   */
  function trait(obj) {
    var map = {};
    Object.getOwnPropertyNames(obj).forEach(function (name) {
      var pd = Object.getOwnPropertyDescriptor(obj, name);
      if (pd.value === required) {
        pd = makeRequiredPropDesc(name);
      } else if (typeof pd.value === 'function') {
        pd.method = true;
        if ('prototype' in pd.value) {
          Object.freeze(pd.value.prototype);
        }
      } else {
        if (pd.get && pd.get.prototype) { Object.freeze(pd.get.prototype); }
        if (pd.set && pd.set.prototype) { Object.freeze(pd.set.prototype); }
      }
      map[name] = pd;
    });
    return map;
  }
  
  /**
   * var newTrait = compose(trait_1, trait_2, ..., trait_N)
   *
   * @param trait_i a trait object
   * @returns a new trait containing the combined own properties of
   *          all the trait_i.
   *
   * If two or more traits have own properties with the same name, the new
   * trait will contain a 'conflict' property for that name. 'compose' is
   * a commutative and associative operation, and the order of its
   * arguments is not significant.
   *
   * If 'compose' is invoked with < 2 arguments, then:
   *   compose(trait_1) returns a trait equivalent to trait_1
   *   compose() returns an empty trait
   */
  function compose(...traits) {
    var newTrait = {};
    
    traits.forEach(function (trait) {
      Object.getOwnPropertyNames(trait).forEach(function (name) {
        var pd = trait[name];
        if (newTrait.hasOwnProperty(name) &&
            !newTrait[name].required) {
          
          // a non-required property with the same name was previously
          // defined this is not a conflict if pd represents a
          // 'required' property itself:
          if (pd.required) {
            return; // skip this property, the required property is
            // now present
          }
          
          if (!isSameDesc(newTrait[name], pd)) {
            // a distinct, non-required property with the same name
            // was previously defined by another trait => mark as
            // conflicting property
            newTrait[name] = makeConflictingPropDesc(name);
          } // else,
          // properties are not in conflict if they refer to the same value
          
        } else {
          newTrait[name] = pd;
        }
      });
    });
    
    return Object.freeze(newTrait);
  }
  
  /* var newTrait = exclude(['name', ...], trait)
   *
   * @param names a list of strings denoting property names.
   * @param trait a trait some properties of which should be excluded.
   * @returns a new trait with the same own properties as the original trait,
   *          except that all property names appearing in the first argument
   *          are replaced by required property descriptors.
   *
   * Note: exclude(A, exclude(B,t)) is equivalent to exclude(A U B, t)
   */
  function exclude(names, trait) {
    var exclusions = makeSet(names);
    var newTrait = {};
    
    Object.getOwnPropertyNames(trait).forEach(function (name) {
      // required properties are not excluded but ignored
      if (!exclusions.hasOwnProperty(name) || trait[name].required) {
        newTrait[name] = trait[name];
      } else {
        // excluded properties are replaced by required properties
        newTrait[name] = makeRequiredPropDesc(name);
      }
    });
    
    return Object.freeze(newTrait);
  }
  
  /**
   * var newTrait = override(trait_1, trait_2, ..., trait_N)
   *
   * @returns a new trait with all of the combined properties of the
   *          argument traits.  In contrast to 'compose', 'override'
   *          immediately resolves all conflicts resulting from this
   *          composition by overriding the properties of later
   *          traits. Trait priority is from left to right. I.e. the
   *          properties of the leftmost trait are never overridden.
   *
   *  override is associative:
   *    override(t1,t2,t3) is equivalent to override(t1, override(t2, t3)) or
   *    to override(override(t1, t2), t3)
   *  override is not commutative: override(t1,t2) is not equivalent
   *    to override(t2,t1)
   *
   * override() returns an empty trait
   * override(trait_1) returns a trait equivalent to trait_1
   */
  function override(...traits) {
    var newTrait = {};
    traits.forEach(function (trait) {
      Object.getOwnPropertyNames(trait).forEach(function (name) {
        var pd = trait[name];
        // add this trait's property to the composite trait only if
        // - the trait does not yet have this property
        // - or, the trait does have the property, but it's a required property
        if (!newTrait.hasOwnProperty(name) || newTrait[name].required) {
          newTrait[name] = pd;
        }
      });
    });
    return Object.freeze(newTrait);
  }
  
  
  /**
   * var newTrait = rename(map, trait)
   *
   * @param map an object whose own properties serve as a mapping from
   old names to new names.
   * @param trait a trait object
   * @returns a new trait with the same properties as the original trait,
   *          except that all properties whose name is an own property
   *          of map will be renamed to map[name], and a 'required' property
   *          for name will be added instead.
   *
   * rename({a: 'b'}, t) eqv compose(exclude(['a'],t),
   *                                 { a: { required: true },
   *                                   b: t[a] })
   *
   * For each renamed property, a required property is generated.  If
   * the map renames two properties to the same name, a conflict is
   * generated.  If the map renames a property to an existing
   * unrenamed property, a conflict is generated.
   *
   * Note: rename(A, rename(B, t)) is equivalent to rename(\n ->
   * A(B(n)), t) Note: rename({...},exclude([...], t)) is not eqv to
   * exclude([...],rename({...}, t))
   */
  function rename(map, trait) {
    var renamedTrait = {};
    Object.getOwnPropertyNames(trait).forEach(function (name) {
      // required props are never renamed
      if (map.hasOwnProperty(name) && !trait[name].required) {
        var alias = map[name]; // alias defined in map
        if (renamedTrait.hasOwnProperty(alias) &&
            !renamedTrait[alias].required) {
          // could happen if 2 props are mapped to the same alias
          renamedTrait[alias] = makeConflictingPropDesc(alias);
        } else {
          // add the property under an alias
          renamedTrait[alias] = trait[name];
        }
        // add a required property under the original name
        // but only if a property under the original name does not exist
        // such a prop could exist if an earlier prop in the trait was
        // previously aliased to this name
        if (!renamedTrait.hasOwnProperty(name)) {
          renamedTrait[name] = makeRequiredPropDesc(name);
        }
      } else { // no alias defined
        if (renamedTrait.hasOwnProperty(name)) {
          // could happen if another prop was previously aliased to name
          if (!trait[name].required) {
            renamedTrait[name] = makeConflictingPropDesc(name);
          }
          // else required property overridden by a previously aliased
          // property and otherwise ignored
        } else {
          renamedTrait[name] = trait[name];
        }
      }
    });
    
    return Object.freeze(renamedTrait);
  }
  
  /**
   * var newTrait = resolve({ oldName: 'newName', excludeName:
   * undefined, ... }, trait)
   *
   * This is a convenience function combining renaming and
   * exclusion. It can be implemented as <tt>rename(map,
   * exclude(exclusions, trait))</tt> where map is the subset of
   * mappings from oldName to newName and exclusions is an array of
   * all the keys that map to undefined (or another falsy value).
   *
   * @param resolutions an object whose own properties serve as a
   mapping from old names to new names, or to undefined if
   the property should be excluded
   * @param trait a trait object
   * @returns a resolved trait with the same own properties as the
   * original trait.
   *
   * In a resolved trait, all own properties whose name is an own property
   * of resolutions will be renamed to resolutions[name] if it is truthy,
   * or their value is changed into a required property descriptor if
   * resolutions[name] is falsy.
   *
   * Note, it's important to _first_ exclude, _then_ rename, since exclude
   * and rename are not associative, for example:
   * rename({a: 'b'}, exclude(['b'], trait({ a:1,b:2 }))) eqv trait({b:1})
   * exclude(['b'], rename({a: 'b'}, trait({ a:1,b:2 }))) eqv
   * trait({b:Trait.required})
   *
   * writing resolve({a:'b', b: undefined},trait({a:1,b:2})) makes it
   * clear that what is meant is to simply drop the old 'b' and rename
   * 'a' to 'b'
   */
  function resolve(resolutions, trait) {
    var renames = {};
    var exclusions = [];
    // preprocess renamed and excluded properties
    for (var name in resolutions) {
      if (resolutions.hasOwnProperty(name)) {
        if (resolutions[name]) { // old name -> new name
          renames[name] = resolutions[name];
        } else { // name -> undefined
          exclusions.push(name);
        }
      }
    }
    return rename(renames, exclude(exclusions, trait));
  }
  
  /**
   * var obj = create(proto, trait)
   *
   * @param proto denotes the prototype of the completed object
   * @param trait a trait object to be turned into a complete object
   * @returns an object with all of the properties described by the trait.
   * @throws 'Missing required property' the trait still contains a
   *         required property.
   * @throws 'Remaining conflicting property' if the trait still
   *         contains a conflicting property.
   *
   * Trait.create is like Object.create, except that it generates
   * high-integrity or final objects. In addition to creating a new object
   * from a trait, it also ensures that:
   *    - an exception is thrown if 'trait' still contains required properties
   *    - an exception is thrown if 'trait' still contains conflicting
   *      properties
   *    - the object is and all of its accessor and method properties are frozen
   *    - the 'this' pseudovariable in all accessors and methods of
   *      the object is bound to the composed object.
   *
   *  Use Object.create instead of Trait.create if you want to create
   *  abstract or malleable objects. Keep in mind that for such objects:
   *    - no exception is thrown if 'trait' still contains required properties
   *      (the properties are simply dropped from the composite object)
   *    - no exception is thrown if 'trait' still contains conflicting
   *      properties (these properties remain as conflicting
   *      properties in the composite object)
   *    - neither the object nor its accessor and method properties are frozen
   *    - the 'this' pseudovariable in all accessors and methods of
   *      the object is left unbound.
   */
  function create(proto, trait) {
    var self = Object.create(proto);
    var properties = {};
    
    forEach(Object.getOwnPropertyNames(trait), function (name) {
      var pd = trait[name];
      // check for remaining 'required' properties
      // Note: it's OK for the prototype to provide the properties
      if (pd.required) {
        if (!(name in proto)) {
          throw new Error('Missing required property: '+name);
        }
      } else if (pd.conflict) { // check for remaining conflicting properties
        throw new Error('Remaining conflicting property: '+name);
      } else if ('value' in pd) { // data property
        // freeze all function properties and their prototype
        if (pd.method) { // the property is meant to be used as a method
          // bind 'this' in trait method to the composite object
          properties[name] = {
            value: freezeAndBind(pd.value, self),
            enumerable: pd.enumerable,
            configurable: pd.configurable,
            writable: pd.writable
          };
        } else {
          properties[name] = pd;
        }
      } else { // accessor property
        throw new Error("NYI");
      }
    });
    
    Object.defineProperties(self, properties);
    return Object.freeze(self);
  }
  
  /** A shorthand for create(Object.prototype, trait({...}), options) */
  function object(record, options) {
    return create(Object.prototype, trait(record), options);
  }
  
  /**
   * Tests whether two traits are equivalent. T1 is equivalent to T2 iff
   * both describe the same set of property names and for all property
   * names n, T1[n] is equivalent to T2[n]. Two property descriptors are
   * equivalent if they have the same value, accessors and attributes.
   *
   * @return a boolean indicating whether the two argument traits are
   *         equivalent.
   */
  function eqv(trait1, trait2) {
    var names1 = Object.getOwnPropertyNames(trait1);
    var names2 = Object.getOwnPropertyNames(trait2);
    var name;
    if (names1.length !== names2.length) {
      return false;
    }
    for (var i = 0; i < names1.length; i++) {
      name = names1[i];
      if (!trait2[name] || !isSameDesc(trait1[name], trait2[name])) {
        return false;
      }
    }
    return true;
  }
  
  // expose the public API of this module
  function Trait(record) {
    // calling Trait as a function creates a new atomic trait
    return trait(record);
  }
  Trait.required = Object.freeze(required);
  Trait.compose = Object.freeze(compose);
  Trait.resolve = Object.freeze(resolve);
  Trait.override = Object.freeze(override);
  Trait.create = Object.freeze(create);
  Trait.eqv = Object.freeze(eqv);
  Trait.object = Object.freeze(object); // not essential, cf. create + trait
  return Object.freeze(Trait);
  
})();


/***************************************************/
/***************************************************/
/***************************************************/
/***************************************************/
/***************************************************/
/***************************************************/
/***************************************************/
/***************************************************/


var cop = (function() {
  var ActivationAgePolicy, Adaptation, Context, Manager, Namespace, Policy, contexts, ensureObject, exports, findScriptHome, strategies, traceableMethod, traceableTrait, traits;
  
  Function.prototype.inheritFrom =
      function(parent) {
        this.prototype = new parent();
        return this;
      }
  
  Array.prototype.top = function() {
    return this[this.length - 1];
  };
  
  Context = function(name) {
    var _ref1;
    this.activationCount = 0;
    this.adaptations = [];
    this.manager = ((_ref1 = contexts.Default) != null ? _ref1.manager : undefined) || new Manager();
    if (name != null) {
      this.name = (function() {
        return name;
      });
    }
    return this;
  };
  
  Context.prototype.activate =
      function() {
        if (++this.activationCount === 1) {
          this.activationStamp = ++this.manager.totalActivations;
          this.activateAdaptations();
        }
        return this;
      }
  
  Context.prototype.deactivate =
      function() {
        if (this.activationCount > 0) {
          if (--this.activationCount === 0) {
            this.deactivateAdaptations();
            delete this.activationStamp;
          }
        } else {
          throw new Error('Cannot deactivate inactive context');
        }
        return this;
      }
  
  Context.prototype.isActive =
      function() {
        return this.activationCount > 0;
      }
  
  Context.prototype.adapt =
      function(object, trait) {
        if (!(object instanceof Object)) {
          throw new Error("Values of type " + (typeof object) + " cannot be adapted.");
        }
        contexts.Default.addAdaptation(object, Trait(object), strategies.preserve);
        return this.addAdaptation(object, trait, strategies.compose);
      }
  
  Context.prototype.addAdaptation =
      function(object, trait, strategy) {
        var adaptation;
        trait = traceableTrait(trait, object);
        adaptation = this.adaptationFor(object);
        if (adaptation) {
          adaptation.trait = strategy(adaptation, trait);
          if (this.isActive()) {
            this.manager.updateBehaviorOf(object);
          }
        } else {
          trait = Trait.compose(trait, traits.Extensible);
          adaptation = new Adaptation(this, object, trait);
          this.adaptations.push(adaptation);
          if (this.isActive()) {
            this.manager.deployAdaptation(adaptation);
          }
        }
        return this;
      }
  
  Context.prototype.adaptationFor =
      function(object) {
        return this.adaptations.find(function(adaptation) {
          return adaptation.object === object;
        });
      }
  
  Context.prototype.activateAdaptations =
      function() {
        var adaptation, _i, _len, _ref1, _results;
        _ref1 = this.adaptations;
        _results = [];
        _len = _ref1.length;
        for (_i = 0; _i < _len; _i++) {
          adaptation = _ref1[_i];
          _results.push(this.manager.deployAdaptation(adaptation));
        }
        return _results;
      }
  
  Context.prototype.deactivateAdaptations =
      function() {
        var adaptation, _i, _len, _ref1, _results;
        _ref1 = this.adaptations;
        _results = [];
        _len = _ref1.length;
        for (_i = 0; _i < _len; _i++) {
          adaptation = _ref1[_i];
          _results.push(this.manager.withdrawAdaptation(adaptation));
        }
        return _results;
      }
  
  Context.prototype.activationAge =
      function() {
        return this.manager.totalActivations - this.activationStamp;
      }
  
  Context.prototype.path =
      function(from) {
        var i, keys, p, subspace, values, _i, _len;
        if (from == null) {
          from = contexts;
        }
        keys = _.keys(from);
        values = _.values(from);
        i = values.indexOf(this);
        if (i !== -1) {
          return [keys[i]];
        } else {
          _len = values.length
          for (i = _i = 0; _i < _len; i = ++_i) {
            subspace = values[i];
            if (subspace instanceof Namespace && keys[i] !== 'parent') {
              p = this.path(subspace);
              if (p) {
                p.unshift(keys[i]);
                return p;
              }
            }
          }
          return false;
        }
      }
  
  Context.prototype.name =
      function() {
        var path;
        path = this.path();
        if (path) {
          return path.join('.');
        } else {
          return 'anonymous';
        }
      }
  
  Context.prototype.toString =
      function() {
        return this.name() + ' context';
      }
  
  Policy = function() {
    return this;
  };
  
  function insertionSort(arr, f)
  {
    for (i = 1; i < arr.length; i++)
    {
      var x = arr[i];
      var j = i - 1;
      while (j >= 0 && f(arr[j], x))
      {
        arr[j+1] = arr[j]
        j--;
      }
      arr[j+1] = x;
    }
    return arr;
  }
  
  
  Policy.prototype.order =
      function(adaptations) {
        var self;
        self = this;
        return insertionSort(adaptations, function(adaptation1, adaptation2) {
          if (adaptation1.object !== adaptation2.object) {
            throw new Error("Refusing to order adaptations of different objects");
          }
          return self.compare(adaptation1, adaptation2);
        });
      }
  
  Policy.prototype.compare =
      function(adaptation1, adaptation2) {
        throw new Error("There is no criterium to order adaptations");
      }
  
  Policy.prototype.toString =
      function() {
        return this.name() + ' policy';
      }
  
  Policy.prototype.name =
      function() {
        return 'anonymous';
      }
  
  
  ActivationAgePolicy = function() {
    Policy.call(this);
    return this;
  };
  
  ActivationAgePolicy.inheritFrom(Policy);
  
  ActivationAgePolicy.prototype.compare =
      function(adaptation1, adaptation2) {
        return adaptation1.context.activationAge() - adaptation2.context.activationAge();
      }
  
  ActivationAgePolicy.prototype.name =
      function() {
        return 'activation age';
      }
  
  
  Namespace = function(name, parent) {
    if (parent == null) {
      parent = null;
    }
    if (!name) {
      throw new Error("Namespaces must have a name");
    }
    this.name = name;
    this.parent = parent;
    if (!parent) {
      this.home = null;//findScriptHome();
    }
    return this;
  };
  
  Adaptation = function(context, object, trait) {
    this.context = context;
    this.object = object;
    this.trait = trait;
    return this;
  };
  
  Adaptation.prototype.deploy =
      function() {
        return extend(this.object, Object.create({}, this.trait));
      }
  
  Adaptation.prototype.toString =
      function() {
        return "Adaptation for " + this.object + " in " + this.context;
      }
  
  Adaptation.prototype.equivalent =
      function(other) {
        return this.context === other.context && this.object === other.object && Trait.eqv(this.trait, other.trait);
      }
  
  Manager = function() {
    this.adaptations = [];
    this.invocations = [];
    this.policy = new ActivationAgePolicy();
    this.totalActivations = 0;
    return this;
  };
  
  Manager.prototype.deployAdaptation =
      function(adaptation) {
        this.adaptations.push(adaptation);
        return this.updateBehaviorOf(adaptation.object);
      }
  
  Manager.prototype.withdrawAdaptation =
      function(adaptation) {
        var i;
        i = this.adaptations.indexOf(adaptation);
        if (i === -1) {
          throw new Error("Attempt to withdraw unmanaged adaptation");
        }
        var s = this.adaptations.splice(i, 1);
        return this.updateBehaviorOf(adaptation.object);
      }
  
  Manager.prototype.updateBehaviorOf =
      function(object) {
        this.adaptationChainFor(object)[0].deploy();
        return this;
      }
  
  Manager.prototype.adaptationChainFor =
      function(object) {
        var relevantAdaptations;
        relevantAdaptations = this.adaptations.filter(function(adaptation) {
          return adaptation.object === object;
        });
        if (relevantAdaptations.length === 0) {
          throw new Error("No adaptations found for " + object);
        }
        return this.policy.order(relevantAdaptations);
      }
  
  Manager.prototype.orderedMethods =
      function(object, name) {
        var adaptation, adaptations, _i, _len, _results;
        adaptations = this.adaptationChainFor(object);
        _results = [];
        _len = adaptations.length;
        for (_i = 0; _i < _len; _i++) {
          adaptation = adaptations[_i];
          _results.push(adaptation.trait[name].value);
        }
        return _results;
      }
  
  
  
  
  
  
  
  strategies = {
    compose: function(adaptation, trait) {
      var propdesc, resultingTrait;
      resultingTrait = Trait.compose(adaptation.trait, trait);
      for (var name in resultingTrait) {
        if (__hasProp.call(resultingTrait, name))
        {
          propdesc = resultingTrait[name];
          if (propdesc.conflict) {
            throw new Error(("Property '" + name + "' already adapted for ") + adaptation.object + " in " + adaptation.context);
          }
        }
      }
      return resultingTrait;
    },
    preserve: function(adaptation, trait) {
      return Trait.override(adaptation.trait, trait);
    },
    override: function(adaptation, trait) {
      return Trait.override(trait, adaptation.trait);
    },
    prevent: function(adaptation, trait) {
      throw new Error(adaptation.object + " already adapted in " + adaptation.context);
    }
  };
  
  
  
  function extend(target, source)
  {
    for (var prop in source) {
      target[prop] = source[prop];
    }
    return target;
  }
  
  
  traits = {};
  
  traits.Extensible = Trait({
    proceed: function(...arguments) {
      var alternatives, args, index, invocations, manager, method, name, object, _ref1;
      manager = contexts.Default.manager;
      invocations = manager.invocations;
      if (invocations.length === 0) {
        throw new Error("Proceed must be called from an adaptation");
      }
      _ref1 = invocations.top();
      object = _ref1[0];
      method = _ref1[1];
      name = _ref1[2];
      args = _ref1[3];
      args = arguments.length === 0 ? args : arguments;
      alternatives = manager.orderedMethods(object, name);
      index = alternatives.indexOf(method);
      if (index === -1) {
        throw new Error("Cannot proceed from an inactive adaptation");
      }
      if (index + 1 === alternatives.length) {
        throw new Error("Cannot proceed further");
      }
      return alternatives[index + 1].apply(this, args);
    }
  });
  
  traceableMethod = function(object, name, method) {
    var wrapper;
    wrapper = function(...arguments) {
      var invocations;
      invocations = contexts.Default.manager.invocations;
      invocations.push([object, wrapper, name, arguments]);
      try {
        return method.apply(this, arguments);
      } finally {
        invocations.pop();
      }
    };
    return wrapper;
  };
  
  traceableTrait = function(trait, object) {
    var newTrait, propdesc;
    newTrait = Trait.compose(trait);
    for (var name in newTrait) {
      if (newTrait.hasOwnProperty(name))
      {
        propdesc = newTrait[name];
        if (typeof propdesc.value === "function") {
          propdesc.value = traceableMethod(object, name, propdesc.value);
        }
      }
    }
    return newTrait;
  };
  
  contexts = new Namespace('contexts');
  
  contexts.Default = new Context('default');
  
  contexts.Default.activate();
  
  return {
    Context:Context,
    Namespace:Namespace,
    Policy:Policy,
    Trait:Trait,
    contexts:contexts
  }
})();






















print("base behavior definition");

/*
 * Base behavior definition
 */
CoreObject = Trait({
  send: function(message) {
    return message;
  }
});

/*
 * Context definitions
 */
Encryption = new cop.Context({
  name: "Encryption"
});


Compression = new cop.Context({
  name: "Compression"
});

/*
 * Behavioral adaptations definition
 */
EncryptionAdaptation = Trait({
  send: function(message) {
    return "<E>" + this.proceed() + "<E>";
  }
});

/*
CompressedEncryption = new cop.Context({
  name: "CompressedEncryption"
});
*/

CompressionAdaptation = Trait({
  send: function(message) {
    return "<C>" + this.proceed() + "<C>";
  }
});

/*
CompressedEncryptionRole = Trait({
  send: function() {
    return this.proceed();
  }
});
*/

obj = Object.create(Object.prototype, CoreObject);

//Context behavioral adaptation association
Compression.adapt(obj, CompressionAdaptation);
Encryption.adapt(obj, EncryptionAdaptation);
//CompressedEncryption.adapt(obj, CompressedEncryptionRole);


/* -----------------------------
 *             TESTS
 * ----------------------------- */
print(obj.send("Normal message"));
Compression.activate();
print(obj.send("compressed message"));
Compression.deactivate();
Encryption.activate();
print(obj.send("Encrypted message"));
Encryption.deactivate();

Compression.activate();
Encryption.activate();
Compression.activate();
//CompressedEncryption.activate();
print(obj.send("Both message"));
Compression.deactivate();
Encryption.deactivate();
Compression.deactivate();
//CompressedEncryption.deactivate();
