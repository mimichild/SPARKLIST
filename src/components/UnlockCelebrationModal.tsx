import { Modal, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import type { Item } from '../types/item';
import { COLORS, RADIUS, SPACING, TYPE_SCALE } from '../constants/theme';

interface UnlockCelebrationModalProps {
  item: Item;
  accentColor: string;
  onDismiss: () => void;
}

export function UnlockCelebrationModal({ item, accentColor, onDismiss }: UnlockCelebrationModalProps) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>恭喜解鎖！</Text>

          {item.photoUri ? (
            <Image
              testID="unlock-celebration-photo"
              source={{ uri: item.photoUri }}
              style={[styles.photo, { aspectRatio: item.photoAspectRatio ?? 1 }]}
            />
          ) : null}

          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.hint}>現在可以重新考慮要不要購買囉，記得去解鎖區看看！</Text>

          <Pressable style={[styles.button, { backgroundColor: accentColor }]} onPress={onDismiss}>
            <Text style={styles.buttonText}>太棒了！</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  panel: {
    width: '85%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.large,
    padding: SPACING.horizontal,
    alignItems: 'center',
  },
  title: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.verticalMedium },
  photo: {
    width: '100%',
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.verticalMedium,
  },
  name: { fontSize: TYPE_SCALE.subtitle, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  hint: {
    fontSize: TYPE_SCALE.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.verticalSmall,
    marginBottom: SPACING.verticalLarge,
  },
  button: { alignSelf: 'stretch', padding: SPACING.verticalMedium, borderRadius: RADIUS.pill, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: '#FFFFFF' },
});
