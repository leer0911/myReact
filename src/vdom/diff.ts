import options from '../config/options';
import { isSameNodeType, isNamedNode } from './index';
import { buildComponentFromVNode } from './component';
import { createNode, setAccessor } from '../dom/index';
import { unmountComponent } from './component';
import { removeNode } from '../dom/index';
import { applyRef } from '../utils';
import { ATTR_KEY } from '../core/constants';

export const mounts = [];
export let diffLevel = 0;
let isSvgMode = false;
let hydrating = false;

const flushMounts = () => {
  let c;
  while ((c = mounts.shift())) {
    if (options.afterMount) options.afterMount(c);
    if (c.componentDidMount) c.componentDidMount();
  }
};

// render(vnode, parent, merge) 中 diff(merge, vnode, {}, false, parent, false);
const diff: preact.diff = (
  dom,
  vnode,
  context,
  mountAll,
  parent: any,
  componentRoot
) => {
  if (!diffLevel++) {
    isSvgMode = parent != null && parent.ownerSVGElement !== undefined;
    hydrating = dom != null && !(ATTR_KEY in dom);
  }

  let ret = idiff(dom, vnode, context, mountAll, componentRoot);

  if (parent && ret.parentNode !== parent) {
    parent.appendChild(ret);
  }

  if (!--diffLevel) {
    hydrating = false;
    if (!componentRoot) flushMounts();
  }

  return ret;
};

const idiff = (dom, vnode, context, mountAll, componentRoot?) => {
  let out = dom;
  let prevSvgMode = isSvgMode;

  (vnode == null || typeof vnode === 'boolean') && (vnode = '');
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    const isTextNode =
      dom &&
      dom.splitText !== undefined &&
      dom.parentNode &&
      (!dom._component || componentRoot);

    if (isTextNode) {
      dom.nodeValue != vnode && (dom.nodeValue = vnode);
    } else {
      out = document.createTextNode(String(vnode));
      if (dom) {
        dom.parentNode && dom.parentNode.replaceChild(out, dom);
        recollectNodeTree(dom, true);
      }
    }

    out[ATTR_KEY] = true;

    return out;
  }

  let vnodeName = vnode.nodeName;
  if (typeof vnodeName === 'function') {
    return buildComponentFromVNode(dom, vnode, context, mountAll);
  }

  isSvgMode =
    vnodeName === 'svg'
      ? true
      : vnodeName === 'foreignObject'
      ? false
      : isSvgMode;

  vnodeName = String(vnodeName);
  if (!dom || !isNamedNode(dom, vnodeName)) {
    out = createNode(vnodeName, isSvgMode);
    if (dom) {
      while (dom.firstChild) {
        out.appendChild(dom.firstChild);
      }
      dom.parentNode && dom.parentNode.replaceChild(out, dom);
      recollectNodeTree(dom, true);
    }
  }

  let fc = out.firstChild;
  let props = out[ATTR_KEY];
  let vchildren = vnode.children;

  if (props == null) {
    props = out[ATTR_KEY] = {};
    for (let a = out.attributes, i = a.length; i--; )
      props[a[i].name] = a[i].value;
  }

  // Optimization: fast-path for elements containing a single TextNode:
  if (
    !hydrating &&
    vchildren &&
    vchildren.length === 1 &&
    typeof vchildren[0] === 'string' &&
    fc != null &&
    fc.splitText !== undefined &&
    fc.nextSibling == null
  ) {
    if (fc.nodeValue != vchildren[0]) {
      fc.nodeValue = vchildren[0];
    }
  }
  // otherwise, if there are existing or new children, diff them:
  else if ((vchildren && vchildren.length) || fc != null) {
    innerDiffNode(
      out,
      vchildren,
      context,
      mountAll,
      hydrating || props.dangerouslySetInnerHTML != null
    );
  }

  // Apply attributes/props from VNode to the DOM Element:
  diffAttributes(out, vnode.attributes, props);

  // restore previous SVG mode: (in case we're exiting an SVG namespace)
  isSvgMode = prevSvgMode;

  return out;
};

const innerDiffNode = (dom, vchildren, context, mountAll, isHydrating) => {
  let originalChildren = dom.childNodes,
    children = [],
    keyed = {},
    keyedLen = 0,
    min = 0,
    len = originalChildren.length,
    childrenLen = 0,
    vlen = vchildren ? vchildren.length : 0,
    j,
    c,
    f,
    vchild,
    child;

  if (len !== 0) {
    for (let i = 0; i < len; i++) {
      let child = originalChildren[i],
        props = child[ATTR_KEY],
        key =
          vlen && props
            ? child._component
              ? child._component.__key
              : props.key
            : null;
      if (key != null) {
        keyedLen++;
        keyed[key] = child;
      } else if (
        props ||
        (child.splitText !== undefined
          ? isHydrating
            ? child.nodeValue.trim()
            : true
          : isHydrating)
      ) {
        children[childrenLen++] = child;
      }
    }
  }

  if (vlen !== 0) {
    for (let i = 0; i < vlen; i++) {
      vchild = vchildren[i];
      child = null;

      // attempt to find a node based on key matching
      let key = vchild.key;
      if (key != null) {
        if (keyedLen && keyed[key] !== undefined) {
          child = keyed[key];
          keyed[key] = undefined;
          keyedLen--;
        }
      }
      // attempt to pluck a node of the same type from the existing children
      else if (min < childrenLen) {
        for (j = min; j < childrenLen; j++) {
          if (
            children[j] !== undefined &&
            isSameNodeType((c = children[j]), vchild, isHydrating)
          ) {
            child = c;
            children[j] = undefined;
            if (j === childrenLen - 1) childrenLen--;
            if (j === min) min++;
            break;
          }
        }
      }

      // morph the matched/found/created DOM child to match vchild (deep)
      child = idiff(child, vchild, context, mountAll);

      f = originalChildren[i];
      if (child && child !== dom && child !== f) {
        if (f == null) {
          dom.appendChild(child);
        } else if (child === f.nextSibling) {
          removeNode(f);
        } else {
          dom.insertBefore(child, f);
        }
      }
    }
  }

  // remove unused keyed children:
  if (keyedLen) {
    for (let i in keyed)
      if (keyed[i] !== undefined) recollectNodeTree(keyed[i], false);
  }

  // remove orphaned unkeyed children:
  while (min <= childrenLen) {
    if ((child = children[childrenLen--]) !== undefined)
      recollectNodeTree(child, false);
  }
};

const recollectNodeTree = (node, unmountOnly) => {
  let component = node._component;
  if (component) {
    unmountComponent(component);
  } else {
    if (node[ATTR_KEY] != null) {
      applyRef(node[ATTR_KEY].ref, null);
    }
    if (unmountOnly === false || node[ATTR_KEY] == null) {
      removeNode(node);
    }
    removeChildren(node);
  }
};

const removeChildren = node => {
  node = node.lastChild;
  while (node) {
    let next = node.previousSibling;
    recollectNodeTree(node, true);
    node = next;
  }
};

const diffAttributes = (dom, attrs, old) => {
  let name;

  // remove attributes no longer present on the vnode by setting them to undefined
  for (name in old) {
    if (!(attrs && attrs[name] != null) && old[name] != null) {
      setAccessor(dom, name, old[name], (old[name] = undefined), isSvgMode);
    }
  }

  // add new & update changed attributes
  for (name in attrs) {
    if (
      name !== 'children' &&
      name !== 'innerHTML' &&
      (!(name in old) ||
        attrs[name] !==
          (name === 'value' || name === 'checked' ? dom[name] : old[name]))
    ) {
      setAccessor(dom, name, old[name], (old[name] = attrs[name]), isSvgMode);
    }
  }
};

export { diff, flushMounts, recollectNodeTree, removeChildren };
