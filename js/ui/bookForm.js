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

// ── Public API ─────────────────────────────────────────────────

/**
 * Open the "Add Book" form.
 * @param {{ shelves: import('../shelves.js').ShelfDoc[], onSaved: () => void, user: object }} opts
 */
export function openAddBookForm({ shelves, onSaved, user }) {
  _allShelves = shelves;
  _onSaved = onSaved;
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
  clearForm();
  modalTitle().textContent = 'Edit Book';

  setField('field-book-id',    book.id ?? '');
  isbnInput().value =          book.isbn ?? '';
  setField('field-title',      book.title ?? '');
  setField('field-author',     book.author ?? '');
  setField('field-publisher',  book.publisher ?? '');
  setField('field-publish-date', book.publishingDate ?? '');
  setField('field-format',     book.format ?? '');
  setField('field-language',   book.language ?? '');
  setField('field-pages',      book.pages ?? '');
  setField('field-price',      book.price ?? '');
  setField('field-currency',   book.currency ?? 'EUR');
  setField('field-genre',      book.genre ?? '');
  setField('field-tags',       (book.tags ?? []).join(', '));
  setField('field-summary',    book.summary ?? '');

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
  setField('field-title',       data.title);
  setField('field-author',      data.author);
  setField('field-publisher',   data.publisher);
  setField('field-publish-date', data.publishingDate);
  setField('field-language',    data.language);
  setField('field-pages',       data.pages);
  setField('field-genre',       data.genre);
  setField('field-summary',     data.summary);
  // coverUrl is stored but not shown in the form — it will be saved to Firestore
  form().dataset.coverUrl = data.coverUrl ?? '';
}

// ── Camera scan ────────────────────────────────────────────────

async function handleScanStart() {
  scannerBox().classList.remove('hidden');
  _scanner = new BarcodeScanner('scanner-view');
  try {
    const isbn = await _scanner.start();
    isbnInput().value = isbn;
    stopScanner();
    await handleISBNLookup();
  } catch (err) {
    stopScanner();
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
    const bookData = {
      isbn:           isbnInput().value.trim(),
      title,
      author,
      publisher:      getField('field-publisher').trim(),
      publishingDate: getField('field-publish-date').trim(),
      format:         getField('field-format'),
      language:       getField('field-language').trim(),
      pages:          Number(getField('field-pages')) || '',
      price:          parseFloat(getField('field-price')) || '',
      currency:       getField('field-currency'),
      genre:          getField('field-genre').trim(),
      tags:           getField('field-tags').split(',').map(t => t.trim()).filter(Boolean),
      summary:        getField('field-summary').trim(),
      coverUrl:       form().dataset.coverUrl ?? '',
    };

    const bookId = getField('field-book-id');
    const selectedShelfIds = getSelectedShelfIds();

    if (bookId) {
      // Edit
      await updateBook(bookId, bookData);
      await syncBookShelves(bookId, selectedShelfIds, _allShelves);
      showToast('Book updated.');
    } else {
      // Add — addedBy is set in app.js context; we read it from the form dataset
      const addedBy = JSON.parse(form().dataset.addedBy ?? 'null');
      const newId = await addBook({ ...bookData, addedBy, currentReaders: [] });
      await syncBookShelves(newId, selectedShelfIds, _allShelves);
      showToast('Book added.');
    }

    closeBookForm();
    if (_onSaved) _onSaved();
  } catch (err) {
    console.error(err);
    showToast('Error saving book. Please try again.');
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
  stopScanner();
}
