const API = 'http://localhost:8080/api';
const $ = (id) => document.getElementById(id);
let currentPage = 0;
let totalPages = 0;
let searchTitle = '';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  } catch {
    throw new Error('Cannot connect to the backend. Start the Spring Boot application first.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body;
}

function notify(message, error = false) {
  const notice = $('notice');
  notice.textContent = message;
  notice.classList.toggle('error', error);
  notice.hidden = false;
}

function cell(row, text) {
  const td = document.createElement('td');
  td.textContent = text;
  row.append(td);
  return td;
}

async function loadBooks() {
  const params = new URLSearchParams({ page: currentPage, size: 10 });
  if (searchTitle) params.set('title', searchTitle);
  const result = await request(`/books?${params}`);
  totalPages = result.totalPages;
  $('book-count').textContent = `${result.totalElements} titles`;
  $('page-label').textContent = totalPages ? `Page ${currentPage + 1} of ${totalPages}` : 'No results';
  $('prev-page').disabled = currentPage === 0;
  $('next-page').disabled = currentPage + 1 >= totalPages;

  const rows = $('book-rows');
  rows.replaceChildren();
  if (!result.content.length) {
    const row = document.createElement('tr');
    cell(row, 'No books found. Add a book or try another search.').colSpan = 4;
    rows.append(row);
    return;
  }
  for (const book of result.content) {
    const row = document.createElement('tr');
    const details = cell(row, '');
    const title = document.createElement('strong');
    title.textContent = book.title;
    const author = document.createElement('span');
    author.className = 'sub';
    author.textContent = book.author;
    details.append(title, author);
    cell(row, book.isbn);
    const stock = cell(row, '');
    const badge = document.createElement('span');
    badge.className = `stock${book.availableCopies ? '' : ' empty'}`;
    badge.textContent = `${book.availableCopies} / ${book.totalCopies}`;
    stock.append(badge);
    const action = cell(row, '');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button ghost';
    button.textContent = 'Select';
    button.disabled = book.availableCopies === 0;
    button.addEventListener('click', () => {
      $('borrow-book').value = book.id;
      $('borrow-member').focus();
      notify(`Selected “${book.title}”. Enter a reader ID to borrow it.`);
    });
    action.append(button);
    const addCopy = document.createElement('button');
    addCopy.type = 'button';
    addCopy.className = 'button ghost';
    addCopy.textContent = 'Add copy';
    addCopy.setAttribute('aria-label', `Add one copy of ${book.title}`);
    addCopy.addEventListener('click', () => run(async () => {
      await request(`/books/${book.id}/copies`, {
        method: 'POST', body: JSON.stringify({ count: 1 })
      });
      await loadBooks();
      notify(`Added one copy of “${book.title}”.`);
    }));
    action.append(addCopy);
    rows.append(row);
  }
}

async function loadLoans(memberId) {
  const loans = await request(`/members/${memberId}/loans`);
  const container = $('loan-list');
  container.replaceChildren();
  container.classList.remove('muted');
  if (!loans.length) {
    container.textContent = 'No loans for this reader yet.';
    return;
  }
  for (const loan of loans) {
    const row = document.createElement('div');
    row.className = 'loan-item';
    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = loan.bookTitle;
    const dates = document.createElement('p');
    dates.textContent = loan.returnedAt ? `Returned ${loan.returnedAt}` : `Due ${loan.dueAt} · ${loan.barcode}`;
    details.append(title, dates);
    row.append(details);
    if (!loan.returnedAt) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button secondary';
      button.textContent = 'Return';
      button.addEventListener('click', () => run(async () => {
        await request(`/loans/${loan.id}/return`, { method: 'POST' });
        await Promise.all([loadLoans(memberId), loadBooks()]);
        notify(`Copy returned for “${loan.bookTitle}”.`);
      }));
      row.append(button);
    }
    container.append(row);
  }
}

async function run(action) {
  try { await action(); } catch (error) { notify(error.message, true); }
}

$('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  searchTitle = $('search').value.trim();
  currentPage = 0;
  run(loadBooks);
});
$('prev-page').addEventListener('click', () => { currentPage--; run(loadBooks); });
$('next-page').addEventListener('click', () => { currentPage++; run(loadBooks); });

$('book-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  run(async () => {
    const data = new FormData(form);
    const book = await request('/books', { method: 'POST', body: JSON.stringify({
      title: data.get('title'), author: data.get('author'), isbn: data.get('isbn'),
      copies: Number(data.get('copies'))
    }) });
    form.reset();
    $('search').value = '';
    searchTitle = '';
    currentPage = 0;
    await loadBooks();
    notify(`Added “${book.title}” with ${book.totalCopies} copies.`);
  });
});

$('member-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  run(async () => {
    const data = new FormData(form);
    const member = await request('/members', { method: 'POST', body: JSON.stringify({
      name: data.get('name'), email: data.get('email')
    }) });
    form.reset();
    $('borrow-member').value = member.id;
    $('history-member').value = member.id;
    notify(`Registered ${member.name}. Reader ID: ${member.id}.`);
  });
});

$('borrow-form').addEventListener('submit', (event) => {
  event.preventDefault();
  run(async () => {
    const memberId = Number($('borrow-member').value);
    const loan = await request('/loans', { method: 'POST', body: JSON.stringify({
      memberId, bookId: Number($('borrow-book').value)
    }) });
    $('history-member').value = memberId;
    await Promise.all([loadBooks(), loadLoans(memberId)]);
    notify(`Borrowed “${loan.bookTitle}”. Due ${loan.dueAt}.`);
  });
});

$('history-form').addEventListener('submit', (event) => {
  event.preventDefault();
  run(() => loadLoans(Number($('history-member').value)));
});

run(loadBooks);
