import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Image, PanResponder, Dimensions, StyleSheet } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { computeCropRect, clampTranslate } from '../services/photoCropService';
import { COLORS, RADIUS, SPACING, TYPE_SCALE } from '../constants/theme';

interface PhotoAdjustModalProps {
  visible: boolean;
  photoUri: string;
  sourceWidth: number;
  sourceHeight: number;
  accentColor: string;
  onConfirm: (result: { uri: string; aspectRatio: number }) => void;
  onCancel: () => void;
}

const MAX_SCALE = 4;

function clampScale(value: number): number {
  return Math.min(Math.max(value, 1), MAX_SCALE);
}

function touchDistance(touches: readonly { pageX: number; pageY: number }[]): number {
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

// The viewport is always shaped at the source photo's own aspect ratio
// (never a fixed square/box), so pinching/panning inside it only ever
// selects a sub-region — it can never distort the photo's proportions.
function computeViewportSize(sourceWidth: number, sourceHeight: number) {
  const screen = Dimensions.get('window');
  const maxWidth = screen.width * 0.9 - SPACING.horizontal * 2;
  const maxHeight = screen.height * 0.55;
  const ratio = sourceWidth / sourceHeight;

  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return { width, height };
}

export function PhotoAdjustModal({
  visible,
  photoUri,
  sourceWidth,
  sourceHeight,
  accentColor,
  onConfirm,
  onCancel,
}: PhotoAdjustModalProps) {
  const { width: viewportWidth, height: viewportHeight } = computeViewportSize(sourceWidth, sourceHeight);

  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const prevTouchRef = useRef<{ x: number; y: number } | null>(null);
  const prevPinchDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (visible) {
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
      prevTouchRef.current = null;
      prevPinchDistanceRef.current = null;
    }
  }, [visible, photoUri]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length >= 2) {
          const distance = touchDistance(touches);
          if (prevPinchDistanceRef.current != null) {
            const factor = distance / prevPinchDistanceRef.current;
            setTransform((prev) => {
              const nextScale = clampScale(prev.scale * factor);
              return {
                scale: nextScale,
                translateX: clampTranslate(prev.translateX, viewportWidth, nextScale),
                translateY: clampTranslate(prev.translateY, viewportHeight, nextScale),
              };
            });
          }
          prevPinchDistanceRef.current = distance;
          prevTouchRef.current = null;
        } else if (touches.length === 1) {
          const touch = touches[0];
          if (prevTouchRef.current) {
            const dx = touch.pageX - prevTouchRef.current.x;
            const dy = touch.pageY - prevTouchRef.current.y;
            setTransform((prev) => ({
              scale: prev.scale,
              translateX: clampTranslate(prev.translateX + dx, viewportWidth, prev.scale),
              translateY: clampTranslate(prev.translateY + dy, viewportHeight, prev.scale),
            }));
          }
          prevTouchRef.current = { x: touch.pageX, y: touch.pageY };
          prevPinchDistanceRef.current = null;
        }
      },
      onPanResponderRelease: () => {
        prevTouchRef.current = null;
        prevPinchDistanceRef.current = null;
      },
      onPanResponderTerminate: () => {
        prevTouchRef.current = null;
        prevPinchDistanceRef.current = null;
      },
    })
  ).current;

  const handleConfirm = async () => {
    const cropRect = computeCropRect({
      sourceWidth,
      sourceHeight,
      viewportWidth,
      viewportHeight,
      scale: transform.scale,
      translateX: transform.translateX,
      translateY: transform.translateY,
    });

    const result = await ImageManipulator.manipulateAsync(
      photoUri,
      [{ crop: cropRect }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    onConfirm({ uri: result.uri, aspectRatio: result.width / result.height });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>調整照片</Text>

          <View
            testID="photo-adjust-viewport"
            style={[styles.viewport, { width: viewportWidth, height: viewportHeight }]}
            {...panResponder.panHandlers}
          >
            <Image
              testID="photo-adjust-image"
              source={{ uri: photoUri }}
              style={[
                { width: viewportWidth, height: viewportHeight },
                {
                  transform: [
                    { translateX: transform.translateX },
                    { translateY: transform.translateY },
                    { scale: transform.scale },
                  ],
                },
              ]}
            />
          </View>

          <Text style={styles.hint}>單指拖曳移動照片，雙指縮放大小</Text>

          <View style={styles.actionsRow}>
            <Pressable testID="photo-adjust-cancel" style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </Pressable>
            <Pressable
              testID="photo-adjust-confirm"
              style={[styles.confirmButton, { backgroundColor: accentColor }]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>確定</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  panel: { width: '90%', backgroundColor: COLORS.card, borderRadius: RADIUS.large, padding: SPACING.horizontal },
  title: {
    fontSize: TYPE_SCALE.subtitle,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.verticalMedium,
    textAlign: 'center',
  },
  viewport: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.border,
  },
  hint: {
    fontSize: TYPE_SCALE.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.verticalSmall,
    marginBottom: SPACING.verticalMedium,
  },
  actionsRow: { flexDirection: 'row', gap: 8 },
  cancelButton: {
    flex: 1,
    padding: SPACING.verticalMedium,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: COLORS.textPrimary },
  confirmButton: { flex: 1, padding: SPACING.verticalMedium, borderRadius: RADIUS.pill, alignItems: 'center' },
  confirmButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: '#FFFFFF' },
});
