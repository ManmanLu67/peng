// 对比区：原文 | 当前档位的改写，难词标注 + 注释卡 + 释义行 + 英文折叠 + 文化语境条。
// 标注线型来自 data/annotation-types.json，不写进 CSS 文件。接口返回文本一律走 textContent。
// P1 预留：双栏文本连线（给 <mark> 加 data-pair 并同步高亮）在 renderSpans 里接入；
//         语法标注通过 annotate() 的 grammar 参数接入。
import { h, bilingual } from '../../ui/index.js';
import { annotate } from '../../core/annotate.js';
import { knowledgePoints, sentencePinyin } from '../../core/knowledge.js';

const SAFE = /^[\w-]+$/;

function typeStyles(types) {
  return types.map((t) => {
    if (!SAFE.test(t.id) || !SAFE.test(t.line) || !/^--[\w-]+$/.test(t.color)) throw new Error(`annotation-types：非法配置 ${t.id}`);
    return `.cmp mark[data-t="${t.id}"]{text-decoration-line:underline;text-decoration-style:${t.line};text-decoration-color:var(${t.color});}`;
  }).join('\n');
}

export default {
  id: 'compare',
  needs: ['segmenter'],
  mount(el, ctx) {
    const { store, ladder, data, ports } = ctx;
    const hsk = data.hsk.entries;
    const glosses = data.glosses.entries;
    const grammar = data.grammar?.entries ?? [];
    const kindLabel = {
      allusion: ['典故', 'Allusion'],
      classical: ['文言', 'Classical'],
      word: ['难词', 'Word'],
      grammar: ['语法', 'Grammar'],
    };
    const types = data['annotation-types'];
    const typeLabel = Object.fromEntries(types.map((t) => [t.id, t.label]));

    const style = h('style', null, typeStyles(types));
    const body = h('div', { class: 'cmp__body' });
    const note = h('div', { class: 'cmp__note', role: 'dialog', 'aria-label': '词语注释 · Word note', hidden: true });
    const root = h('section', { class: 'cmp', 'aria-label': '原文与改写对比 · Original and rewrite' }, style, body, note);
    el.append(root);

    let showEnglish = false;     // “View in English” 展开状态；换消息或换档时复位
    let lastKey = '';
    let noteFor = null;

    // ---------- 注释卡 ----------
    function closeNote() {
      note.hidden = true;
      noteFor?.setAttribute('aria-expanded', 'false');
      noteFor = null;
    }
    function openNote(mark, hit) {
      if (noteFor === mark) { closeNote(); return; }
      closeNote();
      noteFor = mark;
      mark.setAttribute('aria-expanded', 'true');
      const t = typeLabel[hit.type];
      // 注意：replaceChildren 会把 null 当成文字 "null" 插入，所以先过滤再传
      note.replaceChildren(...[
        h('p', { class: 'cmp__note-word' }, hit.word, hit.py ? h('span', { class: 'cmp__note-py' }, ` ${hit.py}`) : null),
        t ? h('p', { class: 'label' }, bilingual(t.zh, t.en, { inline: true })) : null,
        hit.zh ? h('p', { class: 'cmp__note-zh' }, hit.zh) : null,
        hit.en ? h('p', { class: 'cmp__note-en', lang: 'en' }, hit.en) : null,
      ].filter(Boolean));
      note.hidden = false;
      const r = mark.getBoundingClientRect();
      const host = root.getBoundingClientRect();
      const width = Math.min(320, host.width - 16);
      note.style.width = `${width}px`;
      note.style.left = `${Math.max(8, Math.min(r.left - host.left, host.width - width - 8))}px`;
      note.style.top = `${r.bottom - host.top + 8}px`;
    }
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !note.hidden) { const m = noteFor; closeNote(); m?.focus(); } });
    document.addEventListener('click', onDocClick);
    function onDocClick(e) { if (!note.hidden && !note.contains(e.target) && e.target !== noteFor) closeNote(); }

    // ---------- 渲染 ----------
    // 难词 = 高于“当前档”的词。当前档没有 HSK 等级（英文 / 原文）时，退回到用户选的起点档。
    function levelFor(s) {
      return ladder.rungToHsk(s.rung) ?? ladder.rungToHsk(s.hskStart) ?? 0;
    }

    function renderSpans(text, minLevel) {
      const { spans, words } = annotate(text, { segmenter: ports.segmenter, hsk, glosses, minLevel });
      const noted = words.filter((w) => !w.oov);
      const p = h('p', { class: 'cmp__text', lang: 'zh' });
      for (const s of spans) {
        if (!s.hit || s.hit.oov) { p.append(s.text); continue; }
        const mark = h('mark', {
          'data-t': s.hit.type, class: s.hit.oov ? 'is-oov' : null,
          tabindex: 0, role: 'button', 'aria-expanded': 'false',
          'aria-label': `${s.text}，查看注释 · View note`,
        }, s.text);
        mark.addEventListener('click', () => openNote(mark, s.hit));
        mark.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNote(mark, s.hit); } });
        p.append(mark);
      }
      return { p, words: noted };
    }

    function pointList(text, minLevel, extraGrammar = []) {
      const items = knowledgePoints(text, { segmenter: ports.segmenter, hsk, glosses, grammar, extraGrammar, minLevel });
      if (!items.length) return null;
      return h('div', { class: 'cmp__points' }, ...items.map((item) => {
        const [zh, en] = kindLabel[item.kind] ?? kindLabel.word;
        return h('article', { class: 'cmp__point' },
          h('p', { class: 'cmp__point-kicker' }, `${zh} · ${en}`),
          h('p', { class: 'cmp__point-title' }, item.title, item.py ? h('span', { class: 'cmp__point-py' }, ` ${item.py}`) : null),
          h('p', { class: 'cmp__point-zh' }, item.zh),
          item.en ? h('p', { class: 'cmp__point-en', lang: 'en' }, item.en) : null);
      }));
    }

    function heading(zh, en) {
      return h('div', { class: 'cmp__head' }, h('h2', { class: 'cmp__h' }, `${en} · `, h('span', { lang: 'zh' }, zh)), h('span', { class: 'cmp__rule', 'aria-hidden': 'true' }));
    }

    function renderEmpty(textZh, textEn) {
      return h('p', { class: 'cmp__empty' }, bilingual(textZh, textEn));
    }

    function render() {
      const s = store.get();
      const msg = s.messages.find((m) => m.id === s.activeId);
      const key = `${s.activeId}:${s.rung}`;
      if (key !== lastKey) { showEnglish = false; lastKey = key; }
      closeNote();
      body.replaceChildren();

      if (!msg) { body.append(renderEmpty('在左侧输入一句话，或点一个示例', 'Type a sentence on the left, or pick an example')); return; }
      if (!msg.resp) {
        if (s.status === 'running') {
          body.append(h('div', { class: 'cmp__skeleton', role: 'status', 'aria-label': '处理中 · Working' },
            h('span'), h('span'), h('span')));
        } else {
          body.append(renderEmpty('这次没有拿到结果，输入已保留', 'No result this time. Your input is kept.'));
        }
        return;
      }

      const resp = msg.resp;
      const rung = s.rung;
      const label = ladder.get(rung)?.label;

      // 左：原文
      const minLevel = levelFor(s);
      const original = msg.subject || msg.text;
      const left = renderSpans(original, minLevel);
      const py = sentencePinyin(original, { glosses, hsk, modelPinyin: msg.pinyin });
      const colL = h('div', { class: 'cmp__col' },
        heading('原文', 'Original Text'),
        left.p,
        py ? h('p', { class: 'cmp__py' }, py) : null,
        pointList(original, minLevel, msg.grammar));

      // 右：当前档
      const colR = h('div', { class: 'cmp__col' });
      if (ladder.isOriginal(rung)) {
        colR.append(heading('原文（未改写）', 'Original · unchanged'),
          h('p', { class: 'cmp__empty' }, bilingual('当前档位就是原文，没有改写', 'This level is the original text; nothing was rewritten')));
      } else if (ladder.isEnglish(rung)) {
        colR.append(heading('英文', 'English'), h('p', { class: 'cmp__text cmp__text--en', lang: 'en' }, resp.output.text));
      } else {
        const right = renderSpans(resp.output.text, minLevel);
        colR.append(heading('简化', `${label.en} Rewrite`), right.p);
        if (resp.english) {
          const btn = h('button', { type: 'button', class: 'cmp__more', 'aria-expanded': String(showEnglish), onclick: () => { showEnglish = !showEnglish; render(); } },
            showEnglish ? 'Hide English ↑' : 'View in English →');
          colR.append(h('div', { class: 'cmp__en' },
            h('p', { class: 'label' }, 'English interpretation'),
            showEnglish ? h('p', { class: 'cmp__text cmp__text--en', lang: 'en' }, resp.english) : null,
            btn));
        }
      }
      body.append(h('div', { class: 'cmp__cols' }, colL, colR));
      if (resp.culture_note?.zh || resp.culture_note?.en) {
        body.append(h('p', { class: 'cmp__culture' }, resp.culture_note.zh ?? '', resp.culture_note.zh && resp.culture_note.en ? h('br') : null, resp.culture_note.en ? h('span', { lang: 'en' }, resp.culture_note.en) : null));
      }
    }

    render();
    const off = store.subscribe((s) => ({ m: s.messages, a: s.activeId, st: s.status, r: s.rung }), render);
    return () => { off(); document.removeEventListener('click', onDocClick); el.replaceChildren(); };
  },
};
