import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
    import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
    import { EffectComposer } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js";
    import { RenderPass } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js";
    import { UnrealBloomPass } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js";
    import { RGBELoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/RGBELoader.js";

    // === Renderer (HD / HDR / Shadows) ===
    const canvas = document.getElementById("gameCanvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // === Scene & Camera ===
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(13, 22, 24);
    camera.lookAt(10, 0, 10);

    // Controls (dev-friendly)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 18;
    controls.maxDistance = 50;

    // === HDR Environment (realistic reflections) ===
    // Poly Haven HDRI (small, CORS-friendly)
    await new Promise((res, rej) => {
      new RGBELoader()
        .setDataType(THREE.UnsignedByteType)
        .load(
          "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr",
          (hdr) => {
            const pmrem = new THREE.PMREMGenerator(renderer);
            const envMap = pmrem.fromEquirectangular(hdr).texture;
            scene.environment = envMap;
            hdr.dispose();
            pmrem.dispose();
            res();
          },
          undefined,
          rej
        );
    });

    // === Lights (cinematic) ===
    const ambient = new THREE.AmbientLight(0xbfefff, 0.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(8, 18, 12);
    keyLight.castShadow = true;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 60;
    keyLight.shadow.mapSize.set(2048, 2048);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x66ccff, 0.4);
    rimLight.position.set(-12, 10, -10);
    scene.add(rimLight);

    // === Postprocessing (Bloom) ===
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.85, // strength
      0.6,  // radius
      0.85  // threshold
    );
    composer.addPass(bloom);

    // === Floor / Grid (subtle, premium) ===
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        metalness: 0.2,
        roughness: 0.9
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(20, 20, 0x00ffff, 0x004455);
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    grid.position.set(10, 0.002, 10); // Center the grid
    scene.add(grid);

    // Tron-style glowing arena
    const borderSize = 20;  // Arena size
    const borderHeight = 2; // Frame height

    // Create the edges geometry (wireframe outline)
    const edges = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(borderSize, borderHeight, borderSize)
    );

    // Neon material
    const borderMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,  // Bright cyan
        linewidth: 2
    });

    const borderMesh = new THREE.LineSegments(edges, borderMaterial);
    borderMesh.position.set(borderSize / 2, borderHeight / 2, borderSize / 2);
    scene.add(borderMesh);

    // Add a glow effect using a slightly bigger transparent box
    const glowGeometry = new THREE.BoxGeometry(borderSize * 1.02, borderHeight, borderSize * 1.02);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.08
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(borderMesh.position);
    scene.add(glowMesh);

    // === Game State ===
    const N = 20;              // grid size
    const boxSize = 0.95;      // world size per cell
    const yLift = 0.55;

    let snake = [{ x: 9, y: 10 }];
    let direction = "RIGHT";
    let score = 0;
    let level = 1;
    let baseSpeed = 170; // ms per step, will reduce with level
    let stepMs = baseSpeed;
    let obstacles = [];
    let food = null;
    let isPaused = true;
    let lastStep = 0;

    // UI
    const scoreEl = document.getElementById("score");
    const levelEl = document.getElementById("level");
    const highScoreEl = document.getElementById("highScore");
    const tipEl = document.getElementById("tip");

    let highScore = Number(localStorage.getItem("snake3d_highscore") || 0);
    highScoreEl.textContent = highScore;

    // === Materials (premium) ===
    // Body: brushed metal with slight tint
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#00a7ff").multiplyScalar(0.7),
      metalness: 0.7,
      roughness: 0.35,
      envMapIntensity: 1.25
    });
    // Head: glossier, darker, with emissive “visor”
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x1b2b3a,
      metalness: 0.85,
      roughness: 0.2,
      envMapIntensity: 1.5,
      emissive: new THREE.Color("#00ffff"),
      emissiveIntensity: 0.2
    });
    // Food: bright emissive (bloom hits this)
    const foodMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color("#ff3366"),
      emissiveIntensity: 1.8,
      metalness: 0.1,
      roughness: 0.25
    });
    // Obstacles: matte rock
    const obstacleMat = new THREE.MeshStandardMaterial({
      color: 0x7b8a93,
      metalness: 0.15,
      roughness: 0.95
    });

    // === Mesh pools ===
    const snakeMeshes = [];
    let foodMesh = null;
    const obstacleMeshes = [];

    // Segment geometry (rounded)
    const bodyGeo = new THREE.CapsuleGeometry(0.42, 0.1, 8, 16);
    const headGeo = new THREE.SphereGeometry(0.5, 24, 18);
    const obstacleGeo = new THREE.DodecahedronGeometry(0.48, 1);
    const foodGeo = new THREE.IcosahedronGeometry(0.42, 2);

    // Helpers
    const toWorldX = (gx) => gx;
    const toWorldZ = (gy) => gy;

    function clearMeshes(list) {
      for (const m of list) scene.remove(m);
      list.length = 0;
    }
    function removeMesh(m) { if (m) scene.remove(m); }

    // Draw snake with soft shadows
    function drawSnake() {
      clearMeshes(snakeMeshes);
      snake.forEach((seg, i) => {
        const m = new THREE.Mesh(i === 0 ? headGeo : bodyGeo, i === 0 ? headMat : bodyMat);
        m.position.set(toWorldX(seg.x), yLift, toWorldZ(seg.y));
        m.castShadow = true;
        m.receiveShadow = false;
        // Face forward-ish
        if (i === 0) {
          if (direction === "LEFT")  m.rotation.y = Math.PI / 2;
          if (direction === "RIGHT") m.rotation.y = -Math.PI / 2;
          if (direction === "UP")    m.rotation.y = 0;
          if (direction === "DOWN")  m.rotation.y = Math.PI;
        }
        scene.add(m);
        snakeMeshes.push(m);
      });
    }

    function drawFood() {
      removeMesh(foodMesh);
      foodMesh = new THREE.Mesh(foodGeo, foodMat);
      foodMesh.position.set(toWorldX(food.x), yLift, toWorldZ(food.y));
      foodMesh.castShadow = true;
      scene.add(foodMesh);
    }

    function drawObstacles() {
      clearMeshes(obstacleMeshes);
      obstacles.forEach(o => {
        const rock = new THREE.Mesh(obstacleGeo, obstacleMat);
        rock.position.set(toWorldX(o.x), yLift, toWorldZ(o.y));
        rock.castShadow = true;
        rock.rotation.set(Math.random()*0.5, Math.random()*Math.PI, Math.random()*0.5);
        scene.add(rock);
        obstacleMeshes.push(rock);
      });
    }

    function collision(head, arr) {
      return arr.some(s => s.x === head.x && s.y === head.y);
    }

    function randomFood() {
      let p;
      do {
        p = { x: Math.floor(Math.random()*N), y: Math.floor(Math.random()*N) };
      } while (
        collision(p, snake) ||
        collision(p, obstacles)
      );
      return p;
    }

    function generateObstacles(level) {
      obstacles = [];
      if (level === 1) return;
      const count = Math.min(6 + level * 2, 40);
      while (obstacles.length < count) {
        const o = { x: Math.floor(Math.random()*N), y: Math.floor(Math.random()*N) };
        if (!collision(o, obstacles) && !collision(o, snake) && (!food || (o.x!==food.x || o.y!==food.y))) {
          obstacles.push(o);
        }
      }
    }

    // === Update ===
    function step() {
      let sx = snake[0].x;
      let sy = snake[0].y;
      if (direction === "LEFT")  sx -= 1;
      if (direction === "RIGHT") sx += 1;
      if (direction === "UP")    sy -= 1;
      if (direction === "DOWN")  sy += 1;

      // Eat
      if (sx === food.x && sy === food.y) {
        score++;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem("snake3d_highscore", String(highScore));
          highScoreEl.textContent = highScore;
        }
        food = randomFood();
        levelUpCheck();
      } else {
        snake.pop();
      }

      const head = { x: sx, y: sy };
      // Game over
      if (
        sx < 0 || sy < 0 || sx >= N || sy >= N ||
        collision(head, snake) || collision(head, obstacles)
      ) {
        isPaused = true;
        tipEl.innerHTML = "<h1>Game Over</h1><p>Press Start to retry</p>";
        tipEl.style.opacity = 1;
        return;
      }

      snake.unshift(head);
      scoreEl.textContent = score;
      levelEl.textContent = level;

      // Re-render meshes
      drawSnake();
      drawFood();
      drawObstacles();
    }

    function levelUpCheck() {
      if (score % 5 === 0) {
        level++;
        stepMs = Math.max(60, baseSpeed - (level-1)*15);
        generateObstacles(level);
      }
    }

    // === Render loop (fixed-step simulation) ===
    function animate(t = 0) {
      requestAnimationFrame(animate);
      controls.update();

      if (!isPaused) {
        if (lastStep === 0) lastStep = t;
        const dt = t - lastStep;
        if (dt >= stepMs) {
          lastStep = t;
          step();
        }
      }
      composer.render();
    }

    // === Input ===
    window.addEventListener("keydown", (e) => {
      const k = e.key;
      if (k === "ArrowLeft"  && direction !== "RIGHT") direction = "LEFT";
      if (k === "ArrowRight" && direction !== "LEFT")  direction = "RIGHT";
      if (k === "ArrowUp"    && direction !== "DOWN")  direction = "UP";
      if (k === "ArrowDown"  && direction !== "UP")    direction = "DOWN";
    });

    // Start/Pause UI
    document.getElementById("startBtn").addEventListener("click", () => {
      if (isPaused) {
        if (tipEl) tipEl.style.opacity = 0;
        // reset if coming from game over
        if (snake.length === 0 || snake[0].x < 0 || snake[0].y < 0 || snake[0].x >= N || snake[0].y >= N) {
          snake = [{ x: 9, y: 10 }];
          score = 0; level = 1; stepMs = baseSpeed;
          generateObstacles(level);
          food = randomFood();
          scoreEl.textContent = score; levelEl.textContent = level;
          drawSnake(); drawFood(); drawObstacles();
        }
        isPaused = false;
        lastStep = 0;
      }
    });
    document.getElementById("pauseBtn").addEventListener("click", () => {
      isPaused = true;
      tipEl.innerHTML = "<h1>Paused</h1><p>Press Start to continue</p>";
      tipEl.style.opacity = 1;
    });

    // === Initial boot ===
    generateObstacles(level);
    food = randomFood();
    drawSnake(); drawFood(); drawObstacles();
    animate();

    // === Resize ===
    window.addEventListener("resize", () => {
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      composer.setSize(window.innerWidth, window.innerHeight);
      bloom.setSize(window.innerWidth, window.innerHeight);
    });