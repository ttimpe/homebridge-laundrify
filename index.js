const http = require('http');

let Service;
let Characteristic;
module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-laundrify', 'laundrify', LaundrifySensor);
};

// --== MAIN CLASS ==--
class LaundrifySensor {
    constructor(log, config) {
        this.log = log;

        // configuration
        this.name = config['name'];
        this.id = config['id'];
        this.ipAddress = config['ipAddress'];
        this.threshold = config['threshold'];

        this.enabledServices = [];


        this.initSensor();
    }


    // --== SETUP SERVICES  ==--
    initSensor() {
        // info service

        pollStatus(() => {

         this.informationService = new Service.AccessoryInformation();
        this.informationService
        .setCharacteristic(Characteristic.Manufacturer, 'laundrify')
        .setCharacteristic(Characteristic.Model, 'laundrify')
        .setCharacteristic(Characteristic.SerialNumber, this.deviceId)
        .setCharacteristic(Characteristic.FirmwareRevision, this.version);

        this.enabledServices.push(this.informationService);
        this.log('Got information service');
        // fan service
        this.sensorService = new Service.ContactSensor(this.name);
        this.sensorService
        .getCharacteristic(Characteristic.ContactSensorState)
        .on('get', this.getSensorState.bind(this));
        this.enabledServices.push(this.sensorService);

 
        });
 }
       


        pollStatus(callback) {
            const status_url = this.ip + '/status';

            const req = http.get(status_url, res => {
                let data = '';
                res.on('data', (chunk) => {
                    data += data;
                });
                res.on('end', () => {
                    var statusObject = JSON.parse(data);
                    this.deviceId = statusObject.deviceId;
                    this.power = statusObject.power;
                    this.version = statusObject.version;
                    callback();
                });
            }).on("error", (err) => {
                this.log('error on getData');
            });
        }





        getSensorState(callback) {
            this.pollStatus(() => {
                if (this.power >= this.threshold) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            })
        }

    
    getServices() {
        return this.enabledServices;
    }
}