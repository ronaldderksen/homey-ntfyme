'use strict';

Homey.setTitle(Homey.__('add_device.title'));

Homey.on('showView', (viewId, data) => {
  if (viewId !== 'add_devices') return;

  const container = document.getElementById('devices');
  container.innerHTML = '';

  (data?.devices || []).forEach((device) => {
    const button = document.createElement('button');
    button.innerText = device.name;
    button.onclick = () => {
      Homey.emit('add_device', device).then(() => {
        Homey.nextView();
      }).catch((err) => {
        Homey.alert(err.message || err.toString(), 'error');
      });
    };

    container.appendChild(button);
  });
});
