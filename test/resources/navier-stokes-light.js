  var solver = null;
  
  function runNavierStokes()
  {
      solver.update();
  }
  
  function setupNavierStokes()
  {
      solver = new FluidField(null);
      solver.setResolution(128, 128);
      solver.setIterations(20);
      solver.reset();
  }
  
  // Code from Oliver Hunt (http://nerget.com/fluidSim/pressure.js) starts here.
  function FluidField(canvas) {
      function addFields(x, s, dt)
      {
          for (var i=0; i<size ; i++ ) x[i] += dt*s[i];
      }
  
      function set_bnd(b, x)
      {
              for (var i = 1; i <= width; i++) {
                  x[i] =  x[i + rowSize];
                  x[i + (height + 1) * rowSize] = x[i + height * rowSize];
              }
  
              for (var j = 1; j <= height; j++) {
                  x[j * rowSize] =  x[1 + j * rowSize];
                  x[(width + 1) + j * rowSize] =  x[width + j * rowSize];
              }
          var maxEdge = (height + 1) * rowSize;
          x[0]                 = 0.5 * (x[1] + x[rowSize]);
          x[maxEdge]           = 0.5 * (x[1 + maxEdge] + x[height * rowSize]);
          x[(width+1)]         = 0.5 * (x[width] + x[(width + 1) + rowSize]);
          x[(width+1)+maxEdge] = 0.5 * (x[width + maxEdge] + x[(width + 1) + height * rowSize]);
      }
  
      function lin_solve(b, x, x0, a, c)
      {
              var invC = 1 / c;
              for (var k=0 ; k<iterations; k++) {
                  for (var j=1 ; j<=height; j++) {
                      var lastRow = (j - 1) * rowSize;
                      var currentRow = j * rowSize;
                      var nextRow = (j + 1) * rowSize;
                      var lastX = x[currentRow];
                      ++currentRow;
                      for (var i=1; i<=width; i++)
                          lastX = x[currentRow] = (x0[currentRow] + a*(lastX+x[++currentRow]+x[++lastRow]+x[++nextRow])) * invC;
                  }
                  set_bnd(b, x);
              }
      }
  
      function diffuse(b, x, x0, dt)
      {
          var a = 0;
          lin_solve(b, x, x0, a, 1 + 4*a);
      }
  
      function dens_step(x, x0, u, v, dt)
      {
          addFields(x, x0, dt);
          diffuse(0, x0, x, dt );
      }
  
      this.update = function () {
          dens_step(dens, dens_prev, u, v, dt);
      }
  
      this.setIterations = function(iters) {
          if (iters > 0 && iters <= 100)
             iterations = iters;
      }
      var iterations = 10;
      var visc = 0.5;
      var dt = 0.1;
      var dens;
      var dens_prev;
      var u;
      var u_prev;
      var v;
      var v_prev;
      var width;
      var height;
      var rowSize;
      var size;
      function reset()
      {
          rowSize = width + 2;
          size = (width+2)*(height+2);
          dens = new Array(size);
          dens_prev = new Array(size);
          u = new Array(size);
          u_prev = new Array(size);
          v = new Array(size);
          v_prev = new Array(size);
          for (var i = 0; i < size; i++)
              dens_prev[i] = u_prev[i] = v_prev[i] = dens[i] = u[i] = v[i] = 0;
      }
      this.reset = reset;
      this.setResolution = function (hRes, wRes)
      {
          var res = wRes * hRes;
          width = wRes;
          height = hRes;
          reset();
          return true;
      }
      this.setResolution(64, 64);
  }
  
  setupNavierStokes();
  runNavierStokes();
  
