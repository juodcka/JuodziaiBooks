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

const SHELVES_COL = 'shelves';

/**
 * @typedef {Object} ShelfDoc
 * @property {string}   [id]
 * @property {string}   name
 * @property {boolean}  isShared
 * @property {boolean}  isDefault
 * @property {{ uid: string, displayName: string }} createdBy
 * @property {string[]} bookIds
 * @property {any}      createdAt
 */

/** Default shelves seeded for new installs */
const DEFAULT_SHELVES = [
  { name: 'Read',              isShared: true, isDefault: true },
  { name: 'Currently Reading', isShared: true, isDefault: true },
  { name: 'Want to Read',      isShared: true, isDefault: true },
  { name: 'Wish List',         isShared: true, isDefault: true },
  { name: 'Favorites',         isShared: true, isDefault: true },
];

/**
 * Seed default shelves if none exist yet.
 * Should be called once after the first user signs in.
 * @param {{ uid: string, displayName: string }} user
 */
export async function seedDefaultShelves(user) {
  const snap = await getDocs(collection(db, SHELVES_COL));
  if (!snap.empty) return; // already seeded

  for (const shelf of DEFAULT_SHELVES) {
    await addDoc(collection(db, SHELVES_COL), {
      ...shelf,
      bookIds: [],
      createdBy: { uid: user.uid, displayName: user.displayName ?? '' },
      createdAt: serverTimestamp(),
    });
  }
}

/**
 * Create a new shelf.
 * @param {string} name
 * @param {boolean} isShared
 * @param {{ uid: string, displayName: string }} user
 * @returns {Promise<string>} new document ID
 */
export async function createShelf(name, isShared, user) {
  const ref = await addDoc(collection(db, SHELVES_COL), {
    name,
    isShared,
    isDefault: false,
    bookIds: [],
    createdBy: { uid: user.uid, displayName: user.displayName ?? '' },
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Fetch all shelves.
 * @param {string} currentUid  - used to filter "my shelves" vs shared
 * @returns {Promise<ShelfDoc[]>}
 */
export async function getAllShelves(currentUid) {
  const snap = await getDocs(collection(db, SHELVES_COL));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch a single shelf.
 * @param {string} id
 * @returns {Promise<ShelfDoc | null>}
 */
export async function getShelf(id) {
  const snap = await getDoc(doc(db, SHELVES_COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Add a book to a shelf.
 * @param {string} shelfId
 * @param {string} bookId
 */
export async function addBookToShelf(shelfId, bookId) {
  const shelf = await getShelf(shelfId);
  if (!shelf) return;
  const bookIds = shelf.bookIds ?? [];
  if (bookIds.includes(bookId)) return;
  await updateDoc(doc(db, SHELVES_COL, shelfId), { bookIds: [...bookIds, bookId] });
}

/**
 * Remove a book from a shelf.
 * @param {string} shelfId
 * @param {string} bookId
 */
export async function removeBookFromShelf(shelfId, bookId) {
  const shelf = await getShelf(shelfId);
  if (!shelf) return;
  const bookIds = (shelf.bookIds ?? []).filter(id => id !== bookId);
  await updateDoc(doc(db, SHELVES_COL, shelfId), { bookIds });
}

/**
 * Sync a book's shelf memberships.
 * Adds/removes the book from shelves based on the provided set of shelf IDs.
 * @param {string} bookId
 * @param {string[]} selectedShelfIds
 * @param {ShelfDoc[]} allShelves
 */
export async function syncBookShelves(bookId, selectedShelfIds, allShelves) {
  const ops = allShelves.map(shelf => {
    const has = (shelf.bookIds ?? []).includes(bookId);
    const want = selectedShelfIds.includes(shelf.id);
    if (want && !has) return addBookToShelf(shelf.id, bookId);
    if (!want && has) return removeBookFromShelf(shelf.id, bookId);
    return Promise.resolve();
  });
  await Promise.all(ops);
}

/**
 * Delete a shelf.
 * @param {string} id
 */
export async function deleteShelf(id) {
  await deleteDoc(doc(db, SHELVES_COL, id));
}

/**
 * Get the shelf IDs that contain a given book.
 * @param {string} bookId
 * @param {ShelfDoc[]} allShelves
 * @returns {string[]}
 */
export function getShelvesForBook(bookId, allShelves) {
  return allShelves
    .filter(s => (s.bookIds ?? []).includes(bookId))
    .map(s => s.id);
}
