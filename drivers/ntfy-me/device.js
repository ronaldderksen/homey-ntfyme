'use strict';

const https = require('https');
const Homey = require('homey');

module.exports = class NtfyMeDevice extends Homey.Device {

  async onInit() {
    this.log(`Device ${this.getName()} has been initialized`);
  }

  async sendMessage(message) {
    const rawMessage = typeof message === 'string' ? message.trim() : '';
    if (!rawMessage) {
      throw new Error('No message provided');
    }

    let payload = rawMessage;
    if (!this.#isJsonString(payload)) {
      payload = JSON.stringify({
        topic: 'homey-message',
        msg: rawMessage,
      });
    }

    await this.#sendNtfyRequest(payload);
  }

  #sendNtfyRequest(message) {
    return new Promise((resolve, reject) => {
      const body = Buffer.from(message, 'utf8');
      const headers = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': body.length,
      };

      const bearerToken = this.#getBearerToken();
      if (bearerToken) {
        headers.Authorization = `Bearer ${bearerToken}`;
      }

      const request = https.request({
        hostname: 'ntfyme.net',
        path: '/msg',
        method: 'POST',
        headers,
      }, (response) => {
        const chunks = [];

        response.on('data', (chunk) => chunks.push(chunk));

        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve();
            return;
          }

          const responseBody = Buffer.concat(chunks).toString('utf8');
          reject(new Error(`ntfy-me request failed (${response.statusCode}): ${responseBody || 'No response body'}`));
        });
      });

      request.on('error', reject);
      request.write(body);
      request.end();
    });
  }

  #getBearerToken() {
    const rawToken = this.getSetting('token');
    if (typeof rawToken !== 'string') {
      return '';
    }

    const trimmed = rawToken.trim();
    return trimmed;
  }

  #isJsonString(value) {
    if (typeof value !== 'string' || !value.trim()) {
      return false;
    }

    try {
      JSON.parse(value);
      return true;
    } catch (error) {
      return false;
    }
  }

};
