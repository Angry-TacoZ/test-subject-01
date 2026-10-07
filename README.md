# Test Subject 01

Current gameplay and system settings are recorded in [docs/GAME_VALUES.md](docs/GAME_VALUES.md).

An incrementally built Phaser game. Each prompt adds one observable change to the live localhost build.

## Play

The public build is deployed to [GitHub Pages](https://angry-tacoz.github.io/test-subject-01/).

## Patch notes

### Responsive Movement Update — September 2, 2026

#### Movement feel

- Added responsive vector acceleration and braking across keyboard, Xbox, mouse destination, and touch destination movement; reversals brake through the prior direction and sharp turns curve rather than snap.
- Preserved the 230 px/s starting speed cap and 5 px destination arrival radius.
- Added stopping-distance easing so click/tap movement arrives smoothly without overshooting.
- Expanded Level 01 to a 4× world area with smooth horizontal and vertical camera scrolling near the screen edges.

[Full change and review history: PR #8](https://github.com/Angry-TacoZ/test-subject-01/pull/8)

### Critical Response Update — August 24, 2026

#### Combat feedback

- Added floating damage numbers: white for damage dealt to enemies and vivid pink for damage received by the player.
- Critical hits display as larger gold `CRIT` numbers for immediate recognition beyond color alone.

#### Critical system

- The player starts with a 5% critical-hit chance and critical hits deal 2× damage.
- Critical rolls apply to standard bullets, Shotgun pellets, Penetrating Shot hits, Double Shot follow-ups, and both Electro Therapy targets.
- Added **Fault Amplifier — Common**, increasing critical chance by 5 percentage points per rank through a 100% cap; it leaves the offer pool at that cap.

[Full change and review history: PR #7](https://github.com/Angry-TacoZ/test-subject-01/pull/7)

### Projectile Impact Update — August 24, 2026

#### Combat feedback

- Standard bullets and shotgun pellets now shove enemies 8 px in their travel direction on impact.
- Added a brief displacement streak and impact ring so the recoil remains visible when a 1-HP enemy is destroyed immediately.
- Knockback resolves before damage, causing defeated enemies to leave their XP pickup at the pushed position.
- Electro Therapy remains unchanged because its electrical arcs do not carry projectile mass.

[Full change and review history: PR #6](https://github.com/Angry-TacoZ/test-subject-01/pull/6)

### Enemy Readability Update — August 24, 2026

#### Enemy visuals

- Circle pursuers retain their crimson-red body color.
- Chargers now use a warmer vermilion-red body and pale red outline so they are easier to distinguish while keeping every enemy in the red color family.
- Enemy shape remains the primary identifier: circles pursue, triangles charge.

#### Balance

- Increased Charger lunge speed by 50%, from 3× to 4.5× base speed.
- The lunge still travels 250 px and retains its 10-second cooldown.

[Full change and review history: PR #5](https://github.com/Angry-TacoZ/test-subject-01/pull/5)

### Charger Enemy Update — August 23, 2026

#### New enemy

- Added red triangle Chargers that deal 2 contact damage.
- Chargers drop pickups worth 2 XP when destroyed.
- Chargers lunge toward nearby players at triple speed for 250 px, then wait 10 seconds before they can charge again.
- The first Charger arrives at 0:30, followed by one every 10 seconds through the end of the active run.

[Full change and review history: PR #4](https://github.com/Angry-TacoZ/test-subject-01/pull/4)

### Creator Profile Update — August 23, 2026

#### Main menu

- Added an About section with creator credit for James Lane.
- Added direct links to [jamesai.space](https://jamesai.space) and [LinkedIn](https://www.linkedin.com/in/james-lane-1051291a9).

[Full change and review history: PR #3](https://github.com/Angry-TacoZ/test-subject-01/pull/3)

### Mobile Interface Update — August 23, 2026

#### Mobile gameplay

- Phone touch mode now automatically aims at and fires on the nearest enemy, leaving touch input dedicated to movement.
- Connecting a controller restores manual right-stick aim and trigger fire.
- Added a Fullscreen button for supported mobile browsers.

#### Interface

- The playfield now reserves the HUD's actual rendered height, preventing wrapped statistics from covering the top of the arena.
- Phone landscape layouts use the compact mobile HUD even when their width exceeds the portrait breakpoint.

[Full change and review history: PR #2](https://github.com/Angry-TacoZ/test-subject-01/pull/2)

### Survival Protocol Update — August 23, 2026

#### New upgrades

- **Nanite Rehab — Rare:** Regenerates 1 HP after every two full seconds spent injured.
- **Shotgun — Epic:** Replaces the standard weapon with three short-range spread pellets. Cycling Rate, Double Shot, and Penetrating Shot all apply.

#### New objective

- Level 01 is now a three-minute survival trial.
- Survive until the timer reaches zero to complete the run and open the new **You Survived** screen.
- The survival timer pauses during Options and level-up choices.

#### Interface

- Added the survival countdown, current weapon, regeneration, and expanded volley statistics to the gameplay HUD.
- Added Nanite Rehab and Shotgun to the level-up pool and balance-testing menu.

#### Fixes

- Shotgun pellets stop at their exact 420 px maximum range.
- Nanite Rehab no longer stores regeneration time while the player is at full health.

[Full change and review history: PR #1](https://github.com/Angry-TacoZ/test-subject-01/pull/1)

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`.

## Soundtrack provenance

The original game soundtrack was generated by James Lane using Google Lyria through a Gemini Pro subscription. The generated tracks contain Google's SynthID watermarking. Sound effects are retained with the project as prototype assets.
