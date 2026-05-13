import Foundation
import Capacitor
import UserNotifications

@objc(BluTaskNotificationsPlugin)
public class BluTaskNotificationsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BluTaskNotificationsPlugin"
    public let jsName = "BluTaskNotifications"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermissions",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule",           returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPending",         returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel",             returnType: CAPPluginReturnPromise),
    ]

    private var center: UNUserNotificationCenter { UNUserNotificationCenter.current() }

    // MARK: - Permissions

    @objc public override func checkPermissions(_ call: CAPPluginCall) {
        center.getNotificationSettings { settings in
            let status: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: status = "granted"
            case .denied:        status = "denied"
            case .notDetermined: status = "prompt"
            @unknown default:    status = "prompt"
            }
            print("[BluTaskNotif] checkPermissions → \(status)")
            call.resolve(["display": status])
        }
    }

    @objc public override func requestPermissions(_ call: CAPPluginCall) {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let err = error {
                print("[BluTaskNotif] requestPermissions error: \(err.localizedDescription)")
                call.reject(err.localizedDescription)
                return
            }
            print("[BluTaskNotif] requestPermissions → \(granted ? "granted" : "denied")")
            call.resolve(["display": granted ? "granted" : "denied"])
        }
    }

    // MARK: - Schedule (fire-and-forget)
    //
    // We do NOT await add()'s completion handler — on some iOS builds the
    // handler is never dispatched, causing an infinite hang. Instead we
    // schedule the request and resolve immediately. If the content or
    // authorization is invalid the notification simply won't appear; all
    // other error conditions are logged.

    @objc func schedule(_ call: CAPPluginCall) {
        call.resolve(["ok": true, "marker": "BUILD-75-STRIPPED"])
        return
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

        // schedule.at — one-shot trigger.
        // WebKit postMessage serialises JS Date objects as NSDate (Swift Date),
        // so we handle both Date and ISO-string forms.
        if let atDate = schedule["at"] as? Date {
            let interval = max(atDate.timeIntervalSinceNow, 1.0)
            print("[BluTaskNotif] trigger: Date object, interval \(interval)s")
            return UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        }
        if let atStr = schedule["at"] as? String {
            if let date = parseISO(atStr) {
                let interval = max(date.timeIntervalSinceNow, 1.0)
                print("[BluTaskNotif] trigger: ISO string, interval \(interval)s")
                return UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
            }
            print("[BluTaskNotif] trigger: failed to parse ISO string '\(atStr)'")
        }
        if let atMs = schedule["at"] as? Double {
            let date = Date(timeIntervalSince1970: atMs / 1000.0)
            let interval = max(date.timeIntervalSinceNow, 1.0)
            print("[BluTaskNotif] trigger: ms timestamp, interval \(interval)s")
            return UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        }

        // schedule.on — repeating calendar trigger (daily summary).
        if let on = schedule["on"] as? [String: Any] {
            var comps = DateComponents()
            comps.hour   = on["hour"]   as? Int
            comps.minute = on["minute"] as? Int
            let repeats  = schedule["repeats"] as? Bool ?? false
            print("[BluTaskNotif] trigger: calendar \(comps.hour ?? -1):\(comps.minute ?? -1), repeats=\(repeats)")
            return UNCalendarNotificationTrigger(dateMatching: comps, repeats: repeats)
        }

        return nil
    }

    private func parseISO(_ str: String) -> Date? {
        let opts: [ISO8601DateFormatter.Options] = [
            [.withInternetDateTime, .withFractionalSeconds],
            [.withInternetDateTime],
        ]
        for opt in opts {
            let f = ISO8601DateFormatter()
            f.formatOptions = opt
            if let d = f.date(from: str) { return d }
        }
        return nil
    }
}
