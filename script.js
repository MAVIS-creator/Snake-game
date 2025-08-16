import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("gameCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Scene & camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // important for visibility
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(13, 22, 24);
camera.lookAt(10, 0, 10);

// Simple ambient light so MeshStandardMaterial shows
const ambient = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambient);

// Add a simple cube (snake head)
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
cube.position.set(10, 0.5, 10); // center of arena
scene.add(cube);

// Floor
const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Simple render loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
