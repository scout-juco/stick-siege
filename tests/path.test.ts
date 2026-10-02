import { describe, expect, it } from 'vitest';
import { enemies } from '../src/data/enemies';
import { closestPoint, poseAt } from '../src/sim/path';
import { createGame } from '../src/sim/state';
import { spawnEnemy } from '../src/sim/enemies';
import { startWave } from '../src/sim/waves';
import { runFor } from './helpers';

describe('path following', () => {
  const { path } = createGame(1);

  it('looks positions up by distance along the road', () => {
    const quarter = poseAt(path, path.length / 4);
    const c = closestPoint(path, quarter.x, quarter.y);
    expect(c.distance).toBeLessThan(1e-6);
    expect(c.dist).toBeCloseTo(path.length / 4, 3);
  });

  it('clamps outside [0, length]', () => {
    expect(poseAt(path, -50)).toEqual(poseAt(path, 0));
    expect(poseAt(path, path.length + 50)).toEqual(poseAt(path, path.length));
  });

  it('advances an enemy speed × time along the road', () => {
    const state = createGame(1);
    state.phase = 'playing';
    const peasant = spawnEnemy(state, 'peasant');
    runFor(state, 4);
    expect(peasant.dist).toBeCloseTo(enemies.peasant.speed * 4, 3);
    // Its world position sits within its lane offset of the centreline point at that distance.
    const centre = poseAt(state.path, peasant.dist);
    expect(Math.hypot(peasant.x - centre.x, peasant.y - centre.y)).toBeCloseTo(Math.abs(peasant.laneOffset), 3);
  });

  it('progress is monotonic while walking', () => {
    const state = createGame(2);
    startWave(state);
    let lastDist = -1;
    for (let i = 0; i < 300; i++) {
      runFor(state, 1 / 60);
      const first = state.enemies[0]!;
      expect(first.dist).toBeGreaterThan(lastDist);
      lastDist = first.dist;
    }
  });
});
