const { GObject, GLib, St, Clutter } = imports.gi;
const ByteArray = imports.byteArray;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const TOGGLE_ON_ICON = 'audio-x-generic-symbolic';
const TOGGLE_OFF_ICON = 'action-unavailable-symbolic';
const TOGGLE_ON_TEXT = 'Airplay On ';
const TOGGLE_OFF_TEXT = 'Airplay Off ';

const _ = ExtensionUtils.gettext;

const AirplayToggle = GObject.registerClass(
class AirplayToggle extends PanelMenu.Button {
    _init () {
        super._init();

        const moduleStatus = getModuleStatus();
        
        const box = new St.BoxLayout();
        this._label = new St.Label({
            text: _(moduleStatus ? TOGGLE_ON_TEXT : TOGGLE_OFF_TEXT),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        this._icon = new St.Icon({
            icon_name: moduleStatus ? TOGGLE_ON_ICON : TOGGLE_OFF_ICON,
            style_class: 'system-status-icon',
        });

        box.add(this._icon);
        box.add(this._label);

        this.add_child(box);
        
        this.connect('event', this._onClicked.bind(this));
    }

    _onClicked(actor, event) {
        // Some other non-clicky event happened; bail
        if ((event.type() !== Clutter.EventType.TOUCH_BEGIN &&
             event.type() !== Clutter.EventType.BUTTON_PRESS))
            return Clutter.EVENT_PROPAGATE;

        // Check if raop-discover is enabled. If it is, disable it; if not, enable it
        if (getModuleStatus()) {
            this._icon.icon_name = TOGGLE_OFF_ICON;
            this._label.text = _(TOGGLE_OFF_TEXT);
            // Run command to disable raop-discover
            GLib.spawn_command_line_async('pactl unload-module module-raop-discover');

        } else {
            this._icon.icon_name = TOGGLE_ON_ICON;
            this._label.text = _(TOGGLE_ON_TEXT);
            // Run command to enable raop-discover
            GLib.spawn_command_line_async('pactl load-module module-raop-discover');
            
        }
    
        // Propagate the event
        return Clutter.EVENT_PROPAGATE;
    }

    destroy() {
        super.destroy();
    }

    activate(event) {
        super.activate(event);
    }
});

function init() {
    ExtensionUtils.initTranslations();
}

let _indicator;

function enable() {
    _indicator = new AirplayToggle();
    Main.panel.addToStatusArea(Me.metadata['uuid'], _indicator, 1, 'right');
  }

function disable() {
    _indicator.destroy();
    _indicator = null;
}

function getModuleStatus() {
    let env = GLib.get_environ();
    env = GLib.environ_setenv(env, "LANG", "C", true);
  
    let [result, out, err, exit_code] = GLib.spawn_sync(null, ["pactl", "list", "modules"], env, GLib.SpawnFlags.SEARCH_PATH, null);
    
    let lines = out instanceof Uint8Array ? ByteArray.toString(out).split("\n") : out.toString().split("\n");
    lines = lines.filter(line => line.includes('module-raop-discover'));
  
    return lines.length > 0;
}