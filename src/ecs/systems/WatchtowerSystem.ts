import { query, World } from 'bitecs';
import { PlayerResources, PlayerInput } from './BuildingSystem';

export const Watchtower = {
  built: [] as number[],
};

export const Archer = {
  range: [] as number[],
  attackSpeed: [] as number[],
  stationed: [] as number[], // 1 if stationed in a watchtower
  buffApplied: [] as number[], // 1 if buffs are already applied
};

export function computeWatchtowerCost(): { aether: number; wood: number; iron: number } {
  return { aether: 10, wood: 6, iron: 0 };
}

export function watchtowerSystem(world: World) {
  const players = query(world, [PlayerResources, PlayerInput]);

  for (let i = 0; i < players.length; i++) {
    const eid = players[i];

    if (PlayerInput.pressingSpace[eid]) {
      const targetEntity = PlayerInput.targetEntity[eid];

      if (targetEntity !== 0 && Watchtower.built[targetEntity] === 0) {
        const cost = computeWatchtowerCost();

        const currentAether = PlayerResources.aether[eid];
        const currentWood = PlayerResources.wood[eid];
        const currentIron = PlayerResources.iron[eid];

        if (
          currentAether >= cost.aether &&
          currentWood >= cost.wood &&
          currentIron >= cost.iron
        ) {
          PlayerResources.aether[eid] -= cost.aether;
          PlayerResources.wood[eid] -= cost.wood;
          PlayerResources.iron[eid] -= cost.iron;

          Watchtower.built[targetEntity] = 1;
        }
      }
    }
  }

  // Apply buffs to stationed archers
  const archers = query(world, [Archer]);
  for (let i = 0; i < archers.length; i++) {
    const archerId = archers[i];

    if (Archer.stationed[archerId] === 1) {
      if (Archer.buffApplied[archerId] === 0) {
        Archer.range[archerId] *= 1.5; // +50% range
        Archer.attackSpeed[archerId] *= 1.3; // +30% attack speed
        Archer.buffApplied[archerId] = 1;
      }
    } else {
      if (Archer.buffApplied[archerId] === 1) {
        Archer.range[archerId] /= 1.5;
        Archer.attackSpeed[archerId] /= 1.3;
        Archer.buffApplied[archerId] = 0;
      }
    }
  }

  return world;
}
