import Foundation
import MediaPlayer

protocol MusicLibraryObserverHandler: AnyObject {
  func didChange()
}

final class MusicLibraryObserver: NSObject {
  private weak var handler: MusicLibraryObserverHandler?
  private let observerQueue = DispatchQueue(label: "music-library-observer", qos: .utility)
  private var isObserving = false

  init(handler: MusicLibraryObserverHandler) {
    self.handler = handler
    super.init()
    startObserving()
  }

  deinit {
    stopObserving()
  }

  private func startObserving() {
    guard !isObserving else {
      return
    }

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleMusicLibraryChange),
      name: .MPMediaLibraryDidChange,
      object: nil
    )
    MPMediaLibrary.default().beginGeneratingLibraryChangeNotifications()
    isObserving = true
  }

  func stopObserving() {
    guard isObserving else {
      return
    }

    NotificationCenter.default.removeObserver(
      self,
      name: .MPMediaLibraryDidChange,
      object: nil
    )
    MPMediaLibrary.default().endGeneratingLibraryChangeNotifications()
    isObserving = false
  }

  @objc private func handleMusicLibraryChange() {
    observerQueue.async { [weak self] in
      guard let handler = self?.handler else {
        return
      }

      DispatchQueue.main.async {
        handler.didChange()
      }
    }
  }
}
