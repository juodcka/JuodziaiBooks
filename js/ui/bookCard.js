/**
 * Renders a single book card DOM element.
 *
 * @param {import('../books.js').BookDoc} book
 * @param {string} currentUid - UID of the logged-in user
 * @param {(book: import('../books.js').BookDoc) => void} onClick
 * @returns {HTMLElement}
 */
export function createBookCard(book, currentUid, onClick) {
  const card = document.createElement('article');
  card.className = 'book-card';
  card.setAttribute('data-book-id', book.id);

  const isReading = (book.currentReaders ?? []).includes(currentUid);

  card.innerHTML = `
    ${isReading ? '<span class="book-card__reading-badge">Reading</span>' : ''}
    <div class="book-card__cover${book.coverUrl ? '' : '--placeholder'}">
      ${book.coverUrl
        ? `<img src="${escapeAttr(book.coverUrl)}" alt="${escapeAttr(book.title)}" loading="lazy" />`
        : `<span class="book-card__cover-title">${escape(book.title)}</span>`
      }
    </div>
    <div class="book-card__body">
      <div class="book-card__title">${escape(book.title)}</div>
      <div class="book-card__author">${escape(book.author)}</div>
      <div class="book-card__meta">
        ${book.format ? `<span class="book-card__format">${escape(book.format)}</span>` : ''}
      </div>
      ${book.addedBy?.displayName
        ? `<div class="book-card__added-by">Added by ${escape(book.addedBy.displayName)}</div>`
        : ''
      }
    </div>
  `;

  card.addEventListener('click', () => onClick(book));
  return card;
}

/**
 * Render a list of book cards into a container.
 * @param {HTMLElement} container
 * @param {import('../books.js').BookDoc[]} books
 * @param {string} currentUid
 * @param {(book: import('../books.js').BookDoc) => void} onClick
 */
export function renderBookGrid(container, books, currentUid, onClick) {
  container.innerHTML = '';
  books.forEach(book => {
    container.appendChild(createBookCard(book, currentUid, onClick));
  });
}

// ── Helpers ────────────────────────────────────────────────────
function escape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
