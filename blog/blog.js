const listEl = document.getElementById('notes-list');
const detailEl = document.getElementById('note-detail');
const bodyEl = document.body;
const canonicalEl = document.getElementById('canonical-url');
const ogUrlEl = document.getElementById('og-url');

const canonicalBase = 'https://www.openclawagent.ai';

const getSelectedSlug = () => new URLSearchParams(window.location.search).get('post');

const setCanonical = (slug) => {
  if (!canonicalEl && !ogUrlEl) return;
  const url = slug ? `${canonicalBase}/blog/?post=${encodeURIComponent(slug)}` : `${canonicalBase}/blog/`;
  if (canonicalEl) canonicalEl.href = url;
  if (ogUrlEl) ogUrlEl.content = url;
};

const parsePostDate = (post) => {
  // Prefer stable YYYY-MM-DD prefix from filename if present.
  const fileMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(post.file || '');
  if (fileMatch) {
    const d = new Date(`${fileMatch[1]}-${fileMatch[2]}-${fileMatch[3]}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }

  const d = new Date(post.date || '');
  if (!Number.isNaN(d.getTime())) return d.getTime();

  return 0;
};

const sortPostsNewestFirst = (posts) =>
  [...posts].sort((a, b) => parsePostDate(b) - parsePostDate(a));

const ensureSelectedPost = (posts) => {
  const currentSlug = getSelectedSlug();
  if (currentSlug) return currentSlug;
  if (!posts.length) return null;

  const latestSlug = posts[0].slug;
  const url = new URL(window.location.href);
  url.searchParams.set('post', latestSlug);
  window.history.replaceState({}, '', url.toString());
  return latestSlug;
};

const renderMarkdown = (markdown) => {
  marked.setOptions({
    gfm: true,
    breaks: false,
    headerIds: true,
  });
  const html = marked.parse(markdown);
  return DOMPurify.sanitize(html);
};

const renderList = (posts) => {
  if (!posts.length) {
    listEl.innerHTML = '<p class="note">No notes yet. Add a Markdown file in /blog/posts.</p>';
    return;
  }

  listEl.innerHTML = posts
    .map(
      (post) => `
        <article class="card">
          <h3>${post.title}</h3>
          <p class="card-meta">${post.date}</p>
          <p>${post.summary}</p>
          <a class="btn btn-outline" href="/blog/?post=${post.slug}">Read note</a>
        </article>
      `
    )
    .join('');
};

const renderDetail = async (posts) => {
  const selectedSlug = getSelectedSlug();

  if (!selectedSlug) return;

  const post = posts.find((entry) => entry.slug === selectedSlug);
  if (!post) {
    bodyEl.classList.remove('has-post');
    detailEl.innerHTML = '<p class="note">That note was not found. Check the URL.</p>';
    document.title = 'OpenClawAgent.ai - Field Notes';
    setCanonical(null);
    return;
  }

  bodyEl.classList.add('has-post');
  setCanonical(selectedSlug);
  document.title = `OpenClawAgent.ai - ${post.title}`;

  try {
    const response = await fetch(`/blog/posts/${post.file}`);
    if (!response.ok) {
      throw new Error('Post file missing');
    }
    const markdown = await response.text();
    detailEl.innerHTML = `
      <div class="markdown-header">
        <p class="eyebrow">${post.date}</p>
        <h2>${post.title}</h2>
        <p class="lead">${post.summary}</p>
      </div>
      ${renderMarkdown(markdown)}
    `;
  } catch (error) {
    detailEl.innerHTML = '<p class="note">Could not load that note. Please try again.</p>';
  }
};

const init = async () => {
  try {
    const response = await fetch('/blog/posts.json');
    if (!response.ok) {
      throw new Error('Missing posts.json');
    }
    const posts = sortPostsNewestFirst(await response.json());
    renderList(posts);
    ensureSelectedPost(posts);
    await renderDetail(posts);
  } catch (error) {
    listEl.innerHTML = '<p class="note">Add a posts.json file to list your notes.</p>';
    detailEl.innerHTML = '';
  }
};

init();
