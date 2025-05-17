document.addEventListener('DOMContentLoaded', () => {
  const connectButton = document.getElementById('connect');
  const statusText = document.getElementById('status');

  // Check if Web Bluetooth is supported
  if (!navigator.bluetooth) {
    statusText.textContent = 'Web Bluetooth is not supported on this device or browser.';
    connectButton.disabled = true;
    connectButton.style.backgroundColor = '#999';
    return;
  }

  connectButton.addEventListener('click', async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });

      statusText.textContent = `Connecting to ${device.name || device.id}...`;

      const server = await device.gatt.connect();
      statusText.textContent = `Connected to ${device.name || device.id}`;

      const service = await server.getPrimaryService('battery_service');
      const characteristic = await service.getCharacteristic('battery_level');
      const value = await characteristic.readValue();
      const batteryLevel = value.getUint8(0);

      statusText.textContent += ` | Battery Level: ${batteryLevel}%`;

    } catch (error) {
      console.error(error);
      statusText.textContent = `Error: ${error.message}`;
    }
  });
});
