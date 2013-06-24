function TopLattice()
{
	return (function ()
	{
		var module = Object.create(new Lattice());
		
    var Top = Object.create(new LatticeValue()); 
    Top.join = function (other) { return this };
    Top.compareTo = function (other) { return other === Top ? 0 : 1};
    Top.isAddress = function () { return false };
    Top.addresses = function () { return false };
    Top.conc = function () { return false };
    Top.toString = function () { return "^" };
    Top.nice = function () { return "^" };
    Top.ToBoolean = function () { return Top };
    Top.ToString = function () { return Top };
    Top.ToUInt32 = function () { return Top };
    Top.ToInt32 = function () { return Top };
    Top.ToNumber = function () { return Top };
    Top.accept = function (visitor) { return visitor.visitTop(this) };
      
      module.Top = Top;
    
      module.add =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.sub =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
      
      module.mul =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.div =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.eqq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.neqq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.eq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.neq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.lt =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.lte =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.gt =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.gte =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.binand =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.binor =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Top;
        }
        
      module.binnot =
        function (x)
        {
          return x;
        }
        
      module.neg =
        function (x)
        {
          return x;
        }
        
      module.sqrt =
        function (x)
        {
          return x;
        }
        
    module.abst =
      function (cvalues)
      {
        if (cvalues.length === 0)
        {
          return BOT;
        }
        return Top;
      };
      
    module.abst1 =
      function (cvalue)
      {
        return Top;
      }
        
		module.isFalse =
			function (aval)
			{
		    return false; 
			}
			
    module.isTrue =
      function (aval)
      {
        return false;
      }
      
		return module;
	})();
}
