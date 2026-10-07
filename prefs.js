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

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class IcingaCheckerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();
    
        const page = new Adw.PreferencesPage();

        const group = new Adw.PreferencesGroup({
            title: _('Properties'),
        });
        page.add(group);
        
        let username = new Adw.EntryRow({
            title: _('Username'),
            text: window._settings.get_string("username")
        });
        group.add(username);
        
        let password = new Adw.PasswordEntryRow({
            title: _('Password'),
            text: window._settings.get_string("password")
        });
        group.add(password);
        
        let urlcgi = new Adw.EntryRow({
            title: _('URL CGI (without http:// or https://)'),
            text: window._settings.get_string("urlcgi")
        });
        group.add(urlcgi);
        
        let urltypes = new Gtk.StringList();
        urltypes.append('HTTP');
        urltypes.append('HTTPS');
        let urltype = new Adw.ComboRow({
            title: _('Protocol'),
            model: urltypes,
        });
        group.add(urltype);
        
        let intervals = new Gtk.StringList();
        intervals.append('30s');
        intervals.append('60s');
        intervals.append('90s');
        intervals.append('120s');
        intervals.append('150s');
        intervals.append('180s');
        intervals.append('300s');
        intervals.append('600s');
        let timeoutinterval = new Adw.ComboRow({
            title: _('Time interval (refresh time)'),
            model: intervals,
        });
        group.add(timeoutinterval);
        
        window.add(page);
        
        window._settings.bind('username', username, 'text', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('password', password, 'text', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('urlcgi', urlcgi, 'text', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('urltype', urltype, 'selected', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('timeoutinterval', timeoutinterval, 'selected', Gio.SettingsBindFlags.DEFAULT);
    }
}