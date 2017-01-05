/*
    ioBroker.lifx Widget-Set
    version: "0.0.1"
    Copyright Karsten Thiele 
    adapted from iobroker.vis-jqui, jqui-mfd

*/

"use strict";



// add translations for edit mode

if (vis.editMode) {

    $.extend(systemDictionary, {
        "oid-bright":       {"en": "brightness", "de": "Helligkeit"},
        "oid-temp":         {"en": "light temperature", "de": "Lichttemperatur"},
        "oid-colormode":    {"en": "mode",  "de": "Modus"},
        "oid-sat":          {"en": "saturation",    "de": "Sättigung"},
        "oid-color":          {"en": "color",      "de": "Farbe"}
    });


vis.binds.lifxui = {

    version: "0.0.1",

    showVersion: function() {

        if (vis.binds.deepcore.version) {

            console.log('Deepcore widget version: ' + vis.binds.deepcore.version);

            vis.binds.deepcore.version = null;

        }

    },

    lifxColormode: function (el, oid) {
            var $hue = $(el).parent().find('.hue-mode-hue');
            var $ct  = $(el).parent().find('.hue-mode-ct');
            var $ct  = $(el).parent().find('.hue-mode-ct');
            if (vis.states.attr(oid + '.val') == 'color') {
                $hue.hide();
                $ct.show();
            } else {
                $ct.hide();
                $hue.show();
            }

            vis.states.bind(oid + '.val', function (e, newVal, oldVal) {
                if (newVal == 'color') {
                    $hue.hide();
                    $ct.show();
                } else {
                    $ct.hide();
                    $hue.show();
                }
            });
        },
    };

vis.binds.lifx.showVersion();
