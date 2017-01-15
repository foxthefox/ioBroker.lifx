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
};

vis.binds.lifxui = {

    version: "0.0.1",

    showVersion: function() {

        if (vis.binds.lifxui.version) {

            console.log('Lifx widget version: ' + vis.binds.lifxui.version);

            vis.binds.lifxui.version = null;

        }

    },

    lifxColormode: function (el, oid) {
            var $hue = $(el).parent().find('.hue-mode-hue');
            var $ct  = $(el).parent().find('.hue-mode-ct');
            if (vis.states.attr(oid + '.val') == 'white') {
                $hue.hide();
                $ct.show();
            } else {
                $ct.hide();
                $hue.show();
            }

            vis.states.bind(oid + '.val', function (e, newVal, oldVal) {
                if (newVal == 'white') {
                    $hue.hide();
                    $ct.show();
                } else {
                    $ct.hide();
                    $hue.show();
                }
            });
        }
    };

vis.binds.lifxui.showVersion();
