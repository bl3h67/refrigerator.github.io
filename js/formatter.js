/* Citebox – citation formatting engine.
 * Turns a citation object { type, fields, contributors } into an HTML string
 * for each supported style. Only <i> tags are emitted; all values are escaped. */
(function () {
  'use strict';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_MLA = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_IEEE = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

  const STYLES = {
    apa7: { name: 'APA 7 (American Psychological Association 7th edition)', short: 'APA 7', heading: 'References', numbered: false },
    mla9: { name: 'MLA 9 (Modern Language Association 9th edition)', short: 'MLA 9', heading: 'Works Cited', numbered: false },
    harvard: { name: 'Harvard', short: 'Harvard', heading: 'Reference list', numbered: false },
    chicago: { name: 'Chicago 17th (notes & bibliography)', short: 'Chicago', heading: 'Bibliography', numbered: false },
    ieee: { name: 'IEEE (Institute of Electrical and Electronics Engineers)', short: 'IEEE', heading: 'References', numbered: true },
    ama: { name: 'AMA 11 (American Medical Association 11th edition)', short: 'AMA', heading: 'References', numbered: true },
    vancouver: { name: 'Vancouver', short: 'Vancouver', heading: 'References', numbered: true },
  };

  // Source types. `part` = the title is a piece of a larger container.
  const TYPES = {
    website: { label: 'Website', emoji: '🌐', part: false, web: true, roles: ['author', 'editor'],
      sections: [['Page/Article', ['title', 'issued', 'url', 'accessed']], ['Website', ['containerTitle', 'publisher']]],
      labels: { title: 'Title of article or page', containerTitle: 'Website name', author: 'Webpage author' },
      important: ['title', 'url', 'containerTitle'] },
    book: { label: 'Book', emoji: '📚', part: false, roles: ['author', 'editor', 'translator'],
      sections: [['Book', ['title', 'edition', 'volume', 'issued', 'publisher', 'place', 'isbn', 'doi', 'url']]],
      labels: { title: 'Book title', author: 'Author' }, important: ['title', 'issued', 'publisher'] },
    journal: { label: 'Journal', emoji: '📜', part: true, roles: ['author'],
      sections: [['Article', ['title', 'issued', 'pages', 'doi', 'url']], ['Journal', ['containerTitle', 'volume', 'issue']]],
      labels: { title: 'Article title', containerTitle: 'Journal name', author: 'Author' },
      important: ['title', 'issued', 'containerTitle', 'volume', 'pages'] },
    chapter: { label: 'Book chapter', emoji: '📖', part: true, roles: ['author', 'editor', 'translator'],
      sections: [['Chapter', ['title', 'pages']], ['Book', ['containerTitle', 'edition', 'issued', 'publisher', 'place', 'isbn', 'doi']]],
      labels: { title: 'Chapter title', containerTitle: 'Book title', author: 'Chapter author' },
      important: ['title', 'containerTitle', 'issued', 'publisher'] },
    newspaper: { label: 'Newspaper article', emoji: '📰', part: true, web: true, roles: ['author'],
      sections: [['Article', ['title', 'issued', 'pages', 'url', 'accessed']], ['Newspaper', ['containerTitle', 'place']]],
      labels: { title: 'Article title', containerTitle: 'Newspaper name', author: 'Author' }, important: ['title', 'containerTitle', 'issued'] },
    magazine: { label: 'Magazine article', emoji: '🗞️', part: true, web: true, roles: ['author'],
      sections: [['Article', ['title', 'issued', 'pages', 'url', 'accessed']], ['Magazine', ['containerTitle', 'volume', 'issue']]],
      labels: { title: 'Article title', containerTitle: 'Magazine name', author: 'Author' }, important: ['title', 'containerTitle', 'issued'] },
    video: { label: 'Video', emoji: '🎬', part: false, web: true, roles: ['author'],
      sections: [['Video', ['title', 'issued', 'url', 'accessed']], ['Platform', ['containerTitle']]],
      labels: { title: 'Video title', containerTitle: 'Platform (e.g. YouTube)', author: 'Uploader / creator' }, important: ['title', 'url', 'containerTitle'] },
    film: { label: 'Film / movie', emoji: '🎞️', part: false, roles: ['director', 'author'],
      sections: [['Film', ['title', 'issued', 'publisher', 'medium', 'url']]],
      labels: { title: 'Film title', publisher: 'Production company', medium: 'Format (e.g. DVD)' }, important: ['title', 'issued'] },
    podcast: { label: 'Podcast episode', emoji: '🎙️', part: true, web: true, roles: ['host', 'author'],
      sections: [['Episode', ['title', 'number', 'issued', 'url', 'accessed']], ['Podcast', ['containerTitle', 'publisher']]],
      labels: { title: 'Episode title', number: 'Episode number', containerTitle: 'Podcast name' }, important: ['title', 'containerTitle', 'issued'] },
    report: { label: 'Report', emoji: '📊', part: false, roles: ['author', 'editor'],
      sections: [['Report', ['title', 'number', 'issued', 'publisher', 'place', 'doi', 'url', 'accessed']]],
      labels: { title: 'Report title', number: 'Report number', publisher: 'Publisher / organisation' }, important: ['title', 'issued', 'publisher'] },
    thesis: { label: 'Thesis / dissertation', emoji: '🎓', part: false, roles: ['author'],
      sections: [['Thesis', ['title', 'medium', 'issued', 'publisher', 'place', 'url', 'doi']]],
      labels: { title: 'Thesis title', medium: 'Type (e.g. Doctoral dissertation)', publisher: 'Institution' }, important: ['title', 'issued', 'publisher'] },
    conference: { label: 'Conference paper', emoji: '🎤', part: true, roles: ['author', 'editor'],
      sections: [['Paper', ['title', 'pages', 'doi', 'url']], ['Proceedings', ['containerTitle', 'issued', 'publisher', 'place']]],
      labels: { title: 'Paper title', containerTitle: 'Proceedings / conference name' }, important: ['title', 'containerTitle', 'issued'] },
    encyclopedia: { label: 'Encyclopedia entry', emoji: '📕', part: true, web: true, roles: ['author', 'editor'],
      sections: [['Entry', ['title', 'issued', 'url', 'accessed']], ['Encyclopedia', ['containerTitle', 'edition', 'publisher']]],
      labels: { title: 'Entry title', containerTitle: 'Encyclopedia name' }, important: ['title', 'containerTitle'] },
    blog: { label: 'Blog post', emoji: '✍️', part: true, web: true, roles: ['author'],
      sections: [['Post', ['title', 'issued', 'url', 'accessed']], ['Blog', ['containerTitle']]],
      labels: { title: 'Post title', containerTitle: 'Blog name' }, important: ['title', 'url', 'containerTitle'] },
    software: { label: 'Software', emoji: '💾', part: false, roles: ['author'],
      sections: [['Software', ['title', 'edition', 'issued', 'publisher', 'url', 'accessed']]],
      labels: { edition: 'Version', publisher: 'Publisher / developer' }, important: ['title', 'issued'] },
    dataset: { label: 'Dataset', emoji: '🗂️', part: false, roles: ['author'],
      sections: [['Dataset', ['title', 'edition', 'issued', 'publisher', 'doi', 'url', 'accessed']]],
      labels: { edition: 'Version', publisher: 'Repository / publisher' }, important: ['title', 'issued', 'publisher'] },
    image: { label: 'Image / artwork', emoji: '🖼️', part: false, web: true, roles: ['author'],
      sections: [['Image', ['title', 'medium', 'issued', 'containerTitle', 'url', 'accessed']]],
      labels: { author: 'Artist / creator', medium: 'Medium (e.g. Photograph)', containerTitle: 'Website / museum' }, important: ['title'] },
    misc: { label: 'Other / generic', emoji: '📎', part: false, roles: ['author', 'editor'],
      sections: [['Source', ['title', 'containerTitle', 'medium', 'issued', 'publisher', 'place', 'url', 'accessed']]],
      labels: { containerTitle: 'Container (part of…)', medium: 'Description' }, important: ['title'] },
    preformatted: { label: 'Pre-formatted', emoji: '📋', part: false, roles: [], sections: [], labels: {}, important: [] },
  };

  const FIELDS = {
    title: 'Title', containerTitle: 'Container title', issued: 'Date published', accessed: 'Date accessed / viewed',
    url: 'URL', doi: 'DOI', isbn: 'ISBN', publisher: 'Publisher', place: 'Place published', edition: 'Edition',
    volume: 'Volume', issue: 'Issue', pages: 'Pages', number: 'Number', medium: 'Medium', annotation: 'Annotation',
  };
  const DATE_FIELDS = ['issued', 'accessed'];
  const ROLE_LABELS = { author: 'Author', editor: 'Editor', translator: 'Translator', director: 'Director', host: 'Host' };

  /* ---------- small helpers ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const i = (s) => (s ? `<i>${s}</i>` : '');
  const strip = (html) => String(html).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const lastChar = (html) => strip(html).trim().slice(-1);
  // add a terminal mark unless the visible text already ends with punctuation
  function end(html, mark = '.') {
    if (!html) return '';
    return /[.?!]/.test(lastChar(html)) ? html : html + mark;
  }
  function clean(html) {
    return html.replace(/\s+/g, ' ').replace(/ ([.,;:])/g, '$1').replace(/\.\./g, '.').replace(/,,/g, ',').replace(/\(\s*\)/g, '').trim();
  }
  const pages = (p) => (p ? String(p).replace(/\s*[-‐‑–—]+\s*/g, '–') : '');
  const multiPage = (p) => /[–,]/.test(pages(p));
  const doiUrl = (d) => (d ? 'https://doi.org/' + String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '') : '');
  const bareDoi = (d) => (d ? String(d).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '') : '');
  function ordinal(n) {
    const v = parseInt(n, 10);
    if (!v) return String(n);
    const s = ['th', 'st', 'nd', 'rd'], m = v % 100;
    return v + (s[(m - 20) % 10] || s[m] || s[0]);
  }
  function editionText(ed, suffix = 'ed.') {
    if (!ed) return '';
    if (/^\d+$/.test(String(ed).trim())) return `${ordinal(ed)} ${suffix}`;
    return /ed\.?$/i.test(ed) ? ed : `${ed} ${suffix}`;
  }
  function hasDate(d) { return d && (d.y || d.m || d.d); }
  function year(d) { return d && d.y ? String(d.y) : ''; }
  function monthIdx(d) { const m = d && parseInt(d.m, 10); return m >= 1 && m <= 12 ? m - 1 : -1; }

  /* ---------- names ---------- */
  function initials(given, withDots = true, spaced = true) {
    if (!given) return '';
    return given.trim().split(/\s+/).map((part) =>
      part.split('-').map((p) => (p ? p[0].toUpperCase() + (withDots ? '.' : '') : '')).join('-')
    ).join(withDots && spaced ? ' ' : '');
  }
  const isOrg = (p) => !!p.literal;
  const nm = {
    familyInit: (p) => (isOrg(p) ? esc(p.literal) : esc(p.family + (p.given ? ', ' + initials(p.given) : ''))),
    familyInitNoSpace: (p) => (isOrg(p) ? esc(p.literal) : esc(p.family + (p.given ? ', ' + initials(p.given, true, false) : ''))),
    initFamily: (p) => (isOrg(p) ? esc(p.literal) : esc((p.given ? initials(p.given) + ' ' : '') + p.family)),
    familyGiven: (p) => (isOrg(p) ? esc(p.literal) : esc(p.family + (p.given ? ', ' + p.given : ''))),
    givenFamily: (p) => (isOrg(p) ? esc(p.literal) : esc((p.given ? p.given + ' ' : '') + p.family)),
    compact: (p) => (isOrg(p) ? esc(p.literal) : esc(p.family + (p.given ? ' ' + initials(p.given, false) : ''))),
  };
  const valid = (p) => p && (p.literal || p.family || p.given);
  function people(c, role) {
    return (c.contributors || []).filter((p) => p.role === role && valid(p)).map((p) => (p.family || p.literal ? p : { ...p, family: p.given, given: '' }));
  }
  function joinNames(list, sep, lastSep, twoSep) {
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    if (list.length === 2) return list[0] + (twoSep != null ? twoSep : lastSep) + list[1];
    return list.slice(0, -1).join(sep) + lastSep + list[list.length - 1];
  }
  function familyOf(p) { return isOrg(p) ? p.literal : p.family; }

  /* ---------- dates ---------- */
  const date = {
    apa(d, full) {
      if (!hasDate(d)) return 'n.d.';
      if (!full || monthIdx(d) < 0) return year(d) || 'n.d.';
      return `${year(d)}, ${MONTHS[monthIdx(d)]}${d.d ? ' ' + parseInt(d.d, 10) : ''}`;
    },
    mla(d) {
      if (!hasDate(d)) return '';
      const m = monthIdx(d);
      return [d.d && m >= 0 ? parseInt(d.d, 10) : '', m >= 0 ? MONTHS_MLA[m] : '', year(d)].filter(Boolean).join(' ');
    },
    long(d) { // 5 March 2024
      if (!hasDate(d)) return '';
      const m = monthIdx(d);
      return [d.d && m >= 0 ? parseInt(d.d, 10) : '', m >= 0 ? MONTHS[m] : '', year(d)].filter(Boolean).join(' ');
    },
    harvardAccess(d) { // 5 Mar. 2024
      if (!hasDate(d)) return '';
      const m = monthIdx(d);
      return [d.d && m >= 0 ? parseInt(d.d, 10) : '', m >= 0 ? MONTHS_MLA[m] : '', year(d)].filter(Boolean).join(' ');
    },
    us(d) { // March 5, 2024
      if (!hasDate(d)) return '';
      const m = monthIdx(d);
      if (m < 0) return year(d);
      return `${MONTHS[m]}${d.d ? ' ' + parseInt(d.d, 10) : ''}${year(d) ? ', ' + year(d) : ''}`;
    },
    ieee(d) {
      if (!hasDate(d)) return '';
      const m = monthIdx(d);
      if (m < 0) return year(d);
      return `${MONTHS_IEEE[m]}${d.d ? ' ' + parseInt(d.d, 10) + ',' : ''} ${year(d)}`;
    },
    vanc(d) { // 2024 Mar 5
      if (!hasDate(d)) return '';
      const m = monthIdx(d);
      return [year(d), m >= 0 ? MONTHS_SHORT[m] : '', d.d && m >= 0 ? parseInt(d.d, 10) : ''].filter(Boolean).join(' ');
    },
  };

  /* ---------- common context ---------- */
  function ctx(c) {
    const f = c.fields || {};
    const e = (k) => esc((f[k] || '').toString().trim());
    return {
      f, e, t: TYPES[c.type] || TYPES.misc, type: c.type,
      authors: people(c, 'author').concat(people(c, 'director'), people(c, 'host')),
      directors: people(c, 'director'), hosts: people(c, 'host'),
      editors: people(c, 'editor'), translators: people(c, 'translator'),
      title: e('title'), container: e('containerTitle'), publisher: e('publisher'), place: e('place'),
      edition: e('edition'), volume: e('volume'), issue: e('issue'), pages: esc(pages(f.pages)),
      number: e('number'), medium: e('medium'), url: e('url'), doi: esc(bareDoi(f.doi)), isbn: e('isbn'),
      issued: f.issued || {}, accessed: f.accessed || {},
    };
  }
  const link = (x) => (x.doi ? esc(doiUrl(x.doi)) : x.url);

  /* ---------- APA 7 ---------- */
  function apaAuthors(list) {
    const n = list.map(nm.familyInit);
    if (n.length > 20) return n.slice(0, 19).join(', ') + ', . . . ' + n[n.length - 1];
    if (n.length === 2) return n[0] + ', &amp; ' + n[1];
    return joinNames(n, ', ', ', &amp; ');
  }
  function apaEdNames(list) {
    return joinNames(list.map(nm.initFamily), ', ', ', &amp; ', ' &amp; ');
  }
  const APA_DESC = { video: 'Video', film: 'Film', podcast: 'Audio podcast episode', software: 'Computer software', dataset: 'Data set' };
  function apa(c) {
    const x = ctx(c);
    const fullDate = ['website', 'newspaper', 'magazine', 'blog', 'video', 'podcast', 'encyclopedia'].includes(x.type);
    const d = `(${date.apa(x.issued, fullDate)}).`;
    let author = '';
    let usedEditorsAsAuthors = false;
    if (x.authors.length) {
      author = apaAuthors(x.authors);
      if (x.type === 'film' && x.directors.length) author += ` (${x.directors.length > 1 ? 'Directors' : 'Director'})`;
      if (x.type === 'podcast' && x.hosts.length) author += ` (${x.hosts.length > 1 ? 'Hosts' : 'Host'})`;
    } else if (x.editors.length && !x.t.part) {
      author = apaAuthors(x.editors) + (x.editors.length > 1 ? ' (Eds.)' : ' (Ed.)');
      usedEditorsAsAuthors = true;
    }
    // title + bracketed descriptor
    let desc = APA_DESC[x.type] || '';
    if (x.type === 'thesis') desc = [x.medium || 'Doctoral dissertation', x.publisher].filter(Boolean).join(', ');
    if (x.type === 'image') desc = x.medium || 'Image';
    if (x.type === 'film' && x.medium) desc = 'Film; ' + x.medium;
    const paren = [];
    if (x.edition && x.type !== 'software' && x.type !== 'dataset') paren.push(editionText(x.edition));
    if ((x.type === 'software' || x.type === 'dataset') && x.edition) paren.push('Version ' + x.edition);
    if (x.volume && x.type === 'book') paren.push('Vol. ' + x.volume);
    if (x.type === 'report' && x.number) paren.push('Report No. ' + x.number);
    if (x.type === 'podcast' && x.number) paren.push('No. ' + x.number);
    let title = x.t.part ? x.title : i(x.title);
    if (x.type === 'book' && x.editors.length && !usedEditorsAsAuthors && x.authors.length) {
      paren.unshift(apaEdNames(x.editors) + (x.editors.length > 1 ? ', Eds.' : ', Ed.'));
    }
    if (!x.t.part && paren.length) title += ` (${paren.join('; ')})`;
    if (x.t.part && x.type === 'podcast' && paren.length) title += ` (${paren.join('; ')})`;
    if (desc) title += ` [${desc}]`;
    title = end(title);

    let source = '';
    const pub = x.type === 'thesis' ? '' : x.publisher;
    switch (x.type) {
      case 'journal':
      case 'magazine': {
        let s = i(x.container);
        if (x.volume) s += ', ' + i(x.volume);
        if (x.issue) s += `(${x.issue})`;
        if (x.pages) s += ', ' + x.pages;
        source = end(s);
        break;
      }
      case 'newspaper':
        source = end(i(x.container) + (x.pages ? ', ' + x.pages : ''));
        break;
      case 'chapter':
      case 'conference':
      case 'encyclopedia': {
        const ed = x.editors.length ? apaEdNames(x.editors) + (x.editors.length > 1 ? ' (Eds.), ' : ' (Ed.), ') : '';
        const inner = [x.edition ? editionText(x.edition) : '', x.pages ? (multiPage(x.f.pages) ? 'pp. ' : 'p. ') + x.pages : ''].filter(Boolean).join(', ');
        source = x.container ? end(`In ${ed}${i(x.container)}${inner ? ` (${inner})` : ''}`) : '';
        if (pub) source += ' ' + end(pub);
        break;
      }
      case 'podcast':
        source = x.container ? end('In ' + i(x.container)) : '';
        if (pub) source += ' ' + end(pub);
        break;
      case 'blog':
        source = end(i(x.container));
        break;
      default: {
        const siteSame = x.container && x.authors.length === 1 && isOrg(x.authors[0]) && x.authors[0].literal.toLowerCase() === strip(x.container).toLowerCase();
        const parts = [];
        if (x.container && !siteSame && x.type !== 'book') parts.push(end(x.container));
        if (pub && !(x.authors.length && strip(author).toLowerCase() === strip(pub).toLowerCase())) parts.push(end(pub));
        source = parts.join(' ');
      }
    }
    const l = link(x);
    let out;
    if (author) out = `${end(author)} ${d} ${title} ${source} ${l}`;
    else out = `${title} ${d} ${source} ${l}`;
    return clean(out);
  }

  /* ---------- MLA 9 ---------- */
  function mlaAuthors(list) {
    if (!list.length) return '';
    if (list.length === 1) return nm.familyGiven(list[0]);
    if (list.length === 2) return `${nm.familyGiven(list[0])}, and ${nm.givenFamily(list[1])}`;
    return `${nm.familyGiven(list[0])}, et al`;
  }
  function mla(c) {
    const x = ctx(c);
    const els = [];
    let author = mlaAuthors(x.authors.filter((p) => !x.directors.includes(p) || x.type !== 'film'));
    if (!x.authors.length && x.editors.length && !x.t.part) author = mlaAuthors(x.editors) + (x.editors.length > 1 ? ', editors' : ', editor');
    if (x.type === 'film' && !x.authors.filter((p) => !x.directors.includes(p)).length) author = '';
    // parts of a container and web pages are quoted; standalone works italicised
    const ttl = x.t.part || x.t.web ? `“${end(x.title)}”` : end(i(x.title));
    if (x.container) els.push(i(x.container));
    if (x.type === 'film' && x.directors.length) els.push('directed by ' + joinNames(x.directors.map(nm.givenFamily), ', ', ', and ', ' and '));
    if (x.editors.length && (x.t.part || x.authors.length)) els.push('edited by ' + joinNames(x.editors.map(nm.givenFamily), ', ', ', and ', ' and '));
    if (x.translators.length) els.push('translated by ' + joinNames(x.translators.map(nm.givenFamily), ', ', ', and ', ' and '));
    if (x.edition) els.push(x.type === 'software' || x.type === 'dataset' ? 'version ' + x.edition : editionText(x.edition));
    if (x.volume) els.push('vol. ' + x.volume);
    if (x.issue) els.push('no. ' + x.issue);
    if (x.number && x.type === 'podcast') els.push('episode ' + x.number);
    const skipPub = ['journal', 'newspaper', 'magazine'].includes(x.type) || (x.publisher && strip(x.publisher) === strip(x.container));
    if (x.publisher && !skipPub) els.push(x.publisher);
    const dt = date.mla(x.issued);
    if (dt) els.push(dt);
    if (x.pages) els.push((multiPage(x.f.pages) ? 'pp. ' : 'p. ') + x.pages);
    if (x.doi) els.push(esc(doiUrl(x.doi)));
    else if (x.url) els.push(x.url.replace(/^https?:\/\//, ''));
    let out = '';
    if (author) out += end(author) + ' ';
    out += ttl + ' ';
    if (els.length) out += end(els.join(', '));
    if (x.t.web && hasDate(x.accessed) && !dt) out += ' Accessed ' + end(date.mla(x.accessed));
    return clean(out);
  }

  /* ---------- Harvard ---------- */
  function harvardAuthors(list) {
    const n = list.map(nm.familyInitNoSpace);
    if (n.length >= 4) return n[0] + ' et al.';
    return joinNames(n, ', ', ' and ');
  }
  function harvard(c) {
    const x = ctx(c);
    let author = harvardAuthors(x.authors);
    if (!author && x.editors.length && !x.t.part) author = harvardAuthors(x.editors) + (x.editors.length > 1 ? ' eds.' : ' ed.');
    const yr = `(${year(x.issued) || 'n.d.'}).`;
    const title = x.t.part ? end(x.title) : end(i(x.title));
    const parts = [];
    const pubPlace = x.place && x.publisher ? `${x.place}: ${x.publisher}` : x.publisher || x.place;
    switch (x.type) {
      case 'journal':
      case 'magazine': {
        let s = i(x.container);
        if (x.volume) s += ', ' + x.volume;
        if (x.issue) s += `(${x.issue})`;
        if (x.pages) s += ', ' + (multiPage(x.f.pages) ? 'pp.' : 'p.') + x.pages;
        parts.push(end(s));
        break;
      }
      case 'newspaper':
        parts.push(end(i(x.container) + (date.long(x.issued) ? ', ' + date.long(x.issued) : '') + (x.pages ? ', ' + (multiPage(x.f.pages) ? 'pp.' : 'p.') + x.pages : '')));
        break;
      case 'chapter':
      case 'conference':
      case 'encyclopedia': {
        const ed = x.editors.length ? harvardAuthors(x.editors) + (x.editors.length > 1 ? ', eds., ' : ', ed., ') : '';
        if (x.container) parts.push(end(`In: ${ed}${i(x.container)}${x.edition ? '. ' + editionText(x.edition, 'ed') : ''}`));
        if (pubPlace) parts.push(end(pubPlace + (x.pages ? ', ' + (multiPage(x.f.pages) ? 'pp.' : 'p.') + x.pages : '')));
        else if (x.pages) parts.push(end((multiPage(x.f.pages) ? 'pp.' : 'p.') + x.pages));
        break;
      }
      default:
        if (x.edition) parts.push(end(editionText(x.edition, 'edn') + (x.type === 'software' || x.type === 'dataset' ? '' : '')));
        if (x.type === 'thesis') parts.push(end(`${x.medium || 'Doctoral dissertation'}${x.publisher ? '. ' + x.publisher : ''}`));
        if (x.type === 'video') parts.push('[video]');
        if (x.type === 'image') parts.push(`[${x.medium || 'image'}]`);
        if (x.type === 'film') parts.push('[film]');
        if (x.type === 'podcast') parts.push('[podcast]');
        if (x.t.web && x.url && !['video', 'image', 'podcast'].includes(x.type)) parts.push('[online]');
        if (x.container) parts.push(end(x.container));
        if (x.type !== 'thesis' && pubPlace) parts.push(end(pubPlace));
    }
    if (x.doi) parts.push(`doi:${x.doi}.`);
    else if (x.url) {
      parts.push(`Available at: ${x.url}`);
      if (hasDate(x.accessed)) parts.push(`[Accessed ${date.harvardAccess(x.accessed)}].`);
    }
    const head = author ? `${author} ${yr} ${title}` : `${title} ${yr}`;
    return clean(`${head} ${parts.join(' ')}`);
  }

  /* ---------- Chicago 17 (bibliography) ---------- */
  function chicagoAuthors(list) {
    if (!list.length) return '';
    const n = list.length > 10 ? list.slice(0, 7) : list;
    const names = n.map((p, k) => (k === 0 ? nm.familyGiven(p) : nm.givenFamily(p)));
    let s = n.length === 2 ? `${names[0]}, and ${names[1]}` : joinNames(names, ', ', ', and ');
    if (list.length > 10) s += ', et al';
    return s;
  }
  function chicago(c) {
    const x = ctx(c);
    let author = chicagoAuthors(x.authors);
    if (!author && x.editors.length && !x.t.part) author = chicagoAuthors(x.editors) + (x.editors.length > 1 ? ', eds' : ', ed');
    const title = x.t.part || x.type === 'website' || x.type === 'video' ? `“${end(x.title)}”` : end(i(x.title));
    const pubPlace = x.place && x.publisher ? `${x.place}: ${x.publisher}` : x.publisher || x.place;
    const yr = year(x.issued) || 'n.d.';
    const parts = [];
    const edBy = x.editors.length && (x.authors.length || x.t.part) ? 'edited by ' + joinNames(x.editors.map(nm.givenFamily), ', ', ', and ', ' and ') : '';
    switch (x.type) {
      case 'journal': {
        let s = i(x.container);
        if (x.volume) s += ' ' + x.volume;
        if (x.issue) s += ', no. ' + x.issue;
        s += ` (${date.us(x.issued).replace(/^\w+ \d+, /, '') || yr})`;
        if (x.pages) s += ': ' + x.pages;
        parts.push(end(s));
        break;
      }
      case 'newspaper':
      case 'magazine':
        parts.push(end(i(x.container) + (date.us(x.issued) ? ', ' + date.us(x.issued) : '')));
        break;
      case 'chapter':
      case 'conference':
      case 'encyclopedia':
        parts.push(end(['In ' + i(x.container), edBy, x.pages].filter(Boolean).join(', ')));
        if (pubPlace || yr) parts.push(end([pubPlace, yr].filter(Boolean).join(', ')));
        break;
      case 'website':
      case 'blog':
      case 'video':
      case 'podcast':
      case 'image':
        if (x.container) parts.push(end(x.type === 'blog' ? i(x.container) : x.container));
        if (date.us(x.issued)) parts.push(end(date.us(x.issued)));
        else if (hasDate(x.accessed)) parts.push(end('Accessed ' + date.us(x.accessed)));
        break;
      default:
        if (edBy) parts.push(end(edBy[0].toUpperCase() + edBy.slice(1)));
        if (x.translators.length) parts.push(end('Translated by ' + joinNames(x.translators.map(nm.givenFamily), ', ', ', and ', ' and ')));
        if (x.edition) parts.push(end(editionText(x.edition)));
        if (x.type === 'thesis') parts.push(end([x.medium || 'PhD diss.', x.publisher, yr].filter(Boolean).join(', ')));
        else parts.push(end([pubPlace, yr].filter(Boolean).join(', ')));
    }
    const l = link(x);
    if (l) parts.push(end(l));
    return clean(`${author ? end(author) + ' ' : ''}${title} ${parts.join(' ')}`);
  }

  /* ---------- IEEE ---------- */
  function ieeeAuthors(list) {
    const n = list.map(nm.initFamily);
    if (n.length > 6) return n[0] + ' <i>et al.</i>';
    return joinNames(n, ', ', ', and ', ' and ');
  }
  function ieee(c) {
    const x = ctx(c);
    let author = ieeeAuthors(x.authors);
    if (!author && x.editors.length) author = ieeeAuthors(x.editors) + (x.editors.length > 1 ? ', Eds.' : ', Ed.');
    const pubPlace = x.place && x.publisher ? `${x.place}: ${x.publisher}` : x.publisher || x.place;
    const els = [];
    let out = author ? author + ', ' : '';
    if (x.t.part || x.t.web) {
      out += `“${x.title},” `;
      if (x.type === 'chapter' || x.type === 'conference' || x.type === 'encyclopedia') {
        const ed = x.editors.length && x.authors.length ? `, ${ieeeAuthors(x.editors)}, ${x.editors.length > 1 ? 'Eds' : 'Ed'}.` : '';
        out += `in ${i(x.container)}${ed}`;
        if (x.edition) out += `, ${editionText(x.edition)}`;
        out += pubPlace ? ` ${pubPlace}, ${year(x.issued) || 'n.d.'}` : `, ${year(x.issued) || 'n.d.'}`;
        if (x.pages) out += `, ${multiPage(x.f.pages) ? 'pp.' : 'p.'} ${x.pages}`;
        if (x.doi) out += `, doi: ${x.doi}`;
        return clean(end(out));
      }
      if (x.t.web && !['newspaper', 'magazine'].includes(x.type)) {
        out += x.container ? `${x.container}. ` : '';
        if (hasDate(x.accessed)) out += `Accessed: ${date.ieee(x.accessed)}. `;
        if (x.url) out += `[Online]. Available: ${x.url}`;
        return clean(out);
      }
      els.push(i(x.container));
      if (x.volume) els.push('vol. ' + x.volume);
      if (x.issue) els.push('no. ' + x.issue);
      if (x.pages) els.push((multiPage(x.f.pages) ? 'pp. ' : 'p. ') + x.pages);
      if (hasDate(x.issued)) els.push(date.ieee(x.issued));
      if (x.doi) els.push('doi: ' + x.doi);
      out += end(els.filter(Boolean).join(', '));
      if (!x.doi && x.url) out += ` [Online]. Available: ${x.url}`;
      return clean(out);
    }
    out += i(x.title);
    if (x.type === 'thesis') {
      out += `, ${x.medium || 'Ph.D. dissertation'}, ${[x.publisher, x.place].filter(Boolean).join(', ')}, ${year(x.issued) || 'n.d.'}.`;
    } else {
      if (x.edition) out += `, ${editionText(x.edition)}`;
      if (x.type === 'report' && x.number) out += `, Rep. ${x.number}`;
      out += '. ';
      out += pubPlace ? `${pubPlace}, ${year(x.issued) || 'n.d.'}.` : `${year(x.issued) || 'n.d.'}.`;
    }
    if (x.doi) out += ` doi: ${x.doi}.`;
    else if (x.url) out += ` [Online]. Available: ${x.url}`;
    return clean(out);
  }

  /* ---------- AMA 11 ---------- */
  function amaAuthors(list) {
    const n = list.map(nm.compact);
    if (n.length > 6) return n.slice(0, 3).join(', ') + ', et al';
    return n.join(', ');
  }
  function ama(c) {
    const x = ctx(c);
    let author = amaAuthors(x.authors);
    if (!author && x.editors.length) author = amaAuthors(x.editors) + (x.editors.length > 1 ? ', eds' : ', ed');
    let out = author ? end(author) + ' ' : '';
    const yr = year(x.issued);
    if (x.type === 'journal' || x.type === 'magazine' || x.type === 'newspaper') {
      out += end(x.title) + ' ' + end(i(x.container)) + ' ';
      let s = yr;
      if (x.volume) s += ';' + x.volume;
      if (x.issue) s += `(${x.issue})`;
      if (x.pages) s += ':' + x.pages.replace(/–/g, '-');
      out += end(s);
    } else if (x.type === 'chapter' || x.type === 'conference' || x.type === 'encyclopedia') {
      out += end(x.title) + ' In: ';
      if (x.editors.length) out += amaAuthors(x.editors) + (x.editors.length > 1 ? ', eds. ' : ', ed. ');
      out += end(i(x.container)) + ' ';
      if (x.edition) out += end(editionText(x.edition)) + ' ';
      out += x.pages ? `${[x.publisher, yr].filter(Boolean).join('; ')}:${x.pages.replace(/–/g, '-')}.` : end([x.publisher, yr].filter(Boolean).join('; '));
    } else if (x.t.web) {
      out += end(x.title) + ' ';
      if (x.container) out += end(x.container) + ' ';
      if (hasDate(x.issued)) out += `Published ${end(date.us(x.issued))} `;
      if (hasDate(x.accessed)) out += `Accessed ${end(date.us(x.accessed))} `;
    } else {
      out += end(i(x.title)) + ' ';
      if (x.edition) out += end(editionText(x.edition)) + ' ';
      out += end([x.publisher, yr].filter(Boolean).join('; '));
    }
    if (x.doi) out += ` doi:${x.doi}`;
    else if (x.url) out += ` ${x.url}`;
    return clean(out);
  }

  /* ---------- Vancouver ---------- */
  function vancouver(c) {
    const x = ctx(c);
    const n = x.authors.map(nm.compact);
    let author = n.length > 6 ? n.slice(0, 6).join(', ') + ', et al' : n.join(', ');
    if (!author && x.editors.length) author = x.editors.map(nm.compact).join(', ') + (x.editors.length > 1 ? ', editors' : ', editor');
    let out = author ? end(author) + ' ' : '';
    const online = x.t.web || (!!x.url && !x.doi);
    const pubPlace = x.place && x.publisher ? `${x.place}: ${x.publisher}` : x.publisher || x.place;
    const cited = hasDate(x.accessed) && online ? ` [cited ${date.vanc(x.accessed)}]` : '';
    if (x.type === 'journal' || x.type === 'magazine' || x.type === 'newspaper') {
      out += end(x.title) + ' ' + x.container + (online ? ' [Internet]' : '') + '. ';
      let s = date.vanc(x.issued) + cited;
      if (x.volume) s += ';' + x.volume;
      if (x.issue) s += `(${x.issue})`;
      if (x.pages) s += ':' + x.pages.replace(/–/g, '-');
      out += end(s);
    } else if (x.type === 'chapter' || x.type === 'conference' || x.type === 'encyclopedia') {
      out += end(x.title) + ' In: ';
      if (x.editors.length) out += x.editors.map(nm.compact).join(', ') + (x.editors.length > 1 ? ', editors. ' : ', editor. ');
      out += end(x.container) + ' ';
      if (x.edition) out += end(editionText(x.edition)) + ' ';
      out += end(`${pubPlace}${pubPlace ? '; ' : ''}${year(x.issued)}`);
      if (x.pages) out += ` p. ${x.pages.replace(/–/g, '-')}.`;
    } else {
      out += end(x.title + (online ? ' [Internet]' : '')) + ' ';
      if (x.edition) out += end(editionText(x.edition)) + ' ';
      const pub = pubPlace || x.container;
      out += end(`${pub}${pub ? '; ' : ''}${year(x.issued)}${cited}`);
    }
    if (x.url && online) out += ` Available from: ${x.url}`;
    if (x.doi) out += ` doi:${x.doi}`;
    return clean(out);
  }

  const FORMATTERS = { apa7: apa, mla9: mla, harvard, chicago, ieee, ama, vancouver };

  function sanitizeRich(html) {
    // allow only i/em/b/strong/u/sup/sub from pre-formatted entries
    const div = document.createElement('div');
    div.innerHTML = html || '';
    const walk = (node) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 1) {
          const tag = ch.tagName.toLowerCase();
          walk(ch);
          if (['i', 'em', 'b', 'strong', 'u', 'sup', 'sub'].includes(tag)) {
            [...ch.attributes].forEach((a) => ch.removeAttribute(a.name));
          } else if (tag === 'br' || tag === 'div' || tag === 'p') {
            ch.replaceWith(document.createTextNode(' '), ...ch.childNodes);
          } else {
            ch.replaceWith(...ch.childNodes);
          }
        } else if (ch.nodeType !== 3) ch.remove();
      });
    };
    walk(div);
    return div.innerHTML.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function format(c, style) {
    if (c.type === 'preformatted') return sanitizeRich(c.fields && c.fields.html);
    const fn = FORMATTERS[style] || apa;
    try { return fn(c); } catch (err) { console.error(err); return esc((c.fields && c.fields.title) || 'Untitled'); }
  }

  /* ---------- in-text citations ---------- */
  function inText(c, style, opts = {}) {
    const n = opts.number;
    if (STYLES[style] && STYLES[style].numbered) {
      if (style === 'ama') return { parenthetical: `<sup>${n}</sup>`, narrative: `<sup>${n}</sup>` };
      return { parenthetical: `[${n}]`, narrative: `[${n}]` };
    }
    if (c.type === 'preformatted') {
      const t = strip(c.fields.html || '').split(/[.,(]/)[0].trim();
      return { parenthetical: `(${esc(t)})`, narrative: esc(t) };
    }
    const x = ctx(c);
    let list = x.authors.length ? x.authors : x.editors;
    const y = year(x.issued) || 'n.d.';
    const shortTitle = x.title.split(/[:.?]/)[0];
    const titleRef = x.t.part ? `“${shortTitle}”` : i(shortTitle);
    let name;
    const amp = style === 'apa7' ? ' &amp; ' : ' and ';
    if (!list.length) name = titleRef;
    else if (list.length === 1) name = esc(familyOf(list[0]));
    else if (list.length === 2) name = esc(familyOf(list[0])) + '{AND}' + esc(familyOf(list[1]));
    else if (style === 'chicago' && list.length === 3) name = esc(familyOf(list[0])) + ', ' + esc(familyOf(list[1])) + ', and ' + esc(familyOf(list[2]));
    else name = esc(familyOf(list[0])) + ' et al.';
    const page = opts.page ? esc(opts.page) : '';
    const pn = (pre) => (page ? pre + page : '');
    const paren = name.replace('{AND}', amp);
    const narr = name.replace('{AND}', ' and ');
    if (style === 'mla9') return { parenthetical: `(${paren}${pn(' ')})`, narrative: `${narr}${page ? ` (${page})` : ''}` };
    if (style === 'chicago') return { parenthetical: `(${paren} ${y}${pn(', ')})`, narrative: `${narr} (${y}${pn(', ')})`, note: `${narr}, ${titleRef}${pn(', ')}.` };
    if (style === 'harvard') return { parenthetical: `(${paren}, ${y}${pn(', p. ')})`, narrative: `${narr} (${y}${pn(', p. ')})` };
    return { parenthetical: `(${paren}, ${y}${pn(', p. ')})`, narrative: `${narr} (${y}${pn(', p. ')})` };
  }

  /* ---------- sorting ---------- */
  function sortKey(c, style) { return strip(format(c, style)).replace(/^[“"'‘\[\(]+/, '').toLowerCase(); }

  window.Cite = { STYLES, TYPES, FIELDS, DATE_FIELDS, ROLE_LABELS, MONTHS, format, inText, sortKey, strip, esc, sanitizeRich, doiUrl, bareDoi, year };
})();
