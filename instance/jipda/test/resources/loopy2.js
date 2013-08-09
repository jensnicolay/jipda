var solver = 123;

function setupNavierStokes()
{
    solver = new FluidField();
    solver.setResolution(1);
}

function FluidField()
{
    this.setResolution = function()
    {
        for (var i = 0; i < 20; i++);
        return true;
    }
    this.setResolution();
}

setupNavierStokes();
solver.setResolution(2);