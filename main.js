//used a lot of ideas from https://bl.ocks.org/robinhouston/ed597847175cf692ecce to clean this code up

var width, height;

var lastMouseCoordinates =  [0,0];
var mouseCoordinates =  [0,0];
var mouseEnable = false;

var paused = false;//while window is resizing

var dt = 1;
var dx = 1;
var nu = 1;//viscosity

var GPU;

window.onload = initGL;

function initGL() {

    $("#about").click(function(e){
        e.preventDefault();
        $("#aboutModal").modal('show');
    });

    canvas = document.getElementById("glcanvas");

    canvas.onmousemove = onMouseMove;
    canvas.onmousedown = onMouseDown;
    canvas.onmouseup = onMouseUp;
    canvas.onmouseout = onMouseUp;

    window.onresize = onResize;

    GPU = initGPUMath();

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    // setup a GLSL programs
    GPU.createProgram("advect", "2d-vertex-shader", "advectShader");
    GPU.setUniformForProgram("advect" ,"u_textureSize", [width, height], "2f");
    GPU.setUniformForProgram("advect", "u_dt", dt, "1f");
    GPU.setUniformForProgram("advect", "u_velocity", 0, "1i");
    GPU.setUniformForProgram("advect", "u_material", 1, "1i");

    GPU.createProgram("diverge", "2d-vertex-shader", "divergenceShader");
    GPU.setUniformForProgram("diverge" ,"u_textureSize", [width, height], "2f");
    GPU.setUniformForProgram("diverge", "u_halfReciprocalDx", 1/(2*dx), "1f");
    GPU.setUniformForProgram("diverge", "u_velocity", 0, "1i");

    GPU.createProgram("force", "2d-vertex-shader", "forceShader");
    GPU.setUniformForProgram("force" ,"u_textureSize", [width, height], "2f");
    GPU.setUniformForProgram("force", "u_dt", dt, "1f");
    GPU.setUniformForProgram("force", "u_velocity", 0, "1i");

    GPU.createProgram("jacobi", "2d-vertex-shader", "jacobiShader");
    GPU.setUniformForProgram("jacobi" ,"u_textureSize", [width, height], "2f");
    var alpha = dx*dx/(nu*dt);
    GPU.setUniformForProgram("jacobi", "u_alpha", alpha, "1f");
    GPU.setUniformForProgram("jacobi", "u_reciprocalBeta", 1/(4+alpha), "1f");
    GPU.setUniformForProgram("jacobi", "u_b", 0, "1i");
    GPU.setUniformForProgram("jacobi", "u_x", 1, "1i");

    GPU.createProgram("render", "2d-vertex-shader", "2d-render-shader");
    GPU.setUniformForProgram("render" ,"u_textureSize", [width, height], "2f");
    GPU.setUniformForProgram("render", "u_material", 0, "1i");

    resetWindow();


    render();
}

function render(){

    if (!paused) {

        // Apply the first 3 operators in Equation 12.
        // u = advect(u);
        // u = diffuse(u);
        // u = addForces(u);
        // // Now apply the projection operator to the result.
        // p = computePressure(u);
        // u = subtractPressureGradient(u, p);

        GPU.step("advect", ["velocity", "velocity"], "nextVelocity");//advect velocity
        GPU.swapTextures("velocity", "nextVelocity");
        for (var i=0;i<1;i++){
            GPU.step("jacobi", ["velocity", "velocity"], "nextVelocity");//diffuse velocity
            GPU.step("jacobi", ["nextVelocity", "nextVelocity"], "velocity");//diffuse velocity
        }
        GPU.setProgram("force");
        if (mouseEnable){
            GPU.setUniformForProgram("force", "u_mouseEnable", 1.0, "1f");
            GPU.setUniformForProgram("force", "u_mouseCoord", [mouseCoordinates[0], mouseCoordinates[1]], "2f");
            GPU.setUniformForProgram("force", "u_mouseDir", [mouseCoordinates[0]-lastMouseCoordinates[0],
                mouseCoordinates[1]-lastMouseCoordinates[1]], "2f");
        } else {
            GPU.setUniformForProgram("force", "u_mouseEnable", 0.0, "1f");
        }
        GPU.step("force", ["velocity"], "nextVelocity");
        GPU.swapTextures("velocity", "nextVelocity");

        //compute pressure
        GPU.step("diverge", ["velocity"], "velocityDivergence");//calc velocity divergence
        for (var i=0;i<3;i++){
            GPU.step("jacobi", ["velocityDivergence", "pressure"], "nextPressure");//diffuse velocity
            GPU.step("jacobi", ["velocityDivergence", "nextPressure"], "pressure");//diffuse velocity
        }

        //subtract pressure gradient

        // GPU.step("diffuse", ["material"], "nextMaterial");
        GPU.step("advect", ["velocity", "material"], "nextMaterial");
        // GPU.step("force", ["material"], "nextMaterial");
        GPU.step("render", ["nextMaterial"]);
        GPU.swapTextures("nextMaterial", "material");

    } else resetWindow();

    window.requestAnimationFrame(render);
}

function step(i){
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[(i+1)%2]);
    gl.bindTexture(gl.TEXTURE_2D, states[i%2]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);//draw to framebuffer
}

function onResize(){
    paused = true;
}

function resetWindow(){
    // canvas.width = canvas.clientWidth;
    // canvas.height = canvas.clientHeight;
    // width = canvas.clientWidth;
    // height = canvas.clientHeight;

    GPU.setSize(width, height);

    var velocity = new Float32Array(width*height*4);
    GPU.initTextureFromData("velocity", width, height, "FLOAT", velocity, true);
    GPU.initFrameBufferForTexture("velocity");
    GPU.initTextureFromData("nextVelocity", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("nextVelocity");

    GPU.initTextureFromData("velocityDivergence", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("velocityDivergence");
    GPU.initTextureFromData("pressure", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("pressure");
    GPU.initTextureFromData("nextPressure", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("nextPressure");

    var material = new Float32Array(width*height*4);
    for (var i=0;i<height;i++){
        for (var j=0;j<width;j++){
            var index = 4*(i*width+j);
            material[index] = Math.random();
        }
    }
    GPU.initTextureFromData("material", width, height, "FLOAT", material, true);
    GPU.initFrameBufferForTexture("material");
    GPU.initTextureFromData("nextMaterial", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("nextMaterial");

    paused = false;
}

function onMouseMove(e){
    lastMouseCoordinates = mouseCoordinates;
    mouseCoordinates = [e.clientX, height-e.clientY];
}

function onMouseDown(){
    mouseEnable = true;
}

function onMouseUp(){
    mouseEnable = false;
}