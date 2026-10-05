// react-native-web adds hover/focus to Pressable state on web.
import 'react-native';
declare module 'react-native' {
  interface PressableStateCallbackType {
    hovered?: boolean;
    focused?: boolean;
  }
}
