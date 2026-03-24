/**
 * Fetch book data by ISBN.
 * Tries Google Books first; falls back to Open Library.
 *
 * @param {string} isbn
 * @returns {Promise<BookData | null>}
 *
 * @typedef {Object} BookData
 * @property {string} isbn
 * @property {string} title
 * @property {string} author
 * @property {string} publisher
 * @property {string} publishingDate
 * @property {string} language
 * @property {number|string} pages
 * @property {string} genre
 * @property {string} summary
 * @property {string} coverUrl
 */
export async function fetchBookByISBN(isbn) {
  const clean = isbn.replace(/[-\s]/g, '');

  const result = await fetchFromGoogleBooks(clean);
  if (result) return result;

  return fetchFromOpenLibrary(clean);
}

// ── Google Books ───────────────────────────────────────────────
async function fetchFromGoogleBooks(isbn) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.items?.length) return null;

    const info = data.items[0].volumeInfo;

    return {
      isbn,
      title: info.title ?? '',
      author: info.authors?.join(', ') ?? '',
      publisher: info.publisher ?? '',
      publishingDate: info.publishedDate ?? '',
      language: info.language ?? '',
      pages: info.pageCount ?? '',
      genre: info.categories?.[0] ?? '',
      summary: info.description ?? '',
      coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:') ?? '',
    };
  } catch {
    return null;
  }
}

// ── Open Library ───────────────────────────────────────────────
async function fetchFromOpenLibrary(isbn) {
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const book = data[`ISBN:${isbn}`];
    if (!book) return null;

    const author = book.authors?.map(a => a.name).join(', ') ?? '';
    const publisher = book.publishers?.map(p => p.name).join(', ') ?? '';
    const coverUrl = book.cover?.large ?? book.cover?.medium ?? book.cover?.small ?? '';

    return {
      isbn,
      title: book.title ?? '',
      author,
      publisher,
      publishingDate: book.publish_date ?? '',
      language: '',
      pages: book.number_of_pages ?? '',
      genre: book.subjects?.[0]?.name ?? '',
      summary: book.notes?.value ?? book.notes ?? '',
      coverUrl,
    };
  } catch {
    return null;
  }
}
