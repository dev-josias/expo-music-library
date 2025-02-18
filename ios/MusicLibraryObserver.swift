import ExpoModulesCore
import MediaPlayer

protocol MusicLibraryObserverHandler: AnyObject {
  func didChange()
}

class MusicLibraryObserver: NSObject {
  weak var handler: MusicLibraryObserverHandler?

  init(handler: MusicLibraryObserverHandler) {
    self.handler = handler
    super.init()

    // Start observing music library changes
    NotificationCenter.default.addObserver(self, selector: #selector(handleMusicLibraryChange), name: .MPMediaLibraryDidChange, object: nil)
    MPMediaLibrary.default().beginGeneratingLibraryChangeNotifications()
  }

  deinit {
    // Stop observing music library changes
    NotificationCenter.default.removeObserver(self, name: .MPMediaLibraryDidChange, object: nil)
    MPMediaLibrary.default().endGeneratingLibraryChangeNotifications()
  }

  @objc private func handleMusicLibraryChange() {
    handler?.didChange()
  }
}
