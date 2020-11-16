# FluidSimulation
WebGL shader for mixed grid-particle fluid simulation

Live demo at [apps.amandaghassaei.com/FluidSimulation](http://apps.amandaghassaei.com/FluidSimulation/).

<img style="width:100%" src="dist/img.jpg"/>

This simulation solves the [Navier-Stokes equations](https://en.wikipedia.org/wiki/Navier%E2%80%93Stokes_equations) for incompressible fluids in a GPU fragment shader.
To increase performance, the velocity vector field of the fluid is solved at a lower resolution and linearly interpolated.
I've also added 130,000 [Lagrangian particles](https://en.wikipedia.org/wiki/Lagrangian_particle_tracking) on top of the simulation, with their positions solved for on the GPU as well.

##Instructions

Click and drag to apply a force to the fluid.  Over time, the colored material in the fluid will dissipate:

<img style="width:100%" src="img2.jpg"/>

To learn more about the math involved, check out the following sources:  

- [Real-time ink simulation using a grid-particle method](https://pdfs.semanticscholar.org/84b8/c7b7eecf90ebd9d54a51544ca0f8ff93c137.pdf) - mixing Eulerian and Lagrangian techniques for fluids
- [Fast Fluid Dynamics Simulation on the GPU](http://developer.download.nvidia.com/books/HTML/gpugems/gpugems_ch38.html) - a very well written tutorial about programming the Navier-Stokes equations on a GPU.
Though not WebGL specific, it was still very useful.
- [Fluid Simulation (with WebGL demo)](http://jamie-wong.com/2016/08/05/webgl-fluid-simulation/) - this article has some nice, interactive graphics that helped me debug my code.
- [Stable Fluids](http://www.dgp.toronto.edu/people/stam/reality/Research/pdf/ns.pdf) - a paper about stable numerical methods for evaluating Navier-Stokes on a discrete grid.


By [Amanda Ghassaei](http://www.amandaghassaei.com/), code on [Github](https://github.com/amandaghassaei/FluidSimulation).
                
