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
      await logAllCharacteristics(server);
      statusText.textContent = `✅ Connected to ${device.name || device.id}`;

      // NEW: Log all services and characteristics
      async function logDeviceAndGlucoseCharacteristicsToJSON(server) {
  const knownServices = {
    'device_information': {
      name: 'Device Information',
      characteristics: {
        '00002a23-0000-1000-8000-00805f9b34fb': 'System ID',
        '00002a24-0000-1000-8000-00805f9b34fb': 'Model Number',
        '00002a26-0000-1000-8000-00805f9b34fb': 'Firmware Revision',
        '00002a27-0000-1000-8000-00805f9b34fb': 'Hardware Revision',
        '00002a28-0000-1000-8000-00805f9b34fb': 'Software Revision',
        '00002a29-0000-1000-8000-00805f9b34fb': 'Manufacturer Name',
        '00002a2a-0000-1000-8000-00805f9b34fb': 'IEEE Regulatory Cert',
        '00002a50-0000-1000-8000-00805f9b34fb': 'PnP ID'
      }
    },
    'glucose': {
      name: 'Glucose Service',
      characteristics: {
        '00002a18-0000-1000-8000-00805f9b34fb': 'Glucose Measurement',
        '00002a34-0000-1000-8000-00805f9b34fb': 'Glucose Measurement Context',
        '00002a51-0000-1000-8000-00805f9b34fb': 'Glucose Feature',
        '00002a52-0000-1000-8000-00805f9b34fb': 'Record Access Control Point'
      }
    }
  };

  const logData = [];

  for (const [serviceUUID, serviceInfo] of Object.entries(knownServices)) {
    try {
      const service = await server.getPrimaryService(serviceUUID);
      const characteristics = await service.getCharacteristics();
      const serviceEntry = {
        serviceUUID,
        serviceName: serviceInfo.name,
        characteristics: []
      };

      for (const char of characteristics) {
        const charName = serviceInfo.characteristics[char.uuid] || 'Unknown Characteristic';
        let raw = [];
        let decoded = null;

        if (char.properties.read) {
          try {
            const value = await char.readValue();
            raw = Array.from(new Uint8Array(value.buffer));
            const decodedText = new TextDecoder().decode(value.buffer).trim();
            if (decodedText) decoded = decodedText;
          } catch (e) {
            console.warn(`Could not read ${charName}:`, e);
          }
        }

        serviceEntry.characteristics.push({
          characteristicUUID: char.uuid,
          name: charName,
          rawValue: raw,
          decodedValue: decoded
        });
      }

      logData.push(serviceEntry);
    } catch (err) {
      console.warn(`Could not read service ${serviceUUID}`, err);
    }
  }

  console.log('=== BLE Device JSON Dump ===');
  console.log(JSON.stringify(logData, null, 2)); // Pretty printed
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
