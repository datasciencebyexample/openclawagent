const listEl = document.getElementById('notes-list');
const detailEl = document.getElementById('note-detail');
const bodyEl = document.body;
const params = new URLSearchParams(window.location.search);
const selectedSlug = params.get('post');

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
  if (!selectedSlug) {
    bodyEl.classList.remove('has-post');
    detailEl.innerHTML = '<p class="note">Select a note above to read it here.</p>';
    return;
  }

  bodyEl.classList.add('has-post');

  const post = posts.find((entry) => entry.slug === selectedSlug);
  if (!post) {
    detailEl.innerHTML = '<p class="note">That note was not found. Check the URL.</p>';
    return;
  }

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
    const posts = await response.json();
    renderList(posts);
    await renderDetail(posts);
  } catch (error) {
    listEl.innerHTML = '<p class="note">Add a posts.json file to list your notes.</p>';
    detailEl.innerHTML = '';
  }
};

init();
