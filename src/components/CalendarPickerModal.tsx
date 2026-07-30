import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPE_SCALE, getContrastColor } from '../constants/theme';

interface CalendarPickerModalProps {
  visible: boolean;
  initialDate: Date;
  accentColor: string;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function getMonthWeeks(year: number, month: number): (Date | null)[][] {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function CalendarPickerModal({ visible, initialDate, accentColor, onSelect, onClose }: CalendarPickerModalProps) {
  const [viewDate, setViewDate] = useState(initialDate);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const weeks = getMonthWeeks(year, month);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Pressable testID="calendar-prev-month" onPress={() => setViewDate(new Date(year, month - 1, 1))}>
              <Text style={styles.navButton}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{year} 年 {month + 1} 月</Text>
            <Pressable testID="calendar-next-month" onPress={() => setViewDate(new Date(year, month + 1, 1))}>
              <Text style={styles.navButton}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={styles.weekdayLabel}>{label}</Text>
            ))}
          </View>

          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((date, dayIndex) => {
                if (!date) {
                  return <View key={dayIndex} style={styles.dayCell} />;
                }
                const selected = isSameDay(date, initialDate);
                return (
                  <Pressable
                    key={dayIndex}
                    testID={`calendar-day-${isoDate(date)}`}
                    style={[styles.dayCell, selected && { backgroundColor: accentColor, borderRadius: 999 }]}
                    onPress={() => onSelect(date)}
                  >
                    <Text style={selected ? { color: getContrastColor(accentColor) } : styles.dayLabel}>
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>關閉</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  panel: { width: '85%', backgroundColor: COLORS.card, borderRadius: RADIUS.large, padding: SPACING.horizontal },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.verticalMedium,
  },
  navButton: { fontSize: TYPE_SCALE.title, color: COLORS.textPrimary, paddingHorizontal: SPACING.verticalMedium },
  monthLabel: { fontSize: TYPE_SCALE.subtitle, fontWeight: '600', color: COLORS.textPrimary },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: TYPE_SCALE.caption, color: COLORS.textSecondary },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayLabel: { fontSize: TYPE_SCALE.small, color: COLORS.textPrimary },
  closeButton: { marginTop: SPACING.verticalMedium, alignItems: 'center', paddingVertical: SPACING.verticalSmall },
  closeButtonText: { color: COLORS.textSecondary, fontSize: TYPE_SCALE.small },
});
