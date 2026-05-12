import UIKit
import Capacitor

/// Subclass of CAPBridgeViewController so we can register app-embedded
/// Capacitor plugins (NativeNotificationsPlugin) before the bridge loads.
class BluTaskBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginType(NativeNotificationsPlugin.self)
    }
}
