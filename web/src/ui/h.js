// 建节点的小工具。文本一律走 text node，不提供 innerHTML 入口（接口返回文本不得拼 HTML）。

const SVG_NS = 'http://www.w3.org/2000/svg';
const URL_ATTRS = new Set(['href', 'src', 'xlink:href']);

function apply(el, props) {
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'innerHTML' || key === 'outerHTML') {
      throw new Error('h(): 不允许 innerHTML / outerHTML，请用子节点或 textContent');
    }
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.setAttribute('class', Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value));
    } else {
      const text = value === true ? '' : String(value);
      if (URL_ATTRS.has(key) && /^\s*javascript:/i.test(text)) throw new Error('h(): 不允许 javascript: 链接');
      el.setAttribute(key, text);
    }
  }
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** h('button', { class: 'btn', onclick }, '文字', 子节点…) */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  apply(el, props);
  append(el, children);
  return el;
}

/** 同 h，但创建 SVG 命名空间下的元素 */
export function svg(tag, props, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  apply(el, props);
  append(el, children);
  return el;
}
