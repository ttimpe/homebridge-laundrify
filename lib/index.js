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
		this.ipAddress = config['ipAddress'];
		this.threshold = parseInt(config['threshold']);
		this.interval = parseInt(config['interval']);
		this.minimumTime = parseInt(config['minimumTime'])
		this.enabledServices = [];
		this.timer = null;
		this.lastStateChange = new Date().getTime()
		this.lastPullState = false;
		this.initSensor();
	}


	// --== SETUP SERVICES	==--
	initSensor() {
		// info service

		this.informationService = new Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(Characteristic.Manufacturer, 'laundrify')
			.setCharacteristic(Characteristic.Model, 'laundrify')
			.setCharacteristic(Characteristic.SerialNumber, 'serial')
			.setCharacteristic(Characteristic.FirmwareRevision, 'FIRMWARE');
		this.enabledServices.push(this.informationService);
		// this.log('Got information service');
		// fan service
		this.sensorService = new Service.ContactSensor(this.name);
		this.sensorService
			.getCharacteristic(Characteristic.ContactSensorState)
			.on('get', this.getSensorState.bind(this));
		this.enabledServices.push(this.sensorService);
		
		var that = this;
		this.timer = setInterval(function () {
			that.pollStatus(that)
		}, this.interval)
	}



	pollStatus(that) {
		const status_url = 'http://' + that.ipAddress + '/status';
		const req = http.get(status_url, res => {
			let data = '';
			res.on('data', (chunk) => {
				data += chunk;
			});
			res.on('end', () => {
				var statusObject = JSON.parse(data);
				that.power = statusObject.power;
				this.update(statusObject)
			});
		}).on("error", (err) => {
			console.log('Could not connect to ' + this.name);
		});
	}


update(statusObject) {
	var time = new Date().getTime()
	this.log.debug("Last state change was at " + this.lastStateChange)
	this.log.debug("now is " + time)
	this.log.debug("time difference is " + (time-this.lastStateChange))
	this.log.debug("minimum time is " + (this.minimumTime * 1000))
		
		var isOn = (statusObject.power >= this.threshold);
		if ((time - this.lastStateChange) >= (this.minimumTime * 1000)) {   
			this.log.debug("minimum time exceeded")
		if (this.lastPullState != isOn) {
			// got state change
			this.log.debug(this.name + " state has changed")
			this.sensorService.getCharacteristic(Characteristic.ContactSensorState).updateValue(isOn)	
			this.lastStateChange = new Date().getTime()
		}
	}

		this.lastPullState = isOn;	
}


	getSensorState(callback) {
		if (this.power >= this.threshold) {
			callback(null, true);
		} else {
			callback(null, false);
		}
	}

	
	getServices() {
		return this.enabledServices;
	}
}
