import {
  db,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from './firebase.js';

const BOOKS_COL = 'books';

/**
 * @typedef {Object} BookDoc
 * @property {string}   [id]
 * @property {string}   isbn13
 * @property {string}   isbn10
 * @property {string}   title
 * @property {string}   subtitle
 * @property {string}   author
 * @property {string}   publisher
 * @property {string}   publishingDate
 * @property {string}   format
 * @property {string}   language
 * @property {number}   pages
 * @property {number}   price
 * @property {string}   currency
 * @property {string[]} categories
 * @property {string[]} tags
 * @property {string}   summary
 * @property {string}   coverUrl
 * @property {string}   googleBooksUrl
 * @property {{ uid: string, displayName: string, photoURL: string }} addedBy
 * @property {string[]} currentReaders  - UIDs of users currently reading
 * @property {any}      addedAt
 */

/**
 * Add a new book to Firestore.
 * @param {Omit<BookDoc, 'id' | 'addedAt'>} bookData
 * @returns {Promise<string>} new document ID
 */
export async function addBook(bookData) {
  const ref = await addDoc(collection(db, BOOKS_COL), {
    ...bookData,
    currentReaders: bookData.currentReaders ?? [],
    addedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Fetch all books.
 * @returns {Promise<BookDoc[]>}
 */
export async function getAllBooks() {
  const snap = await getDocs(collection(db, BOOKS_COL));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch a single book by ID.
 * @param {string} id
 * @returns {Promise<BookDoc | null>}
 */
export async function getBook(id) {
  const snap = await getDoc(doc(db, BOOKS_COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Update book fields.
 * @param {string} id
 * @param {Partial<BookDoc>} updates
 */
export async function updateBook(id, updates) {
  await updateDoc(doc(db, BOOKS_COL, id), updates);
}

/**
 * Delete a book.
 * @param {string} id
 */
export async function deleteBook(id) {
  await deleteDoc(doc(db, BOOKS_COL, id));
}

/**
 * Toggle the "currently reading" flag for a user.
 * @param {string} bookId
 * @param {string} uid
 * @param {boolean} isReading
 */
export async function setReading(bookId, uid, isReading) {
  const book = await getBook(bookId);
  if (!book) return;

  let readers = book.currentReaders ?? [];
  if (isReading) {
    if (!readers.includes(uid)) readers = [...readers, uid];
  } else {
    readers = readers.filter(r => r !== uid);
  }

  await updateBook(bookId, { currentReaders: readers });
}
