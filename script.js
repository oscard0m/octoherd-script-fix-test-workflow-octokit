// @ts-check
import { composeCreatePullRequest } from "octokit-plugin-create-pull-request";
import { fixTestWorkflow } from "./edit-yaml.js";

const BRANCH_NAME = "fix-test-workflow";
const PATH = ".github/workflows/test.yml";

/**
 * fixes workflows in octokit in a programmatic way
 *
 * @param {import('@octoherd/cli').Octokit} octokit
 * @param {import('@octoherd/cli').Repository} repository
 */
export async function script(octokit, repository) {
  if (repository.archived) {
    octokit.log.info(`${repository.html_url} is archived, ignoring.`);
    return;
  }

  // Global variables used throughout the code
  const owner = repository.owner.login;
  const repo = repository.name;
  const defaultBranch = repository.default_branch;

  let file;
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path: PATH,
      }
    );

    file = data;
  } catch (e) {
    if (e.status === 404) {
      octokit.log.warn(`"${PATH}" path not found in ${repository.full_name}`);
      return;
    } else {
      throw e;
    }
  }

  if (Array.isArray(file)) {
    octokit.log.error(`"${PATH}" is a folder in ${repository.full_name}`);
    return;
  }

  fixTestWorkflow({ content: file.content, encoding: file.encoding });

  const prCreated = await composeCreatePullRequest(octokit, {
    owner,
    repo,
    title:
      "ci(workflow): fix test workflow to assure it is not skipped if test_matrix fails",
    body: `## Description
- Add \`always()\` condition to assure the workflow is not skipped if test_matrix fails
- Add logic to make the actual job fail if one of the tests of 'test_matrix' failed
## Context
https://github.com/octokit/auth-oauth-device.js/pull/74

---
🤖 This PR has been generated automatically by [this octoherd script](https://github.com/oscard0m/octoherd-script-fix-test-workflow-octokit), feel free to run it in your GitHub user/org repositories! 💪🏾
`,
    base: defaultBranch,
    head: BRANCH_NAME,
    createWhenEmpty: false,
    changes: [
      {
        files: { [PATH]: fixTestWorkflow },
        commit: `ci(workflow): fix test workflow to assure it is not skipped if test_matrix fails`,
        emptyCommit: false,
      },
    ],
  });

  if (!prCreated) {
    octokit.log.warn(`No Pull Request created for ${repository.full_name}`);
    return;
  }

  octokit.log.info(`Pull Request created at ${prCreated.data.html_url}`);
}
