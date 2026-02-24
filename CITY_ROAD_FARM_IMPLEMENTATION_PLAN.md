# City/Road/Farm Feature Implementation Plan

## 1. Extend Runtime Map Metadata
- [x] Add `cityZones`, `roadCells`, `farmZones`, and `farmToCityLinks` to `MapBundle` in `shared/src/mapBundle.ts`.
- [x] Update sidecar parsing/validation in `server/src/rooms/services/MapBundleLoader.ts` to load new fields.
- [x] Add safe fallbacks so maps without new metadata still function using current anchor-based behavior.

## 2. Update Map Generation (Shapes + Colors + Metadata)
- [x] Enforce generation order: base map terrain first, then cities, then farms, then roads.
- [x] Replace single-cell city markers with irregular city blobs in `shared/scripts/generate-random-map.mjs`.
- [x] Change city fill color to grey.
- [x] Add red city-border cells that denote city limits.
- [x] Generate road cells connecting city anchors.
- [x] Generate farms near cities as smaller irregular blobs.
- [x] Set farm fill to yellow and farm border to gold.
- [x] Persist all generated city/road/farm metadata into the runtime sidecar JSON.
- [x] Keep `terrainCodeGrid` based on base terrain (city/road/farm overlays should not corrupt terrain typing).

## 3. City Capture Rule: Uncontested Only
- [x] Move city capture checks from single anchor cells to city-zone occupancy.
- [x] Update `server/src/systems/cities/CityControlSystem.ts` to require uncontested occupation.
- [x] Integrate zone-based capture ownership updates in `server/src/rooms/BattleRoom.ts`.
- [x] Confirm contested and empty city zones never flip ownership.

## 4. City Morale Bonus
- [x] Add configurable city morale bonus value(s) to `shared/src/gameplayConfig.ts`.
- [x] Apply city morale bonus in morale scoring path in `server/src/rooms/BattleRoom.ts`.
- [x] Ensure bonus only applies when unit is inside a qualifying city zone.

## 5. Road Movement Bonus (2x)
- [x] Add road movement multiplier config in `shared/src/gameplayConfig.ts` (target: `2.0`).
- [x] Update movement speed resolution in `server/src/rooms/BattleRoom.ts` so road cells multiply terrain speed.
- [x] Verify movement honors impassable/other movement constraints while applying road bonus.

## 6. Farm-to-City Supply and City Supply Gating
- [x] Extend supply computation in `server/src/systems/supply/SupplyLineSystem.ts` to compute farm-to-city supply paths.
- [x] Reuse existing sever logic (enemy influence + impassable checks) for farm-to-city routing.
- [x] Mark each city as supplied or unsupplied based on farm connectivity.
- [x] Gate city-to-unit supply sources so unsupplied cities cannot supply units.
- [x] Ensure fallback behavior is deterministic if no farm metadata exists on older maps.

## 7. Client Representation and UI Sync
- [x] Remove the current yellow star implication for city identity in `client/src/City.ts`.
- [x] Ensure city visuals are consistent with generated texture overlays (grey city mass + red border).
- [x] If needed, extend client/server state for explicit farm->city supply visualization (gold supply lines).
- [x] If farm->city supply is visualized, wire schema/network/render updates:
- [x] `server/src/schema/BattleState.ts`
- [x] `client/src/NetworkManager.ts`
- [x] `client/src/InfluenceRenderer.ts`

## 8. Testing and Validation
- [x] Add tests for uncontested-only capture behavior.
- [x] Add tests for road movement multiplier application.
- [x] Add tests for farm-to-city supply gating and unsupplied-city unit-supply denial.
- [ ] Run smoke scenario to verify generated map visuals and gameplay logic stay aligned over runtime map reloads.
- [x] Run required project check: `npm run verify`.

## 9. Suggested Implementation Order
- [x] Phase A: Metadata contracts + sidecar loader updates.
- [x] Phase B: Generator overlays (city/road/farm) + sidecar metadata write.
- [x] Phase C: Capture + morale + road speed logic.
- [x] Phase D: Farm->city->unit supply chain logic.
- [x] Phase E: Client visual/state integration for any new supply visualization.
- [ ] Phase F: Tests + `npm run verify` + final manual battle validation pass.
