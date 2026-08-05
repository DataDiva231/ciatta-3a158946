import Capacitor

/**
 * Capacitor doesn't auto-discover plugins bundled directly in the app
 * target (only ones shipped as separate packages get that) — a local
 * plugin has to be registered explicitly here, or the JS side gets
 * "plugin is not implemented on ios" the moment a method is called, even
 * though the class compiles and links fine.
 */
class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(CiattaHealthPlugin())
        bridge?.registerPluginInstance(CiattaBluetoothPlugin())
    }
}
