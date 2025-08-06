import ExpoModulesCore
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
    guard !isObserving else { return }
    
    // Start observing music library changes
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
    guard isObserving else { return }
    
    // Stop observing music library changes
    NotificationCenter.default.removeObserver(
      self,
      name: .MPMediaLibraryDidChange,
      object: nil
    )
    
    MPMediaLibrary.default().endGeneratingLibraryChangeNotifications()
    isObserving = false
  }

  @objc private func handleMusicLibraryChange() {
    // Handle the notification on a background queue to avoid blocking
    observerQueue.async { [weak self] in
      guard let self = self, let handler = self.handler else { return }
      
      // Call back to the handler on the main queue for UI updates
      DispatchQueue.main.async {
        handler.didChange()
      }
    }
  }
}

// MARK: - Thread-Safe Singleton Alternative (Optional)

/// Alternative implementation using a singleton pattern for global music library observation
final class MusicLibraryChangeNotifier: NSObject {
  static let shared = MusicLibraryChangeNotifier()
  
  private let observerQueue = DispatchQueue(label: "music-library-notifier", qos: .utility)
  private var handlers: [WeakHandler] = []
  private var isObserving = false
  
  private struct WeakHandler {
    weak var handler: MusicLibraryObserverHandler?
    let id: UUID
  }
  
  private override init() {
    super.init()
  }
  
  func addHandler(_ handler: MusicLibraryObserverHandler) -> UUID {
    let id = UUID()
    let weakHandler = WeakHandler(handler: handler, id: id)
    
    observerQueue.sync {
      handlers.append(weakHandler)
      startObservingIfNeeded()
    }
    
    return id
  }
  
  func removeHandler(withId id: UUID) {
    observerQueue.sync {
      handlers.removeAll { $0.id == id }
      cleanupDeadHandlers()
      stopObservingIfEmpty()
    }
  }
  
  private func startObservingIfNeeded() {
    guard !isObserving else { return }
    
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleMusicLibraryChange),
      name: .MPMediaLibraryDidChange,
      object: nil
    )
    
    MPMediaLibrary.default().beginGeneratingLibraryChangeNotifications()
    isObserving = true
  }
  
  private func stopObservingIfEmpty() {
    guard isObserving && handlers.isEmpty else { return }
    
    NotificationCenter.default.removeObserver(
      self,
      name: .MPMediaLibraryDidChange,
      object: nil
    )
    
    MPMediaLibrary.default().endGeneratingLibraryChangeNotifications()
    isObserving = false
  }
  
  private func cleanupDeadHandlers() {
    handlers.removeAll { $0.handler == nil }
  }
  
  @objc private func handleMusicLibraryChange() {
    observerQueue.async { [weak self] in
      guard let self = self else { return }
      
      // Clean up dead handlers
      self.cleanupDeadHandlers()
      
      // Notify all live handlers on main queue
      let liveHandlers = self.handlers.compactMap { $0.handler }
      
      DispatchQueue.main.async {
        for handler in liveHandlers {
          handler.didChange()
        }
      }
    }
  }
}

// MARK: - Usage Examples

/*
// Usage Option 1: Direct Observer (your current approach)
let observer = MusicLibraryObserver(handler: self)
// Observer automatically starts and stops in init/deinit

// Usage Option 2: Singleton Notifier (better for multiple observers)
let handlerID = MusicLibraryChangeNotifier.shared.addHandler(self)
// Later: MusicLibraryChangeNotifier.shared.removeHandler(withId: handlerID)
*/
