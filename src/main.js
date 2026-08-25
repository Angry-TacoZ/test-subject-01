import Phaser from "phaser";
import "./style.css";

const GAMEPAD_DEADZONE = 0.22;
const GAMEPAD_MENU_THRESHOLD = 0.65;
const GAMEPAD_SLIDER_STEP = 5;
const BASE_WEAPON_RELOAD_MS = 1500;
const BASE_PLAYER_SPEED = 230;
const PROJECTILE_SPEED = 650;
const PROJECTILE_RADIUS = 4;
const PROJECTILE_DAMAGE = 1;
const PROJECTILE_KNOCKBACK_DISTANCE = 8;
const PROJECTILE_IMPACT_LIFETIME_MS = 120;
const BASE_CRITICAL_CHANCE = 0.05;
const CRITICAL_CHANCE_UPGRADE_STEP = 0.05;
const CRITICAL_DAMAGE_MULTIPLIER = 2;
const DAMAGE_NUMBER_LIFETIME_MS = 650;
const MAX_ACTIVE_DAMAGE_NUMBERS = 64;
const DOUBLE_SHOT_DELAY_MS = 500;
const NANITE_REHAB_HEALING = 1;
const NANITE_REHAB_INTERVAL_MS = 2000;
const SHOTGUN_PELLET_COUNT = 3;
const SHOTGUN_SPREAD_DEGREES = 12;
const SHOTGUN_RANGE = 420;
const SURVIVAL_DURATION_MS = 3 * 60 * 1000;
const ELECTRO_THERAPY_DAMAGE = 2;
const ELECTRO_THERAPY_BASE_COOLDOWN_MS = 5000;
const ELECTRO_THERAPY_CHAIN_RANGE = 180;
const ELECTRO_THERAPY_CHAIN_DELAY_MS = 120;
const ELECTRO_THERAPY_ARC_LIFETIME_MS = 180;
const XP_DROP_RADIUS = PROJECTILE_RADIUS / 2;
const INITIAL_LEVEL_XP_REQUIRED = 5;
const LEVEL_XP_GROWTH = 2;
const HEALTH_UPGRADE_STEP = 20;
const UPGRADE_RATE_STEP = 0.1;
const BASE_MAGNETISM_DISTANCE = 10;
const MAGNETISM_UPGRADE_STEP = 10;
const XP_MAGNET_PULL_SPEED = 240;
const ENEMY_CONTACT_DAMAGE = 1;
const ENEMY_XP_VALUE = 1;
const CHARGER_CONTACT_DAMAGE = 2;
const CHARGER_XP_VALUE = 2;
const CHARGER_FIRST_SPAWN_MS = 30000;
const CHARGER_SPAWN_INTERVAL_MS = 10000;
const CHARGER_LUNGE_COOLDOWN_MS = 10000;
const CHARGER_LUNGE_TRIGGER_DISTANCE = 250;
const CHARGER_LUNGE_DISTANCE = 250;
const CHARGER_LUNGE_SPEED_MULTIPLIER = 4.5;
const ENEMY_COLOR_SYSTEM = {
  circle: {
    name: "crimson",
    body: 0xff334f,
    outline: 0xff9bab,
    glow: 0xff334f,
  },
  charger: {
    name: "vermilion",
    body: 0xff5a36,
    outline: 0xffc0a3,
    glow: 0xff3d25,
  },
};
const SPAWN_RATE_STEP_MS = 20000;
const ENEMY_SPAWN_RATES = [1, 2, 4, 6, 8, 10];
const RARITY_WEIGHTS = {
  common: 1,
  rare: 0.2,
  epic: 0.04,
};
const ENEMY_SPAWN_POINTS = [
  [0.1, 0], [0.3, 0], [0.5, 0], [0.7, 0], [0.9, 0],
  [1, 0.2], [1, 0.4], [1, 0.6], [1, 0.8],
  [0.9, 1], [0.7, 1], [0.5, 1], [0.3, 1], [0.1, 1],
  [0, 0.8], [0, 0.6], [0, 0.4], [0, 0.2],
];

const UPGRADE_DEFINITIONS = [
  {
    id: "health",
    rarity: "common",
    code: "VITAL CAPACITY",
    name: "+20 Maximum HP",
    effect: "Increase maximum and current health by 20 HP.",
  },
  {
    id: "speed",
    rarity: "common",
    code: "MOTOR RESPONSE",
    name: "+10% Move Speed",
    effect: "Increase movement speed by 10% of its base value.",
  },
  {
    id: "reload",
    rarity: "common",
    code: "CYCLING RATE",
    name: "+10% Reload Speed",
    effect: "Increase weapon reload rate by 10%.",
  },
  {
    id: "magnetism",
    rarity: "common",
    code: "FIELD EXTENSION",
    name: "+10 px Magnetism",
    effect: "Increase the XP attraction distance by 10 pixels.",
  },
  {
    id: "critical",
    rarity: "common",
    code: "FAULT AMPLIFIER",
    name: "+5% Critical Chance",
    effect: "Increase critical-hit chance by 5 percentage points.",
  },
  {
    id: "doubleShot",
    rarity: "rare",
    oneTime: true,
    code: "DOUBLE SHOT",
    name: "Double Shot",
    effect: "Fire a second projectile 0.5 seconds after every primary shot.",
  },
  {
    id: "penetratingShot",
    rarity: "rare",
    oneTime: true,
    code: "PENETRATING SHOT",
    name: "Penetrating Shot",
    effect: "Each projectile passes through its first enemy and despawns on the second hit.",
  },
  {
    id: "naniteRehab",
    rarity: "rare",
    oneTime: true,
    code: "NANITE REHAB",
    name: "Nanite Rehab",
    effect: "Regenerate 1 HP every 2 seconds while below maximum health.",
  },
  {
    id: "electroTherapy",
    rarity: "epic",
    oneTime: true,
    code: "ELECTRO THERAPY",
    name: "Electro Therapy",
    effect: "Launch a 2-damage electric bolt that chains to a second target every 5 seconds.",
  },
  {
    id: "shotgun",
    rarity: "epic",
    oneTime: true,
    code: "SCATTER PROTOCOL",
    name: "Shotgun",
    effect: "Replace the standard weapon with 3 spread pellets limited to 420 px range.",
  },
];

const state = {
  mode: "menu",
  status: "Awaiting input",
  musicVolume: 50,
  musicPlayback: "awaiting-interaction",
  sfxVolume: 50,
  sfxPlayRequests: 0,
  sfxPlaybackStarts: 0,
  weaponSfxPlayRequests: 0,
  weaponSfxPlaybackStarts: 0,
  weaponImpactSfxPlayRequests: 0,
  weaponImpactSfxPlaybackStarts: 0,
  optionsReturnMode: "menu",
  gamepadConnected: false,
  gamepadId: null,
  gamepadIndex: null,
  gamepadMapping: null,
  gamepadMovement: { x: 0, y: 0 },
};

function applyGamepadDeadzone(value) {
  const magnitude = Math.abs(value);
  if (magnitude <= GAMEPAD_DEADZONE) return 0;
  return Math.sign(value) * Math.min(1, (magnitude - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE));
}

function axisDirection(value) {
  if (value >= GAMEPAD_MENU_THRESHOLD) return 1;
  if (value <= -GAMEPAD_MENU_THRESHOLD) return -1;
  return 0;
}

function usesMobileTouchInterface() {
  return navigator.maxTouchPoints > 0 &&
    window.matchMedia("(pointer: coarse)").matches &&
    Math.min(window.innerWidth, window.innerHeight) <= 600;
}

function getControllerControls() {
  if (state.mode === "about") {
    return [...aboutDialog.querySelectorAll("a, button")];
  }
  if (state.mode === "options") {
    return [...optionsDialog.querySelectorAll('input[type="range"], button')];
  }
  if (state.mode === "menu") {
    return [...menu.querySelectorAll("button")];
  }
  if (state.mode === "terminated") {
    return [document.querySelector("#resume-button")];
  }
  if (state.mode === "gameover") {
    return [
      document.querySelector("#try-again-button"),
      document.querySelector("#main-menu-button"),
    ];
  }
  if (state.mode === "levelup") {
    return [...levelUpChoices.querySelectorAll("button")];
  }
  if (state.mode === "level") {
    return [document.querySelector("#level-options-button")];
  }
  return [];
}

function focusFirstControllerControl() {
  const controls = getControllerControls();
  if (controls.length > 0 && !controls.includes(document.activeElement)) controls[0].focus();
}

function moveControllerFocus(direction) {
  const controls = getControllerControls();
  if (controls.length === 0 || direction === 0) return;
  const currentIndex = controls.indexOf(document.activeElement);
  const nextIndex = currentIndex < 0
    ? direction > 0 ? 0 : controls.length - 1
    : (currentIndex + direction + controls.length) % controls.length;
  controls[nextIndex].focus();
}

function adjustFocusedControllerRange(direction) {
  const control = document.activeElement;
  if (!(control instanceof HTMLInputElement) || control.type !== "range") return;
  const nextValue = Number(control.value) + direction * GAMEPAD_SLIDER_STEP;
  control.value = String(Phaser.Math.Clamp(nextValue, Number(control.min), Number(control.max)));
  control.dispatchEvent(new Event("input", { bubbles: true }));
}

function activateControllerControl() {
  const controls = getControllerControls();
  if (controls.length === 0) return;
  if (!controls.includes(document.activeElement)) {
    controls[0].focus();
    return;
  }
  if (
    document.activeElement instanceof HTMLButtonElement ||
    document.activeElement instanceof HTMLAnchorElement
  ) document.activeElement.click();
}

class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }

  create() {
    this.levelActive = false;
    this.entities = [];
    this.moveTarget = null;
    this.collisionPairsLastFrame = 0;
    this.hits = 0;
    this.impactFlashMs = 0;
    this.gamepadButtons = [];
    this.gamepadMenuAxis = { x: 0, y: 0 };
    this.gamepadMovement = { x: 0, y: 0 };
    this.gamepadFireHeld = false;
    this.projectiles = [];
    this.projectileImpactBursts = [];
    this.pendingWeaponShots = [];
    this.electroProjectiles = [];
    this.pendingElectroShots = [];
    this.pendingElectroChains = [];
    this.electroArcs = [];
    this.electroCooldownMs = 0;
    this.electroProjectilesFired = 0;
    this.electroTargetsHit = 0;
    this.electroChainHits = 0;
    this.projectilePenetrations = 0;
    this.completedPenetrations = 0;
    this.projectileKnockbacks = 0;
    this.lastProjectileKnockback = null;
    this.damageNumbers = [];
    this.criticalRolls = 0;
    this.criticalHits = 0;
    this.lastCriticalHit = null;
    this.forcedCriticalResults = [];
    this.naniteRegenAccumulatorMs = 0;
    this.naniteHealingApplied = 0;
    this.survivalElapsedMs = 0;
    this.nextProjectileId = 1;
    this.weaponReloadMs = 0;
    this.aimActive = false;
    this.aimDirection = { x: 1, y: 0 };
    this.aimSource = null;
    this.mouseAimTarget = null;
    this.shotsFired = 0;
    this.enemiesDestroyed = 0;
    this.xpDrops = [];
    this.nextXpDropId = 1;
    this.playerXp = 0;
    this.totalPlayerXp = 0;
    this.playerLevel = 1;
    this.xpRequired = INITIAL_LEVEL_XP_REQUIRED;
    this.upgradeRanks = { health: 0, speed: 0, reload: 0, magnetism: 0, critical: 0, doubleShot: 0, penetratingShot: 0, naniteRehab: 0, electroTherapy: 0, shotgun: 0 };
    this.pendingUpgradeChoices = [];
    this.nextEnemyId = 1;
    this.spawnElapsedMs = 0;
    this.spawnAccumulator = 0;
    this.spawnRatePerSecond = 1;
    this.spawnPointIndex = 0;
    this.enemiesSpawnedBySystem = 0;
    this.chargerSpawnPointIndex = 0;
    this.chargersSpawnedBySystem = 0;
    this.nextChargerSpawnMs = CHARGER_FIRST_SPAWN_MS;
    this.hitCounterElement = document.querySelector("#hit-counter");
    this.survivalTimerElement = document.querySelector("#survival-timer");
    this.healthBarElement = document.querySelector("#player-health");
    this.healthFillElement = document.querySelector("#player-health-fill");
    this.healthOutputElement = document.querySelector("#player-health-output");
    this.weaponStatusElement = document.querySelector("#weapon-status");
    this.weaponOutputElement = document.querySelector("#weapon-status-output");
    this.weaponReloadFillElement = document.querySelector("#weapon-reload-fill");
    this.electroStatusElement = document.querySelector("#electro-status");
    this.electroOutputElement = document.querySelector("#electro-status-output");
    this.electroCooldownFillElement = document.querySelector("#electro-cooldown-fill");
    this.xpBarElement = document.querySelector("#player-xp");
    this.xpFillElement = document.querySelector("#player-xp-fill");
    this.xpOutputElement = document.querySelector("#player-xp-output");
    this.xpLevelLabelElement = document.querySelector("#xp-level-label");
    this.statLevelElement = document.querySelector("#stat-level");
    this.statHealthElement = document.querySelector("#stat-health");
    this.statSpeedElement = document.querySelector("#stat-speed");
    this.statReloadElement = document.querySelector("#stat-reload");
    this.statMagnetismElement = document.querySelector("#stat-magnetism");
    this.statVolleyElement = document.querySelector("#stat-volley");
    this.statPenetrationElement = document.querySelector("#stat-penetration");
    this.statRegenElement = document.querySelector("#stat-regen");
    this.statCriticalElement = document.querySelector("#stat-critical");
    this.statWeaponElement = document.querySelector("#stat-weapon");
    this.gridOffset = 0;
    this.streakClock = 180;
    this.streaks = [];
    this.roadLanes = [0.02, 0.2, 0.38, 0.58, 0.78, 0.98];
    this.streakLaneIndex = 0;
    this.particles = Array.from({ length: 42 }, (_, index) => ({
      x: (index * 83) % this.scale.width,
      y: (index * 137) % this.scale.height,
      speed: 7 + (index % 5) * 3,
      alpha: 0.12 + (index % 4) * 0.06,
    }));
    this.spawnStreak(900, 0.04);
    this.spawnStreak(700, 0.24);
    this.spawnStreak(500, 0.44);
    this.spawnStreak(300, 0.68);
    this.spawnStreak(100, 0.92);

    this.graphics = this.add.graphics();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.movementKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on("pointermove", (pointer) => {
      if (!this.levelActive || state.mode !== "level") return;
      if (pointer.wasTouch || pointer.event?.pointerType === "touch") return;
      this.setAimToward(pointer.x, pointer.y, "mouse");
    });
    this.input.on("pointerdown", (pointer) => {
      if (!this.levelActive || state.mode !== "level") return;
      const pointerType = pointer.wasTouch || pointer.event?.pointerType === "touch"
        ? "touch"
        : "mouse";
      const button = pointer.event?.button ?? 0;
      if (pointerType !== "touch" && button === 0) {
        this.setAimToward(pointer.x, pointer.y, "mouse");
        this.tryFire();
        return;
      }
      if (pointerType !== "touch" && button !== 2) return;
      const arena = this.getArenaBounds();
      const playerRadius = this.entities[0]?.radius ?? 20;
      this.moveTarget = {
        x: Phaser.Math.Clamp(
          pointer.x,
          arena.x + playerRadius,
          arena.x + arena.width - playerRadius,
        ),
        y: Phaser.Math.Clamp(
          pointer.y,
          arena.y + playerRadius,
          arena.y + arena.height - playerRadius,
        ),
      };
    });
    this.scale.on("resize", () => {
      if (this.levelActive) this.clampAllEntitiesToArena();
      this.draw();
    });
    this.draw();
  }

  update(_time, delta) {
    this.pollGamepad();
    if (this.levelActive) {
      if (state.mode === "level") this.updateLevel(Math.min(delta, 1000 / 30));
      this.draw();
      return;
    }

    this.gridOffset = (this.gridOffset + delta * 0.012) % 44;
    this.streakClock -= delta;
    if (this.streakClock <= 0) {
      this.spawnStreak();
      this.streakClock = 180 + Math.random() * 180;
    }

    for (const streak of this.streaks) streak.life -= delta;
    this.streaks = this.streaks.filter((streak) => streak.life > 0);

    for (const particle of this.particles) {
      particle.y -= (particle.speed * delta) / 1000;
      if (particle.y < -5) particle.y = this.scale.height + 5;
    }
    this.draw();
  }

  pollGamepad() {
    const gamepads = navigator.getGamepads?.() ?? [];
    const gamepad = Array.from(gamepads).find((candidate) => candidate?.connected);
    if (!gamepad) {
      state.gamepadConnected = false;
      state.gamepadId = null;
      state.gamepadIndex = null;
      state.gamepadMapping = null;
      state.gamepadMovement = { x: 0, y: 0 };
      this.gamepadMovement = state.gamepadMovement;
      this.gamepadButtons = [];
      this.gamepadMenuAxis = { x: 0, y: 0 };
      this.gamepadFireHeld = false;
      return;
    }

    const wasConnected = state.gamepadConnected;
    const buttons = gamepad.buttons.map((button) => button.pressed || button.value > 0.5);
    const justPressed = (index) => buttons[index] && !this.gamepadButtons[index];
    const leftStickX = applyGamepadDeadzone(gamepad.axes[0] ?? 0);
    const leftStickY = applyGamepadDeadzone(gamepad.axes[1] ?? 0);
    const rightStickX = applyGamepadDeadzone(gamepad.axes[2] ?? 0);
    const rightStickY = applyGamepadDeadzone(gamepad.axes[3] ?? 0);
    const dpadX = Number(buttons[15]) - Number(buttons[14]);
    const dpadY = Number(buttons[13]) - Number(buttons[12]);
    let movementX = dpadX || leftStickX;
    let movementY = dpadY || leftStickY;
    const movementLength = Math.hypot(movementX, movementY);
    if (movementLength > 1) {
      movementX /= movementLength;
      movementY /= movementLength;
    }

    state.gamepadConnected = true;
    state.gamepadId = gamepad.id;
    state.gamepadIndex = gamepad.index;
    state.gamepadMapping = gamepad.mapping || "non-standard";
    state.gamepadMovement = {
      x: Math.round(movementX * 100) / 100,
      y: Math.round(movementY * 100) / 100,
    };
    this.gamepadMovement = { x: movementX, y: movementY };
    this.gamepadFireHeld = Boolean(buttons[7]);

    if (!wasConnected) {
      if (state.mode === "menu") setStatus("Xbox controller linked");
      focusFirstControllerControl();
    }

    if (state.mode === "level") {
      if (Math.hypot(rightStickX, rightStickY) > 0) {
        this.setAimDirection(rightStickX, rightStickY, "right-stick");
      }
      if (justPressed(9)) openOptions("level");
      if (justPressed(1)) returnToMenu("Controller return");
    } else {
      const verticalDirection = dpadY || axisDirection(leftStickY);
      const horizontalDirection = dpadX || axisDirection(leftStickX);
      if (
        (justPressed(12) || justPressed(13)) ||
        (verticalDirection !== 0 && this.gamepadMenuAxis.y === 0)
      ) {
        moveControllerFocus(verticalDirection || (justPressed(13) ? 1 : -1));
      }
      if (
        (justPressed(14) || justPressed(15)) ||
        (horizontalDirection !== 0 && this.gamepadMenuAxis.x === 0)
      ) {
        const direction = horizontalDirection || (justPressed(15) ? 1 : -1);
        if (state.mode === "levelup") {
          moveControllerFocus(direction);
        } else {
          adjustFocusedControllerRange(direction);
        }
      }
      this.gamepadMenuAxis = {
        x: horizontalDirection,
        y: verticalDirection,
      };

      if (justPressed(0)) activateControllerControl();
      if (justPressed(1) && state.mode === "options") optionsDialog.close();
      if (justPressed(1) && state.mode === "about") aboutDialog.close();
      if (justPressed(1) && ["gameover", "survived"].includes(state.mode)) {
        document.querySelector("#main-menu-button").click();
      }
      if (justPressed(9) && state.mode === "menu") {
        document.querySelector("#start-button").click();
      }
    }

    this.gamepadButtons = buttons;
  }

  getArenaBounds() {
    const width = this.scale.width;
    const height = this.scale.height;
    const marginX = Phaser.Math.Clamp(width * 0.045, 22, 62);
    const baseMarginTop =
      width <= 600
        ? Phaser.Math.Clamp(height * 0.2, 160, 180)
        : Phaser.Math.Clamp(height * 0.18, 130, 160);
    const shellRect = gameShell.getBoundingClientRect();
    const hudRect = !levelHud.hidden ? levelHud.getBoundingClientRect() : null;
    const measuredHudBottom = hudRect ? hudRect.bottom - shellRect.top + 12 : 0;
    const marginTop = Phaser.Math.Clamp(
      Math.max(baseMarginTop, measuredHudBottom),
      baseMarginTop,
      Math.max(baseMarginTop, height - 180),
    );
    const marginBottom = Phaser.Math.Clamp(height * 0.055, 24, 56);
    return {
      x: marginX,
      y: marginTop,
      width: width - marginX * 2,
      height: height - marginTop - marginBottom,
    };
  }

  startLevel() {
    this.clearDamageNumbers();
    this.levelActive = true;
    this.moveTarget = null;
    this.collisionPairsLastFrame = 0;
    this.hits = 0;
    this.impactFlashMs = 0;
    this.projectiles = [];
    this.projectileImpactBursts = [];
    this.pendingWeaponShots = [];
    this.electroProjectiles = [];
    this.pendingElectroShots = [];
    this.pendingElectroChains = [];
    this.electroArcs = [];
    this.electroCooldownMs = 0;
    this.electroProjectilesFired = 0;
    this.electroTargetsHit = 0;
    this.electroChainHits = 0;
    this.projectilePenetrations = 0;
    this.completedPenetrations = 0;
    this.projectileKnockbacks = 0;
    this.lastProjectileKnockback = null;
    this.criticalRolls = 0;
    this.criticalHits = 0;
    this.lastCriticalHit = null;
    this.forcedCriticalResults = [];
    this.naniteRegenAccumulatorMs = 0;
    this.naniteHealingApplied = 0;
    this.survivalElapsedMs = 0;
    this.nextProjectileId = 1;
    this.weaponReloadMs = 0;
    this.aimActive = false;
    this.aimDirection = { x: 1, y: 0 };
    this.aimSource = null;
    this.mouseAimTarget = null;
    this.shotsFired = 0;
    this.enemiesDestroyed = 0;
    this.xpDrops = [];
    this.nextXpDropId = 1;
    this.playerXp = 0;
    this.totalPlayerXp = 0;
    this.playerLevel = 1;
    this.xpRequired = INITIAL_LEVEL_XP_REQUIRED;
    this.upgradeRanks = { health: 0, speed: 0, reload: 0, magnetism: 0, critical: 0, doubleShot: 0, penetratingShot: 0, naniteRehab: 0, electroTherapy: 0, shotgun: 0 };
    this.pendingUpgradeChoices = [];
    this.nextEnemyId = 1;
    this.spawnElapsedMs = 0;
    this.spawnAccumulator = 0;
    this.spawnRatePerSecond = 1;
    this.spawnPointIndex = 0;
    this.enemiesSpawnedBySystem = 0;
    this.chargerSpawnPointIndex = 0;
    this.chargersSpawnedBySystem = 0;
    this.nextChargerSpawnMs = CHARGER_FIRST_SPAWN_MS;
    this.updateHitCounter();
    this.updateSurvivalTimerHud();
    const arena = this.getArenaBounds();
    const point = (x, y) => ({
      x: arena.x + arena.width * x,
      y: arena.y + arena.height * y,
    });
    const playerPosition = point(0.5, 0.5);
    this.entities = [
      {
        id: "player",
        kind: "player",
        ...playerPosition,
        radius: 20,
        health: 100,
        maxHealth: 100,
        vx: 0,
        vy: 0,
      },
    ];

    const enemySpawns = [
      [0.68, 0.5],
      [0.16, 0.2],
      [0.37, 0.22],
      [0.78, 0.2],
      [0.86, 0.42],
      [0.2, 0.74],
      [0.48, 0.8],
      [0.78, 0.75],
    ];
    enemySpawns.forEach(([x, y]) => this.createEnemyAtNormalizedPosition(x, y));

    this.updateHealthHud();
    this.updateXpHud();
    this.updateWeaponHud();
    this.updateElectroHud();
    this.updateStatsHud();
    this.draw();
  }

  createEnemyAtNormalizedPosition(
    normalizedX,
    normalizedY,
    spawnedBySystem = false,
    enemyType = "circle",
  ) {
    const arena = this.getArenaBounds();
    const player = this.entities[0];
    const radius = 11;
    const x = Phaser.Math.Clamp(
      arena.x + arena.width * normalizedX,
      arena.x + radius,
      arena.x + arena.width - radius,
    );
    const y = Phaser.Math.Clamp(
      arena.y + arena.height * normalizedY,
      arena.y + radius,
      arena.y + arena.height - radius,
    );
    const enemySequenceIndex = this.nextEnemyId - 1;
    const speed = 62 + (enemySequenceIndex % 3) * 14;
    const angle = Math.atan2(player.y - y, player.x - x);
    this.entities.push({
      id: `enemy-${this.nextEnemyId}`,
      kind: "enemy",
      enemyType,
      x,
      y,
      radius,
      health: 1,
      maxHealth: 1,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      angle,
      hitCooldownMs: 0,
      contactDamage: enemyType === "charger" ? CHARGER_CONTACT_DAMAGE : ENEMY_CONTACT_DAMAGE,
      xpValue: enemyType === "charger" ? CHARGER_XP_VALUE : ENEMY_XP_VALUE,
      lungeActive: false,
      lungeCooldownMs: 0,
      lungeRemainingDistance: 0,
      lungeDistanceTraveled: 0,
      lungeDirection: null,
    });
    this.nextEnemyId += 1;
    if (spawnedBySystem) {
      this.enemiesSpawnedBySystem += 1;
      if (enemyType === "charger") this.chargersSpawnedBySystem += 1;
    }
  }

  updateEnemySpawning(deltaMs) {
    this.spawnElapsedMs += deltaMs;
    const rateIndex = Math.min(
      ENEMY_SPAWN_RATES.length - 1,
      Math.floor(this.spawnElapsedMs / SPAWN_RATE_STEP_MS),
    );
    this.spawnRatePerSecond = ENEMY_SPAWN_RATES[rateIndex];
    this.spawnAccumulator += (this.spawnRatePerSecond * deltaMs) / 1000;
    while (this.spawnAccumulator >= 1) {
      const [x, y] = ENEMY_SPAWN_POINTS[this.spawnPointIndex];
      this.spawnPointIndex = (this.spawnPointIndex + 1) % ENEMY_SPAWN_POINTS.length;
      this.createEnemyAtNormalizedPosition(x, y, true);
      this.spawnAccumulator -= 1;
    }
    while (
      this.nextChargerSpawnMs < SURVIVAL_DURATION_MS &&
      this.spawnElapsedMs >= this.nextChargerSpawnMs
    ) {
      const [x, y] = ENEMY_SPAWN_POINTS[this.chargerSpawnPointIndex];
      this.chargerSpawnPointIndex = (this.chargerSpawnPointIndex + 1) % ENEMY_SPAWN_POINTS.length;
      this.createEnemyAtNormalizedPosition(x, y, true, "charger");
      this.nextChargerSpawnMs += CHARGER_SPAWN_INTERVAL_MS;
    }
  }

  stopLevel() {
    this.clearDamageNumbers();
    this.levelActive = false;
    this.entities = [];
    this.moveTarget = null;
    this.collisionPairsLastFrame = 0;
    this.hits = 0;
    this.impactFlashMs = 0;
    this.projectiles = [];
    this.projectileImpactBursts = [];
    this.pendingWeaponShots = [];
    this.electroProjectiles = [];
    this.pendingElectroShots = [];
    this.pendingElectroChains = [];
    this.electroArcs = [];
    this.electroCooldownMs = 0;
    this.electroProjectilesFired = 0;
    this.electroTargetsHit = 0;
    this.electroChainHits = 0;
    this.projectilePenetrations = 0;
    this.completedPenetrations = 0;
    this.projectileKnockbacks = 0;
    this.lastProjectileKnockback = null;
    this.criticalRolls = 0;
    this.criticalHits = 0;
    this.lastCriticalHit = null;
    this.forcedCriticalResults = [];
    this.naniteRegenAccumulatorMs = 0;
    this.naniteHealingApplied = 0;
    this.survivalElapsedMs = 0;
    this.weaponReloadMs = 0;
    this.aimActive = false;
    this.aimSource = null;
    this.mouseAimTarget = null;
    this.xpDrops = [];
    this.playerXp = 0;
    this.totalPlayerXp = 0;
    this.playerLevel = 1;
    this.xpRequired = INITIAL_LEVEL_XP_REQUIRED;
    this.upgradeRanks = { health: 0, speed: 0, reload: 0, magnetism: 0, critical: 0, doubleShot: 0, penetratingShot: 0, naniteRehab: 0, electroTherapy: 0, shotgun: 0 };
    this.pendingUpgradeChoices = [];
    this.spawnElapsedMs = 0;
    this.spawnAccumulator = 0;
    this.enemiesSpawnedBySystem = 0;
    this.chargerSpawnPointIndex = 0;
    this.chargersSpawnedBySystem = 0;
    this.nextChargerSpawnMs = CHARGER_FIRST_SPAWN_MS;
    this.draw();
  }

  updateLevel(deltaMs) {
    const deltaSeconds = deltaMs / 1000;
    const player = this.entities[0];
    this.impactFlashMs = Math.max(0, this.impactFlashMs - deltaMs);
    this.updateDamageNumbers(deltaMs);
    this.weaponReloadMs = Math.max(0, this.weaponReloadMs - deltaMs);
    this.electroCooldownMs = Math.max(0, this.electroCooldownMs - deltaMs);
    this.updateNaniteRehab(deltaMs);
    for (const arc of this.electroArcs) arc.lifeMs -= deltaMs;
    this.electroArcs = this.electroArcs.filter((arc) => arc.lifeMs > 0);
    this.updatePendingWeaponShots(deltaMs);
    this.updatePendingElectroShots(deltaMs);
    this.updatePendingElectroChains(deltaMs);
    this.updateEnemySpawning(deltaMs);
    if (this.aimSource === "mouse" && this.mouseAimTarget) {
      this.setAimToward(this.mouseAimTarget.x, this.mouseAimTarget.y, "mouse");
    }
    const mobileAutoFire = usesMobileTouchInterface() && !state.gamepadConnected;
    const mobileAutoTarget = mobileAutoFire && this.updateMobileAutoAim();
    if (!mobileAutoFire || mobileAutoTarget) this.tryFireElectroTherapy();
    const activePointer = this.input.activePointer;
    const mouseFireHeld = Boolean(
      activePointer?.isDown &&
      !activePointer.wasTouch &&
      activePointer.event?.pointerType !== "touch" &&
      activePointer.leftButtonDown(),
    );
    if (mobileAutoTarget || this.fireKey.isDown || mouseFireHeld || this.gamepadFireHeld) {
      this.tryFire();
    }
    this.updateWeaponHud();
    this.updateElectroHud();
    const horizontal =
      Number(this.cursors.right.isDown || this.movementKeys.right.isDown) -
      Number(this.cursors.left.isDown || this.movementKeys.left.isDown);
    const vertical =
      Number(this.cursors.down.isDown || this.movementKeys.down.isDown) -
      Number(this.cursors.up.isDown || this.movementKeys.up.isDown);
    const keyboardLength = Math.hypot(horizontal, vertical);
    const controllerLength = Math.hypot(
      this.gamepadMovement.x,
      this.gamepadMovement.y,
    );

    if (keyboardLength > 0) {
      this.moveTarget = null;
      player.vx = (horizontal / keyboardLength) * this.getPlayerSpeed();
      player.vy = (vertical / keyboardLength) * this.getPlayerSpeed();
    } else if (controllerLength > 0) {
      this.moveTarget = null;
      player.vx = this.gamepadMovement.x * this.getPlayerSpeed();
      player.vy = this.gamepadMovement.y * this.getPlayerSpeed();
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - player.x;
      const dy = this.moveTarget.y - player.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 5) {
        this.moveTarget = null;
        player.vx = 0;
        player.vy = 0;
      } else {
        player.vx = (dx / distance) * this.getPlayerSpeed();
        player.vy = (dy / distance) * this.getPlayerSpeed();
      }
    } else {
      player.vx = 0;
      player.vy = 0;
    }

    for (const enemy of this.entities.slice(1)) {
      enemy.hitCooldownMs = Math.max(0, enemy.hitCooldownMs - deltaMs);
      enemy.lungeCooldownMs = Math.max(0, enemy.lungeCooldownMs - deltaMs);
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      if (enemy.enemyType === "charger" && enemy.lungeActive) {
        const maximumLungeSpeed = enemy.speed * CHARGER_LUNGE_SPEED_MULTIPLIER;
        const lungeSpeed = Math.min(maximumLungeSpeed, enemy.lungeRemainingDistance / deltaSeconds);
        enemy.vx = enemy.lungeDirection.x * lungeSpeed;
        enemy.vy = enemy.lungeDirection.y * lungeSpeed;
        enemy.angle = Math.atan2(enemy.vy, enemy.vx);
        continue;
      }
      if (
        enemy.enemyType === "charger" &&
        enemy.lungeCooldownMs <= 0 &&
        distance <= CHARGER_LUNGE_TRIGGER_DISTANCE
      ) {
        enemy.lungeActive = true;
        enemy.lungeCooldownMs = CHARGER_LUNGE_COOLDOWN_MS;
        enemy.lungeRemainingDistance = CHARGER_LUNGE_DISTANCE;
        enemy.lungeDistanceTraveled = 0;
        enemy.lungeDirection = { x: dx / distance, y: dy / distance };
        enemy.vx = enemy.lungeDirection.x * enemy.speed * CHARGER_LUNGE_SPEED_MULTIPLIER;
        enemy.vy = enemy.lungeDirection.y * enemy.speed * CHARGER_LUNGE_SPEED_MULTIPLIER;
        enemy.angle = Math.atan2(enemy.vy, enemy.vx);
        continue;
      }
      const desiredVelocityX = (dx / distance) * enemy.speed;
      const desiredVelocityY = (dy / distance) * enemy.speed;
      const steeringBlend = 1 - Math.exp(-5.2 * deltaSeconds);
      enemy.vx = Phaser.Math.Linear(enemy.vx, desiredVelocityX, steeringBlend);
      enemy.vy = Phaser.Math.Linear(enemy.vy, desiredVelocityY, steeringBlend);
      this.normalizeEnemyVelocity(enemy);
    }

    for (const entity of this.entities) {
      const previousX = entity.x;
      const previousY = entity.y;
      entity.x += entity.vx * deltaSeconds;
      entity.y += entity.vy * deltaSeconds;
      const hitArenaBoundary = this.resolveArenaBoundary(entity);
      if (entity.enemyType === "charger" && entity.lungeActive) {
        const lungeStepDistance = Math.hypot(entity.x - previousX, entity.y - previousY);
        entity.lungeDistanceTraveled += lungeStepDistance;
        entity.lungeRemainingDistance = Math.max(
          0,
          entity.lungeRemainingDistance - lungeStepDistance,
        );
        if (entity.lungeRemainingDistance <= 0.01 || hitArenaBoundary) {
          entity.lungeActive = false;
          entity.lungeRemainingDistance = 0;
          entity.vx = entity.lungeDirection.x * entity.speed;
          entity.vy = entity.lungeDirection.y * entity.speed;
        }
      }
    }

    this.collisionPairsLastFrame = 0;
    for (let pass = 0; pass < 3; pass += 1) {
      for (let first = 0; first < this.entities.length; first += 1) {
        for (let second = first + 1; second < this.entities.length; second += 1) {
          this.resolveEntityCollision(this.entities[first], this.entities[second]);
        }
      }
      this.clampAllEntitiesToArena();
    }

    for (const enemy of this.entities.slice(1)) this.normalizeEnemyVelocity(enemy);
    this.updateProjectiles(deltaSeconds, deltaMs);
    this.updateElectroProjectiles(deltaSeconds);
    this.updateXpDrops(deltaMs);
    if (state.mode === "level" && player.health > 0) this.updateSurvivalTimer(deltaMs);
  }

  updateNaniteRehab(deltaMs) {
    if (this.upgradeRanks.naniteRehab === 0) return;
    const player = this.entities[0];
    if (!player) return;
    if (player.health >= player.maxHealth) {
      this.naniteRegenAccumulatorMs = 0;
      return;
    }
    this.naniteRegenAccumulatorMs += deltaMs;
    while (this.naniteRegenAccumulatorMs >= NANITE_REHAB_INTERVAL_MS) {
      this.naniteRegenAccumulatorMs -= NANITE_REHAB_INTERVAL_MS;
      const previousHealth = player.health;
      player.health = Math.min(player.maxHealth, player.health + NANITE_REHAB_HEALING);
      this.naniteHealingApplied += player.health - previousHealth;
      this.updateHealthHud();
      if (player.health >= player.maxHealth) {
        this.naniteRegenAccumulatorMs = 0;
        break;
      }
    }
  }

  updateSurvivalTimer(deltaMs) {
    this.survivalElapsedMs = Math.min(
      SURVIVAL_DURATION_MS,
      this.survivalElapsedMs + deltaMs,
    );
    this.updateSurvivalTimerHud();
    if (this.survivalElapsedMs >= SURVIVAL_DURATION_MS) showRunEnd("survived");
  }

  updateSurvivalTimerHud() {
    if (!this.survivalTimerElement) return;
    const remainingSeconds = Math.max(
      0,
      Math.ceil((SURVIVAL_DURATION_MS - this.survivalElapsedMs) / 1000),
    );
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    this.survivalTimerElement.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  setAimToward(x, y, source) {
    const player = this.entities[0];
    if (!player) return;
    const dx = x - player.x;
    const dy = y - player.y;
    if (Math.hypot(dx, dy) < 0.001) return;
    this.setAimDirection(dx, dy, source);
    if (source === "mouse") this.mouseAimTarget = { x, y };
  }

  updateMobileAutoAim() {
    const player = this.entities[0];
    if (!player) return false;
    const target = this.entities.slice(1).sort((first, second) =>
      Math.hypot(first.x - player.x, first.y - player.y) -
      Math.hypot(second.x - player.x, second.y - player.y)
    )[0];
    if (!target) return false;
    this.setAimDirection(target.x - player.x, target.y - player.y, "mobile-auto");
    return true;
  }

  setAimDirection(x, y, source) {
    const length = Math.hypot(x, y);
    if (length < 0.001) return;
    this.aimDirection = { x: x / length, y: y / length };
    this.aimActive = true;
    this.aimSource = source;
    if (source !== "mouse") this.mouseAimTarget = null;
    this.updateWeaponHud();
  }

  tryFire() {
    if (
      !this.levelActive ||
      state.mode !== "level" ||
      !this.aimActive ||
      this.weaponReloadMs > 0
    ) {
      return false;
    }
    const direction = { ...this.aimDirection };
    const hitLimit = this.getProjectileHitLimit();
    const weaponMode = this.getStandardWeaponMode();
    this.spawnWeaponVolley(direction, hitLimit, weaponMode);
    if (this.upgradeRanks.doubleShot > 0) {
      this.pendingWeaponShots.push({
        remainingMs: DOUBLE_SHOT_DELAY_MS,
        direction,
        hitLimit,
        weaponMode,
      });
    }
    this.weaponReloadMs = this.getReloadDurationMs();
    this.updateWeaponHud();
    return true;
  }

  getStandardWeaponMode() {
    return this.upgradeRanks.shotgun > 0 ? "shotgun" : "single";
  }

  getWeaponVolleySize() {
    return this.getStandardWeaponMode() === "shotgun" ? SHOTGUN_PELLET_COUNT : 1;
  }

  spawnWeaponVolley(direction, hitLimit, weaponMode = this.getStandardWeaponMode()) {
    const spreadAngles = weaponMode === "shotgun"
      ? [-SHOTGUN_SPREAD_DEGREES, 0, SHOTGUN_SPREAD_DEGREES]
      : [0];
    const maxRange = weaponMode === "shotgun" ? SHOTGUN_RANGE : null;
    spreadAngles.forEach((degrees, index) => {
      const radians = Phaser.Math.DegToRad(degrees);
      const pelletDirection = {
        x: direction.x * Math.cos(radians) - direction.y * Math.sin(radians),
        y: direction.x * Math.sin(radians) + direction.y * Math.cos(radians),
      };
      this.spawnProjectile(pelletDirection, hitLimit, {
        maxRange,
        playSound: index === 0,
        weaponMode,
      });
    });
  }

  spawnProjectile(
    direction,
    hitLimit = this.getProjectileHitLimit(),
    { maxRange = null, playSound = true, weaponMode = "single" } = {},
  ) {
    const player = this.entities[0];
    if (!player) return false;
    const muzzleDistance = player.radius + PROJECTILE_RADIUS + 4;
    this.projectiles.push({
      id: `shot-${this.nextProjectileId}`,
      x: player.x + direction.x * muzzleDistance,
      y: player.y + direction.y * muzzleDistance,
      previousX: player.x,
      previousY: player.y,
      vx: direction.x * PROJECTILE_SPEED,
      vy: direction.y * PROJECTILE_SPEED,
      radius: PROJECTILE_RADIUS,
      damage: PROJECTILE_DAMAGE,
      weaponMode,
      maxRange,
      distanceTraveled: 0,
      hitLimit,
      hitCount: 0,
      hitEnemyIds: [],
    });
    this.nextProjectileId += 1;
    this.shotsFired += 1;
    if (playSound) playWeaponShotSfx();
    return true;
  }

  updatePendingWeaponShots(deltaMs) {
    const readyShots = [];
    for (const pendingShot of this.pendingWeaponShots) {
      pendingShot.remainingMs -= deltaMs;
      if (pendingShot.remainingMs <= 0) readyShots.push(pendingShot);
    }
    this.pendingWeaponShots = this.pendingWeaponShots.filter((shot) => shot.remainingMs > 0);
    for (const pendingShot of readyShots) {
      this.spawnWeaponVolley(
        pendingShot.direction,
        pendingShot.hitLimit,
        pendingShot.weaponMode,
      );
    }
  }

  getElectroTherapyCooldownMs() {
    return ELECTRO_THERAPY_BASE_COOLDOWN_MS / this.getReloadSpeedMultiplier();
  }

  tryFireElectroTherapy() {
    if (
      this.upgradeRanks.electroTherapy === 0 ||
      !this.aimActive ||
      this.electroCooldownMs > 0
    ) return false;
    const direction = { ...this.aimDirection };
    this.spawnElectroProjectile(direction);
    if (this.upgradeRanks.doubleShot > 0) {
      this.pendingElectroShots.push({
        remainingMs: DOUBLE_SHOT_DELAY_MS,
        direction,
      });
    }
    this.electroCooldownMs = this.getElectroTherapyCooldownMs();
    this.updateElectroHud();
    return true;
  }

  spawnElectroProjectile(direction) {
    const player = this.entities[0];
    if (!player) return false;
    const muzzleDistance = player.radius + PROJECTILE_RADIUS + 6;
    this.electroProjectiles.push({
      id: `electro-${this.nextProjectileId}`,
      x: player.x + direction.x * muzzleDistance,
      y: player.y + direction.y * muzzleDistance,
      previousX: player.x,
      previousY: player.y,
      vx: direction.x * PROJECTILE_SPEED,
      vy: direction.y * PROJECTILE_SPEED,
      direction,
      radius: PROJECTILE_RADIUS + 2,
    });
    this.nextProjectileId += 1;
    this.electroProjectilesFired += 1;
    return true;
  }

  updatePendingElectroShots(deltaMs) {
    for (const pendingShot of this.pendingElectroShots) pendingShot.remainingMs -= deltaMs;
    const readyShots = this.pendingElectroShots.filter((shot) => shot.remainingMs <= 0);
    this.pendingElectroShots = this.pendingElectroShots.filter((shot) => shot.remainingMs > 0);
    for (const pendingShot of readyShots) this.spawnElectroProjectile(pendingShot.direction);
  }

  updatePendingElectroChains(deltaMs) {
    for (const chain of this.pendingElectroChains) chain.remainingMs -= deltaMs;
    const readyChains = this.pendingElectroChains.filter((chain) => chain.remainingMs <= 0);
    this.pendingElectroChains = this.pendingElectroChains.filter((chain) => chain.remainingMs > 0);
    for (const chain of readyChains) {
      const target = this.entities.slice(1)
        .filter((enemy) => enemy.id !== chain.firstTargetId)
        .map((enemy) => ({ enemy, distance: Math.hypot(enemy.x - chain.x, enemy.y - chain.y) }))
        .filter(({ distance }) => distance <= ELECTRO_THERAPY_CHAIN_RANGE)
        .sort((first, second) => first.distance - second.distance)[0]?.enemy;
      if (!target) continue;
      this.electroArcs.push({
        fromX: chain.x,
        fromY: chain.y,
        toX: target.x,
        toY: target.y,
        lifeMs: ELECTRO_THERAPY_ARC_LIFETIME_MS,
      });
      this.electroTargetsHit += 1;
      this.electroChainHits += 1;
      this.dealPlayerDamage(target, ELECTRO_THERAPY_DAMAGE, "electro-chain");
    }
  }

  updateElectroProjectiles(deltaSeconds) {
    const arena = this.getArenaBounds();
    const survivors = [];
    for (const projectile of this.electroProjectiles) {
      projectile.previousX = projectile.x;
      projectile.previousY = projectile.y;
      projectile.x += projectile.vx * deltaSeconds;
      projectile.y += projectile.vy * deltaSeconds;
      const hitEnemy = this.entities.slice(1).find((enemy) =>
        this.projectileSegmentHitsEnemy(projectile, enemy),
      );
      if (hitEnemy) {
        const impactX = hitEnemy.x;
        const impactY = hitEnemy.y;
        this.electroArcs.push({
          fromX: projectile.previousX,
          fromY: projectile.previousY,
          toX: impactX,
          toY: impactY,
          lifeMs: ELECTRO_THERAPY_ARC_LIFETIME_MS,
        });
        this.electroTargetsHit += 1;
        this.dealPlayerDamage(hitEnemy, ELECTRO_THERAPY_DAMAGE, "electro-projectile");
        this.pendingElectroChains.push({
          remainingMs: ELECTRO_THERAPY_CHAIN_DELAY_MS,
          x: impactX,
          y: impactY,
          firstTargetId: hitEnemy.id,
        });
        continue;
      }
      const touchesArenaEdge =
        projectile.x - projectile.radius <= arena.x ||
        projectile.x + projectile.radius >= arena.x + arena.width ||
        projectile.y - projectile.radius <= arena.y ||
        projectile.y + projectile.radius >= arena.y + arena.height;
      if (!touchesArenaEdge) survivors.push(projectile);
    }
    this.electroProjectiles = survivors;
  }

  updateProjectiles(deltaSeconds, deltaMs) {
    const arena = this.getArenaBounds();
    for (const burst of this.projectileImpactBursts) burst.lifeMs -= deltaMs;
    this.projectileImpactBursts = this.projectileImpactBursts.filter((burst) => burst.lifeMs > 0);
    const survivingProjectiles = [];
    for (const projectile of this.projectiles) {
      projectile.previousX = projectile.x;
      projectile.previousY = projectile.y;
      const stepX = projectile.vx * deltaSeconds;
      const stepY = projectile.vy * deltaSeconds;
      const stepDistance = Math.hypot(stepX, stepY);
      const remainingRange = projectile.maxRange === null
        ? stepDistance
        : Math.max(0, projectile.maxRange - projectile.distanceTraveled);
      const rangeScale = stepDistance > 0
        ? Math.min(1, remainingRange / stepDistance)
        : 0;
      projectile.x += stepX * rangeScale;
      projectile.y += stepY * rangeScale;
      projectile.distanceTraveled += Math.hypot(
        projectile.x - projectile.previousX,
        projectile.y - projectile.previousY,
      );

      const hitEnemy = this.entities.slice(1).find((enemy) =>
        !projectile.hitEnemyIds.includes(enemy.id) &&
        this.projectileSegmentHitsEnemy(projectile, enemy),
      );
      if (hitEnemy) {
        playWeaponImpactSfx();
        projectile.hitEnemyIds.push(hitEnemy.id);
        projectile.hitCount += 1;
        const knockback = this.applyProjectileKnockback(hitEnemy, projectile);
        const damageResult = this.dealPlayerDamage(
          hitEnemy,
          projectile.damage,
          projectile.weaponMode === "shotgun" ? "shotgun-pellet" : "standard-projectile",
        );
        knockback.killed = damageResult.killed;
        this.lastProjectileKnockback = knockback;
        if (projectile.hitCount >= projectile.hitLimit) {
          if (projectile.hitLimit > 1) this.completedPenetrations += 1;
          continue;
        }
        this.projectilePenetrations += 1;
      }

      const touchesArenaEdge =
        projectile.x - projectile.radius <= arena.x ||
        projectile.x + projectile.radius >= arena.x + arena.width ||
        projectile.y - projectile.radius <= arena.y ||
        projectile.y + projectile.radius >= arena.y + arena.height;
      const reachedRange = projectile.maxRange !== null &&
        projectile.distanceTraveled >= projectile.maxRange - 0.001;
      if (!touchesArenaEdge && !reachedRange) survivingProjectiles.push(projectile);
    }
    this.projectiles = survivingProjectiles;
  }

  applyProjectileKnockback(enemy, projectile) {
    const speed = Math.max(0.001, Math.hypot(projectile.vx, projectile.vy));
    const direction = {
      x: projectile.vx / speed,
      y: projectile.vy / speed,
    };
    const fromX = enemy.x;
    const fromY = enemy.y;
    enemy.x += direction.x * PROJECTILE_KNOCKBACK_DISTANCE;
    enemy.y += direction.y * PROJECTILE_KNOCKBACK_DISTANCE;
    this.resolveArenaBoundary(enemy);
    const distance = Math.hypot(enemy.x - fromX, enemy.y - fromY);
    this.projectileImpactBursts.push({
      fromX,
      fromY,
      toX: enemy.x,
      toY: enemy.y,
      lifeMs: PROJECTILE_IMPACT_LIFETIME_MS,
    });
    this.projectileKnockbacks += 1;
    return {
      enemyId: enemy.id,
      distance,
      configuredDistance: PROJECTILE_KNOCKBACK_DISTANCE,
      direction,
      from: { x: fromX, y: fromY },
      to: { x: enemy.x, y: enemy.y },
      killed: false,
    };
  }

  damageEnemy(enemy, damage) {
    if (!enemy || !this.entities.includes(enemy)) return false;
    enemy.health = Math.max(0, enemy.health - damage);
    if (enemy.health > 0) return false;
    this.xpDrops.push({
      id: `xp-${this.nextXpDropId}`,
      x: enemy.x,
      y: enemy.y,
      radius: XP_DROP_RADIUS,
      value: enemy.xpValue,
    });
    this.nextXpDropId += 1;
    this.entities = this.entities.filter((entity) => entity !== enemy);
    this.enemiesDestroyed += 1;
    return true;
  }

  updateXpDrops(deltaMs) {
    const player = this.entities[0];
    if (!player || this.xpDrops.length === 0) return;
    let collectedXp = 0;
    this.xpDrops = this.xpDrops.filter((drop) => {
      let dx = player.x - drop.x;
      let dy = player.y - drop.y;
      let distance = Math.hypot(dx, dy);
      const pickupDistance = drop.radius + player.radius;
      const attractionDistance = pickupDistance + this.getMagnetismDistance();
      if (distance > pickupDistance && distance <= attractionDistance) {
        const pullDistance = Math.min(distance, (XP_MAGNET_PULL_SPEED * deltaMs) / 1000);
        drop.x += (dx / distance) * pullDistance;
        drop.y += (dy / distance) * pullDistance;
        dx = player.x - drop.x;
        dy = player.y - drop.y;
        distance = Math.hypot(dx, dy);
      }
      const collected = distance <= pickupDistance;
      if (collected) collectedXp += drop.value;
      return !collected;
    });
    if (collectedXp > 0) {
      this.playerXp += collectedXp;
      this.totalPlayerXp += collectedXp;
      if (this.playerXp >= this.xpRequired) {
        this.playerXp -= this.xpRequired;
        this.playerLevel += 1;
        this.xpRequired *= LEVEL_XP_GROWTH;
        this.updateXpHud();
        this.updateStatsHud();
        showLevelUp();
        return;
      }
      this.updateXpHud();
    }
  }

  getPlayerSpeed() {
    return BASE_PLAYER_SPEED * (1 + this.upgradeRanks.speed * UPGRADE_RATE_STEP);
  }

  getReloadSpeedMultiplier() {
    return 1 + this.upgradeRanks.reload * UPGRADE_RATE_STEP;
  }

  getReloadDurationMs() {
    return BASE_WEAPON_RELOAD_MS / this.getReloadSpeedMultiplier();
  }

  getMagnetismDistance() {
    return BASE_MAGNETISM_DISTANCE +
      (MAGNETISM_UPGRADE_STEP * this.upgradeRanks.magnetism);
  }

  getCriticalChance() {
    return Math.min(1, BASE_CRITICAL_CHANCE +
      this.upgradeRanks.critical * CRITICAL_CHANCE_UPGRADE_STEP);
  }

  rollPlayerDamage(baseDamage) {
    const forcedResult = this.forcedCriticalResults.shift();
    const critical = forcedResult ?? (Math.random() < this.getCriticalChance());
    this.criticalRolls += 1;
    if (critical) this.criticalHits += 1;
    return {
      baseDamage,
      damage: baseDamage * (critical ? CRITICAL_DAMAGE_MULTIPLIER : 1),
      critical,
    };
  }

  dealPlayerDamage(enemy, baseDamage, source) {
    const result = this.rollPlayerDamage(baseDamage);
    const x = enemy.x;
    const y = enemy.y;
    const killed = this.damageEnemy(enemy, result.damage);
    this.spawnDamageNumber(x, y, result.damage, "enemy", result.critical);
    this.lastCriticalHit = {
      source,
      enemyId: enemy.id,
      baseDamage: result.baseDamage,
      damage: result.damage,
      critical: result.critical,
      killed,
    };
    return { ...result, killed };
  }

  spawnDamageNumber(x, y, damage, target, critical = false) {
    if (this.damageNumbers.length >= MAX_ACTIVE_DAMAGE_NUMBERS) {
      this.damageNumbers.shift().element.remove();
    }
    const isPlayerDamage = target === "player";
    const color = isPlayerDamage ? "#ff4fd8" : critical ? "#ffd166" : "#ffffff";
    const label = critical ? `CRIT ${damage}` : `-${damage}`;
    const horizontalOffset = ((this.damageNumbers.length % 3) - 1) * 7;
    const numberX = x + horizontalOffset + (isPlayerDamage ? -24 : 0);
    const numberY = y + (isPlayerDamage ? 24 : -16);
    const element = document.createElement("span");
    element.className = `damage-number${isPlayerDamage ? " player-damage" : ""}${critical ? " critical-damage" : ""}`;
    element.textContent = label;
    element.style.left = `${numberX}px`;
    element.style.top = `${numberY}px`;
    document.querySelector("#damage-number-layer").append(element);
    this.damageNumbers.push({
      element,
      x: numberX,
      y: numberY,
      damage,
      target,
      critical,
      color,
      lifeMs: DAMAGE_NUMBER_LIFETIME_MS,
    });
  }

  updateDamageNumbers(deltaMs) {
    const survivors = [];
    for (const number of this.damageNumbers) {
      number.lifeMs -= deltaMs;
      if (number.lifeMs <= 0) {
        number.element.remove();
        continue;
      }
      number.y -= (32 * deltaMs) / 1000;
      number.element.style.left = `${number.x}px`;
      number.element.style.top = `${number.y}px`;
      number.element.style.opacity = String(
        Phaser.Math.Clamp(number.lifeMs / DAMAGE_NUMBER_LIFETIME_MS, 0, 1),
      );
      survivors.push(number);
    }
    this.damageNumbers = survivors;
  }

  clearDamageNumbers() {
    for (const number of this.damageNumbers ?? []) number.element.remove();
    this.damageNumbers = [];
  }

  getEligibleUpgrades() {
    return UPGRADE_DEFINITIONS.filter((upgrade) =>
      !upgrade.oneTime || this.upgradeRanks[upgrade.id] === 0,
    );
  }

  rollUpgradeChoices() {
    const eligible = this.getEligibleUpgrades();
    const available = [...eligible];
    this.pendingUpgradeChoices = [];
    while (this.pendingUpgradeChoices.length < 2 && available.length > 0) {
      const totalWeight = available.reduce(
        (sum, upgrade) => sum + RARITY_WEIGHTS[upgrade.rarity],
        0,
      );
      let roll = Math.random() * totalWeight;
      let selectedIndex = available.length - 1;
      for (let index = 0; index < available.length; index += 1) {
        roll -= RARITY_WEIGHTS[available[index].rarity];
        if (roll < 0) {
          selectedIndex = index;
          break;
        }
      }
      this.pendingUpgradeChoices.push(available[selectedIndex]);
      available.splice(selectedIndex, 1);
    }
    return this.pendingUpgradeChoices;
  }

  applyUpgrade(upgradeId) {
    if (!this.pendingUpgradeChoices.some((upgrade) => upgrade.id === upgradeId)) return false;
    if (!this.applyUpgradeEffect(upgradeId)) return false;
    this.pendingUpgradeChoices = [];
    return true;
  }

  grantUpgradeForTesting(upgradeId) {
    const upgrade = UPGRADE_DEFINITIONS.find((candidate) => candidate.id === upgradeId);
    if (!this.levelActive || !upgrade) return false;
    if (upgrade.oneTime && this.upgradeRanks[upgradeId] > 0) return false;
    return this.applyUpgradeEffect(upgradeId);
  }

  applyUpgradeEffect(upgradeId) {
    const player = this.entities[0];
    if (!player) return false;

    if (upgradeId === "health") {
      this.upgradeRanks.health += 1;
      player.maxHealth += HEALTH_UPGRADE_STEP;
      player.health += HEALTH_UPGRADE_STEP;
      this.updateHealthHud();
    } else if (upgradeId === "speed") {
      this.upgradeRanks.speed += 1;
    } else if (upgradeId === "reload") {
      const priorDuration = this.getReloadDurationMs();
      this.upgradeRanks.reload += 1;
      const nextDuration = this.getReloadDurationMs();
      this.weaponReloadMs *= nextDuration / priorDuration;
      this.electroCooldownMs *= nextDuration / priorDuration;
      this.updateWeaponHud();
      this.updateElectroHud();
    } else if (upgradeId === "magnetism") {
      this.upgradeRanks.magnetism += 1;
    } else if (upgradeId === "critical") {
      this.upgradeRanks.critical += 1;
    } else if (upgradeId === "doubleShot") {
      if (this.upgradeRanks.doubleShot > 0) return false;
      this.upgradeRanks.doubleShot = 1;
    } else if (upgradeId === "penetratingShot") {
      if (this.upgradeRanks.penetratingShot > 0) return false;
      this.upgradeRanks.penetratingShot = 1;
    } else if (upgradeId === "naniteRehab") {
      if (this.upgradeRanks.naniteRehab > 0) return false;
      this.upgradeRanks.naniteRehab = 1;
      this.naniteRegenAccumulatorMs = 0;
    } else if (upgradeId === "electroTherapy") {
      if (this.upgradeRanks.electroTherapy > 0) return false;
      this.upgradeRanks.electroTherapy = 1;
      this.electroCooldownMs = 0;
    } else if (upgradeId === "shotgun") {
      if (this.upgradeRanks.shotgun > 0) return false;
      this.upgradeRanks.shotgun = 1;
    } else {
      return false;
    }

    this.updateStatsHud();
    this.updateElectroHud();
    updateTestingUpgradeButtons();
    return true;
  }

  getProjectileHitLimit() {
    return this.upgradeRanks.penetratingShot > 0 ? 2 : 1;
  }

  projectileSegmentHitsEnemy(projectile, enemy) {
    const segmentX = projectile.x - projectile.previousX;
    const segmentY = projectile.y - projectile.previousY;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    const projection = segmentLengthSquared > 0
      ? Phaser.Math.Clamp(
          ((enemy.x - projectile.previousX) * segmentX +
            (enemy.y - projectile.previousY) * segmentY) /
            segmentLengthSquared,
          0,
          1,
        )
      : 0;
    const closestX = projectile.previousX + segmentX * projection;
    const closestY = projectile.previousY + segmentY * projection;
    return Math.hypot(enemy.x - closestX, enemy.y - closestY) <=
      enemy.radius + projectile.radius;
  }

  updateWeaponHud() {
    if (!this.weaponStatusElement) return;
    const ready = this.aimActive && this.weaponReloadMs <= 0;
    const status = !this.aimActive
      ? "AIM REQUIRED"
      : ready
        ? "READY"
        : `RELOAD ${(this.weaponReloadMs / 1000).toFixed(1)}S`;
    const reloadProgress = this.weaponReloadMs <= 0
      ? 100
      : (1 - this.weaponReloadMs / this.getReloadDurationMs()) * 100;
    this.weaponStatusElement.dataset.ready = String(ready);
    this.weaponOutputElement.value = status;
    this.weaponOutputElement.textContent = status;
    this.weaponReloadFillElement.style.width = `${Phaser.Math.Clamp(reloadProgress, 0, 100)}%`;
  }

  updateElectroHud() {
    if (!this.electroStatusElement) return;
    const unlocked = this.upgradeRanks.electroTherapy > 0;
    const ready = unlocked && this.aimActive && this.electroCooldownMs <= 0;
    const status = !unlocked
      ? "LOCKED"
      : !this.aimActive
        ? "AIM REQUIRED"
        : this.electroCooldownMs <= 0
          ? "READY"
          : `${(this.electroCooldownMs / 1000).toFixed(1)}S`;
    const cooldown = this.getElectroTherapyCooldownMs();
    const progress = !unlocked || this.electroCooldownMs <= 0
      ? 100
      : (1 - this.electroCooldownMs / cooldown) * 100;
    this.electroStatusElement.dataset.ready = String(ready);
    this.electroStatusElement.dataset.unlocked = String(unlocked);
    this.electroOutputElement.value = status;
    this.electroOutputElement.textContent = status;
    this.electroCooldownFillElement.style.width = `${Phaser.Math.Clamp(progress, 0, 100)}%`;
  }

  updateXpHud() {
    if (!this.xpBarElement) return;
    const displayedXp = Math.min(this.playerXp, this.xpRequired);
    this.xpBarElement.setAttribute("aria-valuemax", String(this.xpRequired));
    this.xpBarElement.setAttribute("aria-valuenow", String(displayedXp));
    this.xpBarElement.setAttribute(
      "aria-valuetext",
      `${this.playerXp} of ${this.xpRequired} XP toward subject level ${this.playerLevel + 1}; ${this.totalPlayerXp} total XP earned`,
    );
    this.xpFillElement.style.width = `${(displayedXp / this.xpRequired) * 100}%`;
    this.xpLevelLabelElement.textContent = `SUBJECT LV ${this.playerLevel} // EXPERIENCE`;
    this.xpOutputElement.value = `${this.playerXp} / ${this.xpRequired} XP`;
    this.xpOutputElement.textContent = `${this.playerXp} / ${this.xpRequired} XP`;
  }

  updateStatsHud() {
    const player = this.entities[0];
    if (!player || !this.statLevelElement) return;
    this.statLevelElement.textContent = String(this.playerLevel);
    this.statHealthElement.textContent = String(player.maxHealth);
    this.statSpeedElement.textContent = this.getPlayerSpeed().toFixed(1).replace(".0", "");
    this.statReloadElement.textContent = `${(this.getReloadDurationMs() / 1000).toFixed(2)}s`;
    this.statMagnetismElement.textContent = `${this.getMagnetismDistance().toFixed(2)}px`;
    const volleyMultiplier = this.upgradeRanks.doubleShot > 0 ? 2 : 1;
    this.statVolleyElement.textContent = `${this.getWeaponVolleySize() * volleyMultiplier}x`;
    this.statPenetrationElement.textContent = `${this.getProjectileHitLimit()}x`;
    this.statRegenElement.textContent = this.upgradeRanks.naniteRehab > 0 ? "1 / 2s" : "LOCKED";
    this.statCriticalElement.textContent = `${Math.round(this.getCriticalChance() * 100)}%`;
    this.statWeaponElement.textContent = this.getStandardWeaponMode() === "shotgun" ? "SHOTGUN" : "SINGLE";
  }

  resolveArenaBoundary(entity) {
    const arena = this.getArenaBounds();
    const minX = arena.x + entity.radius;
    const maxX = arena.x + arena.width - entity.radius;
    const minY = arena.y + entity.radius;
    const maxY = arena.y + arena.height - entity.radius;

    let hitBoundary = false;
    if (entity.x < minX || entity.x > maxX) {
      hitBoundary = true;
      entity.x = Phaser.Math.Clamp(entity.x, minX, maxX);
      if (entity.kind === "enemy") {
        entity.vx *= -1;
        entity.angle = Math.atan2(entity.vy, entity.vx);
      } else {
        entity.vx = 0;
      }
    }
    if (entity.y < minY || entity.y > maxY) {
      hitBoundary = true;
      entity.y = Phaser.Math.Clamp(entity.y, minY, maxY);
      if (entity.kind === "enemy") {
        entity.vy *= -1;
        entity.angle = Math.atan2(entity.vy, entity.vx);
      } else {
        entity.vy = 0;
      }
    }
    return hitBoundary;
  }

  resolveEntityCollision(first, second) {
    let dx = second.x - first.x;
    let dy = second.y - first.y;
    let distance = Math.hypot(dx, dy);
    const minimumDistance = first.radius + second.radius;
    if (distance >= minimumDistance) return;

    const enemy = first.kind === "enemy" ? first : second.kind === "enemy" ? second : null;
    const includesPlayer = first.kind === "player" || second.kind === "player";
    if (state.mode === "level" && includesPlayer && enemy && enemy.hitCooldownMs <= 0) {
      this.hits += 1;
      this.impactFlashMs = 180;
      enemy.hitCooldownMs = 650;
      const player = first.kind === "player" ? first : second;
      player.health = Math.max(0, player.health - enemy.contactDamage);
      this.spawnDamageNumber(player.x, player.y, enemy.contactDamage, "player");
      this.updateHitCounter();
      this.updateHealthHud();
      playContactSfx();
      if (player.health === 0) showGameOver();
    }

    if (distance < 0.001) {
      dx = first.id < second.id ? 1 : -1;
      dy = 0;
      distance = 1;
    }

    this.collisionPairsLastFrame += 1;
    const normalX = dx / distance;
    const normalY = dy / distance;
    const overlap = minimumDistance - distance;
    first.x -= normalX * overlap * 0.5;
    first.y -= normalY * overlap * 0.5;
    second.x += normalX * overlap * 0.5;
    second.y += normalY * overlap * 0.5;

    const relativeVelocityX = second.vx - first.vx;
    const relativeVelocityY = second.vy - first.vy;
    const closingSpeed = relativeVelocityX * normalX + relativeVelocityY * normalY;
    if (closingSpeed >= 0) return;

    const impulse = (-1.65 * closingSpeed) / 2;
    first.vx -= impulse * normalX;
    first.vy -= impulse * normalY;
    second.vx += impulse * normalX;
    second.vy += impulse * normalY;
    if (first.kind === "enemy") first.angle = Math.atan2(first.vy, first.vx);
    if (second.kind === "enemy") second.angle = Math.atan2(second.vy, second.vx);
  }

  clampAllEntitiesToArena() {
    for (const entity of this.entities) this.resolveArenaBoundary(entity);
  }

  normalizeEnemyVelocity(enemy) {
    if (enemy.enemyType === "charger" && enemy.lungeActive) {
      enemy.vx = enemy.lungeDirection.x * enemy.speed * CHARGER_LUNGE_SPEED_MULTIPLIER;
      enemy.vy = enemy.lungeDirection.y * enemy.speed * CHARGER_LUNGE_SPEED_MULTIPLIER;
      enemy.angle = Math.atan2(enemy.vy, enemy.vx);
      return;
    }
    const currentSpeed = Math.hypot(enemy.vx, enemy.vy);
    if (currentSpeed < 0.001) {
      enemy.vx = Math.cos(enemy.angle) * enemy.speed;
      enemy.vy = Math.sin(enemy.angle) * enemy.speed;
      return;
    }
    enemy.vx = (enemy.vx / currentSpeed) * enemy.speed;
    enemy.vy = (enemy.vy / currentSpeed) * enemy.speed;
    enemy.angle = Math.atan2(enemy.vy, enemy.vx);
  }

  updateHitCounter() {
    if (!this.hitCounterElement) return;
    this.hitCounterElement.textContent = `HITS ${String(this.hits).padStart(2, "0")}`;
  }

  updateHealthHud() {
    const player = this.entities[0];
    if (!player || !this.healthBarElement) return;
    const healthPercent = Phaser.Math.Clamp(
      (player.health / player.maxHealth) * 100,
      0,
      100,
    );
    this.healthBarElement.setAttribute("aria-valuemax", String(player.maxHealth));
    this.healthBarElement.setAttribute("aria-valuenow", String(player.health));
    this.healthFillElement.style.width = `${healthPercent}%`;
    this.healthOutputElement.value = `${player.health} / ${player.maxHealth}`;
    this.healthOutputElement.textContent = `${player.health} / ${player.maxHealth}`;
  }

  spawnStreak(ageMs = 0, lane = null) {
    const horizon = this.scale.height * 0.43;
    const lifespan = 1350;
    const lanePosition =
      lane ?? this.roadLanes[this.streakLaneIndex++ % this.roadLanes.length];
    this.streaks.push({
      originX: this.scale.width * 0.72,
      originY: horizon,
      targetX: this.scale.width * (lanePosition + (Math.random() - 0.5) * 0.07),
      targetY: this.scale.height + 70,
      jitter: Array.from({ length: 18 }, () => Math.random() * 2 - 1),
      life: lifespan - ageMs,
      maxLife: lifespan,
    });
  }

  draw() {
    const width = this.scale.width;
    const height = this.scale.height;
    if (this.levelActive) {
      this.drawLevel(width, height);
      return;
    }

    const horizon = height * 0.43;
    const centerX = width * 0.72;
    const gridBottom = height + 80;

    this.graphics.clear();
    this.graphics.fillStyle(0x02070b, 1);
    this.graphics.fillRect(0, 0, width, height);

    this.graphics.fillGradientStyle(0x02070b, 0x02070b, 0x061b22, 0x061b22, 1);
    this.graphics.fillRect(0, horizon, width, height - horizon);

    this.graphics.lineStyle(1, 0x42f5ff, 0.18);
    for (let x = -width; x <= width * 2; x += 88) {
      this.graphics.lineBetween(centerX, horizon, x, gridBottom);
    }

    for (let y = horizon + 18 + this.gridOffset; y < gridBottom; y += 44) {
      const perspective = (y - horizon) / (gridBottom - horizon);
      const curvedY = horizon + perspective * perspective * (gridBottom - horizon);
      this.graphics.lineBetween(0, curvedY, width, curvedY);
    }

    this.graphics.lineStyle(1, 0x42f5ff, 0.3);
    this.graphics.lineBetween(0, horizon, width, horizon);

    for (const particle of this.particles) {
      this.graphics.fillStyle(0x42f5ff, particle.alpha);
      this.graphics.fillCircle(particle.x, particle.y, 1.2);
    }

    for (const streak of this.streaks) {
      const progress = 1 - streak.life / streak.maxLife;
      const pulse = Math.sin(progress * Math.PI);
      const head = Math.min(1, progress * 1.35);
      const tail = Math.max(0, head - 0.55);
      const points = streak.jitter.map((jitter, index, all) => {
        const local = index / (all.length - 1);
        const distance = tail + (head - tail) * local;
        const x = Phaser.Math.Linear(streak.originX, streak.targetX, distance);
        const y = Phaser.Math.Linear(streak.originY, streak.targetY, distance);
        const dx = streak.targetX - streak.originX;
        const dy = streak.targetY - streak.originY;
        const length = Math.max(1, Math.hypot(dx, dy));
        const perpendicularX = -dy / length;
        const perpendicularY = dx / length;
        const displacement =
          (index === 0 || index === all.length - 1 ? 0 : jitter) *
          (2 + distance * 12);
        return {
          x: x + perpendicularX * displacement,
          y: y + perpendicularY * displacement,
        };
      });

      const drawBolt = (width, color, alpha) => {
        this.graphics.lineStyle(width, color, alpha);
        this.graphics.beginPath();
        this.graphics.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) this.graphics.lineTo(point.x, point.y);
        this.graphics.strokePath();
      };

      drawBolt(9, 0xff2bd6, pulse * 0.08);
      drawBolt(4, 0xff2bd6, pulse * 0.38);
      drawBolt(1.5, 0xffb4f1, pulse);

      const leadingPoint = points.at(-1);
      this.graphics.fillStyle(0xffb4f1, pulse * 0.9);
      this.graphics.fillCircle(leadingPoint.x, leadingPoint.y, 2.2);
    }

    this.graphics.fillStyle(0x42f5ff, 0.06);
    this.graphics.fillCircle(width * 0.78, height * 0.2, Math.min(width, height) * 0.22);
  }

  drawLevel(width, height) {
    const arena = this.getArenaBounds();
    this.graphics.clear();
    this.graphics.fillStyle(0x02070b, 1);
    this.graphics.fillRect(0, 0, width, height);

    this.graphics.fillStyle(0x061216, 1);
    this.graphics.fillRect(arena.x, arena.y, arena.width, arena.height);

    this.graphics.lineStyle(1, 0x42f5ff, 0.09);
    const gridSize = 52;
    for (let x = arena.x + gridSize; x < arena.x + arena.width; x += gridSize) {
      this.graphics.lineBetween(x, arena.y, x, arena.y + arena.height);
    }
    for (let y = arena.y + gridSize; y < arena.y + arena.height; y += gridSize) {
      this.graphics.lineBetween(arena.x, y, arena.x + arena.width, y);
    }

    this.graphics.lineStyle(8, 0xff2bd6, 0.04);
    this.graphics.strokeRect(arena.x, arena.y, arena.width, arena.height);
    this.graphics.lineStyle(1, 0x42f5ff, 0.58);
    this.graphics.strokeRect(arena.x, arena.y, arena.width, arena.height);

    const cornerLength = Math.min(34, arena.width * 0.06, arena.height * 0.06);
    this.graphics.lineStyle(2, 0xff2bd6, 0.7);
    const corners = [
      [arena.x, arena.y, 1, 1],
      [arena.x + arena.width, arena.y, -1, 1],
      [arena.x, arena.y + arena.height, 1, -1],
      [arena.x + arena.width, arena.y + arena.height, -1, -1],
    ];
    for (const [x, y, xDirection, yDirection] of corners) {
      this.graphics.lineBetween(x, y, x + cornerLength * xDirection, y);
      this.graphics.lineBetween(x, y, x, y + cornerLength * yDirection);
    }

    for (const projectile of this.electroProjectiles) {
      const length = 54;
      const perpendicularX = -projectile.direction.y;
      const perpendicularY = projectile.direction.x;
      const points = [];
      for (let index = 0; index <= 5; index += 1) {
        const distance = (length * index) / 5;
        const jitter = index === 0 || index === 5 ? 0 : (index % 2 === 0 ? 4 : -4);
        points.push({
          x: projectile.x - projectile.direction.x * distance + perpendicularX * jitter,
          y: projectile.y - projectile.direction.y * distance + perpendicularY * jitter,
        });
      }
      this.graphics.lineStyle(8, 0xfff52e, 0.18);
      this.graphics.strokePoints(points, false);
      this.graphics.lineStyle(2, 0xfff45c, 1);
      this.graphics.strokePoints(points, false);
      this.graphics.fillStyle(0xffffff, 0.98);
      this.graphics.fillCircle(projectile.x, projectile.y, 2);
    }

    for (const projectile of this.projectiles) {
      this.graphics.fillStyle(0x42f5ff, 0.16);
      this.graphics.fillCircle(projectile.x, projectile.y, projectile.radius + 7);
      this.graphics.fillStyle(0xe7feff, 1);
      this.graphics.fillCircle(projectile.x, projectile.y, projectile.radius);
    }

    for (const burst of this.projectileImpactBursts) {
      const alpha = Phaser.Math.Clamp(burst.lifeMs / PROJECTILE_IMPACT_LIFETIME_MS, 0, 1);
      this.graphics.lineStyle(2, 0xffc7d1, alpha * 0.9);
      this.graphics.lineBetween(burst.fromX, burst.fromY, burst.toX, burst.toY);
      this.graphics.lineStyle(1, 0xffffff, alpha * 0.8);
      this.graphics.strokeCircle(burst.toX, burst.toY, 7 + (1 - alpha) * 5);
    }

    for (const drop of this.xpDrops) {
      this.graphics.fillStyle(0xff7a18, 0.16);
      this.graphics.fillCircle(drop.x, drop.y, drop.radius + 6);
      this.graphics.fillStyle(0xff9b2f, 1);
      this.graphics.fillCircle(drop.x, drop.y, drop.radius);
    }

    for (const entity of this.entities.slice(1)) {
      const palette = ENEMY_COLOR_SYSTEM[entity.enemyType] ?? ENEMY_COLOR_SYSTEM.circle;
      this.graphics.fillStyle(palette.glow, 0.12);
      this.graphics.fillCircle(entity.x, entity.y, entity.radius + 7);
      this.graphics.fillStyle(palette.body, 0.95);
      this.graphics.lineStyle(1, palette.outline, 0.85);
      if (entity.enemyType === "charger") {
        const visualRadius = entity.radius + 2;
        const points = Array.from({ length: 3 }, (_, index) => {
          const angle = entity.angle + (index * Math.PI * 2) / 3;
          return {
            x: entity.x + Math.cos(angle) * visualRadius,
            y: entity.y + Math.sin(angle) * visualRadius,
          };
        });
        this.graphics.fillTriangle(
          points[0].x, points[0].y,
          points[1].x, points[1].y,
          points[2].x, points[2].y,
        );
        this.graphics.strokeTriangle(
          points[0].x, points[0].y,
          points[1].x, points[1].y,
          points[2].x, points[2].y,
        );
      } else {
        this.graphics.fillCircle(entity.x, entity.y, entity.radius);
        this.graphics.strokeCircle(entity.x, entity.y, entity.radius);
      }
    }

    const player = this.entities[0];
    if (player) {
      if (this.aimActive) {
        const mouseAimActive = this.aimSource === "mouse" && this.mouseAimTarget;
        const targetDistance = mouseAimActive
          ? Math.hypot(
              this.mouseAimTarget.x - player.x,
              this.mouseAimTarget.y - player.y,
            )
          : 78;
        const lineDistance = Math.min(58, targetDistance);
        const aimStartX = player.x + this.aimDirection.x * (player.radius + 5);
        const aimStartY = player.y + this.aimDirection.y * (player.radius + 5);
        const aimLineEndX = player.x + this.aimDirection.x * lineDistance;
        const aimLineEndY = player.y + this.aimDirection.y * lineDistance;
        const aimEndX = mouseAimActive
          ? Phaser.Math.Clamp(this.mouseAimTarget.x, arena.x, arena.x + arena.width)
          : player.x + this.aimDirection.x * targetDistance;
        const aimEndY = mouseAimActive
          ? Phaser.Math.Clamp(this.mouseAimTarget.y, arena.y, arena.y + arena.height)
          : player.y + this.aimDirection.y * targetDistance;
        this.graphics.lineStyle(1, 0x42f5ff, 0.55);
        this.graphics.lineBetween(aimStartX, aimStartY, aimLineEndX, aimLineEndY);
        this.graphics.strokeCircle(aimEndX, aimEndY, 7);
        this.graphics.lineBetween(aimEndX - 10, aimEndY, aimEndX + 10, aimEndY);
        this.graphics.lineBetween(aimEndX, aimEndY - 10, aimEndX, aimEndY + 10);
      }
      this.graphics.fillStyle(0xb8c0ca, 0.14);
      this.graphics.fillCircle(player.x, player.y, player.radius + 10);
      this.graphics.fillStyle(0x9da6b2, 0.98);
      this.graphics.fillCircle(player.x, player.y, player.radius);
      this.graphics.lineStyle(2, 0xe5e9ee, 0.95);
      this.graphics.strokeCircle(player.x, player.y, player.radius);
      this.graphics.fillStyle(0xffffff, 0.95);
      this.graphics.fillCircle(player.x, player.y, 3);
      if (this.impactFlashMs > 0) {
        const flashStrength = this.impactFlashMs / 180;
        this.graphics.lineStyle(4, 0xff334f, flashStrength);
        this.graphics.strokeCircle(player.x, player.y, player.radius + 13);
      }
    }

    for (const arc of this.electroArcs) {
      const life = arc.lifeMs / ELECTRO_THERAPY_ARC_LIFETIME_MS;
      const dx = arc.toX - arc.fromX;
      const dy = arc.toY - arc.fromY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const perpendicularX = -dy / distance;
      const perpendicularY = dx / distance;
      const points = [];
      for (let index = 0; index <= 6; index += 1) {
        const ratio = index / 6;
        const jitter = index === 0 || index === 6 ? 0 : (index % 2 === 0 ? 7 : -7);
        points.push({
          x: arc.fromX + dx * ratio + perpendicularX * jitter,
          y: arc.fromY + dy * ratio + perpendicularY * jitter,
        });
      }
      this.graphics.lineStyle(9, 0xfff52e, 0.2 * life);
      this.graphics.strokePoints(points, false);
      this.graphics.lineStyle(3, 0xfff45c, life);
      this.graphics.strokePoints(points, false);
    }

    if (this.moveTarget) {
      this.graphics.lineStyle(1, 0x42f5ff, 0.62);
      this.graphics.strokeCircle(this.moveTarget.x, this.moveTarget.y, 9);
      this.graphics.lineBetween(
        this.moveTarget.x - 13,
        this.moveTarget.y,
        this.moveTarget.x + 13,
        this.moveTarget.y,
      );
      this.graphics.lineBetween(
        this.moveTarget.x,
        this.moveTarget.y - 13,
        this.moveTarget.x,
        this.moveTarget.y + 13,
      );
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game-canvas",
  backgroundColor: "#02070b",
  transparent: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  scene: TitleScene,
});
game.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

const menu = document.querySelector(".menu");
const statusElement = document.querySelector("#system-status");
const optionsDialog = document.querySelector("#options-dialog");
const aboutDialog = document.querySelector("#about-dialog");
const testingUpgradeButtons = document.querySelector("#testing-upgrade-buttons");
const levelUpDialog = document.querySelector("#level-up-dialog");
const levelUpChoices = document.querySelector("#level-up-choices");
const gameOverDialog = document.querySelector("#game-over-dialog");
const exitScreen = document.querySelector("#exit-screen");
const levelHud = document.querySelector("#level-hud");
const gameShell = document.querySelector("#game-shell");
const mobileFullscreenButton = document.querySelector("#mobile-fullscreen-button");
const menuMusic = document.querySelector("#menu-music");
const levelMusic = document.querySelector("#level-music");
const musicVolume = document.querySelector("#music-volume");
const musicVolumeOutput = document.querySelector("#music-volume-output");
const contactZap = document.querySelector("#contact-zap");
const weaponShot = document.querySelector("#weapon-shot");
const weaponImpact = document.querySelector("#weapon-impact");
const sfxVolume = document.querySelector("#sfx-volume");
const sfxVolumeOutput = document.querySelector("#sfx-volume-output");
const contactZapPool = Array.from({ length: 8 }, () => contactZap.cloneNode());
const weaponShotPool = Array.from({ length: 4 }, () => weaponShot.cloneNode());
const weaponImpactPool = Array.from({ length: 8 }, () => weaponImpact.cloneNode());
let contactZapPoolIndex = 0;
let weaponShotPoolIndex = 0;
let weaponImpactPoolIndex = 0;

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (!document.fullscreenEnabled || !gameShell.requestFullscreen) return;
  await gameShell.requestFullscreen({ navigationUI: "hide" });
}

function syncFullscreenControl() {
  const supported = Boolean(document.fullscreenEnabled && gameShell.requestFullscreen);
  mobileFullscreenButton.hidden = !supported;
  mobileFullscreenButton.textContent = document.fullscreenElement
    ? "Exit Fullscreen"
    : "Fullscreen";
  requestAnimationFrame(() => game.scale.refresh());
}

mobileFullscreenButton.addEventListener("click", () => {
  void toggleFullscreen().catch(() => {
    mobileFullscreenButton.textContent = "Unavailable";
  });
});
document.addEventListener("fullscreenchange", syncFullscreenControl);
syncFullscreenControl();

function updateTestingUpgradeButtons() {
  if (!testingUpgradeButtons) return;
  const scene = game.scene.getScene("title");
  const activeRun = Boolean(scene?.levelActive);
  for (const button of testingUpgradeButtons.querySelectorAll("button")) {
    const upgrade = UPGRADE_DEFINITIONS.find((candidate) => candidate.id === button.dataset.upgradeId);
    if (!upgrade) continue;
    const rank = scene?.upgradeRanks?.[upgrade.id] ?? 0;
    const alreadyOwned = Boolean(upgrade.oneTime && rank > 0);
    button.disabled = !activeRun || alreadyOwned;
    button.textContent = `${upgrade.rarity.toUpperCase()} // ${upgrade.name}${upgrade.oneTime ? (alreadyOwned ? " // OWNED" : "") : ` // RANK ${rank}`}`;
  }
}

function buildTestingUpgradeButtons() {
  for (const upgrade of UPGRADE_DEFINITIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `testing-upgrade-button rarity-${upgrade.rarity}`;
    button.dataset.upgradeId = upgrade.id;
    button.addEventListener("click", () => {
      const scene = game.scene.getScene("title");
      if (!scene.grantUpgradeForTesting(upgrade.id)) return;
      updateTestingUpgradeButtons();
    });
    testingUpgradeButtons.append(button);
  }
  updateTestingUpgradeButtons();
}

buildTestingUpgradeButtons();

menuMusic.volume = 0.5;
levelMusic.volume = 0.5;

function isLevelMusicMode() {
  return state.mode === "level" ||
    state.mode === "levelup" ||
    (state.mode === "options" && state.optionsReturnMode === "level");
}

async function playMenuMusic() {
  if (["level", "levelup", "gameover", "terminated"].includes(state.mode)) return false;
  if (!menuMusic.paused) return true;
  try {
    await menuMusic.play();
    if (["level", "levelup", "gameover", "terminated"].includes(state.mode)) {
      menuMusic.pause();
      state.musicPlayback = "paused";
      return false;
    }
    state.musicPlayback = "playing";
    return true;
  } catch {
    state.musicPlayback = "awaiting-interaction";
    return false;
  }
}

async function playLevelMusic(restart = false) {
  if (!isLevelMusicMode()) return false;
  if (restart) levelMusic.currentTime = 0;
  if (!levelMusic.paused) {
    state.musicPlayback = "playing";
    return true;
  }
  try {
    await levelMusic.play();
    if (!isLevelMusicMode()) {
      levelMusic.pause();
      state.musicPlayback = "paused";
      return false;
    }
    state.musicPlayback = "playing";
    return true;
  } catch {
    state.musicPlayback = "awaiting-interaction";
    return false;
  }
}

function stopLevelMusic(reset = true) {
  levelMusic.pause();
  if (reset) levelMusic.currentTime = 0;
}

function unlockMenuMusic() {
  void playMenuMusic().then((started) => {
    if (!started) return;
    window.removeEventListener("pointerdown", unlockMenuMusic, true);
    window.removeEventListener("keydown", unlockMenuMusic, true);
  });
}

window.addEventListener("pointerdown", unlockMenuMusic, true);
window.addEventListener("keydown", unlockMenuMusic, true);
void playMenuMusic();

function setStatus(status) {
  state.status = status;
  statusElement.textContent = status;
}

function setMusicVolume(value) {
  const volume = Phaser.Math.Clamp(Number(value), 0, 100);
  state.musicVolume = volume;
  menuMusic.volume = volume / 100;
  levelMusic.volume = volume / 100;
  musicVolume.value = String(volume);
  musicVolume.style.setProperty("--volume", `${volume}%`);
  musicVolumeOutput.value = `${volume}%`;
  musicVolumeOutput.textContent = `${volume}%`;
}

function setSfxVolume(value) {
  const volume = Phaser.Math.Clamp(Number(value), 0, 100);
  state.sfxVolume = volume;
  contactZap.volume = volume / 100;
  weaponShot.volume = volume / 100;
  weaponImpact.volume = volume / 100;
  for (const sound of contactZapPool) sound.volume = volume / 100;
  for (const sound of weaponShotPool) sound.volume = volume / 100;
  for (const sound of weaponImpactPool) sound.volume = volume / 100;
  sfxVolume.value = String(volume);
  sfxVolume.style.setProperty("--volume", `${volume}%`);
  sfxVolumeOutput.value = `${volume}%`;
  sfxVolumeOutput.textContent = `${volume}%`;
}

function playContactSfx() {
  const sound = contactZapPool[contactZapPoolIndex];
  contactZapPoolIndex = (contactZapPoolIndex + 1) % contactZapPool.length;
  sound.pause();
  sound.currentTime = 0;
  sound.volume = state.sfxVolume / 100;
  state.sfxPlayRequests += 1;
  void sound.play().then(() => {
    state.sfxPlaybackStarts += 1;
  }).catch(() => {});
}

function playWeaponShotSfx() {
  const sound = weaponShotPool[weaponShotPoolIndex];
  weaponShotPoolIndex = (weaponShotPoolIndex + 1) % weaponShotPool.length;
  sound.pause();
  sound.currentTime = 0;
  sound.volume = state.sfxVolume / 100;
  state.weaponSfxPlayRequests += 1;
  void sound.play().then(() => {
    state.weaponSfxPlaybackStarts += 1;
  }).catch(() => {});
}

function playWeaponImpactSfx() {
  const sound = weaponImpactPool[weaponImpactPoolIndex];
  weaponImpactPoolIndex = (weaponImpactPoolIndex + 1) % weaponImpactPool.length;
  sound.pause();
  sound.currentTime = 0;
  sound.volume = state.sfxVolume / 100;
  state.weaponImpactSfxPlayRequests += 1;
  void sound.play().then(() => {
    state.weaponImpactSfxPlaybackStarts += 1;
  }).catch(() => {});
}

function handleVolumeSliderKeydown(event, setVolume) {
  const current = Number(event.currentTarget.value);
  const nextValue = {
    ArrowLeft: current - 1,
    ArrowDown: current - 1,
    ArrowRight: current + 1,
    ArrowUp: current + 1,
    PageDown: current - 10,
    PageUp: current + 10,
    Home: 0,
    End: 100,
  }[event.key];
  if (nextValue === undefined) return;
  event.preventDefault();
  event.stopPropagation();
  setVolume(nextValue);
}

setMusicVolume(50);
musicVolume.addEventListener("input", (event) => {
  setMusicVolume(event.currentTarget.value);
});
musicVolume.addEventListener("keydown", (event) => {
  handleVolumeSliderKeydown(event, setMusicVolume);
});

setSfxVolume(50);
sfxVolume.addEventListener("input", (event) => {
  setSfxVolume(event.currentTarget.value);
});
sfxVolume.addEventListener("keydown", (event) => {
  handleVolumeSliderKeydown(event, setSfxVolume);
});

function openOptions(returnMode) {
  state.optionsReturnMode = returnMode;
  state.mode = "options";
  updateTestingUpgradeButtons();
  optionsDialog.showModal();
  requestAnimationFrame(focusFirstControllerControl);
}

function returnToMenu(status = "Connection restored") {
  if (levelUpDialog.open) levelUpDialog.close();
  if (gameOverDialog.open) gameOverDialog.close();
  game.scene.getScene("title").stopLevel();
  stopLevelMusic();
  state.mode = "menu";
  menu.hidden = false;
  levelHud.hidden = true;
  gameShell.setAttribute("aria-label", "Test Subject 01 title screen");
  setStatus(status);
  void playMenuMusic();
  document.querySelector("#start-button").focus();
}

function showLevelUp() {
  const scene = game.scene.getScene("title");
  if (!scene.levelActive || state.mode !== "level") return;
  const choices = scene.rollUpgradeChoices();
  levelUpChoices.replaceChildren();

  choices.forEach((upgrade, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `upgrade-choice rarity-${upgrade.rarity}`;
    button.dataset.upgradeId = upgrade.id;
    button.dataset.rarity = upgrade.rarity;
    button.setAttribute("aria-label", `${upgrade.rarity} upgrade: ${upgrade.name}`);

    const code = document.createElement("span");
    code.className = "upgrade-code";
    code.textContent = `0${index + 1} // ${upgrade.rarity.toUpperCase()} // ${upgrade.code}`;
    const name = document.createElement("span");
    name.className = "upgrade-name";
    name.textContent = upgrade.name;
    const effect = document.createElement("span");
    effect.className = "upgrade-effect";
    effect.textContent = upgrade.effect;
    button.append(code, name, effect);

    button.addEventListener("click", () => {
      if (!scene.applyUpgrade(upgrade.id)) return;
      levelUpDialog.close();
      state.mode = "level";
      gameShell.setAttribute("aria-label", "Test Subject 01 level one");
    });
    levelUpChoices.append(button);
  });

  state.mode = "levelup";
  gameShell.setAttribute("aria-label", `Test Subject 01 subject level ${scene.playerLevel} upgrade selection`);
  levelUpDialog.showModal();
  requestAnimationFrame(focusFirstControllerControl);
}

function showRunEnd(outcome) {
  if (["gameover", "survived"].includes(state.mode)) return;
  const survived = outcome === "survived";
  state.mode = survived ? "survived" : "gameover";
  state.musicPlayback = "paused";
  menuMusic.pause();
  levelMusic.pause();
  document.querySelector("#run-end-eyebrow").textContent = survived
    ? "SURVIVAL THRESHOLD // COMPLETE"
    : "SUBJECT VITALS // ZERO";
  document.querySelector("#game-over-title").textContent = survived
    ? "You Survived"
    : "Game Over";
  document.querySelector("#run-end-copy").textContent = survived
    ? "Three-minute trial completed."
    : "Test subject terminated.";
  gameOverDialog.dataset.outcome = survived ? "survived" : "gameover";
  gameShell.setAttribute("aria-label", survived
    ? "Test Subject 01 survival complete"
    : "Test Subject 01 game over");
  gameOverDialog.showModal();
  requestAnimationFrame(() => document.querySelector("#try-again-button").focus());
}

function showGameOver() {
  showRunEnd("gameover");
}

document.querySelector("#start-button").addEventListener("click", () => {
  state.mode = "level";
  state.musicPlayback = "paused";
  menuMusic.pause();
  stopLevelMusic();
  menu.hidden = true;
  levelHud.hidden = false;
  gameShell.setAttribute("aria-label", "Test Subject 01 level one");
  game.scene.getScene("title").startLevel();
  void playLevelMusic(true);
});

document.querySelector("#options-button").addEventListener("click", () => {
  openOptions("menu");
});

document.querySelector("#about-button").addEventListener("click", () => {
  state.mode = "about";
  aboutDialog.showModal();
  requestAnimationFrame(focusFirstControllerControl);
});

document.querySelector("#close-about-button").addEventListener("click", () => {
  aboutDialog.close();
});

aboutDialog.addEventListener("close", () => {
  state.mode = "menu";
  document.querySelector("#about-button").focus();
});

document.querySelector("#level-options-button").addEventListener("click", () => {
  openOptions("level");
});

document.querySelector("#close-options-button").addEventListener("click", () => {
  optionsDialog.close();
});

optionsDialog.addEventListener("close", () => {
  state.mode = state.optionsReturnMode;
  if (state.mode === "level") {
    document.querySelector("#level-options-button").focus();
  } else {
    setStatus("Awaiting input");
    document.querySelector("#options-button").focus();
  }
});

gameOverDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
});

levelUpDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
});

document.querySelector("#try-again-button").addEventListener("click", () => {
  gameOverDialog.close();
  state.mode = "level";
  gameShell.setAttribute("aria-label", "Test Subject 01 level one");
  game.scene.getScene("title").startLevel();
  void playLevelMusic(true);
});

document.querySelector("#main-menu-button").addEventListener("click", () => {
  returnToMenu("Subject reset");
});

document.querySelector("#exit-button").addEventListener("click", () => {
  state.mode = "terminated";
  state.musicPlayback = "paused";
  menuMusic.pause();
  menu.hidden = true;
  exitScreen.hidden = false;
  document.querySelector("#resume-button").focus();
});

document.querySelector("#resume-button").addEventListener("click", () => {
  state.mode = "menu";
  exitScreen.hidden = true;
  menu.hidden = false;
  setStatus("Connection restored");
  void playMenuMusic();
  document.querySelector("#start-button").focus();
});

window.addEventListener("gamepadconnected", (event) => {
  if (state.mode === "menu") setStatus(`Controller detected // slot ${event.gamepad.index + 1}`);
});

window.addEventListener("gamepaddisconnected", (event) => {
  if (event.gamepad.index !== state.gamepadIndex) return;
  state.gamepadConnected = false;
  state.gamepadMovement = { x: 0, y: 0 };
  if (state.mode === "menu") setStatus("Controller disconnected");
});

window.render_game_to_text = () => {
  const scene = game.scene.getScene("title");
  const roundCoordinate = (value) => Math.round(value * 100) / 100;
  const level =
    scene.levelActive
      ? {
          goal: "Avoid contact with the red pursuers",
          paused: ["options", "levelup", "gameover", "survived"].includes(state.mode),
          gameOver: state.mode === "gameover",
          survived: state.mode === "survived",
          choosingUpgrade: state.mode === "levelup",
          hits: scene.hits,
          contactDamage: ENEMY_CONTACT_DAMAGE,
          chargerContactDamage: CHARGER_CONTACT_DAMAGE,
          impactFlashMs: roundCoordinate(scene.impactFlashMs),
          survival: {
            durationMs: SURVIVAL_DURATION_MS,
            elapsedMs: roundCoordinate(scene.survivalElapsedMs),
            remainingMs: roundCoordinate(Math.max(0, SURVIVAL_DURATION_MS - scene.survivalElapsedMs)),
          },
          arena: scene.getArenaBounds(),
          player: scene.entities[0]
            ? {
                x: roundCoordinate(scene.entities[0].x),
                y: roundCoordinate(scene.entities[0].y),
                radius: scene.entities[0].radius,
                color: "grey",
                health: scene.entities[0].health,
                maxHealth: scene.entities[0].maxHealth,
                movementSpeed: roundCoordinate(scene.getPlayerSpeed()),
                naniteRehab: {
                  unlocked: scene.upgradeRanks.naniteRehab > 0,
                  healingPerTick: NANITE_REHAB_HEALING,
                  intervalMs: NANITE_REHAB_INTERVAL_MS,
                  accumulatorMs: roundCoordinate(scene.naniteRegenAccumulatorMs),
                  totalHealingApplied: scene.naniteHealingApplied,
                },
                vx: roundCoordinate(scene.entities[0].vx),
                vy: roundCoordinate(scene.entities[0].vy),
              }
            : null,
          enemies: scene.entities.slice(1).map((enemy) => ({
            id: enemy.id,
            type: enemy.enemyType,
            color: (() => {
              const palette = ENEMY_COLOR_SYSTEM[enemy.enemyType] ?? ENEMY_COLOR_SYSTEM.circle;
              const toHex = (value) => `#${value.toString(16).padStart(6, "0")}`;
              return {
                family: palette.name,
                body: toHex(palette.body),
                outline: toHex(palette.outline),
                glow: toHex(palette.glow),
              };
            })(),
            x: roundCoordinate(enemy.x),
            y: roundCoordinate(enemy.y),
            radius: enemy.radius,
            health: enemy.health,
            maxHealth: enemy.maxHealth,
            baseSpeed: enemy.speed,
            vx: roundCoordinate(enemy.vx),
            vy: roundCoordinate(enemy.vy),
            hitCooldownMs: roundCoordinate(enemy.hitCooldownMs),
            contactDamage: enemy.contactDamage,
            xpValue: enemy.xpValue,
            lunge: enemy.enemyType === "charger"
              ? {
                  active: enemy.lungeActive,
                  cooldownMs: roundCoordinate(enemy.lungeCooldownMs),
                  triggerDistance: CHARGER_LUNGE_TRIGGER_DISTANCE,
                  maximumDistance: CHARGER_LUNGE_DISTANCE,
                  distanceTraveled: roundCoordinate(enemy.lungeDistanceTraveled),
                  remainingDistance: roundCoordinate(enemy.lungeRemainingDistance),
                  speedMultiplier: CHARGER_LUNGE_SPEED_MULTIPLIER,
                  direction: enemy.lungeDirection
                    ? {
                        x: roundCoordinate(enemy.lungeDirection.x),
                        y: roundCoordinate(enemy.lungeDirection.y),
                      }
                    : null,
                }
              : null,
          })),
          damageNumbers: scene.damageNumbers.map((number) => ({
            text: number.element.textContent,
            x: roundCoordinate(number.x),
            y: roundCoordinate(number.y),
            damage: number.damage,
            target: number.target,
            critical: number.critical,
            color: number.color,
            remainingMs: roundCoordinate(number.lifeMs),
          })),
          damageNumberCapacity: MAX_ACTIVE_DAMAGE_NUMBERS,
          collisionPairsLastFrame: scene.collisionPairsLastFrame,
          moveTarget: scene.moveTarget,
          weapon: {
            mobileAutoFire: usesMobileTouchInterface() && !state.gamepadConnected,
            aimActive: scene.aimActive,
            aimSource: scene.aimSource,
            aimDirection: {
              x: roundCoordinate(scene.aimDirection.x),
              y: roundCoordinate(scene.aimDirection.y),
            },
            damage: PROJECTILE_DAMAGE,
            critical: {
              baseChance: BASE_CRITICAL_CHANCE,
              chancePerUpgrade: CRITICAL_CHANCE_UPGRADE_STEP,
              currentChance: roundCoordinate(scene.getCriticalChance()),
              damageMultiplier: CRITICAL_DAMAGE_MULTIPLIER,
              rolls: scene.criticalRolls,
              hits: scene.criticalHits,
              last: scene.lastCriticalHit,
            },
            reloadDurationMs: roundCoordinate(scene.getReloadDurationMs()),
            reloadSpeedMultiplier: roundCoordinate(scene.getReloadSpeedMultiplier()),
            reloadRemainingMs: roundCoordinate(scene.weaponReloadMs),
            ready: scene.aimActive && scene.weaponReloadMs <= 0,
            projectileSpeed: PROJECTILE_SPEED,
            projectileRadius: PROJECTILE_RADIUS,
            projectileEndCondition: scene.getStandardWeaponMode() === "shotgun"
              ? "enemy-hit, 420px range, or arena-edge"
              : "enemy-hit-or-arena-edge",
            projectileHitLimit: scene.getProjectileHitLimit(),
            projectilePenetrations: scene.projectilePenetrations,
            completedPenetrations: scene.completedPenetrations,
            knockback: {
              distance: PROJECTILE_KNOCKBACK_DISTANCE,
              appliesTo: "standard bullets and shotgun pellets",
              electroTherapyApplied: false,
              totalApplied: scene.projectileKnockbacks,
              last: scene.lastProjectileKnockback
                ? {
                    ...scene.lastProjectileKnockback,
                    distance: roundCoordinate(scene.lastProjectileKnockback.distance),
                    direction: {
                      x: roundCoordinate(scene.lastProjectileKnockback.direction.x),
                      y: roundCoordinate(scene.lastProjectileKnockback.direction.y),
                    },
                    from: {
                      x: roundCoordinate(scene.lastProjectileKnockback.from.x),
                      y: roundCoordinate(scene.lastProjectileKnockback.from.y),
                    },
                    to: {
                      x: roundCoordinate(scene.lastProjectileKnockback.to.x),
                      y: roundCoordinate(scene.lastProjectileKnockback.to.y),
                    },
                  }
                : null,
              activeImpactBursts: scene.projectileImpactBursts.length,
              impactLifetimeMs: PROJECTILE_IMPACT_LIFETIME_MS,
            },
            doubleShotDelayMs: DOUBLE_SHOT_DELAY_MS,
            volleySize: scene.getWeaponVolleySize() * (scene.upgradeRanks.doubleShot > 0 ? 2 : 1),
            standardWeapon: {
              mode: scene.getStandardWeaponMode(),
              shotgunUnlocked: scene.upgradeRanks.shotgun > 0,
              pelletCount: scene.getWeaponVolleySize(),
              spreadDegrees: scene.upgradeRanks.shotgun > 0 ? SHOTGUN_SPREAD_DEGREES : 0,
              maxRange: scene.upgradeRanks.shotgun > 0 ? SHOTGUN_RANGE : null,
              doubleShotApplied: scene.upgradeRanks.doubleShot > 0,
              penetrationApplied: scene.upgradeRanks.penetratingShot > 0,
              reloadApplied: true,
            },
            pendingFollowUpShots: scene.pendingWeaponShots.map((pendingShot) => ({
              remainingMs: roundCoordinate(pendingShot.remainingMs),
              hitLimit: pendingShot.hitLimit,
              weaponMode: pendingShot.weaponMode,
              direction: {
                x: roundCoordinate(pendingShot.direction.x),
                y: roundCoordinate(pendingShot.direction.y),
              },
            })),
            shotsFired: scene.shotsFired,
            enemiesDestroyed: scene.enemiesDestroyed,
            projectiles: scene.projectiles.map((projectile) => ({
              id: projectile.id,
              x: roundCoordinate(projectile.x),
              y: roundCoordinate(projectile.y),
              vx: roundCoordinate(projectile.vx),
              vy: roundCoordinate(projectile.vy),
              hitCount: projectile.hitCount,
              hitLimit: projectile.hitLimit,
              weaponMode: projectile.weaponMode,
              maxRange: projectile.maxRange,
              distanceTraveled: roundCoordinate(projectile.distanceTraveled),
              hitEnemyIds: projectile.hitEnemyIds,
            })),
            electroTherapy: {
              unlocked: scene.upgradeRanks.electroTherapy > 0,
              damage: ELECTRO_THERAPY_DAMAGE,
              baseCooldownMs: ELECTRO_THERAPY_BASE_COOLDOWN_MS,
              cooldownDurationMs: roundCoordinate(scene.getElectroTherapyCooldownMs()),
              cooldownRemainingMs: roundCoordinate(scene.electroCooldownMs),
              chainRange: ELECTRO_THERAPY_CHAIN_RANGE,
              chainDelayMs: ELECTRO_THERAPY_CHAIN_DELAY_MS,
              doubleShotApplied: scene.upgradeRanks.doubleShot > 0,
              penetrationApplied: false,
              projectilesFired: scene.electroProjectilesFired,
              targetsHit: scene.electroTargetsHit,
              chainHits: scene.electroChainHits,
              projectiles: scene.electroProjectiles.map((projectile) => ({
                id: projectile.id,
                x: roundCoordinate(projectile.x),
                y: roundCoordinate(projectile.y),
                vx: roundCoordinate(projectile.vx),
                vy: roundCoordinate(projectile.vy),
              })),
              pendingFollowUpShots: scene.pendingElectroShots.map((shot) => ({
                remainingMs: roundCoordinate(shot.remainingMs),
              })),
              pendingChains: scene.pendingElectroChains.map((chain) => ({
                remainingMs: roundCoordinate(chain.remainingMs),
                firstTargetId: chain.firstTargetId,
              })),
              activeArcs: scene.electroArcs.length,
            },
          },
          xp: {
            total: scene.playerXp,
            displayScale: scene.xpRequired,
            totalEarned: scene.totalPlayerXp,
            playerLevel: scene.playerLevel,
            requiredForNextLevel: scene.xpRequired,
            requirementGrowth: LEVEL_XP_GROWTH,
            dropRadius: XP_DROP_RADIUS,
            magnetismDistance: roundCoordinate(scene.getMagnetismDistance()),
            magnetismPullSpeed: XP_MAGNET_PULL_SPEED,
            offeredUpgrades: scene.pendingUpgradeChoices.map((upgrade) => upgrade.id),
            offeredUpgradeDetails: scene.pendingUpgradeChoices.map((upgrade) => ({
              id: upgrade.id,
              rarity: upgrade.rarity,
              weight: RARITY_WEIGHTS[upgrade.rarity],
            })),
            rarityWeights: RARITY_WEIGHTS,
            eligibleUpgrades: scene.getEligibleUpgrades().map((upgrade) => upgrade.id),
            upgradeRanks: scene.upgradeRanks,
            drops: scene.xpDrops.map((drop) => ({
              id: drop.id,
              x: roundCoordinate(drop.x),
              y: roundCoordinate(drop.y),
              radius: drop.radius,
              value: drop.value,
            })),
          },
          spawning: {
            elapsedMs: roundCoordinate(scene.spawnElapsedMs),
            ratePerSecond: scene.spawnRatePerSecond,
            rateStepMs: SPAWN_RATE_STEP_MS,
            rateSequence: ENEMY_SPAWN_RATES,
            charger: {
              firstSpawnMs: CHARGER_FIRST_SPAWN_MS,
              intervalMs: CHARGER_SPAWN_INTERVAL_MS,
              nextSpawnMs: scene.nextChargerSpawnMs,
              spawnedBySystem: scene.chargersSpawnedBySystem,
              active: scene.entities.filter((enemy) => enemy.enemyType === "charger").length,
            },
            spawnedBySystem: scene.enemiesSpawnedBySystem,
            activeEnemies: Math.max(0, scene.entities.length - 1),
          },
        }
      : null;

  return JSON.stringify({
    coordinateSystem: "origin top-left; x right; y down",
    mode: state.mode,
    status: state.status,
    level,
    audio: {
      track: scene.levelActive ? "Heavy Weather" : "Cold Steel Prayer",
      menuTrack: "Cold Steel Prayer",
      levelTrack: "Heavy Weather",
      volume: state.musicVolume,
      playback: state.musicPlayback,
      menuPlayback: menuMusic.paused ? "paused" : "playing",
      levelPlayback: levelMusic.paused ? "paused" : "playing",
      contactEffect: "Contact zap (first 1.000 seconds)",
      weaponEffect: "Per pew (source 0.000s–1.500s)",
      weaponImpactEffect: "Previous pop cap shot (trimmed first 0.400s; retained 0.600s)",
      sfxVolume: state.sfxVolume,
      sfxPlayRequests: state.sfxPlayRequests,
      sfxPlaybackStarts: state.sfxPlaybackStarts,
      weaponSfxPlayRequests: state.weaponSfxPlayRequests,
      weaponSfxPlaybackStarts: state.weaponSfxPlaybackStarts,
      weaponImpactSfxPlayRequests: state.weaponImpactSfxPlayRequests,
      weaponImpactSfxPlaybackStarts: state.weaponImpactSfxPlaybackStarts,
    },
    gamepad: {
      connected: state.gamepadConnected,
      id: state.gamepadId,
      index: state.gamepadIndex,
      mapping: state.gamepadMapping,
      deadzone: GAMEPAD_DEADZONE,
      movement: state.gamepadMovement,
    },
    visibleControls:
      state.mode === "level"
        ? usesMobileTouchInterface() && !state.gamepadConnected
          ? [
              "Touch-tap destination movement",
              "Automatic nearest-enemy aim and fire",
              "Fullscreen",
              "Options",
            ]
          : [
            "WASD",
            "Arrow keys",
            "Xbox left stick or D-pad",
            "Mouse aim",
            "Xbox right-stick aim",
            "Left mouse, Space, or Xbox right-trigger fire",
            "Right-click or touch-tap destination",
            "Xbox Menu button or Options",
            "Escape or Xbox B to menu",
          ]
        : state.mode === "terminated"
        ? ["Reconnect"]
        : ["gameover", "survived"].includes(state.mode)
          ? ["Try Again", "Main Menu", "D-pad navigation", "A select", "B main menu"]
        : state.mode === "levelup"
          ? ["Choose one upgrade", "D-pad or left-stick navigation", "A select"]
        : state.mode === "options"
          ? ["Menu music volume", "Sound effects volume", "D-pad navigation", "A select", "B return"]
        : state.mode === "about"
          ? ["Portfolio", "LinkedIn", "Return", "D-pad navigation", "A select", "B return"]
          : ["Start", "Options", "About", "Exit", "D-pad navigation", "A select", "Menu button start"],
  });
};

window.advanceTime = (ms) => {
  const scene = game.scene.getScene("title");
  if (!scene?.scene.isActive()) return;
  const frameMs = 1000 / 60;
  const steps = Math.max(1, Math.round(ms / frameMs));
  for (let step = 0; step < steps; step += 1) scene.update(0, frameMs);
};

if (import.meta.env.DEV) {
  window.__testSubject01 = {
    forceNextCritical(critical = true) {
      const scene = game.scene.getScene("title");
      if (!scene.levelActive) return false;
      scene.forcedCriticalResults.push(Boolean(critical));
      return true;
    },
    setEnemyHealth(enemyId, health) {
      const scene = game.scene.getScene("title");
      const enemy = scene.entities.find((entity) => entity.id === enemyId && entity.kind === "enemy");
      if (!scene.levelActive || !enemy || !Number.isFinite(health) || health <= 0) return false;
      enemy.maxHealth = health;
      enemy.health = health;
      return true;
    },
    setPlayerHealth(health) {
      const scene = game.scene.getScene("title");
      const player = scene.entities[0];
      if (!scene.levelActive || !player) return false;
      player.health = Phaser.Math.Clamp(health, 0, player.maxHealth);
      scene.updateHealthHud();
      return true;
    },
    setSurvivalElapsedMs(elapsedMs) {
      const scene = game.scene.getScene("title");
      if (!scene.levelActive) return false;
      scene.survivalElapsedMs = Phaser.Math.Clamp(elapsedMs, 0, SURVIVAL_DURATION_MS);
      scene.updateSurvivalTimerHud();
      return true;
    },
    setSpawnElapsedMs(elapsedMs) {
      const scene = game.scene.getScene("title");
      if (!scene.levelActive) return false;
      scene.spawnElapsedMs = Phaser.Math.Clamp(elapsedMs, 0, SURVIVAL_DURATION_MS);
      scene.nextChargerSpawnMs = Math.max(
        CHARGER_FIRST_SPAWN_MS,
        CHARGER_FIRST_SPAWN_MS +
          Math.ceil(Math.max(0, scene.spawnElapsedMs - CHARGER_FIRST_SPAWN_MS) / CHARGER_SPAWN_INTERVAL_MS) *
            CHARGER_SPAWN_INTERVAL_MS,
      );
      return true;
    },
    spawnChargerNearPlayer(distance = 200) {
      const scene = game.scene.getScene("title");
      const player = scene.entities[0];
      if (!scene.levelActive || !player) return null;
      scene.createEnemyAtNormalizedPosition(0.5, 0.5, false, "charger");
      const charger = scene.entities.at(-1);
      const arena = scene.getArenaBounds();
      charger.x = Phaser.Math.Clamp(
        player.x + distance,
        arena.x + charger.radius,
        arena.x + arena.width - charger.radius,
      );
      charger.y = player.y;
      charger.vx = -charger.speed;
      charger.vy = 0;
      charger.angle = Math.PI;
      return charger.id;
    },
    setPlayerPosition(x, y) {
      const scene = game.scene.getScene("title");
      const player = scene.entities[0];
      if (!scene.levelActive || !player) return false;
      const arena = scene.getArenaBounds();
      player.x = Phaser.Math.Clamp(x, arena.x + player.radius, arena.x + arena.width - player.radius);
      player.y = Phaser.Math.Clamp(y, arena.y + player.radius, arena.y + arena.height - player.radius);
      player.vx = 0;
      player.vy = 0;
      return true;
    },
    clearEnemies() {
      const scene = game.scene.getScene("title");
      if (!scene.levelActive) return false;
      scene.entities = scene.entities.slice(0, 1);
      scene.spawnAccumulator = 0;
      scene.weaponReloadMs = 0;
      scene.electroCooldownMs = 0;
      return true;
    },
  };
}

window.addEventListener("keydown", async (event) => {
  if (event.key === "Escape" && state.mode === "level") {
    if (document.fullscreenElement) return;
    event.preventDefault();
    returnToMenu();
    return;
  }

  if (event.key.toLowerCase() === "f") {
    await toggleFullscreen();
  }
});
