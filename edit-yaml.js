import { load, dump } from "js-yaml";
import prettier from "prettier";

/**
 * Adds 'if' option to 'test' job and a conditional step to exit 1 if dependent job failed
 * @param {object} options
 * @param {string} [options.content] File content of the GitHub Action
 * @param {string} [options.encoding] Encoding to use to get the stringified content of the GitHub Action
 *
 * @return {string | undefined} Returns the content of the GitHub Action file  with 'cache' option added or null if the file was not modified
 */
export function fixTestWorkflow({ content, encoding }) {
  const yamlDocument = load(Buffer.from(content, encoding).toString("utf-8"));

  const jobs = yamlDocument.jobs;

  if (
    jobs.test_matrix &&
    jobs.test &&
    jobs.test.needs === "test_matrix" &&
    !jobs.test.if
  ) {
    jobs.test.if = "${{ always }}";
    jobs.test.steps.unshift({
      run: "exit 1",
      if: "${{ needs.test_matrix.result != 'success' }}",
    });

    console.log(
      prettier.format(JSON.stringify(yamlDocument), { parser: "json" })
    );

    const updatedContent = prettier.format(dump(yamlDocument, {}), {
      parser: "yaml",
    });

    return updatedContent;
  }
}
