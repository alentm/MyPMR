async function connectToDevice() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [0x1808, 'battery_service']
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(0x1808);
    const characteristic = await service.getCharacteristic(0x2A18);

    await characteristic.startNotifications();

    characteristic.addEventListener('characteristicvaluechanged', event => {
      const value = event.target.value;

      let rawGlucose = value.getUint8(12);
      let glucose = rawGlucose < 40 ? rawGlucose * 11 : rawGlucose;

      const year = value.getUint16(3, true);
      const month = value.getUint8(5);
      const day = value.getUint8(6);
      const hours = value.getUint8(7);
      const minutes = value.getUint8(8);
      const seconds = value.getUint8(9);

      const timestamp = new Date(year, month - 1, day, hours, minutes, seconds);
      const formattedTime = timestamp.toLocaleString();

      glucoseData.push({
        serial: serial++,
        value: glucose,
        timestamp: formattedTime
      });

      updateTable();
      updateChart();
    });

    document.getElementById("data-table").insertAdjacentHTML("beforebegin", "<p>Connected. Waiting for data...</p>");

  } catch (error) {
    alert("Error: " + error.message);
  }
}
