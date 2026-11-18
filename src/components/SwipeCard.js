import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, Image, Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import useSettingsStore from '../store/useSettingsStore';
import { useTranslation } from '../hooks/useTranslation';

const SwipeCard = memo(function SwipeCard({ asset, onSwipeLeft, onSwipeRight, style, isActive, labels }) {
    const { width, height } = useWindowDimensions();
    const swipeThreshold = width * 0.3;
    const { t } = useTranslation();
    const vibrationEnabled = useSettingsStore((state) => state.vibrationEnabled);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const panStartX = useSharedValue(0);
    const panStartY = useSharedValue(0);
    const pinchStartScale = useSharedValue(1);

    const triggerHaptic = () => {
        if (vibrationEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const player = useVideoPlayer(isActive && asset.mediaType === 'video' ? (asset.localUri || asset.uri) : null, (p) => {
        if (isActive && asset.mediaType === 'video') {
            p.loop = true;
            p.muted = true;
            p.play();
        }
    });

    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (player) {
            if (isActive) {
                player.play();
            } else {
                player.pause();
            }
        }
    }, [isActive, player]);

    const panGesture = Gesture.Pan()
        .enabled(isActive)
        .onStart(() => {
            panStartX.value = translateX.value;
            panStartY.value = translateY.value;
        })
        .onUpdate((event) => {
            translateX.value = panStartX.value + event.translationX;
            translateY.value = panStartY.value + event.translationY;
        })
        .onEnd((event) => {
            if (Math.abs(event.translationX) > swipeThreshold) {
                scheduleOnRN(triggerHaptic);

                if (event.translationX > 0) {
                    translateX.value = withSpring(width * 1.5, { velocity: event.velocityX });
                    scheduleOnRN(onSwipeRight, asset);
                } else {
                    translateX.value = withSpring(-width * 1.5, { velocity: event.velocityX });
                    scheduleOnRN(onSwipeLeft, asset);
                }
            } else {
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                scale.value = withSpring(1);
            }
        });

    const pinchGesture = Gesture.Pinch()
        .enabled(isActive)
        .onStart(() => {
            pinchStartScale.value = scale.value;
        })
        .onUpdate((event) => {
            scale.value = pinchStartScale.value * event.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
            }
        });

    const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => {
        const rotate = interpolate(
            translateX.value,
            [-width / 2, 0, width / 2],
            [-10, 0, 10],
            Extrapolation.CLAMP
        );

        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotate}deg` },
                { scale: scale.value },
            ],
        };
    });

    const keepOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, swipeThreshold], [0, 1], Extrapolation.CLAMP),
    }));

    const deleteOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [-swipeThreshold, 0], [1, 0], Extrapolation.CLAMP),
    }));

    // Screen-reader users cannot swipe, so expose keep/delete as accessibility actions.
    const handleAccessibilityAction = (event) => {
        const action = event.nativeEvent.actionName;
        if (action === 'keep') {
            triggerHaptic();
            onSwipeRight(asset);
        } else if (action === 'delete') {
            triggerHaptic();
            onSwipeLeft(asset);
        }
    };

    const mediaLabel = asset.mediaType === 'video' ? t('a11y_video') : t('a11y_photo');

    return (
        <View style={[styles.container, style]} pointerEvents={isActive ? 'auto' : 'none'}>
            <GestureDetector gesture={combinedGesture}>
                <Animated.View
                    style={[styles.card, { width: width * 0.9, height: height * 0.7 }, animatedStyle]}
                    accessible={isActive}
                    accessibilityRole="adjustable"
                    accessibilityLabel={`${mediaLabel}${asset.filename ? `: ${asset.filename}` : ''}`}
                    accessibilityHint={t('a11y_card_hint')}
                    accessibilityActions={[
                        { name: 'keep', label: labels?.keep || t('keep') },
                        { name: 'delete', label: labels?.delete || t('delete') },
                    ]}
                    onAccessibilityAction={handleAccessibilityAction}
                >
                    {asset.mediaType === 'video' ? (
                        isActive ? (
                            <VideoView
                                player={player}
                                style={styles.media}
                                contentType="contain"
                            />
                        ) : (
                            <View style={[styles.media, { backgroundColor: '#333' }]} />
                        )
                    ) : (
                        imageError ? (
                            <View style={[styles.media, styles.errorContainer]}>
                                <Text style={styles.errorText}>⚠️ {t('image_load_error')}</Text>
                                <Text style={styles.errorSubText}>{asset.filename || t('media_error')}</Text>
                            </View>
                        ) : (
                            <Image
                                source={{ uri: asset.localUri || asset.uri }}
                                style={styles.media}
                                resizeMode="contain"
                                onError={() => setImageError(true)}
                            />
                        )
                    )}

                    <Animated.View style={[styles.overlay, styles.keepOverlay, keepOpacity]}>
                        <Text style={styles.overlayText}>{labels?.keep || t('keep')}</Text>
                    </Animated.View>

                    <Animated.View style={[styles.overlay, styles.deleteOverlay, deleteOpacity]}>
                        <Text style={styles.overlayText}>{labels?.delete || t('delete')}</Text>
                    </Animated.View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        borderRadius: 20,
        backgroundColor: '#000',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        overflow: 'hidden',
    },
    media: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 40,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 4,
        zIndex: 10,
    },
    keepOverlay: {
        left: 40,
        borderColor: '#4CAF50',
        transform: [{ rotate: '-15deg' }],
    },
    deleteOverlay: {
        right: 40,
        borderColor: '#FF5252',
        transform: [{ rotate: '15deg' }],
    },
    overlayText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 5,
    },
    errorContainer: {
        backgroundColor: '#1E1E1E',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#FF5252',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    errorSubText: {
        color: '#666',
        fontSize: 12,
        marginTop: 10,
        textAlign: 'center',
    },
});

export default SwipeCard;
