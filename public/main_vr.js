import * as THREE from "/build/three.module.js";
import {PointerLockControls} from "/jsm/controls/PointerLockControls.js";
import { GLTFLoader } from '/jsm/loaders/GLTFLoader.js';
import { VRButton } from '/jsm/webxr/VRButton.js';

window.performance = window.performance || {};
performance.now = (function() {
    return performance.now       ||
        performance.mozNow    ||
        performance.msNow     ||
        performance.oNow      ||
        performance.webkitNow ||            
        Date.now  /*none found - fallback to browser default */
})();

const socket = io();

const heldKeys = {
    w: 0,
    a: 0,
    s: 0,
    d: 0
}

let myUserId = "";

document.addEventListener('keydown', (evt) => {
    if(evt.key=='w'||evt.key=='a'||evt.key=='s'||evt.key=='d'){
        heldKeys[evt.key] = 1;
    };
})
document.addEventListener('keyup', (evt) => {
    if(evt.key=='w'||evt.key=='a'||evt.key=='s'||evt.key=='d'){
        heldKeys[evt.key] = 0;
    };
})

//Initializes the Peer ID, and connects the user to a room
function initializePeer(){
    const peer = new Peer(undefined, {
        host: '/',
        port: 3004
    });
    
    peer.on('open', id => {
        myUserId = id;
        socket.emit('join-room', 1, id);
    })

    return peer;
}

const peers = {};

//Handles person video feed, also handles sending video feed to new user

const myVideo = document.createElement('video');
myVideo.muted = true;

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    //addVideoStream(myVideo, stream, false);

    const peer = initializePeer()

    //Handles receiving calls
    peer.on('call', call => {
        call.answer(stream);

        const newVideo = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(newVideo, userVideoStream, call.peer);
        })
        call.on('close', () => {
            newVideo.remove();
        })
    })

    //Handles sending calls when new user joins
    socket.on('user-connected', (userId) => {
        connectToNewUser(userId, stream, peer);
    })

    socket.on('user-disconnected', (userId) => {
        if(peers[userId]) peers[userId].close();
    })

    socket.on("playerData", playerPositions => {
        const newTime = performance.now();
        playerPositions.forEach(player => {
            if(player.userId != myUserId && players.has(player.userId)){
                const clientPlayer = players.get(player.userId);
                clientPlayer.setNewValues(player.position, player.quaternion, newTime)
            }
        })
    })
})

//Handles sending a call
function connectToNewUser(userId, stream, peer){
    console.log("Calling another guy")
    const call = peer.call(userId, stream);
    const newVideo = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(newVideo,userVideoStream,userId);
    })
    call.on('close', () => {
        newVideo.remove();
    })

    peers[userId] = call;
}

//Adds a video feed to the grid
function addVideoStream(video, stream, userId) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
        addPlayer(video,userId);
    })
}
/*












*/
//SCENE INFORMATION

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.y = 5;
camera.position.z = 10;
const fpsControls = new PointerLockControls(camera, document.body);
document.body.addEventListener( 'click', function () {
    fpsControls.lock();
}, false );

let mesh;
scene.fog = new THREE.Fog( 0, 1000, 10000 );

const shadowConfig = {

    shadowCameraVisible: false,
    shadowCameraNear: 750,
    shadowCameraFar: 4000,
    shadowBias: - 0.0002

};

// CUBE CAMERA

var cubeRenderTarget = new THREE.WebGLCubeRenderTarget( 128, {
    format: THREE.RGBFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    encoding: THREE.sRGBEncoding
} );
const cubeCamera = new THREE.CubeCamera( 1, 10000, cubeRenderTarget );

// TEXTURES
var textureLoader = new THREE.TextureLoader();

var textureSquares = textureLoader.load( "/things/bright_squares256.png" );
textureSquares.repeat.set( 50, 50 );
textureSquares.wrapS = textureSquares.wrapT = THREE.RepeatWrapping;
textureSquares.magFilter = THREE.NearestFilter;
textureSquares.encoding = THREE.sRGBEncoding;

var textureNoiseColor = textureLoader.load( "/things/disturb.jpg" );
textureNoiseColor.repeat.set( 1, 1 );
textureNoiseColor.wrapS = textureNoiseColor.wrapT = THREE.RepeatWrapping;
textureNoiseColor.encoding = THREE.sRGBEncoding;

var textureLava = textureLoader.load( "/things/lavatile.jpg" );
textureLava.repeat.set( 6, 2 );
textureLava.wrapS = textureLava.wrapT = THREE.RepeatWrapping;
textureLava.encoding = THREE.sRGBEncoding;

// GROUND

var groundMaterial = new THREE.MeshPhongMaterial( {
    shininess: 80,
    color: 0xffffff,
    specular: 0xffffff,
    map: textureSquares
} );

var planeGeometry = new THREE.PlaneBufferGeometry( 100, 100 );

var ground = new THREE.Mesh( planeGeometry, groundMaterial );
ground.position.set( 0, 0, 0 );
ground.rotation.x = - Math.PI / 2;
ground.scale.set( 1000, 1000, 1000 );
ground.receiveShadow = true;
scene.add( ground );

// MATERIALS

var materialLambert = new THREE.MeshPhongMaterial( { shininess: 50, color: 0xffffff, map: textureNoiseColor } );
var materialPhong = new THREE.MeshPhongMaterial( { shininess: 50, color: 0xffffff, specular: 0x999999, map: textureLava } );
var materialPhongCube = new THREE.MeshPhongMaterial( { shininess: 50, color: 0xffffff, specular: 0x999999, envMap: cubeRenderTarget.texture } );

// OBJECTS

var sphereGeometry = new THREE.SphereBufferGeometry( 100, 64, 32 );
var torusGeometry = new THREE.TorusBufferGeometry( 240, 60, 32, 64 );
var cubeGeometry = new THREE.BoxBufferGeometry( 150, 150, 150 );

addObject( torusGeometry, materialPhong, 0, 100, 0, 0 );
addObject( cubeGeometry, materialLambert, 350, 75, 300, 0 );

mesh = addObject( sphereGeometry, materialPhongCube, 350, 100, - 350, 0 );
mesh.add( cubeCamera );

function addObjectColor( geometry, color, x, y, z, ry ) {

    var material = new THREE.MeshPhongMaterial( { color: 0xffffff } );

    return addObject( geometry, material, x, y, z, ry );

}

function addObject( geometry, material, x, y, z, ry ) {

    var tmpMesh = new THREE.Mesh( geometry, material );

    tmpMesh.material.color.offsetHSL( 0.1, - 0.1, 0 );

    tmpMesh.position.set( x, y, z );

    tmpMesh.rotation.y = ry;

    tmpMesh.castShadow = true;
    tmpMesh.receiveShadow = true;

    scene.add( tmpMesh );

    return tmpMesh;

}

var bigCube = new THREE.BoxBufferGeometry( 50, 500, 50 );
var midCube = new THREE.BoxBufferGeometry( 50, 200, 50 );
var smallCube = new THREE.BoxBufferGeometry( 100, 100, 100 );

addObjectColor( bigCube, 0xff0000, - 500, 250, 0, 0 );
addObjectColor( smallCube, 0xff0000, - 500, 50, - 150, 0 );

addObjectColor( midCube, 0x00ff00, 500, 100, 0, 0 );
addObjectColor( smallCube, 0x00ff00, 500, 50, - 150, 0 );

addObjectColor( midCube, 0x0000ff, 0, 100, - 500, 0 );
addObjectColor( smallCube, 0x0000ff, - 150, 50, - 500, 0 );

addObjectColor( midCube, 0xff00ff, 0, 100, 500, 0 );
addObjectColor( smallCube, 0xff00ff, - 150, 50, 500, 0 );

addObjectColor( new THREE.BoxBufferGeometry( 500, 10, 10 ), 0xffff00, 0, 600, 0, Math.PI / 4 );
addObjectColor( new THREE.BoxBufferGeometry( 250, 10, 10 ), 0xffff00, 0, 600, 0, 0 );

addObjectColor( new THREE.SphereBufferGeometry( 100, 32, 26 ), 0xffffff, - 300, 100, 300, 0 );

// MORPHS

var loader = new GLTFLoader();

loader.load( "/things/SittingBox.glb", function ( gltf ) {

    var mesh = gltf.scene.children[ 0 ];

    const mixer = new THREE.AnimationMixer( mesh );

    mixer.clipAction( gltf.animations[ 0 ] ).setDuration( 10 ).play();

    var s = 200;
    mesh.scale.set( s, s, s );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add( mesh );

} );

// LIGHTS

scene.add(new THREE.AmbientLight( 0x3f2806 ));

scene.add(new THREE.PointLight( 0xffaa00, 1, 5000 ));

const sunLight = new THREE.DirectionalLight( 0xffffff, 0.3 );
sunLight.position.set( 1000, 2000, 1000 );
sunLight.castShadow = true;
sunLight.shadow.camera.top = 750;
sunLight.shadow.camera.bottom = - 750;
sunLight.shadow.camera.left = - 750;
sunLight.shadow.camera.right = 750;
sunLight.shadow.camera.near = shadowConfig.shadowCameraNear;
sunLight.shadow.camera.far = shadowConfig.shadowCameraFar;
sunLight.shadow.mapSize.set( 1024, 1024 );
sunLight.shadow.bias = shadowConfig.shadowBias;
scene.add( sunLight );

// SHADOW CAMERA HELPER

const shadowCameraHelper = new THREE.CameraHelper( sunLight.shadow.camera );
shadowCameraHelper.visible = shadowConfig.shadowCameraVisible;
scene.add( shadowCameraHelper );


const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

//Basic Scene Setup
// const light = new THREE.PointLight(0xFFFFFF, 3, 500);
// const offLight = new THREE.PointLight(0xFFFFFF, 1, 500);
// light.position.set(10,5,25);
// offLight.position.set(-10,10,20);
// scene.add(light);
// scene.add(offLight);
// const floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(30,30), new THREE.MeshLambertMaterial({color : 0xff0000}));
// floorPlane.rotation.x = -Math.PI/2;
// scene.add(floorPlane);
/*












*/

//My info
const myInfo = {
    position: [0,100,10],
    rotation: [0,0,0]
}

//Other Players
//const playerIndexes = new Map();
const players = new Map();
function lerpArray(a, b, f){
    //console.log(a, a.map);
    f = Math.min(f, 1.0);
    return a.map((num,index) => {
       return (b[index]-num)*f + num
    })
}

function lerpQuaternion(a, b, f){
    f = Math.min(f, 1.0);
    return a.map((num,index) => {
        if(index == 1){
            if(Math.abs(num)>.9 && Math.abs(num+b[index]) < .1){
                if(f < .5){
                    return(num + (Math.round(num)-num)*(f/.5));
                }else{
                    return(b[index] + (Math.round(b[index])-b[index])*((1-f)/.5));
                }
            }
        }
        return (b[index]-num)*f + num
    })
}


function createPlayer(video){
    const texture = new THREE.VideoTexture(video);
    texture.wrapT = THREE.RepeatWrapping;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;
    const frontMaterial = new THREE.MeshBasicMaterial({map:texture});
    const backMaterial = new THREE.MeshStandardMaterial({color: 0x2222DD})
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(50,50, 20), [backMaterial, backMaterial, backMaterial, backMaterial, backMaterial, frontMaterial]);
    return {
        oldTime: performance.now(),
        previousPosition: [0, 5, 0],
        newPosition: [0, 5, 0],
        previousQuaternion: [0, 0, 0, 1],
        newQuaternion: [0, 0, 0, 1],
        quaternion: [0, 0, 0, 1],
        headMesh,
        update(newTime){
            const f = (newTime - this.oldTime)/(1000/10);
            this.headMesh.position.set(...lerpArray(this.previousPosition, this.newPosition, f));
            this.headMesh.quaternion.set(...lerpQuaternion(this.previousQuaternion, this.newQuaternion, f));
        },
        setNewValues(position, quaternion, time){
            this.previousPosition = this.newPosition;
            this.previousQuaternion = this.newQuaternion;
            this.newPosition = position;
            this.newQuaternion = quaternion;
            this.oldTime = time;
        },
        addToScene(){
            scene.add(this.headMesh);
        }
    }
}

function addPlayer(video,userId){
    if(!players.has(userId)){
        const player = createPlayer(video);
        players.set(userId, player);
        player.addToScene();
    }
}

const speed = 1;
function updateInfo(){
    const quaternion = camera.quaternion;
    const frontBack = new THREE.Vector3( 0, 0, (heldKeys.s-heldKeys.w));
    const rightLeft = new THREE.Vector3((heldKeys.d-heldKeys.a), 0, 0);
    frontBack.applyQuaternion(quaternion);
    rightLeft.applyQuaternion(quaternion);
    const direction = frontBack.add(rightLeft);
    direction.y = 0;
    direction.normalize();
    direction.multiplyScalar(speed);
    myInfo.position[0]+=direction.x;
    myInfo.position[2]+=direction.z;
}

function animate() {
    const newTime = performance.now();
    players.forEach(player => {
        player.update(newTime);
    })

    //Update myInfo (cameraPos) according to input keys
    updateInfo();

    //Update Camera info according to myInfo
    camera.position.set(...myInfo.position);

    //Render CubeMap
    mesh.visible = false;
    cubeCamera.update( renderer, scene );
    mesh.visible = true;
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate()

//Send Data To Server
setInterval(() => {
    socket.emit("movementData", myInfo.position, [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w]);
},1000/20)