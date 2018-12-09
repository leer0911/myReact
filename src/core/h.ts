import options from '../config/options';
import { VNode } from '../config/vnode';
import { flatten } from '../utils';

const h: preact.createElement = (
  nodeName,
  attributes = undefined,
  ...children
) => {
  const { children: attrChildren, key = undefined } = attributes;
  const isNormalNode = typeof nodeName !== 'function';
  let stack = [];
  let vnodeChildren = [];

  stack.concat(children);

  if (attributes && attrChildren != null) {
    if (!stack.length) {
      stack.push(attrChildren);
    }
    delete attributes.children;
  }

  // 组件与 HTML 标签 , 对应 children 的处理逻辑
  flatten(stack).reduce((prevIsString, current) => {
    let currIsString = typeof current === 'string';

    typeof current === 'boolean' && (current = null);

    if (isNormalNode) {
      current == null && (current = '');
      typeof current === 'number' && (current = String(current));
    }

    if (currIsString && prevIsString && vnodeChildren.length) {
      vnodeChildren[vnodeChildren.length - 1] += current;
    } else {
      vnodeChildren.push(current);
    }

    return currIsString;
  }, false);

  let out = new VNode();
  Object.assign(new VNode(), {
    nodeName,
    children: vnodeChildren,
    attributes,
    key
  });

  if (options.vnode !== undefined) {
    options.vnode(out);
  }

  return out;
};

export default h;
