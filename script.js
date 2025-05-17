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
      async function logAllReadableCharacteristics(server) {
  const services = await server.getPrimaryServices();
  const logData = [];

  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    const serviceEntry = {
      serviceUUID: service.uuid,
      characteristics: []
    };

    for (const char of characteristics) {
      if (char.properties.read) {
        try {
          const value = await char.readValue();
          const rawBytes = Array.from(new Uint8Array(value.buffer));
          const decoded = new TextDecoder().decode(value.buffer).trim();

          serviceEntry.characteristics.push({
            characteristicUUID: char.uuid,
            rawValue: rawBytes,
            decodedValue: decoded || null
          });
        } catch (err) {
          serviceEntry.characteristics.push({
            characteristicUUID: char.uuid,
            rawValue: [],
            decodedValue: null,
            error: err.message
          });
        }
      } else {
        serviceEntry.characteristics.push({
          characteristicUUID: char.uuid,
          rawValue: null,
          decodedValue: null,
          note: 'Not readable'
        });
      }
    }

    logData.push(serviceEntry);
  }

  console.log('=== Full BLE Device Characteristic Dump ===');
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
