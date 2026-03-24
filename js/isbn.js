/**
 * Fetch book data by ISBN.
 * Tries Google Books first; falls back to Open Library.
 *
 * @param {string} isbn
 * @returns {Promise<BookData | null>}
 *
 * @typedef {Object} BookData
 * @property {string}   isbn13
 * @property {string}   isbn10
 * @property {string}   title
 * @property {string}   subtitle
 * @property {string}   author
 * @property {string}   publisher
 * @property {string}   publishingDate
 * @property {string}   language
 * @property {number|string} pages
 * @property {string[]} categories
 * @property {string}   summary
 * @property {string}   coverUrl
 * @property {string}   googleBooksUrl
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

    // Extract both ISBN-13 and ISBN-10 from industryIdentifiers
    const ids = info.industryIdentifiers ?? [];
    const isbn13 = ids.find(i => i.type === 'ISBN_13')?.identifier ?? isbn;
    const isbn10 = ids.find(i => i.type === 'ISBN_10')?.identifier ?? '';

    // Prefer the largest available cover image
    const images = info.imageLinks ?? {};
    const coverUrl = (
      images.extraLarge ??
      images.large ??
      images.medium ??
      images.thumbnail ??
      images.smallThumbnail ??
      ''
    ).replace('http:', 'https:');

    return {
      isbn13,
      isbn10,
      title:          info.title ?? '',
      subtitle:       info.subtitle ?? '',
      author:         info.authors?.join(', ') ?? '',
      publisher:      info.publisher ?? '',
      publishingDate: info.publishedDate ?? '',
      language:       info.language ?? '',
      pages:          info.pageCount ?? '',
      categories:     info.categories ?? [],
      summary:        info.description ?? '',
      coverUrl,
      googleBooksUrl: info.infoLink ?? '',
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

    const is13 = isbn.length === 13;
    const coverUrl = book.cover?.large ?? book.cover?.medium ?? book.cover?.small ?? '';

    return {
      isbn13:         is13 ? isbn : '',
      isbn10:         is13 ? '' : isbn,
      title:          book.title ?? '',
      subtitle:       book.subtitle ?? '',
      author:         book.authors?.map(a => a.name).join(', ') ?? '',
      publisher:      book.publishers?.map(p => p.name).join(', ') ?? '',
      publishingDate: book.publish_date ?? '',
      language:       '',
      pages:          book.number_of_pages ?? '',
      categories:     book.subjects?.map(s => s.name) ?? [],
      summary:        book.notes?.value ?? book.notes ?? '',
      coverUrl,
      googleBooksUrl: '',
    };
  } catch {
    return null;
  }
}
