import { View, Text, Pressable, Image } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";

export function MusicPlayer() {
    const player = useAudioPlayer("http://ec6.yesstreaming.net:1740/stream");
    const [playPause, setplayPause] = useState(true);

    const playerConrol = () => {
        if (playPause) {
            player.play()
        } else {
            player.pause()
        }
        setplayPause(!playPause)
    }

    return (
        <View className="items-center justify-center">
            {/* Capsule */}
            <View className="flex-row gap-4 items-center rounded-full border border-black/10 bg-white p-2 shadow-sm">
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
                        onPress={playerConrol}
                    >
                        {playPause ? (
                            <MaterialCommunityIcons name="play" color={'#fff'} size={40} />
                        ) : (
                            <MaterialCommunityIcons name="pause" color={'#fff'} size={40} />
                        )}
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
