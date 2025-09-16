function loadParentsTable() {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const parents = users.filter((u) => u.role === "parent");

  const tbody = document.querySelector(".parents-table tbody");
  tbody.innerHTML = ""; // Clear existing rows

  parents.forEach((parent, index) => {
    // Get linked children names
    const childIds =
      parent.childIds || (parent.childId ? [parent.childId] : []);
    const children =
      childIds
        .map((id) => users.find((u) => u.id === id && u.role === "student"))
        .filter(Boolean)
        .map((c) => c.username)
        .join(", ") || "No children";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${parent.username || "Unnamed"}</td>
      <td>${parent.email}</td>
      <td>${children}</td>
      <td>${parent.wechat || "-"}</td>
      <td>${parent.active === false ? "Inactive" : "Active"}</td>
      <td>
        <button class="btn-small delete" data-id="${parent.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Action buttons
  tbody.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parentId = btn.dataset.id;
      if (confirm("Are you sure you want to delete this parent?")) {
        const remaining = users.filter((u) => u.id !== parentId);
        localStorage.setItem("users", JSON.stringify(remaining));
        loadParentsTable();
      }
    });
  });

  tbody.querySelectorAll(".edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parentId = btn.dataset.id;
      alert(`Edit functionality for parent ID: ${parentId} coming soon.`);
    });
  });

  tbody.querySelectorAll(".view").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parentId = btn.dataset.id;
      alert(`View details for parent ID: ${parentId} coming soon.`);
    });
  });
}

// Search Functionality
const searchInput = document.getElementById("parent-search");
searchInput?.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const rows = document.querySelectorAll(".parents-table tbody tr");
  rows.forEach((row) => {
    const name = row.children[1].textContent.toLowerCase();
    const email = row.children[2].textContent.toLowerCase();
    if (name.includes(query) || email.includes(query)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
});

// Reactivity: update table if localStorage changes
window.addEventListener("storage", (event) => {
  if (event.key === "users") loadParentsTable();
});
