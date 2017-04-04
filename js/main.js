//used a lot of ideas from https://bl.ocks.org/robinhouston/ed597847175cf692ecce to clean this code up

var width, height;
var actualWidth, actualHeight;
var body;
var scale = 1;

var lastMouseCoordinates =  [0,0];
var mouseCoordinates =  [0,0];
var mouseEnable = false;
var mouseout = false;

var paused = false;//while window is resizing

var dt = 1;
var dx = 1;
var nu = 1;//viscosity
var rho = 1;//density

var GPU;

var threeView;

window.onload = initGL;

function initGL() {

    $("#about").click(function(e){
        e.preventDefault();
        $("#aboutModal").modal('show');
    });

    canvas = document.getElementById("glcanvas");
    body = document.getElementsByTagName("body")[0];

    canvas.onmousemove = onMouseMove;
    window.onmousedown = onMouseDown;
    window.onmouseup = onMouseUp;
    canvas.onmouseout = function (){
        mouseout = true;
    };
    canvas.onmouseenter = function (){
        mouseout = false;
    };

    window.onresize = onResize;

    threeView = initThreeView();
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial());
    threeView.scene.add(mesh);
    threeView.render();



    GPU = initGPUMath();

    // setup a GLSL programs
    GPU.createProgram("advect", "2d-vertex-shader", "advectShader");
    GPU.setUniformForProgram("advect", "u_dt", dt, "1f");
    GPU.setUniformForProgram("advect", "u_velocity", 0, "1i");
    GPU.setUniformForProgram("advect", "u_material", 1, "1i");

    GPU.createProgram("gradientSubtraction", "2d-vertex-shader", "gradientSubtractionShader");
    GPU.setUniformForProgram("gradientSubtraction", "u_const", 0.5/dx, "1f");//dt/(2*rho*dx)
    GPU.setUniformForProgram("gradientSubtraction", "u_velocity", 0, "1i");
    GPU.setUniformForProgram("gradientSubtraction", "u_pressure", 1, "1i");

    GPU.createProgram("diverge", "2d-vertex-shader", "divergenceShader");
    GPU.setUniformForProgram("diverge", "u_const", 0.5/dx, "1f");//-2*dx*rho/dt
    GPU.setUniformForProgram("diverge", "u_velocity", 0, "1i");

    GPU.createProgram("force", "2d-vertex-shader", "forceShader");
    GPU.setUniformForProgram("force", "u_dt", dt, "1f");
    GPU.setUniformForProgram("force", "u_velocity", 0, "1i");

    GPU.createProgram("addMaterial", "2d-vertex-shader", "addMaterialShader");
    GPU.setUniformForProgram("force", "u_material", 0, "1i");

    GPU.createProgram("jacobi", "2d-vertex-shader", "jacobiShader");
    GPU.setUniformForProgram("jacobi", "u_b", 0, "1i");
    GPU.setUniformForProgram("jacobi", "u_x", 1, "1i");

    GPU.createProgram("render", "2d-vertex-shader", "2d-render-shader");
    GPU.setUniformForProgram("render", "u_material", 0, "1i");

    GPU.createProgram("boundary", "2d-vertex-shader", "boundaryShader");
    GPU.setUniformForProgram("boundary", "u_texture", 0, "1i");

    resetWindow();

    render();
}

function render(){

    if (!paused) {

        // //advect velocity
        GPU.setSize(width, height);
        GPU.setProgram("advect");
        GPU.setUniformForProgram("advect" ,"u_textureSize", [width, height], "2f");
        GPU.setUniformForProgram("advect" ,"u_scale", 1, "1f");
        GPU.step("advect", ["velocity", "velocity"], "nextVelocity");

        GPU.setProgram("boundary");
        GPU.setUniformForProgram("boundary", "u_scale", -1, "1f");
        GPU.step("boundary", ["nextVelocity"], "velocity");
        // GPU.swapTextures("velocity", "nextVelocity");

        //diffuse velocity
        GPU.setProgram("jacobi");
        var alpha = dx*dx/(nu*dt);
        GPU.setUniformForProgram("jacobi", "u_alpha", alpha, "1f");
        GPU.setUniformForProgram("jacobi", "u_reciprocalBeta", 1/(4+alpha), "1f");
        for (var i=0;i<1;i++){
            GPU.step("jacobi", ["velocity", "velocity"], "nextVelocity");
            GPU.step("jacobi", ["nextVelocity", "nextVelocity"], "velocity");
        }

        //apply force
        GPU.setProgram("force");
        if (!mouseout && mouseEnable){
            GPU.setUniformForProgram("force", "u_mouseEnable", 1.0, "1f");
            GPU.setUniformForProgram("force", "u_mouseCoord", [mouseCoordinates[0]*scale, mouseCoordinates[1]*scale], "2f");
            GPU.setUniformForProgram("force", "u_mouseDir", [3*(mouseCoordinates[0]-lastMouseCoordinates[0])*scale,
                3*(mouseCoordinates[1]-lastMouseCoordinates[1])*scale], "2f");
        } else {
            GPU.setUniformForProgram("force", "u_mouseEnable", 0.0, "1f");
        }
        GPU.step("force", ["velocity"], "nextVelocity");

        // GPU.swapTextures("velocity", "nextVelocity");
        GPU.step("boundary", ["nextVelocity"], "velocity");

        // compute pressure
        GPU.step("diverge", ["velocity"], "velocityDivergence");//calc velocity divergence
        GPU.setProgram("jacobi");
        GPU.setUniformForProgram("jacobi", "u_alpha", -dx*dx, "1f");
        GPU.setUniformForProgram("jacobi", "u_reciprocalBeta", 1/4, "1f");
        for (var i=0;i<20;i++){
            GPU.step("jacobi", ["velocityDivergence", "pressure"], "nextPressure");
            GPU.step("jacobi", ["velocityDivergence", "nextPressure"], "pressure");
        }
        GPU.setProgram("boundary");
        GPU.setUniformForProgram("boundary", "u_scale", 1, "1f");
        GPU.step("boundary", ["pressure"], "nextPressure");
        GPU.swapTextures("pressure", "nextPressure");

        // subtract pressure gradient
        GPU.step("gradientSubtraction", ["velocity", "pressure"], "nextVelocity");
        GPU.setProgram("boundary");
        GPU.setUniformForProgram("boundary", "u_scale", -1, "1f");
        GPU.step("boundary", ["nextVelocity"], "velocity");

        // move material
        GPU.setSize(actualWidth, actualHeight);

        //add material
        GPU.setProgram("addMaterial");
        if (!mouseout && mouseEnable){
            GPU.setUniformForProgram("addMaterial", "u_mouseEnable", 1.0, "1f");
            GPU.setUniformForProgram("addMaterial", "u_mouseCoord", mouseCoordinates, "2f");
            GPU.setUniformForProgram("addMaterial", "u_mouseLength", Math.sqrt(Math.pow(3*(mouseCoordinates[0]-lastMouseCoordinates[0]),2)
                +Math.pow(3*(mouseCoordinates[1]-lastMouseCoordinates[1]),2)), "1f");
        } else {
            GPU.setUniformForProgram("addMaterial", "u_mouseEnable", 0.0, "1f");
        }
        GPU.step("addMaterial", ["material"], "nextMaterial");

        GPU.setProgram("advect");
        GPU.setUniformForProgram("advect" ,"u_textureSize", [actualWidth, actualHeight], "2f");
        GPU.setUniformForProgram("advect" ,"u_scale", scale, "1f");
        GPU.step("advect", ["velocity", "nextMaterial"], "material");
        GPU.step("render", ["material"]);

    } else resetWindow();

    window.requestAnimationFrame(render);
}

function onResize(){
    paused = true;
}

function resetWindow(){

    actualWidth = body.clientWidth;
    actualHeight = body.clientHeight;

    var maxDim = Math.max(actualHeight, actualWidth);
    var _scale = Math.ceil(maxDim/150);
    if (_scale < 1) _scale = 1;

    width = Math.floor(actualWidth/_scale);
    height = Math.floor(actualHeight/_scale);

    scale = 1/_scale;

    canvas.width = actualWidth;
    canvas.height = actualHeight;
    canvas.clientWidth = body.clientWidth;
    canvas.clientHeight = body.clientHeight;

    // GPU.setSize(width, height);

    GPU.setProgram("gradientSubtraction");
    GPU.setUniformForProgram("gradientSubtraction" ,"u_textureSize", [width, height], "2f");
    GPU.setProgram("diverge");
    GPU.setUniformForProgram("diverge" ,"u_textureSize", [width, height], "2f");
    GPU.setProgram("force");
    GPU.setUniformForProgram("force", "u_reciprocalRadius", 0.03/scale, "1f");
    GPU.setUniformForProgram("force" ,"u_textureSize", [width, height], "2f");
    GPU.setProgram("addMaterial");
    GPU.setUniformForProgram("addMaterial", "u_reciprocalRadius", 0.03, "1f");
    GPU.setUniformForProgram("addMaterial" ,"u_textureSize", [actualWidth, actualHeight], "2f");
    GPU.setProgram("jacobi");
    GPU.setUniformForProgram("jacobi" ,"u_textureSize", [width, height], "2f");
    GPU.setProgram("render");
    GPU.setUniformForProgram("render" ,"u_textureSize", [actualWidth, actualHeight], "2f");
    GPU.setProgram("boundary");
    GPU.setUniformForProgram("boundary" ,"u_textureSize", [width, height], "2f");

    var velocity = new Float32Array(width*height*4);
    // for (var i=0;i<height;i++){
    //     for (var j=0;j<width;j++){
    //         var index = 4*(i*width+j);
    //         velocity[index] = Math.sin(2*Math.PI*i/200)/10;
    //         velocity[index+1] = Math.sin(2*Math.PI*j/200)/10;
    //     }
    // }
    GPU.initTextureFromData("velocity", width, height, "FLOAT", velocity, true);
    GPU.initFrameBufferForTexture("velocity", true);
    GPU.initTextureFromData("nextVelocity", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("nextVelocity", true);

    GPU.initTextureFromData("velocityDivergence", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("velocityDivergence", true);
    GPU.initTextureFromData("pressure", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("pressure", true);
    GPU.initTextureFromData("nextPressure", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("nextPressure", true);

    var material = new Float32Array(actualWidth*actualHeight*4);
    // for (var i=0;i<actualHeight;i++){
    //     for (var j=0;j<actualWidth;j++){
    //         var index = 4*(i*actualWidth+j);
    //         if (((Math.floor(i/50))%2 && (Math.floor(j/50))%2)
    //             || ((Math.floor(i/50))%2 == 0 && (Math.floor(j/50))%2 == 0)) material[index] = 1.0;
    //     }
    // }
    GPU.initTextureFromData("material", actualWidth, actualHeight, "FLOAT", material, true);
    GPU.initFrameBufferForTexture("material", true);
    GPU.initTextureFromData("nextMaterial", actualWidth, actualHeight, "FLOAT", material, true);
    GPU.initFrameBufferForTexture("nextMaterial", true);

    paused = false;
}

function onMouseMove(e){
    lastMouseCoordinates = mouseCoordinates;
    var x = e.clientX;
    var padding = 10;
    if (x<padding) x = padding;
    if (x>actualWidth-padding) x = actualWidth-padding;
    var y = e.clientY;
    if (y<padding) y = padding;
    if (y>actualHeight-padding) y = actualHeight-padding;
    mouseCoordinates = [x, actualHeight-y];
}

function onMouseDown(){
    mouseEnable = true;
}

function onMouseUp(){
    mouseEnable = false;
}