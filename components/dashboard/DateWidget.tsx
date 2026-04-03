import { View, Text } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';

export function DateWidget() {
  const now = new Date();
  const { theme } = useTheme();

  return (
    <View
      className="rounded-[32px] p-6 flex-1 aspect-square justify-between border"
      style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
    >
      <View>
        <Text className="font-bold text-xl tracking-widest" style={{ color: theme.accent }}>
          {format(now, 'MMM').toUpperCase()}
        </Text>
        <Text className="font-black text-9xl tracking-tighter -ml-1" style={{ color: theme.text }}>
          {
            format(now, 'd').length === 1 ? `0${format(now, 'd')}` : format(now, 'd')
          }
        </Text>
      </View>
      <Text className="font-bold text-sm tracking-widest uppercase" style={{ color: theme.textSecondary }}>
        {format(now, 'EEEE')}
      </Text>
    </View>
  );
}