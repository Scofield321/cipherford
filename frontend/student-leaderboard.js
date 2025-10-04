import { Session } from "./session.js";
import { BASE_URL } from "./config.js";
export async function fetchAndRenderLeaderboard() {
  const token = Session.token();
  const loader = document.getElementById("leaderboard-loader");
  loader.style.display = "block";
  const tableBody = document.querySelector("#leaderboard-table tbody");
  // this is just for testing
  try {
    const res = await fetch(`${BASE_URL}/students/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const leaderboard = await res.json();
    loader.style.display = "none";
    if (!leaderboard.length) {
      tableBody.innerHTML = "<tr><td colspan='6'>No students found</td></tr>";
      return;
    }

    tableBody.innerHTML = leaderboard
      .map((student, index) => {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${student.first_name}</td>
            <td>${student.last_name}</td>
            <td>${student.points ?? 0}</td>
            <td>${student.level ?? 0}</td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Leaderboard error:", err);
    loader.style.display = "none";
    tableBody.innerHTML =
      "<tr><td colspan='6'>Failed to load leaderboard</td></tr>";
  }
}
