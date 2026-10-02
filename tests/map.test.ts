import { describe, expect, it } from 'vitest';
import { map01 } from '../src/data/map01';
import { HUD, SLOT_RADIUS } from '../src/data/layout';
import { towers } from '../src/data/towers';
import { buildPath, closestPoint, poseAt } from '../src/sim/path';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../src/sim/constants';

const path = buildPath(map01.pathControl);

describe('map01', () => {
  it('has 12 build slots', () => {
    expect(map01.slots).toHaveLength(12);
  });

  it('starts off-screen left and ends at the castle gate', () => {
    const start = poseAt(path, 0);
    const end = poseAt(path, path.length);
    expect(start.x).toBeLessThan(0);
    expect(end.x).toBeCloseTo(map01.gate.x);
    expect(end.y).toBeCloseTo(map01.gate.y);
  });

  it('keeps every slot off the road but within barracks rally radius', () => {
    for (const slot of map01.slots) {
      const c = closestPoint(path, slot.x, slot.y);
      expect(c.distance, `slot ${slot.x},${slot.y}`).toBeGreaterThan(map01.pathHalfWidth + SLOT_RADIUS + 2);
      expect(c.distance, `slot ${slot.x},${slot.y}`).toBeLessThanOrEqual(towers.barracks.rallyRadius);
    }
  });

  it('keeps slots apart, on screen, and below the HUD', () => {
    for (const [i, a] of map01.slots.entries()) {
      expect(a.x - SLOT_RADIUS).toBeGreaterThanOrEqual(0);
      expect(a.x + SLOT_RADIUS).toBeLessThanOrEqual(LOGICAL_WIDTH);
      expect(a.y - SLOT_RADIUS).toBeGreaterThanOrEqual(HUD.height);
      expect(a.y + SLOT_RADIUS).toBeLessThanOrEqual(LOGICAL_HEIGHT);
      for (const b of map01.slots.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(SLOT_RADIUS * 2 + 6);
      }
    }
  });
});
