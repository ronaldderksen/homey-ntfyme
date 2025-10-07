'use strict';

const Homey = require('homey');

module.exports = class NtfyMeDriver extends Homey.Driver {

  async onInit() {
    this.log('Ntfy me driver has been initialized');
    this.#registerFlowTokens();
    this.#registerFlowActions();
  }

  async onPair(session) {
    const devicesToAdd = this.#createPairingDevices();

    session.setHandler('list_devices', async () => devicesToAdd);

    session.setHandler('add_device', async (device) => {
      const requestedId = device?.data?.id;
      const matchingDevice = devicesToAdd.find((candidate) => candidate.data.id === requestedId);

      if (!matchingDevice) {
        throw new Error('Unknown device selection');
      }

      return matchingDevice;
    });
  }

  #createPairingDevices() {
    const existingDevices = this.getDevices();

    const usedIds = new Set();
    const usedNames = new Set();

    existingDevices.forEach((device) => {
      const data = typeof device.getData === 'function' ? device.getData() : device?.data;
      if (data?.id) {
        usedIds.add(String(data.id));
      }

      const name = typeof device.getName === 'function' ? device.getName() : device?.name;
      if (name) {
        usedNames.add(String(name));
      }
    });

    const newDevice = {
      name: this.#generateDeviceName(usedNames),
      data: {
        id: this.#generateDeviceId(usedIds),
      },
    };

    return [newDevice];
  }

  #generateDeviceId(usedIds) {
    const baseId = 'ntfy-me';
    if (!usedIds.has(baseId)) {
      return baseId;
    }

    let suffix = 2;
    let candidate = '';
    do {
      candidate = `${baseId}-${suffix}`;
      suffix += 1;
    } while (usedIds.has(candidate));

    return candidate;
  }

  #generateDeviceName(usedNames) {
    const baseName = 'Ntfy me';
    if (!usedNames.has(baseName)) {
      return baseName;
    }

    let suffix = 2;
    let candidate = '';
    do {
      candidate = `${baseName} ${suffix}`;
      suffix += 1;
    } while (usedNames.has(candidate));

    return candidate;
  }

  #registerFlowTokens() {
    const tokenId = 'build_json';

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
      title: 'Builded Message',
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

      await args.device.sendFlowMessage(args);

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

      await args.device.sendImage(imageToken, args.message);

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

      const payloadString = JSON.stringify(updatedPayload);
      await token.setValue(JSON.stringify(updatedPayload));

      return {
        build_json: payloadString,
      };
    });

    const startJsonCard = this.homey.flow.getActionCard('ntfy-me:start-json');

    startJsonCard.registerRunListener(async (args) => {
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
      const updatedPayload = {
        [key]: value,
      };

      const payloadString = JSON.stringify(updatedPayload);
      await token.setValue(JSON.stringify(updatedPayload));

      return {
        build_json: payloadString,
      };
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

      this.homey.log('Failed to read builded json token, resetting payload', error);
      return {};
    }
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

};
