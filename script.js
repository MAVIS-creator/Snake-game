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
    let isPaused = true;
    let food = null;

    let highScore = localStorage.getItem("snakeHighScore") || 0;
    document.getElementById("highScore").innerText = highScore;

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
          ctx.drawImage(snakeHeadImg, x, y, box, box);
        } else {
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
      ctx.drawImage(foodImg, food.x, food.y, box, box);
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
        clearInterval(game);
        setTimeout(() => {
          showLevelUp = false;
          speed = Math.max(50, speed - 20);
          game = setInterval(gameLoop, speed);
          isPaused = false;
        }, 1000);
      }
    }

    // Image preload
    const snakeHeadImg = new Image();
    snakeHeadImg.src = "https://upload.wikimedia.org/wikipedia/commons/0/05/Cartoon_snake_head.png";

    const foodImg = new Image();
    foodImg.src = "https://purepng.com/public/uploads/large/purepng.com-red-appleapplefruithealthyred-apple-981524754223syv3f.png";

    const obstacleImg = new Image();
    obstacleImg.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Stone_icon.png/512px-Stone_icon.png";

    function preloadImages(images, callback) {
      let loaded = 0;
      let total = images.length;
      images.forEach(img => {
        img.onload = () => {
          loaded++;
          if (loaded === total) callback();
        };
      });
    }

    preloadImages([snakeHeadImg, foodImg, obstacleImg], () => {
      generateObstacles(level);
      food = randomFood();
      render();
    });

    function gameLoop() {
      update();
      render();
    }

    let game = null;

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