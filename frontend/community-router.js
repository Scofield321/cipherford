import { loadCommunitySection } from "./community.js";

export async function initCommunityRouter() {
  const section = document.getElementById("community-section");
  if (!section) return;

  // Show this section, hide others
  section.style.display = "block";
  document.querySelectorAll(".dashboard-section").forEach((sec) => {
    if (sec.id !== "community-section") sec.style.display = "none";
  });

  // -----------------------------
  // Tabs
  // -----------------------------
  const tabs = section.querySelectorAll(".community-nav a.tab-link");
  const tabContentMap = {
    qa: section.querySelector("#community-qa"),
    puzzles: section.querySelector("#community-puzzles"),
    "admin-posts": section.querySelector("#community-admin-posts"),
    leaderboard: section.querySelector("#community-leaderboard"),
    "pending-posts": section.querySelector("#pending-posts-section"),
  };

  async function showTab(tab) {
    const selectedTab = tab.dataset.tab;

    // Toggle active class
    Object.entries(tabContentMap).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle("active", key === selectedTab);
    });

    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    // Load data for the active tab only
    try {
      await loadCommunitySection(selectedTab);
    } catch (err) {
      console.error(`Failed to load ${selectedTab}:`, err);
    }
  }

  // Attach tab click events
  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      showTab(tab);
    });
  });

  // Default tab
  if (tabs.length > 0) showTab(tabs[0]);

  // -----------------------------
  // Quiz button and submission
  // -----------------------------
  function bindQuizButtons() {
    const puzzlesSection = section.querySelector("#community-puzzles");
    if (!puzzlesSection) return;

    const quizBtn = puzzlesSection.querySelector(".quiz-btn");
    const quizForm = puzzlesSection.querySelector("#quiz-form");
    const submitBtn = puzzlesSection.querySelector("#submit-quiz");
    const answerInput = puzzlesSection.querySelector("#quiz-answer");

    if (!quizBtn || !quizForm || !submitBtn || !answerInput) return;

    // Remove old listeners by cloning
    const freshQuizBtn = quizBtn.cloneNode(true);
    const freshSubmitBtn = submitBtn.cloneNode(true);

    quizBtn.replaceWith(freshQuizBtn);
    submitBtn.replaceWith(freshSubmitBtn);

    // Show quiz form
    freshQuizBtn.addEventListener("click", () => {
      quizForm.style.display = "block";
      freshQuizBtn.style.display = "none";
    });

    // Submit answer
    freshSubmitBtn.addEventListener("click", async () => {
      const quizId = document.getElementById("puzzle-question").dataset.quizId;
      const answer = answerInput.value.trim();
      if (!answer) return alert("Please enter your answer");

      try {
        const res = await fetch(`/quizzes/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ quizId, answer }),
        });

        const data = await res.json();
        if (res.ok) alert("Answer submitted successfully!");
        else alert(data.error || "Failed to submit answer");
        answerInput.value = "";
      } catch (err) {
        console.error("Quiz submission error:", err);
        alert("Failed to submit answer");
      }
    });
  }

  // Re-bind quiz buttons every time quizzes tab is loaded
  section.addEventListener("quizzes-loaded", bindQuizButtons);

  console.log("Community router initialized");
}
