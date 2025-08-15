const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let box = 20;
let snake = [{ x: 9 * box, y: 10 * box }];
let direction;
let food = randomFood();
let score = 0;
let level = 1;
let speed = 150;

document.addEventListener("keydown", setDirection);

function setDirection(e) {
    if (e.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
    else if (e.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
    else if (e.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
    else if (e.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
}

function randomFood() {
    return {
        x: Math.floor(Math.random() * 20) * box,
        y: Math.floor(Math.random() * 20) * box
    };
}

function drawSnake() {
    for (let i = 0; i < snake.length; i++) {
        let gradient = ctx.createLinearGradient(snake[i].x, snake[i].y, snake[i].x + box, snake[i].y + box);
        gradient.addColorStop(0, "#0ff");
        gradient.addColorStop(1, "#0aa");
        ctx.fillStyle = gradient;
        ctx.fillRect(snake[i].x, snake[i].y, box, box);
    }
}

function drawFood() {
    let gradient = ctx.createRadialGradient(food.x + 10, food.y + 10, 2, food.x + 10, food.y + 10, 10);
    gradient.addColorStop(0, "#f00");
    gradient.addColorStop(1, "rgba(255,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(food.x + 10, food.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSnake();
    drawFood();

    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if (direction === "LEFT") snakeX -= box;
    if (direction === "UP") snakeY -= box;
    if (direction === "RIGHT") snakeX += box;
    if (direction === "DOWN") snakeY += box;

    if (snakeX === food.x && snakeY === food.y) {
        score++;
        food = randomFood();
        levelUpCheck();
    } else {
        snake.pop();
    }

    let newHead = { x: snakeX, y: snakeY };

    if (snakeX < 0 || snakeY < 0 || snakeX >= canvas.width || snakeY >= canvas.height || collision(newHead, snake)) {
        clearInterval(game);
        alert("Game Over! Final Score: " + score);
    }

    snake.unshift(newHead);
    document.getElementById("score").innerText = score;
    document.getElementById("level").innerText = level;
}

function collision(head, array) {
    return array.some(segment => segment.x === head.x && segment.y === head.y);
}

function levelUpCheck() {
    if (score % 5 === 0) {
        level++;
        speed = Math.max(50, speed - 20);
        clearInterval(game);
        game = setInterval(draw, speed);
    }
}

let game = setInterval(draw, speed);
