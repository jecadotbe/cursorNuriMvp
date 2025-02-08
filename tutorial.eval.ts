import { Eval } from "braintrust";
import { LevenshteinScorer } from "autoevals";

Eval("Say Hi Bot", {
  data: () => {
    return [
      {
        input: "Foo",
        expected: "Hi Foo",
      },
      {
        input: "Bar",
        expected: "Hello Bar",
      },
    ];
  },
  task: async (input) => {
    return "Hi " + input;
  },
  scores: [LevenshteinScorer],
});
