function initTrackStudents() {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const students = users.filter((u) => u.role === "student");

  const select = document.getElementById("student-select");
  const nameDisplay = document.getElementById("student-name");
  const chartSection = document.getElementById("student-charts");

  // Clear existing options
  select.innerHTML = `<option value="">-- Choose a student --</option>`;

  // Populate dropdown
  students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student.id;
    option.textContent = student.username || "Unnamed";
    select.appendChild(option);
  });

  let studentChart;

  select.addEventListener("change", () => {
    const selectedId = select.value;
    const student = students.find((s) => s.id === selectedId);
    if (!student) {
      chartSection.style.display = "none";
      return;
    }

    // Set title
    nameDisplay.textContent = `${student.username}'s Progress`;
    chartSection.style.display = "block";

    // Render Chart
    const ctx = document.getElementById("track-student-chart").getContext("2d");
    const data = {
      labels: ["Points", "Projects", "Attendance (Week)", "Attendance (Month)"],
      datasets: [
        {
          label: "Performance Metrics",
          data: [
            student.points ?? 0,
            student.projectsDone ?? 0,
            student.attendanceWeek ?? 0,
            student.attendanceMonth ?? 0,
          ],
          backgroundColor: ["#1a9fff", "#17c964", "#f5a623", "#d14c32"],
          borderRadius: 6,
        },
      ],
    };

    const config = {
      type: "bar",
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: "#fff",
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#fff",
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#fff",
            },
          },
        },
      },
    };

    if (studentChart) studentChart.destroy(); // destroy old chart
    studentChart = new Chart(ctx, config);
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", initTrackStudents);
