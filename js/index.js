const toggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");
const sections = document.querySelectorAll(".section");

toggle.addEventListener("click", () => {
  navMenu.classList.toggle("open");
});

// Get modal
const modal = document.getElementById("freeLessonModal");
const closeBtn = document.querySelector(".modal .close");

// Open modal on every "Try Free Lesson" button click
const lessonBtns = document.querySelectorAll(".try-lesson");
lessonBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    modal.style.display = "flex";
  });
});

// Close modal on X click
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// Close modal when clicking outside content
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// for smooth scrolling

const observer = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target); // optional: animate only once
      }
    });
  },
  { threshold: 0.2 }
); // 20% visible

sections.forEach((section) => {
  observer.observe(section);
});

// Set current year dynamically
document.getElementById("current-year").textContent = new Date().getFullYear();
