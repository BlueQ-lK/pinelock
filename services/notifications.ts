import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

/** Returned when permission is granted for local notifications (no remote push token). */
const LOCAL_NOTIFICATIONS_OK = 'local';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId
  );
}

/**
 * Ensures notification permission and optional Expo push token.
 * Local reminders only need permission; the return value is truthy when scheduling is allowed.
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return undefined;
  }

  if (!Device.isDevice) {
    return LOCAL_NOTIFICATIONS_OK;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn('expo-notifications: missing EAS projectId; local notifications still work.');
    return LOCAL_NOTIFICATIONS_OK;
  }

  try {
    const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return pushToken;
  } catch (e) {
    console.warn('expo-notifications: could not get Expo push token (local notifications still work):', e);
    return LOCAL_NOTIFICATIONS_OK;
  }
}

export async function schedulePushNotification(title: string, body: string, seconds: number = 1) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      ...(Platform.OS === 'android' ? { channelId: 'default' as const } : {}),
    },
  });
}

export async function scheduleNotificationAtDate(title: string, body: string, date: Date) {
    const trigger = date.getTime() - Date.now();
    if (trigger <= 0) return; // Date is in the past

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === 'android' ? { channelId: 'default' as const } : {}),
      },
    });
}


export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleDailyStreakReminder(hour: number = 21, minute: number = 0) {
    await cancelAllNotifications(); // avoid duplicate schedules
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Keep the streak alive 🔥",
        body: "Don't forget to lock in today. One session closer to your goal.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: 'default' as const } : {}),
      },
    });
}
