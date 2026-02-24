export type FormationLinePoint = {
  x: number;
  y: number;
};

export type FormationLineUnit = FormationLinePoint & {
  unitId: string;
};

export type FormationLineAssignment = {
  unitId: string;
  slot: FormationLinePoint;
};

const EPSILON = 1e-6;

export function distributeSlotsAlongPolyline(
  path: ReadonlyArray<FormationLinePoint>,
  slotCount: number,
): FormationLinePoint[] {
  if (slotCount <= 0 || path.length === 0) {
    return [];
  }

  if (path.length === 1) {
    return Array.from({ length: slotCount }, () => ({ ...path[0] }));
  }

  const cumulativeLengths: number[] = [0];
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    const length = Math.hypot(current.x - previous.x, current.y - previous.y);
    cumulativeLengths.push(cumulativeLengths[index - 1] + length);
  }
  const totalLength = cumulativeLengths[cumulativeLengths.length - 1] ?? 0;
  if (totalLength <= EPSILON) {
    return Array.from({ length: slotCount }, () => ({ ...path[0] }));
  }

  const sampleDistances: number[] = [];
  if (slotCount === 1) {
    sampleDistances.push(totalLength * 0.5);
  } else {
    const spacing = totalLength / (slotCount - 1);
    for (let index = 0; index < slotCount; index += 1) {
      sampleDistances.push(spacing * index);
    }
  }

  return sampleDistances.map((distance) =>
    samplePointAtDistance(path, cumulativeLengths, distance),
  );
}

export function assignUnitsToSlotsStable(
  units: ReadonlyArray<FormationLineUnit>,
  slots: ReadonlyArray<FormationLinePoint>,
): FormationLineAssignment[] {
  const count = Math.min(units.length, slots.length);
  if (count <= 0) {
    return [];
  }

  const targetSlots = slots.slice(0, count).map((slot) => ({ ...slot }));
  if (count === 1) {
    return [{ unitId: units[0].unitId, slot: targetSlots[0] }];
  }

  const firstSlot = targetSlots[0];
  const lastSlot = targetSlots[targetSlots.length - 1];
  const axisDeltaX = lastSlot.x - firstSlot.x;
  const axisDeltaY = lastSlot.y - firstSlot.y;
  const axisLength = Math.hypot(axisDeltaX, axisDeltaY);
  const axisX = axisLength > EPSILON ? axisDeltaX / axisLength : 1;
  const axisY = axisLength > EPSILON ? axisDeltaY / axisLength : 0;

  const orderedUnits = units
    .slice(0, count)
    .map((unit, index) => ({
      unit,
      index,
      axisProjection:
        (unit.x - firstSlot.x) * axisX + (unit.y - firstSlot.y) * axisY,
    }))
    .sort((left, right) => {
      if (left.axisProjection !== right.axisProjection) {
        return left.axisProjection - right.axisProjection;
      }
      if (left.unit.y !== right.unit.y) {
        return left.unit.y - right.unit.y;
      }
      if (left.unit.x !== right.unit.x) {
        return left.unit.x - right.unit.x;
      }
      return left.index - right.index;
    });

  return orderedUnits.map((entry, index) => ({
    unitId: entry.unit.unitId,
    slot: targetSlots[index],
  }));
}

function samplePointAtDistance(
  path: ReadonlyArray<FormationLinePoint>,
  cumulativeLengths: ReadonlyArray<number>,
  targetDistance: number,
): FormationLinePoint {
  const totalLength = cumulativeLengths[cumulativeLengths.length - 1] ?? 0;
  const clampedDistance = Math.max(0, Math.min(totalLength, targetDistance));

  for (let index = 1; index < path.length; index += 1) {
    const segmentStartDistance = cumulativeLengths[index - 1];
    const segmentEndDistance = cumulativeLengths[index];
    if (segmentEndDistance <= segmentStartDistance) {
      continue;
    }
    if (clampedDistance > segmentEndDistance && index < path.length - 1) {
      continue;
    }

    const segmentProgress =
      (clampedDistance - segmentStartDistance)
      / (segmentEndDistance - segmentStartDistance);
    const start = path[index - 1];
    const end = path[index];
    return {
      x: start.x + (end.x - start.x) * segmentProgress,
      y: start.y + (end.y - start.y) * segmentProgress,
    };
  }

  return { ...path[path.length - 1] };
}
