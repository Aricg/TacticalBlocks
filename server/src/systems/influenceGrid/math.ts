export const PhaserMath = {
  clamp(value: number, min: number, max: number): number {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  },
  floorClamp(value: number, min: number, max: number): number {
    return PhaserMath.clamp(Math.floor(value), min, max);
  },
};
