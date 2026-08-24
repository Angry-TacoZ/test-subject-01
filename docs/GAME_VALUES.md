# Test Subject 01 — Game Values Ledger

This is the human-readable record of accepted gameplay and system values. Update the **Current values** tables whenever an implemented value changes, then append a dated entry to **Change log**. Runtime positions, velocities, and cooldown state can be inspected separately with `window.render_game_to_text()` in the browser console.

## Current values

### Project and presentation

| Value | Current setting | Notes |
| --- | ---: | --- |
| Game title | Test Subject 01 | Working title |
| Engine | Phaser 3.90.x | Installed dependency is `^3.90.0` |
| View | Top-down | Level 01 uses a flat plane |
| Visual direction | Tron-inspired neon cyberpunk | Cyan primary, pink electrical accents |

### Player

| Value | Current setting | Notes |
| --- | ---: | --- |
| Base maximum health | 100 HP | Starts at maximum health; Vital Capacity adds 20 per rank |
| Current starting health | 100 HP | Each registered contact removes the colliding enemy type's damage value |
| Circle radius | 20 px | Collision radius and rendered body radius |
| Character color | Grey | Grey core, pale outline, and neutral glow distinguish the player from rarity colors |
| Base movement speed | 230 px/s | Same maximum for keyboard, controller, and destination movement |
| Speed upgrade | +10% base speed per rank | Additive ranks: 253, 276, 299 px/s, and so on |
| Destination arrival distance | 5 px | Right-click/touch movement target clears inside this distance |
| Spawn | 50% x, 50% y | Relative to the playable arena |

### Enemies

| Value | Current setting | Notes |
| --- | ---: | --- |
| Initial count | 8 circle enemies | All continuously pursue the player; chargers begin later |
| Maximum health | 1 HP each | Starts at maximum health |
| Current starting health | 1 HP each | One weapon hit removes an enemy |
| Enemy collision radius | 11 px | Shared by circle and triangle enemies |
| Pursuit speeds | 62, 76, 90 px/s | Repeats by enemy index: 62, 76, 90, 62, 76, 90, 62, 76 |
| Steering response | 5.2 / second | Exponential steering blend toward the player |
| Ram hit cooldown | 650 ms per enemy | Prevents a sustained overlap counting every frame |
| Spawn positions | See list below | Fractions of playable-arena width and height |

#### Enemy color system

| Enemy | Red-family hue | Body | Outline | Identification rule |
| --- | --- | ---: | ---: | --- |
| Circle pursuer | Crimson | `#ff334f` | `#ff9bab` | Circle silhouette is the primary cue |
| Charger triangle | Vermilion | `#ff5a36` | `#ffc0a3` | Triangle silhouette is the primary cue |

Enemy roles remain readable without color: silhouette is the primary identifier, while distinct red-family hues provide a secondary visual cue.

#### Charger triangle

| Value | Current setting | Notes |
| --- | ---: | --- |
| Shape | Vermilion-red triangle | Points in its current movement/lunge direction |
| Health | 1 HP | Uses the same projectile and death behavior as circle enemies |
| XP value | 2 XP | Drops one neon-orange pickup worth 2 XP on death |
| Contact damage | 2 HP | Uses the shared 650 ms per-enemy contact debounce |
| Base pursuit speed | 62, 76, or 90 px/s | Uses the existing repeating enemy speed sequence |
| Lunge trigger | Player within 250 px | Requires the individual charger's lunge cooldown to be ready |
| Lunge speed | 4.5× base speed | 50% faster than the original 3× lunge; locks the direction captured when the lunge begins |
| Lunge distance | 250 px | Returns to normal pursuit after charge-only travel reaches 250 px; ends early at an arena boundary |
| Lunge cooldown | 10,000 ms | Begins when a lunge starts and pauses with gameplay |

### Enemy spawning

| Value | Current setting | Notes |
| --- | ---: | --- |
| Circle spawn-rate sequence | 1, 2, 4, 6, 8, 10 enemies/s | Corrected sequence; not exponential doubling after 4 |
| Rate interval | 20,000 ms | Advances once per twenty seconds of active gameplay |
| Maximum rate | 10 enemies/s | Reached after 100 seconds and then held |
| Spawn locations | 18-point arena perimeter cycle | Positions are inset by the 11 px enemy radius |
| Spawn clock during Options | Paused | No elapsed time or spawn budget accumulates |
| Active-enemy cap | None | Active population can continue growing |
| First charger spawn | 30,000 ms | One triangle enemy enters when active match time reaches 0:30 |
| Charger spawn interval | 10,000 ms | One additional charger at 0:40, 0:50, and so on through 2:50 |
| Chargers per complete run | 15 | No charger is added at the exact 3:00 survival boundary |

Enemy spawn positions, in enemy order:

1. `(0.68, 0.50)`
2. `(0.16, 0.20)`
3. `(0.37, 0.22)`
4. `(0.78, 0.20)`
5. `(0.86, 0.42)`
6. `(0.20, 0.74)`
7. `(0.48, 0.80)`
8. `(0.78, 0.75)`

### Collisions and health

| Value | Current setting | Notes |
| --- | ---: | --- |
| Dot-to-dot collision | Enabled | Player and enemies cannot pass through one another |
| Arena-boundary collision | Enabled | Every dot remains inside the playfield |
| Circle ram result | -1 player HP and increment HITS | Applied once per circle enemy's debounced contact |
| Charger ram result | -2 player HP and increment HITS | Applied once per triangle enemy's debounced contact |
| Ram impact flash | 180 ms | Red impact-ring feedback |
| Player health HUD | Top center | Displays numeric HP and a neon progress bar |
| Death threshold | 0 HP | Pauses gameplay and opens Game Over |
| Survival duration | 180,000 ms (3:00) | Counts active gameplay only; Options and level-up choices pause the timer |
| Survival result | You Survived | Pauses gameplay/music and presents Try Again and Main Menu |
| Try Again | Full level reset | Restores 100 HP and resets hits, enemies, XP, weapon, and spawn clock |
| Main Menu | Return to title | Clears the active level and resumes menu music |

### Player weapon

| Value | Current setting | Notes |
| --- | ---: | --- |
| Fire mode | Reload-gated automatic | Press once for one shot; hold fire to shoot again whenever reload completes |
| Base reload duration | 1,500 ms | A new trigger press/click is required after reload |
| Reload-speed upgrade | +10% reload rate per rank | Duration is `1,500 / (1 + 0.10 × ranks)` ms |
| Damage | 1 HP | Removes the current 1-HP red enemies |
| Projectile speed | 650 px/s | Fixed travel speed |
| Projectile radius | 4 px | Collision and rendered radius |
| Projectile knockback | 8 px per hit | Standard bullets and shotgun pellets shove the target in their travel direction before damage resolves; arena boundaries clamp the displacement |
| Knockback impact cue | 120 ms | A short pale-red displacement streak and expanding ring make the shove visible even when a 1-HP enemy dies immediately |
| Projectile endpoint | Enemy impact or arena-edge contact | No time-based expiration |
| Shotgun | Epic; one-time replacement | Replaces the standard single shot with 3 pellets at -12°, 0°, and +12° |
| Shotgun range | 420 px | Each pellet despawns at this travel distance or an earlier enemy/arena endpoint |
| Shotgun upgrade compatibility | Cycling Rate, Double Shot, Penetrating Shot | Double Shot repeats all 3 pellets; each pellet independently inherits penetration |
| Desktop/controller aim methods | Mouse or Xbox right stick | Manual direction only; no auto aim |
| Mobile aim and fire | Automatic nearest enemy | Enabled on coarse-pointer phone-sized interfaces without a connected gamepad; touch remains dedicated to movement |
| Mouse fire | Left click or Space | Uses current mouse aim direction |
| Controller fire | Xbox right trigger | Hold to fire again whenever reload completes |
| Reload HUD | Beneath player health | Shows aim requirement, ready state, or remaining reload time |
| Mobile fullscreen | User-triggered Fullscreen button | Requests browser fullscreen with hidden navigation UI when supported; browser requires a tap gesture |

### Experience

| Value | Current setting | Notes |
| --- | ---: | --- |
| Drop trigger | Enemy reaches 0 HP | One drop appears at the enemy's death position |
| Circle-enemy drop value | 1 XP | Added on player contact |
| Charger drop value | 2 XP | Triangle enemies drop one pickup carrying 2 XP |
| Drop radius | 2 px | 4 px diameter; half the current 8 px projectile diameter |
| Drop movement | Stationary outside magnetism | Pulls toward the player at 240 px/s inside the attraction boundary |
| Pickup radius | Player radius + drop radius | Absorbed when the two circles touch |
| Base magnetism distance | 10 px beyond pickup radius | XP begins pulling inside this extra boundary |
| Magnetism upgrade | +10 px distance per rank | Additive: 10, 20, 30, 40 px, and so on |
| Color | Neon orange | Orange core and restrained glow |
| First level requirement | 5 XP | Level 1 to Level 2 |
| Requirement growth | 2× each level | 5, 10, 20, 40, 80 XP, and so on |
| XP after leveling | Resets toward next level | Overflow is preserved; lifetime earned XP remains inspectable |
| Level-up choices | 2 unique weighted choices | Sampled without replacement; a choice is required before play resumes |
| Common rarity | Green; weight 1.00 per upgrade | Baseline selection weight |
| Rare rarity | Blue; weight 0.20 per upgrade | Each Rare is selected at 0.2× the rate of each Common |
| Epic rarity | Purple; weight 0.04 per upgrade | Each Epic is selected at 0.2× the rate of each Rare |
| Current Rare offer chance | About 27.0% for any Rare | Two weighted draws without replacement from four Commons, three 0.20-weight Rares, and two 0.04-weight Epics until owned |
| Current Epic offer chance | About 3.8% for either Epic | Two weighted draws without replacement from the current four Commons, three Rares, and two Epics until owned |
| Vital Capacity | +20 maximum and current HP | Cumulative for the active run |
| Motor Response | +10% base movement speed | Cumulative for the active run |
| Cycling Rate | +10% reload rate | Cumulative for the active run |
| Field Extension | +10 px magnetism distance | Cumulative and additive for the active run |
| Double Shot | Rare; one-time unlock | Fires one follow-up projectile 500 ms after every primary shot |
| Penetrating Shot | Rare; one-time unlock | Each projectile kills and passes through its first enemy, then despawns after striking a second |
| Nanite Rehab | Rare; one-time unlock | Restores 1 HP every 2,000 ms of active gameplay while below maximum health |
| Electro Therapy | Epic; one-time additional weapon | Automatically fires along the current manual aim direction when ready |
| Electro Therapy damage | 2 per target | Initial impact and chained target each receive 2 damage |
| Electro Therapy base cooldown | 5,000 ms | Cycling Rate applies using `5,000 / (1 + 0.10 × ranks)` ms |
| Electro Therapy chain | 2 total targets | Nearest second enemy within 180 px is struck after a 120 ms chain delay |
| Electro Therapy + Double Shot | Enabled | A second electric projectile fires 500 ms later; each projectile can chain independently |
| Electro Therapy + Penetrating Shot | No effect | Electro Therapy uses its own impact-and-chain termination behavior |
| Level-up pause | Enabled | Enemies, spawning, projectiles, cooldowns, and movement freeze |
| XP bar position | Above player HP | Shows current XP / current doubled requirement |
| Stats graphic | Top-left HUD | Shows level, max HP, speed, reload duration, magnetism, pellet/Double Shot volley size, projectile hit limit, regeneration, and weapon mode |

### Testing menu

| Value | Current setting | Notes |
| --- | ---: | --- |
| Location | Options → Testing | Available from menu and active gameplay Options |
| Active-run requirement | Enabled only during Level 01 | Buttons are disabled on the title screen because there is no player run to modify |
| Common grants | Repeatable | Each press adds another rank for direct balance testing |
| Rare/Epic grants | One-time | Double Shot, Penetrating Shot, Nanite Rehab, Electro Therapy, and Shotgun disable after being granted |
| Input support | Mouse, touch, keyboard, Xbox controller | Uses semantic buttons and the existing Options focus navigation |

### Responsive playfield

| Value | Current setting | Notes |
| --- | ---: | --- |
| Arena top boundary | Measured HUD bottom + 12 px minimum gap | Prevents wrapped phone statistics and controls from overlapping the playfield |
| Phone landscape layout | Coarse pointer and viewport height ≤600 px | Uses the same compact two-row HUD treatment as narrow portrait screens |

### Xbox controller

| Value | Current setting | Notes |
| --- | ---: | --- |
| Browser input | Native Gamepad API | Standard Xbox USB/browser mapping |
| Left-stick deadzone | 22% | Input is rescaled outside the deadzone |
| Movement | Left stick or D-pad | Analog speed scales up to the player's 230 px/s maximum |
| Confirm | A | Activates the focused menu button |
| Back | B | Closes Options or returns from Level 01 to the title |
| Menu/Start | Options during play | Starts Level 01 from the title screen |
| Menu navigation | Left stick or D-pad | Vertical input moves focus generally; either axis moves between level-up cards |
| Slider adjustment | D-pad or stick left/right | Changes the focused slider in 5% steps |
| Weapon aim | Right stick | Uses the same 22% deadzone; no target assistance |
| Weapon fire | Right trigger | One shot per trigger press |

### Audio

| Value | Current setting | Notes |
| --- | ---: | --- |
| Menu track | Cold Steel Prayer | `public/audio/cold-steel-prayer.mp3` |
| Level 01 track | Heavy Weather | `public/audio/heavy-weather.mp3`; 30.772 seconds; loops during play |
| Starting volume | 50% | Middle of the Options slider |
| Slider range | 0–100% | Step size is 1%; controls both music tracks |
| Loop | Enabled | Each track loops in its assigned scene |
| Level-music pauses | Game Over, You Survived, and Main Menu | Continues through Options and level-up choices; Try Again restarts it |
| Autoplay behavior | First interaction | Required by browser audio policy |
| Contact SFX | Electric zap, first 1.000 seconds | `public/audio/contact-zap.mp3` |
| Starting SFX volume | 50% | Independent Options slider |
| SFX slider range | 0–100% | Step size is 1% |
| Contact playback | Once per debounced ram | Eight-voice pool permits overlapping contacts |
| Weapon shot SFX | Per pew, source 0.000–1.500 seconds | `public/audio/weapon-shot.mp3`; final 0.500 seconds removed |
| Weapon SFX playback | Once per accepted shot | Four-voice pool; blocked reload attempts stay silent |
| Bullet-impact SFX | Previous pop-cap shot, retained 0.400–1.000 seconds | `public/audio/weapon-impact.mp3`; exactly 0.600 seconds |
| Impact SFX playback | Once per confirmed enemy hit | Eight-voice pool; misses stay silent |

### Playfield layout

| Value | Current setting |
| --- | ---: |
| Horizontal margin | Clamp 4.5% of width to 22–62 px |
| Desktop top margin | Clamp 18% of height to 130–160 px |
| Mobile top margin (width ≤ 600 px) | Clamp 20% of height to 160–180 px |
| Bottom margin | Clamp 5.5% of height to 24–56 px |
| Grid spacing | 52 px |

## Controls

| Action | Inputs |
| --- | --- |
| Move | WASD or arrow keys |
| Move to a point | Right mouse click or screen tap inside the arena |
| Aim weapon | Mouse movement or Xbox right stick |
| Fire weapon | Left mouse, Space, or Xbox right trigger |
| Return to menu | Escape or Xbox B |
| Open Options during play | OPTIONS button in the level HUD |
| Controller movement | Xbox left stick or D-pad |
| Controller menu navigation | D-pad/left stick, A confirm, B back, Menu/Start |
| Menu actions | Mouse, touch, Tab plus Enter/Space |
| Game Over actions | Try Again or Main Menu; mouse, touch, keyboard, or Xbox controller |
| Level-up choice | Mouse/touch, keyboard, or Xbox navigation and confirm |

## Change log

### 2026-08-23

- Established the working title **Test Subject 01** and Phaser as the engine.
- Established the Tron-inspired neon cyberpunk direction with cyan and pink accents.
- Added looping menu music, starting volume 50%, and the 0–100% Options slider.
- Established Level 01 as a top-down flat plane.
- Added one green player dot and eight smaller red enemy dots with mutual collision.
- Set the player to 100 HP and every red enemy to 1 HP.
- Set enemies to continuously pursue and ram the player.
- Added the HITS counter, 650 ms per-enemy contact debounce, and 180 ms impact feedback.
- Added the centered player-health HUD. No damage behavior has been assigned yet.
- Trimmed the supplied two-second electric zap to its first 1.000 seconds and assigned it to each debounced enemy-player contact.
- Added an independent SFX volume slider, starting at 50%, and made Options accessible from Level 01. Gameplay pauses while the dialog is open.
- Added standard Xbox USB controller support through the browser Gamepad API, including analog/D-pad movement, A/B menu actions, Menu/Start, and 5% audio-slider adjustment.
- Added the manually aimed single-shot weapon: 1 damage, 650 px/s projectile speed, 4 px radius, 1,500 ms lifetime, and a 2,000 ms reload. Mouse/right-stick aim has no target assistance; left mouse, Space, or right trigger fires.
- Trimmed 0.200 seconds from the start and 0.800 seconds from the end of the supplied two-second pop-cap recording. The retained 1.000-second middle segment now plays for each accepted weapon shot through the shared SFX-volume control.
- Added stationary neon-orange 1-XP drops at enemy death. Drops have a 2 px radius, are absorbed on player contact, and advance the provisional 10-XP display bar by one.
- Added perimeter enemy spawning at 1, 2, 4, 6, 8, then 10 enemies per second, advancing every five seconds of active gameplay and pausing in Options.
- Enemy contact now removes exactly 1 player HP at the existing 650 ms per-enemy debounce boundary. Reaching 0 HP pauses the simulation and opens a neon Game Over dialog with Try Again and Main Menu actions.
- Try Again rebuilds Level 01 from its initial state at 100 HP; Main Menu clears the level and returns to the title. The Game Over dialog supports mouse, touch, keyboard focus, and Xbox A/B navigation.
- Verified death through real enemy contacts at exactly 100 HITS / 0 HP, simulation pause at death, full Try Again reset, and Main Menu cleanup on desktop and mobile.
- Added subject leveling. Level 1 to 2 requires 10 XP; each following requirement doubles to 20, 40, 80, 160, and onward. The current-level XP counter resets on level-up while preserving overflow and lifetime earned XP.
- Each level-up pauses gameplay and presents two unique RNG-selected choices from Vital Capacity (+10 max/current HP), Motor Response (+5% base movement speed), and Cycling Rate (+5% reload rate). Upgrade ranks stack for the active run.
- Added the top-left player-stat graphic for subject level, maximum HP, movement speed, and reload duration.
- Verified all three upgrade paths through natural 10-XP level-ups: 110 max/current HP behavior, 241.5 px/s first speed rank, and a 1,904.76 ms first reload rank. Two-choice uniqueness, pause behavior, and the next 20-XP requirement also passed.
- Replaced the firing sound with the supplied `per_pew` recording trimmed from 2.000 to 1.500 seconds by removing its final 0.500 seconds.
- Converted the outgoing 1.000-second pop-cap firing sound into the enemy-impact effect by removing its first 0.400 seconds. The retained 0.600-second clip plays once per confirmed projectile hit and remains governed by the shared SFX slider.
- Doubled enemy spawn-rate steps from every 5,000 ms to every 10,000 ms while preserving the `1, 2, 4, 6, 8, 10` enemies-per-second sequence.
- Added Magnetism as the fourth level-up system. Its base 5 px attraction distance extends beyond the normal XP contact boundary; XP inside it pulls toward the player at 240 px/s. Each Field Extension rank multiplies the distance by 1.10.
- Expanded the stats HUD with the live magnetism distance and changed each level-up roll to two unique choices from the four-upgrade pool.
- Verified the spawn sequence at 10/20/30/40/50-second checkpoints, XP attraction from beyond contact range, the 5.00-to-5.50 px first Magnetism rank, and all four RNG upgrade paths.
- Doubled enemy spawn-rate steps again, from every 10,000 ms to every 20,000 ms. The configured rate timeline is now 1 at 0s, 2 at 20s, 4 at 40s, 6 at 60s, 8 at 80s, and 10 enemies/s at 100s.
- Added the supplied Heavy Weather file unchanged as the looping Level 01 soundtrack. The shared music slider controls it; it continues through Options and level-up choices, pauses on Game Over, stops on Main Menu, and restarts with Try Again.
- Halved the level requirements while retaining 2× growth: Level 2 now requires 5 XP, followed by 10, 20, 40, 80, and onward.
- Increased base Magnetism from 5 px to 10 px beyond contact range and changed Field Extension from +10% to a clearly visible fixed +5 px per rank: 10, 15, 20, 25 px, and onward.
- Reduced the weapon's starting reload duration from 2,000 ms to 1,500 ms. Cycling Rate still adds 5% reload rate per rank, making the first upgraded duration 1,428.57 ms.
- Enabled hold-to-fire for left mouse, Space, and the Xbox right trigger. The weapon fires immediately when ready and repeats at the current reload interval until released.
- Doubled every level-up reward: Vital Capacity now grants +20 HP, Motor Response +10% base speed, Cycling Rate +10% reload rate, and Field Extension +10 px Magnetism.
- Changed the player circle from green to grey so green can consistently represent Common rarity.
- Added rarity presentation and weighted selection: Common is green at weight 1.00, Rare is blue at 0.20, and future Epic is purple at 0.04. Two unique choices are sampled without replacement, so each Rare has 0.2× an individual Common's selection weight and each Epic has 0.2× an individual Rare's weight.
- Added the one-time Rare Double Shot upgrade. Every accepted primary shot schedules one follow-up along the captured aim direction after 500 ms without resetting reload.
- Removed projectile lifetime expiration. Bullets now persist until they hit an enemy or their radius touches the playfield edge.
- Fixed Xbox level-up navigation: left/right D-pad or left-stick input now moves focus between the side-by-side upgrade cards, while A confirms the focused choice. Vertical navigation remains supported for the stacked mobile layout.
- Added the one-time Rare Penetrating Shot upgrade. Each projectile tracks its own enemy hits, continues after killing the first enemy, cannot damage that same enemy twice, and despawns after hitting a second enemy or reaching the arena edge.
- Added an Options → Testing panel for the active run. It can grant repeatable Common ranks and either one-time Rare directly, updates HUD/runtime stats immediately, and disables one-time upgrades after ownership.
- Made the Double Shot/Penetrating Shot combination explicit: the primary bullet and queued follow-up now capture the same two-hit limit when the trigger is accepted, ensuring both penetrate independently.
- Added Epic Electro Therapy. It renders as a short neon-yellow electrical streak, deals 2 damage, chains after 120 ms to the nearest second enemy within 180 px, and uses a 5,000 ms base cooldown modified by Cycling Rate.
- Double Shot gives Electro Therapy a second independent bolt after 500 ms; Penetrating Shot is intentionally excluded. Added the yellow E-THERAPY cooldown HUD, purple Epic card, Testing grant, runtime telemetry, and value logging.
- Added Rare Nanite Rehab: it restores 1 missing HP every 2 seconds of active gameplay and pauses with the rest of the simulation.
- Added Epic Shotgun as a standard-weapon replacement: 3 pellets at -12/0/+12 degrees with a 420 px range. Cycling Rate applies; Double Shot repeats the full blast; Penetrating Shot applies independently to every pellet.
- Added a three-minute active-game survival timer and a green You Survived result with the same Try Again/Main Menu controls as Game Over.
- Changed the arena's top boundary to reserve the HUD's measured rendered height, preventing the expanded stat panel from overlapping phone gameplay in landscape.
- Added phone touch auto-aim and reload-gated auto-fire against the nearest enemy while retaining touch-tap movement; connecting a gamepad restores manual right-stick aiming.
- Added a phone Fullscreen button using the browser Fullscreen API, with automatic hiding on unsupported browsers.
- Added red triangle charger enemies: 2 contact damage, a 2-XP drop, a 250 px trigger radius, a direction-locked 250 px lunge at 3× base speed, and a 10-second lunge cooldown. One charger spawns at 0:30 and every 10 active seconds afterward through 2:50.
- Added a reusable red-family enemy palette: circle pursuers remain crimson while Chargers use vermilion, with silhouette retained as the primary role cue. Increased Charger lunge speed by 50%, from 3× to 4.5× base speed, without changing its 250 px travel distance or 10-second cooldown.
- Added an 8 px direction-based knockback to every standard bullet and shotgun-pellet hit. The shove resolves before damage so defeated enemies drop XP at the displaced position; a 120 ms impact streak/ring makes the movement readable. Electro Therapy is excluded because it is an electrical arc rather than a mass-carrying projectile.
