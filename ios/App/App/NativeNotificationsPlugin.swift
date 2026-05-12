import Foundation
import Capacitor
import UserNotifications

/// Direct wrapper around Apple's UserNotifications framework, exposed to
/// the Capacitor JS bridge as "NativeNotifications".
@objc(NativeNotificationsPlugin)
public class NativeNotificationsPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier  = "NativeNotificationsPlugin"
    public let jsName      = "NativeNotifications"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule",          returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel",            returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPending",        returnType: CAPPluginReturnPromise),
    ]

    private var center: UNUserNotificationCenter { .current() }

    // ── checkPermission ───────────────────────────────────────────────────────

    /// Returns { status: "granted" | "denied" | "prompt" }
    @objc func checkPermission(_ call: CAPPluginCall) {
        center.getNotificationSettings { settings in
            let status: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                status = "granted"
            case .denied:
                status = "denied"
            case .notDetermined:
                status = "prompt"
            @unknown default:
                status = "prompt"
            }
            call.resolve(["status": status])
        }
    }

    // ── requestPermission ─────────────────────────────────────────────────────

    /// Invokes UNUserNotificationCenter.requestAuthorization with .alert/.sound/.badge.
    /// Returns { granted: Bool }
    @objc func requestPermission(_ call: CAPPluginCall) {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            call.resolve(["granted": granted])
        }
    }

    // ── schedule ──────────────────────────────────────────────────────────────

    /// Expects { notifications: [{ id, title, body, scheduledAt? , repeating?, hour?, minute? }] }
    /// Uses UNCalendarNotificationTrigger for both one-shot and repeating (daily summary).
    @objc func schedule(_ call: CAPPluginCall) {
        guard let notifications = call.getArray("notifications") as? [[String: Any]] else {
            call.reject("Missing notifications array")
            return
        }

        let group = DispatchGroup()
        var errors: [String] = []

        for notif in notifications {
            guard let id = notif["id"] as? Int else { continue }

            let content       = UNMutableNotificationContent()
            content.title     = notif["title"] as? String ?? ""
            content.body      = notif["body"]  as? String ?? ""
            content.sound     = .default

            let trigger: UNNotificationTrigger

            let isRepeating = notif["repeating"] as? Bool ?? false
            if isRepeating,
               let hour   = notif["hour"]   as? Int,
               let minute = notif["minute"] as? Int {
                // Daily repeating notification — UNCalendarNotificationTrigger repeats: true
                var dc    = DateComponents()
                dc.hour   = hour
                dc.minute = minute
                trigger   = UNCalendarNotificationTrigger(dateMatching: dc, repeats: true)
            } else if let scheduledAt = notif["scheduledAt"] as? Double {
                // One-shot at a specific time (milliseconds since epoch)
                let fireDate = Date(timeIntervalSince1970: scheduledAt / 1_000.0)
                guard fireDate > Date() else { continue }
                let dc   = Calendar.current.dateComponents(
                    [.year, .month, .day, .hour, .minute, .second],
                    from: fireDate
                )
                trigger  = UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
            } else {
                continue
            }

            let request = UNNotificationRequest(
                identifier: String(id),
                content:    content,
                trigger:    trigger
            )

            group.enter()
            center.add(request) { error in
                if let e = error {
                    errors.append("\(id): \(e.localizedDescription)")
                }
                group.leave()
            }
        }

        group.notify(queue: .main) {
            errors.isEmpty
                ? call.resolve()
                : call.reject(errors.joined(separator: "; "))
        }
    }

    // ── cancel ────────────────────────────────────────────────────────────────

    /// Expects { ids: [String] }
    @objc func cancel(_ call: CAPPluginCall) {
        guard let ids = call.getArray("ids") as? [String] else {
            call.reject("Missing ids array")
            return
        }
        center.removePendingNotificationRequests(withIdentifiers: ids)
        call.resolve()
    }

    // ── getPending ────────────────────────────────────────────────────────────

    /// Returns { ids: [String] }
    @objc func getPending(_ call: CAPPluginCall) {
        center.getPendingNotificationRequests { requests in
            call.resolve(["ids": requests.map { $0.identifier }])
        }
    }
}
