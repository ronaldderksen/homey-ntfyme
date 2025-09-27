'use strict';

const Homey = require('homey');

module.exports = class NtfyMeDriver extends Homey.Driver {

  async onInit() {
    this.log('Ntfy me driver has been initialized');
    this.#registerFlowTokens();
    this.#registerFlowActions();
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      return [
        {
          name: 'Ntfy me',
          data: {
            id: 'ntfy-me'
          }
        }
      ];
    });

    session.setHandler('add_device', async (device) => {
      return device;
    });
  }

  #registerFlowTokens() {
    const tokenId = 'json_string';

    let existingToken = null;
    try {
      existingToken = this.homey.flow.getToken(tokenId);
    } catch (error) {
      if (error?.message !== 'token_not_registered') {
        throw error;
      }
    }

    if (existingToken) {
      this.jsonStringToken = existingToken;
      return;
    }

    this.jsonStringToken = this.homey.flow.createToken(tokenId, {
      type: 'string',
      title: 'Ntfy me Message',
    });
  }

  #registerFlowActions() {
    const sendMessageCard = this.homey.flow.getActionCard('ntfy-me:send-message');

    sendMessageCard.registerRunListener(async (args) => {
      if (!args?.device) {
        throw new Error('No device available');
      }

      await args.device.sendMessage(args.message);
      return true;
    });

    const sendFlowMessageCard = this.homey.flow.getActionCard('ntfy-me:send-flow-message');

    sendFlowMessageCard.registerRunListener(async (args) => {
      if (!args?.device) {
        throw new Error('No device available');
      }

      const flowName = typeof args.flow_name === 'string' ? args.flow_name.trim() : '';
      const messagePayload = {
        topic: 'homey-flow-message',
        msg: args.message,
      };

      if (flowName) {
        messagePayload.flow = flowName;
      }

      const message = JSON.stringify(messagePayload);

      await args.device.sendMessage(message);

      return true;
    });

    const sendImageCard = this.homey.flow.getActionCard('ntfy-me:send-image');

    sendImageCard.registerRunListener(async (args) => {
      if (!args?.device) {
        throw new Error('No device available');
      }

      const imageToken = this.#getImageToken(args);
      if (!imageToken) {
        throw new Error('No image provided');
      }

      await this.#sendImage(args.device, imageToken, args.message);

      return true;
    });

    const buildJsonCard = this.homey.flow.getActionCard('ntfy-me:build-json');

    buildJsonCard.registerRunListener(async (args) => {
      if (!args?.device) {
        throw new Error('No device available');
      }

      const key = typeof args.key === 'string' ? args.key.trim() : '';
      if (!key) {
        throw new Error('No key provided');
      }

      const value = typeof args.value === 'string' ? args.value.trim() : '';
      if (!value) {
        throw new Error('No value provided');
      }

      const token = await this.#ensureJsonStringToken();

      const currentPayload = await this.#getCurrentJsonPayload(token);
      const updatedPayload = {
        ...currentPayload,
        [key]: value,
      };

      await token.setValue(JSON.stringify(updatedPayload));

      return true;
    });
  }

  async #ensureJsonStringToken() {
    if (this.jsonStringToken) {
      return this.jsonStringToken;
    }

    await this.#registerFlowTokens();
    return this.jsonStringToken;
  }

  async #getCurrentJsonPayload(token) {
    try {
      const rawValue = await token.getValue();
      if (typeof rawValue !== 'string' || !rawValue.trim()) {
        return {};
      }

      const parsed = JSON.parse(rawValue);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }

      return parsed;
    } catch (error) {
      if (error?.message === 'token_not_registered') {
        return {};
      }

      this.homey.log('Failed to read json_string token, resetting payload', error);
      return {};
    }
  }

  async #sendImage(device, image, message) {
    const homeyImage = this.#normalizeImage(image);
    if (!homeyImage) {
      throw new Error('No image provided');
    }

    const rawMessage = typeof message === 'string' ? message.trim() : '';

    const { buffer, metadata } = await this.#readImageBuffer(homeyImage);
    if (!buffer.length) {
      throw new Error('Image data is empty');
    }

    const payload = {
      topic: 'homey-image-message',
      image: buffer.toString('base64'),
    };

    if (rawMessage) {
      payload.msg = rawMessage;
    }

    await device.sendMessage(JSON.stringify(payload));
  }

  #getImageToken(args) {
    if (!args || typeof args !== 'object') {
      return null;
    }

    const candidates = [
      args.image,
      args.droptoken,
      args.tokens && args.tokens.image,
      args.imageToken,
    ];

    return candidates.find((candidate) => Boolean(candidate)) || null;
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
