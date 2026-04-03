import { View, useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

export function BoatingSprite() {
    const { width } = useWindowDimensions();
    const { theme } = useTheme();

    // Static wave generator (no animation)
    const createWavePath = (amp = 10, freq = 2, offset = 0) => {
        const baseHeight = 70;
        let d = `M 0 ${baseHeight}`;

        for (let x = 0; x <= width; x += 10) {
            const nx = x / width;
            const y =
                baseHeight +
                Math.sin(nx * freq * Math.PI * 2 + offset) * amp +
                Math.sin(nx * freq * 2 * Math.PI * 2) * (amp * 0.2);

            d += ` L ${x} ${y}`;
        }

        d += ` L ${width} 150 L 0 150 Z`;
        return d;
    };

    return (
        <View style={{ width: '100%', height: 150, justifyContent: 'flex-end', alignItems: 'center', marginTop: 32 }}>

            {/* Water */}
            <Svg width={width} height="150" style={{ position: 'absolute', bottom: 0 }}>
                <Defs>
                    <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={theme.accent} />
                        <Stop offset="1" stopColor={theme.accent} />
                    </LinearGradient>
                </Defs>

                {/* Back Layer */}
                <Path
                    d={createWavePath(12, 1.5, 0)}
                    fill={theme.accent}
                    opacity={0.6}
                />

                {/* Middle Layer */}
                <Path
                    d={createWavePath(8, 2, 2)}
                    fill={theme.accent}
                    opacity={0.8}
                />

                {/* Front Layer */}
                <Path
                    d={createWavePath(10, 2.5, 4)}
                    fill="url(#waterGrad)"
                />
            </Svg>
        </View>
    );
}