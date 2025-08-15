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
        let x = snake[i].x, y = snake[i].y;
        if (i === 0) {
            // Draw snake head image
            ctx.drawImage(snakeHeadImg, x, y, box, box);
        } else {
            // Glossy gradient for body
            let gradient = ctx.createLinearGradient(x, y, x + box, y + box);
            gradient.addColorStop(0, "#0ff");
            gradient.addColorStop(0.5, "#00aaff");
            gradient.addColorStop(1, "#004466");
            ctx.shadowColor = "#0ff";
            ctx.shadowBlur = 10;
            ctx.fillStyle = gradient;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x, y, box, box, 8);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
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
        ctx.save();
        ctx.shadowColor = "#ff0";
        ctx.shadowBlur = 8;
        ctx.drawImage(obstacleImg, o.x, o.y, box, box);
        ctx.restore();
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

        // Pause the game for 1 second to show the banner
        clearInterval(game);
        setTimeout(() => {
            showLevelUp = false;
            speed = Math.max(50, speed - 20);
            game = setInterval(gameLoop, speed); // Resume game automatically
            isPaused = false; // <-- Fix: ensure game is unpaused after level up
        }, 1000);
    }
}

// Image URLs (replace with your preferred images)
const snakeHeadImg = new Image();
snakeHeadImg.src = "https://img.icons8.com/color/48/000000/snake.png";

const foodImg = new Image();
foodImg.src = "https://img.icons8.com/color/48/000000/apple.png";

const obstacleImg = new Image();
obstacleImg.src = "https://img.icons8.com/color/48/000000/rock.png";

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
