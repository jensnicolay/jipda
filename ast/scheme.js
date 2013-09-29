var __nodeCounter__ = 0;

function Null()
{
}

Null.prototype.equals =
  function (x)
  {
    return x === this;
  }

Null.prototype.hashCode =
  function ()
  {
    return 11;
  }

Null.prototype.toString =
  function ()
  {
    return "()";
  }

function Sym(name)
{
  this.name = name;
}

Sym.prototype.equals =
  function (x)
  {
    return x === this;
  }

Sym.prototype.hashCode =
  function ()
  {
    return this.name.hashCode();
  }

Sym.prototype.toString =
  function ()
  {
    return this.name;
  }

function Pair(car, cdr)
{
  this.car = car;
  this.cdr = cdr;
}

Pair.toList =
  function (arr)
  {
    var l = new Null();
    for (var i = arr.length - 1; i > -1; i--)
    {
      l = new Pair(arr[i], l);
    }
    return l;  
  }

Pair.prototype.equals =
  function (x)
  {
    return x === this;
  }

Pair.prototype.hashCode =
  function ()
  {
    var prime = 41;
    var result = 1;
    result = prime * result + this.car.hashCode();
    result = prime * result + this.cdr.hashCode();
    return result;    
  }

Pair.prototype.toString =
  function ()
  {
    var ags = HashMap.empty();
    return this.toStringInternal(ags);
  }

Pair.prototype.toStringInternal =
  function (ags)
  {
    var sb = "(";
    ags = ags.put(this, ags.size());
    var p = this;
    do
    {
      var car = p.car;
      if (car instanceof Pair)
      {
        var result = ags.get(car);
        if (result === undefined)
        {
          sb += car.toStringInternal(ags);
        }
        else
        {
          sb += "*" + result + "*";
        }
      }
      else
      {
        sb += String(car);
      }
      var cdr = p.cdr;
      if (cdr instanceof Pair)
      {
        var result = ags.get(cdr);
        if (result === undefined)
        {
          p = cdr;
          ags = ags.put(p, ags.size());
          sb += " ";
          continue;
        }
        else
        {
          sb += " . °" + result + "°";
          break;
        }
      }
      else if (cdr instanceof Null)
      {
        break;
      }
      else
      {
        sb += " . " + cdr;
        break;
      }
    }
    while (true);
    sb += ")";
    return sb;
  }

function SchemeReader(str)
{
  this.str = str;
  this.pos = -1;
  this.line = 0;
  this.linePos = -1;
}

SchemeReader.prototype.peek =
  function ()
  {
    if (this.pos === this.str.length)
    {
      return null;
    }
    var r = this.str.charAt(this.pos + 1);
    return r;
  }

SchemeReader.prototype.read =
  function ()
  {
    if (this.pos === this.str.length)
    {
      return null;
    }
    var r = this.str.charAt(++this.pos);
    if (r === "\n")
    {
      this.line++;
      this.linePos = -1;
    }
    else
    {
      this.linePos++;
    }
    return r;
  }

function SchemeParser()
{
}

SchemeParser.prototype.parse =
  function (str)
  {
    var tokenizer = new SchemeTokenizer(str);
    var datas = [];
    var data;
    while ((data = tokenizer.next()) !== null)
    {
      datas.push(data);
    }
    return datas;
  }

function SchemeTokenizer(str)
{
  this.reader = new SchemeReader(str);
}

SchemeTokenizer.prototype.next =
  function ()
  {
    var c = this.skipWhitespace();
    return this.parse(c);
  }

SchemeTokenizer.prototype.parse =
  function (c)
  {
    switch (c)
    {
      case "(" : return this.parseList();
      case "'" : return this.parseQuote();
      case "\"" : return this.parseString();
      case "#" : 
      {
        var d = this.reader.read();
        if (d === "t")
        {
          var po = new Boolean(true);
          po.tag = ++__nodeCounter__;
          po.sp = {pos:this.reader.pos - 1, line:this.reader.line, linePos:this.reader.linePos - 1, length:2};
          return po;
        }
        else if (d === "f")
        {
          var po = new Boolean(false);
          po.tag = ++__nodeCounter__;
          po.sp = {pos:this.reader.pos - 1, line:this.reader.line, linePos:this.reader.linePos - 1, length:2};
          return po;
        }
        else if (d === "(")
        {
          return this.parseVector();
        }
        throw new Error("illegal syntax: #" + d);
      }
      case "-" :
      {
        var d = this.reader.peek(); // peek?
        if (Character.isWhitespace(d) || d === ")" || d === "")
        {
          var po = new Sym("-");
          po.tag = ++__nodeCounter__;
          po.sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos, length:1};
          return po;
        }
        return this.parseNumber(c); 
      }
      case "" : return null;
    }
    if (Character.isDigit(c))
    {
      return this.parseNumber(c);
    }
    return this.parseIdentifier(c);
  }

SchemeTokenizer.prototype.parseIdentifier =
  function (c)
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var identifier = c;
    while (!Character.isWhitespace(c = this.reader.peek()) && c !== ")" && c !== "")
    {
      identifier += this.reader.read();
    }
    var po = new Sym(identifier);
    po.tag = ++__nodeCounter__;
    sp.length = identifier.length;
    po.sp = sp;
    return po;
  }

SchemeTokenizer.prototype.parseQuote =
  function ()
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var c = this.reader.read();
    var e = this.parse(c);
    var sym = new Sym("quote");
    sym.tag = ++__nodeCounter__;
    var nll = new Null();
    nll.tag = ++__nodeCounter__;
    var pair = new Pair(e, nll);
    pair.tag = ++__nodeCounter__;
    var po = new Pair(sym, pair);
    po.tag = ++__nodeCounter__;
    sp.length = this.reader.pos - sp.pos;
    po.sp = sp;
    return po;
  }

SchemeTokenizer.prototype.parseString =
  function ()
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var s = "";
    var c;
    while ((c = this.reader.read()) !== "\"")
    {
      if (c === "")
      {
        throw new Error("unmatched \"");
      }
      if (c === "\\")
      {
        c = this.reader.read();
      }
      s += c;
    }
    var po = new String(s);
    po.tag = ++__nodeCounter__;
    sp.length = this.reader.pos - sp.pos + 1;
    po.sp = sp;
    return po;
  }

SchemeTokenizer.prototype.parseNumber =
  function (c)
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var s = c;
//    var dot = false;
    var slash = false;
    while (!Character.isWhitespace(c = this.reader.peek()) && c !== ")" && c !== "")
    {
      s += this.reader.read();
//      dot |= (c === '.');
      slash |= (c === '/');
    }
    var po;
    if (slash)
    {
      throw new Error("TODO");
    }
    var po = new Number(s);
    po.tag = ++__nodeCounter__;
    sp.length = this.reader.pos - sp.pos;
    po.sp = sp;
    return po;
  }

SchemeTokenizer.prototype.parseList =
  function ()
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var lookahead = this.skipWhitespace();
    if (lookahead === ")")
    {
      var po = new Null();
      po.tag = ++__nodeCounter__;
      sp.length = this.reader.pos - sp.pos;
      po.sp = sp;
      return po;
    }
    var es = [];
    do
    {
      var e = this.parse(lookahead);
      es.push(e);
      lookahead = this.skipWhitespace();
      if (lookahead === "")
      {
        throw new Error("unmatched )");
      }
      if (lookahead === ".")
      {
        lookahead = this.skipWhitespace();
        var po = this.parse(lookahead);
        this.reader.read();
        po = es.reduceRight(function (acc, x) {var p=new Pair(x, acc); p.tag=++__nodeCounter__; return p}, po);
        po.tag = ++__nodeCounter__;
        sp.length = this.reader.pos - sp.pos;
        po.sp = sp;
        return po;
      }
    }
    while (lookahead !== ")");
    var nll = new Null();
    nll.tag = ++__nodeCounter__;
    var po = es.reduceRight(function (acc, x) {var p=new Pair(x, acc); p.tag=++__nodeCounter__; return p}, nll);
    po.tag = ++__nodeCounter__;
    sp.length = this.reader.pos - sp.pos;
    po.sp = sp;
    return po;
  }

SchemeTokenizer.prototype.parseVector =
  function ()
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var lookahead = this.skipWhitespace();
    var po;
    if (lookahead === ")")
    {
      po = [];
    }
    else
    {
      po = [];
      do
      {
        var e = this.parse(lookahead);
        po.push(e);
        lookahead = this.skipWhitespace();
      }
      while (lookahead !== ")");
    }
    po.tag = ++__nodeCounter__;
    sp.length = this.reader.pos - sp.pos;
    po.sp = sp;
    return po;    
  }

SchemeTokenizer.prototype.skipWhitespace =
  function ()
  {
    var c;
    while (true)
    {
      while (Character.isWhitespace(c = this.reader.read()));
      if (c === ";")
      {
        c = this.reader.read();
        while ((c = this.reader.read()) !== "\n" && c !== "");
      }
      else
      {
        break;
      }
    }
    return c;
  }