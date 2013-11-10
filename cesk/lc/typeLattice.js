function TypeLattice()
{
	return (function ()
	{
		var module = Object.create(Lattice.prototype);
    
    var Num = new LatticeValue();
    Num.isNum = function (x) { return x instanceof Number || typeof x === "number"};
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
        if (x == BOT)
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
        return Tru;
      };
      
    Num.accept =
      function (visitor)
      {
        return visitor.visitNum(Num);
      }
    
//    var Bool = new LatticeValue();
//    Bool.isBool = function (x) { return x instanceof Boolean || typeof x === "boolean"};
//    Bool.compareTo =
//      function (x)
//      {
//        if (x === Top)
//        {
//          return -1;
//        }
//        if (x === Bool)
//        {
//          return 0;
//        }
//        if (x == BOT)
//        {
//          return 1;
//        }
//        return undefined;
//      }
//
//    Bool.toString =
//      function ()
//      {
//        return "Bool";
//      };
//      
//      Bool.hashCode =
//      function ()
//      {
//        return 11;
//      }
//      
//    Bool.join =
//      function (x)
//      {
//        if (x === BOT || x === Bool)
//        {
//          return Bool;
//        }
//        return Top;
//      }
//    
//    Bool.meet =
//      function (x)
//      {
//        if (x === Bool || x === Top)
//        {
//          return Bool;
//        }
//        return BOT;
//      }
//    
//    Bool.ToString =
//      function ()
//      {
//        return Str;
//      };
//      
//      Bool.ToNumber =
//      function ()
//      {
//        return Num;
//      };
//          
//      Bool.ToBoolean =
//      function ()
//      {
//        return Bool;
//      };
//      
//    Bool.accept =
//      function (visitor)
//      {
//        return visitor.visitBool(Bool);
//      }
    
    var Tru = new LatticeValue();
    Tru.isTru = function (x) { return (x instanceof Boolean && x.valueOf()) || x === true};
    Tru.compareTo =
      function (x)
      {
        if (x === Top)
        {
          return -1;
        }
        if (x === Tru)
        {
          return 0;
        }
        if (x == BOT)
        {
          return 1;
        }
        return undefined;
      }

    Tru.toString =
      function ()
      {
        return "#t";
      };
      
      Tru.hashCode =
      function ()
      {
        return 7;
      }
      
      Tru.join =
      function (x)
      {
        if (x === BOT || x === Tru)
        {
          return Tru;
        }
        return Top;
      }
    
      Tru.meet =
      function (x)
      {
        if (x === Tru || x === Top)
        {
          return Tru;
        }
        return BOT;
      }
    
//      Tru.ToString =
//      function ()
//      {
//        return Str;
//      };
//      
//      Tru.ToNumber =
//      function ()
//      {
//        return Num;
//      };
          
      Tru.ToBoolean =
      function ()
      {
        return Tru;
      };
      
      Tru.accept =
      function (visitor)
      {
        return visitor.visitTrue(Tru);
      }
      
      var Fals = new LatticeValue();
      Fals.isFals = function (x) { return (x instanceof Boolean && x.valueOf() === false) || x === false};
      Fals.compareTo =
        function (x)
        {
          if (x === Top)
          {
            return -1;
          }
          if (x === Fals)
          {
            return 0;
          }
          if (x == BOT)
          {
            return 1;
          }
          return undefined;
        }

      Fals.toString =
        function ()
        {
          return "#f";
        };
        
        Fals.hashCode =
        function ()
        {
          return 5;
        }
        
        Fals.join =
        function (x)
        {
          if (x === BOT || x === Fals)
          {
            return Fals;
          }
          return Top;
        }
      
        Fals.meet =
        function (x)
        {
          if (x === Fals || x === Top)
          {
            return Fals;
          }
          return BOT;
        }
      
//        Tru.ToString =
//        function ()
//        {
//          return Str;
//        };
//        
//        Tru.ToNumber =
//        function ()
//        {
//          return Num;
//        };
            
        Fals.ToBoolean =
        function ()
        {
          return Fals;
        };
        
        Fals.accept =
        function (visitor)
        {
          return visitor.visitFalse(Fals);
        }
    
    var Str = new LatticeValue();
    Str.isStr = function (x) { return x instanceof String || typeof x === "string"};
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
        return Tru;
      };
      
    Str.accept =
      function (visitor)
      {
        return visitor.visitStr(Str);
      }
    
    var Sy = new LatticeValue();
    Sy.isSy = function (x) { return x instanceof Sym};
    Sy.compareTo =
      function (x)
      {
        if (x === Top)
        {
          return -1;
        }
        if (x === Sy)
        {
          return 0;
        }
        if (x == BOT)
        {
          return 1;
        }
        return undefined;
      }

    Sy.toString =
      function ()
      {
        return "Sym";
      };
      
    Sy.hashCode =
      function ()
      {
        return 3;
      }
      
    Sy.join =
      function (x)
      {
        if (x === BOT || x === Sy)
        {
          return Sy;
        }
        return Top;
      }
    
    Sy.meet =
      function (x)
      {
        if (x === Sy || x === Top)
        {
          return Sy;
        }
        return BOT;
      }
    
    Sy.ToString =
      function ()
      {
        return Str;
      };
      
    Sy.ToNumber =
      function ()
      {
        return new Error("cannot convert sym into num");
      };
          
    Sy.ToBoolean =
      function ()
      {
        return Tru;
      };
      
    Sy.accept =
      function (visitor)
      {
        return visitor.visitSym(Sym);
      }
    
    
    var Nul = new LatticeValue();
    Nul.isNul = function (x) { return x instanceof Null};
    Nul.compareTo =
      function (x)
      {
        if (x === Top)
        {
          return -1;
        }
        if (x === Nul)
        {
          return 0;
        }
        if (x == BOT)
        {
          return 1;
        }
        return undefined;
      }

    Nul.toString =
      function ()
      {
        return "()";
      };
      
    Nul.hashCode =
      function ()
      {
        return 31;
      }
      
    Nul.join =
      function (x)
      {
        if (x === BOT || x === Nul)
        {
          return Nul;
        }
        return Top;
      }
    
    Nul.meet =
      function (x)
      {
        if (x === Nul || x === Top)
        {
          return Nul;
        }
        return BOT;
      }
    
    Nul.ToString =
      function ()
      {
        return Str;
      };
      
      Nul.ToNumber =
      function ()
      {
        return new Error("cannot convert () into num");
      };
          
      Nul.ToBoolean =
      function ()
      {
        return Tru;
      };
      
      Nul.accept =
      function (visitor)
      {
        return visitor.visitSym(Sym);
      }
    
      
      function APair(cars, cdrs)
      {
        this.cars = cars;
        this.cdrs = cdrs;
      }
      APair.prototype = new LatticeValue();
      APair.isPair = function (x) { return x instanceof Pair};
      APair.prototype.toString =
        function ()
        {
          return "(" + this.cars + " . " + this.cdrs + ")"; 
        }
      
      APair.prototype.equals =
        function (x)
        {
          return x instanceof APair
            && this.cars.equals(x.cars)
            && this.cdrs.equals(x.cdrs)
        }

      APair.prototype.hashCode =
        function ()
        {
          var prime = 41;
          var result = 1;
          result = prime * result + this.cars.hashCode();
          result = prime * result + this.cdrs.hashCode();
          return result;    
        }

      APair.prototype.subsumes =
        function (x)
        {
          if (this === x)
          {
            return true;
          }
          if (!(x instanceof APair))
          {
            return false;
          }
          return this.cars.subsumes(this.cdrs);
        }
      
      APair.prototype.compareTo =
        function (x)
        {
          return Lattice.subsumeComparison(this, x);
        }
      
      APair.prototype.join =
        function (x)
        {
          if (x === BOT)
          {
            return this;
          }
          if (x instanceof APair)
          {
            return new APair(this.cars.join(x.cars), this.cdrs.join(x.cdrs));
          }
          throw new Error("cannot join " + this + " with " + x);
        }
      
      APair.prototype.meet =
        function (x)
        {
          if (x === Top || x instanceof APair)
          {
            return this;
          }
          return BOT;
        }
      
      APair.prototype.addresses =
        function ()
        {
          function fa(x)
          {
            return x.addresses();
          }
          return this.cars.values().flatMap(fa).concat(this.cdrs.values().flatMap(fa));
        }
      
      APair.prototype.ToBoolean =
        function ()
        {
          return Tru;
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
          if (x === Num && y === Num)
          {
            return [Num];
          }
          return new Error("cannot add " + x + " and " + y);
        }
        
      module.sub =
        function (x, y)
        {
          if (x === Num && y === Num)
          {
            return [Num];
          }
          return new Error("cannot sub " + x + " and " + y);
        }

      module.mul =
        function (x, y)
        {
          if (x === Num && y === Num)
          {
            return [Num];
          }
          return new Error("cannot mul " + x + " and " + y);
        }
        
      module.div =
        function (x, y)
        {
          if (x === Num && y === Num)
          {
            return [Num];
          }
          return new Error("cannot div " + x + " and " + y);
        }
        
      module.isEq =
        function (x, y)
        {
          if (x === Tru || x === Fals || x === Nul) {return (x === y) ? [Tru] : [Fals]};
          return [Tru, Fals];
        }

      module.equals =
        function (x, y)
        {
          if (x === Num && y === Num)
          {
            return [Tru, Fals];
          }
          return [];
        }

//      module.neqq =
//        function (x, y)
//        {
//          if (x === Tru || x === Fals || x === Nul) {return (x !== y) ? [Tru] : [Fals]};
//          return [Tru, Fals];
//        }

//      module.neq =
//        function (x, y)
//        {
//          if (x === Num && y === Num)
//          {
//            return [Tru, Fals];
//          }
//          return [];
//        }

      module.lt =
        function (x, y)
        {
          if (x === Num && y === Num)
          {
            return [Tru,Fals];
          }
          return [];
        }

      module.lte =
        function (x, y)
        {
          if (x === Num && y === Num)
          {
            return [Tru,Fals];
          }
          return [];
        }

      module.gt =
        function (x, y)
        {
          if (x === Num && y === Num)
          {
            return [Tru,Fals];
          }
          return [];
        }
    
      module.gte =
        function (x, y)
        {
          if (x === Num && y === Num)
          {
            return [Tru,Fals];
          }
          return [];
        }
        
      module.neg =
        function (x)
        {
          if (x === Num) {return [Num]};
          return [];
        }

      module.mod =
        function (x)
        {
          if (x === Num) {return [Num]};
          return [];
        }
      
      module.ceil =
        function (x)
        {
          if (x === Num) {return [Num]};
          return [];
        }
      module.quot =
        function (x)
        {
          if (x === Num) {return [Num]};
          return [];
        }
      module.gcd =
        function (x)
        {
          if (x === Num) {return [Num]};
          return [];
        }
      module.log =
        function (x)
        {
          if (x === Num) {return [Num]};
          return [];
        }
      module.isEven =
        function (x)
        {
          if (x === Num) {return [Tru,Fals]};
          return [];
        }
      module.isOdd =
        function (x)
        {
          if (x === Num) {return [Tru,Fals]};
          return [];
        }

      module.not =
        function (x)
        {
          if (x === Fals) { return [Tru]};
          return [Fals];
        }

      module.isNull =
        function (x)
        {
          if (x === Nul) { return [Tru]};
          return [Fals];
        }

      module.isPair =
        function (x)
        {
          if (x instanceof APair) { return [Tru]};
          return [Fals];
        }
      module.isSymbol =
        function (x)
        {
          if (x === Sy) { return [Tru]};
          return [Fals];
        }
      module.car =
        function (x)
        {
          if (x instanceof APair) { return x.cars.values() };
          return [];
        }
      module.cdr =
        function (x)
        {
          if (x instanceof APair) { return x.cdrs.values() };
          return [];
        }
      module.reverse =
        function (x)
        {
          if (x instanceof APair) { return new APair(x.cars.join(x.cdrs), ArraySet.from1(Nul)) };
          return [];
        }
      module.cons =
        function (x,y)
        {
          var xx = (x instanceof APair) ? x.cars.join(x.cdrs) : ArraySet.from1(x); 
          var yy = (y instanceof APair) ? y.cars.join(y.cdrs) : ArraySet.from1(y); 
          return new APair(xx, yy);
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
      
    module.abst1 =
      function (cvalue)
      {
        if (Num.isNum(cvalue))
        {
          return Num;
        }
        if (Tru.isTru(cvalue))
        {
          return Tru;
        }
        if (Fals.isFals(cvalue))
        {
          return Fals;
        }
//        if (Bool.isBool(cvalue))
//        {
//          return Bool;
//        }
        if (Str.isStr(cvalue))
        {
          return Str;
        }
        if (Nul.isNul(cvalue))
        {
          return Nul;
        }
        if (Sy.isSy(cvalue))
        {
          return Sy;
        }
        if (APair.isPair(cvalue))
        {
          return new APair(ArraySet.from1(module.abst1(cvalue.car)), ArraySet.from1(module.abst1(cvalue.cdr)));
//          return new APair();
        }
        return Top;
      }
        
    module.NUMBER = Num;
    module.STRING = Str;
//    module.BOOLEAN = Bool;
    module.SYMBOL = Sy;
    module.TOP = Top;
    module.TRUE = Tru;
    module.FALSE = Fals;
    
    module.toString = function () {return "TypeLattice"}
      
		return module;
	})();
}