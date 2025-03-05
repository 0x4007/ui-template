import { GitHubAggregated } from "../github-types";

export function sortByBackLinks(tasks: GitHubAggregated[]) {
  return tasks.sort((b, a) => {
    return a.backLinkCount - b.backLinkCount;
  });
}
