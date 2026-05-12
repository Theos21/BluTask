import Foundation
import Capacitor
import UserNotifications

/// Direct wrapper around Apple's UserNotifications framework.
/// Exposed to the Capacitor JS bridge as "NativeNotifications".
@objc(NativeNotificationsPlugin)
public class NativeNotificationsPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier    = "NativeNotificationsPlugin"
    public let jsName        = "NativeNotifications"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule",          returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel",            returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPending",        returnType: CAPPluginReturnPromise),
    ]

    private var center: UNUserNotificationCenter { .current() }

    // ── checkPermission ───────────────────────────────────────────────────────
    // Returns { display: "granted" | "denied" | "prompt" }

    @objc func checkPermission(_ call: CAPPluginCall) {
        NSLog("[NativeNotif] checkPermission: requesting settings")
        center.getNotificationSettings { settings in
            let display: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: display = "granted"
            case .denied:                               display = "denied"
            case .notDetermined:                        display = "prompt"
            @unknown default:                           display = "prompt"
            }
            NSLog("[NativeNotif] checkPermission: display=%@", display)
            // resolve() → evaluateJavaScript on WKWebView — must be main thread
            DispatchQueue.main.async { call.resolve(["display": display]) }
        }
    }

    // ── requestPermission ─────────────────────────────────────────────────────
    // Returns { display: "granted" | "denied" }

    @objc func requestPermission(_ call: CAPPluginCall) {
        NSLog("[NativeNotif] requestPermission: calling requestAuthorization")
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                NSLog("[NativeNotif] requestPermission error: %@", error.localizedDescription)
                DispatchQueue.main.async { call.reject(error.localizedDescription) }
                return
            }
            let display = granted ? "granted" : "denied"
            NSLog("[NativeNotif] requestPermission: display=%@", display)
            DispatchQueue.main.async { call.resolve(["display": display]) }
        }
    }

    // ── schedule ──────────────────────────────────────────────────────────────
    // Expects: { notifications: [{ id, title, body, scheduledAt? , repeating?, hour?, minute? }] }
    //
    // One-shot:  { id, title, body, scheduledAt: <ms since epoch> }
    //   → Apple exact pattern: UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
    //
    // Repeating: { id, title, body, repeating: true, hour: H, minute: M }
    //   → UNCalendarNotificationTrigger(dateMatching: components, repeats: true)

    @objc func schedule(_ call: CAPPluginCall) {
        guard let notifications = call.getArray("notifications") as? [[String: Any]] else {
            NSLog("[NativeNotif] schedule: missing notifications array")
            call.reject("Missing notifications array")
            return
        }

        NSLog("[NativeNotif] schedule: received %d notification(s)", notifications.count)

        let group    = DispatchGroup()
        var errors   = [String]()
        var queued   = 0

        for notif in notifications {
            // Capacitor bridge delivers all JS numbers as Double
            let id: Int
            if let i = notif["id"] as? Int         { id = i }
            else if let d = notif["id"] as? Double  { id = Int(d) }
            else {
                NSLog("[NativeNotif] schedule: skipping entry — invalid/missing id")
                continue
            }

            let title = notif["title"] as? String ?? ""
            let body  = notif["body"]  as? String ?? ""

            let content       = UNMutableNotificationContent()
            content.title     = title
            content.body      = body
            content.sound     = .default

            let identifier    = String(id)
            let isRepeating   = notif["repeating"] as? Bool ?? false

            let trigger: UNNotificationTrigger

            if isRepeating {
                let hour: Int
                let minute: Int
                if let i = notif["hour"] as? Int          { hour = i }
                else if let d = notif["hour"] as? Double  { hour = Int(d) }
                else {
                    NSLog("[NativeNotif] schedule id=%d: missing hour — skipping", id)
                    continue
                }
                if let i = notif["minute"] as? Int          { minute = i }
                else if let d = notif["minute"] as? Double  { minute = Int(d) }
                else {
                    NSLog("[NativeNotif] schedule id=%d: missing minute — skipping", id)
                    continue
                }
                var dc    = DateComponents()
                dc.hour   = hour
                dc.minute = minute
                trigger   = UNCalendarNotificationTrigger(dateMatching: dc, repeats: true)
                NSLog("[NativeNotif] schedule id=%d: daily at %02d:%02d", id, hour, minute)

            } else if let scheduledAt = notif["scheduledAt"] as? Double {
                let fireDate = Date(timeIntervalSince1970: scheduledAt / 1_000.0)
                let interval = fireDate.timeIntervalSinceNow
                NSLog("[NativeNotif] schedule id=%d: scheduledAt=%.0f, fireDate=%@, interval=%.1fs",
                      id, scheduledAt, fireDate.description, interval)
                guard interval > 0.5 else {
                    NSLog("[NativeNotif] schedule id=%d: in the past (interval=%.1fs) — skipping", id, interval)
                    continue
                }
                // Apple's exact documentation pattern: UNTimeIntervalNotificationTrigger
                trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)

            } else {
                NSLog("[NativeNotif] schedule id=%d: no scheduledAt and not repeating — skipping", id)
                continue
            }

            let request = UNNotificationRequest(
                identifier: identifier,
                content:    content,
                trigger:    trigger
            )

            NSLog("[NativeNotif] schedule id=%d: calling center.add() — title=\"%@\"", id, title)
            queued += 1
            group.enter()
            center.add(request) { error in
                if let e = error {
                    NSLog("[NativeNotif] schedule id=%d: center.add FAILED: %@", id, e.localizedDescription)
                    errors.append("\(id): \(e.localizedDescription)")
                } else {
                    NSLog("[NativeNotif] schedule id=%d: center.add SUCCESS", id)
                }
                group.leave()
            }
        }

        if queued == 0 {
            NSLog("[NativeNotif] schedule: no notifications queued (all past or invalid)")
            DispatchQueue.main.async { call.resolve() }
            return
        }

        group.notify(queue: .main) {
            if errors.isEmpty {
                NSLog("[NativeNotif] schedule: all %d notification(s) scheduled OK", queued)
                call.resolve()
            } else {
                NSLog("[NativeNotif] schedule: completed with %d error(s): %@", errors.count, errors.joined(separator: "; "))
                call.reject(errors.joined(separator: "; "))
            }
        }
    }

    // ── cancel ────────────────────────────────────────────────────────────────
    // Expects: { ids: [String] }

    @objc func cancel(_ call: CAPPluginCall) {
        guard let ids = call.getArray("ids") as? [String] else {
            call.reject("Missing ids array")
            return
        }
        NSLog("[NativeNotif] cancel: removing %d id(s): %@", ids.count, ids.joined(separator: ", "))
        center.removePendingNotificationRequests(withIdentifiers: ids)
        DispatchQueue.main.async { call.resolve() }
    }

    // ── getPending ────────────────────────────────────────────────────────────
    // Returns: { ids: [String] }

    @objc func getPending(_ call: CAPPluginCall) {
        center.getPendingNotificationRequests { requests in
            let ids = requests.map { $0.identifier }
            NSLog("[NativeNotif] getPending: %d pending notification(s)", ids.count)
            DispatchQueue.main.async { call.resolve(["ids": ids]) }
        }
    }
}
