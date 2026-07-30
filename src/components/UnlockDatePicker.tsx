import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CalendarPickerModal } from './CalendarPickerModal';
import { COLORS, RADIUS, SPACING, TYPE_SCALE, getContrastColor } from '../constants/theme';

export const QUICK_DAY_OPTIONS = [
  { label: '7 天後', days: 7 },
  { label: '14 天後', days: 14 },
  { label: '30 天後', days: 30 },
];

export function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

interface UnlockDatePickerProps {
  unlockDate: string;
  onChange: (iso: string) => void;
  accentColor: string;
  // Which date/month the calendar opens showing. New items default this to
  // today; editing an existing item defaults it to that item's current
  // unlock date instead.
  calendarInitialDate: Date;
  // Which quick-day button (if any) starts highlighted as selected.
  initialSelectedDays?: number | null;
}

export function UnlockDatePicker({
  unlockDate,
  onChange,
  accentColor,
  calendarInitialDate,
  initialSelectedDays = null,
}: UnlockDatePickerProps) {
  const [selectedDays, setSelectedDays] = useState<number | null>(initialSelectedDays);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  const isCustomDateSelected = selectedDays === null;

  const handleSelectCalendarDate = (date: Date) => {
    onChange(date.toISOString());
    setSelectedDays(null);
    setIsCalendarVisible(false);
  };

  return (
    <View>
      <View style={styles.quickDateRow}>
        {QUICK_DAY_OPTIONS.map((option) => {
          const isSelected = selectedDays === option.days;
          return (
            <Pressable
              key={option.label}
              testID={`quick-date-${option.days}`}
              style={[styles.quickDateButton, isSelected && { backgroundColor: accentColor }]}
              onPress={() => {
                setSelectedDays(option.days);
                onChange(addDaysIso(option.days));
              }}
            >
              <Text style={isSelected ? { color: getContrastColor(accentColor) } : styles.quickDateButtonText}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          testID="quick-date-calendar"
          style={[styles.quickDateButton, isCustomDateSelected && { backgroundColor: accentColor }]}
          onPress={() => setIsCalendarVisible(true)}
        >
          <Text style={isCustomDateSelected ? { color: getContrastColor(accentColor) } : styles.quickDateButtonText}>
            📅 選日期
          </Text>
        </Pressable>
      </View>

      {isCustomDateSelected ? (
        <Text style={styles.selectedDateLabel}>已選擇：{formatDateLabel(unlockDate)}</Text>
      ) : null}

      <CalendarPickerModal
        visible={isCalendarVisible}
        initialDate={calendarInitialDate}
        accentColor={accentColor}
        onSelect={handleSelectCalendarDate}
        onClose={() => setIsCalendarVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  quickDateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.verticalSmall },
  quickDateButton: {
    paddingVertical: SPACING.verticalSmall,
    paddingHorizontal: SPACING.verticalMedium,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.border,
  },
  quickDateButtonText: { color: COLORS.textPrimary },
  selectedDateLabel: {
    fontSize: TYPE_SCALE.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.verticalLarge,
  },
});
