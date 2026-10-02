import type { Vec } from '../sim/types';

export interface MapDef {
  id: string;
  name: string;
  /** Catmull-Rom control points, left edge (off-screen) to the castle gate. */
  pathControl: readonly Vec[];
  /** Half the width of the dirt road, in logical px. */
  pathHalfWidth: number;
  /** Fixed build slots (tower centres). */
  slots: readonly Vec[];
  /** Where the road meets the castle gate. */
  gate: Vec;
}

export const map01 = {
  id: 'map01',
  name: "The King's Road",
  pathControl: [
    { x: -40, y: 150 },
    { x: 110, y: 150 },
    { x: 200, y: 172 },
    { x: 246, y: 255 },
    { x: 252, y: 355 },
    { x: 300, y: 432 },
    { x: 400, y: 456 },
    { x: 482, y: 420 },
    { x: 516, y: 330 },
    { x: 522, y: 222 },
    { x: 566, y: 140 },
    { x: 660, y: 118 },
    { x: 744, y: 152 },
    { x: 774, y: 250 },
    { x: 782, y: 345 },
    { x: 802, y: 428 },
    { x: 852, y: 478 },
    { x: 902, y: 476 },
    { x: 918, y: 444 },
  ],
  pathHalfWidth: 19,
  slots: [
    { x: 136, y: 94 },
    { x: 146, y: 216 },
    { x: 316, y: 246 },
    { x: 184, y: 330 },
    { x: 334, y: 362 },
    { x: 380, y: 512 },
    { x: 440, y: 330 },
    { x: 596, y: 218 },
    { x: 664, y: 186 },
    { x: 704, y: 300 },
    { x: 840, y: 282 },
    { x: 720, y: 430 },
  ],
  gate: { x: 918, y: 444 },
} as const satisfies MapDef;
