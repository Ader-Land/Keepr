import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Notification texts live here (and not in src/i18n/translations.js) because they are
// also needed outside React components, e.g. when rescheduling at app start.
// When adding a language, add it here as well as in the UI translations.
const NOTIFICATION_CONTENT = {
    tr: {
        title: "Keepr Temizlik Vakti!",
        messages: [
            "Galerin biraz kalabalık mı? Gel bir el atalım! ✨",
            "Çok güzel anılar biriktirdin ama gereksizleri ayıklama vakti! 📸",
            "Hafızan sana teşekkür edecek, hadi biraz yer açalım! 💾",
            "Ufak bir temizlik seansına ne dersin? Tatlı anılar kalsın, bulanıklar gitsin! 🍭",
            "Keepr senin için hazır! Galerini ferahlatmaya hazır mısın? 🚀",
        ]
    },
    en: {
        title: "Keepr Cleanup Time!",
        messages: [
            "Your gallery is getting crowded! Let's clean it up together! ✨",
            "You've captured great moments, but it's time to sort the extras! 📸",
            "Your storage will thank you, let's free up some space! 💾",
            "How about a quick cleanup session? Keep the memories, ditch the blurs! 🍭",
            "Keepr is ready for you! Ready to refresh your gallery? 🚀",
        ]
    },
    es: {
        title: "¡Hora de limpiar con Keepr!",
        messages: [
            "¿Tu galería se está llenando? ¡Vamos a limpiarla juntos! ✨",
            "Has capturado grandes momentos, ¡pero es hora de ordenar los extras! 📸",
            "¡Tu almacenamiento te lo agradecerá, liberemos algo de espacio! 💾",
            "¿Qué tal una sesión rápida de limpieza? ¡Quédate con los recuerdos, tira lo borroso! 🍭",
            "¡Keepr está listo para ti! ¿Estás listo para refrescar tu galería? 🚀",
        ]
    },
    de: {
        title: "Zeit zum Aufräumen mit Keepr!",
        messages: [
            "Deine Galerie ist überfüllt! Lass uns gemeinsam aufräumen! ✨",
            "Du hast tolle Momente festgehalten, aber es ist Zeit, die Extras zu sortieren! 📸",
            "Dein Speicher wird es dir danken, lass uns etwas Platz schaffen! 💾",
            "Wie wäre es mit einer kurzen Aufräumaktion? Behalte die Erinnerungen, weg mit dem Unscharfen! 🍭",
            "Keepr ist bereit für dich! Bereit, deine Galerie aufzufrischen? 🚀",
        ]
    },
    fr: {
        title: "L'heure du nettoyage avec Keepr !",
        messages: [
            "Votre galerie est encombrée ! Nettoyons-la ensemble ! ✨",
            "Vous avez capturé de superbes moments, mais il est temps de trier le surplus ! 📸",
            "Votre stockage vous remerciera, libérons de l'espace ! 💾",
            "Que diriez-vous d'une petite séance de nettoyage ? Gardez les souvenirs, jetez le flou ! 🍭",
            "Keepr est prêt pour vous ! Prêt à rafraîchir votre galerie ? 🚀",
        ]
    },
    pt: {
        title: "Hora da limpeza com o Keepr!",
        messages: [
            "A sua galeria está a ficar cheia! Vamos limpá-la juntos! ✨",
            "Capturou grandes momentos, mas está na hora de organizar os extras! 📸",
            "O seu armazenamento vai agradecer, vamos libertar espaço! 💾",
            "Que tal uma sessão rápida de limpeza? Guarde as recordações, descarte o que está desfocado! 🍭",
            "O Keepr está pronto para si! Pronto para renovar a sua galeria? 🚀",
        ]
    }
};

const CHANNEL_ID = 'default';
const DAILY_WINDOW_DAYS = 14;
const WEEKLY_WINDOW_DAYS = 56;

const ensureAndroidChannel = async () => {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Keepr reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF5252',
    });
};

/**
 * Asks for notification permission (only call this when the user opts in).
 * Resolves with the final permission status ('granted' | 'denied' | ...) or null
 * when something went wrong.
 */
export const registerForPushNotificationsAsync = async () => {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return finalStatus || null;
        }

        await ensureAndroidChannel();

        return finalStatus;
    } catch (error) {
        console.warn('Notification permission request failed:', error?.message);
        return null;
    }
};

// Returns the messages in random order, never repeating one back to back.
const buildMessageSequence = (messages, count) => {
    const result = [];
    let last = null;
    for (let i = 0; i < count; i += 1) {
        let pick = messages[Math.floor(Math.random() * messages.length)];
        if (messages.length > 1) {
            while (pick === last) {
                pick = messages[Math.floor(Math.random() * messages.length)];
            }
        }
        result.push(pick);
        last = pick;
    }
    return result;
};

// Upcoming trigger dates for the given schedule. JS getDay() is 0=Sunday, while
// expo-notifications weekdays (and our settings) use 1=Sunday ... 7=Saturday.
const buildTriggerDates = (frequency, hour, minute, weekdays) => {
    const now = Date.now();
    const days = frequency === 'weekly' ? WEEKLY_WINDOW_DAYS : DAILY_WINDOW_DAYS;
    const dates = [];

    for (let offset = 0; offset < days; offset += 1) {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        date.setHours(hour, minute, 0, 0);

        if (date.getTime() <= now + 30 * 1000) continue;
        if (frequency === 'weekly' && !(weekdays || []).includes(date.getDay() + 1)) continue;

        dates.push(date);
    }
    return dates;
};

// Scheduling is serialized so that overlapping calls (app start + settings change)
// cannot interleave "cancel all" and "schedule" and create duplicates.
let scheduleQueue = Promise.resolve();

const runSchedule = async (enabled, frequency, language, hour, minute, weekdays) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!enabled) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await ensureAndroidChannel();

    const content = NOTIFICATION_CONTENT[language] || NOTIFICATION_CONTENT.en;
    const dates = buildTriggerDates(frequency, hour, minute, weekdays);
    const messages = buildMessageSequence(content.messages, dates.length);

    // A rolling window of one-off notifications lets every reminder carry a different
    // message. The window is refreshed whenever the app is opened or settings change.
    for (let i = 0; i < dates.length; i += 1) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: content.title,
                body: messages[i],
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: dates[i],
                channelId: CHANNEL_ID,
            },
        });
    }
};

export const scheduleNotifications = (enabled, frequency, language, hour, minute, weekdays) => {
    const run = scheduleQueue.then(() =>
        runSchedule(enabled, frequency, language, hour, minute, weekdays)
    );
    // Keep the queue usable after a failure; the caller still receives the error.
    scheduleQueue = run.catch(() => { /* reported to the caller through `run` */ });
    return run;
};
