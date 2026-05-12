import UIKit
import Capacitor

/// CAPBridgeViewController subclass — required because Main.storyboard references
/// this class name as the root view controller's customClass.
/// No custom plugins: @capacitor/local-notifications registers automatically via SPM.
@objc(BluTaskBridgeViewController)
class BluTaskBridgeViewController: CAPBridgeViewController {}
