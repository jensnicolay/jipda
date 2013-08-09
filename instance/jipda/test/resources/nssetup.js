var solver = null;

function setupNavierStokes()
{
    solver = new FluidField();
    solver.setResolution();
    return solver.setResolution();
}

function FluidField()
{

    function reset()
    {
        for (var i = 0; i < 20; i++);
    }
    this.setResolution = function ()
    {
      reset();
      return true;
    }
    this.setResolution();
}

setupNavierStokes();
