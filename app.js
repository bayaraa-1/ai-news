const state = {
  articles: [],
  activeCategory: "Бүгд",
  query: ""
};

const newsGrid = document.getElementById("newsGrid");
const filterBar = document.getElementById("filterBar");
const searchInput = document.getElementById("searchInput");

const formatter = new Intl.DateTimeFormat("mn-MN", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

function normalize(value) {
  return (value || "").toString().toLowerCase();
}

function renderFilters() {
  const categories = ["Бүгд", ...new Set(state.articles.map(item => item.category))];

  filterBar.innerHTML = categories
    .map(category => `
      <button class="${category === state.activeCategory ? "active" : ""}" data-category="${category}">
        ${category}
      </button>
    `)
    .join("");

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
  const bySearch = !q || [article.title, article.summary, article.whyItMatters, article.source, article.category]
    .some(field => normalize(field).includes(q));

  return byCategory && bySearch;
}

function renderArticles() {
  const filtered = state.articles.filter(articleMatches);

  document.getElementById("articleCount").textContent = state.articles.length;

  if (!filtered.length) {
    newsGrid.innerHTML = `<div class="news-card"><h3>Мэдээ олдсонгүй</h3><p>Хайлтын үгээ өөрчлөөд дахин оролдоно уу.</p></div>`;
    return;
  }

  newsGrid.innerHTML = filtered.map(article => `
    <article class="news-card">
      <div class="meta">
        <span>${formatter.format(new Date(article.date))}</span>
        <span class="tag">${article.category}</span>
      </div>
      <h3>${article.title}</h3>
      <p>${article.summary}</p>
      <p class="why"><strong>Яагаад чухал вэ?</strong><br>${article.whyItMatters}</p>
      <a class="source" href="${article.url}" target="_blank" rel="noreferrer">Эх сурвалж үзэх →</a>
    </article>
  `).join("");
}

function setDate() {
  const now = new Date();
  const weekdays = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
  document.getElementById("day").textContent = weekdays[now.getDay()];
  document.getElementById("date").textContent = `${now.getMonth() + 1}/${now.getDate()}`;
  document.getElementById("year").textContent = now.getFullYear();
}

async function loadNews() {
  try {
    const response = await fetch("news.json");
    const data = await response.json();

    document.getElementById("dailyTitle").textContent = data.dailyTitle;
    document.getElementById("dailySummary").textContent = data.dailySummary;

    state.articles = data.articles || [];
    renderFilters();
    renderArticles();
  } catch (error) {
    newsGrid.innerHTML = `
      <div class="news-card">
        <h3>Мэдээ уншиж чадсангүй</h3>
        <p>news.json файл байгаа эсэхийг шалгана уу. Local file байдлаар нээхэд зарим browser fetch-г хориглож болно. VS Code Live Server эсвэл hosting дээр байрлуулбал ажиллана.</p>
      </div>
    `;
  }
}

searchInput.addEventListener("input", event => {
  state.query = event.target.value;
  renderArticles();
});

setDate();
loadNews();
