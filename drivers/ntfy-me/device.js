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

  async sendFlowMessage(args) {
    const flowName = typeof args.flow_name === 'string' ? args.flow_name.trim() : '';
    const payload = {
      topic: 'homey-flow',
      msg: args.message,
    };

    if (flowName) {
      payload.flow = flowName;
    }

    await this.sendMessage(JSON.stringify(payload));
  }

  async sendImage(image, message) {
    const homeyImage = this.#normalizeImage(image);
    if (!homeyImage) {
      throw new Error('No image provided');
    }

    const rawMessage = typeof message === 'string' ? message.trim() : '';

    const { buffer } = await this.#readImageBuffer(homeyImage);
    if (!buffer.length) {
      throw new Error('Image data is empty');
    }

    let payload = {
      topic: 'homey-image',
      image: buffer.toString('base64'),
    };

    if (rawMessage) {
      if (this.#isJsonString(rawMessage)) {
        try {
          const parsedMessage = JSON.parse(rawMessage);
          if (parsedMessage && typeof parsedMessage === 'object' && !Array.isArray(parsedMessage)) {
            payload = {
              ...payload,
              ...parsedMessage,
            };
          } else {
            payload.msg = rawMessage;
          }
        } catch (error) {
          payload.msg = rawMessage;
        }
      } else {
        payload.msg = rawMessage;
      }
    }

    await this.sendMessage(JSON.stringify(payload));
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

  #normalizeImage(image) {
    if (!image) {
      return null;
    }

    if (typeof image.getStream === 'function') {
      return image;
    }

    if (image.image && typeof image.image.getStream === 'function') {
      return image.image;
    }

    if (image.value && typeof image.value.getStream === 'function') {
      return image.value;
    }

    return null;
  }

  async #readImageBuffer(image) {
    const stream = await image.getStream();
    const chunks = [];

    await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    return {
      buffer: Buffer.concat(chunks),
      metadata: {
        filename: stream.filename,
        contentType: stream.contentType,
        contentLength: stream.contentLength,
      },
    };
  }

};
