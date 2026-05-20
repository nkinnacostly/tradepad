import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  COLORS,
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "../../constants";

const INPUT_BG = "#0D1526";
const INPUT_BORDER = "#1E293B";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const ITEM_HEIGHT = 48;
const COLUMN_HEIGHT = 200;
const HIGHLIGHT_TOP = 76;

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
}

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatDisplayDate = (iso: string): string => {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return "";
  }
  const [year, month, day] = parts;
  return `${day} ${MONTH_LABELS[month - 1]} ${year}`;
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

const getDaysInMonth = (year: number, monthIndex: number): number => {
  return new Date(year, monthIndex + 1, 0).getDate();
};

const parseIsoOrNull = (
  iso: string,
): { day: number; month: number; year: number } | null => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  if (m < 1 || m > 12) return null;
  const dim = getDaysInMonth(y, m - 1);
  if (d < 1 || d > dim) return null;
  return { year: y, month: m - 1, day: d };
};

const todayParts = (): { day: number; month: number; year: number } => {
  const t = new Date();
  return {
    year: t.getFullYear(),
    month: t.getMonth(),
    day: t.getDate(),
  };
};

const buildYearRange = (): number[] => {
  const y = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, i) => y - 1 + i);
};

const PRIMARY_08 = hexToRgba(COLORS.primary, 0.08);
const PRIMARY_10 = hexToRgba(COLORS.primary, 0.1);

export const DatePicker = ({
  value,
  onChange,
  label,
  placeholder = "Select date",
  error,
}: DatePickerProps): React.JSX.Element => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const dayListRef = useRef<FlatList<number>>(null);
  const monthListRef = useRef<FlatList<(typeof MONTH_LABELS)[number]>>(null);
  const yearListRef = useRef<FlatList<number>>(null);

  const years = buildYearRange();
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const dayData = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    const dim = getDaysInMonth(selectedYear, selectedMonth);
    setSelectedDay((d) => Math.min(d, dim));
  }, [selectedYear, selectedMonth]);

  const openModal = (): void => {
    const parsed = parseIsoOrNull(value);
    const base = parsed ?? todayParts();
    const dim = getDaysInMonth(base.year, base.month);
    const day = Math.min(base.day, dim);
    setSelectedYear(base.year);
    setSelectedMonth(base.month);
    setSelectedDay(day);
    setModalVisible(true);

    const yearRange = buildYearRange();
    const yearIdx = Math.max(0, yearRange.indexOf(base.year));

    requestAnimationFrame(() => {
      dayListRef.current?.scrollToOffset({
        offset: (day - 1) * ITEM_HEIGHT,
        animated: false,
      });
      monthListRef.current?.scrollToOffset({
        offset: base.month * ITEM_HEIGHT,
        animated: false,
      });
      yearListRef.current?.scrollToOffset({
        offset: yearIdx * ITEM_HEIGHT,
        animated: false,
      });
    });
  };

  const closeModal = (): void => {
    setModalVisible(false);
  };

  const handleCancel = (): void => {
    closeModal();
  };

  const handleDone = (): void => {
    const dim = getDaysInMonth(selectedYear, selectedMonth);
    const day = Math.min(selectedDay, dim);
    const iso = `${selectedYear}-${pad2(selectedMonth + 1)}-${pad2(day)}`;
    onChange(iso);
    closeModal();
  };

  const onDayScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(dayData.length - 1, idx));
    const nextDay = dayData[clamped] ?? 1;
    setSelectedDay(nextDay);
  };

  const onMonthScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(11, Math.round(y / ITEM_HEIGHT)));
    setSelectedMonth(idx);
  };

  const onYearScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const y = e.nativeEvent.contentOffset.y;
    const yearRange = buildYearRange();
    const idx = Math.max(
      0,
      Math.min(yearRange.length - 1, Math.round(y / ITEM_HEIGHT)),
    );
    setSelectedYear(yearRange[idx] ?? yearRange[0]);
  };

  const displayText =
    value && formatDisplayDate(value) ? formatDisplayDate(value) : "";

  const renderDayItem = ({ item }: { item: number }): React.JSX.Element => {
    const selected = item === selectedDay;
    return (
      <View style={styles.itemCell}>
        <Text
          style={[
            styles.itemTextBase,
            selected ? styles.itemTextSelected : styles.itemTextIdle,
          ]}
        >
          {item}
        </Text>
      </View>
    );
  };

  const renderMonthItem = ({
    item,
    index,
  }: {
    item: (typeof MONTH_LABELS)[number];
    index: number;
  }): React.JSX.Element => {
    const selected = index === selectedMonth;
    return (
      <View style={styles.itemCell}>
        <Text
          style={[
            styles.itemTextBase,
            selected ? styles.itemTextSelected : styles.itemTextIdle,
          ]}
        >
          {item}
        </Text>
      </View>
    );
  };

  const renderYearItem = ({ item }: { item: number }): React.JSX.Element => {
    const selected = item === selectedYear;
    return (
      <View style={styles.itemCell}>
        <Text
          style={[
            styles.itemTextBase,
            selected ? styles.itemTextSelected : styles.itemTextIdle,
          ]}
        >
          {item}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? "Select date"}
        onPress={openModal}
        style={({ pressed }) => [styles.fieldRow, pressed && styles.fieldPressed]}
      >
        <Ionicons
          color={COLORS.textMuted}
          name="calendar-outline"
          size={18}
          style={styles.calendarIcon}
        />
        <Text
          style={[
            styles.fieldText,
            !displayText ? styles.placeholderText : null,
          ]}
        >
          {displayText || placeholder}
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            style={styles.backdrop}
            onPress={handleCancel}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={handleCancel}
                style={styles.headerButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>Select Date</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={handleDone}
                style={styles.headerButton}
              >
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>

            <View style={styles.columnsRow}>
              <View style={styles.column}>
                <View
                  pointerEvents="none"
                  style={[styles.highlightBar, { backgroundColor: PRIMARY_08 }]}
                />
                <FlatList
                  ref={dayListRef}
                  contentContainerStyle={styles.listContent}
                  data={dayData}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  key={`${selectedYear}-${selectedMonth}`}
                  keyExtractor={(item) => `d-${item}`}
                  renderItem={renderDayItem}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  style={styles.list}
                  onMomentumScrollEnd={onDayScrollEnd}
                />
              </View>

              <View style={[styles.column, styles.columnMargin]}>
                <View
                  pointerEvents="none"
                  style={[styles.highlightBar, { backgroundColor: PRIMARY_08 }]}
                />
                <FlatList
                  ref={monthListRef}
                  contentContainerStyle={styles.listContent}
                  data={[...MONTH_LABELS]}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  keyExtractor={(item) => `m-${item}`}
                  renderItem={renderMonthItem}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  style={styles.list}
                  onMomentumScrollEnd={onMonthScrollEnd}
                />
              </View>

              <View style={[styles.column, styles.columnMargin]}>
                <View
                  pointerEvents="none"
                  style={[styles.highlightBar, { backgroundColor: PRIMARY_08 }]}
                />
                <FlatList
                  ref={yearListRef}
                  contentContainerStyle={styles.listContent}
                  data={years}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  keyExtractor={(item) => `y-${item}`}
                  renderItem={renderYearItem}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  style={styles.list}
                  onMomentumScrollEnd={onYearScrollEnd}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textMuted,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  fieldRow: {
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: "row",
    height: 56,
    paddingHorizontal: SPACING.md,
  },
  fieldPressed: {
    opacity: 0.9,
  },
  calendarIcon: {
    marginRight: SPACING.sm,
  },
  fieldText: {
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  placeholderText: {
    color: COLORS.textMuted,
  },
  error: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  headerButton: {
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  cancelText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
  sheetTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.lg,
  },
  doneText: {
    color: COLORS.primary,
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
  },
  columnsRow: {
    flexDirection: "row",
  },
  column: {
    flex: 1,
    height: COLUMN_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  columnMargin: {
    marginLeft: SPACING.xs,
  },
  highlightBar: {
    borderRadius: RADIUS.sm,
    height: ITEM_HEIGHT,
    left: 0,
    pointerEvents: "none",
    position: "absolute",
    right: 0,
    top: HIGHLIGHT_TOP,
  },
  list: {
    height: COLUMN_HEIGHT,
  },
  listContent: {
    paddingBottom: HIGHLIGHT_TOP,
    paddingTop: HIGHLIGHT_TOP,
  },
  itemCell: {
    alignItems: "center",
    height: ITEM_HEIGHT,
    justifyContent: "center",
  },
  itemTextBase: {
    textAlign: "center",
  },
  itemTextSelected: {
    backgroundColor: PRIMARY_10,
    borderRadius: RADIUS.sm,
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZE.lg,
    overflow: "hidden",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  itemTextIdle: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZE.md,
  },
});
