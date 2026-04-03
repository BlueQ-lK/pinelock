import { View, Text, Pressable, Image } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect } from "react";

export function MusicPlayer({ isPaused = false }: { isPaused?: boolean }) {
    const player = useAudioPlayer("http://ec6.yesstreaming.net:1740/stream");
    const [isPlaying, setIsPlaying] = useState(false); // Initially paused

    useEffect(() => {
        if (isPaused && isPlaying) {
            try {
                player.pause();
            } catch (e) {
                console.warn('Could not pause player:', e);
            }
            setIsPlaying(false);
        }
    }, [isPaused, isPlaying, player]);

    const playerControl = () => {
        const nextIsPlaying = !isPlaying;
        try {
            if (nextIsPlaying) {
                player.play();
            } else {
                player.pause();
            }
            setIsPlaying(nextIsPlaying);
        } catch (e) {
            console.warn('Could not control player:', e);
        }
    };

    return (
        <View className="items-center justify-center">
            {/* Capsule */}
            <View className="flex-row gap-4 items-center rounded-full border border-black/10 bg-white p-2 ">
                <Image
                    source={{ uri: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_5.png" }}
                    style={{ width: 49, height: 49 }}
                    className="rounded-full"
                />
                <View>
                    <Text className="font-bold text-2xl tracking-wider">LOFI</Text>
                </View>
                <View className="bg-black rounded-full flex justify-center items-center" style={{ width: 49, height: 49 }}>
                    <Pressable
                        onPress={playerControl}
                    >
                        {isPlaying ? (
                            <MaterialCommunityIcons name="pause" color={'#fff'} size={40} />
                        ) : (
                            <MaterialCommunityIcons name="play" color={'#fff'} size={40} />
                        )}
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
