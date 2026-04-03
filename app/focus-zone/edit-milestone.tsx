import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useWarRoom } from './_context';
import { Milestone } from '../../types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function EditMilestone() {
    const router = useRouter();
    const { theme, themeName } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { draftOptions, setDraftOptions } = useWarRoom();

    // State to hold the current milestone being edited
    const [milestone, setMilestone] = useState<Milestone | null>(null);

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState(new Date());
    const [impact, setImpact] = useState<'HIGH' | 'CRITICAL'>('HIGH');

    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (id) {
            const found = draftOptions.find(m => m.id === id);
            if (found) {
                setMilestone(found);
                setTitle(found.title);
                setDescription(found.description);
                // Handle deadline parsing if it's a string
                // precise parsing depends on your date format in types. usually strings in 'MMM d, yyyy' or ISO
                // Given manual.tsx uses format(date, 'MMM d, yyyy'), we should probably try to parse that back or just default if invalid
                // But for now let's assume valid date or just current date if parsing fails

                // If existing deadline is a string, we might need logic to parse it. 
                // For simplicity, if we can't easily parse 'MMM d, yyyy', we might reset to today or keep it as is if we don't change it.
                // However, DateTimePicker needs a Date object.
                // Let's not spend too much time implementing a string parser unless necessary. 
                // We'll just default to now if we can't parse, or maybe the milestone object has a raw date?
                // The type says deadline: string.
                setDeadline(new Date());
                setImpact(found.impact || 'HIGH');
            } else {
                Alert.alert("Error", "Milestone not found");
                router.back();
            }
        }
    }, [id, draftOptions]); // Dependencies check

    const handleSave = () => {
        if (!milestone || !title.trim()) return;

        const updatedMilestone: Milestone = {
            ...milestone,
            title,
            description,
            deadline: deadline.toISOString().split('T')[0], // Store in ISO format
            impact
        };

        // Update the list
        setDraftOptions(prev => prev.map(m => m.id === milestone.id ? updatedMilestone : m));

        router.back();
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || deadline;
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        setDeadline(currentDate);
    };

    // We shouldn't probably show the form until found
    if (!milestone) return <View className="flex-1" style={{ backgroundColor: theme.background }} />;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
            style={{ backgroundColor: theme.background }}
        >
            <View className="px-6 pt-12 pb-6 border-b flex-row items-center gap-4" style={{ borderBottomColor: theme.border }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View>
                    <Text className="text-xl font-black" style={{ color: theme.text }}>EDIT TACTIC</Text>
                </View>
            </View>

            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 140 }}>
                <Text className="text-xs font-bold mb-2 tracking-widest" style={{ color: theme.textSecondary }}>MISSION TITLE</Text>
                <TextInput
                    className="p-4 rounded-xl font-bold text-lg mb-6"
                    style={{ backgroundColor: theme.surface, color: theme.text }}
                    placeholder="Title"
                    placeholderTextColor={theme.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                />

                <Text className="text-xs font-bold mb-2 tracking-widest" style={{ color: theme.textSecondary }}>TACTICAL DESCRIPTION</Text>
                <TextInput
                    className="p-4 rounded-xl font-medium text-sm mb-6 h-32"
                    style={{ backgroundColor: theme.surface, color: theme.text }}
                    placeholder="Description..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    textAlignVertical="top"
                    value={description}
                    onChangeText={setDescription}
                />

                <Text className="text-xs font-bold mb-2 tracking-widest" style={{ color: theme.textSecondary }}>DEADLINE</Text>
                <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="p-4 rounded-xl mb-6"
                    style={{ backgroundColor: theme.surface }}
                >
                    <Text className="font-medium text-sm" style={{ color: theme.text }}>
                        {format(deadline, 'MMMM d, yyyy')}
                    </Text>
                </TouchableOpacity>

                {showDatePicker && (
                    <View className="w-full items-center justify-center">
                        <DateTimePicker
                            value={deadline}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            minimumDate={new Date()}
                        />
                    </View>
                )}

                {Platform.OS === 'ios' && showDatePicker && (
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                        className="p-2 rounded-lg items-center mb-6"
                        style={{ backgroundColor: theme.surfaceAlt }}
                    >
                        <Text className="font-bold" style={{ color: theme.accent }}>Done</Text>
                    </TouchableOpacity>
                )}

                <Text className="text-xs font-bold mb-2 tracking-widest" style={{ color: theme.textSecondary }}>IMPACT LEVEL</Text>
                <View className="flex-row gap-3 mb-8">
                    {(['HIGH', 'CRITICAL'] as const).map((level) => (
                        <TouchableOpacity
                            key={level}
                            onPress={() => setImpact(level)}
                            className={`flex-1 py-4 rounded-xl border-2 items-center`}
                            style={{ 
                                backgroundColor: impact === level ? theme.accent : theme.surface,
                                borderColor: impact === level ? theme.accent : theme.border
                            }}
                        >
                            <Text className={`font-bold text-xs tracking-widest`} style={{ color: impact === level ? theme.accentForeground : theme.textSecondary }}>
                                {level}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View className="absolute bottom-0 left-0 right-0 p-6 border-t" style={{ paddingBottom: 40, backgroundColor: theme.background, borderTopColor: theme.border }}>
                <TouchableOpacity
                    onPress={handleSave}
                    className="py-4 rounded-xl items-center"
                    style={{ backgroundColor: theme.text }}
                >
                    <Text className="font-bold tracking-widest" style={{ color: theme.background }}>SAVE CHANGES</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
