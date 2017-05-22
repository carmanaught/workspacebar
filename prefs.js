const GdkPixbuf = imports.gi.GdkPixbuf;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Pango = imports.gi.Pango;

const Gettext = imports.gettext.domain('markbokil.com-extensions;');
const _ = Gettext.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Keys = Me.imports.keys;

const _N = function(x) { return x; }

const positions = [
        "left",
        "center",
        "right"];

function init() {
    Convenience.initTranslations();
}

const WorkspaceBarSettings = new GObject.Class({
    Name: 'WorkspaceBarPrefs',
    Extends: Gtk.Grid,
    
    _init: function(params) {
        this._window = new Gtk.ApplicationWindow({
            window_position: Gtk.WindowPosition.CENTER,
            title: "WorkspaceBar Settings"
        });
        
        //this._grid = new Gtk.Grid();
        this.parent(params);
        this.margin = 10;
        this.column_spacing = 50;
        this.row_spacing = 10;
	    this._settings = Convenience.getSettings();

        // Start building the objects

        // Position Settings label
        let lblPosTitle = new Gtk.Label({
            label: "<b>Position Settings</b>",
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });
        // Easiest way to understand attach format:-
        //   Object, Column, Row, ColSpan, RowSpan
        this.attach(lblPosTitle, 0, 0, 2, 1);
        
        // Workspace position label
        let lblPosition = new Gtk.Label({
            label: "WorkspaceBar position",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblPosition, 0, 1, 1, 1);
        
        // Workspace position dropdown
        this.cmbPosition = new Gtk.ComboBoxText({
            halign: Gtk.Align.END
        });
        for (let i = 0; i < positions.length; i++)
            this.cmbPosition.append_text(this._capCase(positions[i]));
        this.cmbPosition.set_active(0);
        this.cmbPosition.connect ('changed', Lang.bind (this, this._onPositionChanged));
        this.attach(this.cmbPosition, 1, 1, 1, 1);
        
        // Position Index enable label
        let lblPositionEnable = new Gtk.Label({
            label: "Change the index for the bar position",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblPositionEnable, 0, 2, 1, 1);
        
        // Position Index enable switch
        let swPositionIndexEnable = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.panelPosChange),
            halign: Gtk.Align.END
        });
        swPositionIndexEnable.connect ('notify::active', Lang.bind (this, this._setIndexEnableChange));
        this.attach(swPositionIndexEnable, 1, 2, 1, 1);
                
        // Position Index label
        let lblPositionIndex = new Gtk.Label({
            label: "Specify position index",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblPositionIndex, 0, 3, 1, 1);
        
        // Position Index adjustment
        this._adjPositionIndex = new Gtk.Adjustment ({
            //Don't set value here, we'll get it after creating the spin button
            lower: -999,
            upper: 999,
            step_increment: 1,
            page_increment: 10
        });

        // Position Index spinbutton
        this.spnPosition = new Gtk.SpinButton ({
            adjustment: this._adjPositionIndex,
            halign: Gtk.Align.END
        });
        this.spnPosition.set_value (this._settings.get_int(Keys.panelPosIndex));
        this.spnPosition.set_digits (0);
        this.spnPosition.set_wrap (false);
        this.spnPosition.connect ('value-changed', Lang.bind (this, this._setPositionIndexChange));
        this.attach(this.spnPosition, 1, 3, 1, 1);
        
        // General Settings label
        let lblGenTitle = new Gtk.Label({
            label: "<b>General Settings</b>",
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });
        this.attach(lblGenTitle, 0, 4, 2, 1);
        
        // Show Overview label
        let lblOverview = new Gtk.Label({
            label: "Show overview when mousing over the workspace bar",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblOverview, 0, 5, 1, 1);
        
        // Show Overview switch
        let swOverlay = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.overviewMode),
            halign: Gtk.Align.END
        });
        swOverlay.connect ('notify::active', Lang.bind (this, this._setOverViewMode));
        this.attach(swOverlay, 1, 5, 1, 1);
        
        // Show Wrap Around label
        let lblWrapAround = new Gtk.Label({
            label: "Wrap around when scrolling over the workspace bar",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblWrapAround, 0, 6, 1, 1);

        // Show Wrap Around switch
        let swWrapAround = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.wrapAroundMode),
            halign: Gtk.Align.END
        });
        swWrapAround.connect ('notify::active', Lang.bind (this, this._setWrapAroundMode));
        this.attach(swWrapAround, 1, 6, 1, 1);
        
        // Show Empty Workspace label
        let lblEmptyWorkspace = new Gtk.Label({
            label: "Enable styling to indicate empty workspaces",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblEmptyWorkspace, 0, 7, 1, 1);
        
        // Show Empty Workspace switch
        let swEmptyWorkspace = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.emptyWorkStyle),
            halign: Gtk.Align.END
        });
        swEmptyWorkspace.connect ('notify::active', Lang.bind (this, this._setEmptyWorkspaceStyle));
        this.attach(swEmptyWorkspace, 1, 7, 1, 1);
        
        // Show Urgent Workspace label
        let lblUrgentWorkspace = new Gtk.Label({
            label: "Enable styling to indicate urgent workspaces",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblUrgentWorkspace, 0, 8, 1, 1);
        
        // Show Urgent Workspace switch
        let swUrgentWorkspace = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.urgentWorkStyle),
            halign: Gtk.Align.END
        });
        swUrgentWorkspace.connect ('notify::active', Lang.bind (this, this._setUrgentWorkspaceStyle));
        this.attach(swUrgentWorkspace, 1, 8, 1, 1);
    },
    
    _capCase: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    _onPositionChanged: function() {
        let activeItem = this.cmbPosition.get_active();
        this._settings.set_string(Keys.panelPos, positions[activeItem]);
    },
    
    _setIndexEnableChange: function(object) {
        this._settings.set_boolean(Keys.panelPosChange, object.active);
    },

    _setPositionIndexChange: function(object) {
        //Add position Index change handling
        this._settings.set_int(Keys.panelPosIndex, object.value);
    },
    
    _setOverViewMode: function(object) {
        this._settings.set_boolean(Keys.overviewMode, object.active);
    },
    
    _setWrapAroundMode: function(object) {
        this._settings.set_boolean(Keys.wrapAroundMode, object.active);
    },
    
    _setEmptyWorkspaceStyle: function(object) {
        this._settings.set_boolean(Keys.emptyWorkStyle, object.active);
    },
    
    _setUrgentWorkspaceStyle: function(object) {
        this._settings.set_boolean(Keys.urgentWorkStyle, object.active);
    },
    
    _resetSettings: function() {
        this._settings.set_string(Keys.panelPos, positions[0]);
        this._settings.set_boolean(Keys.panelPosChange, false);
        this._settings.set_int(Keys.panelPosIndex, 1);
        this._settings.set_boolean(Keys.overviewMode, false);
        this._settings.set_boolean(Keys.wrapAroundMode, true);
        this._settings.set_boolean(Keys.emptyWorkStyle, true);
        this._settings.set_boolean(Keys.urgentWorkStyle, true);
    }
});

function buildPrefsWidget() {
    let widget = new WorkspaceBarSettings();
    widget.show_all();
    
    return widget;
}
