import { registerWebModule, NativeModule } from 'expo';

class LocalMusicModule extends NativeModule<{}> {}

export default registerWebModule(LocalMusicModule, 'LocalMusicModule');
