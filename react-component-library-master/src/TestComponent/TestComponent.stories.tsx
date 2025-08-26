import { defineCustomElementTestComponent } from "../../build/index.js";

defineCustomElementTestComponent();

export default {
  title: "TestComponent",
  argTypes: {
    heading: { control: "text" },
    content: { control: "text" },
  },
};

const Template = (args) =>
  `<test-component heading="${args.heading}" content="${args.content}"></test-component>`;

export const Example = Template.bind({});
Example.args = {
  heading: "Yo",
  content: "Gurt",
};
