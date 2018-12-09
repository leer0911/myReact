import options from '../config/options';
import { enqueueRender } from '../core/render-queue';
import { applyRef, extend } from '../utils';
import { getNodeProps } from './index';
import { createComponent, recyclerComponents } from './component-recycler';
import { removeNode } from '../dom/index';
import { removeChildren } from './diff';
import {
  NO_RENDER,
  SYNC_RENDER,
  FORCE_RENDER,
  ASYNC_RENDER,
  ATTR_KEY
} from '../core/constants';
import {
  mounts,
  diffLevel,
  flushMounts,
  recollectNodeTree,
  diff
} from './diff';

const setComponentProps = (component, props, renderMode, context, mountAll) => {
  if (component._disable) return;
  component._disable = true;

  component.__ref = props.ref;
  component.__key = props.key;
  delete props.ref;
  delete props.key;

  if (typeof component.constructor.getDerivedStateFromProps === 'undefined') {
    if (!component.base || mountAll) {
      if (component.componentWillMount) component.componentWillMount();
    } else if (component.componentWillReceiveProps) {
      component.componentWillReceiveProps(props, context);
    }
  }

  if (context && context !== component.context) {
    if (!component.prevContext) component.prevContext = component.context;
    component.context = context;
  }

  if (!component.prevProps) component.prevProps = component.props;
  component.props = props;

  component._disable = false;

  if (renderMode !== NO_RENDER) {
    if (
      renderMode === SYNC_RENDER ||
      options.syncComponentUpdates !== false ||
      !component.base
    ) {
      renderComponent(component, SYNC_RENDER, mountAll);
    } else {
      enqueueRender(component);
    }
  }
  applyRef(component.__ref, component);
};

const renderComponent = (component, renderMode?, mountAll?, isChild?) => {
  if (component._disable) return;

  let {
    props,
    state,
    context,
    constructor,
    previousProps = props,
    previousState = state,
    previousContext = context,
    base: isUpdate,
    nextBase,
    _component: initialChildComponent
  } = component;

  let initialBase = isUpdate || nextBase;
  let snapshot = previousContext;
  let skip = false;
  let rendered;
  let inst;
  let cbase;

  const { getDerivedStateFromProps } = constructor;

  if (getDerivedStateFromProps) {
    state = Object.assign(
      Object.assign({}, state),
      getDerivedStateFromProps(props, state)
    );
    component.state = state;
  }

  // if updating
  if (isUpdate) {
    debugger;
    component.props = previousProps;
    component.state = previousState;
    component.context = previousContext;
    if (
      renderMode !== FORCE_RENDER &&
      component.shouldComponentUpdate &&
      component.shouldComponentUpdate(props, state, context) === false
    ) {
      skip = true;
    } else if (component.componentWillUpdate) {
      component.componentWillUpdate(props, state, context);
    }
    component.props = props;
    component.state = state;
    component.context = context;
  }

  component.prevProps = component.prevState = component.prevContext = component.nextBase = null;
  component._dirty = false;

  if (!skip) {
    rendered = component.render(props, state, context);

    // context to pass to the child, can be updated via (grand-)parent component
    if (component.getChildContext) {
      context = extend(extend({}, context), component.getChildContext());
    }

    if (isUpdate && component.getSnapshotBeforeUpdate) {
      snapshot = component.getSnapshotBeforeUpdate(
        previousProps,
        previousState
      );
    }

    let childComponent = rendered && rendered.nodeName,
      toUnmount,
      base;

    if (typeof childComponent === 'function') {
      // set up high order component link

      let childProps = getNodeProps(rendered);
      inst = initialChildComponent;

      if (
        inst &&
        inst.constructor === childComponent &&
        childProps.key == inst.__key
      ) {
        setComponentProps(inst, childProps, SYNC_RENDER, context, false);
      } else {
        toUnmount = inst;

        component._component = inst = createComponent(
          childComponent,
          childProps,
          context
        );
        inst.nextBase = inst.nextBase || nextBase;
        inst._parentComponent = component;
        setComponentProps(inst, childProps, NO_RENDER, context, false);
        renderComponent(inst, SYNC_RENDER, mountAll, true);
      }

      base = inst.base;
    } else {
      cbase = initialBase;

      // destroy high order component link
      toUnmount = initialChildComponent;
      if (toUnmount) {
        cbase = component._component = null;
      }
      if (initialBase || renderMode === SYNC_RENDER) {
        if (cbase) cbase._component = null;
        base = diff(
          cbase,
          rendered,
          context,
          mountAll || !isUpdate,
          initialBase && initialBase.parentNode,
          true
        );
      }
    }

    if (initialBase && base !== initialBase && inst !== initialChildComponent) {
      let baseParent = initialBase.parentNode;
      if (baseParent && base !== baseParent) {
        baseParent.replaceChild(base, initialBase);

        if (!toUnmount) {
          initialBase._component = null;
          recollectNodeTree(initialBase, false);
        }
      }
    }

    if (toUnmount) {
      unmountComponent(toUnmount);
    }

    component.base = base;
    if (base && !isChild) {
      let componentRef = component,
        t = component;
      while ((t = t._parentComponent)) {
        (componentRef = t).base = base;
      }
      base._component = componentRef;
      base._componentConstructor = componentRef.constructor;
    }
  }

  if (!isUpdate || mountAll) {
    mounts.push(component);
  } else if (!skip) {
    // Ensure that pending componentDidMount() hooks of child components
    // are called before the componentDidUpdate() hook in the parent.
    // Note: disabled as it causes duplicate hooks, see https://github.com/developit/preact/issues/750
    // flushMounts();

    if (component.componentDidUpdate) {
      component.componentDidUpdate(previousProps, previousState, snapshot);
    }
    if (options.afterUpdate) options.afterUpdate(component);
  }

  while (component._renderCallbacks.length) {
    component._renderCallbacks.pop().call(component);
  }

  if (!diffLevel && !isChild) {
    flushMounts();
  }
};

const buildComponentFromVNode = (dom, vnode, context, mountAll) => {
  let c = dom && dom._component,
    originalComponent = c,
    oldDom = dom,
    isDirectOwner = c && dom._componentConstructor === vnode.nodeName,
    isOwner = isDirectOwner,
    props = getNodeProps(vnode);
  while (c && !isOwner && (c = c._parentComponent)) {
    isOwner = c.constructor === vnode.nodeName;
  }

  if (c && isOwner && (!mountAll || c._component)) {
    setComponentProps(c, props, ASYNC_RENDER, context, mountAll);
    dom = c.base;
  } else {
    if (originalComponent && !isDirectOwner) {
      unmountComponent(originalComponent);
      dom = oldDom = null;
    }
    c = createComponent(vnode.nodeName, props, context);
    if (dom && !c.nextBase) {
      c.nextBase = dom;
      // passing dom/oldDom as nextBase will recycle it if unused, so bypass recycling on L229:
      oldDom = null;
    }
    setComponentProps(c, props, SYNC_RENDER, context, mountAll);
    dom = c.base;

    if (oldDom && dom !== oldDom) {
      oldDom._component = null;
      recollectNodeTree(oldDom, false);
    }
  }

  return dom;
};

const unmountComponent = component => {
  if (options.beforeUnmount) options.beforeUnmount(component);

  let base = component.base;

  component._disable = true;

  if (component.componentWillUnmount) component.componentWillUnmount();

  component.base = null;

  // recursively tear down & recollect high-order component children:
  let inner = component._component;
  if (inner) {
    unmountComponent(inner);
  } else if (base) {
    if (base[ATTR_KEY] != null) applyRef(base[ATTR_KEY].ref, null);
    component.nextBase = base;

    removeNode(base);
    recyclerComponents.push(component);

    removeChildren(base);
  }

  applyRef(component.__ref, null);
};

export {
  setComponentProps,
  renderComponent,
  buildComponentFromVNode,
  unmountComponent
};
