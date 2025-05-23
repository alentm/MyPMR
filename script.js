import { saveToFirebase } from './firebase-logic.js';

const glucoseReadings = [];
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
      statusText.textContent = `✅ Connected to ${device.name || device.id}`
      
      const glucoseService = await server.getPrimaryService('glucose');
      const glucoseChar = await glucoseService.getCharacteristic('glucose_measurement');

      await glucoseChar.startNotifications();
      glucoseChar.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        const rawBytes = new Uint8Array(value.buffer);
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
        glucoseReadings.push({
          sequenceNumber,
          timestamp,
          glucose,
          rawBytes: Array.from(rawBytes)
        });
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
        dataDisplay.innerHTML += `<p><strong>RACP Response:</strong> ${Array.from(val).join(', ')}</p>`;
      });

      await racpChar.writeValue(Uint8Array.from([0x01, 0x01])); // Request all records

      setTimeout(async ()=> {
        // Log readable characteristics
        await logAllReadableCharacteristics(device, server, glucoseReadings);
      }, 3000);

    } catch (error) {
      console.error(error);
      statusText.textContent = `⚠️ Error: ${error.message}`;
    }
  });
};

// Logs all readable characteristics with UUID names and raw values
async function logAllReadableCharacteristics(device, server, glucoseReadings) {
  const services = await server.getPrimaryServices();
  const logData = {
    deviceId: device.id,
    deviceName: device.name || "Unknown Device",
    timestamp: new Date().toISOString(),
    glucoseReadings: glucoseReadings
  };

  console.log('=== BLE Device Dump ===');
  console.log(JSON.stringify(logData, null, 2));
  
  await saveToFirebase('glucose_monitor', logData);
  return logData; // In case you want to use it elsewhere
}
