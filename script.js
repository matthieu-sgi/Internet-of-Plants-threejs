import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import {GLTFLoader} from "https://cdn.rawgit.com/mrdoob/three.js/master/examples/jsm/loaders/GLTFLoader.js";

const sphere_positions = {
    "electronic": [-0.051, 0.178, 0.065],
    "plant_species": [0.050, 0.272, 0.052],
    "touch_interaction": [-0.265, 0.852, -0.206],
    "humidity": [0.055, 0.506, 0.018],
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const canvas = document.getElementById('canvas');

const controls = new OrbitControls(camera, canvas);
const renderer = new THREE.WebGLRenderer(
    {
        canvas,
        antialias: true,
        alpha: true
    });
    
    
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( window.devicePixelRatio );
    
function moveCamera(x, y, z) {
    camera.position.set(x, y, z);
}

    // moveCamera(0, 0, 0<);

window.addEventListener('resize', () => {
    // Update the camera
    camera.aspect =  window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update the renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});


const light = new THREE.AmbientLight( 0xffffff, 10 );
scene.add( light );

moveCamera(1, 1, 2);

// Adding black background
renderer.setClearColor(0x000000, 1);

class ClickableSphere{
    constructor(x,y,z, radius, color){
        this.geometry = new THREE.SphereGeometry(radius, 10, 10);
        this.material = new THREE.MeshBasicMaterial({color: color,
            wireframe: true,
            opacity: 0.5,
            transparent: true});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(x, y, z);
        // scene.add(this.mesh);
    }

    onClick(){
        console.log("Clicked");
    }

}
let main_group = new THREE.Group();
// Generate spheres
let spheres = {};
for (let key in sphere_positions){
    spheres[key] = new ClickableSphere(sphere_positions[key][0], sphere_positions[key][1], sphere_positions[key][2], 0.03, 0x99C1F1);
    main_group.add(spheres[key].mesh);
    // scene.add(spheres[key].mesh);
}

let loader = new GLTFLoader();

loader.load("assets/plant.glb", function (gltf) {
    let plant_model = gltf.scene;
    // Adjust the position, scale, or rotation if necessary
    plant_model.position.set(0, 0, 0);
    plant_model.scale.set(1, 1, 1);
    plant_model.rotation.set(0, 0, 0);
    main_group.add(plant_model);
    // scene.add(plant_model);
});
scene.add(main_group);

let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2(2,1);

function pointerMove(event){
    pointer.x  = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    console.log(pointer)
}

document.addEventListener("pointermove", pointerMove)

function checkIntersect(object){
    return raycaster.intersectObject(object, true)

}

intersected_objects = checkIntersect(main_group)



camera.lookAt(scene.position);


const animate = () => {
    // Call animate recursively
    requestAnimationFrame(animate);
    
    // Update the controls
    controls.update();
    
    // Render the scene
    renderer.render(scene, camera);
}

// Call animate for the first time
animate();