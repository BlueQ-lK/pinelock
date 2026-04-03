import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, subHours, addYears, addMonths, addDays } from 'date-fns';
import { useWarRoom } from '../_context';
import { Milestone, Todo } from '../../../types';
import { scheduleNotificationAtDate } from '../../../services/notifications';
import { ScannerSprite } from '../../../components/dashboard/ScannerSprite';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';


export default function ManualEntry() {
    const { theme } = useTheme();
    const { draftStack, setDraftStack, goal, deployedStack } = useWarRoom();
    const [manualTitle, setManualTitle] = useState('');
    const [manualDesc, setManualDesc] = useState('');
    const [manualDeadline, setManualDeadline] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [manualImpact, setManualImpact] = useState<'HIGH' | 'CRITICAL'>('HIGH');
    const [manualTodos, setManualTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');
    const [deadlineError, setDeadlineError] = useState('');

    // Calculate goal end date
    const getGoalEndDate = () => {
        if (!goal?.startDate || !goal?.durationValue || !goal?.durationUnit) return undefined;
        const start = new Date(goal.startDate);
        switch (goal.durationUnit) {
            case 'year': return addYears(start, goal.durationValue);
            case 'months': return addMonths(start, goal.durationValue);
            case 'days': return addDays(start, goal.durationValue);
            default: return undefined;
        }
    };
    const goalEndDate = getGoalEndDate();

    const handleAddTodo = () => {
        if (!newTodo.trim()) return;
        const todo: Todo = {
            id: Date.now().toString(),
            task: newTodo.trim(),
            completed: false
        };
        setManualTodos([...manualTodos, todo]);
        setNewTodo('');
    };

    const handleDeleteTodo = (id: string) => {
        setManualTodos(manualTodos.filter(t => t.id !== id));
    };

    const handleManualSubmit = async () => {
        if (!manualTitle.trim()) return;

        // Use ISO format for storage
        const isoDeadline = manualDeadline.toISOString().split('T')[0];

        // Extra validation for goal range
        if (goalEndDate && manualDeadline > goalEndDate) {
            setDeadlineError(`Mission deadline must be within your goal duration (before ${format(goalEndDate, 'MMM d, yyyy')}).`);
            return;
        }

        // Check if a milestone with this deadline already exists in draft OR deployed
        const normalizedNewDeadline = new Date(isoDeadline).toISOString().split('T')[0];

        const inDraft = draftStack.find(m => {
            try { return new Date(m.deadline).toISOString().split('T')[0] === normalizedNewDeadline; }
            catch (e) { return false; }
        });

        const inDeployed = deployedStack.find(m => {
            try { return new Date(m.deadline).toISOString().split('T')[0] === normalizedNewDeadline; }
            catch (e) { return false; }
        });

        if (inDraft || inDeployed) {
            const displayDate = format(new Date(isoDeadline), 'MMM d, yyyy');
            setDeadlineError(`TOTAL FOCUS REQUIRED. You already have a mission locked for ${displayDate}. Consolidate your steps or choose a different window.`);
            return;
        }

        // Clear any previous error
        setDeadlineError('');

        const newMilestone: Milestone = {
            id: Date.now().toString(),
            title: manualTitle,
            description: manualDesc,
            deadline: isoDeadline, // Store in ISO format
            impact: manualImpact,
            status: 'PENDING',
            daysLeft: 14,
            todos: manualTodos,
            order: draftStack.length + 1
        };

        setDraftStack([...draftStack, newMilestone]);

        // 2. Schedule Deadline Notification (24 hours before)
        const warningDate = subHours(manualDeadline, 24);
        if (warningDate > new Date()) {
            await scheduleNotificationAtDate(
                "Mission Critical",
                `Deadline for "${manualTitle}" is in 24 hours. Execute.`,
                warningDate
            );
        }

        // 3. Schedule Urgent Notification (1 hour before)
        const urgentDate = subHours(manualDeadline, 1);
        if (urgentDate > new Date()) {
            await scheduleNotificationAtDate(
                "IMMINENT DEADLINE",
                `"${manualTitle}" is due in 1 hour. LOCK IN.`,
                urgentDate
            );
        }

        setManualTitle('');
        setManualDesc('');
        setManualDeadline(new Date());
        setManualImpact('HIGH');
        setManualTodos([]);
        setNewTodo('');
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || manualDeadline;
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        // Final safety check against goal end date
        if (goalEndDate && currentDate > goalEndDate) {
            setManualDeadline(goalEndDate);
            setDeadlineError(`Date outside goal range. Limit: ${format(goalEndDate, 'MMM d, yyyy')}`);
        } else {
            setManualDeadline(currentDate);
            if (deadlineError) {
                setDeadlineError('');
            }
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
            style={{ backgroundColor: theme.background }}
        >
            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 140 }}>
                {/* Builder Sprite Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-2xl font-black" style={{ color: theme.text }}>MANUAL INPUT</Text>
                        <Text className="text-xs font-bold tracking-widest" style={{ color: theme.textSecondary }}>BUILD YOUR PLAN</Text>
                    </View>
                    <View className="scale-75 origin-right h-24 w-24 justify-center items-center">
                        <View className="absolute">
                            <ScannerSprite
                                state={manualTitle.length > 5 ? 'APPROVED' : manualTitle.length > 0 ? 'ANALYZING' : 'IDLE'}
                                showLabels={false}
                            />
                        </View>
                    </View>
                </View>

                <Text className="text-xs font-bold mb-2 tracking-widest" style={{ color: theme.textSecondary }}>MISSION TITLE</Text>
                <TextInput
                    className="p-4 rounded-xl font-bold text-lg mb-6"
                    style={{ backgroundColor: theme.surface, color: theme.text }}
                    placeholder="e.g. Launch MVP"
                    placeholderTextColor={theme.textSecondary}
                    value={manualTitle}
                    onChangeText={setManualTitle}
                />

                <Text className="text-xs font-bold mb-2 tracking-widest" style={{ color: theme.textSecondary }}>TACTICAL DESCRIPTION</Text>
                <TextInput
                    className="p-4 rounded-xl font-medium text-sm mb-6 h-32"
                    style={{ backgroundColor: theme.surface, color: theme.text }}
                    placeholder="Describe the objective..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    textAlignVertical="top"
                    value={manualDesc}
                    onChangeText={setManualDesc}
                />

                <Text className="text-xs font-bold mb-2 tracking-widest" style={{ color: theme.textSecondary }}>DEADLINE</Text>
                <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className={`p-4 rounded-xl ${deadlineError ? 'mb-2 border-2' : 'mb-6'}`}
                    style={{ backgroundColor: theme.surface, borderColor: deadlineError ? theme.danger : theme.border }}
                >
                    <Text className="font-medium text-sm" style={{ color: theme.text }}>
                        {format(manualDeadline, 'MMMM d, yyyy')}
                    </Text>
                </TouchableOpacity>

                {deadlineError && (
                    <View className="p-3 rounded-lg mb-6 flex-row items-start gap-2" style={{ backgroundColor: theme.danger + '1A' }}>
                        <Ionicons name="warning" size={16} color={theme.danger} />
                        <Text className="flex-1 text-xs font-bold leading-4" style={{ color: theme.danger }}>
                            {deadlineError}
                        </Text>
                    </View>
                )}

                {showDatePicker && (
                    <View className="w-full items-center justify-center">
                        <DateTimePicker
                            value={manualDeadline}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            minimumDate={new Date()}
                            maximumDate={goalEndDate}
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
                            onPress={() => setManualImpact(level)}
                            className={`flex-1 py-4 rounded-xl border-2 items-center`}
                            style={{
                                backgroundColor: manualImpact === level ? theme.accent : theme.surface,
                                borderColor: manualImpact === level ? theme.accent : theme.border
                            }}
                        >
                            <Text className={`font-bold text-xs tracking-widest`} style={{ color: manualImpact === level ? theme.background : theme.textSecondary }}>
                                {level}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text className="text-xs font-bold mb-2 tracking-widest" style={{ color: theme.textSecondary }}>TACTICAL MOMENTUM</Text>
                <View className="rounded-xl p-4 mb-8" style={{ backgroundColor: theme.surface }}>
                    {/* Input */}
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }}>
                            <Ionicons name="add" size={16} color={theme.text} />
                        </View>
                        <TextInput
                            className="flex-1 font-bold text-sm"
                            style={{ color: theme.text }}
                            placeholder="Add actionable step..."
                            placeholderTextColor={theme.textSecondary}
                            value={newTodo}
                            onChangeText={setNewTodo}
                            onSubmitEditing={handleAddTodo}
                        />
                        {newTodo.length > 0 && (
                            <TouchableOpacity onPress={handleAddTodo} className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: theme.text }}>
                                <Text className="text-[10px] font-bold tracking-wider" style={{ color: theme.background }}>ADD</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* List */}
                    {manualTodos.map((todo, index) => (
                        <View key={todo.id} className="flex-row items-center justify-between py-3 border-t" style={{ borderTopColor: theme.border }}>
                            <View className="flex-row items-center gap-4 flex-1">
                                <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: theme.surfaceAlt }}>
                                    <Text className="text-sm font-bold" style={{ color: theme.textSecondary }}>{index + 1}</Text>
                                </View>
                                <Text className="font-bold text-base flex-1" style={{ color: theme.text }}>{todo.task}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteTodo(todo.id)} className="p-2 opacity-50">
                                <Ionicons name="close" size={14} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {manualTodos.length === 0 && (
                        <View className="py-4 items-center">
                            <Text className="text-[10px] font-bold tracking-widest uppercase" style={{ color: theme.textSecondary, opacity: 0.5 }}>No steps defined</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View className="absolute bottom-0 left-0 right-0 p-6 border-t" style={{ paddingBottom: 40, backgroundColor: theme.background, borderTopColor: theme.border }}>
                <TouchableOpacity
                    onPress={handleManualSubmit}
                    disabled={!manualTitle.trim()}
                    className={`py-4 rounded-xl items-center`}
                    style={{ backgroundColor: manualTitle.trim() ? theme.accent : theme.surfaceAlt }}
                >
                    <Text className="font-bold tracking-widest" style={{ color: manualTitle.trim() ? theme.accentForeground : theme.textSecondary }}>ADD TO FOCUS ZONE</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
