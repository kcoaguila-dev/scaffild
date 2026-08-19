import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import {
  Wall,
  PlayerResources,
  PlayerInput,
  computeWallUpgradeCost,
  calculateThornsDamage,
  buildingSystem,
} from '../src/ecs/systems/BuildingSystem';
import {
  Watchtower,
  Archer,
  computeWatchtowerCost,
  watchtowerSystem,
} from '../src/ecs/systems/WatchtowerSystem';

describe('Tiered Building & Military Upgrades', () => {
  describe('Pure Logic Functions', () => {
    it('computeWallUpgradeCost calculates correct costs for each tier', () => {
      expect(computeWallUpgradeCost(0)).toEqual({ aether: 5, wood: 3, iron: 0 });
      expect(computeWallUpgradeCost(1)).toEqual({ aether: 10, wood: 5, iron: 2 });
      expect(computeWallUpgradeCost(2)).toEqual({ aether: 15, wood: 0, iron: 5 });
      expect(computeWallUpgradeCost(3)).toBeNull();
    });

    it('calculateThornsDamage returns correct damage for each tier', () => {
      expect(calculateThornsDamage(1)).toBe(0);
      expect(calculateThornsDamage(2)).toBe(0);
      expect(calculateThornsDamage(3)).toBe(10);
    });

    it('computeWatchtowerCost calculates correct costs', () => {
      expect(computeWatchtowerCost()).toEqual({ aether: 10, wood: 6, iron: 0 });
    });
  });

  describe('Systems', () => {
    let world: any;

    beforeEach(() => {
      world = createWorld();
    });

    it('upgrades a wall from Tier 0 to Tier 1 when player has enough resources and presses space', () => {
      const player = addEntity(world);
      addComponent(world, player, PlayerResources);
      addComponent(world, player, PlayerInput);

      PlayerResources.aether[player] = 10;
      PlayerResources.wood[player] = 5;
      PlayerResources.iron[player] = 0;
      PlayerInput.pressingSpace[player] = 1;

      const wall = addEntity(world);
      addComponent(world, wall, Wall);
      Wall.tier[wall] = 0; // Unbuilt

      PlayerInput.targetEntity[player] = wall;

      buildingSystem(world);

      expect(Wall.tier[wall]).toBe(1);
      expect(Wall.hp[wall]).toBe(60);
      expect(Wall.maxHp[wall]).toBe(60);
      expect(Wall.thorns[wall]).toBe(0);

      expect(PlayerResources.aether[player]).toBe(5); // 10 - 5
      expect(PlayerResources.wood[player]).toBe(2); // 5 - 3
      expect(PlayerResources.iron[player]).toBe(0); // 0 - 0

      // Space press should be reset
      expect(PlayerInput.pressingSpace[player]).toBe(0);
    });

    it('upgrades a wall to Tier 2 and Tier 3', () => {
      const player = addEntity(world);
      addComponent(world, player, PlayerResources);
      addComponent(world, player, PlayerInput);

      PlayerResources.aether[player] = 100;
      PlayerResources.wood[player] = 100;
      PlayerResources.iron[player] = 100;

      const wall = addEntity(world);
      addComponent(world, wall, Wall);
      Wall.tier[wall] = 1; // Tier 1

      PlayerInput.targetEntity[player] = wall;

      // Upgrade to Tier 2
      PlayerInput.pressingSpace[player] = 1;
      buildingSystem(world);
      expect(Wall.tier[wall]).toBe(2);
      expect(Wall.hp[wall]).toBe(120);
      expect(Wall.thorns[wall]).toBe(0);

      // Upgrade to Tier 3
      PlayerInput.pressingSpace[player] = 1;
      buildingSystem(world);
      expect(Wall.tier[wall]).toBe(3);
      expect(Wall.hp[wall]).toBe(200);
      expect(Wall.thorns[wall]).toBe(10);
    });

    it('does not upgrade wall if resources are insufficient', () => {
      const player = addEntity(world);
      addComponent(world, player, PlayerResources);
      addComponent(world, player, PlayerInput);

      PlayerResources.aether[player] = 1; // Not enough
      PlayerResources.wood[player] = 1;
      PlayerResources.iron[player] = 1;
      PlayerInput.pressingSpace[player] = 1;

      const wall = addEntity(world);
      addComponent(world, wall, Wall);
      Wall.tier[wall] = 0; // Unbuilt

      PlayerInput.targetEntity[player] = wall;

      buildingSystem(world);

      expect(Wall.tier[wall]).toBe(0); // Still unbuilt
      expect(PlayerResources.aether[player]).toBe(1); // Resources unchanged
    });

    it('builds a watchtower when player has enough resources and presses space', () => {
      const player = addEntity(world);
      addComponent(world, player, PlayerResources);
      addComponent(world, player, PlayerInput);

      PlayerResources.aether[player] = 15;
      PlayerResources.wood[player] = 10;
      PlayerResources.iron[player] = 0;
      PlayerInput.pressingSpace[player] = 1;

      const watchtower = addEntity(world);
      addComponent(world, watchtower, Watchtower);
      Watchtower.built[watchtower] = 0;

      PlayerInput.targetEntity[player] = watchtower;

      watchtowerSystem(world);

      expect(Watchtower.built[watchtower]).toBe(1);
      expect(PlayerResources.aether[player]).toBe(5); // 15 - 10
      expect(PlayerResources.wood[player]).toBe(4); // 10 - 6
    });

    it('applies buffs to stationed archers', () => {
      const archer = addEntity(world);
      addComponent(world, archer, Archer);

      Archer.range[archer] = 100;
      Archer.attackSpeed[archer] = 1.0;
      Archer.stationed[archer] = 1;
      Archer.buffApplied[archer] = 0;

      watchtowerSystem(world);

      expect(Archer.range[archer]).toBeCloseTo(150); // 100 * 1.5
      expect(Archer.attackSpeed[archer]).toBeCloseTo(1.3); // 1.0 * 1.3
      expect(Archer.buffApplied[archer]).toBe(1);

      // Running system again should not double apply buffs
      watchtowerSystem(world);
      expect(Archer.range[archer]).toBeCloseTo(150);
      expect(Archer.attackSpeed[archer]).toBeCloseTo(1.3);

      // Unstation the archer
      Archer.stationed[archer] = 0;
      watchtowerSystem(world);

      // Should remove buffs
      expect(Archer.range[archer]).toBeCloseTo(100);
      expect(Archer.attackSpeed[archer]).toBeCloseTo(1.0);
      expect(Archer.buffApplied[archer]).toBe(0);
    });
  });
});
