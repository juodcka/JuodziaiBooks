import { onAuthChange, signInWithGoogle, signOutUser, getCurrentUser } from './auth.js';
import { seedDefaultShelves, getAllShelves, createShelf, deleteShelf, getShelvesForBook } from './shelves.js';
import { getAllBooks, getBook, deleteBook, setReading } from './books.js';
import { renderBookGrid } from './ui/bookCard.js';
import { renderSidebarShelves, setViewTitle } from './ui/shelfView.js';
import { initBookForm, openAddBookForm, openEditBookForm, closeBookForm } from './ui/bookForm.js';

// ── State ──────────────────────────────────────────────────────
let _user = null;
let _books = [];
let _shelves = [];
let _activeShelfId = null; // null = All Books

// ── Boot ───────────────────────────────────────────────────────
onAuthChange(async user => {
  _user = user;
  if (user) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('user-avatar').src = user.photoURL ?? '';
    document.getElementById('user-name').textContent = user.displayName ?? user.email ?? '';

    await seedDefaultShelves({ uid: user.uid, displayName: user.displayName ?? '' });
    await refresh();
  } else {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
});

// ── Data refresh ───────────────────────────────────────────────
async function refresh() {
  [_books, _shelves] = await Promise.all([getAllBooks(), getAllShelves(_user?.uid)]);
  renderSidebar();
  renderCurrentView();
}

function renderSidebar() {
  renderSidebarShelves(_shelves, _user?.uid, _activeShelfId, {
    onSelect: shelfId => navigateTo(shelfId),
    onDelete: shelf => handleDeleteShelf(shelf),
  });
}

function renderCurrentView() {
  const grid = document.getElementById('books-grid');
  const empty = document.getElementById('empty-state');
  let visible = _books;

  if (_activeShelfId) {
    const shelf = _shelves.find(s => s.id === _activeShelfId);
    const ids = shelf?.bookIds ?? [];
    visible = _books.filter(b => ids.includes(b.id));
    setViewTitle(shelf?.name ?? 'Shelf');
  } else {
    setViewTitle('All Books');
  }

  if (visible.length === 0) {
    grid.classList.add('hidden');
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    grid.classList.remove('hidden');
    renderBookGrid(grid, visible, _user?.uid, book => openDetailModal(book));
  }
}

function navigateTo(shelfId) {
  _activeShelfId = shelfId;
  renderSidebar();
  renderCurrentView();
}

// ── Auth buttons ───────────────────────────────────────────────
document.getElementById('btn-google-login').addEventListener('click', async () => {
  try {
    await signInWithGoogle();
  } catch (err) {
    console.error(err);
    showToast('Sign-in failed. Please try again.');
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOutUser();
});

// ── Add book ───────────────────────────────────────────────────
function handleOpenAddBook() {
  openAddBookForm({ shelves: _shelves, onSaved: refresh, user: _user });
}

document.getElementById('btn-add-book').addEventListener('click', handleOpenAddBook);
document.getElementById('btn-add-book-empty').addEventListener('click', handleOpenAddBook);

// ── New shelf modal ────────────────────────────────────────────
document.getElementById('btn-new-shelf').addEventListener('click', () => {
  document.getElementById('input-shelf-name').value = '';
  document.getElementById('input-shelf-shared').checked = true;
  document.getElementById('shelf-modal').classList.remove('hidden');
});

document.getElementById('btn-shelf-modal-close').addEventListener('click', closeShelfModal);
document.getElementById('btn-shelf-cancel').addEventListener('click', closeShelfModal);
document.getElementById('shelf-modal').querySelector('.modal__backdrop')
  .addEventListener('click', closeShelfModal);

document.getElementById('btn-shelf-save').addEventListener('click', async () => {
  const name = document.getElementById('input-shelf-name').value.trim();
  if (!name) return;
  const isShared = document.getElementById('input-shelf-shared').checked;
  await createShelf(name, isShared, { uid: _user.uid, displayName: _user.displayName ?? '' });
  closeShelfModal();
  await refresh();
  showToast(`Shelf "${name}" created.`);
});

function closeShelfModal() {
  document.getElementById('shelf-modal').classList.add('hidden');
}

// ── Delete shelf ───────────────────────────────────────────────
async function handleDeleteShelf(shelf) {
  if (!confirm(`Delete shelf "${shelf.name}"? Books will not be deleted.`)) return;
  await deleteShelf(shelf.id);
  if (_activeShelfId === shelf.id) _activeShelfId = null;
  await refresh();
  showToast(`Shelf "${shelf.name}" deleted.`);
}

// ── Book detail modal ──────────────────────────────────────────
function openDetailModal(book) {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('detail-title');
  const body  = document.getElementById('detail-body');

  title.textContent = book.title;

  const bookShelves = getShelvesForBook(book.id, _shelves);
  const shelfNames  = _shelves.filter(s => bookShelves.includes(s.id)).map(s => s.name);

  const isReading   = (book.currentReaders ?? []).includes(_user.uid);
  const readerNames = (book.currentReaders ?? [])
    .map(uid => {
      if (uid === _user.uid) return _user.displayName ?? 'You';
      return uid; // could be resolved to name in a future enhancement
    });

  const allCategories = [...(book.categories ?? []), ...(book.tags ?? [])];

  body.innerHTML = `
    ${book.coverUrl ? `<img class="detail-cover" src="${esc(book.coverUrl)}" alt="${esc(book.title)}" />` : ''}
    <p style="font-size:15px;font-weight:500;color:var(--color-text-muted)">${esc(book.author)}</p>
    ${book.subtitle ? `<p style="font-size:13px;color:var(--color-text-muted);margin-top:2px">${esc(book.subtitle)}</p>` : ''}
    <dl class="detail-meta">
      ${row('ISBN-13',    book.isbn13)}
      ${row('ISBN-10',    book.isbn10)}
      ${row('Publisher',  book.publisher)}
      ${row('Published',  book.publishingDate)}
      ${row('Format',     book.format)}
      ${row('Language',   book.language)}
      ${row('Pages',      book.pages)}
      ${row('Price',      book.price ? `${book.price} ${book.currency ?? ''}` : '')}
    </dl>
    ${allCategories.length ? `<div class="detail-shelves">${allCategories.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    ${book.summary ? `<p class="detail-summary">${esc(book.summary)}</p>` : ''}
    ${shelfNames.length ? `<div class="detail-shelves" style="margin-top:12px">${shelfNames.map(n => `<span class="tag">${esc(n)}</span>`).join('')}</div>` : ''}
    <div class="detail-readers">
      <strong>Currently reading</strong>
      ${readerNames.length ? readerNames.join(', ') : 'Nobody yet'}
      <br/>
      <button class="btn-reading ${isReading ? 'active' : ''}" id="btn-toggle-reading">
        ${isReading ? '📖 Stop reading' : '📖 I\'m reading this'}
      </button>
    </div>
    ${book.googleBooksUrl ? `<p style="margin-top:12px"><a href="${esc(book.googleBooksUrl)}" target="_blank" rel="noopener" style="font-size:13px;color:var(--color-primary)">View on Google Books ↗</a></p>` : ''}
    ${book.addedBy?.displayName ? `<p style="font-size:12px;color:var(--color-text-light);margin-top:8px">Added by ${esc(book.addedBy.displayName)}</p>` : ''}
  `;

  document.getElementById('btn-toggle-reading').addEventListener('click', async () => {
    await setReading(book.id, _user.uid, !isReading);
    await refresh();
    closeDetailModal();
    const updated = _books.find(b => b.id === book.id);
    if (updated) openDetailModal(updated);
  });

  document.getElementById('btn-detail-edit').onclick = () => {
    closeDetailModal();
    openEditBookForm(book, { shelves: _shelves, onSaved: refresh, user: _user });
  };

  document.getElementById('btn-detail-delete').onclick = async () => {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    await deleteBook(book.id);
    closeDetailModal();
    await refresh();
    showToast('Book deleted.');
  };

  modal.classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.add('hidden');
}

document.getElementById('btn-detail-close').addEventListener('click', closeDetailModal);
document.getElementById('detail-modal').querySelector('.modal__backdrop')
  .addEventListener('click', closeDetailModal);

// ── Mobile sidebar toggle ──────────────────────────────────────
document.getElementById('btn-sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// Close sidebar when navigating on mobile
document.getElementById('sidebar').addEventListener('click', e => {
  if (e.target.closest('.sidebar__link') || e.target.closest('.shelf-list__link')) {
    document.getElementById('sidebar').classList.remove('open');
  }
});

// ── "All Books" nav link ───────────────────────────────────────
document.querySelector('.sidebar__link[data-route="/"]').addEventListener('click', e => {
  e.preventDefault();
  _activeShelfId = null;
  renderSidebar();
  renderCurrentView();
});

// ── Init book form ─────────────────────────────────────────────
initBookForm();

// ── Toast ──────────────────────────────────────────────────────
let _toastTimer = null;

export function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 3000);
}

// ── Helpers ────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function row(label, value) {
  if (!value) return '';
  return `<dt>${label}</dt><dd>${esc(String(value))}</dd>`;
}
