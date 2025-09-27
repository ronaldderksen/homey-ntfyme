'use strict';

const Homey = require('homey');

module.exports = class NtfyMeApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Ntfy me has been initialized');
  }

};
