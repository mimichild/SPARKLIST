export interface CropAdjustment {
  sourceWidth: number;
  sourceHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  // scale/translate describe how the user pinched/panned the photo inside
  // a viewport shaped at the photo's own aspect ratio (never a fixed 1:1
  // box) — translate is measured in on-screen viewport pixels, with the
  // image centered at scale 1.
  scale: number;
  translateX: number;
  translateY: number;
}

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

// Converts the user's on-screen pinch/pan adjustment into a crop rectangle
// in the source image's own pixel coordinates, so expo-image-manipulator
// can produce a real cropped file matching what the user composed. Because
// the viewport is always shaped at the source photo's aspect ratio, the
// resulting crop always keeps that same ratio too — zooming/panning only
// ever selects a sub-region, it never changes the photo's proportions.
export function computeCropRect({
  sourceWidth,
  sourceHeight,
  viewportWidth,
  viewportHeight,
  scale,
  translateX,
  translateY,
}: CropAdjustment): CropRect {
  const clampedScale = Math.max(scale, 1);
  // Screen-scaled-pixel -> source-pixel conversion factor.
  const k = sourceWidth / viewportWidth;

  const imageTopLeftX = (-viewportWidth * (clampedScale - 1)) / 2 + translateX;
  const imageTopLeftY = (-viewportHeight * (clampedScale - 1)) / 2 + translateY;

  const cropWidth = sourceWidth / clampedScale;
  const cropHeight = sourceHeight / clampedScale;

  const rawOriginX = (0 - imageTopLeftX) * (k / clampedScale);
  const rawOriginY = (0 - imageTopLeftY) * (k / clampedScale);

  const originX = Math.min(Math.max(rawOriginX, 0), sourceWidth - cropWidth);
  const originY = Math.min(Math.max(rawOriginY, 0), sourceHeight - cropHeight);

  return {
    originX,
    originY,
    width: cropWidth,
    height: cropHeight,
  };
}

// Keeps the image edges from ever revealing empty space inside the
// viewport, given the current zoom level.
export function clampTranslate(
  translate: number,
  viewportSize: number,
  scale: number
): number {
  const maxOffset = (viewportSize * (Math.max(scale, 1) - 1)) / 2;
  return Math.min(Math.max(translate, -maxOffset), maxOffset);
}
