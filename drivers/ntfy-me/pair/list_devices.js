'use strict';

Homey.setTitle(Homey.__('add_device.title'));

Homey.emit('list_devices').then((devices) => {
  Homey.showView('add_devices', { devices });
}).catch((err) => {
  Homey.alert(err.message || err.toString(), 'error');
});
