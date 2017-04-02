//used a lot of ideas from https://bl.ocks.org/robinhouston/ed597847175cf692ecce to clean this code up

var width, height;

var mouseCoordLocation;
var mouseCoordinates =  [null, null];
var mouseEnableLocation;
var mouseEnable = false;

var paused = false;//while window is resizing

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
    GPU.setUniformForProgram("advect", "u_dt", 1.0, "1f");
    GPU.setUniformForProgram("advect", "u_velocity", 0, "1i");
    GPU.setUniformForProgram("advect", "u_material", 1, "1i");

    GPU.createProgram("render", "2d-vertex-shader", "2d-render-shader");
    GPU.setUniformForProgram("render" ,"u_textureSize", [width, height], "2f");
    GPU.setUniformForProgram("render", "u_material", 0, "1i");

    resetWindow();


    render();
}

function render(){

    if (!paused) {

        // if (mouseEnable){
        //     gl.uniform1f(mouseEnableLocation, 1);
        //     gl.uniform2f(mouseCoordLocation, mouseCoordinates[0], mouseCoordinates[1]);
        // } else gl.uniform1f(mouseEnableLocation, 0);

        GPU.step("advect", ["velocity", "material"], "advectedMaterial");

        GPU.step("render", ["advectedMaterial"]);

        GPU.swapTextures("advectedMaterial", "material");

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
    for (var i=0;i<height;i++){
        for (var j=0;j<width;j++){
            var index = 4*(i*width+j);
            velocity[index] = i/100;
        }
    }
    GPU.initTextureFromData("velocity", width, height, "FLOAT", velocity, true);
    var material = new Float32Array(width*height*4);
    for (var i=0;i<height;i++){
        for (var j=0;j<width;j++){
            var index = 4*(i*width+j);
            material[index] = Math.random();
        }
    }
    GPU.initTextureFromData("material", width, height, "FLOAT", material, true);
    GPU.initFrameBufferForTexture("material");
    GPU.initTextureFromData("advectedMaterial", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("advectedMaterial");

    paused = false;
}

function onMouseMove(e){
    mouseCoordinates = [e.clientX, height-e.clientY];
}

function onMouseDown(e){
    // gl.useProgram(stepProgram);
    mouseEnable = true;
    mouseCoordinates = [e.clientX, height-e.clientY];
}

function onMouseUp(){
    mouseEnable = false;
}