/* jshint -W097 */// jshint strict:false
/*jslint node: true */

var LifxClient=require('lifx-lan-client').Client;
var util = require('util');
var client = new LifxClient();
var lifxTimeout;

"use strict";

// you have to require the utils module and call adapter function
const utils =  require('@iobroker/adapter-core'); // Get common adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
let adapter;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'lifx',
        // is called when adapter shuts down - callback has to be called under any circumstances!
        unload: function (callback) {
            if (lifxTimeout) clearTimeout(lifxTimeout);
            try {
                adapter.log.info('cleaned everything up...');
                callback();
            } catch (e) {
                callback();
            }
        },
        // is called if a subscribed object changes
        objectChange: function (id, obj) {
            // Warning, obj can be null if it was deleted
             adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
        },
        // is called if a subscribed state changes
        stateChange: function (id, state) {
            // Warning, state can be null if it was deleted
            adapter.log.silly('stateChange ' + id + ' ' + JSON.stringify(state));
        
            // you can use the ack flag to detect if it is status (true) or command (false)
            if (state && !state.ack) {
                adapter.log.debug('ack is not set! -> command');
                var tmp = id.split('.');
                var dp = tmp.pop();
                var idy = tmp.pop();
                var zone = null;
                
                if (idy.includes('zone')){
                        var idx = tmp.pop();
                        id = idx.replace(/Bulb_/g,''); //Bulb
                        zone = parseInt(idy.replace(/zone_/g,'')); //zone
                    }
                else{
                        id = idy.replace(/Bulb_/g,''); //Bulb 
                        adapter.log.debug('ID: '+ id + ' identified');
                    }

				adapter.getState('Bulb_'+id+'.duration', function(err,dur){
                if (dp == 'state') {
                    if (state.val == 0) {
                        client.light(id).off(dur.val, function(err) {
                            if (err) {
                                adapter.log.debug('Turning light ' + id  + ' off failed');
                            }
                            adapter.log.debug('Turned light ' + id + ' off');
                        });
                    }
                    else if (state.val == 1 && !zone) {
                        client.light(id).on(dur.val, function(err) {
                            if (err) {
                                adapter.log.debug('Turning light ' + id  + ' on failed');
                            }
                            adapter.log.debug('Turned light ' + id + ' on');
                        });
						
                    }
                  }
                if (dp == 'temp') {
                    if (zone === null){
                        adapter.getState('Bulb_'+id+'.bright', function(err,obj){
                            client.light(id).color(0, 0, obj.val, state.val, dur.val, function(err) { //hue, sat, bright, kelvin, duration
                                if (err) {
                                    adapter.log.debug('White light adjust' + id  + ' failed');
                                }
                                adapter.log.debug('White light adjust ' + id + ' to: ' + state.val + ' Kelvin');
                                adapter.setState('Bulb_'+ id  +'.colormode', {val: 'white', ack: true});
                            });

                        });
                    }
                    else {
                         adapter.getState('Bulb_'+id+'.zone_'+zone+'.bright', function(err,obj){
                            client.light(id).colorZones(zone, zone, 0, 0, obj.val, state.val, dur.val, true, function(err) { //hue, sat, bright, kelvin,duration
                                if (err) {
                                    adapter.log.debug('White light adjust' + id  + ' in zone ' + zone + 'failed');
                                }
                                adapter.log.debug('White light adjust ' + id + ' zone ' + zone + ' to: ' + state.val + ' Kelvin');
                            });

                        });
                    }
        
                }
        
                if (dp == 'bright') {
                    adapter.getState('Bulb_' + id + '.colormode', function (err, mode) {
                        if (mode.val === 'white') {
                            if (zone === null){
                                adapter.getState('Bulb_' + id + '.temp', function (err, obj) {
                                    client.light(id).color(0, 0, state.val, obj.val, dur.val, function (err) { //hue, sat, bright, kelvin, duration
                                        if (err) {
                                            adapter.log.debug('Brightness White adjust ' + id + ' failed');
                                        }
                                        adapter.log.debug('Brightness White adjust ' + id + ' to' + state.val + ' %');
                                    });
                                });
                            }
                            else {
                                adapter.getState('Bulb_' + id + '.zone_'+zone+'.temp', function (err, obj) {
                                    client.light(id).colorZones(zone, zone, 0, 0, state.val, obj.val, dur.val, true, function (err) { //hue, sat, bright, kelvin, duration
                                        if (err) {
                                            adapter.log.debug('Brightness White adjust ' + id + ' in zone ' + zone + ' failed');
                                        }
                                        adapter.log.debug('Brightness White adjust ' + id + ' zone ' + zone + ' to' + state.val + ' %');
                                    });
                                });
                                
                            }
                        }
                        else {
                           if (zone === null){        
                                adapter.getState('Bulb_' + id + '.hue', function (err, obj) {
									adapter.getState('Bulb_' + id + '.sat', function (err, sat) {
										adapter.getState('Bulb_' + id + '.temp', function (err, tmp) {
											client.light(id).color(obj.val, sat.val, state.val, tmp.val, dur.val, function (err) { //hue, sat, bright, kelvin, duration
												if (err) {
													adapter.log.debug('Brightness Color adjust ' + id + ' failed');
												}
												adapter.log.debug('Brightness Color adjust ' + id + ' to' + state.val + ' %');
											});
										});
									});
                                });
                           }
                           else {
                                 adapter.getState('Bulb_' + id + '.zone_'+zone+'.hue', function (err, obj) {
									 adapter.getState('Bulb_' + id + '.zone_'+zone+'.sat', function (err, sat) {
										adapter.getState('Bulb_' + id + '.zone_'+zone+'.temp', function (err, tmp) {
											client.light(id).colorZones(zone, zone, obj.val, sat.val, state.val, tmp.val, dur.val, true, function (err) { //hue, sat, bright, kelvin
												if (err) {
													adapter.log.debug('Brightness Color adjust ' + id + ' in zone ' + zone + ' failed');
												}
												adapter.log.debug('Brightness Color adjust ' + id + ' zone ' + zone + ' to' + state.val + ' %');
											});
										});
									 });
                                });                              
                           }
                        }
                    }); // get colormode
                }
        
                if (dp == 'hue') {
                    if (zone === null){
                        adapter.getState('Bulb_' + id + '.sat', function (err, obj) {
							adapter.getState('Bulb_' + id + '.bright', function (err, bri) {
								adapter.getState('Bulb_' + id + '.temp', function (err, tmp) {
									client.light(id).color(state.val, obj.val, bri.val, tmp.val, dur.val, function (err) { //hue, sat, bright, kelvin
										if (err) {
											adapter.log.debug('Coloring light ' + id + ' failed');
										}
										adapter.log.debug('Coloring light ' + id + ' to: ' + state.val + ' °');
										adapter.setState('Bulb_'+ id  +'.colormode', {val: 'color', ack: true});
									});
								});
                            });
                        });
                    }
                    else {
                          adapter.getState('Bulb_' + id + '.zone_'+zone+'.sat', function (err, obj) {
							  adapter.getState('Bulb_' + id + '.zone_'+zone+'.bright', function (err, bri) {
								  adapter.getState('Bulb_' + id + '.zone_'+zone+'.temp', function (err, tmp) {
									client.light(id).colorZones(zone, zone, state.val, obj.val, bri.val, tmp.val, dur.val, true, function (err) { //hue, sat, bright, kelvin
										if (err) {
											adapter.log.debug('Coloring light ' + id + ' in zone ' + zone + ' failed');
										}
										adapter.log.debug('Coloring light ' + id + ' zone ' + zone + ' to: ' + state.val + ' °');
									});
								});
                            });
                        });                      
                    }
                }
        
        
        
                if (dp == 'sat') {
                    if(zone === null){
                        adapter.getState('Bulb_'+id+'.hue', function(err,obj){
							adapter.getState('Bulb_'+id+'.bright', function(err,bri){
								adapter.getState('Bulb_'+id+'.temp', function(err,tmp){
									client.light(id).color(obj.val, state.val, bri.val, tmp.val, dur.val, function(err) { //hue, sat, bright, kelvin
										if (err) {
											adapter.log.debug('Saturation light ' + id  + ' failed');
										}
										adapter.log.debug('Saturation light ' + id + ' to: '+ state.val+' %');
										adapter.setState('Bulb_'+ id  +'.colormode', {val: 'color', ack: true});
									});
								});
                            });
                        });
                    }
                    else{
                        adapter.getState('Bulb_'+id+'.zone_'+zone+'.hue', function(err,obj){
							adapter.getState('Bulb_' + id + '.zone_'+zone+'.bright', function (err, bri) {
								  adapter.getState('Bulb_' + id + '.zone_'+zone+'.temp', function (err, tmp) {
									client.light(id).colorZones(zone, zone, obj.val, state.val, bri.val, tmp.val, dur.val, true, function(err) { //hue, sat, bright, kelvin
										if (err) {
											adapter.log.debug('Saturation light ' + id  + ' in zone ' + zone + ' failed');
										}
										adapter.log.debug('Saturation light ' + id + ' zone ' + zone + ' to: '+ state.val+' %');
									});
								});
                            });
                        });
                    }
        
                }
				});
            }
        },
        // is called when databases are connected and adapter received configuration.
        // start here!
        ready: () => {
                  main()
            }

    });
    adapter = new utils.Adapter(options);
    
    return adapter;
};
function createBasic(id, label, minK, maxK){
        adapter.setObject('Bulb_' + id, {
            type: 'channel',
            common: {
                name: 'LifxBulb ' + label,
                role: 'light.color.rgbw' //andere Rolle?
            },
            native: {
            }
        });
        adapter.setObject('Bulb_' + id + '.label',
            {
                "type": "state",
                "common": {
                    "name":  "Label",
                    "type":  "string",
                    "role":  "info.name",
                    "read":  true,
                    "write": false,
                    "desc":  "Label",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + id + '.vendor',
            {
                "type": "state",
                "common": {
                    "name":  "Vendor",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "Vendor",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + id + '.product',
            {
                "type": "state",
                "common": {
                    "name":  "Product",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "product",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + id + '.version',
            {
                "type": "state",
                "common": {
                    "name":  "Version",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "Version",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + id + '.colorLamp',
            {
                "type": "state",
                "common": {
                    "name":  "color lamp",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "color Lamp",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + id + '.infraredLamp',
            {
                "type": "state",
                "common": {
                    "name":  "infrared lamp",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "infrared lamp",
                },
                "native": {

                }
            });
         adapter.setObject('Bulb_' + id + '.multizoneLamp',
            {
                "type": "state",
                "common": {
                    "name":  "multizoneLamp",
                    "type":  "string",
                    "role":  "text",
                    "read":  true,
                    "write": false,
                    "desc":  "multizoneLamp",
                },
                "native": {

                }
            });
        adapter.setObject('Bulb_' + id + '.state',
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
		adapter.setObject('Bulb_' + id + '.duration',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Aenderungsgeschwindigkeit ms",
                    "type":  "number",
                    "role":  "level.color.dur",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Aenderungsgeschwindigkeit ms",
                    "min":   "0",
                    "max":   "100000",
                    "unit":   "ms",
                },
                "native": {}
            });
        adapter.setObject('Bulb_' + id + '.bright',
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
            //min, max anhand von getFeatures "temperature_range":[1500,4000] einstellen
        adapter.setObject('Bulb_' + id + '.temp',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Farbtemp",
                    "type":  "number",
                    "role":  "level.color.temp",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Farbtemp",
                    "min":   minK,
                    "max":   maxK,
                    "unit":  "Kelvin"
                },
                "native": {}
            });
        adapter.setObject('Bulb_' + id + '.online',
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
}

function createColor(id){
        adapter.setObject('Bulb_' + id + '.hue',
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
        adapter.setObject('Bulb_' + id + '.sat',
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
        adapter.setObject('Bulb_' + id + '.colormode',
            {
                "type": "state",
                "common": {
                    "name":  "Licht Colormode",
                    "type":  "string",
                    "role":  "indicator.colormode",
                    "read":  true,
                    "write": true,
                    "desc":  "Licht Colormode",
                },
                "native": {}
            });
}

function createZone(id, zone) {
        adapter.setObject('Bulb_' + id + '.zone_'+ zone + '.hue',
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
        adapter.setObject('Bulb_' + id + '.zone_'+ zone + '.sat',
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
        adapter.setObject('Bulb_' + id + '.zone_'+ zone + '.bright',
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

        adapter.setObject('Bulb_' + id + '.zone_'+ zone + '.temp',
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
}

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    
    // in this template all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');
    client.on('light-new', function(light) {
        adapter.log.info('New light found.');
        adapter.log.info('ID: ' + light.id);
        adapter.log.info('IP: ' + light.address + ':' + light.port);
        light.getHardwareVersion(function(err, info) {
            if (err) {
                adapter.log.debug(err);
            }
			else {            
				light.getState(function(err, state) {
					if (err) {
						adapter.log.debug(err);
					}
					else {
						createBasic(light.id, state.label, info.productFeatures.temperature_range[0],info.productFeatures.temperature_range[1]);
						
						adapter.log.info('Vendor: ' + info.vendorName);
						adapter.log.info('Product: ' + info.productName);
						adapter.log.info('Features:' + JSON.stringify(info.productFeatures), '\n');
						adapter.log.info('Label: ' + state.label);
						adapter.log.info('Power: ' + ((state.power == 1) ? 'on' : 'off'));
						
						adapter.setState('Bulb_'+ light.id +'.vendor', {val: info.vendorName, ack: true});
						adapter.setState('Bulb_'+ light.id +'.product', {val: info.productName, ack: true});
						adapter.setState('Bulb_'+ light.id +'.version', {val: info.version, ack: true});
						adapter.setState('Bulb_'+ light.id +'.colorLamp', {val: info.productFeatures.color, ack: true});
						adapter.setState('Bulb_'+ light.id +'.infraredLamp', {val: info.productFeatures.infrared, ack: true});
						adapter.setState('Bulb_'+ light.id +'.multizoneLamp', {val: info.productFeatures.multizone, ack: true});
						
						adapter.setState('Bulb_'+ light.id +'.label', {val: state.label, ack: true});
						let convertPower = state.power == 1 ? true: false
						adapter.setState('Bulb_'+ light.id +'.state', {val: convertPower , ack: true});
						adapter.setState('Bulb_'+ light.id +'.duration', {val: 500, ack: true});
						adapter.setState('Bulb_'+ light.id +'.bright', {val: state.color.brightness, ack: true});
						adapter.setState('Bulb_'+ light.id +'.temp', {val: state.color.kelvin, ack: true});
						adapter.setState('Bulb_'+ light.id  +'.online', {val: true, ack: true}); // because we found the lamp     
					}
					if (info.productFeatures.color){
						createColor(light.id);
							light.getState(function(err, state) {
								if (err) {
									adapter.log.debug(err);
								}
								else {
									adapter.setState('Bulb_'+ light.id +'.hue', {val: state.color.hue, ack: true});
									adapter.setState('Bulb_'+ light.id +'.sat', {val: state.color.saturation, ack: true});
									adapter.setState('Bulb_'+ light.id  +'.colormode', {val: 'white', ack: true}); // initial setting to white
								}
							});
					}
					if (info.productFeatures.multizone){
						light.getColorZones(0, 255, function(err, mz) {
							if (err) {
								adapter.log.debug(err);
							}
							else {
								var mquery = mz.count/8; //je Antwort sind 8 Zonen übermittelt mz.count enthält die Anzahl der Zonen
								for (z=0; z<mz.count;z++){
									createZone(light.id, z);
								}
								for (i = 0; i<mquery; i++){
									light.getColorZones(i*8, 7+(i*8), function(err, multiz) {
										if (err) {
											adapter.log.debug(err);
										}
										else {
											adapter.log.info('Multizzone: '+JSON.stringify(multiz));
											for (j=0; j<8; j++){
												adapter.setState('Bulb_'+ light.id +'.zone_'+parseInt(j+multiz.index)+'.hue', {val: multiz.color[j].hue, ack: true});
												adapter.setState('Bulb_'+ light.id +'.zone_'+parseInt(j+multiz.index)+'.sat', {val: multiz.color[j].saturation, ack: true});
												adapter.setState('Bulb_'+ light.id +'.zone_'+parseInt(j+multiz.index)+'.bright', {val: multiz.color[j].brightness, ack: true});
												adapter.setState('Bulb_'+ light.id +'.zone_'+parseInt(j+multiz.index)+'.temp', {val: multiz.color[j].kelvin, ack: true});            
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

    client.on('light-online', function(light) {
        adapter.log.info('Light back online. ID:' + light.id + ', IP:' + light.address + ':' + light.port + '\n');
        adapter.setState('Bulb_'+ light.id  +'.online', {val: true, ack: true});
    });

    client.on('light-offline', function(light) {
        adapter.log.info('Light offline. ID:' + light.id + ', IP:' + light.address + ':' + light.port + '\n');
        adapter.setState('Bulb_'+ light.id  +'.online', {val: false, ack: true});
    });

    client.on('listening', function() {
        var address = client.address();
        adapter.log.info(
            'Started LIFX listening on ' +
            address.address + ':' + address.port + '\n'
        );
    });
    client.init();

    function pollLifxData() {
        var lifx_interval = parseInt(adapter.config.lifx_interval,10) || 30;
        updateDevices();
        adapter.log.debug("polling! lifx is alive");
        lifxTimeout = setTimeout(pollLifxData, lifx_interval*1000);
    }
    function updateDevices(){
        client.lights().forEach(function(light) {
            light.getState(function(err, info) {
                if (err) {
                  adapter.log.error('Failed cyclic update for ' + light.id);
                }
                else {
                    adapter.setState('Bulb_'+ light.id +'.label', {val: info.label, ack: true})
                    let convertPower = info.power == 1 ? true: false;
                    adapter.setState('Bulb_'+ light.id +'.state', {val: convertPower, ack: true});
                    adapter.setState('Bulb_'+ light.id +'.hue', {val: info.color.hue, ack: true});
                    adapter.setState('Bulb_'+ light.id +'.sat', {val: info.color.saturation, ack: true});
                    adapter.setState('Bulb_'+ light.id +'.bright', {val: info.color.brightness, ack: true});
                    adapter.setState('Bulb_'+ light.id +'.temp', {val: info.color.kelvin, ack: true});
                }
            });
            light.getHardwareVersion(function(err, info) {
                if (err) {
                    adapter.log.error('Failed cyclic HW Ver. update for ' + light.id + ' : ' + err);
                }
                else if (info.productFeatures.multizone){
                    light.getColorZones(0, 255, function(err, mz) {
                        if (err) {
                            adapter.log.error('Failed cyclic Color Zones update for ' + light.id + ' : ' + err);
                        }
						else {
							var mquery = mz.count/8; //je Antwort sind 8 Zonen übermittelt mz.count enthält die Anzahl der Zonen
							for (i = 0; i<mquery; i++){
								light.getColorZones(i*8, 7+(i*8), function(err, multiz) {
									if (err) {
										adapter.log.error('Failed cyclic Color Zones >8 update for ' + light.id + ' : ' + err);
									}
									else {
										adapter.log.silly('Multizzone: '+JSON.stringify(multiz));
										for (j=0; j<8; j++){
											adapter.setState('Bulb_'+ light.id +'.zone_'+parseInt(j+multiz.index)+'.hue', {val: multiz.color[j].hue, ack: true});
											adapter.setState('Bulb_'+ light.id +'.zone_'+parseInt(j+multiz.index)+'.sat', {val: multiz.color[j].saturation, ack: true});
											adapter.setState('Bulb_'+ light.id +'.zone_'+parseInt(j+multiz.index)+'.bright', {val: multiz.color[j].brightness, ack: true});
											adapter.setState('Bulb_'+ light.id +'.zone_'+parseInt(j+multiz.index)+'.temp', {val: multiz.color[j].kelvin, ack: true});            
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
	 
     pollLifxData();

}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 
