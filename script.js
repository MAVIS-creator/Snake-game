// --- Three.js 3D Snake Game ---

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.set(10, 18, 18);
camera.lookAt(10, 0, 10);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gameCanvas") });
renderer.setSize(500, 500);

// Lighting
const ambientLight = new THREE.AmbientLight(0x00ffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// Game variables
const boxSize = 1;
let snake = [{ x: 9, y: 10 }];
let direction = "RIGHT";
let score = 0;
let level = 1;
let speed = 200;
let obstacles = [];
let food = null;
let isPaused = true;
let game = null;

// Meshes
let snakeMeshes = [];
let foodMesh = null;
let obstacleMeshes = [];

// Materials
const snakeHeadMat = new THREE.MeshPhongMaterial({ color: 0x00ff00, shininess: 80 });
const snakeBodyMat = new THREE.MeshPhongMaterial({ color: 0x00aaff, shininess: 40 });
const foodMat = new THREE.MeshPhongMaterial({ color: 0xff0000, shininess: 100 });
const obstacleMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 10 });

// Helpers
function clearMeshes(meshArray) {
    meshArray.forEach(m => scene.remove(m));
    meshArray.length = 0;
}
function removeMesh(mesh) {
    if (mesh) scene.remove(mesh);
}

// Draw snake
function drawSnake() {
    clearMeshes(snakeMeshes);
    for (let i = 0; i < snake.length; i++) {
        const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        const material = i === 0 ? snakeHeadMat : snakeBodyMat;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(snake[i].x, 0.5, snake[i].y);
        scene.add(mesh);
        snakeMeshes.push(mesh);
    }
}

// Draw food
function drawFood() {
    removeMesh(foodMesh);
    const geometry = new THREE.SphereGeometry(boxSize / 2, 16, 16);
    foodMesh = new THREE.Mesh(geometry, foodMat);
    foodMesh.position.set(food.x, 0.5, food.y);
    scene.add(foodMesh);
}

// Draw obstacles
function drawObstacles() {
    clearMeshes(obstacleMeshes);
    obstacles.forEach(o => {
        const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        const mesh = new THREE.Mesh(geometry, obstacleMat);
        mesh.position.set(o.x, 0.5, o.y);
        scene.add(mesh);
        obstacleMeshes.push(mesh);
    });
}

// Random food
function randomFood() {
    let position;
    do {
        position = {
            x: Math.floor(Math.random() * 20),
            y: Math.floor(Math.random() * 20)
        };
    } while (
        obstacles.some(o => o.x === position.x && o.y === position.y) ||
        snake.some(s => s.x === position.x && s.y === position.y)
    );
    return position;
}

// Generate obstacles
function generateObstacles(level) {
    obstacles = [];
    if (level === 1) return;
    let count = level * 2;
    for (let i = 0; i < count; i++) {
        let ox, oy;
        do {
            ox = Math.floor(Math.random() * 20);
            oy = Math.floor(Math.random() * 20);
        } while (
            snake.some(s => s.x === ox && s.y === oy) ||
            (ox === food?.x && oy === food?.y)
        );
        obstacles.push({ x: ox, y: oy });
    }
}

// Collision
function collision(head, array) {
    return array.some(segment => segment.x === head.x && segment.y === head.y);
}

// Update logic
function update() {
    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if (direction === "LEFT") snakeX -= 1;
    if (direction === "UP") snakeY -= 1;
    if (direction === "RIGHT") snakeX += 1;
    if (direction === "DOWN") snakeY += 1;

    if (snakeX === food.x && snakeY === food.y) {
        score++;
        food = randomFood();
        levelUpCheck();
    } else {
        snake.pop();
    }

    let newHead = { x: snakeX, y: snakeY };

    if (
        snakeX < 0 || snakeY < 0 || snakeX >= 20 || snakeY >= 20 ||
        collision(newHead, snake) ||
        collision(newHead, obstacles)
    ) {
        clearInterval(game);
        alert("Game Over! Final Score: " + score);
        isPaused = true;
        return;
    }

    snake.unshift(newHead);
    document.getElementById("score").innerText = score;
    document.getElementById("level").innerText = level;
}

// Render logic
function render() {
    drawSnake();
    drawFood();
    drawObstacles();
    renderer.render(scene, camera);
}

// Level up
function levelUpCheck() {
    if (score % 5 === 0) {
        level++;
        generateObstacles(level);
        clearInterval(game);
        setTimeout(() => {
            speed = Math.max(50, speed - 20);
            game = setInterval(gameLoop, speed);
            isPaused = false;
        }, 1000);
    }
}

// Controls
document.addEventListener("keydown", function(e) {
    if (e.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
    else if (e.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
    else if (e.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
    else if (e.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
});

// Game loop
function gameLoop() {
    update();
    render();
}

// Start/Pause buttons
document.getElementById("startBtn").addEventListener("click", function () {
    if (isPaused) {
        game = setInterval(gameLoop, speed);
        isPaused = false;
    }
});
document.getElementById("pauseBtn").addEventListener("click", function () {
    if (!isPaused) {
        clearInterval(game);
        isPaused = true;
    }
});

// Initial setup
generateObstacles(level);
food = randomFood();
render();