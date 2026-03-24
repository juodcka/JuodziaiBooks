/**
 * Renders the sidebar shelf lists and updates the active link highlight.
 */

/**
 * Render shared and personal shelf lists in the sidebar.
 * @param {import('../shelves.js').ShelfDoc[]} shelves
 * @param {string} currentUid
 * @param {string} activeShelfId - currently viewed shelf ID (or '' for All Books)
 * @param {{ onSelect: (shelfId: string) => void, onDelete: (shelf: import('../shelves.js').ShelfDoc) => void }} callbacks
 */
export function renderSidebarShelves(shelves, currentUid, activeShelfId, { onSelect, onDelete }) {
  const sharedList = document.getElementById('shared-shelves-list');
  const myList     = document.getElementById('my-shelves-list');
  sharedList.innerHTML = '';
  myList.innerHTML = '';

  const shared = shelves.filter(s => s.isShared);
  const mine   = shelves.filter(s => !s.isShared && s.createdBy?.uid === currentUid);

  renderShelfItems(sharedList, shared, activeShelfId, { onSelect, onDelete, currentUid, allowDelete: false });
  renderShelfItems(myList,     mine,   activeShelfId, { onSelect, onDelete, currentUid, allowDelete: true });

  // "All Books" link active state
  const allLink = document.querySelector('.sidebar__link[data-route="/"]');
  if (allLink) {
    allLink.classList.toggle('active', !activeShelfId);
  }
}

function renderShelfItems(listEl, shelves, activeShelfId, { onSelect, onDelete, currentUid, allowDelete }) {
  shelves.forEach(shelf => {
    const li = document.createElement('li');
    li.className = 'shelf-list__item';

    const a = document.createElement('a');
    a.className = 'shelf-list__link' + (shelf.id === activeShelfId ? ' active' : '');
    a.textContent = shelf.name;
    a.setAttribute('href', `#/shelf/${shelf.id}`);
    a.addEventListener('click', e => {
      e.preventDefault();
      onSelect(shelf.id);
    });

    const count = document.createElement('span');
    count.className = 'shelf-list__count';
    count.textContent = shelf.bookIds?.length ?? 0;

    li.appendChild(a);
    li.appendChild(count);

    // Only show delete for non-default, personal shelves
    if (allowDelete && !shelf.isDefault) {
      const del = document.createElement('button');
      del.className = 'shelf-list__delete';
      del.title = 'Delete shelf';
      del.textContent = '×';
      del.addEventListener('click', e => {
        e.stopPropagation();
        onDelete(shelf);
      });
      li.appendChild(del);
    }

    listEl.appendChild(li);
  });
}

/**
 * Update the topbar title to match the current view.
 * @param {string} title
 */
export function setViewTitle(title) {
  const el = document.getElementById('view-title');
  if (el) el.textContent = title;
}
