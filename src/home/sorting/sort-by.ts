import { GitHubAggregated } from "../github-types";
import { SORTING_OPTIONS } from "./generate-sorting-buttons";
import { sortByActivity } from "./sort-by-activity";
import { sortByBackLinks } from "./sort-by-back-links";
import { sortByPriority } from "./sort-by-priority";

export function sortBy(tasks: GitHubAggregated[], sortBy: (typeof SORTING_OPTIONS)[number]) {
  switch (sortBy) {
    case "priority":
      return sortByPriority(tasks);
    case "backLinks":
      return sortByBackLinks(tasks);
    case "activity":
      return sortByActivity(tasks);
    default:
      return tasks;
  }
}
