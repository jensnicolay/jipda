function Books()
{
   var books = [];
   
   this.addBook =
     function (book)
     {
       books.push(book);
     }
   
   this.getNumberOfBooks =
     function ()
     {
       return books.length;
     }
   
   this.getBooksOutOfPrint =
     function ()
     {
       return books.filter(function (book) {return book.outOfPrint});
     }
}

function BookApp(books)
{
  this.books = books;
}

BookApp.prototype.available =
  function ()
  {
    return this.books.getNumberOfBooks() - this.books.getBooksOutOfPrint().length;
  }


///

var books = new Books();
books.addBook({isbn:123325345});
books.addBook({isbn:45694506, outOfPrint:true});
books.addBook({isbn:353534});

var app = new BookApp(books);
app.available();