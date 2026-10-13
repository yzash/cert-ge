/**
 * Take a photo with the phone's rear camera.
 * - Web (Chrome / Safari on a phone): <input type=file accept=image/* capture=environment> opens the
 *   camera directly; on a laptop it opens the file picker. The image is downscaled to 1024 px JPEG
 *   so it fits in device storage and uploads quickly.
 * - Native (Android / iOS app): expo-image-picker camera.
 */
import type { Attachment } from '@mozart/schema';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const MAX = 1024;

function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * k);
      canvas.height = Math.round(img.height * k);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the photo')); };
    img.src = url;
  });
}

function pickOnWeb(capture: boolean): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    let done = false;
    const finish = (f: File | null) => { if (done) return; done = true; resolve(f); input.remove(); };
    input.onchange = () => finish(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => finish(null)); // Chrome 113+, Safari 16.4+
    // older browsers fire nothing on cancel: give up a while after focus returns without a file
    window.addEventListener('focus', () => setTimeout(() => { if (!input.files?.length) finish(null); }, 5000), { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

export async function capturePhoto(opts: { source?: 'camera' | 'library' } = {}): Promise<Attachment | null> {
  const source = opts.source ?? 'camera';
  try {
    let uri: string | null = null;
    if (Platform.OS === 'web') {
      const file = await pickOnWeb(source === 'camera');
      if (!file) return null;
      uri = await downscale(file);
    } else {
      const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return null;
      const launch = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const res = await launch({ mediaTypes: ['images'], quality: 0.5, base64: true, exif: false });
      if (res.canceled || !res.assets[0]) return null;
      const a = res.assets[0];
      uri = a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri;
    }
    return { id: `att-${Date.now().toString(36)}`, kind: 'photo', uri, caption: 'Photo taken on site', at: new Date().toISOString() };
  } catch {
    return null;
  }
}
