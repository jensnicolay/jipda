function Lattice1()
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
        if (x === BOT || x.Num || x === Num)
        {
          return Num;
        }
        return Top;
      }
    
    Num.meet =
      function (x)
      {
        var c = Num.compareTo(x);
        if (c >= 0)
        {
          return Num;
        }
        if (c < 0)
        {
          return x;
        }
        return BOT;
      }
    
//    Num.conc =
//      function ()
//      {
//        return false;
//      };
      
    Num.ToString =
      function ()
      {
        return StrNum;
      };
      
    Num.ToUInt32 =
      function ()
      {
        return Top;
      };
      
    Num.ToInt32 =
      function ()
      {
        return Top;
      };
          
    Num.ToNumber =
      function ()
      {
        return Num;
      };
          
    Num.ToBoolean =
      function ()
      {
        return Top;
      };
      
    Num.accept =
      function (visitor)
      {
        return visitor.visitNum(Num);
      }
    
    var StrNum = new LatticeValue();
    StrNum.isStrNum = function (x) { return x === String(parseFloat(x))};
    StrNum.compareTo =
      function (x)
      {
        if (x === Top)
        {
          return -1;
        }
        if (x === StrNum)
        {
          return 0;
        }
        if (x.StrNum || x === BOT)
        {
          return 1;
        }
        return undefined;
      }

    StrNum.toString =
      function ()
      {
        return "StrNum";
      };
      
    StrNum.hashCode =
      function ()
      {
        return 5;
      }
      
    StrNum.join =
      function (x)
      {
        if (x === BOT || x.StrNum || x === StrNum)
        {
          return StrNum;
        }
        return Top;
      }
    
    StrNum.meet =
      function (x)
      {
        var c = StrNum.compareTo(x);
        if (c >= 0)
        {
          return StrNum;
        }
        if (c < 0)
        {
          return x;
        }
        return BOT;
      }
    
    
//    StrNum.conc =
//      function ()
//      {
//        return false;
//      };
      
    StrNum.ToString =
      function ()
      {
        return StrNum;
      };
      
    StrNum.ToUInt32 =
      function ()
      {
        return Top;
      };
      
    StrNum.ToInt32 =
      function ()
      {
        return Top;
      };
          
    StrNum.ToNumber =
      function ()
      {
        return Num;
      };
          
    StrNum.ToBoolean =
      function ()
      {
        return Top;
      };
      
    StrNum.accept =
      function (visitor)
      {
        return visitor.visitStrNum(StrNum);
      }
    
		function Some(cvalue)
		{
			this.cvalue = cvalue;
			if (Num.isNum(cvalue))
			{
			  this.Num = true;
			} 
			else if (StrNum.isStrNum(cvalue)) // TODO can optimize this by using conversion from isNum as intermediate
			{
			  this.StrNum = true;
			}
		}
		Some.prototype = Object.create(LatticeValue.prototype);

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
		    if (this.Num)
		    {
		      if (x === Num)
		      {
		        return -1;
		      }
		      if (x === StrNum || x.StrNum)
		      {
		        return undefined;
		      }
		    }
		    else if (this.StrNum)
		    {
          if (x === StrNum)
          {
            return -1;
          }
          if (x === Num || x.Num)
          {
            return undefined;
          }
		    }
		    return Eq.equals(this.cvalue, x.cvalue) ? 0 : undefined;		      
		  };
		  
    Some.prototype.hashCode =
      function ()
      {
        return HashCode.hashCode(this.cvalue);
      }
	      
		Some.prototype.toString =
			function (printer)
			{
		    if (printer)
		    {
	        return printer(this.cvalue);		      
		    }
		    return String(this.cvalue);
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
	        if (this.Num)
	        {
            if (aval.Num)
            {
              return Eq.equals(this.cvalue, aval.cvalue) ? this : Num;
            }
            if (aval === Num)
            {
              return Num;
            }
            return Top;
	        }
	        if (this.StrNum)
	        {
            if (aval.StrNum)
            {
              return Eq.equals(this.cvalue, aval.cvalue) ? this : StrNum;
            }
            if (aval === StrNum)
            {
              return StrNum;
            }
            return Top;
          }
	        return Object.is(this.cvalue, aval.cvalue) ? this : Top;
	      }
	      
	  Some.prototype.meet =
      function (x)
      {
        var c = this.compareTo(x);
        if (c >= 0)
        {
          return this;
        }
        if (c < 0)
        {
          return x;
        }
        return BOT;
      }
	    

    Some.prototype.conc =
      function ()
      {
        return [this.cvalue];
      };
      
    Some.prototype.ToString =
      function ()
      {
        return new Some(LatticeValue.ToString(this.cvalue));
      };
      
    Some.prototype.ToUInt32 =
      function ()
      {
        return new Some(LatticeValue.ToUInt32(this.cvalue));
      };
        
    Some.prototype.ToInt32 =
      function ()
      {
        return new Some(LatticeValue.ToInt32(this.cvalue));
      };
          
    Some.prototype.ToNumber =
      function ()
      {
        return new Some(LatticeValue.ToNumber(this.cvalue));
      };
          
    Some.prototype.ToBoolean =
      function ()
      {
        return new Some(LatticeValue.ToBoolean(this.cvalue));
      };
      
    Some.prototype.accept =
      function (visitor)
      {
        return visitor.visitSome(this);
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
    Top.ToUInt32 = function () { return Top };
    Top.ToInt32 = function () { return Top };
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
          if (x === Num)
          {
            if (y.Num || y === Num)
            {
              return Num;
            }
            return Top;
          }
          if (x === StrNum)
          {
            return Top;
          }
          if (y === Num)
          {
            if (x.Num)
            {
              return Num;
            }
            return Top;
          }
          if (y === StrNum)
          {
            return Top;
          }
          return new Some(x.cvalue + y.cvalue);
        }
        
      module.sub =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue - y.cvalue);
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
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue * y.cvalue);
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
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue / y.cvalue);
          }
          return Num;                
        }
        
//      module.rem =
//        function (x, y)
//        {
//          if (x === BOT || y === BOT)
//          {
//            return BOT;
//          }
//          if (x === Top || y === Top) 
//          {
//            return Top;
//          }
//          if (x === Int32 || y === Int32)
//          {
//            return Top;
//          }
//          return new Some(x.cvalue % y.cvalue);                  
//        }
//        
      module.eqq =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue === y.cvalue);                  
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
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue == y.cvalue);                  
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
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue === y.cvalue);                  
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
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue != y.cvalue);                  
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
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue < y.cvalue);                  
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
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue <= y.cvalue);                  
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
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue > y.cvalue);                  
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
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue >= y.cvalue);                  
          }
          return Top;                 
        }
        
//      module.binand =
//        function (x, y)
//        {
//          if (x === BOT || y === BOT)
//          {
//            return BOT;
//          }
//          if (x === Top || y === Top) 
//          {
//            return Top;
//          }
//          if (x === Int32 || y === Int32)
//          {
//            return Top;
//          }
//          return new Some(x.cvalue & y.cvalue);                  
//        }
//        
      module.binor =
        function (x, y)
        {
          if (x === BOT || y === BOT)
          {
            return BOT;
          }
          if (x instanceof Some && y instanceof Some)
          {
            return new Some(x.cvalue | y.cvalue);                  
          }
          return Num;                 
        }
        
      module.binnot =
        function (x)
        {
          if (x === BOT)
          {
            return BOT;
          }
          if (x instanceof Some)
          {
            return new Some(~x.cvalue);                              
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
          if (x === Num || x === StrNum)
          {
            return Num;
          }
          return new Some(-x.cvalue);                  
        }
//        
//      module.pos =
//        function (x)
//        {
//          if (x === BOT)
//          {
//            return BOT;
//          }
//          if (x === Top) 
//          {
//            return Top;
//          }
//          if (x === Int32)
//          {
//            return x;
//          }
//          return new Some(+x.cvalue);                  
//        }
//        
//      module.not =
//        function (x)
//        {
//          if (x === BOT)
//          {
//            return BOT;
//          }
//          if (x === Top) 
//          {
//            return Top;
//          }
//          if (x === Int32)
//          {
//            return Top;
//          }
//          return new Some(!x.cvalue);                  
//        }
//        
      module.sqrt =
        function (x)
        {
          if (x === BOT)
          {
            return BOT;
          }
          if (x instanceof Some) 
          {
            return new Some(Math.sqrt(x.cvalue));                  
          }
          return Top;
        }
      
//      module.max =
//        function (x, y)
//        {
//          if (x === BOT || y === BOT)
//          {
//            return BOT;
//          }
//          if (x === Top || y === Top) 
//          {
//            return Top;
//          }
//          if (x === Int32 || y === Int32)
//          {
//            return Top;
//          }
//          return new Some(Math.max(x.cvalue, y.cvalue));                  
//        }
//        
//      module.shl =
//        function (x, y)
//        {
//          if (x === BOT || y === BOT)
//          {
//            return BOT;
//          }
//          if (x === Top || y === Top) 
//          {
//            return Top;
//          }
//          if (x === Int32 || y === Int32)
//          {
//            return Top;
//          }
//          return new Some(x.cvalue << y.cvalue);                  
//        }
//        
//      module.abs = // absolute value, not abstraction function
//        function (x)
//        {
//          if (x === BOT)
//          {
//            return BOT;
//          }
//          if (x === Top) 
//          {
//            return Top;
//          }
//          if (x === Int32)
//          {
//            return x;
//          }
//          return new Some(Math.abs(x.cvalue));                  
//        }
//        
//      module.round =
//        function (x)
//        {
//          if (x === BOT)
//          {
//            return BOT;
//          }
//          if (x === Top) 
//          {
//            return Top;
//          }
//          if (x === Int32)
//          {
//            return x;
//          }
//          return new Some(Math.round(x.cvalue));                  
//        }
//        
//      module.sin =
//        function (x)
//        {
//          if (x === BOT)
//          {
//            return BOT;
//          }
//          if (x === Top) 
//          {
//            return Top;
//          }
//          if (x === Int32)
//          {
//            return Top;
//          }
//          return new Some(Math.sin(x.cvalue));                  
//        }
//        
//      module.cos =
//        function (x)
//        {
//          if (x === BOT)
//          {
//            return BOT;
//          }
//          if (x === Top) 
//          {
//            return Top;
//          }
//          if (x === Int32)
//          {
//            return Top;
//          }
//          return new Some(Math.cos(x.cvalue));                  
//        }
        
    module.abst =
      function (cvalues)
      {
        return cvalues.map(module.abst1).reduce(Lattice.join, BOT);
      }
      
    module.abst1 =
      function (cvalue)
      {
        return new Some(cvalue);
      }
        
//    module.Top = Top;
//    module.StrNum = StrNum;
    
    module.NUMBER = Num;
    module.STRING = Top;
    module.BOOLEAN = Top;
    
    module.toString = function () {return "Lattice1"}
      
		return module;
	})();
}