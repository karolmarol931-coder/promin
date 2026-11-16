export const START_TOUR_EVENT = "stirling:start-tour";

// Open string keyed into the tour registry (see tourRegistry.ts). Kept as a
// named alias so intent is clear at call sites; known ids are "admin", "tools",
// "whatsnew" but builds/features may register their own.
export type TourType = string;

export interface StartTourPayload {
  tourType: TourType;
}

/** Helper to dispatch the start tour event */
export function requestStartTour(tourType: TourType): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<StartTourPayload>(START_TOUR_EVENT, {
      detail: { tourType },
    }),
  );
}
