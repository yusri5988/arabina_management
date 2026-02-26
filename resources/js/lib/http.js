function readCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

function writeCsrfToken(token) {
  const el = document.querySelector('meta[name="csrf-token"]');
  if (el && token) {
    el.setAttribute('content', token);
  }
}

async function refreshCsrfToken() {
  const response = await fetch('/csrf-token', {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (response.ok && payload?.token) {
    writeCsrfToken(payload.token);
    return payload.token;
  }

  return '';
}

export async function apiFetchJson(url, options = {}) {
  const makeRequest = async (csrfToken) => {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(options.headers ?? {}),
    };

    if (csrfToken) {
      headers['X-CSRF-TOKEN'] = csrfToken;
    }

    return fetch(url, {
      ...options,
      credentials: 'same-origin',
      headers,
    });
  };

  let token = readCsrfToken();
  let response = await makeRequest(token);

  if (response.status === 419) {
    token = await refreshCsrfToken();
    response = await makeRequest(token);
  }

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}
