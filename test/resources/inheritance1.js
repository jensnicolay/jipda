// medium.com/@PitaJ JS inheritance patterns

function Animal(type)
{
  this.type = type;
}

Animal.isAnimal = function (obj, type)
{
  if (!Animal.prototype.isPrototypeOf(obj))
  {
    return false;
  }
  return type ? obj.type === type : true;
}

function Dog(name, breed)
{
  Animal.call(this, "dog");
  this.name = name;
  this.breed = breed;
}

Object.setPrototypeOf(Dog.prototype, Animal.prototype);
Dog.prototype.bark = function ()
{
  return "ruff, ruff";
}
Dog.prototype.print = function()
{
  return "The dog " + this.name + " is a " + this.breed;
}
Dog.isDog = function(obj)
{
  return Animal.isAnimal(obj, "dog");
}

var sparkie = new Dog("Sparkie", "Border Collie");

sparkie.name==="Sparkie"
  && sparkie.breed === "Border Collie"
  && sparkie.bark() === "ruff, ruff"
  && sparkie.print() === "The dog Sparkie is a Border Collie"
  && Dog.isDog(sparkie)