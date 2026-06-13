const state = {
  articles: [],
  activeCategory: "Бүгд",
  query: "",
  sort: "newest",
  view: localStorage.getItem("aiNewsView") || "grid"
};

const $ = selector => document.querySelector(selector);
const newsGrid = $("#newsGrid");
const filterBar = $("#filterBar");
const searchInput = $("#searchInput");
const sortSelect = $("#sortSelect");

const formatter = new Intl.DateTimeFormat("mn-MN", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

function normalize(value) {
  return (value || "").toString().toLowerCase().trim();
}

function estimateReadingTime(count) {
  const minutes = Math.max(2, Math.ceil(count * 0.8));
  return `${minutes} мин`;
}

function updateClock() {
  const now = new Date();
  $("#clock").textContent = now.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
  $("#todayLabel").textContent = `${formatter.format(now)} · Өнөөдрийн тойм`;
}
setInterval(updateClock, 30000);

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("aiNewsTheme", theme);
  $("#themeIcon").textContent = theme === "dark" ? "☾" : "☼";
  $("#themeLabel").textContent = theme === "dark" ? "Dark" : "Light";
}
const savedTheme = localStorage.getItem("aiNewsTheme") || "dark";
setTheme(savedTheme);

$("#themeToggle").addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

$("#menuToggle").addEventListener("click", () => {
  const nav = $("#navLinks");
  const isOpen = nav.classList.toggle("open");
  $("#menuToggle").setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll("#navLinks a").forEach(link => {
  link.addEventListener("click", () => {
    $("#navLinks").classList.remove("open");
    $("#menuToggle").setAttribute("aria-expanded", "false");
  });
});

function renderFilters() {
  const categories = ["Бүгд", ...new Set(state.articles.map(item => item.category).filter(Boolean))];

  $("#categoryCount").textContent = Math.max(0, categories.length - 1);

  filterBar.innerHTML = categories.map(category => `
    <button class="${category === state.activeCategory ? "active" : ""}" type="button" data-category="${category}">
      ${category}
    </button>
  `).join("");

  filterBar.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.category;
      renderFilters();
      renderArticles();
    });
  });
}

function articleMatches(article) {
  const byCategory = state.activeCategory === "Бүгд" || article.category === state.activeCategory;
  const q = normalize(state.query);
  const text = [
    article.title,
    article.summary,
    article.whyItMatters,
    article.source,
    article.category,
    article.date
  ].map(normalize).join(" ");
  return byCategory && (!q || text.includes(q));
}

function sortArticles(articles) {
  return [...articles].sort((a, b) => {
    if (state.sort === "oldest") return new Date(a.date) - new Date(b.date);
    if (state.sort === "category") return (a.category || "").localeCompare(b.category || "mn");
    return new Date(b.date) - new Date(a.date);
  });
}

function renderArticles() {
  const filtered = sortArticles(state.articles.filter(articleMatches));
  newsGrid.classList.toggle("list", state.view === "list");

  $("#articleCount").textContent = state.articles.length;
  $("#readingTime").textContent = estimateReadingTime(filtered.length);
  $("#resultLine").textContent = `${filtered.length} мэдээ харагдаж байна`;

  if (!filtered.length) {
    newsGrid.innerHTML = `
      <div class="empty-state">
        <h3>Мэдээ олдсонгүй</h3>
        <p>Хайлтын үгээ богиносгох эсвэл “Бүгд” ангиллыг сонгоод дахин оролдоно уу.</p>
      </div>`;
    return;
  }

  newsGrid.innerHTML = filtered.map(article => `
    <article class="news-card">
      <div>
        <div class="card-meta">
          <span>${formatter.format(new Date(article.date))}</span>
          <span class="badge">${article.category || "Ерөнхий"}</span>
        </div>
      </div>
      <div>
        <h3>${article.title}</h3>
        <p>${article.summary}</p>
        <p class="why"><strong>Яагаад чухал вэ?</strong><br>${article.whyItMatters}</p>
      </div>
      <a class="source-link" href="${article.url}" target="_blank" rel="noreferrer">
        ${article.source || "Эх сурвалж"} →
      </a>
    </article>
  `).join("");
}

function setView(view) {
  state.view = view;
  localStorage.setItem("aiNewsView", view);
  $("#gridView").classList.toggle("active", view === "grid");
  $("#listView").classList.toggle("active", view === "list");
  renderArticles();
}
$("#gridView").addEventListener("click", () => setView("grid"));
$("#listView").addEventListener("click", () => setView("list"));

searchInput.addEventListener("input", event => {
  state.query = event.target.value;
  renderArticles();
});

sortSelect.addEventListener("change", event => {
  state.sort = event.target.value;
  renderArticles();
});

$("#copySummary").addEventListener("click", async () => {
  const text = `${$("#dailyTitle").textContent}\n\n${$("#dailySummary").textContent}`;
  try {
    await navigator.clipboard.writeText(text);
    $("#copySummary").textContent = "Хуулагдлаа ✓";
    setTimeout(() => $("#copySummary").textContent = "Дүгнэлт хуулах", 1600);
  } catch {
    $("#copySummary").textContent = "Хуулах боломжгүй";
    setTimeout(() => $("#copySummary").textContent = "Дүгнэлт хуулах", 1600);
  }
});

$("#subscribeForm").addEventListener("submit", event => {
  event.preventDefault();
  $("#formNote").textContent = "Баярлалаа. Энэ demo тул backend холбосны дараа бодитоор бүртгэнэ.";
  event.target.reset();
});

async function loadNews() {
  try {
    const response = await fetch("news.json", { cache: "no-store" });
    if (!response.ok) throw new Error("news.json олдсонгүй");
    const data = await response.json();

    $("#dailyTitle").textContent = data.dailyTitle || "AI салбарын тойм";
    $("#dailySummary").textContent = data.dailySummary || "";
    $("#heroSummary").textContent = data.dailySummary || "Өнөөдрийн тойм бэлэн.";
    state.articles = Array.isArray(data.articles) ? data.articles : [];

    renderFilters();
    setView(state.view);
  } catch (error) {
    $("#heroSummary").textContent = "news.json файл уншигдсангүй.";
    $("#resultLine").textContent = "Өгөгдөл ачаалах үед алдаа гарлаа.";
    newsGrid.innerHTML = `
      <div class="empty-state">
        <h3>news.json уншигдсангүй</h3>
        <p>GitHub дээр index.html, app.js, styles.css, news.json файлууд нэг folder дотор байгаа эсэхийг шалгана уу.</p>
      </div>`;
  }
}

updateClock();
loadNews();
