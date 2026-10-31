// 团队页的纯逻辑：成员 → 要渲染什么。字段缺失返回 null，渲染层据此不输出节点。

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** 头像位印章里放姓名首字（按码点取，不拆代理对）；没有姓名时放“朋” */
export function stampChar(name) {
  const n = text(name);
  return n ? [...n][0] : '朋';
}

/** 只允许 https:// 链接；其余（http、javascript:、相对路径、空）一律视为没有链接。P1 外链接入时用。 */
export function safeHttps(link) {
  const s = text(link);
  if (!/^https:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/** team.json 的一项 → 渲染描述 */
export function describeMember(m, index) {
  const name = text(m?.name);
  return {
    no: String(index + 1).padStart(2, '0'),
    stamp: stampChar(name),
    name: name || null,                       // null → 显示“姓名待填 · Name TBD”
    roleZh: text(m?.role_zh) || null,
    roleEn: text(m?.role_en) || null,
    bio: text(m?.bio) || null,
    link: safeHttps(m?.link),
  };
}
