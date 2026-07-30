import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Image, Dimensions, StyleSheet } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
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
  // Snapshot of `transform` taken whenever a pan or pinch gesture (re)starts,
  // so each gesture's deltas are applied relative to a fresh baseline
  // instead of drifting from a stale one.
  const gestureStartRef = useRef({ scale: 1, translateX: 0, translateY: 0 });

  useEffect(() => {
    if (visible) {
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
      gestureStartRef.current = { scale: 1, translateX: 0, translateY: 0 };
    }
  }, [visible, photoUri]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      gestureStartRef.current = transform;
    })
    .onUpdate((event) => {
      const base = gestureStartRef.current;
      setTransform((prev) => ({
        scale: prev.scale,
        translateX: clampTranslate(base.translateX + event.translationX, viewportWidth, prev.scale),
        translateY: clampTranslate(base.translateY + event.translationY, viewportHeight, prev.scale),
      }));
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      gestureStartRef.current = transform;
    })
    .onUpdate((event) => {
      const base = gestureStartRef.current;
      const nextScale = clampScale(base.scale * event.scale);
      setTransform({
        scale: nextScale,
        translateX: clampTranslate(base.translateX, viewportWidth, nextScale),
        translateY: clampTranslate(base.translateY, viewportHeight, nextScale),
      });
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

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
      {/*
        On Android, RN's core Modal mounts its content in a separate native
        window that is NOT a descendant of the app-root GestureHandlerRootView
        (the one in app/_layout.tsx) — without a root view scoped to this
        window too, react-native-gesture-handler never sees any touches
        here at all. This nested root is what actually makes the gestures
        work inside a Modal.
      */}
      <GestureHandlerRootView style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>調整照片</Text>

          <GestureDetector gesture={composedGesture}>
            <View
              testID="photo-adjust-viewport"
              style={[styles.viewport, { width: viewportWidth, height: viewportHeight }]}
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
          </GestureDetector>

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
      </GestureHandlerRootView>
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
