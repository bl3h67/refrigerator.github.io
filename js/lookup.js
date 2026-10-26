/* Citebox – automatic metadata lookup using free, CORS-enabled public APIs.
 *  - DOIs / article titles: Crossref
 *  - ISBNs / book titles: Google Books, falling back to Open Library
 *  - Web pages: Microlink (YouTube/Vimeo via noembed)
 * Everything returns plain citation drafts: { type, fields, contributors }. */
(function () {
  'use strict';

  const DOI_RE = /\b(10\.\d{4,9}\/[^\s"<>]+)/i;
  const ORG_HINT = /\b(inc|ltd|llc|plc|university|institute|organi[sz]ation|association|society|council|department|ministry|agency|news|bbc|cnn|team|staff|editors|foundation|group|corporation|company|centre|center|office|government|wikipedia|wikimedia|contributors|projects|nhs|who|un)\b/i;

  function detect(q) {
    const s = q.trim();
    const doi = s.match(DOI_RE);
    if (doi) return { kind: 'doi', value: doi[1].replace(/[.,;)]+$/, '') };
    const digits = s.replace(/[\s-]/g, '');
    if (/^(97[89])?\d{9}[\dXx]$/.test(digits)) return { kind: 'isbn', value: digits.toUpperCase() };
    if (/^https?:\/\//i.test(s) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(s)) {
      return { kind: 'url', value: /^https?:\/\//i.test(s) ? s : 'https://' + s };
    }
    return { kind: 'text', value: s };
  }

  function parseName(raw) {
    const s = String(raw || '').replace(/\s+/g, ' ').replace(/^by\s+/i, '').trim();
    if (!s) return null;
    if (ORG_HINT.test(s) || s.split(' ').length > 3) return { role: 'author', literal: s };
    if (s.includes(',')) {
      const [family, given] = s.split(',').map((x) => x.trim());
      return { role: 'author', given: given || '', family };
    }
    const parts = s.split(' ');
    if (parts.length === 1) return { role: 'author', literal: parts[0] };
    return { role: 'author', given: parts.slice(0, -1).join(' '), family: parts[parts.length - 1] };
  }
  function splitAuthors(str) {
    if (!str) return [];
    return String(str).split(/\s*(?:;|\band\b|&|\|)\s*/i).map(parseName).filter(Boolean);
  }

  function dateFromParts(parts) {
    const p = (parts && parts[0]) || [];
    return { y: p[0] ? String(p[0]) : '', m: p[1] ? String(p[1]) : '', d: p[2] ? String(p[2]) : '' };
  }
  function dateFromString(s) {
    if (!s) return { y: '', m: '', d: '' };
    const iso = String(s).match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
    if (iso) return { y: iso[1], m: iso[2] ? String(+iso[2]) : '', d: iso[3] ? String(+iso[3]) : '' };
    const dt = new Date(s);
    if (!isNaN(dt)) return { y: String(dt.getFullYear()), m: String(dt.getMonth() + 1), d: String(dt.getDate()) };
    const y = String(s).match(/\b(1[5-9]\d\d|20\d\d)\b/);
    return { y: y ? y[1] : '', m: '', d: '' };
  }
  function today() {
    const d = new Date();
    return { y: String(d.getFullYear()), m: String(d.getMonth() + 1), d: String(d.getDate()) };
  }
  const unhtml = (s) => {
    const el = document.createElement('div');
    el.innerHTML = s || '';
    return el.textContent.replace(/\s+/g, ' ').trim();
  };

  async function getJSON(url, timeout = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }

  /* ---------- Crossref ---------- */
  const CR_TYPES = {
    'journal-article': 'journal', book: 'book', monograph: 'book', 'edited-book': 'book', 'reference-book': 'book',
    'book-chapter': 'chapter', 'book-section': 'chapter', 'book-part': 'chapter', 'reference-entry': 'encyclopedia',
    'proceedings-article': 'conference', report: 'report', dissertation: 'thesis', dataset: 'dataset', 'posted-content': 'journal',
  };
  function fromCrossref(w) {
    const type = CR_TYPES[w.type] || 'journal';
    const person = (role) => (p) => (p.name ? { role, literal: p.name } : { role, given: p.given || '', family: p.family || '' });
    const contributors = (w.author || []).map(person('author')).concat((w.editor || []).map(person('editor')));
    const issued = dateFromParts((w['published-print'] || w['published-online'] || w.issued || {})['date-parts']);
    let title = unhtml((w.title || [])[0] || '');
    if (w.subtitle && w.subtitle[0] && type === 'book') title += ': ' + unhtml(w.subtitle[0]);
    return {
      type,
      contributors,
      fields: {
        title,
        containerTitle: unhtml((w['container-title'] || [])[0] || ''),
        volume: w.volume || '', issue: w.issue || '', pages: (w.page || '').replace(/-/g, '–'),
        doi: w.DOI || '', url: '', publisher: type === 'journal' ? '' : w.publisher || '',
        isbn: (w.ISBN || [])[0] || '', issued,
        place: type === 'book' || type === 'chapter' ? w['publisher-location'] || '' : '',
      },
    };
  }
  async function byDoi(doi) {
    const j = await getJSON('https://api.crossref.org/works/' + encodeURIComponent(doi));
    return fromCrossref(j.message);
  }
  async function searchCrossref(q, filter) {
    const params = new URLSearchParams({ 'query.bibliographic': q, rows: '12', select: 'DOI,title,subtitle,author,editor,container-title,volume,issue,page,published-print,published-online,issued,publisher,publisher-location,type,ISBN' });
    if (filter) params.set('filter', filter);
    const j = await getJSON('https://api.crossref.org/works?' + params);
    return (j.message.items || []).map(fromCrossref);
  }

  /* ---------- Books ---------- */
  function fromGoogle(v) {
    const i = v.volumeInfo || {};
    const isbn = (i.industryIdentifiers || []).find((x) => x.type === 'ISBN_13') || (i.industryIdentifiers || [])[0];
    return {
      type: 'book',
      contributors: (i.authors || []).map(parseName).filter(Boolean),
      fields: {
        title: i.title + (i.subtitle ? ': ' + i.subtitle : ''), publisher: i.publisher || '',
        issued: dateFromString(i.publishedDate), isbn: isbn ? isbn.identifier : '', url: '',
      },
      thumb: i.imageLinks && (i.imageLinks.smallThumbnail || i.imageLinks.thumbnail),
    };
  }
  function fromOpenLibrary(d) {
    return {
      type: 'book',
      contributors: (d.author_name || []).slice(0, 10).map(parseName).filter(Boolean),
      fields: {
        title: d.title + (d.subtitle ? ': ' + d.subtitle : ''), publisher: (d.publisher || [])[0] || '',
        issued: { y: d.first_publish_year ? String(d.first_publish_year) : '', m: '', d: '' },
        isbn: (d.isbn || [])[0] || '', url: '',
      },
      thumb: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : '',
    };
  }
  async function searchBooks(q, isIsbn) {
    try {
      const j = await getJSON('https://www.googleapis.com/books/v1/volumes?maxResults=12&printType=books&q=' + encodeURIComponent(isIsbn ? 'isbn:' + q : q));
      const items = (j.items || []).map(fromGoogle).filter((x) => x.fields.title);
      if (items.length) return items;
    } catch (e) { /* fall through to Open Library */ }
    const j = await getJSON('https://openlibrary.org/search.json?limit=12&fields=title,subtitle,author_name,publisher,first_publish_year,isbn,publish_place,cover_i&' + (isIsbn ? 'isbn=' : 'q=') + encodeURIComponent(q));
    return (j.docs || []).map(fromOpenLibrary);
  }

  /* ---------- Websites ---------- */
  function siteName(url) {
    try {
      const h = new URL(url).hostname.replace(/^www\./, '');
      const base = h.split('.').slice(-2, -1)[0] || h;
      const known = { youtube: 'YouTube', bbc: 'BBC', nytimes: 'The New York Times', theguardian: 'The Guardian', wikipedia: 'Wikipedia', github: 'GitHub', medium: 'Medium', nih: 'National Institutes of Health', who: 'World Health Organization' };
      return known[base] || base.charAt(0).toUpperCase() + base.slice(1);
    } catch (e) { return ''; }
  }
  async function byUrl(url, preferType) {
    const isVideo = /youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com/i.test(url);
    const base = {
      type: preferType && preferType !== 'website' ? preferType : isVideo ? 'video' : 'website',
      contributors: [],
      fields: { title: '', url, containerTitle: siteName(url), publisher: '', issued: { y: '', m: '', d: '' }, accessed: today() },
    };
    // a DOI link → treat as article
    const doi = url.match(DOI_RE);
    if (/doi\.org\//i.test(url) && doi) return byDoi(doi[1]);
    if (isVideo) {
      try {
        const j = await getJSON('https://noembed.com/embed?url=' + encodeURIComponent(url));
        if (j.title) {
          base.fields.title = j.title;
          base.fields.containerTitle = j.provider_name || base.fields.containerTitle;
          if (j.author_name) base.contributors = [{ role: 'author', literal: j.author_name }];
        }
      } catch (e) { /* ignore */ }
    }
    try {
      const j = await getJSON('https://api.microlink.io/?url=' + encodeURIComponent(url), 15000);
      const d = j.data || {};
      if (d.title && !base.fields.title) base.fields.title = d.title;
      if (d.publisher) base.fields.containerTitle = d.publisher;
      if (d.date) {
        const dt = dateFromString(d.date);
        // Microlink returns "now" when it finds no date; ignore today's date
        const t = today();
        if (!(dt.y === t.y && dt.m === t.m && dt.d === t.d)) base.fields.issued = dt;
      }
      if (d.author && !base.contributors.length) base.contributors = splitAuthors(d.author);
      if (d.url) base.fields.url = d.url;
    } catch (e) { base.partial = true; }
    // drop a trailing " - Site name" / " | Site name" from page titles
    if (base.fields.title) {
      const site = (base.fields.containerTitle || '').toLowerCase();
      const host = siteName(url).toLowerCase();
      const m = base.fields.title.match(/^(.*\S)\s+[|\-–—:·]\s+([^|\-–—]+)$/);
      if (m) {
        const tail = m[2].trim().toLowerCase();
        if (tail && (site.includes(tail) || tail.includes(host) || host.includes(tail) || (site && tail.includes(site.split(' ')[0])))) {
          if (!base.fields.containerTitle || /foundation|inc\.?$/i.test(base.fields.containerTitle)) base.fields.containerTitle = m[2].trim();
          base.fields.title = m[1];
        }
      }
    }
    if (!base.fields.title) {
      base.partial = true;
      try {
        const path = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
        base.fields.title = decodeURIComponent(path).replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
      } catch (e) { /* ignore */ }
    }
    return base;
  }

  /* ---------- entry point ----------
   * Returns { direct: draft } when the input identifies a single source,
   * or { results: [drafts] } for a free-text search. */
  async function lookup(query, tabType) {
    const d = detect(query);
    if (d.kind === 'doi') return { direct: await byDoi(d.value) };
    if (d.kind === 'isbn') {
      const r = await searchBooks(d.value, true);
      if (!r.length) throw new Error('No book found for that ISBN.');
      return { direct: r[0] };
    }
    if (d.kind === 'url') return { direct: await byUrl(d.value, tabType) };
    if (tabType === 'book' || tabType === 'chapter') return { results: await searchBooks(d.value) };
    if (tabType === 'journal') return { results: await searchCrossref(d.value, 'type:journal-article') };
    // websites and anything else: search everything scholarly + books
    const [a, b] = await Promise.allSettled([searchCrossref(d.value), searchBooks(d.value)]);
    const res = [];
    const A = a.status === 'fulfilled' ? a.value : [];
    const B = b.status === 'fulfilled' ? b.value : [];
    for (let k = 0; k < Math.max(A.length, B.length); k++) {
      if (B[k]) res.push(B[k]);
      if (A[k]) res.push(A[k]);
    }
    return { results: res };
  }

  window.Lookup = { lookup, detect, parseName, dateFromString, today };
})();
