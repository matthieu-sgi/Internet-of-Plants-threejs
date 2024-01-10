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

const velocity_default = 0.003  ;


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
    "acknowledgements": [0.02,0.025, 0.07],
};



const spheres_description = {
    "electronic": {desc : "The electronic part of the project is composed of many elements :\n\
     - an ESP32\n\
     - an amplification circuit with a speaker\n\
     - an electronical filter to capture the touch interaction with the plant\n\
     Click on the sphere to reach the github repository.",
                        link: "https://github.com/matthieu-sgi/Internet-of-Plants/tree/main/hardware"},
    "plant_species": {desc : "The plant species used in this project is the Pachira Glabra.",
                        link: "https://en.wikipedia.org/wiki/Pachira_glabra"},
    "touch_interaction": {desc : "The touch interaction is captured by the ESP32 and sent to the computer via a socket.",
                            link: "https://github.com/matthieu-sgi/Internet-of-Plants/tree/main/software"},
    "humidity": {desc : "The humidity is measured using a capacitive sensor and sent to the computer via a socket.",
                    link: "https://github.com/matthieu-sgi/Internet-of-Plants/tree/main/software"},

    "acknowledgements": {desc : "This project was made by Matthieu SEGUI at the DeVinci Innovation Center.\n\
    To reach the full acknowledgements, click on the sphere.",
                            link: "https://github.com/matthieu-sgi/Internet-of-Plants/blob/main/acknowledgements.md"},


};

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const canvas = document.getElementById('canvas');
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// renderer.setClearColor(0x000000, 1); // Adding black background

// const axis_helper = new THREE.AxesHelper(5);
// scene.add(axis_helper);


// Add background.jpg as background
const loader_texture = new THREE.TextureLoader();
const background_texture = loader_texture.load("assets/background_light.jpg");
background_texture.mapping = THREE.EquirectangularReflectionMapping;
background_texture.colorSpace = THREE.SRGBColorSpace;
scene.background = background_texture;



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
    scene.background = null;
    scene.traverse(darkenNonBloomed);

    bloomComposer.render();
    scene.background = background_texture;


    scene.traverse(restoreMaterial);
    finalComposer.render();
    labelRenderer.render(scene, camera);

}
class CustomTriangleWave extends THREE.Curve{
    constructor(scale=1){
        super();
        this.scale = scale;
    }
    getPoint(t){
        let v_ret = new THREE.Vector3();
        v_ret.x = t;
        v_ret.y = Math.abs((2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * t)));
        v_ret.z = 0;
        return v_ret.multiplyScalar(this.scale);
    }
}
class Background{
    constructor(scale=1){
        const triangularWave = new CustomTriangleWave(scale);


        // Use BufferGeometry and BufferAttribute for efficiency
        // const geometry = new THREE.BufferGeometry().setFromPoints(triangularWave.getPoints(100));

        // const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        
        const geometry = new THREE.TubeGeometry(triangularWave, 100, 1, 1, true);
        const material = new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.DoubleSide});
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 0, 0);

    }


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
        this.description_div.className = 'labels';
        this.description_div.innerText = spheres_description[this.name]["desc"];


    
        this.description_label = new CSS2DObject(this.description_div);
        // Set the label's position based on the sphere's coordinates
        this.description_label.position.set(0.1, 0.1, 0); // Relative to the sphere
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
        // $('html,body').css('cursor', 'pointer');
        document.body.style.cursor = "pointer";
        // Add text in description box
        // let description_box = document.getElementsByClassName("description");
        // description_box[0].innerHTML = spheres_description[this.name];
    }
    defaultState(){
        this.material.color.setHex(0x99C1F1);
        this.description_label.element.style.visibility = "hidden";
        document.body.style.cursor = "default";
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

// Add background
// let background = new Background();
// scene.add(background.mesh);



let loader = new GLTFLoader();
let loaded = false;
let plant_model;
let default_vertices = null;


loader.load("assets/plant_modified.glb", function (gltf) {
    plant_model = gltf.scene;
    // Adjust the position, scale, or rotation if necessary
    plant_model.position.set(0, 0, 0);
    plant_model.scale.set(1, 1, 1);
    plant_model.rotation.set(0, 0, 0);
    main_group.add(plant_model);
    loaded = true;
    default_vertices = plant_model.children[0].geometry.attributes.position.array;
    document.getElementById("loading").style.display = "none";
    // scene.add(plant_model);
},
    function (xhr) {
        //if 100% loaded
        console.log((xhr.loaded / xhr.total * 100) + "% loaded");

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

let target_velocity = velocity_default;

function pointerMove(event){
    let clickedSphere = getIntersectedSphere(event);
    if (clickedSphere){
        clickedSphere.onHover();
        target_velocity = 0;
    }else{
        // Put all spheres back to default state
        for (let key in spheres){
            spheres[key].defaultState();
            target_velocity = velocity_default;
        }
    }
        
    
    if (clickedSphere === false){
    for (let key in spheres){
        spheres[key].defaultState();
        target_velocity = velocity_default;
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
let rotate = 0;
// Animation loop

document.getElementById("labels-container").appendChild(labelRenderer.domElement);


let velocity = velocity_default;


const animate = () => {
    // console.log(loaded)
    requestAnimationFrame(animate);
    if (loaded){
        const time = Date.now() * 0.03;
        // main_group.rotation.x = time;
        if (!mouseDown){
            main_group.rotation.y = rotate;
    
            velocity = THREE.MathUtils.lerp(velocity, target_velocity, 0.1);
    
            rotate += velocity;
    
        }
        // Deform the plant_model mesh
        // console.log("starting deformation");
        // //deform the y position of the vertices of the plant that are above a certain threshold
        // for(let i = 0; i < plant_model.children[0].geometry.attributes.position.array.length; i+=3){
        //     if (plant_model.children[0].geometry.attributes.position.array[i+1] > 0.5){
        //         //randomly deform the vertices
        //         let random_coeff = Math.random() * 0.01;
        //         plant_model.children[0].geometry.attributes.position.array[i+1] += it  Math.sin(time * 0.5) * random_coeff;
        //         // random_coeff = Math.random() * 0.01;
        //         plant_model.children[0].geometry.attributes.position.array[i] +=  Math.sin(time * 0.5) * random_coeff;
        //         plant_model.children[0].geometry.attributes.position.array[i+2] += Math.sin(time * 0.5) * random_coeff;
        //     }
        // }

        

        // // for(let i = 0; i < 100; i++){
        // //     let random_index = Math.floor(Math.random() * plant_model.children[0].geometry.attributes.position.array.length);
        // //     console.log(random_index);
        // //     plant_model.children[0].geometry.attributes.position.array[random_index] += Math.sin(time * 0.5) * 1;
        // // }
        // console.log("ending deformation");
        // plant_model.children[0].geometry.attributes.position.needsUpdate = true;


        // for(let i = 0; i < plant_model.children[0].geometry.attributes.position.array.length; i+=3){
        //     plant_model.children[0].geometry.attributes.position.array[i+1] += Math.sin(time * 0.5) * 0.01;
        // }
        // console.log("vertices", plant_model.children[0].geometry);
        // plant_model.children[0].scale.y = Math.abs(Math.sin(time * 0.5)) + 0.5;




        strength += 0.02;
        bloomPass.strength = Math.abs(Math.sin(strength) * 0.5 +0.5);
    
        controls.update();
        render();        
    }

}

// console.log("Loaded : " + loaded);  

// if (loaded){
animate();
// }
// animate();
