/* jshint -W097 */// jshint strict:false
/*jslint node: true */

var lifx=require('lifx');

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
        adapter.log.info('ack is not set!');
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('config test1: ' + adapter.config.test1);
    adapter.log.info('config test1: ' + adapter.config.test2);

    var lx = lifx.init();
    //lifx.setDebug(true);

    lx.on('bulbstate', function(b) {
        adapter.log.info('Bulb state: ' + util.inspect(b));
    });

    lx.on('bulbonoff', function(b) {
        adapter.log.info('Bulb on/off: ' + util.inspect(b));
    });

    lx.on('bulb', function(b) {
        adapter.log.info('New bulb found: ' + b.name + " : " + b.addr.toString("hex"));
    });

    lx.on('gateway', function(g) {
        adapter.log.info('New gateway found: ' + g.ip);
    });

    lx.on('packet', function(p) {
        // Show informational packets
        switch (p.packetTypeShortName) {
            case 'powerState':
            case 'wifiInfo':
            case 'wifiFirmwareState':
            case 'wifiState':
            case 'accessPoint':
            case 'bulbLabel':
            case 'tags':
            case 'tagLabels':
            //case 'lightStatus':
            case 'timeState':
            case 'resetSwitchState':
            case 'meshInfo':
            case 'meshFirmware':
            case 'versionState':
            case 'infoState':
            case 'mcuRailVoltage':
                adapter.log.info(p.packetTypeName + " - " + p.preamble.bulbAddress.toString('hex') + " - " + util.inspect(p.payload));
                break;
            default:
                break;
        }
    });



    // in this template all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


    /**
     *   setState examples
     *
     *   you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
     *
     */

    // the variable testVariable is set to true as command (ack=false)
    adapter.setState('testVariable', true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    adapter.setState('testVariable', {val: true, ack: true});

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
    adapter.setState('testVariable', {val: true, ack: true, expire: 30});


}
