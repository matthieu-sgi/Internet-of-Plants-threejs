import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
console.log("Modules loaded");

// Constants and settings
const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const params = {
    threshold: 0,
    strength: 1,
    radius: 0.5,
    exposure: 1
};

const sphere_positions = {
    "electronic": [-0.051, 0.178, 0.065],
    "plant_species": [0.050, 0.272, 0.052],
    "touch_interaction": [-0.265, 0.852, -0.206],
    "humidity": [0.055, 0.506, 0.018],
};

const spheres_description = {
    "electronic": "Electronic",
    "plant_species": "Plant species",
    "touch_interaction": "Touch interaction",
    "humidity": "Humidity",
};

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const canvas = document.getElementById('canvas');
const controls = new OrbitControls(camera, canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 1); // Adding black background

// Light setup
const light = new THREE.AmbientLight(0xffffff, 10);
scene.add(light);

// Camera setup
function moveCamera(x, y, z) {
    camera.position.set(x, y, z);
}
moveCamera(1, 1, 2);
camera.lookAt(scene.position);

// Post-processing setup
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
        uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        defines: {}
    }), 'baseTexture'
);
mixPass.needsSwap = true;

const outputPass = new OutputPass();
const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);
finalComposer.addPass(mixPass);
finalComposer.addPass(outputPass);

// GUI setup
// const gui = new GUI();
// const bloomFolder = gui.addFolder('bloom');
// bloomFolder.add(params, 'threshold', 0.0, 1.0).onChange(value => bloomPass.threshold = Number(value));
// bloomFolder.add(params, 'strength', 0.0, 3).onChange(value => bloomPass.strength = Number(value));
// bloomFolder.add(params, 'radius', 0.0, 1.0).step(0.01).onChange(value => bloomPass.radius = Number(value));

// const toneMappingFolder = gui.addFolder('tone mapping');
// toneMappingFolder.add(params, 'exposure', 0.1, 2).onChange(value => renderer.toneMappingExposure = Math.pow(value, 4.0));

// Bloom effect handling
const darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
const materials = {};

function darkenNonBloomed(obj) {
    if (obj.isMesh && !obj.layers.test(bloomLayer)) {
        materials[obj.uuid] = obj.material;
        obj.material = darkMaterial;
    }
}

function restoreMaterial(obj) {
    if (materials[obj.uuid]) {
        obj.material = materials[obj.uuid];
        delete materials[obj.uuid];
    }
}

// Render function
function render() {
    scene.traverse(darkenNonBloomed);
    bloomComposer.render();
    scene.traverse(restoreMaterial);
    finalComposer.render();
}

// Spheres setup
class ClickableSphere{
    constructor(x,y,z, radius, color, name){
        this.name = name
        this.geometry = new THREE.SphereGeometry(radius, 10, 10);
        this.material = new THREE.MeshBasicMaterial({color: color,
            wireframe: true,
            opacity: 0.5,
            transparent: true});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(x, y, z);
        this.mesh.layers.enable(BLOOM_SCENE);
    }

    onClick(){
        console.log("Clicked : " + this.name);
    }
    onHover(){
        console.log("Hovered : " + this.name);
        this.material.color.setHex(0x00ff00);
        // Add text in description box
        let description_box = document.getElementsByClassName("description");
        description_box[0].innerHTML = spheres_description[this.name];
    }
    defaultState(){
        this.material.color.setHex(0x99C1F1);
        let description_box = document.getElementsByClassName("description");
        description_box[0].innerHTML = "";
    }

}
let main_group = new THREE.Group();
let spheres_group = new THREE.Group();
main_group.add(spheres_group);
// Generate spheres
let spheres = {};
for (let key in sphere_positions){
    // Add sphere with uuid as key

    let new_sphere = new ClickableSphere(sphere_positions[key][0], sphere_positions[key][1], sphere_positions[key][2], 0.03, 0x99C1F1, key);
    // console.log(new_sphere.uuid)
    spheres[key] = new_sphere;
    spheres_group.add(spheres[key].mesh);
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
let intersected_objects = [];
function pointerMove(event){
    pointer.x  = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    intersected_objects = raycaster.intersectObjects(main_group.children, true);

    // console.log(intersected_objects);

    if (intersected_objects.length > 0){
        // console.log(intersected_objects[0].object.name);
        // let intersected_object = intersected_objects[0].object;
        // Get the class of the intersected object
        let intersected_object = intersected_objects[0].object;
        // console.log(intersected_object);
        let clickedSphere = Object.values(spheres).find(sphere => sphere.mesh === intersected_object);
        if (clickedSphere){
            clickedSphere.onHover();
        }else{
            // Put all spheres back to default state
            for (let key in spheres){
                spheres[key].defaultState();
            }
        }
        
    }else{
    for (let key in spheres){
        spheres[key].defaultState();
    }
}

    // console.log(pointer)
}
document.addEventListener('pointermove', pointerMove);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});
let strength = 0;
// Animation loop
const animate = () => {
    requestAnimationFrame(animate);
    strength += 0.02;
    bloomPass.strength = Math.abs(Math.sin(strength) * 0.5 +0.1);
    // console.log(bloomPass.strength);
    controls.update();
    render();
}

animate();
