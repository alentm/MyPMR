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
      statusText.textContent = `✅ Connected to ${device.name || device.id}`;

      const glucoseService = await server.getPrimaryService('glucose');
      const glucoseChar = await glucoseService.getCharacteristic('glucose_measurement');

      await glucoseChar.startNotifications();
      glucoseChar.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        const flags = value.getUint8(0);

        const hasTimeOffset = (flags & 0x01) > 0;
        const hasTypeSampleLocation = (flags & 0x04) > 0;
        const unitsAreMmol = (flags & 0x02) > 0;

        const sequenceNumber = value.getUint16(1, true);
        let offset = 3 + 7; // After flags + sequence + base time

        if (hasTimeOffset) offset += 2;

        // Use corrected SFloat parser
        const glucoseConcentration = parseSFloat16(value, offset);
        offset += 2;

        let unit = unitsAreMmol ? "mmol/L" : "mg/dL";
        const displayValue = unitsAreMmol
          ? (glucoseConcentration * 18.0182).toFixed(2) + " mg/dL"
          : glucoseConcentration.toFixed(2) + " mg/dL";

        dataDisplay.innerHTML += `
          <p><strong>New Glucose Reading:</strong><br />
          Sequence #: ${sequenceNumber}<br />
          Glucose: ${displayValue}</p>
        `;
      });

      const racpChar = await glucoseService.getCharacteristic('record_access_control_point');
      await racpChar.startNotifications();
      racpChar.addEventListener('characteristicvaluechanged', (event) => {
        const val = new Uint8Array(event.target.value.buffer);
        console.log('RACP Response:', val);
        dataDisplay.innerHTML += `<p><strong>RACP Response:</strong> ${Array.from(val).join(', ')}</p>`;
      });

      // Request all historical records
      await racpChar.writeValue(Uint8Array.from([0x01, 0x01])); // Report all stored records

    } catch (error) {
      console.error(error);
      statusText.textContent = `⚠️ Error: ${error.message}`;
    }
  });

  // IEEE-11073 16-bit SFLOAT decoder
  function parseSFloat16(dataView, offset) {
    const raw = dataView.getUint16(offset, true);
    let mantissa = raw & 0x0FFF;
    let exponent = raw >> 12;

    if (exponent >= 0x0008) exponent = exponent - 0x10; // Signed 4-bit exponent
    if (mantissa >= 0x0800) mantissa = mantissa - 0x1000; // Signed 12-bit mantissa

    return mantissa * Math.pow(10, exponent);
  }
};
