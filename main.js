/* jshint -W097 */// jshint strict:false
/*jslint node: true */

var LifxClient=require('node-lifx').Client;
var util = require('util');
var client = new LifxClient();

"use strict";

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
var adapter = utils.adapter('lifx');

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
     adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set! -> command');
        var tmp = id.split('.');
        var dp = tmp.pop();
        var idx = tmp.pop();
        id = idx.replace(/Bulb_/g,''); //Bulb
        adapter.log.debug('ID: '+ id + 'identified');

        if (dp == 'state') {
            if (state.val == 0) {
                client.light(id).off(0, function(err) {
                    if (err) {
                        adapter.log.debug('Turning light ' + id  + ' off failed');
                    }
                    adapter.log.debug('Turned light ' + id + ' off');
                });
            }
            else if (state.val == 1) {
                client.light(id).on(0, function(err) {
                    if (err) {
                        adapter.log.debug('Turning light ' + id  + ' on failed');
                    }
                    adapter.log.debug('Turned light ' + id + ' on');
                });

            }
        }
        if (dp == 'temp') {
            adapter.getState('Bulb_'+id+'.bright', function(err,obj){
                client.light(id).color(0, 0, obj.val, state.val,0, function(err) { //hue, sat, bright, kelvin,duration
                    if (err) {
                        adapter.log.debug('White light adjust' + id  + ' failed');
                    }
                    adapter.log.debug('White light adjust ' + id + ' to: ' + state.val + ' Kelvin');
                });

            });

        }

        if (dp == 'bright') {
            adapter.getState('Bulb_' + id + '.colormode', function (err, mode) {
                if (mode.val === 'white') {
                    adapter.getState('Bulb_' + id + '.temp', function (err, obj) {
                        client.light(id).color(0, 0, state.val, obj.val, 0, function (err) { //hue, sat, bright, kelvin
                            if (err) {
                                adapter.log.debug('Brightness White adjust ' + id + ' failed');
                            }
                            adapter.log.debug('Brightness White adjust ' + id + ' to' + state.val + ' %');
                        });

                    });
                }
                else {

                    adapter.getState('Bulb_' + id + '.hue', function (err, obj) {
                        client.light(id).color(obj.val, 80, state.val, 80, 0, function (err) { //hue, sat, bright, kelvin
                            if (err) {
                                adapter.log.debug('Brightness Color adjust ' + id + ' failed');
                            }
                            adapter.log.debug('Brightness Color adjust ' + id + ' to' + state.val + ' %');
                        });
                    });

                }
            });
        }

        if (dp == 'hue') {
            adapter.getState('Bulb_' + id + '.sat', function (err, obj) {
                client.light(id).color(state.val, obj.val, 80, function (err) { //hue, sat, bright, kelvin
                    if (err) {
                        adapter.log.debug('Coloring light ' + id + ' failed');
                    }
                    adapter.log.debug('Coloring light ' + id + ' to: ' + state.val + ' °');
                });

            });
        }



        if (dp == 'sat') {
                adapter.getState('Bulb_'+id+'.hue', function(err,obj){
                    client.light(id).color(obj.val, state.val, 80, function(err) { //hue, sat, bright, kelvin
                        if (err) {
                            adapter.log.debug('Saturation light ' + id  + ' failed');
                        }
                        adapter.log.debug('Saturation light ' + id + ' to: '+ state.val+' %');
                    });

                });

        }

    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    adapter.log.debug('entered ready ');
    main();
});

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    
    // in this template all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');
    client.on('light-new', function(light) {
        console.log('New light found.');
        console.log('ID: ' + light.id);
        console.log('IP: ' + light.address + ':' + light.port);
        adapter.setObject('Bulb_' + light.id, {
            type: 'channel',
            common: {
                name: 'LifxBulb ' + light.id,
                role: 'light.color.rgbw'
            },
            native: {
                "add": light.address
            }
        });
        adapter.setObject('Bulb_' + light.id + '.state',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Ein/Aus",
                    "type":  "boolean",
                    "role":  "light.switch",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Ein/Aus",
                },
                "native": {

                }
            });
        adapter.setObject('Bulb_' + light.id + '.hue',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Farbe",
                    "type":  "number",
                    "role":  "level.color.hue",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Farbe",
                    "min":   "0",
                    "max":   "360",
                },
                "native": {}
            });
        adapter.setObject('Bulb_' + light.id + '.sat',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Sättigung",
                    "type":  "number",
                    "role":  "level.color.sat",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Sättigung",
                    "min":   "0",
                    "max":   "100",
                },
                "native": {}
            });
        adapter.setObject('Bulb_' + light.id + '.bright',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Helligkeit",
                    "type":  "number",
                    "role":  "level.color.bri",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Helligkeit",
                    "min":   "0",
                    "max":   "100",
                },
                "native": {}
            });

        adapter.setObject('Bulb_' + light.id + '.temp',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Farbtemp",
                    "type":  "number",
                    "role":  "level.color.temp",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Farbtemp",
                    "min":   "2500",
                    "max":   "9000",
                    "unit":  "Kelvin"
                },
                "native": {}
            });
        adapter.setObject('Bulb_' + light.id + '.online',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Erreichbar",
                    "type":  "boolean",
                    "role":  "indicator.reachable",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht erreichbar",
                },
                "native": {}
            });
        adapter.setObject('Bulb_' + light.id + '.colormode',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Colormode",
                    "type":  "text",
                    "role":  "indicator.colormode",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Colormode",
                },
                "native": {}
            });
        light.getState(function(err, info) {
            if (err) {
                console.log(err);
            }
            console.log('Label: ' + info.label);
            console.log('Power:', (info.power === 1) ? 'on' : 'off');
            console.log('Color:', info.color, '\n');
            adapter.setState('Bulb_'+ light.id +'.state', {val: info.power, ack: true});
            adapter.setState('Bulb_'+ light.id +'.hue', {val: info.color.hue, ack: true});
            adapter.setState('Bulb_'+ light.id +'.sat', {val: info.color.saturation, ack: true});
            adapter.setState('Bulb_'+ light.id +'.bright', {val: info.color.brightness, ack: true});
            adapter.setState('Bulb_'+ light.id +'.temp', {val: info.color.kelvin, ack: true});
            adapter.setState('Bulb_'+ light.id  +'.online', {val: true, ack: true});
            adapter.setState('Bulb_'+ light.id  +'.colormode', {val: 'white', ack: true});
        });

    });

    client.on('light-online', function(light) {
        console.log('Light back online. ID:' + light.id + ', IP:' + light.address + ':' + light.port + '\n');
        adapter.setState('Bulb_'+ light.id  +'.online', {val: true, ack: true});
    });

    client.on('light-offline', function(light) {
        console.log('Light offline. ID:' + light.id + ', IP:' + light.address + ':' + light.port + '\n');
        adapter.setState('Bulb_'+ light.id  +'.online', {val: false, ack: true});
    });

    client.on('listening', function() {
        var address = client.address();
        console.log(
            'Started LIFX listening on ' +
            address.address + ':' + address.port + '\n'
        );
    });
    client.init();

}
