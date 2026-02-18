import React, { useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContext } from '../../App';
import { gradients, fontFamily } from '../theme';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 54 : 36;

const bannerImg = require('../../assets/splash/tweetle-banner-splashcreen.png');
const leftGrassImg = require('../../assets/splash/left-splashcreen.png');
const rightGrassImg = require('../../assets/splash/right-splashcreen.png');
const mountainImg = require('../../assets/splash/mountain.png');
const mountainGrassImg = require('../../assets/splash/mountain-grass-splashscreen.png');
const roadImg = require('../../assets/splash/road.png');
const nestImg = require('../../assets/splash/nest-splashscreen.png');
const treeNestImg = require('../../assets/splash/tree-with-nest-splashscreen.png');
const cloudImg = require('../../assets/splash/cloud-left-splashscreen.png');

const ANIM_DURATION = 800;

export function SplashScreen() {
  const { navigate } = useContext(NavigationContext);
  const { width, height } = useWindowDimensions();

  // Animation values
  const fromTop = useRef(new Animated.Value(-400)).current;
  const fromBottom = useRef(new Animated.Value(400)).current;
  const fromLeft = useRef(new Animated.Value(-400)).current;
  const fromRight = useRef(new Animated.Value(400)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const heartbeat = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const easing = Easing.in(Easing.ease);
    Animated.parallel([
      Animated.timing(fromTop, { toValue: 0, duration: ANIM_DURATION, easing, useNativeDriver: true }),
      Animated.timing(fromBottom, { toValue: 0, duration: ANIM_DURATION, easing, useNativeDriver: true }),
      Animated.timing(fromLeft, { toValue: 0, duration: ANIM_DURATION, easing, useNativeDriver: true }),
      Animated.timing(fromRight, { toValue: 0, duration: ANIM_DURATION, easing, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: ANIM_DURATION, easing, useNativeDriver: true }),
    ]).start(() => {
      // Start heartbeat after enter animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartbeat, {
            toValue: 0.92,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(heartbeat, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, []);

  const bannerW = Math.round(width * 0.7);
  const bannerH = Math.round(bannerW * 0.8);
  const landH = height * 0.45;

  return (
    <LinearGradient
      colors={[...gradients.splash]}
      locations={[...gradients.splashLocations]}
      style={[styles.container, { paddingTop: STATUS_BAR_HEIGHT }]}
    >
      {/* Cloud — top left */}
      <Animated.View
        style={[
          styles.abs,
          {
            top: height * 0.03,
            left: -width * 0.05,
            transform: [{ translateX: fromLeft }],
            opacity,
          },
        ]}
      >
        <Image
          source={cloudImg}
          style={{ width: width * 0.45, height: width * 0.3 }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* TWEETLE Banner */}
      <Animated.View
        style={[
          styles.center,
          {
            top: height * 0.01,
            transform: [{ translateY: fromTop }],
            opacity,
          },
        ]}
      >
        <Image
          source={bannerImg}
          style={{ width: bannerW, height: bannerH }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* PLAY button + icon row */}
      <Animated.View
        style={[
          styles.center,
          {
            top: height * 0.33,
            transform: [{ translateY: fromBottom }],
            opacity,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: heartbeat }] }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigate('dashboard' as any)}
            style={[
              styles.playBtn,
              { width: Math.min(width * 0.55, 240), height: 54 },
            ]}
          >
            <Text style={styles.playTxt}>PLAY</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.iconRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconTxt}>🔊</Text>
          </View>
          <View style={[styles.iconCircle, { marginHorizontal: 14 }]}>
            <Text style={styles.iconTxt}>⭐</Text>
          </View>
          <View style={styles.iconCircle}>
            <Text style={styles.iconTxt}>⚙️</Text>
          </View>
        </View>
      </Animated.View>

      {/* BOTTOM LANDSCAPE */}
      <View style={[styles.landscape, { height: landH }]}>
        {/* Mountain */}
        <Animated.View
          style={[
            styles.abs,
            {
              right: -width * 0.1,
              bottom: 0,
              zIndex: 1,
              transform: [{ translateY: fromBottom }],
              opacity,
            },
          ]}
        >
          <Image
            source={mountainImg}
            style={{ width: width * 0.9, height: landH * 0.85 }}
            resizeMode="stretch"
          />
        </Animated.View>

        {/* Mountain grass strips */}
        <Animated.View
          style={[
            styles.abs,
            {
              right: 0,
              bottom: landH * 0.15,
              zIndex: 2,
              transform: [{ translateY: fromBottom }],
              opacity,
            },
          ]}
        >
          <Image
            source={mountainGrassImg}
            style={{ width: width * 0.5, height: landH * 0.5 }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Road */}
        <Animated.View
          style={[
            styles.abs,
            {
              left: width * 0.12,
              bottom: -landH * 0.05,
              zIndex: 3,
              transform: [{ translateY: fromBottom }],
              opacity,
            },
          ]}
        >
          <Image
            source={roadImg}
            style={{ width: width * 0.65, height: landH * 0.8 }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Left grass */}
        <Animated.View
          style={[
            styles.abs,
            {
              left: -width * 0.05,
              bottom: 0,
              zIndex: 5,
              transform: [{ translateX: fromLeft }],
              opacity,
            },
          ]}
        >
          <Image
            source={leftGrassImg}
            style={{ width: width * 0.55, height: landH * 0.55 }}
            resizeMode="stretch"
          />
        </Animated.View>

        {/* Right grass */}
        <Animated.View
          style={[
            styles.abs,
            {
              right: -width * 0.05,
              bottom: landH * 0.1,
              zIndex: 5,
              transform: [{ translateX: fromRight }],
              opacity,
            },
          ]}
        >
          <Image
            source={rightGrassImg}
            style={{ width: width * 0.55, height: landH * 0.45 }}
            resizeMode="stretch"
          />
        </Animated.View>

        {/* Small nest on stick */}
        <Animated.View
          style={[
            styles.abs,
            {
              left: width * 0.01,
              bottom: landH * 0.22,
              zIndex: 6,
              transform: [{ translateY: fromBottom }],
              opacity,
            },
          ]}
        >
          <Image
            source={nestImg}
            style={{ width: width * 0.16, height: landH * 0.25 }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Big nest on road */}
        <Animated.View
          style={[
            styles.abs,
            {
              left: width * 0.22,
              bottom: -landH * 0.02,
              zIndex: 7,
              transform: [{ translateY: fromBottom }],
              opacity,
            },
          ]}
        >
          <Image
            source={nestImg}
            style={{ width: width * 0.4, height: landH * 0.25 }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Tree with nest */}
        <Animated.View
          style={[
            styles.abs,
            {
              right: -width * 0.03,
              bottom: landH * 0.6,
              zIndex: 4,
              transform: [{ translateY: fromBottom }],
              opacity,
            },
          ]}
        >
          <Image
            source={treeNestImg}
            style={{ width: width * 0.25, height: landH * 0.15 }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  abs: { position: 'absolute' },
  center: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playBtn: {
    backgroundColor: '#2C3E44',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4A5E64',
  },
  playTxt: {
    fontFamily: fontFamily.heading,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(44, 62, 68, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTxt: { fontSize: 17 },
  landscape: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
});
