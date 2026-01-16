import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useTranslation } from '../hooks/useTranslation';
import useSettingsStore from '../store/useSettingsStore';

const { width } = Dimensions.get('window');

const OnboardingModal = ({ visible, onClose }) => {
    const { t } = useTranslation();
    const setOnboardingCompleted = useSettingsStore((state) => state.setOnboardingCompleted);
    const [step, setStep] = useState(1);

    const steps = [
        {
            id: 1,
            title: t('ob_welcome_title'),
            desc: t('ob_welcome_desc'),
            icon: '👋',
            color: '#FF5252'
        },
        {
            id: 2,
            title: t('ob_swipe_left_title'),
            desc: t('ob_swipe_left_desc'),
            icon: '🗑️',
            color: '#FF5252'
        },
        {
            id: 3,
            title: t('ob_swipe_right_title'),
            desc: t('ob_swipe_right_desc'),
            icon: '✨',
            color: '#4CAF50'
        },
        {
            id: 4,
            title: t('ob_finish_title'),
            desc: t('ob_finish_desc'),
            icon: '🚀',
            color: '#6200EE'
        }
    ];

    const handleNext = () => {
        if (step < steps.length) {
            setStep(step + 1);
        } else {
            setOnboardingCompleted(true);
            onClose();
        }
    };

    const currentStep = steps[step - 1];

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <Animated.View
                    entering={FadeIn.duration(400)}
                    exiting={FadeOut.duration(400)}
                    style={styles.container}
                >
                    <View style={[styles.content]}>
                        <Animated.View
                            key={step}
                            entering={SlideInRight.duration(400)}
                            exiting={SlideOutLeft.duration(400)}
                            style={styles.stepContent}
                        >
                            <Text style={styles.icon}>{currentStep.icon}</Text>
                            <Text style={[styles.title, { color: currentStep.color }]}>{currentStep.title}</Text>
                            <Text style={styles.desc}>{currentStep.desc}</Text>
                        </Animated.View>

                        <View style={styles.footer}>
                            <View style={styles.dots}>
                                {steps.map((s) => (
                                    <View
                                        key={s.id}
                                        style={[
                                            styles.dot,
                                            { backgroundColor: s.id === step ? currentStep.color : '#DDD' }
                                        ]}
                                    />
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: currentStep.color }]}
                                onPress={handleNext}
                            >
                                <Text style={styles.buttonText}>
                                    {step === steps.length ? t('ob_start') : t('ob_next')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width * 0.85,
        backgroundColor: '#FFF',
        borderRadius: 30,
        padding: 30,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    content: {
        alignItems: 'center',
    },
    stepContent: {
        alignItems: 'center',
        width: '100%',
    },
    icon: {
        fontSize: 80,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 15,
    },
    desc: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    footer: {
        width: '100%',
        alignItems: 'center',
    },
    dots: {
        flexDirection: 'row',
        marginBottom: 25,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    button: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    }
});

export default OnboardingModal;
