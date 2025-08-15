const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let box = 20;
let snake = [{ x: 9 * box, y: 10 * box }];
let direction = "RIGHT";
let score = 0;
let level = 1;
let speed = 150;
let obstacles = [];
let showLevelUp = false;
let isPaused = true; // Start paused

// Load high score from localStorage
let highScore = localStorage.getItem("snakeHighScore") || 0;
document.getElementById("highScore").innerText = highScore;

// Controls
document.addEventListener("keydown", setDirection);

function setDirection(e) {
    if (e.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
    else if (e.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
    else if (e.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
    else if (e.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
}

function randomFood() {
    let position;
    do {
        position = {
            x: Math.floor(Math.random() * 20) * box,
            y: Math.floor(Math.random() * 20) * box
        };
    } while (
        obstacles.some(o => o.x === position.x && o.y === position.y) ||
        snake.some(s => s.x === position.x && s.y === position.y)
    );
    return position;
}

function generateObstacles(level) {
    obstacles = [];
    if (level === 1) return;

    let count = level * 2;
    for (let i = 0; i < count; i++) {
        let ox, oy;
        do {
            ox = Math.floor(Math.random() * 20) * box;
            oy = Math.floor(Math.random() * 20) * box;
        } while (
            snake.some(s => s.x === ox && s.y === oy) ||
            (ox === food?.x && oy === food?.y)
        );
        obstacles.push({ x: ox, y: oy });
    }
}

function drawSnake() {
    for (let i = 0; i < snake.length; i++) {
        let gradient = ctx.createLinearGradient(
            snake[i].x, snake[i].y, snake[i].x + box, snake[i].y + box
        );
        gradient.addColorStop(0, "#0ff");
        gradient.addColorStop(1, "#00aaff");
        ctx.fillStyle = gradient;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(snake[i].x, snake[i].y, box, box, 6);
        ctx.fill();
        ctx.stroke();
    }
    ctx.lineWidth = 1;
}

function drawFood() {
    let gradient = ctx.createRadialGradient(
        food.x + box / 2, food.y + box / 2, 2,
        food.x + box / 2, food.y + box / 2, box / 2
    );
    gradient.addColorStop(0, "#ff0");
    gradient.addColorStop(0.5, "#f00");
    gradient.addColorStop(1, "rgba(255,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(food.x + box / 2, food.y + box / 2, box / 2, 0, Math.PI * 2);
    ctx.shadowColor = "#f00";
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawObstacles() {
    obstacles.forEach(o => {
        let gradient = ctx.createLinearGradient(
            o.x, o.y, o.x + box, o.y + box
        );
        gradient.addColorStop(0, "#888");
        gradient.addColorStop(1, "#222");
        ctx.fillStyle = gradient;
        ctx.strokeStyle = "#ff0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(o.x, o.y, box, box, 4);
        ctx.fill();
        ctx.stroke();
    });
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
}

function drawLevelUpBanner() {
    if (!showLevelUp) return;
    ctx.font = "bold 40px Orbitron";
    ctx.fillStyle = "#0ff";
    ctx.textAlign = "center";
    ctx.shadowColor = "#0ff";
    ctx.shadowBlur = 20;
    ctx.fillText(`LEVEL ${level}`, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
}

function update() {
    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if (direction === "LEFT") snakeX -= box;
    if (direction === "UP") snakeY -= box;
    if (direction === "RIGHT") snakeX += box;
    if (direction === "DOWN") snakeY += box;

    // Eat food
    if (snakeX === food.x && snakeY === food.y) {
        score++;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem("snakeHighScore", highScore);
            document.getElementById("highScore").innerText = highScore;
        }
        food = randomFood();
        levelUpCheck();
    } else {
        snake.pop();
    }

    let newHead = { x: snakeX, y: snakeY };

    if (
        snakeX < 0 || snakeY < 0 || snakeX >= canvas.width || snakeY >= canvas.height ||
        collision(newHead, snake) ||
        collision(newHead, obstacles)
    ) {
        clearInterval(game);
        if (score > highScore) {
            highScore = score;
            localStorage.setItem("snakeHighScore", highScore);
            document.getElementById("highScore").innerText = highScore;
        }
        alert("Game Over! Final Score: " + score);
        return;
    }

    snake.unshift(newHead);
    document.getElementById("score").innerText = score;
    document.getElementById("level").innerText = level;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSnake();
    drawFood();
    drawObstacles();
    drawLevelUpBanner();
}

function collision(head, array) {
    return array.some(segment => segment.x === head.x && segment.y === head.y);
}

function levelUpCheck() {
    if (score % 5 === 0) {
        level++;
        showLevelUp = true;
        generateObstacles(level);

        setTimeout(() => {
            showLevelUp = false;
            speed = Math.max(50, speed - 20);
            clearInterval(game);
            game = setInterval(gameLoop, speed);
        }, 1000);
    }
}

// Initial setup (order matters!)
generateObstacles(level);
var food = randomFood();
render(); // Show first frame immediately

function gameLoop() {
    update();
    render();
}

let game = null; // Do not start interval yet

// Start button functionality
document.getElementById("startBtn").addEventListener("click", function () {
    if (isPaused) {
        game = setInterval(gameLoop, speed);
        isPaused = false;
    }
});

// Pause button functionality
document.getElementById("pauseBtn").addEventListener("click", function () {
    if (!isPaused) {
        clearInterval(game);
        isPaused = true;
    }
});
