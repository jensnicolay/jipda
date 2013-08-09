function Person(n)
{
  this.setName(n);
  Person.prototype.count++;
}
Person.prototype.count = 0;
Person.prototype.setName = function(n)
{
  this.name = n;
}
function Student(n, s)
{
  this.b = Person;
  this.b(n);
  //delete this.b;
  this.studentid = s; //.toString();
}
Student.prototype = new Person(42);

// end of paper example

var s = new Student("jens", 123);
s.name;
