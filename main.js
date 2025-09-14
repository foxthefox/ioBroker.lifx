'use strict';

/*
 * Created with @iobroker/create-adapter v2.0.2
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");
const LifxClient = require('lifx-lan-client').Client;
const client = new LifxClient();
let lifxTimeout;

class Lifx extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options] - options
     */
    constructor(options) {
        super({
            ...options,
            name: 'lifx',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
        client.on('light-new', async light => {
            this.log.info('New light found.');
            this.log.info(`ID: ${light.id}`);
            this.log.info(`IP: ${light.address}:${light.port}`);
            light.getHardwareVersion(async (err, info) => {
                if (err) {
                    this.log.error(`Failed calling getHardwareVersion :${err}`);
                } else {
                    light.getState(async (err, state) => {
                        if (err) {
                            this.log.debug(`Failed calling getState :${err}`);
                        } else {
                            await this.createBasic(
                                light.id,
                                state.label || 'no label',
                                info.productFeatures.temperature_range[0],
                                info.productFeatures.temperature_range[1],
                            );

                            this.log.info(`Vendor: ${info.vendorName}`);
                            this.log.info(`Product: ${info.productName}`);
                            this.log.info(`Features:${JSON.stringify(info.productFeatures)}\n`);
                            this.log.info(`Label: ${state.label}`);
                            this.log.info(`Power: ${state.power == 1 ? 'on' : 'off'}`);

                            await this.setStateAsync(`Bulb_${light.id}.vendor`, {
                                val: info.vendorName,
                                ack: true,
                            });
                            await this.setStateAsync(`Bulb_${light.id}.product`, {
                                val: info.productName,
                                ack: true,
                            });
                            await this.setStateAsync(`Bulb_${light.id}.version`, {
                                val: info.version,
                                ack: true,
                            });
                            await this.setStateAsync(`Bulb_${light.id}.colorLamp`, {
                                val: info.productFeatures.color,
                                ack: true,
                            });
                            await this.setStateAsync(`Bulb_${light.id}.infraredLamp`, {
                                val: info.productFeatures.infrared,
                                ack: true,
                            });
                            await this.setStateAsync(`Bulb_${light.id}.multizoneLamp`, {
                                val: info.productFeatures.multizone,
                                ack: true,
                            });

                            await this.setStateAsync(`Bulb_${light.id}.label`, {
                                val: state.label,
                                ack: true,
                            });
                            const convertPower = state.power == 1 ? true : false;
                            await this.setStateAsync(`Bulb_${light.id}.state`, {
                                val: convertPower,
                                ack: true,
                            });
                            await this.setStateAsync(`Bulb_${light.id}.duration`, {
                                val: 500,
                                ack: true,
                            });
                            await this.setStateAsync(`Bulb_${light.id}.bright`, {
                                val: state.color.brightness,
                                ack: true,
                            });
                            await this.setStateAsync(`Bulb_${light.id}.temp`, {
                                val: state.color.kelvin,
                                ack: true,
                            });
                            await this.setStateAsync(`Bulb_${light.id}.online`, {
                                val: true,
                                ack: true,
                            }); // because we found the lamp
                        }
                        if (info.productFeatures.color) {
                            await this.createColor(light.id);
                            light.getState(async (err, state) => {
                                if (err) {
                                    this.log.debug(err);
                                } else {
                                    await this.setStateAsync(`Bulb_${light.id}.hue`, {
                                        val: state.color.hue,
                                        ack: true,
                                    });
                                    await this.setStateAsync(`Bulb_${light.id}.sat`, {
                                        val: state.color.saturation,
                                        ack: true,
                                    });
                                    await this.setStateAsync(`Bulb_${light.id}.colormode`, {
                                        val: 'white',
                                        ack: true,
                                    }); // initial setting to white
                                }
                            });
                        }
                        if (info.productFeatures.multizone) {
                            light.getColorZones(0, 255, async (err, mz) => {
                                if (err) {
                                    this.log.debug(err);
                                } else {
                                    const mquery = mz.count / 8; //je Antwort sind 8 Zonen übermittelt mz.count enthält die Anzahl der Zonen
                                    for (let z = 0; z < mz.count; z++) {
                                        await this.createZone(light.id, z);
                                    }
                                    for (let i = 0; i < mquery; i++) {
                                        light.getColorZones(i * 8, 7 + i * 8, async (err, multiz) => {
                                            if (err) {
                                                this.log.debug(err);
                                            } else {
                                                this.log.info(`Multizzone: ${JSON.stringify(multiz)}`);
                                                for (let j = 0; j < 8; j++) {
                                                    await this.setStateAsync(
                                                        `Bulb_${light.id}.zone_${parseInt(j + multiz.index)}.hue`,
                                                        { val: multiz.color[j].hue, ack: true },
                                                    );
                                                    await this.setStateAsync(
                                                        `Bulb_${light.id}.zone_${parseInt(j + multiz.index)}.sat`,
                                                        { val: multiz.color[j].saturation, ack: true },
                                                    );
                                                    await this.setStateAsync(
                                                        `Bulb_${light.id}.zone_${parseInt(j + multiz.index)}.bright`,
                                                        { val: multiz.color[j].brightness, ack: true },
                                                    );
                                                    await this.setStateAsync(
                                                        `Bulb_${light.id}.zone_${parseInt(j + multiz.index)}.temp`,
                                                        { val: multiz.color[j].kelvin, ack: true },
                                                    );
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
            });
            // if multzone the create zones and their colors, and start/end zone index
        });

        client.on('light-online', async light => {
            this.log.info(`Light back online. ID:${light.id}, IP:${light.address}:${light.port}\n`);
            await this.setStateAsync(`Bulb_${light.id}.online`, {
                val: true,
                ack: true,
            });
        });

        client.on('light-offline', async light => {
            this.log.info(`Light offline. ID:${light.id}, IP:${light.address}:${light.port}\n`);
            await this.setStateAsync(`Bulb_${light.id}.online`, {
                val: false,
                ack: true,
            });
        });

        client.on('listening', () => {
            const address = client.address();
            this.log.info(`Started LIFX listening on ${address.address}:${address.port}\n`);
        });
        client.init({ debug: true }, () => {
            this.log.info('Client started');
        });

        this.pollLifxData();

        this.subscribeStates('*');
    }

    async pollLifxData() {
        const lifx_interval = this.config.lifx_interval || 30;
        await this.updateDevices();
        this.log.debug('polling! lifx is alive');
        lifxTimeout = setTimeout(() => {
            this.pollLifxData();
        }, lifx_interval * 1000);
    }
    async updateDevices() {
        client.lights().forEach(async light => {
            light.getState(async (err, info) => {
                if (err) {
                    this.log.debug(`Failed cyclic update for ${light.id}`);
                } else {
                    await this.setStateAsync(`Bulb_${light.id}.label`, {
                        val: info.label,
                        ack: true,
                    });
                    const convertPower = info.power == 1 ? true : false;
                    await this.setStateAsync(`Bulb_${light.id}.state`, {
                        val: convertPower,
                        ack: true,
                    });
                    await this.setStateAsync(`Bulb_${light.id}.hue`, {
                        val: info.color.hue,
                        ack: true,
                    });
                    await this.setStateAsync(`Bulb_${light.id}.sat`, {
                        val: info.color.saturation,
                        ack: true,
                    });
                    await this.setStateAsync(`Bulb_${light.id}.bright`, {
                        val: info.color.brightness,
                        ack: true,
                    });
                    await this.setStateAsync(`Bulb_${light.id}.temp`, {
                        val: info.color.kelvin,
                        ack: true,
                    });
                }
            });
            light.getHardwareVersion(async (err, info) => {
                if (err) {
                    this.log.debug(`Failed cyclic HW Ver. update for ${light.id} : ${err}`);
                } else if (info.productFeatures.multizone) {
                    light.getColorZones(0, 255, async (err, mz) => {
                        if (err) {
                            this.log.debug(`Failed cyclic Color Zones update for ${light.id} : ${err}`);
                        } else {
                            const mquery = mz.count / 8; //je Antwort sind 8 Zonen übermittelt mz.count enthält die Anzahl der Zonen
                            for (let i = 0; i < mquery; i++) {
                                light.getColorZones(i * 8, 7 + i * 8, async (err, multiz) => {
                                    if (err) {
                                        this.log.debug(`Failed cyclic Color Zones >8 update for ${light.id} : ${err}`);
                                    } else {
                                        this.log.silly(`Multizzone: ${JSON.stringify(multiz)}`);
                                        for (let j = 0; j < 8; j++) {
                                            await this.setStateAsync(
                                                `Bulb_${light.id}.zone_${parseInt(j + multiz.index)}.hue`,
                                                { val: multiz.color[j].hue, ack: true },
                                            );
                                            await this.setStateAsync(
                                                `Bulb_${light.id}.zone_${parseInt(j + multiz.index)}.sat`,
                                                { val: multiz.color[j].saturation, ack: true },
                                            );
                                            await this.setStateAsync(
                                                `Bulb_${light.id}.zone_${parseInt(j + multiz.index)}.bright`,
                                                { val: multiz.color[j].brightness, ack: true },
                                            );
                                            await this.setStateAsync(
                                                `Bulb_${light.id}.zone_${parseInt(j + multiz.index)}.temp`,
                                                { val: multiz.color[j].kelvin, ack: true },
                                            );
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            });
        });
    }
    async createBasic(id, label, minK, maxK) {
        await this.setObjectNotExistsAsync(`Bulb_${id}`, {
            type: 'channel',
            common: {
                name: `LifxBulb ${label}`,
                role: 'light.color.rgbw', //andere Rolle?
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.label`, {
            type: 'state',
            common: {
                name: 'Label',
                type: 'string',
                role: 'info.name',
                read: true,
                write: false,
                desc: 'Label',
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.vendor`, {
            type: 'state',
            common: {
                name: 'Vendor',
                type: 'string',
                role: 'text',
                read: true,
                write: false,
                desc: 'Vendor',
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.product`, {
            type: 'state',
            common: {
                name: 'Product',
                type: 'string',
                role: 'text',
                read: true,
                write: false,
                desc: 'product',
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.version`, {
            type: 'state',
            common: {
                name: 'Version',
                type: 'string',
                role: 'text',
                read: true,
                write: false,
                desc: 'Version',
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.colorLamp`, {
            type: 'state',
            common: {
                name: 'color lamp',
                type: 'string',
                role: 'text',
                read: true,
                write: false,
                desc: 'color Lamp',
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.infraredLamp`, {
            type: 'state',
            common: {
                name: 'infrared lamp',
                type: 'string',
                role: 'text',
                read: true,
                write: false,
                desc: 'infrared lamp',
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.multizoneLamp`, {
            type: 'state',
            common: {
                name: 'multizoneLamp',
                type: 'string',
                role: 'text',
                read: true,
                write: false,
                desc: 'multizoneLamp',
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.state`, {
            type: 'state',
            common: {
                name: 'Licht Ein/Aus',
                type: 'boolean',
                role: 'light.switch',
                read: true,
                write: true,
                desc: 'Licht Ein/Aus',
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.duration`, {
            type: 'state',
            common: {
                name: 'Licht Aenderungsgeschwindigkeit ms',
                type: 'number',
                role: 'level.color.dur',
                read: true,
                write: true,
                desc: 'Licht Aenderungsgeschwindigkeit ms',
                min: 0,
                max: 100000,
                unit: 'ms',
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.bright`, {
            type: 'state',
            common: {
                name: 'Licht Helligkeit',
                type: 'number',
                role: 'level.color.bri',
                read: true,
                write: true,
                desc: 'Licht Helligkeit',
                min: 0,
                max: 100,
            },
            native: {},
        });
        //min, max anhand von getFeatures "temperature_range":[1500,4000] einstellen
        await this.setObjectNotExistsAsync(`Bulb_${id}.temp`, {
            type: 'state',
            common: {
                name: 'Licht Farbtemp',
                type: 'number',
                role: 'level.color.temp',
                read: true,
                write: true,
                desc: 'Licht Farbtemp',
                min: minK,
                max: maxK,
                unit: 'Kelvin',
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.online`, {
            type: 'state',
            common: {
                name: 'Licht Erreichbar',
                type: 'boolean',
                role: 'indicator.reachable',
                read: true,
                write: true,
                desc: 'Licht erreichbar',
            },
            native: {},
        });
    }
    async createColor(id) {
        await this.setObjectNotExistsAsync(`Bulb_${id}.hue`, {
            type: 'state',
            common: {
                name: 'Licht Farbe',
                type: 'number',
                role: 'level.color.hue',
                read: true,
                write: true,
                desc: 'Licht Farbe',
                min: 0,
                max: 360,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.sat`, {
            type: 'state',
            common: {
                name: 'Licht Sättigung',
                type: 'number',
                role: 'level.color.sat',
                read: true,
                write: true,
                desc: 'Licht Sättigung',
                min: 0,
                max: 100,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.colormode`, {
            type: 'state',
            common: {
                name: 'Licht Colormode',
                type: 'string',
                role: 'indicator.colormode',
                read: true,
                write: true,
                desc: 'Licht Colormode',
            },
            native: {},
        });
    }
    async createZone(id, zone) {
        await this.setObjectNotExistsAsync(`Bulb_${id}.zone_${zone}.hue`, {
            type: 'state',
            common: {
                name: 'Licht Farbe',
                type: 'number',
                role: 'level.color.hue',
                read: true,
                write: true,
                desc: 'Licht Farbe',
                min: 0,
                max: 360,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.zone_${zone}.sat`, {
            type: 'state',
            common: {
                name: 'Licht Sättigung',
                type: 'number',
                role: 'level.color.sat',
                read: true,
                write: true,
                desc: 'Licht Sättigung',
                min: 0,
                max: 100,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync(`Bulb_${id}.zone_${zone}.bright`, {
            type: 'state',
            common: {
                name: 'Licht Helligkeit',
                type: 'number',
                role: 'level.color.bri',
                read: true,
                write: true,
                desc: 'Licht Helligkeit',
                min: 0,
                max: 100,
            },
            native: {},
        });

        await this.setObjectNotExistsAsync(`Bulb_${id}.zone_${zone}.temp`, {
            type: 'state',
            common: {
                name: 'Licht Farbtemp',
                type: 'number',
                role: 'level.color.temp',
                read: true,
                write: true,
                desc: 'Licht Farbtemp',
                min: 2500,
                max: 9000,
                unit: 'Kelvin',
            },
            native: {},
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param {() => void} callback - callback
     */
    async onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);
            if (lifxTimeout) {
                clearTimeout(lifxTimeout);
            }
            callback();
        } catch (e) {
            this.log.error(e);
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    // 	if (obj) {
    // 		// The object was changed
    // 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    // 	} else {
    // 		// The object was deleted
    // 		this.log.info(`object ${id} deleted`);
    // 	}
    // }

    /**
     * Is called if a subscribed state changes
     *
     * @param {string} id - id
     * @param {ioBroker.State | null | undefined} state -state
     */
    async onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            if (state && !state.ack) {
                this.log.debug('ack is not set! -> command');
                const tmp = id.split('.');
                const dp = tmp.pop();
                const idy = tmp.pop();
                let zone = null;

                if (idy.includes('zone')) {
                    const idx = tmp.pop();
                    id = idx.replace(/Bulb_/g, ''); //Bulb
                    zone = parseInt(idy.replace(/zone_/g, '')); //zone
                } else {
                    id = idy.replace(/Bulb_/g, ''); //Bulb
                    this.log.debug(`ID: ${id} identified`);
                }

                this.getState(`Bulb_${id}.duration`, (err, dur) => {
                    if (dp == 'state') {
                        if (state.val == 0) {
                            client.light(id).off(dur.val, err => {
                                if (err) {
                                    this.log.debug(`Turning light ${id} off failed`);
                                }
                                this.log.debug(`Turned light ${id} off`);
                            });
                        } else if (state.val == 1 && !zone) {
                            client.light(id).on(dur.val, err => {
                                if (err) {
                                    this.log.debug(`Turning light ${id} on failed`);
                                }
                                this.log.debug(`Turned light ${id} on`);
                            });
                        }
                    }
                    if (dp == 'temp') {
                        if (zone === null) {
                            this.getState(`Bulb_${id}.bright`, (err, obj) => {
                                client.light(id).color(0, 0, obj.val, state.val, dur.val, err => {
                                    //hue, sat, bright, kelvin, duration
                                    if (err) {
                                        this.log.debug(`White light adjust${id} failed`);
                                    }
                                    this.log.debug(`White light adjust ${id} to: ${state.val} Kelvin`);
                                    this.setStateAsync(`Bulb_${id}.colormode`, {
                                        val: 'white',
                                        ack: true,
                                    });
                                });
                            });
                        } else {
                            this.getState(`Bulb_${id}.zone_${zone}.bright`, (err, obj) => {
                                client
                                    .light(id)
                                    .colorZones(zone, zone, 0, 0, obj.val, state.val, dur.val, true, err => {
                                        //hue, sat, bright, kelvin,duration
                                        if (err) {
                                            this.log.debug(`White light adjust${id} in zone ${zone}failed`);
                                        }
                                        this.log.debug(`White light adjust ${id} zone ${zone} to: ${state.val} Kelvin`);
                                    });
                            });
                        }
                    }

                    if (dp == 'bright') {
                        this.getState(`Bulb_${id}.colormode`, (err, mode) => {
                            if (!mode || mode.val === 'white') {
                                if (zone === null) {
                                    this.getState(`Bulb_${id}.temp`, (err, obj) => {
                                        client.light(id).color(0, 0, state.val, obj.val, dur.val, err => {
                                            //hue, sat, bright, kelvin, duration
                                            if (err) {
                                                this.log.debug(`Brightness White adjust ${id} failed`);
                                            }
                                            this.log.debug(`Brightness White adjust ${id} to${state.val} %`);
                                        });
                                    });
                                } else {
                                    this.getState(`Bulb_${id}.zone_${zone}.temp`, (err, obj) => {
                                        client
                                            .light(id)
                                            .colorZones(zone, zone, 0, 0, state.val, obj.val, dur.val, true, err => {
                                                //hue, sat, bright, kelvin, duration
                                                if (err) {
                                                    this.log.debug(
                                                        `Brightness White adjust ${id} in zone ${zone} failed`,
                                                    );
                                                }
                                                this.log.debug(
                                                    `Brightness White adjust ${id} zone ${zone} to${state.val} %`,
                                                );
                                            });
                                    });
                                }
                            } else {
                                if (zone === null) {
                                    this.getState(`Bulb_${id}.hue`, (err, obj) => {
                                        this.getState(`Bulb_${id}.sat`, (err, sat) => {
                                            this.getState(`Bulb_${id}.temp`, (err, tmp) => {
                                                client
                                                    .light(id)
                                                    .color(obj.val, sat.val, state.val, tmp.val, dur.val, err => {
                                                        //hue, sat, bright, kelvin, duration
                                                        if (err) {
                                                            this.log.debug(`Brightness Color adjust ${id} failed`);
                                                        }
                                                        this.log.debug(
                                                            `Brightness Color adjust ${id} to${state.val} %`,
                                                        );
                                                    });
                                            });
                                        });
                                    });
                                } else {
                                    this.getState(`Bulb_${id}.zone_${zone}.hue`, (err, obj) => {
                                        this.getState(`Bulb_${id}.zone_${zone}.sat`, (err, sat) => {
                                            this.getState(`Bulb_${id}.zone_${zone}.temp`, (err, tmp) => {
                                                client
                                                    .light(id)
                                                    .colorZones(
                                                        zone,
                                                        zone,
                                                        obj.val,
                                                        sat.val,
                                                        state.val,
                                                        tmp.val,
                                                        dur.val,
                                                        true,
                                                        err => {
                                                            //hue, sat, bright, kelvin
                                                            if (err) {
                                                                this.log.debug(
                                                                    `Brightness Color adjust ${id} in zone ${
                                                                        zone
                                                                    } failed`,
                                                                );
                                                            }
                                                            this.log.debug(
                                                                `Brightness Color adjust ${id} zone ${zone} to${
                                                                    state.val
                                                                } %`,
                                                            );
                                                        },
                                                    );
                                            });
                                        });
                                    });
                                }
                            }
                        }); // get colormode
                    }

                    if (dp == 'hue') {
                        if (zone === null) {
                            this.getState(`Bulb_${id}.sat`, (err, obj) => {
                                this.getState(`Bulb_${id}.bright`, (err, bri) => {
                                    this.getState(`Bulb_${id}.temp`, (err, tmp) => {
                                        client.light(id).color(state.val, obj.val, bri.val, tmp.val, dur.val, err => {
                                            //hue, sat, bright, kelvin
                                            if (err) {
                                                this.log.debug(`Coloring light ${id} failed`);
                                            }
                                            this.log.debug(`Coloring light ${id} to: ${state.val} °`);
                                            this.setStateAsync(`Bulb_${id}.colormode`, {
                                                val: 'color',
                                                ack: true,
                                            });
                                        });
                                    });
                                });
                            });
                        } else {
                            this.getState(`Bulb_${id}.zone_${zone}.sat`, (err, obj) => {
                                this.getState(`Bulb_${id}.zone_${zone}.bright`, (err, bri) => {
                                    this.getState(`Bulb_${id}.zone_${zone}.temp`, (err, tmp) => {
                                        client
                                            .light(id)
                                            .colorZones(
                                                zone,
                                                zone,
                                                state.val,
                                                obj.val,
                                                bri.val,
                                                tmp.val,
                                                dur.val,
                                                true,
                                                err => {
                                                    //hue, sat, bright, kelvin
                                                    if (err) {
                                                        this.log.debug(`Coloring light ${id} in zone ${zone} failed`);
                                                    }
                                                    this.log.debug(
                                                        `Coloring light ${id} zone ${zone} to: ${state.val} °`,
                                                    );
                                                },
                                            );
                                    });
                                });
                            });
                        }
                    }

                    if (dp == 'sat') {
                        if (zone === null) {
                            this.getState(`Bulb_${id}.hue`, (err, obj) => {
                                this.getState(`Bulb_${id}.bright`, (err, bri) => {
                                    this.getState(`Bulb_${id}.temp`, (err, tmp) => {
                                        client.light(id).color(obj.val, state.val, bri.val, tmp.val, dur.val, err => {
                                            //hue, sat, bright, kelvin
                                            if (err) {
                                                this.log.debug(`Saturation light ${id} failed`);
                                            }
                                            this.log.debug(`Saturation light ${id} to: ${state.val} %`);
                                            this.setStateAsync(`Bulb_${id}.colormode`, {
                                                val: 'color',
                                                ack: true,
                                            });
                                        });
                                    });
                                });
                            });
                        } else {
                            this.getState(`Bulb_${id}.zone_${zone}.hue`, (err, obj) => {
                                this.getState(`Bulb_${id}.zone_${zone}.bright`, (err, bri) => {
                                    this.getState(`Bulb_${id}.zone_${zone}.temp`, (err, tmp) => {
                                        client
                                            .light(id)
                                            .colorZones(
                                                zone,
                                                zone,
                                                obj.val,
                                                state.val,
                                                bri.val,
                                                tmp.val,
                                                dur.val,
                                                true,
                                                err => {
                                                    //hue, sat, bright, kelvin
                                                    if (err) {
                                                        this.log.debug(`Saturation light ${id} in zone ${zone} failed`);
                                                    }
                                                    this.log.debug(
                                                        `Saturation light ${id} zone ${zone} to: ${state.val} %`,
                                                    );
                                                },
                                            );
                                    });
                                });
                            });
                        }
                    }
                });
            }
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    /**
     * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
     * Using this method requires "common.messagebox" property to be set to true in io-package.json
     *
     * @param {ioBroker.Message} obj
     */
    /*
	onMessage(obj) {
		if (typeof obj === 'object' && obj.message) {
			if (obj.command === 'send') {
				// e.g. send email or pushover or whatever
				this.log.info('send command');

				// Send response in callback if required
				if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
			}
		}
	}
    */
}
if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options] -options
     */
    module.exports = options => new Lifx(options);
} else {
    // otherwise start the instance directly
    new Lifx();
}
