/**
 * Created by ghassaei on 9/16/16.
 */

function initThreeView() {

    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10, 100);//-40, 40);
    var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});

    var animationRunning = false;
    var pauseFlag = false;

    init();

    function init() {

        var container = $("#threeContainer");
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.append(renderer.domElement);

        // scene.background = new THREE.Color(0xffffff);
        var directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight1.position.set(100, 0, 100);
        scene.add(directionalLight1);
        // var directionalLight4 = new THREE.DirectionalLight(0xffffff, 0.3);
        // directionalLight4.position.set(0, 0, -100);
        // scene.add(directionalLight4);
        // var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        // directionalLight2.position.set(100, 0, -30);
        // scene.add(directionalLight2);
        // var directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.8);
        // directionalLight3.position.set(-100, 0, -30);
        // scene.add(directionalLight3);
        var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        //scene.fog = new THREE.FogExp2(0xf4f4f4, 1.7);
        //renderer.setClearColor(scene.fog.color);

        camera.up = new THREE.Vector3(0,0,1);
        camera.zoom = 1;
        camera.updateProjectionMatrix();
        camera.position.z = 10;

        renderer.setClearColor(0x000000, 0);

        render();
    }

    function render() {
        if (!animationRunning) {
            _render();
        }
    }

    function startAnimation(callback){
        console.log("starting animation");
        if (animationRunning){
            console.warn("animation already running");
            return;
        }
        animationRunning = true;
        _loop(function(){
                callback();
            _render();
        });

    }

    function pauseAnimation(){
        if (animationRunning) pauseFlag = true;
    }

    function _render(){
        renderer.render(scene, camera);
    }

    function _loop(callback){
        callback();
        requestAnimationFrame(function(){
            if (pauseFlag) {
                pauseFlag = false;
                animationRunning = false;
                console.log("pausing animation");
                render();//for good measure
                return;
            }
            _loop(callback);
        });
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.left = -window.innerWidth / 2;
        camera.right = window.innerWidth / 2;
        camera.top = window.innerHeight / 2;
        camera.bottom = -window.innerHeight / 2;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

        render();
    }

    return {
        render: render,
        onWindowResize: onWindowResize,
        startAnimation: startAnimation,
        pauseAnimation: pauseAnimation,
        scene: scene,
        camera: camera
    }
}