window.onload = function () {
  const connectButton = document.getElementById('connect');
  const statusText = document.getElementById('status');
  const dataDisplay = document.getElementById('data');

  if (!navigator.bluetooth) {
    statusText.textContent = '❌ Web Bluetooth is not supported on this device or browser.';
    connectButton.disabled = true;
    return;
  }

  connectButton.addEventListener('click', async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['glucose'] }],
        optionalServices: ['battery_service', 'device_information']
      });

      statusText.textContent = `🔗 Connecting to ${device.name || device.id}...`;
      const server = await device.gatt.connect();
      await logAllReadableCharacteristics(server);
      statusText.textContent = `✅ Connected to ${device.name || device.id}`;

      // NEW: Log all services and characteristics
      const knownUUIDs = {
  // Services
  "0000180a-0000-1000-8000-00805f9b34fb": "Device Information",
  "00001808-0000-1000-8000-00805f9b34fb": "Glucose",
  "0000180f-0000-1000-8000-00805f9b34fb": "Battery Service",

  // Characteristics
  "00002a23-0000-1000-8000-00805f9b34fb": "System ID",
  "00002a24-0000-1000-8000-00805f9b34fb": "Model Number",
  "00002a25-0000-1000-8000-00805f9b34fb": "Serial Number",
  "00002a26-0000-1000-8000-00805f9b34fb": "Firmware Revision",
  "00002a27-0000-1000-8000-00805f9b34fb": "Hardware Revision",
  "00002a28-0000-1000-8000-00805f9b34fb": "Software Revision",
  "00002a29-0000-1000-8000-00805f9b34fb": "Manufacturer Name",
  "00002a2a-0000-1000-8000-00805f9b34fb": "IEEE 11073-20601 Regulatory Certification Data List",
  "00002a50-0000-1000-8000-00805f9b34fb": "PnP ID",
  "00002a08-0000-1000-8000-00805f9b34fb": "Date Time",
  "00002a18-0000-1000-8000-00805f9b34fb": "Glucose Measurement",
  "00002a34-0000-1000-8000-00805f9b34fb": "Glucose Measurement Context",
  "00002a51-0000-1000-8000-00805f9b34fb": "Glucose Feature",
  "00002a52-0060-1000-8000-00805f9b34fb": "Record Access Control Point",
  "00002a19-0000-1000-8000-00805f9b34fb": "Battery Level"
};

function getUUIDName(uuid) {
  const baseUUID = uuid.toLowerCase();
  return knownUUIDs[baseUUID] || null;
}

async function logAllReadableCharacteristics(server) {
  const services = await server.getPrimaryServices();
  const logData = [];

  for (const service of services) {
    const serviceName = getUUIDName(service.uuid);
    const characteristics = await service.getCharacteristics();

    const serviceEntry = {
      serviceUUID: service.uuid,
      serviceName: serviceName || "Unknown Service",
      characteristics: []
    };

    for (const char of characteristics) {
      const charName = getUUIDName(char.uuid);
      if (char.properties.read) {
        try {
          const value = await char.readValue();
          const rawBytes = Array.from(new Uint8Array(value.buffer));
          const decoded = new TextDecoder().decode(value.buffer).trim();

          serviceEntry.characteristics.push({
            characteristicUUID: char.uuid,
            characteristicName: charName || "Unknown Characteristic",
            rawValue: rawBytes,
            decodedValue: decoded || null
          });
        } catch (err) {
          serviceEntry.characteristics.push({
            characteristicUUID: char.uuid,
            characteristicName: charName || "Unknown Characteristic",
            rawValue: [],
            decodedValue: null,
            error: err.message
          });
        }
      } else {
        serviceEntry.characteristics.push({
          characteristicUUID: char.uuid,
          characteristicName: charName || "Unknown Characteristic",
          rawValue: null,
          decodedValue: null,
          note: 'Not readable'
        });
      }
    }

    logData.push(serviceEntry);
  }

  console.log('=== BLE Device Dump (With Names) ===');
  console.log(JSON.stringify(logData, null, 2));
}
      
      const glucoseService = await server.getPrimaryService('glucose');
      const glucoseChar = await glucoseService.getCharacteristic('glucose_measurement');

      await glucoseChar.startNotifications();
      glucoseChar.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        console.log('Raw value:', value);
        const rawBytes = new Uint8Array(value.buffer);
        console.log('Raw Glucose Data Bytes:', rawBytes);
        dataDisplay.innerHTML += `<p><strong>Raw Bytes:</strong> ${Array.from(rawBytes).join(', ')}</p>`;

        const sequenceNumber = value.getUint16(1, true);
        const year = value.getUint16(3, true);
        const month = value.getUint8(5);
        const day = value.getUint8(6);
        const hours = value.getUint8(7);
        const minutes = value.getUint8(8);
        const seconds = value.getUint8(9);
        const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const glucose = value.getUint8(12); // directly in mg/dL

        dataDisplay.innerHTML += `
          <p><strong>New Glucose Reading:</strong><br />
          Sequence #: ${sequenceNumber}<br />
          Time: ${timestamp}<br />
          Glucose: ${glucose} mg/dL</p>
        `;
      });

      const racpChar = await glucoseService.getCharacteristic('record_access_control_point');
      await racpChar.startNotifications();
      racpChar.addEventListener('characteristicvaluechanged', (event) => {
        const val = new Uint8Array(event.target.value.buffer);
        console.log('RACP Response:', val);
        dataDisplay.innerHTML += `<p><strong>RACP Response:</strong> ${Array.from(val).join(', ')}</p>`;
      });

      await racpChar.writeValue(Uint8Array.from([0x01, 0x01])); // Request all records

    } catch (error) {
      console.error(error);
      statusText.textContent = `⚠️ Error: ${error.message}`;
    }
  });
};
