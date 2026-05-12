import UIKit
import Capacitor

/// CAPBridgeViewController subclass — required because Main.storyboard references
/// this class name as the root view controller's customClass.
@objc(BluTaskBridgeViewController)
public class BluTaskBridgeViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BluTaskNotificationsPlugin())
    }
}
