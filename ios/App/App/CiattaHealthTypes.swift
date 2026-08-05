import Foundation
import HealthKit

/**
 * Maps Ciatta's metric names to HealthKit types, and HealthKit samples to the
 * canonical units the server expects (see apple-health.server.ts's
 * `describe`): sleep/exercise/standing/mindful — minutes (sleep is hours,
 * see below), heart rate metrics — bpm, hrv — ms, temperatures — °C,
 * steps/flights — count, distance — km, energy — kcal, weight — kg,
 * percentages (blood oxygen, body fat) — 0-100, water — liters, blood
 * pressure — mmHg, glucose — mg/dL, VO2 max — mL/(kg·min), menstrual
 * cycle — flow level 0-3.
 *
 * `wrist_temperature` is the only metric gated behind an OS version newer
 * than this app's iOS 15 deployment target (appleSleepingWristTemperature
 * needs iOS 16+, and only produces data on Apple Watch Series 8/Ultra or
 * later) — guarded with #available so it compiles and degrades to "no data"
 * everywhere else, same as any other metric with no matching hardware.
 */
enum CiattaHealthTypes {
    /// Caps how many samples a single metric query returns, most-recent
    /// first — some metrics (heart rate off an Apple Watch) can otherwise
    /// produce tens of thousands of samples over a 30-day window.
    static let sampleLimit = 1000

    /// mL/(kg·min) — HealthKit has no single named unit for this, it's
    /// composed from base units.
    private static let vo2MaxUnit = HKUnit.literUnit(with: .milli)
        .unitDivided(by: HKUnit.gramUnit(with: .kilo).unitMultiplied(by: .minute()))
    /// mg/dL
    private static let bloodGlucoseUnit = HKUnit.gramUnit(with: .milli)
        .unitDivided(by: HKUnit.literUnit(with: .deci))

    static func readType(for metric: String) -> HKObjectType? {
        switch metric {
        case "sleep":
            return HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
        case "heart_rate":
            return HKObjectType.quantityType(forIdentifier: .heartRate)
        case "resting_heart_rate":
            return HKObjectType.quantityType(forIdentifier: .restingHeartRate)
        case "hrv":
            return HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)
        case "walking_heart_rate_average":
            return HKObjectType.quantityType(forIdentifier: .walkingHeartRateAverage)
        case "vo2_max":
            return HKObjectType.quantityType(forIdentifier: .vo2Max)
        case "respiratory_rate":
            return HKObjectType.quantityType(forIdentifier: .respiratoryRate)
        case "blood_oxygen":
            return HKObjectType.quantityType(forIdentifier: .oxygenSaturation)
        case "steps":
            return HKObjectType.quantityType(forIdentifier: .stepCount)
        case "walking_distance":
            return HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)
        case "active_energy":
            return HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)
        case "exercise_minutes":
            return HKObjectType.quantityType(forIdentifier: .appleExerciseTime)
        case "standing_time":
            return HKObjectType.quantityType(forIdentifier: .appleStandTime)
        case "flights_climbed":
            return HKObjectType.quantityType(forIdentifier: .flightsClimbed)
        case "body_weight":
            return HKObjectType.quantityType(forIdentifier: .bodyMass)
        case "body_fat_percentage":
            return HKObjectType.quantityType(forIdentifier: .bodyFatPercentage)
        case "water_intake":
            return HKObjectType.quantityType(forIdentifier: .dietaryWater)
        case "blood_pressure_systolic":
            return HKObjectType.quantityType(forIdentifier: .bloodPressureSystolic)
        case "blood_pressure_diastolic":
            return HKObjectType.quantityType(forIdentifier: .bloodPressureDiastolic)
        case "blood_glucose":
            return HKObjectType.quantityType(forIdentifier: .bloodGlucose)
        case "basal_body_temperature":
            return HKObjectType.quantityType(forIdentifier: .basalBodyTemperature)
        case "wrist_temperature":
            if #available(iOS 16.0, *) {
                return HKObjectType.quantityType(forIdentifier: .appleSleepingWristTemperature)
            }
            return nil
        case "workouts":
            return HKObjectType.workoutType()
        case "menstrual_cycle":
            return HKObjectType.categoryType(forIdentifier: .menstrualFlow)
        case "mindful_minutes":
            return HKObjectType.categoryType(forIdentifier: .mindfulSession)
        default:
            return nil
        }
    }

    static func readSamples(
        store: HKHealthStore,
        metric: String,
        since: Date,
        completion: @escaping ([[String: Any]]) -> Void
    ) {
        switch metric {
        case "sleep":
            readCategorySamples(store: store, identifier: .sleepAnalysis, since: since) { samples in
                completion(samples.compactMap { sleepSample(metric: metric, sample: $0) })
            }
        case "menstrual_cycle":
            readCategorySamples(store: store, identifier: .menstrualFlow, since: since) { samples in
                completion(samples.compactMap { menstrualFlowSample(metric: metric, sample: $0) })
            }
        case "workouts":
            readWorkouts(store: store, since: since, completion: completion)
        case "heart_rate":
            readQuantitySamples(
                store: store, identifier: .heartRate, unit: HKUnit(from: "count/min"),
                metric: metric, since: since, completion: completion)
        case "resting_heart_rate":
            readQuantitySamples(
                store: store, identifier: .restingHeartRate, unit: HKUnit(from: "count/min"),
                metric: metric, since: since, completion: completion)
        case "hrv":
            readQuantitySamples(
                store: store, identifier: .heartRateVariabilitySDNN,
                unit: HKUnit.secondUnit(with: .milli), metric: metric, since: since,
                completion: completion)
        case "steps":
            readQuantitySamples(
                store: store, identifier: .stepCount, unit: .count(), metric: metric, since: since,
                completion: completion)
        case "walking_distance":
            readQuantitySamples(
                store: store, identifier: .distanceWalkingRunning,
                unit: HKUnit.meterUnit(with: .kilo), metric: metric, since: since,
                completion: completion)
        case "active_energy":
            readQuantitySamples(
                store: store, identifier: .activeEnergyBurned, unit: .kilocalorie(),
                metric: metric, since: since, completion: completion)
        case "walking_heart_rate_average":
            readQuantitySamples(
                store: store, identifier: .walkingHeartRateAverage, unit: HKUnit(from: "count/min"),
                metric: metric, since: since, completion: completion)
        case "vo2_max":
            readQuantitySamples(
                store: store, identifier: .vo2Max, unit: vo2MaxUnit,
                metric: metric, since: since, completion: completion)
        case "respiratory_rate":
            readQuantitySamples(
                store: store, identifier: .respiratoryRate, unit: HKUnit(from: "count/min"),
                metric: metric, since: since, completion: completion)
        case "blood_oxygen":
            readQuantitySamples(
                store: store, identifier: .oxygenSaturation, unit: .percent(),
                metric: metric, since: since, completion: completion, scale: 100)
        case "exercise_minutes":
            readQuantitySamples(
                store: store, identifier: .appleExerciseTime, unit: .minute(),
                metric: metric, since: since, completion: completion)
        case "standing_time":
            readQuantitySamples(
                store: store, identifier: .appleStandTime, unit: .minute(),
                metric: metric, since: since, completion: completion)
        case "flights_climbed":
            readQuantitySamples(
                store: store, identifier: .flightsClimbed, unit: .count(),
                metric: metric, since: since, completion: completion)
        case "body_weight":
            readQuantitySamples(
                store: store, identifier: .bodyMass, unit: HKUnit.gramUnit(with: .kilo),
                metric: metric, since: since, completion: completion)
        case "body_fat_percentage":
            readQuantitySamples(
                store: store, identifier: .bodyFatPercentage, unit: .percent(),
                metric: metric, since: since, completion: completion, scale: 100)
        case "water_intake":
            readQuantitySamples(
                store: store, identifier: .dietaryWater, unit: .liter(),
                metric: metric, since: since, completion: completion)
        case "blood_pressure_systolic":
            readQuantitySamples(
                store: store, identifier: .bloodPressureSystolic, unit: .millimeterOfMercury(),
                metric: metric, since: since, completion: completion)
        case "blood_pressure_diastolic":
            readQuantitySamples(
                store: store, identifier: .bloodPressureDiastolic, unit: .millimeterOfMercury(),
                metric: metric, since: since, completion: completion)
        case "blood_glucose":
            readQuantitySamples(
                store: store, identifier: .bloodGlucose, unit: bloodGlucoseUnit,
                metric: metric, since: since, completion: completion)
        case "basal_body_temperature":
            readQuantitySamples(
                store: store, identifier: .basalBodyTemperature, unit: .degreeCelsius(),
                metric: metric, since: since, completion: completion)
        case "wrist_temperature":
            if #available(iOS 16.0, *) {
                readQuantitySamples(
                    store: store, identifier: .appleSleepingWristTemperature, unit: .degreeCelsius(),
                    metric: metric, since: since, completion: completion)
            } else {
                completion([])
            }
        case "mindful_minutes":
            readCategorySamples(store: store, identifier: .mindfulSession, since: since) { samples in
                completion(samples.compactMap { durationSample(metric: metric, sample: $0) })
            }
        default:
            completion([])
        }
    }

    // MARK: - Quantity samples (heart rate, HRV, steps, distance, energy)

    private static func readQuantitySamples(
        store: HKHealthStore,
        identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        metric: String,
        since: Date,
        completion: @escaping ([[String: Any]]) -> Void,
        // HKUnit.percent() reports a 0-1 fraction; scale: 100 turns it into
        // the 0-100 reading a person actually reads (blood oxygen, body fat).
        scale: Double = 1
    ) {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
            completion([])
            return
        }
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil, options: .strictStartDate)
        let sort = [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: sampleLimit, sortDescriptors: sort) {
            _, samples, _ in
            let quantitySamples = (samples as? [HKQuantitySample]) ?? []
            let wire = quantitySamples.map { sample -> [String: Any] in
                [
                    "metric": metric,
                    "uuid": sample.uuid.uuidString,
                    "start": iso8601(sample.startDate),
                    "end": iso8601(sample.endDate),
                    "value": sample.quantity.doubleValue(for: unit) * scale,
                ]
            }
            completion(wire)
        }
        store.execute(query)
    }

    // MARK: - Sleep

    private static func sleepSample(metric: String, sample: HKCategorySample) -> [String: Any]? {
        // "asleep" covers every asleep-stage value across OS versions
        // (asleepUnspecified/Core/Deep/REM); inBed and awake are excluded —
        // they describe time in bed, not sleep itself.
        guard isAsleepValue(sample.value) else { return nil }
        let hours = sample.endDate.timeIntervalSince(sample.startDate) / 3600
        guard hours > 0 else { return nil }
        return [
            "metric": metric,
            "uuid": sample.uuid.uuidString,
            "start": iso8601(sample.startDate),
            "end": iso8601(sample.endDate),
            "value": hours,
        ]
    }

    private static func isAsleepValue(_ raw: Int) -> Bool {
        guard let value = HKCategoryValueSleepAnalysis(rawValue: raw) else { return false }
        switch value {
        case .inBed, .awake:
            return false
        default:
            return true
        }
    }

    // MARK: - Mindful minutes

    /// A plain start/end category session with no stage filtering — unlike
    /// sleep, every mindfulSession sample counts toward the duration.
    private static func durationSample(metric: String, sample: HKCategorySample) -> [String: Any]? {
        let minutes = sample.endDate.timeIntervalSince(sample.startDate) / 60
        guard minutes > 0 else { return nil }
        return [
            "metric": metric,
            "uuid": sample.uuid.uuidString,
            "start": iso8601(sample.startDate),
            "end": iso8601(sample.endDate),
            "value": minutes,
        ]
    }

    // MARK: - Menstrual flow

    private static func menstrualFlowSample(metric: String, sample: HKCategorySample) -> [String: Any]? {
        // Server's `describe()` expects 0-3 (No flow / Light / Medium /
        // Heavy) — HealthKit's own enum doesn't align numerically, so this
        // maps explicitly rather than passing the raw value through.
        let level: Int
        switch HKCategoryValueMenstrualFlow(rawValue: sample.value) ?? .unspecified {
        case .light: level = 1
        case .medium: level = 2
        case .heavy: level = 3
        case .none: level = 0
        case .unspecified: level = 1
        @unknown default: level = 1
        }
        return [
            "metric": metric,
            "uuid": sample.uuid.uuidString,
            "start": iso8601(sample.startDate),
            "end": iso8601(sample.endDate),
            "value": level,
        ]
    }

    // MARK: - Category query helper (sleep, menstrual flow)

    private static func readCategorySamples(
        store: HKHealthStore,
        identifier: HKCategoryTypeIdentifier,
        since: Date,
        completion: @escaping ([HKCategorySample]) -> Void
    ) {
        guard let type = HKObjectType.categoryType(forIdentifier: identifier) else {
            completion([])
            return
        }
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil, options: .strictStartDate)
        let sort = [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: sampleLimit, sortDescriptors: sort) {
            _, samples, _ in
            completion((samples as? [HKCategorySample]) ?? [])
        }
        store.execute(query)
    }

    // MARK: - Workouts

    private static func readWorkouts(
        store: HKHealthStore,
        since: Date,
        completion: @escaping ([[String: Any]]) -> Void
    ) {
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil, options: .strictStartDate)
        let sort = [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        let query = HKSampleQuery(
            sampleType: .workoutType(), predicate: predicate, limit: sampleLimit, sortDescriptors: sort
        ) { _, samples, _ in
            let workouts = (samples as? [HKWorkout]) ?? []
            let wire = workouts.map { workout -> [String: Any] in
                let minutes = max(1, workout.duration / 60)
                return [
                    "metric": "workouts",
                    "uuid": workout.uuid.uuidString,
                    "start": iso8601(workout.startDate),
                    "end": iso8601(workout.endDate),
                    "value": minutes,
                    "context": ["workoutType": workoutTypeLabel(workout.workoutActivityType)],
                ]
            }
            completion(wire)
        }
        store.execute(query)
    }

    private static func workoutTypeLabel(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .running: return "Running"
        case .walking: return "Walking"
        case .cycling: return "Cycling"
        case .swimming: return "Swimming"
        case .yoga: return "Yoga"
        case .functionalStrengthTraining, .traditionalStrengthTraining: return "Strength training"
        case .highIntensityIntervalTraining: return "HIIT"
        case .coreTraining: return "Core training"
        case .pilates: return "Pilates"
        case .dance: return "Dance"
        case .hiking: return "Hiking"
        case .elliptical: return "Elliptical"
        case .rowing: return "Rowing"
        case .stairClimbing: return "Stair climbing"
        case .mindAndBody: return "Mind and body"
        default: return "Workout"
        }
    }

    private static func iso8601(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }
}
