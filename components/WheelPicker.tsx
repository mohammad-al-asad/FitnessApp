import React, { useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface WheelPickerProps {
  data: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  itemHeight?: number;
  visibleItems?: number;
  suffix?: string;
  testID?: string;
}

export default function WheelPicker({
  data,
  selectedValue,
  onValueChange,
  itemHeight = 50,
  visibleItems = 5,
  suffix = '',
  testID,
}: WheelPickerProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const containerHeight = itemHeight * visibleItems;
  const paddingVertical = (containerHeight - itemHeight) / 2;
  const isAnimatingRef = useRef(false);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // keep scroll aligned to selectedValue only when idle
  useEffect(() => {
  if (isAnimatingRef.current) return;

  const index = data.indexOf(selectedValue);
  if (index !== -1 && scrollViewRef.current) {
    // 🧊 tiny delay so the new picker fully mounts before snapping
    const timeout = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: index * itemHeight,
        animated: false,
      });
    }, 150);

    return () => clearTimeout(timeout);
  }
}, [selectedValue]);


  const snapToNearest = (y: number) => {
    const index = Math.round(y / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    const newValue = data[clampedIndex];
    scrollViewRef.current?.scrollTo({
      y: clampedIndex * itemHeight,
      animated: true,
    });
    if (newValue !== selectedValue) onValueChange(newValue);
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    snapToNearest(y);
    isAnimatingRef.current = false;
  };

  const handleItemPress = (index: number) => {
  // 🚫 if it's already animating, completely ignore the tap
  if (isAnimatingRef.current) return;

  isAnimatingRef.current = true;

  const targetY = index * itemHeight;
  scrollViewRef.current?.scrollTo({ y: targetY, animated: true });

  // clear any pending timer
  if (animationTimer.current) clearTimeout(animationTimer.current);

  // wait slightly longer to ensure scroll fully stops
  animationTimer.current = setTimeout(() => {
    onValueChange(data[index]);
    // add tiny extra delay before allowing next tap
    setTimeout(() => {
      isAnimatingRef.current = false;
    }, 150);
  }, 400); // <- wait longer so it fully settles before unlocking
};


  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <View style={styles.selectionIndicator} />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{ paddingVertical }}
        scrollEventThrottle={16}
        testID={testID}
      >
        {data.map((item, index) => {
          const isSelected = item === selectedValue;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.item, { height: itemHeight }]}
              activeOpacity={0.8}
              onPress={() => handleItemPress(index)}
              disabled={isAnimatingRef.current} // 🔒 prevent spam taps
            >
              <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>
                {item}
                {suffix}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#2A3520',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionIndicator: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(139, 129, 76, 0.1)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(139, 129, 76, 0.3)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  item: { justifyContent: 'center', alignItems: 'center' },
  itemText: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  selectedItemText: {
    fontSize: 20,
    color: '#8B814C',
    fontWeight: '600',
  },
});
