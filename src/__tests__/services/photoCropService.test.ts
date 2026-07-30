import { computeCropRect, clampTranslate } from '../../services/photoCropService';

describe('computeCropRect', () => {
  it('scale 為 1 且沒有位移時，裁切範圍等於整張原始照片', () => {
    const rect = computeCropRect({
      sourceWidth: 1200,
      sourceHeight: 900,
      viewportWidth: 300,
      viewportHeight: 225,
      scale: 1,
      translateX: 0,
      translateY: 0,
    });

    expect(rect).toEqual({ originX: 0, originY: 0, width: 1200, height: 900 });
  });

  it('放大兩倍且沒有位移時，裁切範圍為置中的一半大小區塊', () => {
    const rect = computeCropRect({
      sourceWidth: 1200,
      sourceHeight: 900,
      viewportWidth: 300,
      viewportHeight: 225,
      scale: 2,
      translateX: 0,
      translateY: 0,
    });

    expect(rect.width).toBeCloseTo(600);
    expect(rect.height).toBeCloseTo(450);
    // 置中：左右各留 300px。
    expect(rect.originX).toBeCloseTo(300);
    expect(rect.originY).toBeCloseTo(225);
  });

  it('放大並向右上位移時，裁切原點會跟著往照片左下方向移動', () => {
    const rect = computeCropRect({
      sourceWidth: 1200,
      sourceHeight: 900,
      viewportWidth: 300,
      viewportHeight: 225,
      scale: 2,
      translateX: 150, // 影像整體往右移，可視窗口相對看到影像更左邊的部分
      translateY: 0,
    });

    expect(rect.originX).toBeLessThan(300);
  });

  it('裁切範圍不會超出原始照片邊界（即使位移刻意給出極端值）', () => {
    const rect = computeCropRect({
      sourceWidth: 1200,
      sourceHeight: 900,
      viewportWidth: 300,
      viewportHeight: 225,
      scale: 3,
      translateX: 999999,
      translateY: 999999,
    });

    expect(rect.originX).toBeGreaterThanOrEqual(0);
    expect(rect.originY).toBeGreaterThanOrEqual(0);
    expect(rect.originX + rect.width).toBeLessThanOrEqual(1200 + 1e-6);
    expect(rect.originY + rect.height).toBeLessThanOrEqual(900 + 1e-6);
  });

  it('scale 小於 1 時視為 1（不允許縮小到比原圖還小的裁切範圍）', () => {
    const rect = computeCropRect({
      sourceWidth: 1200,
      sourceHeight: 900,
      viewportWidth: 300,
      viewportHeight: 225,
      scale: 0.5,
      translateX: 0,
      translateY: 0,
    });

    expect(rect).toEqual({ originX: 0, originY: 0, width: 1200, height: 900 });
  });

  it('裁切結果維持與 viewport 相同的長寬比（等同原始照片比例）', () => {
    const rect = computeCropRect({
      sourceWidth: 900,
      sourceHeight: 1200,
      viewportWidth: 300,
      viewportHeight: 400,
      scale: 1.5,
      translateX: 10,
      translateY: -20,
    });

    expect(rect.width / rect.height).toBeCloseTo(300 / 400);
  });
});

describe('clampTranslate', () => {
  it('scale 為 1 時不允許任何位移（會被夾回 0）', () => {
    expect(clampTranslate(999, 300, 1)).toBe(0);
    expect(clampTranslate(-999, 300, 1)).toBeCloseTo(0);
  });

  it('scale 為 2 時，最大可位移量為 viewport 尺寸的一半', () => {
    expect(clampTranslate(999, 300, 2)).toBe(150);
    expect(clampTranslate(-999, 300, 2)).toBe(-150);
    expect(clampTranslate(50, 300, 2)).toBe(50);
  });
});
