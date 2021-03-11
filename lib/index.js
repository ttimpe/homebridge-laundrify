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
				let statusObject = JSON.parse(data)

				// starting from v2.0.0 the Firmware Version is defined in `firmware.version` (previously `config.version`)
				let firmwareVersion = statusObject.firmware ? statusObject.firmware.version : statusObject.config.version

				// this.log.debug(`${this.name} is running on ${firmwareVersion}`)
				that.power = firmwareVersion >= '2.0.0' ? statusObject.power.watts : statusObject.power

				this.updateState()
			});
		}).on("error", (err) => {
			console.log('Could not connect to ' + this.name);
		});
	}

	updateState() {
		let currentState = (this.power > this.threshold)
			
		// if the current state is different than the one that has been pulled before
		// we are "soft updating" (without persisting) the state and start the timer
		if ( this.lastPullState != currentState ) {
			this.lastPullState = currentState
			this.lastStateChange = new Date().getTime()
		}

		let secSinceChange = parseInt( (new Date().getTime() - this.lastStateChange) / 1000)
		let persistedState = this.sensorService.getCharacteristic(Characteristic.ContactSensorState).value

		this.log.debug(`Pulled state: ${this.power}W (${currentState ? 'ON' : 'OFF'} since ${secSinceChange}s) | Persisted state: ${persistedState ? 'ON' : 'OFF'} | Thresholds: ${this.minimumTime}s / ${this.threshold}W`)
		
		// if the state is still different after <minimumTime> seconds we are going to persist the state
		if (persistedState != currentState && secSinceChange >= this.minimumTime) {
			this.log.debug(`State change exceeded time threshold! Persisting new state: ${currentState ? 'ON' : 'OFF'}`)
			this.sensorService.getCharacteristic(Characteristic.ContactSensorState).updateValue(currentState)
		}
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
