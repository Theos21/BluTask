import Foundation
import Capacitor
import UserNotifications

@objc(BluTaskNotificationsPlugin)
public class BluTaskNotificationsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BluTaskNotificationsPlugin"
    public let jsName = "BluTaskNotifications"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermissions",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule",           returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPending",         returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel",             returnType: CAPPluginReturnPromise),
    ]

    private let center = UNUserNotificationCenter.current()

    // MARK: - Permissions

    @objc func checkPermissions(_ call: CAPPluginCall) {
        center.getNotificationSettings { settings in
            let status: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: status = "granted"
            case .denied:        status = "denied"
            case .notDetermined: status = "prompt"
            @unknown default:    status = "prompt"
            }
            call.resolve(["display": status])
        }
    }

    @objc func requestPermissions(_ call: CAPPluginCall) {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let err = error {
                call.reject(err.localizedDescription)
                return
            }
            call.resolve(["display": granted ? "granted" : "denied"])
        }
    }

    // MARK: - Schedule

    @objc func schedule(_ call: CAPPluginCall) {
        guard let rawArray = call.getArray("notifications") as? [[String: Any]], !rawArray.isEmpty else {
            call.reject("notifications array is required and must not be empty")
            return
        }

        let group = DispatchGroup()
        var scheduled: [[String: Any]] = []
        var errors: [String] = []
        let lock = NSLock()

        for n in rawArray {
            guard let id = n["id"] as? Int else { continue }

            let content = UNMutableNotificationContent()
            content.title = n["title"] as? String ?? ""
            content.body  = n["body"]  as? String ?? ""
            content.sound = .default

            guard let trigger = makeTrigger(from: n) else {
                // If we can't parse a trigger, skip silently (date in the past etc.)
                continue
            }

            let request = UNNotificationRequest(
                identifier: "blutask-\(id)",
                content: content,
                trigger: trigger
            )

            group.enter()
            center.add(request) { error in
                lock.lock()
                if let e = error {
                    errors.append("id \(id): \(e.localizedDescription)")
                } else {
                    scheduled.append(["id": id])
                }
                lock.unlock()
                group.leave()
            }
        }

        group.notify(queue: .global(qos: .utility)) {
            if scheduled.isEmpty && !errors.isEmpty {
                call.reject(errors.joined(separator: "; "))
            } else {
                if !errors.isEmpty {
                    print("[BluTaskNotif] partial schedule errors: \(errors)")
                }
                call.resolve(["notifications": scheduled])
            }
        }
    }

    // MARK: - Get pending

    @objc func getPending(_ call: CAPPluginCall) {
        center.getPendingNotificationRequests { requests in
            let notifs: [[String: Any]] = requests.compactMap { req in
                let raw = req.identifier.hasPrefix("blutask-")
                    ? String(req.identifier.dropFirst("blutask-".count))
                    : req.identifier
                guard let id = Int(raw) else { return nil }
                return ["id": id, "title": req.content.title, "body": req.content.body]
            }
            call.resolve(["notifications": notifs])
        }
    }

    // MARK: - Cancel

    @objc func cancel(_ call: CAPPluginCall) {
        guard let rawArray = call.getArray("notifications") as? [[String: Any]] else {
            call.resolve()
            return
        }
        let ids = rawArray.compactMap { n -> String? in
            guard let id = n["id"] as? Int else { return nil }
            return "blutask-\(id)"
        }
        center.removePendingNotificationRequests(withIdentifiers: ids)
        call.resolve()
    }

    // MARK: - Trigger factory

    private func makeTrigger(from notification: [String: Any]) -> UNNotificationTrigger? {
        guard let schedule = notification["schedule"] as? [String: Any] else { return nil }

        // One-shot: schedule.at (ISO string or ms number)
        if let atStr = schedule["at"] as? String {
            if let date = parseISO(atStr) {
                let interval = max(date.timeIntervalSinceNow, 1.0)
                return UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
            }
        } else if let atMs = schedule["at"] as? Double {
            let date = Date(timeIntervalSince1970: atMs / 1000.0)
            let interval = max(date.timeIntervalSinceNow, 1.0)
            return UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        }

        // Repeating: schedule.on { hour, minute }
        if let on = schedule["on"] as? [String: Any] {
            var comps = DateComponents()
            comps.hour   = on["hour"]   as? Int
            comps.minute = on["minute"] as? Int
            let repeats  = schedule["repeats"] as? Bool ?? false
            return UNCalendarNotificationTrigger(dateMatching: comps, repeats: repeats)
        }

        return nil
    }

    private func parseISO(_ str: String) -> Date? {
        let fmts: [ISO8601DateFormatter] = [
            {
                let f = ISO8601DateFormatter()
                f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                return f
            }(),
            {
                let f = ISO8601DateFormatter()
                f.formatOptions = [.withInternetDateTime]
                return f
            }(),
        ]
        for f in fmts {
            if let d = f.date(from: str) { return d }
        }
        return nil
    }
}
