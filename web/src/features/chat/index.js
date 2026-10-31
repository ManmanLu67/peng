// 左栏对话：用户消息、解读卡、示例按钮、下划线输入框、发送。
// 写状态只经 ctx.commands；示例与占位文案来自 data/demo.json，不写进组件。
import { h, svg, bilingual } from '../../ui/index.js';

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
    const status = h('p', { class: 'chat__status', role: 'status', 'aria-live': 'polite' });
    const examples = h('div', { class: 'chat__examples', role: 'group', 'aria-label': '示例 · Examples' });
    const input = h('input', {
      class: 'chat__input', type: 'text', maxlength: MAX_LEN, autocomplete: 'off', spellcheck: 'false',
      placeholder: '输入想简化的中文 · Type Chinese',
      'aria-label': '输入文字 · Input text',
    });
    const send = h('button', { class: 'chat__send', type: 'submit', 'aria-label': '发送 · Send' }, sendIcon());
    const form = h('form', { class: 'chat__form', autocomplete: 'off' }, input, send);

    // 示例自带语境，点击即提交；手动输入没有语境（语境输入框是 P1，不显示）
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
      const failed = s.messages.find((m) => m.id === s.activeId && !m.resp);
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
        const done = !!m.resp;
        messages.append(h('article', { class: 'chat__msg', 'data-id': m.id },
          h('p', { class: 'label' }, 'USER · 用户'),
          h('p', { class: 'chat__text', lang: 'zh' }, m.text),
          m.context ? h('p', { class: 'chat__ctx' }, `语境 · ${m.context}`) : null,
          h('hr', { class: 'rule chat__rule' }),
          h('button', {
            type: 'button', class: ['chat__card', selected && 'is-active'], 'aria-pressed': String(selected),
            disabled: !done || s.status === 'running' || s.demo,
            onclick: () => commands.select(m.id),
          },
          h('span', { class: 'chat__card-meta' },
            h('span', null, `Level: ${levelLabel(m)}`),
            h('span', null, done ? 'Analysis Done' : (s.status === 'running' && selected ? 'Analyzing…' : 'No result'))),
          h('span', { class: 'chat__card-body' },
            done ? `点击查看 ${ladder.get(m.rung)?.label.en ?? ''} 简化结果 · Click to view` : '等待结果 · Waiting'))));
      }
      const last = messages.lastElementChild;
      if (last?.scrollIntoView) last.scrollIntoView({ block: 'nearest' });

      status.textContent = s.status === 'running' ? '处理中… · Working…'
        : s.status === 'error' ? '出错了，输入已保留，可重新发送 · Something went wrong. Your input is kept.'
          : '';
      status.classList.toggle('is-error', s.status === 'error');
      syncControls();
    }

    el.append(h('section', { class: 'chat', 'aria-label': '对话 · Chat' },
      messages,
      h('div', { class: 'chat__bottom' }, status, examples, form,
        h('p', { class: 'chat__hint label' }, bilingual('文字将发送给模拟接口，不会离开本机', 'Text goes to the mock API and stays on this device', { inline: true })))));

    render(store.get());
    const off = store.subscribe((s) => ({ m: s.messages, a: s.activeId, st: s.status, r: s.rung, d: s.demo }), () => render(store.get()));
    return () => { off(); offFail(); el.replaceChildren(); };
  },
};
