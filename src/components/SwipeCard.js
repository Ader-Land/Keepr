import React, { memo, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Image, Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    interpolate,
    Extrapolate,
    runOnJS,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import useSettingsStore from '../store/useSettingsStore';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;

const SwipeCard = memo(({ asset, onSwipeLeft, onSwipeRight, style, isActive, labels }) => {
    const { vibrationEnabled } = useSettingsStore();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const context = useSharedValue({ x: 0, y: 0, scale: 1 });

    const triggerHaptic = () => {
        if (vibrationEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const player = useVideoPlayer(isActive && asset.mediaType === 'video' ? (asset.localUri || asset.uri) : null, (player) => {
        if (isActive && asset.mediaType === 'video') {
            player.loop = true;
            player.muted = true;
            player.play();
        }
    });

    const [imageError, setImageError] = React.useState(false);

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
            context.value = { x: translateX.value, y: translateY.value, scale: scale.value };
        })
        .onUpdate((event) => {
            translateX.value = context.value.x + event.translationX;
            translateY.value = context.value.y + event.translationY;
        })
        .onEnd((event) => {
            if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
                runOnJS(triggerHaptic)();

                if (event.translationX > 0) {
                    translateX.value = withSpring(width * 1.5, { velocity: event.velocityX });
                    runOnJS(onSwipeRight)(asset);
                } else {
                    translateX.value = withSpring(-width * 1.5, { velocity: event.velocityX });
                    runOnJS(onSwipeLeft)(asset);
                }
            } else {
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                scale.value = withSpring(1);
            }
        });

    const pinchGesture = Gesture.Pinch()
        .enabled(isActive)
        .onUpdate((event) => {
            scale.value = context.value.scale * event.scale;
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
            Extrapolate.CLAMP
        );

        const swipeScale = interpolate(
            translateX.value,
            [-width / 2, 0, width / 2],
            [1, 1, 1],
            Extrapolate.CLAMP
        );

        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotate}deg` },
                { scale: scale.value * swipeScale }
            ],
        };
    });

    const keepOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolate.CLAMP),
    }));

    const deleteOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolate.CLAMP),
    }));

    return (
        <View style={[styles.container, style]} pointerEvents={isActive ? 'auto' : 'none'}>
            <GestureDetector gesture={combinedGesture}>
                <Animated.View style={[styles.card, animatedStyle]}>
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
                                <Text style={styles.errorText}>⚠️ Görsel Yüklenemedi</Text>
                                <Text style={styles.errorSubText}>{asset.filename || 'Medya Hatası'}</Text>
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
                        <Text style={styles.overlayText}>{labels?.keep || 'KEEP'}</Text>
                    </Animated.View>

                    <Animated.View style={[styles.overlay, styles.deleteOverlay, deleteOpacity]}>
                        <Text style={styles.overlayText}>{labels?.delete || 'DELETE'}</Text>
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
        width: width * 0.9,
        height: height * 0.7,
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
