function TypeLattice()
{
	return (function ()
	{
		var module = Object.create(Lattice.prototype);
    
    var Num = new LatticeValue();
    Num.isNum = function (x) { return typeof x === "number"};
    Num.compareTo =
      function (x)
      {
        if (x === Top)
        {
          return -1;
        }
        if (x === Num)
        {
          return 0;
        }
        if (x.Num || x == BOT)
        {
          return 1;
        }
        return undefined;
      }

    Num.toString =
      function ()
      {
        return "Num";
      };
      
    Num.hashCode =
      function ()
      {
        return 3;
      }
      
    Num.join =
      function (x)
      {
        if (x === BOT || x === Num)
        {
          return Num;
        }
        return Top;
      }
    
    Num.meet =
      function (x)
      {
        if (x === Num || x === Top)
        {
          return Num;
        }
        return BOT;
      }
    
    Num.ToString =
      function ()
      {
        return Str;
      };
      
    Num.ToNumber =
      function ()
      {
        return Num;
      };
          
    Num.ToBoolean =
      function ()
      {
        return Bool;
      };
      
    Num.accept =
      function (visitor)
      {
        return visitor.visitNum(Num);
      }
    
    var Bool = new LatticeValue();
    Bool.isBool = function (x) { return typeof x === "boolean"};
    Bool.compareTo =
      function (x)
      {
        if (x === Top)
        {
          return -1;
        }
        if (x === Bool)
        {
          return 0;
        }
        if (x.Num || x == BOT)
        {
          return 1;
        }
        return undefined;
      }

    Bool.toString =
      function ()
      {
        return "Bool";
      };
      
      Bool.hashCode =
      function ()
      {
        return 11;
      }
      
    Bool.join =
      function (x)
      {
        if (x === BOT || x === Bool)
        {
          return Bool;
        }
        return Top;
      }
    
    Bool.meet =
      function (x)
      {
        if (x === Bool || x === Top)
        {
          return Bool;
        }
        return BOT;
      }
    
    Bool.ToString =
      function ()
      {
        return Str;
      };
      
      Bool.ToNumber =
      function ()
      {
        return Num;
      };
          
      Bool.ToBoolean =
      function ()
      {
        return Bool;
      };
      
    Bool.accept =
      function (visitor)
      {
        return visitor.visitBool(Bool);
      }
    
    var Str = new LatticeValue();
    Str.isStr = function (x) { return typeof x === "string"};
    Str.compareTo =
      function (x)
      {
        if (x === Top)
        {
          return -1;
        }
        if (x === Str)
        {
          return 0;
        }
        if (x === BOT)
        {
          return 1;
        }
        return undefined;
      }

    Str.toString =
      function ()
      {
        return "Str";
      };
      
    Str.hashCode =
      function ()
      {
        return 5;
      }
      
    Str.join =
      function (x)
      {
        if (x === BOT || x === Str)
        {
          return Str;
        }
        return Top;
      }
    
    Str.meet =
      function (x)
      {
        if (x === Str || x === Top)
        {
          return Str;
        }
        return BOT;
      }
    
    Str.ToString =
      function ()
      {
        return Str;
      };
      
    Str.ToNumber =
      function ()
      {
        return Num;
      };
          
    Str.ToBoolean =
      function ()
      {
        return Bool;
      };
      
    Str.accept =
      function (visitor)
      {
        return visitor.visitStr(Str);
      }
    
    var Top = Object.create(new LatticeValue()); 
    Top.join = function (other) { return Top };
    Top.meet = function (other) { return other };
    Top.compareTo = function (other) { return other === Top ? 0 : 1 };
    Top.hashCode = function () { return 7 };
    Top.isAddress = function () { return false };
//    Top.addresses = function () { return false }; considered to be primitive top, so addresses []
//    Top.conc = function () { return false };
    Top.toString = function () { return "^" };
    Top.nice = function () { return "^" };
    Top.ToBoolean = function () { return Top };
    Top.ToString = function () { return Top };
    Top.ToNumber = function () { return Top };
    Top.length = function () { return Top };
    Top.accept = function (visitor) { return visitor.visitTop(Top) };
          
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
          if (x === Str || y === Str) // TODO overloading as param?
          {
            return Str;
          }
          return Num; // TODO what about type errors?
        }
        
      module.sub =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Num;
        }

      module.mul =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Num;
        }
        
      module.div =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Num;                
        }
        
      module.eqq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Bool;
        }

      module.eq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Bool;
        }

      module.neqq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Bool;
        }

      module.neq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Bool;
        }

      module.lt =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Bool;
        }

      module.lte =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Bool;
        }

      module.gt =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Bool;
        }
    
      module.gte =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Bool;                 
        }
        
      module.binor =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          return Bool;                 
        }
        
      module.binnot =
        function (x)
        {
          if (x === BOT)
          {
            return BOT;
          }
          return Num;
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
          return Num;
        }

      module.sqrt =
        function (x)
        {
          if (x === BOT)
          {
            return BOT;
          }
          return Num;
        }
      
    module.abst =
      function (cvalues)
      {
        return cvalues.map(module.abst1).reduce(Lattice.join, BOT);
      }
      
    module.abst1 =
      function (cvalue)
      {
        if (Num.isNum(cvalue))
        {
          return Num;
        }
        if (Bool.isBool(cvalue))
        {
          return Bool;
        }
        if (Str.isStr(cvalue))
        {
          return Str;
        }
        return Top;
      }
        
//    module.Top = Top;
//    module.Str = Str;
    
    module.NUMBER = Num;
    module.STRING = Str;
    module.BOOLEAN = Bool;
    
    module.toString = function () {return "TypeLattice"}
      
		return module;
	})();
}