let Service, Characteristic

let timer = require('timer')
let request = require('request-promise')

let isPolling = false

module.exports = (homebridge) => {
    Service = homebridge.hap.Service
    Characteristic = homebridge.hap.Characteristic
    homebridge.registerAccessory('homebridge-commax-switch', 'CommaxSwitch', CommaxSwitchAccessory)
}

function CommaxSwitchAccessory(log, config) {
    this.log = log
    this.config = config
    this.commax_ip = config.commax_ip
    this.home_ip = config.home_ip
    this.device = config.device
    this.device_id = config.device_id
    this.interval = config.interval || 1000
    this.manufacturer = config.manufacturer || "DefaultManufacturer"
    this.model = config.model || "DefaultModel"
    this.serialnumber = config.serialnumber || "DefaultSerialnumber"
    this.service = new Service.Switch(this.config.name)
    let that = this
    // 주기적으로 스위치의 현재 상태 값을 가져옴
    function check() {
        // 주기적으로 가져오는 상태 값으로 스위치의 상태를 변경하지 않기 위해 isPolling boolean 을 사용함
        // 스위치를 On 또는 Off 할때 주기적으로 가져오는 상태 값이 동기화가 안되어 엉뚱하게 동작하는 것을 방지함
        const state_options = {
            uri: `http://${that.commax_ip}/center/state_device.php`,
            qs: {
                dev_name: that.device,
                sel_no: that.device_id,
                h_ip: that.home_ip
            }
        }
        request(state_options)
            .then(
                (html) => {
                    // console.log(html)
                    if (html.includes('On') || html.includes('Open')) {
                        isPolling = true
                        that.service.getCharacteristic(Characteristic.On)
                            .setValue(1)
                    } else {
                        isPolling = true
                        that.service.getCharacteristic(Characteristic.On)
                            .setValue(0)
                    }
                    isPolling = false
                }
            )
            .catch(
                (err) => console.error(err)
            )
        timer.timer(that.interval, check)
    }
    check()
}

CommaxSwitchAccessory.prototype.getServices = function() {
    this.informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
        .setCharacteristic(Characteristic.Model, this.model)
        .setCharacteristic(Characteristic.SerialNumber, this.serialnumber)
    this.service.getCharacteristic(Characteristic.On)
        .on('get', this.getOnCharacteristicHandler.bind(this))
        .on('set', this.setOnCharacteristicHandler.bind(this))
    return [this.informationService, this.service]
}

CommaxSwitchAccessory.prototype.getOnCharacteristicHandler = function(cb) {
    cb(null, this.isOn)
}

CommaxSwitchAccessory.prototype.setOnCharacteristicHandler = function(value, cb) {
    this.isOn = value
    if (value == true) {
        // 주기적으로 가져온 상태 값이 아닌 악세서리 버튼을 눌렀을때 장비로 명령을 보냄
        if (isPolling == false) {
            // console.log("ON")
            const on_options = {
                uri: `http://${this.commax_ip}/center/${this.device}_action_device.php`,
                qs: {
                    dev_name: this.device,
                    sel_no: this.device_id,
                    h_ip: this.home_ip,
                    action: "ON"
                }
            }
            request(on_options)
                .then(
                    // (html) => console.log(html)
                )
                .catch(
                    (err) => console.error(err)
                )
        }
    } else {
        // 주기적으로 가져온 상태 값이 아닌 악세서리 버튼을 눌렀을때 장비로 명령을 보냄
        if (isPolling == false) {
            // console.log("OFF")
            const off_options = {
                uri: `http://${this.commax_ip}/center/${this.device}_action_device.php`,
                qs: {
                    dev_name: this.device,
                    sel_no: this.device_id,
                    h_ip: this.home_ip,
                    action: "OFF"
                }
            }
            request(off_options)
                .then(
                    // (html) => console.log(html)
                )
                .catch(
                    (err) => console.error(err)
                )
        }
    }
    isPolling = false
    cb(null, this.isOn)
}