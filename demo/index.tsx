import * as React from '../src/index';
const { render, Component } = React;

class A extends Component {
  state: {
    num: number;
  };
  props: {
    name: string;
  };
  constructor(props) {
    super(props);
    this.state = {
      num: 1
    };
  }
  render() {
    return (
      <div
        onClick={() => {
          console.log(this);
          this.setState({ num: ++this.state.num });
        }}
      >
        Hello!
        {this.props.name}
        {this.state.num}
      </div>
    );
  }
}

render(
  <A name="Preact">
    <div>123</div>
  </A>,
  document.body
);
