import { Session } from "./session.js";
import { BASE_URL } from "./config.js";

// ==============================
// Utility to fetch with auth token
// ==============================
const fetchWithAuth = async (url, options = {}) => {
  const token = Session.token();
  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

// ==============================
// Load all community posts (Q&A)
// ==============================
export const loadCommunityPosts = async () => {
  try {
    const posts = await fetchWithAuth(`${BASE_URL}/student/community/posts`);
    const postsContainer = document.getElementById("community-qa-posts");
    postsContainer.innerHTML = "";

    posts.forEach((post) => {
      const postDiv = document.createElement("div");
      postDiv.classList.add("qa-card");

      postDiv.innerHTML = `
        <h4 class="qa-title">${post.title}</h4>
        <p>${post.body}</p>

        <div class="qa-meta">
          <span class="qa-author">${
            post.first_name || post.last_name || post.username || "Anonymous"
          }</span>
          <span class="qa-date">${new Date(
            post.created_at
          ).toLocaleString()}</span>
        </div>

        <button onclick="loadAnswers('${post.id}')">View Answers</button>
        <div id="answers-${post.id}" class="answers-section"></div>

        <textarea id="answer-input-${
          post.id
        }" placeholder="Your answer" rows="5"></textarea>
        <button onclick="submitAnswer('${post.id}')">Submit</button>
      `;

      postsContainer.appendChild(postDiv);
    });
  } catch (err) {
    console.error("Error loading community posts:", err);
  }
};

// 🧠 Loader-enhanced loadAnswers
window.loadAnswers = async (postId) => {
  const answersDiv = document.getElementById(`answers-${postId}`);

  // Show loader
  answersDiv.innerHTML = `
    <div class="loader"></div>
  `;

  try {
    // Optional: simulate delay for testing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const answers = await fetchWithAuth(
      `${BASE_URL}/student/community/answers/${postId}`
    );

    if (!answers || answers.length === 0) {
      answersDiv.innerHTML = `<p style="text-align:center; color:#aaa;">No answers yet.</p>`;
      return;
    }

    answersDiv.innerHTML = answers
      .map(
        (ans) => `
        <div class="answer-card">
          <p>${ans.body}</p>
          <div class="qa-meta">
            <span class="qa-author">${
              ans.first_name || ans.last_name || ans.username || "Anonymous"
            }</span>
            <span class="qa-date">${new Date(
              ans.created_at
            ).toLocaleString()}</span>
          </div>
        </div>
      `
      )
      .join("");
  } catch (err) {
    console.error("Error loading answers:", err);
    answersDiv.innerHTML = `<p style="color:red; text-align:center;">Failed to load answers.</p>`;
  }
};

// Initialize Ask Question button + form logic
export const setupAskQuestionFeature = () => {
  const askBtn = document.getElementById("ask-question-btn");
  const formSection = document.getElementById("submit-question-section");
  const form = document.getElementById("submit-question-form");
  const cancelBtn = document.getElementById("cancel-question");

  if (!askBtn || !form || !cancelBtn) {
    console.warn("Ask question elements missing in DOM");
    return;
  }

  // Show form when "Ask Question" clicked
  askBtn.addEventListener("click", () => {
    formSection.style.display = "block";
    askBtn.style.display = "none";
  });

  // Hide form when "Cancel" clicked
  cancelBtn.addEventListener("click", () => {
    formSection.style.display = "none";
    askBtn.style.display = "inline-block";
    form.reset();
  });

  // Handle question submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("question-title-input").value.trim();
    const body = document.getElementById("question-body-input").value.trim();

    if (!title || !body) return alert("Please fill out all fields.");

    try {
      const res = await fetchWithAuth(`${BASE_URL}/student/community/posts`, {
        method: "POST",
        body: JSON.stringify({ title, body, type: "question" }),
      });

      alert(res.message || "Question posted successfully!");
      form.reset();
      formSection.style.display = "none";
      askBtn.style.display = "inline-block";

      // Reload community posts
      await loadCommunityPosts();
    } catch (err) {
      console.error("Error submitting question:", err);
      alert("Failed to submit question. Please try again.");
    }
  });
};

// ==============================
// Submit an answer to a post
// ==============================
export const submitAnswer = async (postId) => {
  try {
    const answerInput = document.getElementById(`answer-input-${postId}`);
    const answer = answerInput.value.trim();
    if (!answer) return alert("Please type an answer.");

    const res = await fetchWithAuth(`${BASE_URL}/student/community/answers`, {
      method: "POST",
      body: JSON.stringify({ post_id: postId, answer }),
    });

    alert(res.message);
    answerInput.value = "";
    loadAnswers(postId);
    loadLeaderboard();
  } catch (err) {
    console.error("Error submitting answer:", err);
  }
};

// ==============================
// Load answers for a post
// ==============================
export const loadAnswers = async (postId) => {
  try {
    const answers = await fetchWithAuth(
      `${BASE_URL}/student/community/posts/${postId}/answers`
    );
    const answersDiv = document.getElementById(`answers-${postId}`);
    answersDiv.innerHTML = answers
      .map((ans) => `<p><strong>${ans.first_name}:</strong> ${ans.answer}</p>`)
      .join("");
  } catch (err) {
    console.error("Error loading answers:", err);
  }
};

// ==============================
// Load leaderboard into table
// ==============================
export const loadLeaderboard = async () => {
  const tbody = document.querySelector("#community-leaderboard-table tbody");

  // Show loader first
  tbody.innerHTML = `
    <tr>
      <td colspan="5">
        <div id="leaderboard-loader" class="loader"></div>
      </td>
    </tr>
  `;

  try {
    const leaderboard = await fetchWithAuth(
      `${BASE_URL}/student/community/leaderboard`
    );

    if (!leaderboard || leaderboard.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:#aaa;">
            No leaderboard data available.
          </td>
        </tr>
      `;
      return;
    }

    // Render leaderboard rows
    tbody.innerHTML = leaderboard
      .map(
        (user) => `
        <tr>
          <td>${user.rank}</td>
          <td>${user.first_name} ${user.last_name}</td>
          <td>${user.xp}</td>
          <td>${user.level}</td>
          <td>
            <div style="background:#333; border-radius:4px; height:10px;">
              <div style="width:${user.progress}%; background:#00ffff; height:10px; border-radius:4px;"></div>
            </div>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:red;">
          Failed to load leaderboard. Please try again later.
        </td>
      </tr>
    `;
  }
};

// ==============================
// Load all quizzes
// ==============================

// Submit answer to an admin post
export const submitAdminAnswer = async (postId) => {
  try {
    const answerInput = document.getElementById(`admin-answer-${postId}`);
    const answer = answerInput.value.trim();
    if (!answer) return alert("Please type an answer.");

    const res = await fetchWithAuth(`${BASE_URL}/student/community/answers`, {
      method: "POST",
      body: JSON.stringify({ post_id: postId, answer }),
    });

    alert(res.message || "Answer submitted!");
    answerInput.value = ""; // Clear textarea

    // Reload answers below the post
    await loadAdminAnswers(postId);
  } catch (err) {
    console.error("Error submitting admin answer:", err);
  }
};

// Load all answers for an admin post
export const loadAdminAnswers = async (postId) => {
  try {
    const answers = await fetchWithAuth(
      `${BASE_URL}/student/community/posts/${postId}/answers`
    );

    const answersDiv = document.getElementById(`admin-answers-${postId}`);
    if (!answersDiv) return;

    answersDiv.innerHTML = answers
      .map(
        (ans) =>
          `<p class="qa-author"><strong>${
            ans.first_name || ans.username || "Student"
          }:</strong> ${ans.answer}</p>`
      )
      .join("");
  } catch (err) {
    console.error("Error loading admin answers:", err);
  }
};

// Load Admin Posts
export const loadAdminPosts = async () => {
  try {
    const posts = await fetchWithAuth(`${BASE_URL}/student/community/posts`);

    const container = document.getElementById("community-admin-posts");
    container.innerHTML = "";

    posts
      .filter((post) => post.type === "challenge" || post.type === "question")
      .forEach((post) => {
        const postDiv = document.createElement("div");
        postDiv.classList.add("admin-post-card");
        postDiv.innerHTML = `
          <h4 class="qa-title">${post.title}</h4>
          <p>${post.body}</p>
          
        <div class="qa-meta">
        <span class="qa-author">${
          post.first_name || post.last_name || post.username || "Anonymous"
        }</span>
          <span class="qa-date">${new Date(
            post.created_at
          ).toLocaleString()}</span>
        </div>
          <div id="admin-answers-${post.id}" class="admin-answers"></div>
          <textarea id="admin-answer-${
            post.id
          }" rows="4" placeholder="Type your answer here..."></textarea>
          <button id="admin-answer-btn-${post.id}">Submit Answer</button>
        `;
        container.appendChild(postDiv);

        // Load existing answers
        loadAdminAnswers(post.id);

        // Add click listener for submit
        const btn = document.getElementById(`admin-answer-btn-${post.id}`);
        btn.addEventListener("click", () => submitAdminAnswer(post.id));
      });
  } catch (err) {
    console.error("Error loading admin posts:", err);
  }
};

// ==============================
// Load quizzes one by one
// ==============================
export const loadQuizzes = async () => {
  console.log("🎯 Loading quizzes...");
  try {
    const container = document.getElementById("community-quiz-container");
    if (!container) return;

    // Show loader before fetching quizzes
    container.innerHTML = `
      <div id="quiz-loader" style="text-align:center; padding:2rem;">
        <div class="spinner" 
             style="border:4px solid #ccc; border-top:4px solid #00ffff; border-radius:50%; width:40px; height:40px; margin:auto; animation:spin 1s linear infinite;">
        </div>
        <p>Loading quizzes...</p>
      </div>
    `;

    // Add CSS spinner animation (in case not in your stylesheet)
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    const quizzes = await fetchWithAuth(
      `${BASE_URL}/student/community/quizzes`
    );

    if (!quizzes.length) {
      container.innerHTML = `<p style="text-align:center;">No puzzles available yet.</p>`;
      return;
    }

    let currentIndex = 0;

    const showQuiz = (quiz) => {
      // Show loader briefly before displaying each quiz
      container.innerHTML = `
        <div id="quiz-loader" style="text-align:center; padding:2rem;">
          <div class="spinner" 
               style="border:4px solid #ccc; border-top:4px solid #00ffff; border-radius:50%; width:40px; height:40px; margin:auto; animation:spin 1s linear infinite;">
          </div>
          <p>Loading next quiz...</p>
        </div>
      `;

      setTimeout(() => {
        container.innerHTML = "";

        const quizDiv = document.createElement("div");
        quizDiv.classList.add("quiz-card");
        quizDiv.innerHTML = `
          <h4>${quiz.question}</h4>
          <form id="quiz-form-${quiz.id}" class="quiz-form">
            ${quiz.options
              .map(
                (opt) => `
              <label>
                <input type="radio" name="quiz-${quiz.id}" value="${opt}"> ${opt}
              </label><br>`
              )
              .join("")}
            <button type="submit" class="quiz-submit-btn">Submit Answer</button>
          </form>
          <div id="quiz-result-${quiz.id}" class="quiz-result"></div>
        `;

        container.appendChild(quizDiv);

        const form = document.getElementById(`quiz-form-${quiz.id}`);

        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const selected = form.querySelector(
            `input[name="quiz-${quiz.id}"]:checked`
          );
          if (!selected) return alert("Please select an option.");

          await submitQuiz(quiz.id, selected.value);

          // Show loader for 2 seconds before moving to next quiz
          container.innerHTML = `
            <div id="quiz-loader" style="text-align:center; padding:2rem;">
              <div class="spinner" 
                   style="border:4px solid #ccc; border-top:4px solid #00ffff; border-radius:50%; width:40px; height:40px; margin:auto; animation:spin 1s linear infinite;">
              </div>
              <p>Loading next quiz...</p>
            </div>
          `;

          setTimeout(() => {
            currentIndex++;
            if (currentIndex < quizzes.length) {
              showQuiz(quizzes[currentIndex]);
            } else {
              container.innerHTML = `<p style="text-align:center; font-size:1.1rem;">🎉 Congratulations, you have completed all quizzes!</p>`;
            }
          }, 2000);
        });
      }, 1000); // brief delay for loader visibility
    };

    showQuiz(quizzes[currentIndex]);
  } catch (err) {
    console.error("❌ Error loading quizzes:", err);
    const container = document.getElementById("community-quiz-container");
    if (container)
      container.innerHTML = `<p style='color:red; text-align:center;'>Failed to load puzzles.</p>`;
  }
};

// ==============================
// Submit a quiz answer
// ==============================
export const submitQuiz = async (quizId, selectedOption) => {
  try {
    const token = Session.token();
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.userId || payload.id;

    const res = await fetchWithAuth(`${BASE_URL}/quizzes/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, userId, selectedOption }),
    });

    const resultDiv = document.getElementById(`quiz-result-${quizId}`);
    if (res.correct) {
      resultDiv.innerHTML = `<span style="color:green">${res.message} (XP: ${res.xp}, Level: ${res.level})</span>`;
    } else {
      resultDiv.innerHTML = `<span style="color:red">${res.message}</span>
                             <br><small>Correct answer: ${res.correctAnswer}</small>`;
    }

    loadLeaderboard();
  } catch (err) {
    console.error("Error submitting quiz:", err);
    alert("Failed to submit quiz. Please try again.");
  }
};

// ==============================
// Initialize community
// ==============================
export const initStudentCommunity = async () => {
  try {
    console.log("Loading posts...");
    await loadCommunityPosts();
    console.log("Posts loaded");

    console.log("Loading leaderboard...");
    await loadLeaderboard();
    console.log("Leaderboard loaded");

    console.log("Loading quizzes...");
    await loadQuizzes();
    console.log("Loading quizzes...");
    await loadAdminPosts();
    console.log("Quizzes loaded");
    setupAskQuestionFeature();
  } catch (err) {
    console.error("Error in initStudentCommunity:", err);
  }
};

// ==============================
// Make functions accessible globally for inline onclick
// ==============================
window.submitAnswer = submitAnswer;
window.loadAnswers = loadAnswers;
