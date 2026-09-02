# Test Subject 01 Handoff

## Current status

Responsive movement and the expanded scrolling map are implemented on `codex/responsive-movement` and proposed in PR #8. The player now uses frame-rate-independent acceleration and braking across keyboard, Xbox, mouse destination, and touch destination input. Level 01 now spans 2× width and 2× height (4× area), with a smoothed camera that follows when the player reaches a 72 px edge buffer.

## Decisions

- Preserve the 230 px/s starting speed cap and 5 px destination arrival radius.
- Use 1,400 px/s² acceleration and 1,800 px/s² deceleration.
- Apply one shared movement model to all input paths.
- Use a 4× world area with camera viewport clipping so the HUD remains outside the playfield.
- Keep the camera follow responsive (7/s exponential smoothing) while preserving arena boundaries and collision rules.

## Verification

- Targeted responsive movement regression passed for keyboard ramp/braking, diagonal cap, mouse destination, touch destination, no overshoot, and zero browser errors.
- Existing level, Xbox, mobile interface, and damage-number resize/fullscreen regressions passed after the camera viewport change.
- Required gameplay client, production build, predeploy secret scan, canonical verifier, and desktop/mobile screenshot inspection passed.

## Next task

Await external review of PR #8. Do not deploy from the PR branch; merge to `main` first, then verify the Pages deployment.

## Risks

Movement tuning is intentionally conservative and may need balance adjustment after hands-on play. The map is resized proportionally on browser resize; existing entities and drops are remapped to preserve their normalized positions. The existing Phaser bundle-size warning remains non-blocking.
