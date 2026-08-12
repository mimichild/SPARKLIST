import { Modal, View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPE_SCALE } from '../constants/theme';

interface ProgressModalProps {
  visible: boolean;
  label: string;
  current: number;
  total: number;
  accentColor: string;
}

export function ProgressModal({ visible, label, current, total, accentColor }: ProgressModalProps) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.label}>{label}</Text>
          <Text testID="progress-modal-count" style={styles.count}>
            {current} / {total}
          </Text>
          <View style={styles.track}>
            <View
              testID="progress-modal-bar"
              style={[styles.bar, { width: `${percent}%`, backgroundColor: accentColor }]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  panel: {
    width: '80%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.large,
    padding: SPACING.horizontal,
    alignItems: 'center',
  },
  label: {
    fontSize: TYPE_SCALE.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.verticalSmall,
  },
  count: { fontSize: TYPE_SCALE.small, color: COLORS.textSecondary, marginBottom: SPACING.verticalMedium },
  track: { width: '100%', height: 8, borderRadius: 4, backgroundColor: COLORS.border, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
});
