# homebridge-laundrify

Simple homebridge ContactSensor plugin for homebridge.


## Configuration
Simply put this in the accessories array of your config.json:

    {
            "accessory": "laundrify",
            "name": "NAME OF YOUR DEVICE",
            "ipAddress": "IP ADDRESS",
            "threshold": POWER_LEVEL_THRESHOLD,
            "interval": INTERVAL_IN_MS
    }
and adjust the values accordingly.