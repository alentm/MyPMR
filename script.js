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
        const rawBytes = new Uint8Array(value.buffer);
        console.log('Raw Glucose Data Bytes:', rawBytes);
        dataDisplay.innerHTML += `<p><strong>Raw Bytes:</strong> ${Array.from(rawBytes).join(', ')}</p>`;

        const flags = value.getUint8(0);
        const hasTimeOffset = (flags & 0x01) > 0;
        const unitsAreMmol = (flags & 0x02) > 0;
        const hasGlucoseConcentration = (flags & 0x04) > 0;

        const sequenceNumber = value.getUint16(1, true);
        let offset = 3 + 7; // 1 flag + 2 sequence number + 7 base time

        if (hasTimeOffset) offset += 2;

        if (!hasGlucoseConcentration) {
          dataDisplay.innerHTML += `<p><strong>No Glucose Value Present</strong></p>`;
          return;
        }

        const glucoseConcentration = parseSFloat16(value, offset);
        offset += 2;
        const typeSample = value.getUint8(offset);

        const displayValue = unitsAreMmol
          ? (glucoseConcentration * 18.0182).toFixed(2) + " mg/dL"
          : glucoseConcentration.toFixed(2) + " mg/dL";

        dataDisplay.innerHTML += `
          <p><strong>New Glucose Reading:</strong><br />
          Sequence #: ${sequenceNumber}<br />
          Glucose: ${displayValue}<br />
          Type/Sample: ${typeSample}</p>
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

  function parseSFloat16(dataView, offset) {
    const raw = dataView.getUint16(offset, true);
    let mantissa = raw & 0x0FFF;
    let exponent = raw >> 12;

    if (exponent >= 0x0008) exponent -= 0x10;
    if (mantissa >= 0x0800) mantissa -= 0x1000;

    return mantissa * Math.pow(10, exponent);
  }
};
