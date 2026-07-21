import { NativeModule, requireNativeModule } from 'expo';

declare class LocalMusicModule extends NativeModule<{}> {}

export default requireNativeModule<LocalMusicModule>('LocalMusic');
