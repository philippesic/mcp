import { Component, Prop, h } from "@stencil/core";

@Component({
  tag: "test-component",
  styleUrl: "TestComponent.css",
  shadow: true,
})
export class TestComponent {
  /** Heading text for the component */
  @Prop() heading: string;

  /** Content text for the component */
  @Prop() content: string;

  render() {
    return (
      <div class="test-component">
        <h1>{this.heading}</h1>
        <p>{this.content}</p>
      </div>
    );
  }
}
