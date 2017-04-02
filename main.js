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

    // setup a GLSL programs
    GPU.createProgram("advect", "2d-vertex-shader", "advectShader");
    GPU.createProgram("render", "2d-vertex-shader", "2d-render-shader");

    resetWindow();

    GPU.initFrameBufferForTexture("velocities");

    render();
}

function render(){

    if (!paused) {



        // if (mouseEnable){
        //     gl.uniform1f(mouseEnableLocation, 1);
        //     gl.uniform2f(mouseCoordLocation, mouseCoordinates[0], mouseCoordinates[1]);
        // } else gl.uniform1f(mouseEnableLocation, 0);

        GPU.step("render", []);

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
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    GPU.setSize(width, height);


    GPU.setUniformForProgram("advect" ,"u_textureSize", [width, height], "2f");


    var velocities = new Float32Array(width*height*4);
    GPU.initTextureFromData("velocities", width, height, "FLOAT", velocities, true);

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