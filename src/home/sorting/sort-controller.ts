import { GitHubAggregated } from "../github-types";
import { Sorting } from "./generate-sorting-buttons";
import { sortBy } from "./sort-by";
import { sortByActivity } from "./sort-by-activity";
import { sortByBackLinks } from "./sort-by-backLinks";
import { sortByPriority } from "./sort-by-priority";

export function sortIssuesController(tasks: GitHubAggregated[], sorting?: Sorting, options = { ordering: "normal" }) {
  let sortedNotifications = tasks;

  if (sorting) {
    sortedNotifications = sortBy(sortedNotifications, sorting);
  } else {
    const sortedByFreshness = sortByActivity(sortedNotifications); // activity last
    const sortedByBackLinks = sortByBackLinks(sortedByFreshness); // backLinks second
    const sortedByPriority = sortByPriority(sortedByBackLinks); // highest priority first
    sortedNotifications = sortedByPriority;
  }

  if (options.ordering == "reverse") {
    sortedNotifications = sortedNotifications.reverse();
  }

  return sortedNotifications;
}
