// 左栏对话：用户消息、解读卡、示例按钮、下划线输入框、发送。
// 写状态只经 ctx.commands；示例句来自 data/demo.json，不写进组件。
import { h, svg } from '../../ui/index.js';

const MAX_LEN = 200;

function sendIcon() {
  return svg('svg', { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true', focusable: 'false' },
    svg('path', { d: 'M3 11.5 21 3l-6.5 18-3.2-7.3L3 11.5Zm8.3 2.2L21 3', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
}

export default {
  id: 'chat',
  mount(el, ctx) {
    const { store, commands, ladder, data } = ctx;
    const samples = data.demo.samples ?? [];

    const messages = h('div', { class: 'chat__messages', role: 'log', 'aria-live': 'off' });
    const modes = h('div', { class: 'chat__modes', role: 'group', 'aria-label': '模式 · Mode' });
    const modeButtons = new Map();
    for (const [id, zh, en] of [['translate', '降维翻译', 'Simplify'], ['chat', '聊天', 'Chat']]) {
      const btn = h('button', {
        type: 'button', class: 'chat__mode', 'data-mode': id, 'aria-label': `${zh} · ${en}`,
        onclick: () => commands.setInputMode(id),
      }, zh);
      modeButtons.set(id, btn);
      modes.append(btn);
    }
    const hintZh = h('span', { class: 'bi__zh' }, '');
    const hintEn = h('span', { class: 'bi__en', lang: 'en' }, '');
    const status = h('p', { class: 'chat__status', role: 'status', 'aria-live': 'polite' });
    const examples = h('div', { class: 'chat__examples', role: 'group', 'aria-label': '示例 · Examples' });
    const input = h('input', {
      class: 'chat__input', type: 'text', maxlength: MAX_LEN, autocomplete: 'off', spellcheck: 'false',
      placeholder: '输入想简化的中文 · Type Chinese to simplify',
      'aria-label': '输入文字 · Input text',
    });
    const send = h('button', { class: 'chat__send', type: 'submit', 'aria-label': '发送 · Send' }, sendIcon());
    const form = h('form', { class: 'chat__form', autocomplete: 'off' }, input, send);

    // 示例自带语境，点击即提交。手动输入先不带语境，模型若从原文里摘出场景，响应回来后再显示。
    for (const s of samples) {
      examples.append(h('button', {
        type: 'button', class: 'chat__example', title: s.context || null,
        onclick: () => {
          if (store.get().status === 'running' || store.get().demo) return;
          commands.submit(s.text, s.context ?? '');
          input.value = '';
          syncControls();
        },
      }, s.text));
    }

    function submit() {
      const text = input.value.trim();
      if (!text || store.get().status === 'running' || store.get().demo) return;
      commands.submit(text, '');
      input.value = '';
      syncControls();
    }

    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    input.addEventListener('input', syncControls);

    // 失败后把刚才提交的文字放回输入框（SCOPE：输入保留）；用户已经在输入新内容时不覆盖
    const offFail = store.subscribe((s) => s.status, (status) => {
      if (status !== 'error' || input.value.trim() !== '') return;
      const s = store.get();
      const failed = s.messages.find((m) => m.id === s.pendingId && !m.resp);
      if (failed) { input.value = failed.text; syncControls(); }
    });

    function syncControls() {
      const st = store.get();
      const running = st.status === 'running' || st.demo;   // 演示中与运行中一样禁用
      const empty = input.value.trim() === '';
      send.disabled = running || empty;
      input.readOnly = running;
      for (const b of examples.children) b.disabled = running;
    }

    // 解读卡：Level 显示输入难度；点击切换右侧内容
    function levelLabel(m) {
      if (!m.resp) return '—';
      const r = m.inputRung;
      if (r != null && ladder.isOriginal(r)) return '古典 · Classical';
      const hsk = ladder.rungToHsk(r);
      return hsk ? `HSK ${hsk}` : '—';
    }

    function render(s) {
      messages.replaceChildren();
      for (const m of s.messages) {
        const selected = m.id === s.activeId;
        const done = m.mode === 'explain' && !!m.resp;
        messages.append(h('article', { class: 'chat__msg', 'data-id': m.id },
          h('p', { class: 'label' }, 'USER · 用户'),
          h('p', { class: 'chat__text', lang: 'zh' }, m.text),
          m.context ? h('p', { class: 'chat__ctx' }, `语境 · ${m.context}`) : null,
          m.mode === 'chat' && m.reply ? h('p', { class: 'label' }, 'REPLY · 回复') : null,
          m.mode === 'chat' && m.reply ? h('p', { class: 'chat__reply' }, m.reply) : null,
          done ? h('hr', { class: 'rule chat__rule' }) : null,
          done ? h('button', {
            type: 'button', class: ['chat__card', selected && 'is-active'], 'aria-pressed': String(selected),
            disabled: s.status === 'running' || s.demo,
            onclick: () => commands.select(m.id),
          },
          h('span', { class: 'chat__card-meta' },
            h('span', null, `Level: ${levelLabel(m)}`),
            h('span', null, 'Analysis Done')),
          h('span', { class: 'chat__card-body' },
            `点击查看 ${ladder.get(m.rung)?.label.en ?? ''} 简化结果 · Click to view`)) : null));
      }
      const last = messages.lastElementChild;
      if (last?.scrollIntoView) last.scrollIntoView({ block: 'nearest' });

      status.textContent = s.status === 'running' ? '处理中… · Working…'
        : s.status === 'error' ? '出错了，输入已保留，可重新发送 · Something went wrong. Your input is kept.'
          : '';
      status.classList.toggle('is-error', s.status === 'error');
      const translating = s.inputMode !== 'chat';
      const locked = s.status === 'running' || s.demo;
      for (const [id, btn] of modeButtons) {
        const on = id === (translating ? 'translate' : 'chat');
        btn.setAttribute('aria-pressed', String(on));
        btn.classList.toggle('is-on', on);
        btn.disabled = locked;
      }
      examples.hidden = !translating;
      input.placeholder = translating
        ? '输入想简化的中文 · Type Chinese to simplify'
        : '说一句话 · Say something';
      const live = ctx.ports.chat?.kind === 'live';
      hintZh.textContent = translating
        ? (live ? '这句话会按你的等级简化，出现在右边' : '示例句会按等级简化。其他句子保持原文')
        : (live ? '只在左边聊天，不会改右边' : '接上模型后才能聊天');
      hintEn.textContent = translating
        ? (live ? 'This line is simplified to your level on the right' : 'Sample lines are simplified by level. Anything else stays as written')
        : (live ? 'Chat stays on the left and does not change the right side' : 'Chat needs a connected model');
      syncControls();
    }

    el.append(h('section', { class: 'chat', 'aria-label': '对话 · Chat' },
      modes,
      messages,
      h('div', { class: 'chat__bottom' }, status, examples, form,
        h('p', { class: 'chat__hint label' }, h('span', { class: 'bi bi--inline' },
          hintZh, h('span', { class: 'bi__sep', 'aria-hidden': 'true' }, ' · '), hintEn)))));

    render(store.get());
    const off = store.subscribe((s) => ({ m: s.messages, a: s.activeId, st: s.status, r: s.rung, d: s.demo, mode: s.inputMode }), () => render(store.get()));
    return () => { off(); offFail(); el.replaceChildren(); };
  },
};
