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

const NOTIFICATION_CONTENT = {
    tr: {
        title: "Keepr Temizlik Vakti!",
        testTitle: "🧪 Test Bildirimi",
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
        testTitle: "🧪 Test Notification",
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
        testTitle: "🧪 Notificación de prueba",
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
        testTitle: "🧪 Test-Benachrichtigung",
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
        testTitle: "🧪 Notification de test",
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
        testTitle: "🧪 Notificação de teste",
        messages: [
            "A sua galeria está a ficar cheia! Vamos limpá-la juntos! ✨",
            "Capturou grandes momentos, mas está na hora de organizar os extras! 📸",
            "O seu armazenamento vai agradecer, vamos libertar espaço! 💾",
            "Que tal uma sessão rápida de limpeza? Guarde as recordações, descarte o que está desfocado! 🍭",
            "O Keepr está pronto para si! Pronto para renovar a sua galeria? 🚀",
        ]
    }
};

export const registerForPushNotificationsAsync = async () => {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            // Permission alerts are hard to localize here without language param, 
            // but usually this is called from App.js where we have access.
            // For now keeping TR/EN fallback as it's a critical system alert.
            return null;
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        return finalStatus;
    } catch (error) {
        throw error;
    }
};

// Test bildirimi - düzeltilmiş trigger formatı
export const sendTestNotification = async (language) => {
    try {
        const { status } = await Notifications.getPermissionsAsync();

        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') return;
        }

        const content = NOTIFICATION_CONTENT[language] || NOTIFICATION_CONTENT.en;
        const title = content.testTitle;
        const body = content.messages[Math.floor(Math.random() * content.messages.length)];

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
                type: 'timeInterval',
                seconds: 2,
            },
        });

        return notificationId;
    } catch (error) {
        throw error;
    }
};

export const scheduleNotifications = async (enabled, frequency, language, hour, minute, weekdays) => {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();

        if (!enabled) return;

        const content = NOTIFICATION_CONTENT[language] || NOTIFICATION_CONTENT.en;
        const title = content.title;
        const body = content.messages[Math.floor(Math.random() * content.messages.length)];

        if (frequency === 'daily') {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: {
                    type: 'daily',
                    hour: hour,
                    minute: minute,
                    repeats: true,
                },
            });
        } else if (frequency === 'weekly') {
            for (const weekday of weekdays) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title,
                        body,
                        sound: true,
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                    },
                    trigger: {
                        type: 'weekly',
                        weekday: weekday,
                        hour: hour,
                        minute: minute,
                        repeats: true,
                    },
                });
            }
        }
    } catch (error) {
        throw error;
    }
};
