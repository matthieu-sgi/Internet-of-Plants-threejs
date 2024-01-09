import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
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


// CSS2DRenderer setup
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize( window.innerWidth, window.innerHeight );
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';

const sphere_positions = {
    "electronic": [-0.051, 0.178, 0.065],
    "plant_species": [0.050, 0.272, 0.052],
    "touch_interaction": [-0.265, 0.852, -0.206],
    "humidity": [0.055, 0.506, 0.018],
};



const spheres_description = {
    "electronic": {desc : "The electronic part of the project is composed of an ESP32, a amplification circuit with a speaker and a electronical filter to capture the touch interaction with the plant.",
                        link: "https://github.com/matthieu-sgi/Internet-of-Plants/tree/main/hardware/pcb"},
    "plant_species": {desc : "The plant species used in this project is the Pachira Glabra.",
                        link: "https://en.wikipedia.org/wiki/Pachira_glabra"},
    "touch_interaction": {desc : "The touch interaction is captured by the ESP32 and sent to the computer via a websocket.",
                            link: "https://www.google.com"},
    "humidity": {desc : "The humidity is measured using a capacitive sensor and sent to the computer via a websocket.",
                    link: "https://www.google.com"},

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
// camera.lookAt(scene.position);
moveCamera(-1.05,  0, 0.1);
// camera.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0.2);
// scene.y -= 10;

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
    labelRenderer.render(scene, camera);

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
        this.create2DLabel();
        this.mesh.layers.enable(BLOOM_SCENE);
        console.log(this.mesh.position);
        console.log(x, y, z);

    }
    create2DLabel() {
        this.description_div = document.createElement('div');
        this.description_div.className = 'label';
        this.description_div.textContent = spheres_description[this.name]["desc"];
    
        this.description_label = new CSS2DObject(this.description_div);
        // Set the label's position based on the sphere's coordinates
        this.description_label.position.set(this.mesh.position.x, this.mesh.position.y*0.1, this.mesh.position.z);
        this.description_label.scale.set(1, 1, 1);
        // Hide the label by default
        this.description_label.element.style.visibility = "hidden";
        this.description_label.name = this.name;
        this.mesh.add(this.description_label);
    }

    onClick(){
        console.log("Clicked : " + this.name);
        // Open the link in a new tab
        let link = document.createElement('a');
        link.href = spheres_description[this.name]["link"];
        link.target = "_blank";
        link.click();

    }
    onHover(){
        console.log("Hovered : " + this.name);
        this.material.color.setHex(0x00ff00);
        this.description_label.element.style.visibility = "visible";
        // Add text in description box
        // let description_box = document.getElementsByClassName("description");
        // description_box[0].innerHTML = spheres_description[this.name];
    }
    defaultState(){
        this.material.color.setHex(0x99C1F1);
        this.description_label.element.style.visibility = "hidden";
        // let description_box = document.getElementsByClassName("description");
        // description_box[0].innerHTML = "";
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
    spheres[key] = new_sphere;
    spheres_group.add(spheres[key].mesh);
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
main_group.position.set(0, -0.5, 0);
scene.add(main_group);

let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2(2,1);
let intersected_objects = [];

function getIntersectedSphere(event){
    pointer.x  = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    intersected_objects = raycaster.intersectObjects(main_group.children, true);


    if (intersected_objects.length > 0){
        // let intersected_object = intersected_objects[0].object;
        // Get the class of the intersected object
        let intersected_object = intersected_objects[0].object;
        let clickedSphere = Object.values(spheres).find(sphere => sphere.mesh === intersected_object);
        return clickedSphere;
    }
    return false;
}

function pointerMove(event){
    let clickedSphere = getIntersectedSphere(event);
    if (clickedSphere){
        clickedSphere.onHover();
    }else{
        // Put all spheres back to default state
        for (let key in spheres){
            spheres[key].defaultState();
        }
    }
        
    
    if (clickedSphere === false){
    for (let key in spheres){
        spheres[key].defaultState();
    }
}

}
document.addEventListener('pointermove', pointerMove);

// boolean to check if the mouse is down
let mouseDown = false;
function pointerDown(event){
    mouseDown = true;

    let clickedSphere = getIntersectedSphere(event);
    if (clickedSphere){
        clickedSphere.onClick();
    }

    
}
document.addEventListener('pointerdown', pointerDown);

function pointerUp(event){
    mouseDown = false;
}
document.addEventListener('pointerup', pointerUp);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});
let strength = 0;
// Animation loop

document.getElementById("labels").appendChild(labelRenderer.domElement);
const animate = () => {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.0004;
    // main_group.rotation.x = time;
    if (!mouseDown){
        main_group.rotation.y = time * 0.3;

    }
    // Make the spheres rotate
    // for (let key in spheres){
    //     spheres[key].mesh.rotation.y = -time;
    // }

    strength += 0.02;
    bloomPass.strength = Math.abs(Math.sin(strength) * 0.5 +0.1);
    // console.log(bloomPass.strength);
    controls.update();
    render();
}

animate();
