async function connectToDevice() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['health_thermometer'] }],
      optionalServices: ['battery_service', 0x1808] // Glucose Service
    });

    const server = await device.gatt.connect();

    const service = await server.getPrimaryService(0x1808); // Glucose Service
    const characteristic = await service.getCharacteristic(0x2A18); // Glucose Measurement

    await characteristic.startNotifications();

    characteristic.addEventListener('characteristicvaluechanged', (event) => {
      const value = event.target.value;

      // Extract glucose raw byte
      let rawGlucose = value.getUint8(12);
      let glucose;

      // Decide whether to apply multiplier
      if (rawGlucose < 40) {
        glucose = rawGlucose * 11;
      } else {
        glucose = rawGlucose;
      }

      // Extract timestamp
      const year = value.getUint16(3, true);
      const month = value.getUint8(5);
      const day = value.getUint8(6);
      const hours = value.getUint8(7);
      const minutes = value.getUint8(8);
      const seconds = value.getUint8(9);

      const timestamp = new Date(year, month - 1, day, hours, minutes, seconds);

      document.getElementById("output").innerHTML = `
        <p><strong>Glucose:</strong> ${glucose} mg/dL</p>
        <p><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
      `;
    });

    document.getElementById("output").innerHTML = `<p>Connected. Waiting for data...</p>`;

  } catch (error) {
    document.getElementById("output").innerHTML = `<p>Error: ${error.message}</p>`;
  }
}
