import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { PhotoAdjustModal } from '../../components/PhotoAdjustModal';

// Raw multi-touch pinch/pan gestures cannot be simulated through
// @testing-library/react-native's fireEvent API (there is no touches-array
// support), so this suite covers structure + confirm/cancel wiring only.
// The pinch/pan -> crop-rectangle math itself is covered exhaustively in
// photoCropService.test.ts; end-to-end gesture feel needs manual on-device
// verification.

describe('PhotoAdjustModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('viewport 依照片來源比例決定寬高，而不是固定 1:1', async () => {
    await render(
      <PhotoAdjustModal
        visible
        photoUri="mock://photo.jpg"
        sourceWidth={900}
        sourceHeight={1200}
        accentColor="#EAAFB3"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const viewport = screen.getByTestId('photo-adjust-viewport');
    const style = StyleSheet.flatten(viewport.props.style);
    expect(style.width / style.height).toBeCloseTo(900 / 1200);
  });

  it('未調整（維持 scale=1）時按下「確定」，裁切範圍等於整張照片', async () => {
    const onConfirm = jest.fn();
    await render(
      <PhotoAdjustModal
        visible
        photoUri="mock://photo.jpg"
        sourceWidth={900}
        sourceHeight={1200}
        accentColor="#EAAFB3"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    await act(async () => {
      await fireEvent.press(screen.getByTestId('photo-adjust-confirm'));
    });

    await waitFor(() => {
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'mock://photo.jpg',
        [{ crop: { originX: 0, originY: 0, width: 900, height: 1200 } }],
        expect.objectContaining({ format: ImageManipulator.SaveFormat.JPEG })
      );
      expect(onConfirm).toHaveBeenCalledWith({ uri: expect.stringContaining('mock://cropped-'), aspectRatio: 900 / 1200 });
    });
  });

  it('按下「取消」會呼叫 onCancel，且不會呼叫圖片裁切', async () => {
    const onCancel = jest.fn();
    await render(
      <PhotoAdjustModal
        visible
        photoUri="mock://photo.jpg"
        sourceWidth={1200}
        sourceHeight={900}
        accentColor="#EAAFB3"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await fireEvent.press(screen.getByTestId('photo-adjust-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
  });
});
