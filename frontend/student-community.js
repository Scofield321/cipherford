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
          <span class="qa-author">
            ${(post.first_name || "") + " " + (post.last_name || "")}
          </span>
          <span class="qa-date">${new Date(post.created_at).toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
        </div>

        <button id="view-btn-${post.id}">View Answers</button>
        <div id="answers-${post.id}" class="answers-section"></div>

        <textarea id="answer-input-${
          post.id
        }" placeholder="Your answer" rows="5"></textarea>
        <button id="submit-btn-${post.id}">Submit</button>
      `;

      postsContainer.appendChild(postDiv);

      const viewBtn = document.getElementById(`view-btn-${post.id}`);
      const answersDiv = document.getElementById(`answers-${post.id}`);

      // Toggle answers
      viewBtn.addEventListener("click", async () => {
        if (answersDiv.style.display === "block") {
          answersDiv.style.display = "none";
          viewBtn.textContent = "View Answers";
          return;
        }

        answersDiv.style.display = "block";
        answersDiv.innerHTML = `<div class="loader"></div>`;
        viewBtn.textContent = "Loading...";

        try {
          const answers = await fetchWithAuth(
            `${BASE_URL}/student/community/posts/${post.id}/answers`
          );

          if (!answers || answers.length === 0) {
            answersDiv.innerHTML = `<p style="text-align:center; color:#aaa;">No answers yet.</p>`;
          } else {
            answersDiv.innerHTML = answers
              .map((ans) => {
                const likesCount = ans.likes ?? 0;
                const dislikesCount = ans.dislikes ?? 0;

                return `
                  <div class="answer-card" id="answer-card-${
                    ans.id
                  }" data-author-id="${ans.user_id}">
                    <p>${ans.answer}</p>
                    <div class="qa-meta">
                      <span class="qa-author">${
                        (ans.first_name || "") + " " + (ans.last_name || "")
                      }</span>
                      <span class="qa-date">${new Date(
                        ans.created_at
                      ).toLocaleString([], {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}</span>
                    </div>

                    <div class="answer-reactions">
                      <button class="reaction-btn" data-answer-id="${
                        ans.id
                      }" data-type="like">
                        👍 <span id="like-count-${ans.id}">${likesCount}</span>
                      </button>
                      <button class="reaction-btn" data-answer-id="${
                        ans.id
                      }" data-type="dislike">
                        👎 <span id="dislike-count-${
                          ans.id
                        }">${dislikesCount}</span>
                      </button>
                      <button class="comment-btn" data-answer-id="${
                        ans.id
                      }">💬 Comment</button>
                    </div>

                    <div id="comments-${ans.id}" class="comments-section"></div>

                    <div id="comment-form-${
                      ans.id
                    }" class="comment-form" style="display:none; margin-top:0.5rem;">
                      <textarea id="comment-input-${
                        ans.id
                      }" placeholder="Write a comment"></textarea>
                      <button id="submit-comment-${ans.id}">Submit</button>
                    </div>
                  </div>`;
              })
              .join("");
          }

          viewBtn.textContent = "Hide Answers";

          // Attach reaction listeners
          document.querySelectorAll(".reaction-btn").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const answerId = btn.dataset.answerId;
              const type = btn.dataset.type;

              try {
                const res = await fetchWithAuth(
                  `${BASE_URL}/answer-reactions/${answerId}`,
                  {
                    method: "POST",
                    body: JSON.stringify({ reaction_type: type }),
                  }
                );

                if (res.likes !== undefined)
                  document.getElementById(
                    `like-count-${answerId}`
                  ).textContent = res.likes;
                if (res.dislikes !== undefined)
                  document.getElementById(
                    `dislike-count-${answerId}`
                  ).textContent = res.dislikes;
              } catch (err) {
                console.error("Error reacting:", err);
              }
            });
          });

          // Handle comment form toggle and submission
          document.querySelectorAll(".answer-card").forEach((card) => {
            const answerId = card.id.replace("answer-card-", "");
            const answerAuthorId = card.dataset.authorId;
            const commentBtn = card.querySelector(".comment-btn");
            const commentForm = card.querySelector(".comment-form");

            commentBtn.addEventListener("click", async () => {
              commentForm.style.display =
                commentForm.style.display === "block" ? "none" : "block";
              await loadAnswerComments(answerId, answerAuthorId);
            });

            const submitBtn = card.querySelector(`#submit-comment-${answerId}`);
            submitBtn.addEventListener("click", async () => {
              const commentInput = document.getElementById(
                `comment-input-${answerId}`
              );
              const commentText = commentInput.value.trim();
              if (!commentText) return alert("Please write a comment.");

              try {
                await fetchWithAuth(
                  `${BASE_URL}/answer-reactions/${answerId}`,
                  {
                    method: "POST",
                    body: JSON.stringify({ comment: commentText }),
                  }
                );
                commentInput.value = "";
                await loadAnswerComments(answerId, answerAuthorId);
              } catch (err) {
                console.error("Error submitting comment:", err);
              }
            });
          });
        } catch (err) {
          console.error("Error loading answers:", err);
          answersDiv.innerHTML = `<p style="color:red; text-align:center;">Failed to load answers.</p>`;
          viewBtn.textContent = "View Answers";
        }
      });

      // Submit new answer
      const submitBtn = document.getElementById(`submit-btn-${post.id}`);
      submitBtn.addEventListener("click", () => submitAnswer(post.id));
    });
  } catch (err) {
    console.error("Error loading community posts:", err);
  }
};

/**
 * Load and display comments for a specific answer (with nested replies)
 */
export const loadAnswerComments = async (answerId, answerAuthorId) => {
  const commentsDiv = document.getElementById(`comments-${answerId}`);
  commentsDiv.innerHTML = `<div class="loader"></div>`;

  try {
    const data = await fetchWithAuth(
      `${BASE_URL}/answer-reactions/${answerId}`
    );

    const renderComments = (comments, level = 0) => {
      return comments
        .map((comment) => {
          return `
            <div class="comment" style="margin-left:${level * 1.2}rem;">
              <p><b>${comment.full_name}</b>: ${comment.comment}</p>
              ${
                comment.user_id === answerAuthorId
                  ? `<button class="reply-btn" data-comment-id="${comment.id}" data-answer-id="${answerId}">↩ Reply</button>`
                  : ""
              }
              ${
                comment.replies && comment.replies.length > 0
                  ? renderComments(comment.replies, level + 1)
                  : ""
              }
            </div>
          `;
        })
        .join("");
    };

    commentsDiv.innerHTML = renderComments(data.comments);

    // Reply handling
    commentsDiv.querySelectorAll(".reply-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const parentId = btn.dataset.commentId;
        const ansId = btn.dataset.answerId;

        const replyBox = document.createElement("div");
        replyBox.classList.add("reply-box");
        replyBox.innerHTML = `
          <textarea class="reply-input" placeholder="Write your reply..."></textarea>
          <button class="send-reply-btn">Send</button>
        `;
        btn.insertAdjacentElement("afterend", replyBox);

        const sendBtn = replyBox.querySelector(".send-reply-btn");
        sendBtn.addEventListener("click", async () => {
          const replyText = replyBox.querySelector(".reply-input").value.trim();
          if (!replyText) return;

          try {
            await fetchWithAuth(`${BASE_URL}/answer-reactions/${ansId}`, {
              method: "POST",
              body: JSON.stringify({
                comment: replyText,
                parent_comment_id: parentId,
              }),
            });
            replyBox.remove();
            await loadAnswerComments(ansId, answerAuthorId);
          } catch (err) {
            console.error("Error sending reply:", err);
          }
        });
      });
    });
  } catch (err) {
    console.error("Error loading comments:", err);
    commentsDiv.innerHTML = `<p style="color:red;">Failed to load comments.</p>`;
  }
};

// Handles both loader and toggle behavior
window.loadAnswers = async (postId, event) => {
  const button = event.currentTarget;
  const answersDiv = document.getElementById(`answers-${postId}`);

  // If already open, hide answers and reset button
  if (answersDiv.dataset.open === "true") {
    answersDiv.innerHTML = "";
    answersDiv.dataset.open = "false";
    button.textContent = "View Answers";
    return;
  }

  // Show loader and update button text
  answersDiv.innerHTML = `<div class="loader"></div>`;
  answersDiv.dataset.open = "true";
  button.textContent = "Loading...";

  try {
    const answers = await fetchWithAuth(
      `${BASE_URL}/student/community/posts/${postId}/answers`
    );

    if (!answers || answers.length === 0) {
      answersDiv.innerHTML = `<p style="text-align:center; color:#aaa;">No answers yet.</p>`;
    } else {
      answersDiv.innerHTML = answers
        .map(
          (ans) => `
          <div class="answer-card">
            <p>${ans.body}</p>
            <div class="qa-meta">
              <span class="qa-author">${
                ans.first_name || ans.last_name || ans.username || "Anonymous"
              }</span>
              <span class="qa-date">${new Date(ans.created_at).toLocaleString(
                [],
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}</span>
            </div>
          </div>
        `
        )
        .join("");
    }

    button.textContent = "Hide Answers"; // change button after loading
  } catch (err) {
    console.error("Error loading answers:", err);
    answersDiv.innerHTML = `<p style="color:red; text-align:center;">Failed to load answers.</p>`;
    button.textContent = "View Answers"; // reset on error
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
          <span class="qa-date">${new Date(post.created_at).toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
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
// import { BASE_URL } from "./config.js";
// import { fetchWithAuth } from "./auth-utils.js";
// import { submitQuiz } from "./student-quiz-submit.js";

export const loadQuizzes = async () => {
  console.log("🎯 Loading quizzes...");

  try {
    const container = document.getElementById("community-quiz-container");
    if (!container) return;

    // Game state for current session only
    let xp = 0;
    let streak = 0;
    let lives = 3;

    // Core animations
    if (!document.getElementById("quiz-game-style")) {
      const style = document.createElement("style");
      style.id = "quiz-game-style";
      style.innerHTML = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fall { 0% { transform: translateY(0); opacity:1; } 100% { transform: translateY(100vh); opacity:0; } }
        .spinner { border: 4px solid #ccc; border-top: 4px solid var(--accent-color, #00ffff); border-radius: 50%; width: 40px; height: 40px; margin: auto; animation: spin 1s linear infinite; }
      `;
      document.head.appendChild(style);
    }

    // Initial loader
    container.innerHTML = `
      <div id="quiz-loader" class="quiz-loader">
        <div class="spinner"></div>
        <p>Loading quizzes...</p>
      </div>
    `;

    const quizzes = await fetchWithAuth(
      `${BASE_URL}/student/community/quizzes`
    );
    if (!quizzes.length) {
      container.innerHTML = `<p class="no-quizzes">No quizzes available yet.</p>`;
      return;
    }

    let currentIndex = 0;

    // Sounds
    const correctSound = new Audio("./applause-cheer.mp3");
    const wrongSound = new Audio("./crowd-disappointment-reaction.mp3");
    const playSafe = (sound) => {
      try {
        sound.currentTime = 0;
        const playPromise = sound.play();
        if (playPromise !== undefined) playPromise.catch(() => {});
      } catch (err) {
        console.warn("Sound skipped:", err);
      }
    };

    // Confetti
    const triggerConfetti = () => {
      const confetti = document.createElement("div");
      confetti.innerHTML = "🎉";
      confetti.style.position = "fixed";
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = "0";
      confetti.style.fontSize = "2rem";
      confetti.style.animation = "fall 2s linear";
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 2000);
    };

    // Flying coins
    const triggerCoins = (count = 5) => {
      for (let i = 0; i < count; i++) {
        const coin = document.createElement("div");
        coin.innerHTML = "💰";
        coin.style.position = "fixed";
        coin.style.left = `${Math.random() * 80 + 10}%`;
        coin.style.bottom = "0";
        coin.style.fontSize = `${Math.random() * 20 + 20}px`;
        coin.style.zIndex = 9999;
        coin.style.pointerEvents = "none";
        coin.style.opacity = 1;
        document.body.appendChild(coin);
        coin.animate(
          [
            { transform: `translateY(0px) scale(1)`, opacity: 1 },
            {
              transform: `translateY(-200px) scale(0.5) rotate(${
                Math.random() * 360
              }deg)`,
              opacity: 0,
            },
          ],
          {
            duration: 1000 + Math.random() * 500,
            easing: "ease-out",
            fill: "forwards",
          }
        );
        setTimeout(() => coin.remove(), 1500);
      }
    };

    const updateProgress = () => {
      const fill = document.querySelector(".progress-fill");
      if (fill) fill.style.width = `${xp % 100}%`;
    };

    const renderGameHeader = () => `
      <div class="game-header">
        <span class="xp-display">XP: ${xp}</span>
        <span class="streak-display">🔥 Streak: ${streak}</span>
        <span class="lives-display">❤️ Lives: ${lives}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${xp % 100}%"></div>
      </div>
    `;

    const showQuiz = (quiz) => {
      container.innerHTML = renderGameHeader();

      const quizDiv = document.createElement("div");
      quizDiv.classList.add("quiz-card");
      quizDiv.innerHTML = `
        <h4 class="quiz-question">${quiz.question}</h4>
        <form id="quiz-form-${quiz.id}" class="quiz-form">
          ${quiz.options
            .map(
              (opt) => `
            <label class="quiz-option">
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
      const resultDiv = document.getElementById(`quiz-result-${quiz.id}`);

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const selected = form.querySelector(
          `input[name="quiz-${quiz.id}"]:checked`
        );
        if (!selected) return alert("Please select an option.");

        resultDiv.innerHTML = `<div class="spinner" style="margin:10px auto;"></div>`;

        try {
          const res = await submitQuiz(quiz.id, selected.value);
          resultDiv.innerHTML = "";

          if (res.correct) {
            playSafe(correctSound);
            triggerConfetti();
            triggerCoins(5);
            xp += res.xp || 10;
            streak++;
            resultDiv.innerHTML = `<span class="quiz-correct">✅ ${res.message} +${res.xp} XP</span>`;
          } else {
            playSafe(wrongSound);
            lives--;
            streak = 0;
            resultDiv.innerHTML = `
              <span class="quiz-wrong">❌ ${res.message}</span><br>
              <small class="quiz-correct-answer">Correct: ${res.correctAnswer}</small>
            `;
          }

          updateProgress();

          if (lives <= 0) {
            container.innerHTML = `<p class="quiz-game-over">💀 Game Over! Try again later.</p>`;
            return;
          }

          setTimeout(() => {
            currentIndex++;
            if (currentIndex < quizzes.length) showQuiz(quizzes[currentIndex]);
            else
              container.innerHTML = `<p class="quiz-complete">🎉 You completed all quizzes! Total XP: ${xp}</p>`;
          }, 2000);
        } catch (err) {
          console.error("Error submitting quiz:", err);
          resultDiv.innerHTML = `<span class="quiz-error">Failed to submit quiz. Try again.</span>`;
        }
      });
    };

    showQuiz(quizzes[currentIndex]);
  } catch (err) {
    console.error("❌ Error loading quizzes:", err);
    const container = document.getElementById("community-quiz-container");
    if (container)
      container.innerHTML = `<p class="quiz-error">Failed to load quizzes.</p>`;
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

    loadLeaderboard(); // update leaderboard

    return res; // Return response so loadQuizzes can handle display
  } catch (err) {
    console.error("Error submitting quiz:", err);
    throw err;
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
