 import './style.css';
import Phaser from 'phaser';

const startButton = document.getElementById('startButton');
const continueButton = document.getElementById('continueButton');
const stopButton = document.getElementById('stopButton');

const easyLevel = document.getElementById('easyLevel');
const middleLevel = document.getElementById('middleLevel');
const hardLevel = document.getElementById('hardLevel');

const showLevel = document.getElementById('showLevel');

const points = document.getElementById('points');
let currentPoints = 0;
let pointsInterval = null;

function startCountingPoints() {
  if (pointsInterval !== null) return; 
  pointsInterval = setInterval(() => {
    currentPoints += 1;
    points.textContent = currentPoints;
  }, 1000);
}

function stopCountingPoints() {
  clearInterval(pointsInterval);
  pointsInterval = null;
}

const settings = {
  mass_of_fuel: 5000, // масса топлива
  mass_of_rocket: 500, // масса ракеты (без топлива)
  exhaust_velocity: 2500, // скорость выброса топлива (м/с)
  max_fuel_consumption: 100, // максимальный расход топлива (кг/с)
  time_step: 0.1 // шаг по времени (сек)
};

class GameScene extends Phaser.Scene {
  constructor() {
    super("scene-game");
    this.isRunning = false;
    this.fuel = settings.mass_of_fuel; // масса топлива
    this.speed = 0; // скорость (м/с)
    this.fuelConsumption = 0; // текущий расход топлива (кг/с)
    this.angle = 0; // текущий угол (в радианах)
    this.acceleration = 0; // начальное ускорение
    this.rotationSpeed = 0.5; // скорость поворота при управлении
  }

  preload() {
    this.load.image("bg", "./assets/bg.png");
    this.load.image("rocket", "./assets/rocket.png");
    this.load.image("asteroid", "./assets/asteroid.png");
  }

  create() {
    this.asteroids = this.physics.add.group(); 
    this.asteroidTimer = null;

    this.add.image(0, 0, "bg").setOrigin(0, 0);
    
    this.player = this.physics.add.image(500, 475, "rocket").setOrigin(0.5, 0.5);
    this.player.setCollideWorldBounds(true);
    this.player.setRotation(this.angle);
  
    this.player.body.setSize(30, 60); 
    
    this.physics.add.overlap(this.player, this.asteroids, (player, asteroid) => {
      if (this.isRunning) {
        this.gameOver();
      }
    }, null, this);

    this.cursor_up = this.input.keyboard.addKey("UP");
    this.cursor_down = this.input.keyboard.addKey("DOWN");
    this.cursor_left = this.input.keyboard.addKey("LEFT");
    this.cursor_right = this.input.keyboard.addKey("RIGHT");

    startButton.addEventListener("click", () => {
      this.isRunning = true;
      this.asteroids.clear(true, true);
      this.resetSimulation();
      this.player.setPosition(500, 475);
      this.angle = 0;
      this.player.setRotation(this.angle);
      currentPoints = 0;
      points.textContent = currentPoints;
      stopCountingPoints();
      this.startAsteroidSpawning();
      startCountingPoints();
    });

    stopButton.addEventListener("click", () => {
      this.isRunning = false;
      this.asteroids.getChildren().forEach(asteroid => {
        asteroid.body.setVelocity(0, 0);
      });
      this.stopAsteroidSpawning();
      stopCountingPoints();
    });
      
    continueButton.addEventListener("click", () => {
      this.isRunning = true;
      this.asteroids.getChildren().forEach(asteroid => {
        asteroid.body.setVelocityY(Phaser.Math.Between(50, 120));
      });
      this.startAsteroidSpawning();
      startCountingPoints();
    });

    easyLevel.addEventListener("click", () => { 
      settings.time_step = 0.1; 
      showLevel.textContent = "Легкий"; 
    });
    
    middleLevel.addEventListener("click", () => { 
      settings.time_step = 0.3; 
      showLevel.textContent = "Средний"; 
    });
    
    hardLevel.addEventListener("click", () => { 
      settings.time_step = 0.6; 
      showLevel.textContent = "Сложный"; 
    });
  }

  spawnAsteroid() {
    const x = Phaser.Math.Between(0, this.sys.game.config.width - 50); 
    const asteroid = this.asteroids.create(x, -50, 'asteroid'); 
    asteroid.setOrigin(0.5, 0.5);
    asteroid.setVelocityY(Phaser.Math.Between(50, 120));
    const scale = Phaser.Math.FloatBetween(1.1, 0.8);
    asteroid.setScale(scale);
    const radius = (asteroid.displayWidth / 2 + 10) * 0.8;
    asteroid.body.setCircle(radius);
  }

  startAsteroidSpawning() {
    if (this.asteroidTimer) return; 
    this.asteroidTimer = this.time.addEvent({
      delay: 1000,
      callback: this.spawnAsteroid,
      callbackScope: this,
      loop: true
    });
  }
  
  stopAsteroidSpawning() {
    if (this.asteroidTimer) {
      this.asteroidTimer.remove();
      this.asteroidTimer = null;
    }
  }

  gameOver() {
    this.isRunning = false;
    this.stopAsteroidSpawning();
    alert(`Столкновение с астероидом. Конец игры. Ваш счёт: ${currentPoints}`);
    this.asteroids.clear(true, true);
    this.resetSimulation();
    this.player.setPosition(500, 475);
    this.angle = 0;
    this.player.setRotation(this.angle);
    currentPoints = 0;
    points.textContent = currentPoints;
    stopCountingPoints();
  }

  update() {
    if (!this.isRunning) return;

    // Стрелки для вращения ракеты
    if (this.cursor_left.isDown) {
      this.angle -= this.rotationSpeed * settings.time_step;
      this.player.setRotation(this.angle);
    }
    if (this.cursor_right.isDown) {
      this.angle += this.rotationSpeed * settings.time_step;
      this.player.setRotation(this.angle);
    }
  
    // Ограничиваем скорость ракеты
    const maxSpeed = 300;
    if (this.speed > maxSpeed) this.speed = maxSpeed;
    if (this.speed < -maxSpeed) this.speed = -maxSpeed;
  
    // Определение направления движения
    const dirX = Math.sin(this.angle);
    const dirY = -Math.cos(this.angle);

    // Обновляем координаты ракеты
    // dx = v * dt
    const dx = dirX * this.speed * settings.time_step; // смещение по оси
    const dy = dirY * this.speed * settings.time_step;

    this.player.x += dx; // изменение координат
    this.player.y += dy;

    // Применяем демпфирование (сопротивление воздуха)
    // v = v * damping
    const damping = 0.98;
    this.speed *= damping;
  
    this.asteroids.children.iterate((asteroid) => {
      if (asteroid && asteroid.y > this.sys.game.config.height + 50) {
        this.asteroids.remove(asteroid, true, true);
      }
    });

    const currentMass = settings.mass_of_rocket + this.fuel; // масса ракеты (ракета + топливо)

    if (this.cursor_down.isDown && this.fuel > 0) {
      // Расчет расхода топлива (μ = |Δm / Δt|)
      this.fuelConsumption -= 0.002 * settings.max_fuel_consumption;
    }
    
    if (this.cursor_up.isDown && this.fuel > 0) {
      // Расчет расхода топлива (μ = |Δm / Δt|)
      this.fuelConsumption += 0.002 * settings.max_fuel_consumption;
    } 

    if (!this.cursor_up.isDown && !this.cursor_down.isDown && this.fuel > 0) {
      if (this.fuelConsumption > 0) {
        this.fuelConsumption = Math.max(0, this.fuelConsumption - 0.002 * settings.max_fuel_consumption);
      } else if (this.fuelConsumption < 0) {
        this.fuelConsumption = Math.min(0, this.fuelConsumption + 0.002 * settings.max_fuel_consumption);
      }
    }

    if (this.fuel === 0) {
      this.fuelConsumption = 0;
    }
    
    // Тяга F = u * μ
    const thrust = settings.exhaust_velocity * this.fuelConsumption;

    // Расчет ускорения по формуле Мещерского: a = -(F / m(t))
    this.acceleration = -(thrust / currentMass);

    // Обновляем скорость (метод Эйлера)
    this.speed -= this.acceleration * settings.time_step;

    // Обновляем массу топлива
    this.fuel -= Math.abs(this.fuelConsumption) * settings.time_step;
    if (this.fuel < 0) this.fuel = 0;
  }

  resetSimulation() {
    this.fuel = settings.mass_of_fuel;
    this.speed = 0;
    this.acceleration = 0;
    this.fuelConsumption = 0;
  }
}

const config = {
  type: Phaser.WEBGL,
  width: 1000,
  height: 600,
  canvas: document.getElementById('gameCanvas'),
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [GameScene]
};

const game = new Phaser.Game(config);