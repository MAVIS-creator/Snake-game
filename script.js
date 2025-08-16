import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js";

async function init() {
    // === Renderer ===
    const canvas = document.getElementById("gameCanvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // === Scene & Camera ===
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(13, 22, 24);
    camera.lookAt(10, 0, 10);

    // === Controls ===
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 18;
    controls.maxDistance = 50;

    // === Lights ===
    scene.add(new THREE.AmbientLight(0xbfefff, 0.35));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1);
    keyLight.position.set(8, 18, 12);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x66ccff, 0.4);
    rimLight.position.set(-12, 10, -10);
    scene.add(rimLight);

    // === Floor & Grid ===
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 0.2, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(20, 20, 0x00ffff, 0x004455);
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    grid.position.set(10, 0.002, 10);
    scene.add(grid);

    // === Tron Arena ===
    const borderSize = 20, borderHeight = 2;
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(borderSize, borderHeight, borderSize));
    const borderMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const borderMesh = new THREE.LineSegments(edges, borderMaterial);
    borderMesh.position.set(borderSize / 2, borderHeight / 2, borderSize / 2);
    scene.add(borderMesh);

    const glowMesh = new THREE.Mesh(
        new THREE.BoxGeometry(borderSize * 1.02, borderHeight, borderSize * 1.02),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.08 })
    );
    glowMesh.position.copy(borderMesh.position);
    scene.add(glowMesh);

    // === Postprocessing ===
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.85, 0.6, 0.85
    );
    composer.addPass(bloom);

    // === Game State ===
    const N = 20;
    const yLift = 0.55;
    let snake = [{ x: 9, y: 10 }];
    let direction = "RIGHT";
    let food = { x: 5, y: 5 };
    let obstacles = [];
    let score = 0, level = 1, baseSpeed = 170, stepMs = baseSpeed, lastStep = 0;
    let isPaused = true;

    // === Materials & Geometries ===
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00a7ff });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x1b2b3a, emissive: 0x00ffff, emissiveIntensity: 0.3 });
    const foodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff3366, emissiveIntensity: 1.8 });
    const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x7b8a93 });
    const bodyGeo = new THREE.CapsuleGeometry(0.42, 0.1, 8, 16);
    const headGeo = new THREE.SphereGeometry(0.5, 24, 18);
    const foodGeo = new THREE.IcosahedronGeometry(0.42, 2);
    const obstacleGeo = new THREE.DodecahedronGeometry(0.48, 1);

    const snakeMeshes = [];
    let foodMesh = null;
    const obstacleMeshes = [];

    const toWorld = (g) => g;

    function clearMeshes(list) { list.forEach(m => scene.remove(m)); list.length = 0; }
    function drawSnake() {
        clearMeshes(snakeMeshes);
        snake.forEach((seg, i) => {
            const m = new THREE.Mesh(i === 0 ? headGeo : bodyGeo, i === 0 ? headMat : bodyMat);
            m.position.set(toWorld(seg.x), yLift, toWorld(seg.y));
            scene.add(m);
            snakeMeshes.push(m);
        });
    }

    function drawFood() {
        if (foodMesh) scene.remove(foodMesh);
        foodMesh = new THREE.Mesh(foodGeo, foodMat);
        foodMesh.position.set(toWorld(food.x), yLift, toWorld(food.y));
        scene.add(foodMesh);
    }

    function drawObstacles() {
        clearMeshes(obstacleMeshes);
        obstacles.forEach(o => {
            const m = new THREE.Mesh(obstacleGeo, obstacleMat);
            m.position.set(toWorld(o.x), yLift, toWorld(o.y));
            scene.add(m);
            obstacleMeshes.push(m);
        });
    }

    function randomFood() {
        let p;
        do { p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
        while (snake.some(s => s.x === p.x && s.y === p.y));
        return p;
    }

    function step() {
        let sx = snake[0].x;
        let sy = snake[0].y;
        if (direction === "LEFT") sx--; else if (direction === "RIGHT") sx++;
        if (direction === "UP") sy--; else if (direction === "DOWN") sy++;

        if (sx === food.x && sy === food.y) { score++; food = randomFood(); } else snake.pop();

        const head = { x: sx, y: sy };
        if (sx < 0 || sy < 0 || sx >= N || sy >= N || snake.some(s => s.x === sx && s.y === sy)) {
            isPaused = true; return;
        }
        snake.unshift(head);

        drawSnake(); drawFood(); drawObstacles();
    }

    function animate(t = 0) {
        requestAnimationFrame(animate);
        controls.update();
        if (!isPaused) {
            const dt = t - lastStep;
            if (dt >= stepMs) { lastStep = t; step(); }
        }
        composer.render();
    }

    window.addEventListener("keydown", (e) => {
        const k = e.key;
        if (k === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
        if (k === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
        if (k === "ArrowUp" && direction !== "DOWN") direction = "UP";
        if (k === "ArrowDown" && direction !== "UP") direction = "DOWN";
    });

    document.getElementById("startBtn").addEventListener("click", () => { isPaused = false; });
    document.getElementById("pauseBtn").addEventListener("click", () => { isPaused = true; });

    drawSnake(); drawFood(); drawObstacles();
    animate();

    window.addEventListener("resize", () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        composer.setSize(window.innerWidth, window.innerHeight);
        bloom.setSize(window.innerWidth, window.innerHeight);
    });
}

init();
