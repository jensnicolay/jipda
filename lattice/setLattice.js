function SetLattice(n)
{
	return (function ()
	{
		var module = Object.create(new Lattice());
		
		function Some(cvalues)
		{
		  if (cvalues.length > 3 && cvalues.memberAt(undefined) > -1) {throw new Error(cvalues.toString())};
			this.cvalues = cvalues;
			//this.lattice = module;
		}
		Some.prototype = new LatticeValue();

		Some.prototype.compareTo =
		  function (x)
		  {
		    if (x === Top)
		    {
		      return -1;
		    }
		    if (x === BOT)
		    {
		      return 1;
		    }
		    
//		    if (!x || !x.cvalues)
//		    {
////		      throw new Error("cannot compare " + this + " with " + x);
//		      return undefined; // when comparing values on stack, not sure whether types match
//		    }
		    
		    var c = this.cvalues.length - x.cvalues.length;

		    // undefined works great: undefined <= 0 === false; false <= 0 === true
		    if (c > 0)
		    {
		      return this.cvalues.subsumes(x.cvalues) ? c : undefined;
		    }
		    else
		    {
          return x.cvalues.subsumes(this.cvalues) ? c : undefined;		      
		    }
		  };
		  
		Some.prototype.hashCode =
		  function ()
		  {
		    return this.cvalues.hashCode();
		  }
			
		Some.prototype.toString =
			function (printer)
			{
		    return "{" + this.cvalues.join(",") + "}";
			};
			
		Some.prototype.join =
			function (aval)
			{
				if (aval === BOT)
				{
					return this;
				}
				if (aval === Top)
				{
					return Top;
				}
				var cvalues = this.cvalues.concat(aval.cvalues).toSet();
				if (cvalues.length > n)
				{
					return Top;
				}
				return new Some(cvalues);
			};
			
		Some.prototype.meet =
		  function (x)
		  {
		    if (x === Top)
		    {
		      return this;
		    }
		    if (x === BOT)
		    {
		      return BOT;
		    }
		    var cvalues = this.cvalues.keepAll(x.cvalues);
		    if (cvalues.length === 0)
		    {
		      return BOT;
		    }
		    return new Some(this.cvalues.keepAll(x.cvalues));
		  }

    Some.prototype.conc =
      function ()
      {
        return this.cvalues.slice(0);
      };
//      
//    Some.prototype.addresses =
//      function ()
//      {
//        return this.cvalues.filter(function (x) {return x instanceof Addr});
//      };
//      
//    Some.prototype.isAddress =
//      function ()
//      {
//        return this.addresses().length === this.cvalues.length;
//      }
	        
    Some.prototype.ToString =
      function ()
      {
        return new Some(this.cvalues.map(LatticeValue.ToString).toSet());
      };
      
    Some.prototype.ToUInt32 =
      function ()
      {
        return new Some(this.cvalues.map(LatticeValue.ToUInt32).toSet());
      };
      
    Some.prototype.ToInt32 =
      function ()
      {
        return new Some(this.cvalues.map(LatticeValue.ToInt32).toSet());
      };
          
    Some.prototype.ToNumber =
      function ()
      {
        return new Some(this.cvalues.map(LatticeValue.ToNumber).toSet());
      };
          
    Some.prototype.ToBoolean =
      function ()
      {
        return new Some(this.cvalues.map(LatticeValue.ToBoolean).toSet());
      };
      
    var Top = Object.create(new LatticeValue()); 
    Top.join = function (other) { return Top };
    Top.meet = function (x) {return x};
    Top.compareTo = function (other) { return other === Top ? 0 : 1 };
    Top.hashCode = function () { return 7 };
    Top.isAddress = function () { return false };
//    Top.addresses = function () { return false };
//    Top.conc = function () { return false };
    Top.toString = function () { return "^" };
    Top.nice = function () { return "^" };
    Top.ToBoolean = function () { return Top }; // TODO lattice.join(true, false)!
    Top.ToString = function () { return Top };
    Top.ToUInt32 = function () { return Top };
    Top.ToInt32 = function () { return Top };
    Top.ToNumber = function () { return Top };
      
      module.Top = Top;
    
      module.add =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] + p[1]}));                  
        }
        
      module.sub =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] - p[1]}));                          
        }
      
      module.mul =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] * p[1]}));
        }
        
      module.div =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] / p[1]}));
        }
        
      module.rem =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] % p[1]}));
        }
        
      module.eqq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top; // TODO join(true, false)  [here and for other equal/rel preds]
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] === p[1]}));        
        }
        
      module.neqq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] !== p[1]}));
        }
        
      module.eq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] == p[1]}));
        }
        
      module.neq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
        return module.abst(combs.flatMap(function (p) { return p[0] != p[1]}));
        }
        
      module.lt =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] < p[1]}));
        }
        
      module.lte =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] <= p[1]}));
        }
        
      module.gt =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] > p[1]}));
        }
        
      module.gte =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] >= p[1]}));
        }
        
      module.binand =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] & p[1]}));
        }
        
      module.binor =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x === Top || y === Top) 
          {
            return Top;
          }
          var left = x.conc();
          var right = y.conc();
          var combs = Arrays.cartesianProduct([left, right]);
          return module.abst(combs.flatMap(function (p) { return p[0] | p[1]}));
        }
        
      module.binnot =
        function (x)
        {
          if (x === BOT)
          {
            return BOT;
          }
          if (x === Top) 
          {
            return Top;
          }
          var right = x.conc();
          return module.abst(right.map(function (p) { return ~p}));
        }
        
      module.neg =
        function (x)
        {
          if (x === BOT)
          {
            return BOT;
          }
          if (x === Top) 
          {
            return Top;
          }
          var right = x.conc();
          return module.abst(right.map(function (p) { return -p}));        
        }
        
      module.pos =
        function (x)
        {
          if (x === BOT)
          {
            return BOT;
          }
          if (x === Top) 
          {
            return Top;
          }
          var right = x.conc();
          return module.abst(right.map(function (p) { return +p}));        
        }
        
      module.not =
        function (x)
        {
          if (x === BOT)
          {
            return BOT;
          }
          if (x === Top) 
          {
            return Top;
          }
          var right = x.conc();
          return module.abst(right.map(function (p) { return !p}));        
        }
        
      module.sqrt =
        function (x)
        {
          if (x === BOT)
          {
            return BOT;
          }
          if (x === Top) 
          {
            return Top;
          }
          var right = x.conc();
          return module.abst(right.map(Math.sqrt));        
        }
        
    module.abst =
      function (cvalues)
      {
        if (cvalues.length === 0)
        {
          return BOT;
        }
        cvalues = cvalues.toSet();
        if (cvalues.length <= n)
        {
          return new Some(cvalues);
        }
        return Top;
      };
      
    module.abst1 =
      function (cvalue)
      {
        // assumes n > 0
        return new Some([cvalue]);
      }
        
//
//    // assume rand1 is receiver type that is 'checked' before dispatching here
//    function apply1(rator, rand1)
//    {
//      //print("|apply1| ", rator, rand1, rand2);
//      var vals = rand1.conc();
//      return module.abst(vals.map(rator));                  
//    } 
      
    module.NUMBER = Top;
    module.STRING = Top;    
    module.BOOLEAN = Top;    
    
		return module;
	})();
}