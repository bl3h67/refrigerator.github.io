/* Citebox – import / export: BibTeX, RIS, Word, text, HTML, share links and device files. */
(function () {
  'use strict';
  const { format, strip, STYLES, esc } = window.Cite;

  /* ---------- downloads ---------- */
  function download(name, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const safeName = (s) => (s || 'references').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || 'references';

  function listHtml(project, cites) {
    const st = STYLES[project.style];
    const items = cites.map((c, k) => {
      const t = format(c, project.style);
      return st.numbered
        ? `<p style="margin:0 0 12pt 0;padding-left:0.5in;text-indent:-0.5in;">${project.style === 'ieee' ? `[${k + 1}]` : `${k + 1}.`}&#9;${t}</p>`
        : `<p style="margin:0 0 12pt 0;padding-left:0.5in;text-indent:-0.5in;">${t}</p>`;
    }).join('\n');
    return `<p style="text-align:center;font-weight:bold;margin:0 0 12pt 0;">${esc(st.heading)}</p>\n${items}`;
  }

  function toWord(project, cites) {
    const body = listHtml(project, cites);
    const font = project.font || 'Times New Roman';
    const size = project.fontSize || 12;
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(project.name)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>body{font-family:'${font}',serif;font-size:${size}pt;line-height:2;} p{font-family:'${font}',serif;font-size:${size}pt;line-height:200%;}</style>
</head><body>${body}</body></html>`;
  }
  function toHtml(project, cites) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(project.name)}</title>
<style>body{font-family:'${project.font}',serif;font-size:${project.fontSize}pt;line-height:2;max-width:7in;margin:1in auto;}</style></head>
<body>${listHtml(project, cites)}</body></html>`;
  }
  function toText(project, cites) {
    const st = STYLES[project.style];
    return st.heading + '\n\n' + cites.map((c, k) => (st.numbered ? (project.style === 'ieee' ? `[${k + 1}] ` : `${k + 1}. `) : '') + strip(format(c, project.style))).join('\n\n') + '\n';
  }

  /* ---------- BibTeX ---------- */
  const BIB_TYPES = { journal: 'article', book: 'book', chapter: 'incollection', conference: 'inproceedings', report: 'techreport', thesis: 'phdthesis', newspaper: 'article', magazine: 'article' };
  const bibEsc = (s) => String(s).replace(/([{}&%$#_])/g, '\\$1');
  const nameStr = (p) => (p.literal ? `{${p.literal}}` : [p.family, p.given].filter(Boolean).join(', '));
  function toBibtex(cites) {
    const used = {};
    return cites.filter((c) => c.type !== 'preformatted').map((c) => {
      const f = c.fields || {};
      const a = (c.contributors || []).filter((p) => p.role === 'author' || p.role === 'director' || p.role === 'host');
      const e = (c.contributors || []).filter((p) => p.role === 'editor');
      let key = ((a[0] && (a[0].family || a[0].literal)) || 'anon').replace(/[^A-Za-z]/g, '').toLowerCase() + ((f.issued && f.issued.y) || '');
      used[key] = (used[key] || 0) + 1;
      if (used[key] > 1) key += String.fromCharCode(96 + used[key]);
      const kv = [];
      const add = (k, v) => v && kv.push(`  ${k} = {${bibEsc(v)}}`);
      add('author', a.map(nameStr).join(' and '));
      add('editor', e.map(nameStr).join(' and '));
      add('title', f.title);
      if (c.type === 'journal' || c.type === 'newspaper' || c.type === 'magazine') add('journal', f.containerTitle);
      else if (['chapter', 'conference', 'encyclopedia'].includes(c.type)) add('booktitle', f.containerTitle);
      else if (f.containerTitle) add('howpublished', f.containerTitle);
      add('year', f.issued && f.issued.y);
      add('month', f.issued && f.issued.m);
      add('volume', f.volume);
      add('number', f.issue || f.number);
      add('pages', f.pages && f.pages.replace(/–/g, '--'));
      add(c.type === 'thesis' ? 'school' : 'publisher', f.publisher);
      add('address', f.place);
      add('edition', f.edition);
      add('doi', f.doi);
      add('isbn', f.isbn);
      add('url', f.url);
      if (f.accessed && f.accessed.y) add('urldate', [f.accessed.y, f.accessed.m, f.accessed.d].filter(Boolean).map((v) => String(v).padStart(2, '0')).join('-'));
      add('note', f.annotation);
      return `@${BIB_TYPES[c.type] || 'misc'}{${key},\n${kv.join(',\n')}\n}`;
    }).join('\n\n') + '\n';
  }

  function parseBibtex(text) {
    const out = [];
    const rev = { article: 'journal', book: 'book', incollection: 'chapter', inbook: 'chapter', inproceedings: 'conference', conference: 'conference', techreport: 'report', phdthesis: 'thesis', mastersthesis: 'thesis', online: 'website', misc: 'misc' };
    const re = /@(\w+)\s*\{\s*([^,]*),/g;
    let m;
    while ((m = re.exec(text))) {
      const kind = m[1].toLowerCase();
      if (kind === 'comment' || kind === 'string' || kind === 'preamble') continue;
      // read until the matching closing brace
      let depth = 1, k = re.lastIndex;
      for (; k < text.length && depth > 0; k++) {
        if (text[k] === '{') depth++;
        else if (text[k] === '}') depth--;
      }
      const body = text.slice(re.lastIndex, k - 1);
      re.lastIndex = k;
      const fields = {};
      const fre = /(\w+)\s*=\s*/g;
      let fm;
      while ((fm = fre.exec(body))) {
        let p = fre.lastIndex, val = '';
        if (body[p] === '{') {
          let d = 1; p++;
          const s = p;
          for (; p < body.length && d > 0; p++) { if (body[p] === '{') d++; else if (body[p] === '}') d--; }
          val = body.slice(s, p - 1);
        } else if (body[p] === '"') {
          const s = ++p;
          while (p < body.length && body[p] !== '"') p++;
          val = body.slice(s, p); p++;
        } else {
          const s = p;
          while (p < body.length && body[p] !== ',') p++;
          val = body.slice(s, p).trim();
        }
        fre.lastIndex = p;
        fields[fm[1].toLowerCase()] = val.replace(/[{}]/g, '').replace(/\\([&%$#_])/g, '$1').replace(/\s+/g, ' ').trim();
      }
      const ppl = (s, role) => (s ? s.split(/\s+and\s+/i).map((n) => ({ ...window.Lookup.parseName(n), role })) : []);
      const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
      const mo = fields.month ? String(months[fields.month.slice(0, 3).toLowerCase()] || parseInt(fields.month, 10) || '') : '';
      const urldate = window.Lookup.dateFromString(fields.urldate || fields.accessed || '');
      out.push({
        type: rev[kind] || 'misc',
        contributors: ppl(fields.author, 'author').concat(ppl(fields.editor, 'editor')),
        fields: {
          title: fields.title || '', containerTitle: fields.journal || fields.journaltitle || fields.booktitle || fields.howpublished || '',
          issued: fields.date ? window.Lookup.dateFromString(fields.date) : { y: fields.year || '', m: mo, d: '' },
          volume: fields.volume || '', issue: fields.number || fields.issue || '', pages: (fields.pages || '').replace(/-+/g, '–'),
          publisher: fields.publisher || fields.school || fields.institution || fields.organization || '', place: fields.address || fields.location || '',
          edition: fields.edition || '', doi: fields.doi || '', isbn: fields.isbn || '', url: fields.url || '', accessed: urldate, annotation: fields.note || fields.annote || '',
        },
      });
    }
    return out;
  }

  /* ---------- RIS ---------- */
  const RIS_TYPES = { journal: 'JOUR', book: 'BOOK', chapter: 'CHAP', conference: 'CPAPER', report: 'RPRT', thesis: 'THES', newspaper: 'NEWS', magazine: 'MGZN', website: 'ELEC', blog: 'BLOG', video: 'VIDEO', film: 'MPCT', dataset: 'DATA', software: 'COMP', image: 'ART', encyclopedia: 'ENCYC', podcast: 'SOUND' };
  function toRis(cites) {
    return cites.filter((c) => c.type !== 'preformatted').map((c) => {
      const f = c.fields || {};
      const L = [`TY  - ${RIS_TYPES[c.type] || 'GEN'}`];
      const add = (t, v) => v && L.push(`${t}  - ${v}`);
      (c.contributors || []).forEach((p) => add(p.role === 'editor' ? 'ED' : 'AU', p.literal || [p.family, p.given].filter(Boolean).join(', ')));
      add('TI', f.title);
      add(c.type === 'journal' ? 'JO' : 'T2', f.containerTitle);
      if (f.issued && f.issued.y) add('PY', f.issued.y);
      if (f.issued && f.issued.y) add('DA', [f.issued.y, f.issued.m, f.issued.d].map((v) => (v ? String(v).padStart(2, '0') : '')).join('/'));
      add('VL', f.volume); add('IS', f.issue);
      if (f.pages) { const [sp, ep] = f.pages.split(/[–-]/); add('SP', sp); add('EP', ep); }
      add('PB', f.publisher); add('CY', f.place); add('ET', f.edition);
      add('DO', f.doi); add('SN', f.isbn); add('UR', f.url); add('N1', f.annotation);
      if (f.accessed && f.accessed.y) add('Y2', [f.accessed.y, f.accessed.m, f.accessed.d].filter(Boolean).join('/'));
      L.push('ER  - ');
      return L.join('\r\n');
    }).join('\r\n\r\n') + '\r\n';
  }
  function parseRis(text) {
    const rev = {}; Object.keys(RIS_TYPES).forEach((k) => (rev[RIS_TYPES[k]] = k));
    Object.assign(rev, { JFULL: 'journal', EJOUR: 'journal', ABST: 'journal', EBOOK: 'book', EDBOOK: 'book', ECHAP: 'chapter', CONF: 'conference', WEB: 'website', ICOMM: 'website' });
    const out = [];
    let cur = null;
    text.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/);
      if (!m) return;
      const [, tag, val] = m;
      if (tag === 'TY') { cur = { type: rev[val.trim()] || 'misc', contributors: [], fields: { issued: { y: '', m: '', d: '' } } }; return; }
      if (!cur) return;
      const f = cur.fields;
      switch (tag) {
        case 'AU': case 'A1': case 'A2': if (tag !== 'A2') cur.contributors.push({ ...window.Lookup.parseName(val), role: 'author' }); else cur.contributors.push({ ...window.Lookup.parseName(val), role: 'editor' }); break;
        case 'ED': cur.contributors.push({ ...window.Lookup.parseName(val), role: 'editor' }); break;
        case 'TI': case 'T1': f.title = val; break;
        case 'JO': case 'JF': case 'T2': case 'BT': f.containerTitle = f.containerTitle || val; break;
        case 'PY': case 'Y1': f.issued.y = (val.match(/\d{4}/) || [''])[0]; break;
        case 'DA': { const d = val.split('/'); f.issued = { y: d[0] || f.issued.y, m: d[1] ? String(+d[1]) : '', d: d[2] ? String(+d[2]) : '' }; break; }
        case 'VL': f.volume = val; break;
        case 'IS': f.issue = val; break;
        case 'SP': f.pages = val; break;
        case 'EP': f.pages = (f.pages ? f.pages + '–' : '') + val; break;
        case 'PB': f.publisher = val; break;
        case 'CY': f.place = val; break;
        case 'ET': f.edition = val; break;
        case 'DO': f.doi = val; break;
        case 'SN': f.isbn = val; break;
        case 'UR': f.url = f.url || val; break;
        case 'N1': case 'AB': if (tag === 'N1') f.annotation = val; break;
        case 'Y2': f.accessed = window.Lookup.dateFromString(val.replace(/\//g, '-')); break;
        case 'ER': out.push(cur); cur = null; break;
        default:
      }
    });
    if (cur) out.push(cur);
    return out;
  }

  /* ---------- share links (project packed into the URL hash) ---------- */
  const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  async function pack(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) {
      const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const buf = new Uint8Array(await new Response(s).arrayBuffer());
      let bin = '';
      for (let k = 0; k < buf.length; k += 0x8000) bin += String.fromCharCode(...buf.subarray(k, k + 0x8000));
      return 'z' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return 'j' + b64url(bytes);
  }
  async function unpack(str) {
    const kind = str[0];
    const bytes = unb64url(str.slice(1));
    if (kind === 'z') {
      const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return JSON.parse(await new Response(s).text());
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  /* ---------- device files (File System Access API with download fallback) ---------- */
  const fsSupported = 'showSaveFilePicker' in window;
  async function saveWithPicker(suggested, text, handle) {
    let h = handle;
    if (!h) {
      h = await window.showSaveFilePicker({
        suggestedName: suggested,
        types: [{ description: 'Citebox library', accept: { 'application/json': ['.json'] } }],
      });
    }
    if (h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('Permission denied');
    }
    const w = await h.createWritable();
    await w.write(text);
    await w.close();
    return h;
  }
  async function openWithPicker() {
    const [h] = await window.showOpenFilePicker({
      types: [{ description: 'Citebox library or references', accept: { 'application/json': ['.json'], 'text/plain': ['.bib', '.ris', '.txt'] } }],
    });
    const file = await h.getFile();
    return { handle: h, name: file.name, text: await file.text() };
  }
  function pickFile(accept) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = accept || '.json,.bib,.ris,.txt';
      inp.onchange = async () => {
        const f = inp.files[0];
        resolve(f ? { name: f.name, text: await f.text() } : null);
      };
      inp.click();
    });
  }

  // tiny IndexedDB key/value store, used to remember the linked save file across visits
  function idb(mode, fn) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('citebox', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => {
        const tx = req.result.transaction('kv', mode);
        const r = fn(tx.objectStore('kv'));
        tx.oncomplete = () => resolve(r && r.result);
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }
  const kv = {
    get: (k) => idb('readonly', (s) => s.get(k)).catch(() => null),
    set: (k, v) => idb('readwrite', (s) => s.put(v, k)).catch(() => null),
    del: (k) => idb('readwrite', (s) => s.delete(k)).catch(() => null),
  };

  window.IO = { download, safeName, toWord, toHtml, toText, toBibtex, toRis, parseBibtex, parseRis, listHtml, pack, unpack, fsSupported, saveWithPicker, openWithPicker, pickFile, kv };
})();
