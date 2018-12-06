declare namespace preact {
  type Key = string | number;
  type Ref<T> = (instance: T) => void;
  type ComponentChild = VNode<any> | object | string | number | boolean | null;
  type ComponentChildren = ComponentChild[] | ComponentChild;
  type ComponentProps = Attributes;
  type PreactHTMLAttributes = ClassAttributes<any>;
  type ComponentFactory<P> = ComponentConstructor<P> | FunctionalComponent<P>;
  type RenderableProps<P, RefType = any> = Readonly<
    P & Attributes & { children?: ComponentChildren; ref?: Ref<RefType> }
  >;
  // Type alias for a component considered generally, whether stateless or stateful.
  type AnyComponent<P = {}, S = {}> =
    | FunctionalComponent<P>
    | ComponentConstructor<P, S>;

  export interface createElement<P = any> {
    /**
     * 用于创建 VNode (虚拟 DOM 元素) ，VNode 可用作表示轻量级的 DOM 树结构，
     * 可用于与真实 DOM做 diff 实现高效的 DOM
     *
     * Babel 可将 JSX 转为如下格式：
     * createElement('div', { id: 'foo', name : 'bar' }, 'Hello!')
     *
     * @see http://jasonformat.com/wtf-is-jsx
     */
    (
      node: string | ComponentFactory<P>,
      params:
        | Attributes &
            P &
            JSX.HTMLAttributes &
            JSX.SVGAttributes &
            Record<string, any>
        | null,
      ...children: ComponentChildren[]
    ): VNode<any>;
  }

  /**
   * Define the contract for a virtual node in preact.
   *
   * A virtual node has a name, a map of attributes, an array
   * of child {VNode}s and a key. The key is used by preact for
   * internal purposes.
   */
  interface VNode<P = any> {
    nodeName: ComponentFactory<P> | string;
    attributes: P;
    children: Array<VNode<any> | string>;
    key?: Key | null;
  }

  interface Attributes {
    key?: Key;
    jsx?: boolean;
  }

  interface ClassAttributes<T> extends Attributes {
    ref?: Ref<T>;
  }

  interface PreactDOMAttributes {
    children?: ComponentChildren;
    dangerouslySetInnerHTML?: {
      __html: string;
    };
  }

  interface FunctionalComponent<P = {}> {
    (props: RenderableProps<P>, context?: any): VNode<any> | null;
    displayName?: string;
    defaultProps?: Partial<P>;
  }

  interface ComponentConstructor<P = {}, S = {}> {
    new (props: P, context?: any): Component<P, S>;
    displayName?: string;
    defaultProps?: Partial<P>;
  }

  interface Component<P = {}, S = {}> {
    componentWillMount?(): void;
    componentDidMount?(): void;
    componentWillUnmount?(): void;
    getChildContext?(): object;
    componentWillReceiveProps?(nextProps: Readonly<P>, nextContext: any): void;
    shouldComponentUpdate?(
      nextProps: Readonly<P>,
      nextState: Readonly<S>,
      nextContext: any
    ): boolean;
    componentWillUpdate?(
      nextProps: Readonly<P>,
      nextState: Readonly<S>,
      nextContext: any
    ): void;
    componentDidUpdate?(
      previousProps: Readonly<P>,
      previousState: Readonly<S>,
      previousContext: any
    ): void;
  }

  abstract class Component<P, S> {
    constructor(props?: P, context?: any);

    static displayName?: string;
    static defaultProps?: any;

    state: Readonly<S>;
    props: RenderableProps<P>;
    context: any;
    base?: HTMLElement;

    setState<K extends keyof S>(state: Pick<S, K>, callback?: () => void): void;
    setState<K extends keyof S>(
      fn: (prevState: S, props: P) => Pick<S, K>,
      callback?: () => void
    ): void;

    forceUpdate(callback?: () => void): void;

    abstract render(
      props?: RenderableProps<P>,
      state?: Readonly<S>,
      context?: any
    ): ComponentChild;
  }

  function render(
    node: ComponentChild,
    parent: Element | Document | ShadowRoot | DocumentFragment,
    mergeWith?: Element
  ): Element;
  function rerender(): void;
  function cloneElement(
    element: JSX.Element,
    props: any,
    ...children: ComponentChildren[]
  ): JSX.Element;

  var options: {
    syncComponentUpdates?: boolean;
    debounceRendering?: (render: () => void) => void;
    vnode?: (vnode: VNode<any>) => void;
    event?: (event: Event) => Event;
  };
}
