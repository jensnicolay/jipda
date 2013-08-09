var solver = 123;

function setupNavierStokes()
{
    solver = new FluidField();
    for (var i = 0; i < 20; i++) 1;
}

function FluidField()
{
    this.setResolution = function()
    {
        for (var j = 0; j < 20; j++) 2;
        return true;
    }
    for (var k = 0; k < 20; k++) 3;
}

setupNavierStokes();
solver.setResolution();


// options for global 'visited' when going from single-threaded -> threaded store
// -> add benva to context
// -> thread 'visited' as well