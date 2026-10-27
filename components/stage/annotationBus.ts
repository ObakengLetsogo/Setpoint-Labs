export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

export const markerScreen: Record<number, ScreenPoint> = {};
