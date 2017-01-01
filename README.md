![Logo](admin/lifx_logo.png)
# ioBroker.lifx
=================
Lifx adapter for ioBroker

##Installation:

npm install https://github.com/foxthefox/ioBroker.lifx/tarball/master --production

##Settings/Configuration:
- no settings or configuration required, adapter automatically detects the lamps

##Visualization:
- for change of colormode the toggle-switch has to have the settings "white" and "color"

##TODO:
- getting adjustment of color values with all existing settings (brighness adjust has fixed 80% saturation and keeps the previous hue setting; saturation adjust and hue adjust has fixed 80% brightness)
- transition times
- waveforms
- cyclical getState from lamp, if adjusted outside ioBroker
- usage of meta.rols
- objects for white lamp

##Changelog:

###0.0.2 
- change to node-lifx
- successful tested with 2 lamps and firmware 2.1

###0.0.1 
- initial setup with lifx
