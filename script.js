let glucoseData = [];
let chart;
let serial = 1;

async function connectToDevice() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [0x1808] }],
      optionalServices: ['battery_service']
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
    alert("Connection failed: " + error.message);
  }
}

function updateTable() {
  const tbody = document.querySelector("#data-table tbody");
  tbody.innerHTML = "";

  glucoseData.forEach(entry => {
    const row = `<tr>
      <td>${entry.serial}</td>
      <td>${entry.value}</td>
      <td>${entry.timestamp}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

function updateChart() {
  const labels = glucoseData.map(entry => entry.timestamp);
  const values = glucoseData.map(entry => entry.value);

  if (!chart) {
    const ctx = document.getElementById("glucoseChart").getContext("2d");
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Glucose Level (mg/dL)",
          data: values,
          fill: false,
          borderColor: "#4CAF50",
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "#4CAF50"
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Time"
            }
          },
          y: {
            title: {
              display: true,
              text: "mg/dL"
            },
            beginAtZero: false
          }
        }
      }
    });
  } else {
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
  }
}
