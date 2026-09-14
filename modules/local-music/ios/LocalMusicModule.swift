import AVFoundation
import ExpoModulesCore

public class LocalMusicModule: Module {
  private var volumeObservation: NSKeyValueObservation?

  public func definition() -> ModuleDefinition {
    Name("LocalMusic")
    Events("onSystemVolumeChange")

    OnCreate {
      let audioSession = AVAudioSession.sharedInstance()
      try? audioSession.setActive(true)
      volumeObservation = audioSession.observe(\.outputVolume, options: [.initial, .new]) { [weak self] _, change in
        guard let volume = change.new else {
          return
        }
        self?.sendEvent("onSystemVolumeChange", ["volume": volume])
      }
    }

    OnDestroy {
      volumeObservation?.invalidate()
      volumeObservation = nil
    }

    AsyncFunction("getSystemVolume") {
      Double(AVAudioSession.sharedInstance().outputVolume)
    }
  }
}
