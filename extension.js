/******************************************************************************
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

Orignal Author: Pawel Sosulski <pawel@sosulski.net>
******************************************************************************/
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GObject from 'gi://GObject';
var urltype;
var urlcgi;
var timeoutInterval;
var _httpSession;
var request1;
var request2;
var MyPopupMenuItem = GObject.registerClass({
    GTypeName: 'DesktopIcons_MyPopupMenuItem',
}, class MyPopupMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(gicon, text1,text2,text3,text4,text5,row,klasa) {
        super._init();
        if (gicon) {
            this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });
            this.icon = new St.Icon({ icon_name: gicon, style_class: 'popup-menu-icon' });
            this.box.add(this.icon);
            this.label = new St.Label({ text: text1 });
            this.box.add(this.label);
            this.add_child(this.box);
        }
        else {
            this.label = new St.Label({ text: " "+text1+" ", style_class: klasa });
            
            this.label1 = new St.Label({ text: " "+text2+" ", style_class: klasa });
            
            this.label2 = new St.Label({ text: " "+text3+" ", style_class: klasa+"_lite" });
            
            this.label3 = new St.Label({ text: " "+text4+" ", style_class: klasa+"_lite" });
            
            this.label4 = new St.Label({ text: " "+text5+" ", style_class: klasa+"_lite" });
            
            this.add_child(this.label);
            this.add_child(this.label1);
            this.add_child(this.label2);
            this.add_child(this.label3);
            this.add_child(this.label4);
        }
    }
});
const IcingaChecker = GObject.registerClass(
class IcingaChecker extends PanelMenu.Button {
    _init() {
        super._init(0);
        
        this._display();
        Main.panel.addToStatusArea('recent-items', this);
    }
    
    destroy() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        if(urltype) {
            urltype = null;
        }
        if(urlcgi){
            urlcgi = null;
        }
        if(timeoutInterval){
            timeoutInterval = null;
        }
        if(_httpSession){
            _httpSession = null;
        }
        if(request1){
            request1 = null;
        }
        if(request2){
            request2 = null;
        }
        
        super.destroy();
    }
    
    _onDestroy() {
        
    }
    
    // Panel can be moved to the bottom of the screen by extensions like Dash to Panel
    _isPanelAtBottom() {
        let panelBox = Main.layoutManager.panelBox;
        let monitor = Main.layoutManager.primaryMonitor;
        if (!panelBox || !monitor) {
            return false;
        }
        let panelY = panelBox.get_transformed_position()[1];
        return panelY > monitor.height / 2;
    }
    
    _display() {
        
        if (this.timeout) {
            //log("Kasujemy mainloop od id "+this.timeout);
            clearTimeout(this.timeout);
        }
        
        this._actions = new PopupMenu.PopupBaseMenuItem({
            reactive: true,
            can_focus: true
        });

        this._listSection = new PopupMenu.PopupMenuSection();
        this._scrollView = new St.ScrollView({
            style: `max-height: ${Math.floor(global.stage.height * 0.65)}px;`,
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            overlay_scrollbars: false,
            x_expand: true,
        });
        this._scrollView.set_child(this._listSection.actor);
        this._scrollSection = new PopupMenu.PopupMenuSection();
        this._scrollSection.actor.add_child(this._scrollView);
        
        let refreshLabel = 'Refresh';
        if (GLib.get_language_names().some(language => language.startsWith('pl'))) {
            refreshLabel = 'Odśwież';
        }
        let refreshBox = new St.BoxLayout({
            style_class: 'system-menu-action icinga-refresh-box',
        });
        refreshBox.add_child(new St.Icon({
            icon_name: 'view-refresh-symbolic',
            icon_size: 14,
            style_class: 'icinga-refresh-icon',
        }));
        refreshBox.add_child(new St.Label({ text: refreshLabel, style_class: 'icinga-refresh-label' }));
        this._actions.add_child(refreshBox);
        
        if (this._isPanelAtBottom()) {
            this.menu.addMenuItem(this._scrollSection);
            this.menu.addMenuItem(this._actions);
        }
        else {
            this.menu.addMenuItem(this._actions);
            this.menu.addMenuItem(this._scrollSection);
        }
        this._actions.connect('activate', this._redisplay.bind(this));
        
        GetDataFromIcinga(this);
    }
    
    _redisplay() {
        Icinga.menu.removeAll();
        Icinga._display();
    }
    
    _launchFile(a, b, c) {
        Gio.app_info_launch_default_for_uri(c, global.create_app_launch_context(0, -1));
    }
    
    _clearAll() {
        
    }
    
    _onNetworkStateChanged() {
        this._checkConnectionState();
    }
    
    _checkConnectionState() {
        let address = Gio.NetworkAddress.parse_uri(url, 80);
        let cancellable = Gio.Cancellable.new();
        this._oldConnected = this._connected;
        this._connected = false;
        try {
            this._network_monitor.can_reach_async(address, cancellable, this._asyncReadyCallback);
        } catch (err) {
            let title = _("Can not connect to %s").format(url);
            log(title + '\n' + err.message);
        }
    }
});

function init() {
    
}

function openURLInDefaultBrowser(url) {
    GLib.spawn_command_line_async(`xdg-open '${url}'`);
}

function GetDataFromIcinga(id,hostslines,serviceslines) {
    if (!hostslines) {
        if(Soup.MAJOR_VERSION==3) {
            _httpSession.send_and_read_async(
                request1,
                GLib.PRIORITY_DEFAULT,
                null,
                (_httpSession, result) => {
                    if (request1.get_status() === Soup.Status.OK) {
                        let lines;
                        let bytes = _httpSession.send_and_read_finish(result);
                        let decoder = new TextDecoder('utf-8');
                        let response = decoder.decode(bytes.get_data());
                        lines = response.split("\n");
                        GetDataFromIcinga(id,lines);
                    }
                }
            );
        }
        else {
            _httpSession.queue_message(request1, function(_httpSession, message) {
                let lines;
                var str;
                str = message.response_body.data;
                lines = str.split("\n");
                GetDataFromIcinga(id,lines);
            });
        }
    }
    else if (!serviceslines) {
        if(Soup.MAJOR_VERSION==3) {
            _httpSession.send_and_read_async(
                request2,
                GLib.PRIORITY_DEFAULT,
                null,
                (_httpSession, result) => {
                    if (request2.get_status() === Soup.Status.OK) {
                        let lines;
                        let bytes = _httpSession.send_and_read_finish(result);
                        let decoder = new TextDecoder('utf-8');
                        let response = decoder.decode(bytes.get_data());
                        lines = response.split("\n");
                        GetDataFromIcinga(id,hostslines,lines);
                    }
                }
            );
        }
        else {
            _httpSession.queue_message(request2, function(_httpSession, message) {
                let lines;
                var str;
                str = message.response_body.data;
                lines = str.split("\n");
                GetDataFromIcinga(id,hostslines,lines);
            });
        }
    }
    else {
        DisplayDataFromIcinga(id,hostslines,serviceslines);
    }
}

function DisplayDataFromIcinga(id,hostslines,serviceslines) {
    var CountOfHostLines;
    var CountOfServicesLines;
    var HostsDown = [];
    var HostsUnreachable = [];
    var ServicesWarning = [];
    var ServicesCritical = [];
    var CountOfHostsDown;
    var CountOfHostsUnreachable;
    var CountOfServicesWarning;
    var CountOfServicesCritical;
    
    CountOfHostLines = hostslines.length;
    CountOfServicesLines = serviceslines.length;
    
    var i;
    for(i=1;i<CountOfHostLines;i++) {
        if (!hostslines[i]) {
            continue;
        }
        else {
            let data;
            data = hostslines[i].split("';'");
            if (data[1]=="DOWN") {
                HostsDown.push(data);
            }
            else {
                HostsUnreachable.push(data);
            }
        }
    }
    
    for(i=1;i<CountOfServicesLines;i++) {
        if (!serviceslines[i]) {
            continue;
        }
        else {
            let data;
            data = serviceslines[i].split("';'");
            if (data[2]=="WARNING") {
                ServicesWarning.push(data);
            }
            else {
                ServicesCritical.push(data);
            }
        }
    }
    
    CountOfHostsDown = HostsDown.length;
    CountOfHostsUnreachable = HostsUnreachable.length;
    CountOfServicesWarning = ServicesWarning.length;
    CountOfServicesCritical = ServicesCritical.length;
    
    let klasa;
    if (CountOfHostsDown>0 || CountOfServicesCritical>0)
        klasa = "critical";
    else if (CountOfHostsUnreachable>0)
        klasa = "unreachable";
    else if (CountOfServicesWarning>0)
        klasa = "warning";
    else
        klasa = "labelOnPanel";
    
    id._statusLabel = new St.Label({ text: CountOfHostsDown+" | "+CountOfHostsUnreachable+" | "+CountOfServicesWarning+" | "+CountOfServicesCritical, style_class: klasa, y_align: Clutter.ActorAlign.CENTER});
    if (id.first_child)
        id.remove_child(id.first_child);
    id.add_child(id._statusLabel);
    
    var row=0;
    
    for(i=0;i<CountOfHostsDown;i++) {
        let menuItem = new MyPopupMenuItem(false, HostsDown[i][0].substr(1),HostsDown[i][1],HostsDown[i][3],HostsDown[i][4],HostsDown[i][5],row,"critical", {});
        id._listSection.addMenuItem(menuItem);
        let url = urltype+urlcgi+"extinfo.cgi?type=1&host="+HostsDown[i][0].substr(1);
        menuItem.connect('activate', () => { openURLInDefaultBrowser(url);});
        row++;
    }
    for(i=0;i<CountOfHostsUnreachable;i++) {
        let menuItem = new MyPopupMenuItem(false, HostsUnreachable[i][0].substr(1),HostsUnreachable[i][1],HostsUnreachable[i][3],HostsUnreachable[i][4],HostsUnreachable[i][5],row,"unreachable", {});
        id._listSection.addMenuItem(menuItem);
        let url = urltype+urlcgi+"extinfo.cgi?type=1&host="+HostsUnreachable[i][0].substr(1);
        menuItem.connect('activate', () => { openURLInDefaultBrowser(url);});
        row++;
    }
    for(i=0;i<CountOfServicesWarning;i++) {
        let menuItem = new MyPopupMenuItem(false, ServicesWarning[i][0].substr(1),ServicesWarning[i][2],ServicesWarning[i][4],ServicesWarning[i][5],ServicesWarning[i][6],row,"warning", {});
        id._listSection.addMenuItem(menuItem);
        let url = urltype+urlcgi+"extinfo.cgi?type=2&host="+ServicesWarning[i][0].substr(1)+"&service="+ServicesWarning[i][1];
        menuItem.connect('activate', () => { openURLInDefaultBrowser(url);});
        row++;
    }
    for(i=0;i<CountOfServicesCritical;i++) {
        let menuItem = new MyPopupMenuItem(false, ServicesCritical[i][0].substr(1),ServicesCritical[i][2],ServicesCritical[i][4],ServicesCritical[i][5],ServicesCritical[i][6],row,"critical", {});
        id._listSection.addMenuItem(menuItem);
        let url = urltype+urlcgi+"extinfo.cgi?type=2&host="+ServicesCritical[i][0].substr(1)+"&service="+ServicesCritical[i][1];
        menuItem.connect('activate', () => { openURLInDefaultBrowser(url);});
        row++;
    }
    
    id.timeout = setTimeout(() => { Icinga._redisplay(); }, timeoutInterval);
}

let Icinga;

export default class IcingaExtension extends Extension {
    enable() {
        let settings = this.getSettings();
        const username = settings.get_string("username");
        const password = settings.get_string("password");
        urltype = (settings.get_int("urltype")===0) ? "http://" : "https://";
        urlcgi = settings.get_string("urlcgi");
        const timeoutIntervalID = settings.get_int("timeoutinterval");
        
        switch (timeoutIntervalID) {
            case 0:
                timeoutInterval = 30000;
                break;
            case 1:
                timeoutInterval = 60000;
                break;
            case 2:
                timeoutInterval = 90000;
                break;
            case 3:
                timeoutInterval = 120000;
                break;
            case 4:
                timeoutInterval = 150000;
                break;
            case 5:
                timeoutInterval = 180000;
                break;
            case 6:
                timeoutInterval = 300000;
                break;
            case 7:
                timeoutInterval = 600000;
                break;
            default:
                timeoutInterval = 60000;
                break;
        }
        
        let url1 = urltype+username+":"+password+"@"+urlcgi+"/status.cgi?host=all&style=hostdetail&hostprops=10&hoststatustypes=12&limit=0&start=1&csvoutput";
        let url2 = urltype+username+":"+password+"@"+urlcgi+"/status.cgi?host=all&style=detail&serviceprops=10&servicestatustypes=28&limit=0&start=1&csvoutput";
        
        if(Soup.MAJOR_VERSION==3) {
            _httpSession = Soup.Session.new();
        }
        else {
            _httpSession = new Soup.SessionAsync();
            Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());
        }
        
        request1 = Soup.Message.new('GET', url1);
        request2 = Soup.Message.new('GET', url2);
        Icinga = new IcingaChecker(this);
    }

    disable() {
        clearTimeout(this.timeout);
        Icinga.destroy();
        Icinga = null;
    }
}