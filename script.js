import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

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
const gui = new GUI();
const bloomFolder = gui.addFolder('bloom');
bloomFolder.add(params, 'threshold', 0.0, 1.0).onChange(value => bloomPass.threshold = Number(value));
bloomFolder.add(params, 'strength', 0.0, 3).onChange(value => bloomPass.strength = Number(value));
bloomFolder.add(params, 'radius', 0.0, 1.0).step(0.01).onChange(value => bloomPass.radius = Number(value));

const toneMappingFolder = gui.addFolder('tone mapping');
toneMappingFolder.add(params, 'exposure', 0.1, 2).onChange(value => renderer.toneMappingExposure = Math.pow(value, 4.0));

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
class ClickableSphere {
    constructor(x, y, z, radius, color) {
        this.geometry = new THREE.SphereGeometry(radius, 10, 10);
        this.material = new THREE.MeshBasicMaterial({ color: color, wireframe: true });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(x, y, z);
        this.mesh.layers.enable(BLOOM_SCENE);
    }

    onClick() {
        console.log("Clicked");
    }
}

let strength = 0;

let main_group = new THREE.Group();
Object.entries(sphere_positions).forEach(([key, pos]) => {
    const sphere = new ClickableSphere(...pos, 0.03, 0x99C1F1);
    main_group.add(sphere.mesh);
});

// Model loading
let loader = new GLTFLoader();
loader.load("assets/plant.glb", gltf => {
    let plant_model = gltf.scene;
    plant_model.position.set(0, 0, 0);
    plant_model.scale.set(1, 1, 1);
    plant_model.rotation.set(0, 0, 0);
    main_group.add(plant_model);
});
scene.add(main_group);

// Pointer and event listeners
let pointer = new THREE.Vector2(2, 1);

function pointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

document.addEventListener("pointermove", pointerMove);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});

// Animation loop
const animate = () => {
    requestAnimationFrame(animate);
    strength += 0.02;
    bloomPass.strength = Math.abs(Math.sin(strength) * 0.5 +0.1);
    console.log(bloomPass.strength);
    controls.update();
    render();
}

animate();
