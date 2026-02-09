export const TRIP_DETAIL_SNAP_POINTS = [0.24, 0.9, 0.98] as const;

export const TRIP_DETAIL_SHEET_STATE = {
  minimized: 'minimized',
  preview: 'preview',
  expanded: 'expanded',
} as const;

export type TripDetailSheetState =
  (typeof TRIP_DETAIL_SHEET_STATE)[keyof typeof TRIP_DETAIL_SHEET_STATE];

const SNAP_POINT_TOLERANCE = 0.01;

export function resolveTripDetailSheetState(
  value: number | string | null,
  snapPoints: readonly number[] = TRIP_DETAIL_SNAP_POINTS
): TripDetailSheetState {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return TRIP_DETAIL_SHEET_STATE.preview;
  }

  if (numericValue <= snapPoints[0] + SNAP_POINT_TOLERANCE) {
    return TRIP_DETAIL_SHEET_STATE.minimized;
  }

  if (numericValue >= snapPoints[snapPoints.length - 1] - SNAP_POINT_TOLERANCE) {
    return TRIP_DETAIL_SHEET_STATE.expanded;
  }

  return TRIP_DETAIL_SHEET_STATE.preview;
}
