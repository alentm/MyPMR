document.getElementById('connect').addEventListener('click', async () => {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['battery_service']
    });

    document.getElementById('status').textContent = `Connecting to ${device.name || device.id}...`;

    const server = await device.gatt.connect();
    document.getElementById('status').textContent = `Connected to ${device.name || device.id}`;

    const service = await server.getPrimaryService('battery_service');
    const characteristic = await service.getCharacteristic('battery_level');
    const value = await characteristic.readValue();
    const batteryLevel = value.getUint8(0);

    document.getElementById('status').textContent += ` | Battery Level: ${batteryLevel}%`;

  } catch (error) {
    console.error(error);
    document.getElementById('status').textContent = `Error: ${error.message}`;
  }
});
