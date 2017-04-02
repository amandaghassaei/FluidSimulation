# ReactionDiffusionShader
WebGL Shader for a Gray-Scott reaction diffusion system

<img src="https://raw.githubusercontent.com/amandaghassaei/ReactionDiffusionShader/master/img.png"/>

Live demo at <a href="http://git.amandaghassaei.com/ReactionDiffusionShader/" target="_blank">git.amandaghassaei.com/ReactionDiffusionShader/</a>

This is a simulation of a <a href="https://en.wikipedia.org/wiki/Reaction%E2%80%93diffusion_system" target="_blank">Gray-Scott reaction-diffusion system</a>, running in a GPU shader.
The parameters for this model are F = 0.0545 and K = 0.062. With these parameters the system forms a mitosis-like pattern, where small cells divide and spread across space.<br/><br/>
Reaction diffusion patterns are interesting, but they can be difficult to control in meaningful ways for design purposes.
In this project I added an underlying vector field that controls the orientation of diffusion across the system to produce directed, global patterns.
Click on the screen to change the location of the sinks in the vector field.<br/>
<br/>
If this simulation is not performing well on your computer, resize your browser's window to make the simulation smaller.<br/><br/>
The math used to created oriented diffusion is this system is discussed in the papers <a href="https://www.sci.utah.edu/publications/SCITechReports/UUSCI-2003-002.pdf" target="_blank">Display of Vector Fields Using a Reaction-Diffusion Model</a>
and <a href="http://www.cs.cmu.edu/~jkh/462_s07/reaction_diffusion.pdf" target="_blank">Reaction-Diffusion Textures</a>.<br/><br/>
More info about ways to control these systems can also be found on <a href="http://www.karlsims.com/rd.html" target="_blank">Karl Sims' Webpage</a>.<br/><br/>
Information about programming a reaction diffusion system on the GPU is here: <a href="https://bl.ocks.org/robinhouston/ed597847175cf692ecce" target="_blank">A reaction-diffusion simulation using WebGL</a>.
<br/><br/>
By <a href="http://www.amandaghassaei.com/" target="_blank">Amanda Ghassaei</a>, code on <a href="https://github.com/amandaghassaei/ReactionDiffusionShader" target="_blank">Github</a>.
                
