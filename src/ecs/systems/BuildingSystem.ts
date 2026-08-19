import { query, World } from 'bitecs';

export const Wall = {
  tier: [] as number[],
  hp: [] as number[],
  maxHp: [] as number[],
  thorns: [] as number[],
};

export const PlayerResources = {
  aether: [] as number[],
  wood: [] as number[],
  iron: [] as number[],
};

export const PlayerInput = {
  pressingSpace: [] as number[],
  targetEntity: [] as number[],
};

export function computeWallUpgradeCost(currentTier: number): { aether: number; wood: number; iron: number } | null {
  switch (currentTier) {
    case 0: // Cost to build Tier 1
      return { aether: 5, wood: 3, iron: 0 };
    case 1: // Cost to build Tier 2
      return { aether: 10, wood: 5, iron: 2 };
    case 2: // Cost to build Tier 3
      return { aether: 15, wood: 0, iron: 5 };
    default:
      return null;
  }
}

export function calculateThornsDamage(wallTier: number): number {
  if (wallTier === 3) {
    return 10;
  }
  return 0;
}

const getWallStats = (tier: number) => {
  switch (tier) {
    case 1:
      return { maxHp: 60 };
    case 2:
      return { maxHp: 120 };
    case 3:
      return { maxHp: 200 };
    default:
      return { maxHp: 0 };
  }
};

export function buildingSystem(world: World) {
  const players = query(world, [PlayerResources, PlayerInput]);

  for (let i = 0; i < players.length; i++) {
    const eid = players[i];

    if (PlayerInput.pressingSpace[eid]) {
      const targetWall = PlayerInput.targetEntity[eid];

      if (targetWall !== 0) {
        const currentTier = Wall.tier[targetWall];
        const nextTier = currentTier + 1;

        if (nextTier <= 3) {
          const cost = computeWallUpgradeCost(currentTier);

          if (cost !== null) {
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

              Wall.tier[targetWall] = nextTier;
              const stats = getWallStats(nextTier);
              Wall.maxHp[targetWall] = stats.maxHp;
              Wall.hp[targetWall] = stats.maxHp;
              Wall.thorns[targetWall] = calculateThornsDamage(nextTier);
            }
          }
        }
      }

      PlayerInput.pressingSpace[eid] = 0;
    }
  }

  return world;
}
