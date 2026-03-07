import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { attendanceApi } from '@/api';
import { getDeviceFingerprint, getDeviceName, getDevicePlatform } from '@/utils';
import { Button } from '@/components';

type ScanState = 'scanning' | 'processing' | 'success' | 'error';

export default function AttendanceScanScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [errorMessage, setErrorMessage] = useState('');
  const hasScanned = useRef(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (hasScanned.current || scanState !== 'scanning') return;
    hasScanned.current = true;
    setScanState('processing');

    try {
      // Parse QR data: expecting JSON with { sessionId, token }
      let qrData: { sessionId: string; token: string };
      try {
        qrData = JSON.parse(data);
      } catch {
        throw new Error('Invalid QR code format');
      }

      if (!qrData.sessionId || !qrData.token) {
        throw new Error('Invalid QR code — missing session info');
      }

      // Get GPS location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission required for attendance');

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      // Get device fingerprint
      const fingerprint = await getDeviceFingerprint();

      // Try registering device if not yet registered
      try {
        await attendanceApi.myDevice();
      } catch {
        // Device not registered — register it
        try {
          await attendanceApi.registerDevice({
            fingerprint,
            deviceName: getDeviceName(),
            platform: getDevicePlatform(),
          });
        } catch {
          // May fail if already pending — continue
        }
      }

      // Mark attendance
      await attendanceApi.mark({
        sessionId: qrData.sessionId,
        sessionToken: qrData.token,
        deviceFingerprint: fingerprint,
        gpsLat: location.coords.latitude,
        gpsLng: location.coords.longitude,
      });

      setScanState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto-close after 2 seconds
      setTimeout(() => router.back(), 2000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to mark attendance';
      setErrorMessage(message);
      setScanState('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleRetry = () => {
    hasScanned.current = false;
    setScanState('scanning');
    setErrorMessage('');
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={48} color="#FFF" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan attendance QR codes.
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} style={{ marginTop: 24 }} />
          <Button title="Go Back" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} textStyle={{ color: '#FFF' }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {/* Close button */}
      <Pressable onPress={() => router.back()} style={styles.closeButton}>
        <Ionicons name="close" size={28} color="#FFF" />
      </Pressable>

      {scanState === 'scanning' && (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          {/* QR Frame Overlay */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.instructions}>Point camera at the attendance QR code</Text>
          </View>
        </>
      )}

      {scanState === 'processing' && (
        <View style={styles.centerContainer}>
          <Animated.View entering={ZoomIn.duration(300)}>
            <View style={[styles.statusCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="hourglass" size={40} color="#FFF" />
            </View>
          </Animated.View>
          <Text style={styles.statusTitle}>Verifying...</Text>
          <Text style={styles.statusText}>Please wait while we mark your attendance</Text>
        </View>
      )}

      {scanState === 'success' && (
        <View style={styles.centerContainer}>
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <View style={[styles.statusCircle, { backgroundColor: '#059669' }]}>
              <Ionicons name="checkmark" size={48} color="#FFF" />
            </View>
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.statusTitle}>
            Attendance Marked!
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(300)} style={styles.statusText}>
            You're all set. Have a great day!
          </Animated.Text>
        </View>
      )}

      {scanState === 'error' && (
        <View style={styles.centerContainer}>
          <Animated.View entering={ZoomIn.duration(300)}>
            <View style={[styles.statusCircle, { backgroundColor: '#DC2626' }]}>
              <Ionicons name="close" size={48} color="#FFF" />
            </View>
          </Animated.View>
          <Text style={styles.statusTitle}>Error</Text>
          <Text style={styles.statusText}>{errorMessage}</Text>
          <Button title="Try Again" onPress={handleRetry} style={{ marginTop: 24 }} />
          <Button title="Go Back" variant="ghost" onPress={() => router.back()} textStyle={{ color: '#FFF' }} style={{ marginTop: 8 }} />
        </View>
      )}
    </View>
  );
}

const FRAME_SIZE = 260;

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFF',
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  instructions: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  statusCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statusTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  statusText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: { color: '#FFF', fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  permissionText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
