function Null()
{
}

function Pair(car, cdr)
{
  this.car = car;
  this.cdr = cdr;
}

function PushbackReader(str)
{
  this.str = str;
  this.pos = -1;
  this.line = 0;
  this.linePos = -1;
}

PushbackReader.prototype.read =
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
  }

PushbackReader.prototype.unread =
  function ()
  {
    var r = this.str.charAt(this.pos);
    if (r === "\n")
    {
      throw new Error("unsupported");
    }
    this.pos--;
    this.linePos--;
  }

function SchemeParser(str)
{
  this.reader = new PushhbackReader(str);
}

SchemeParser.prototype.next =
  function ()
  {
    var c = this.skipWhitespace();
    return this.parse(c);
  }

SchemeParser.prototype.all =
  function ()
  {
    var datas = [];
    var data;
    while ((data = this.next()) !== null)
    {
      datas.push(data);
    }
    return datas;
  }

SchemeParser.prototype.parse =
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
          po.sp = {pos:this.reader.pos - 1, line:this.reader.line, linePos:this.reader.linePos - 1, length:2};
          return po;
        }
        else if (d === "f")
        {
          var po = new Boolean(false);
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
        var d = this.reader.read(); // peek?
        if (Character.isWhitespace(d) || d === ")" || d === null)
        {
          this.reader.unread();
          var po = new Sym("-");
          po.sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos, length:1};
          return po;
        }
        this.reader.unread();
        return this.parseNumber(c);
      }
      case null : return null;
    }
    if (Character.isDigit(c))
    {
      return this.parseNumber(c);
    }
    return parseIdentifier(c);
  }

SchemeParser.prototype.parseIdentifier =
  function (c)
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var identifier = c;
    while (!Character.isWhitespace(c = this.reader.read()) && c !== ")" && c !== null)
    {
      identifier += c;
    }
    if (c === ")")
    {
      this.reader.unread();
    }
    var po = new Sym(identifier);
    sp.length = identifier.length;
    po.sp = sp;
    return po;
  }

SchemeParser.prototype.parseQuote =
  function ()
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var c = this.reader.read();
    var e = this.parse(c);
    var po = Pair.cons(new Sym("quote"), Pair.cons(e, new Null()));
    sp.length = this.reader.pos - sp.pos;
    po.sp = sp;
    return po;
  }

SchemeParser.prototype.parseString =
  function ()
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var s = "";
    var c;
    while ((c = this.reader.read()) !== "\"")
    {
      if (c === null)
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
    sp.length = this.reader.pos - sp.pos + 1;
    po.sp = sp;
    return po;
  }

SchemeParser.prototype.parseNumber =
  function ()
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var s = c;
//    var dot = false;
    var slash = false;
    while (!Character.isWhitespace(c = this.reader.read()) && c !== ")" && c !== null)
    {
      s += c;
//      dot |= (c === '.');
      slash |= (c === '/');
    }
    if (c === ")")
    {
      this.reader.unread();
    }
    var po;
    if (slash)
    {
      throw new Error("TODO");
    }
    var po = new Number(s);
    sp.length = this.reader.pos - sp.pos;
    po.sp = sp;
    return po;
  }

SchemeParser.prototype.parseList =
  function ()
  {
    var sp = {pos:this.reader.pos, line:this.reader.line, linePos:this.reader.linePos};
    var lookahead = this.skipWhitespace();
    if (lookahead === ")")
    {
      var po = new Null();
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
      if (lookahead === null)
      {
        throw new Error("unmatched )");
      }
      if (lookahead === ".")
      {
        lookahead = this.skipWhitespace();
        var po = this.parse(lookahead);
        this.reader.read();
        po = es.reduceRight(function (acc, x) {return new Pair(x, acc)}, po);
        sp.length = this.reader.pos - sp.pos;
        po.sp = sp;
        return po;
      }
    }
    while (lookahead !== ")");
    var po = es.reduceRight(function (acc, x) {return new Pair(x, acc)}, new Null());
    sp.length = this.reader.pos - sp.pos;
    po.sp = sp;
    return po;
  }

SchemeParser.prototype.parseVector =
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
    sp.length = this.reader.pos - sp.pos;
    po.sp = sp;
    return po;    
  }

SchemeParser.prototype.skipWhitespace =
  function ()
  {
    var c;
    while (true)
    {
      while (Character.isWhitespace(c = this.reader.read()));
      if (c === ";")
      {
        c = this.reader.read();
        while ((c = this.reader.read()) !== "\n" && c !== null);
      }
      else
      {
        break;
      }
    }
    return c;
  }
  
//  public static void main(String[] args)
//  {
//    String source = "(define a 1) (define b 2)\n; hhello\n;form me";
//    SpParser2 spParser = new SpParser2(source);
//    Object sp = spParser.next();
//    System.out.println(sp);
//    sp = spParser.next();
//    System.out.println(sp);
//    sp = spParser.next();
//    System.out.println(sp);
//    sp = spParser.next();
//    System.out.println(sp);
//    System.out.println(spParser.getSps());
//  }
