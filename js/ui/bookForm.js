import { fetchBookByISBN } from '../isbn.js';
import { BarcodeScanner } from '../scanner.js';
import { addBook, updateBook } from '../books.js';
import { syncBookShelves, getShelvesForBook } from '../shelves.js';
import { showToast } from '../app.js';

const modal       = () => document.getElementById('book-modal');
const form        = () => document.getElementById('book-form');
const modalTitle  = () => document.getElementById('modal-title');
const isbnInput   = () => document.getElementById('input-isbn');
const scannerBox  = () => document.getElementById('scanner-container');
const shelfBoxes  = () => document.getElementById('shelf-checkboxes');

let _scanner = null;
let _allShelves = [];
let _onSaved = null;
let _addedBy = null;

// ── Public API ─────────────────────────────────────────────────

/**
 * Open the "Add Book" form.
 * @param {{ shelves: import('../shelves.js').ShelfDoc[], onSaved: () => void, user: object }} opts
 */
export function openAddBookForm({ shelves, onSaved, user }) {
  _allShelves = shelves;
  _onSaved = onSaved;
  _addedBy = { uid: user.uid, displayName: user.displayName ?? '', photoURL: user.photoURL ?? '' };
  clearForm();
  setField('field-book-id', '');
  modalTitle().textContent = 'Add Book';
  renderShelfCheckboxes([]);
  modal().classList.remove('hidden');
}

/**
 * Open the "Edit Book" form pre-populated with existing data.
 * @param {import('../books.js').BookDoc} book
 * @param {{ shelves: import('../shelves.js').ShelfDoc[], onSaved: () => void, user: object }} opts
 */
export function openEditBookForm(book, { shelves, onSaved, user }) {
  _allShelves = shelves;
  _onSaved = onSaved;
  _addedBy = book.addedBy ?? { uid: user.uid, displayName: user.displayName ?? '', photoURL: user.photoURL ?? '' };
  clearForm();
  modalTitle().textContent = 'Edit Book';

  setField('field-book-id',          book.id ?? '');
  isbnInput().value =                book.isbn13 ?? book.isbn10 ?? '';
  setField('field-isbn13',           book.isbn13 ?? '');
  setField('field-isbn10',           book.isbn10 ?? '');
  setField('field-title',            book.title ?? '');
  setField('field-subtitle',         book.subtitle ?? '');
  setField('field-author',           book.author ?? '');
  setField('field-publisher',        book.publisher ?? '');
  setField('field-publish-date',     book.publishingDate ?? '');
  setField('field-format',           book.format ?? '');
  setField('field-language',         book.language ?? '');
  setField('field-pages',            book.pages ?? '');
  setField('field-price',            book.price ?? '');
  setField('field-currency',         book.currency ?? 'EUR');
  setField('field-categories',       (book.categories ?? []).join(', '));
  setField('field-tags',             (book.tags ?? []).join(', '));
  setField('field-summary',          book.summary ?? '');
  setField('field-google-books-url', book.googleBooksUrl ?? '');
  form().dataset.coverUrl =          book.coverUrl ?? '';

  const selectedIds = getShelvesForBook(book.id, shelves);
  renderShelfCheckboxes(selectedIds);

  modal().classList.remove('hidden');
}

/**
 * Close the modal and stop any active scan.
 */
export function closeBookForm() {
  stopScanner();
  modal().classList.add('hidden');
  clearForm();
}

// ── Init (called once from app.js) ────────────────────────────

export function initBookForm() {
  document.getElementById('btn-modal-close').addEventListener('click', closeBookForm);
  document.getElementById('btn-form-cancel').addEventListener('click', closeBookForm);
  modal().querySelector('.modal__backdrop').addEventListener('click', closeBookForm);

  document.getElementById('btn-fetch-isbn').addEventListener('click', handleISBNLookup);
  document.getElementById('btn-scan-isbn').addEventListener('click', handleScanStart);
  document.getElementById('btn-cancel-scan').addEventListener('click', stopScanner);

  form().addEventListener('submit', handleSubmit);
}

// ── ISBN lookup ────────────────────────────────────────────────

async function handleISBNLookup() {
  const isbn = isbnInput().value.trim();
  if (!isbn) return;

  const btn = document.getElementById('btn-fetch-isbn');
  btn.disabled = true;
  btn.textContent = 'Searching…';

  try {
    const data = await fetchBookByISBN(isbn);
    if (data) {
      populateFromISBN(data);
      showToast('Book info found!');
    } else {
      showToast('Book not found — fill in details manually.');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Lookup';
  }
}

function populateFromISBN(data) {
  setField('field-isbn13',       data.isbn13);
  setField('field-isbn10',       data.isbn10);
  setField('field-title',        data.title);
  setField('field-subtitle',     data.subtitle);
  setField('field-author',       data.author);
  setField('field-publisher',    data.publisher);
  setField('field-publish-date', data.publishingDate);
  setField('field-language',     data.language);
  setField('field-pages',        data.pages);
  setField('field-categories',   data.categories.join(', '));
  setField('field-summary',      data.summary);
  setField('field-google-books-url', data.googleBooksUrl);
  form().dataset.coverUrl = data.coverUrl ?? '';
}

// ── Camera scan ────────────────────────────────────────────────

async function handleScanStart() {
  _scanner = new BarcodeScanner('scanner-view');
  scannerBox().classList.remove('hidden');
  try {
    const isbn = await _scanner.start();
    await stopScanner();
    isbnInput().value = isbn;
    await handleISBNLookup();
  } catch (err) {
    await stopScanner();
    showToast('Scan error: ' + (err?.message ?? String(err)));
    console.error(err);
  }
}

async function stopScanner() {
  if (_scanner) {
    await _scanner.stop();
    _scanner = null;
  }
  scannerBox().classList.add('hidden');
}

// ── Form submit ────────────────────────────────────────────────

async function handleSubmit(e) {
  e.preventDefault();

  const title = getField('field-title').trim();
  const author = getField('field-author').trim();
  if (!title || !author) {
    showToast('Title and Author are required.');
    return;
  }

  const saveBtn = document.getElementById('btn-form-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const splitComma = id =>
      getField(id).split(',').map(t => t.trim()).filter(Boolean);

    const bookData = {
      isbn13:         getField('field-isbn13') || isbnInput().value.trim(),
      isbn10:         getField('field-isbn10'),
      title,
      subtitle:       getField('field-subtitle').trim(),
      author,
      publisher:      getField('field-publisher').trim(),
      publishingDate: getField('field-publish-date').trim(),
      format:         getField('field-format'),
      language:       getField('field-language').trim(),
      pages:          Number(getField('field-pages')) || '',
      price:          parseFloat(getField('field-price')) || '',
      currency:       getField('field-currency'),
      categories:     splitComma('field-categories'),
      tags:           splitComma('field-tags'),
      summary:        getField('field-summary').trim(),
      coverUrl:       form().dataset.coverUrl ?? '',
      googleBooksUrl: getField('field-google-books-url'),
    };

    const bookId = getField('field-book-id');
    const selectedShelfIds = getSelectedShelfIds();

    if (bookId) {
      // Edit
      await updateBook(bookId, bookData);
      await syncBookShelves(bookId, selectedShelfIds, _allShelves);
      showToast('Book updated.');
    } else {
      const newId = await addBook({ ...bookData, addedBy: _addedBy, currentReaders: [] });
      await syncBookShelves(newId, selectedShelfIds, _allShelves);
      showToast('Book added.');
    }

    closeBookForm();
    if (_onSaved) _onSaved();
  } catch (err) {
    console.error(err);
    showToast('Error: ' + (err?.message ?? String(err)));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Book';
  }
}

// ── Shelf checkboxes ───────────────────────────────────────────

function renderShelfCheckboxes(selectedIds) {
  const container = shelfBoxes();
  container.innerHTML = '';

  _allShelves.forEach(shelf => {
    const id = `shelf-cb-${shelf.id}`;
    const label = document.createElement('label');
    label.setAttribute('for', id);

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.value = shelf.id;
    cb.checked = selectedIds.includes(shelf.id);

    label.appendChild(cb);
    label.appendChild(document.createTextNode(shelf.name));
    container.appendChild(label);
  });
}

function getSelectedShelfIds() {
  return [...shelfBoxes().querySelectorAll('input[type="checkbox"]:checked')]
    .map(cb => cb.value);
}

// ── Helpers ────────────────────────────────────────────────────

function setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function getField(id) {
  return document.getElementById(id)?.value ?? '';
}

function clearForm() {
  form().reset();
  form().dataset.coverUrl = '';
  form().dataset.addedBy = '';
  shelfBoxes().innerHTML = '';
  stopScanner(); // fire-and-forget is fine here
}
