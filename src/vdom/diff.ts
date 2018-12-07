const diff: preact.diff = (
  dom,
  vnode,
  context,
  mountAll,
  parent,
  componentRoot
) => {
  let ret = handleVnode(dom, vnode, context, mountAll, componentRoot);

  if (parent && ret.parentNode !== parent) {
    parent.appendChild(ret);
  }

  return ret;
};

const handelTextVnode = (dom, vnode) => {
  const isTextNode = dom && dom.splitText !== undefined && dom.parentNode;
  let out = dom;

  if (isTextNode) {
    if (dom.nodeValue != vnode) {
      dom.nodeValue = vnode;
    }
    return dom;
  }

  if (dom.parentNode) {
    dom.parentNode.replaceChild(out, dom);
  }

  return document.createTextNode(String(vnode));
};

const handleVnode = (dom, vnode, context, mountAll, componentRoot) => {
  let out = dom;
  const isInvalidVnode = vnode === null || typeof vnode === 'boolean';
  const isTextVnode = typeof vnode === 'string' || typeof vnode === 'number';

  isInvalidVnode && (vnode = '');

  // 不是由 createElement 生成 vnode 的情况
  if (isTextVnode) {
    out = handelTextVnode(dom, vnode);
  }

  return out;
};

export default diff;
