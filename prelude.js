Array.prototype.map =
    function (f)
    {
      var result = [];
      for (var i = 0; i < this.length; i++)
      {
        result.push(f(this[i]))
      }
      ;
      return result;
    }

Array.prototype.filter =
    function (f)
    {
      var result = [];
      for (var i = 0; i < this.length; i++)
      {
        var x = this[i];
        if (f(x))
        {
          (result.push(x))
        }
      }
      return result;
    }

Array.prototype.indexOf =
    function (x)
    {
      for (var i = 0; i < this.length; i++)
      {
        if (this[i]===x)
        {
          return i
        }
      }
      return -1;
    }
