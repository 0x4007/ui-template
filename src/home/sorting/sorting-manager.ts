import { displayNotifications } from "../fetch-github/filter-and-display-notifications";
import { GitHubAggregated } from "../github-types";
import { flipShowBotNotifications, getNotifications, shouldShowBotNotifications } from "../home";
import { renderErrorInModal } from "../rendering/display-popup-modal";
import { Sorting } from "./generate-sorting-buttons";

type SearchableProperty = "title" | "body" | "number" | "html_url";

export class SortingManager {
  private _lastChecked: HTMLInputElement | null = null;
  private _toolBarFilters: HTMLElement;
  private _filterTextBox: HTMLInputElement;
  private _sortingButtons: HTMLElement;
  private _instanceId: string;
  private _sortingState: { [key: string]: "unsorted" | "ascending" | "descending" } = {}; // Track state for each sorting option

  constructor(filtersId: string, sortingOptions: readonly string[], instanceId: string) {
    const filters = document.getElementById(filtersId);

    if (!filters) throw new Error(`${filtersId} not found`);
    this._toolBarFilters = filters;
    this._instanceId = instanceId;

    // Initialize sorting buttons first
    this._sortingButtons = this._generateSortingButtons(sortingOptions);
    // Then initialize filter text box
    this._filterTextBox = this._generateFilterTextBox();

    // Initialize sorting states to 'unsorted' for all options
    sortingOptions.forEach((option) => {
      this._sortingState[option] = "unsorted";
    });
  }

  public render() {
    this._toolBarFilters.appendChild(this._filterTextBox);
    this._toolBarFilters.appendChild(this._sortingButtons);
  }

  private _getSearchableStrings(gitHubNotification: GitHubAggregated, searchableProperties: readonly SearchableProperty[]) {
    let searchableStrings: string[] = [];

    if (gitHubNotification.subject.type === "Issue") {
      searchableStrings = searchableProperties
        .map((prop) => {
          const value = gitHubNotification.issue[prop];
          return value?.toString().toLowerCase();
        })
        .filter((str): str is string => str !== undefined);
    } else if (gitHubNotification.subject.type === "PullRequest" && gitHubNotification.pullRequest) {
      searchableStrings = searchableProperties
        .map((prop) => {
          const value = gitHubNotification.pullRequest?.[prop];
          return value?.toString().toLowerCase();
        })
        .filter((str): str is string => str !== undefined);
    }

    searchableStrings.push(gitHubNotification.subject.title.toLowerCase());
    return searchableStrings;
  }

  private async _filterNotification(notification: HTMLDivElement, filterText: string, notificationId: string | null) {
    if (!notificationId) return;
    notification.classList.add("active");

    try {
      const gitHubNotifications = await getNotifications();
      if (!gitHubNotifications) return;

      const gitHubNotification = gitHubNotifications.find((n) => n.id === notificationId);
      if (!gitHubNotification) return;

      const searchableProperties = ["title", "body", "number", "html_url"] as const;
      const searchableStrings = this._getSearchableStrings(gitHubNotification, searchableProperties);
      const isVisible = searchableStrings.some((str) => str?.includes(filterText));
      notification.style.display = isVisible ? "block" : "none";
    } catch (error) {
      renderErrorInModal(error as Error);
    }
  }

  private _filterNotifications(textBox: HTMLInputElement, notificationsContainer: HTMLDivElement) {
    try {
      const filterText = textBox.value.toLowerCase();
      const notifications = Array.from(notificationsContainer.children) as HTMLDivElement[];

      notifications.forEach((notification) => {
        const notificationId = notification.children[0].getAttribute("data-issue-id");
        void this._filterNotification(notification, filterText, notificationId);
      });
    } catch (error) {
      renderErrorInModal(error as Error);
    }
  }

  private _generateFilterTextBox() {
    const textBox = document.createElement("input");
    textBox.type = "text";
    textBox.id = `filter-${this._instanceId}`;
    textBox.placeholder = "Search";

    // Handle CTRL+F
    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        textBox.focus();
      }
    });

    // Get the search query from the URL (if it exists) and pre-fill the input
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("search") ?? "";
    textBox.value = searchQuery;

    const notificationsContainer = document.getElementById("issues-container") as HTMLDivElement;

    // Observer to detect when children are added to the issues container (only once)
    const observer = new MutationObserver(() => {
      if (notificationsContainer.children.length > 0) {
        observer.disconnect(); // Stop observing once children are present
        if (searchQuery) this._filterNotifications(textBox, notificationsContainer);
      }
    });
    observer.observe(notificationsContainer, { childList: true });

    textBox.addEventListener("input", () => {
      const filterText = textBox.value;
      // Update the URL with the search parameter
      const updatedUrl = new URL(window.location.href);
      updatedUrl.searchParams.set("search", filterText);
      window.history.replaceState({}, "", updatedUrl.toString());
      this._filterNotifications(textBox, notificationsContainer);
    });

    return textBox;
  }

  private _generateSortingButtons(sortingOptions: readonly string[]) {
    const buttons = document.createElement("div");
    buttons.className = "labels";

    const input = document.createElement("input");
    input.style.display = "none";
    input.type = "button";
    input.id = `filter-bot-${this._instanceId}`;
    const label = document.createElement("label");
    label.htmlFor = `filter-bot-${this._instanceId}`;
    label.textContent = shouldShowBotNotifications ? "Hide Bot" : "Show Bot";

    input.addEventListener("click", () => {
      flipShowBotNotifications();
      label.textContent = shouldShowBotNotifications ? "Hide Bot" : "Show Bot";
      displayNotifications().catch((error) => {
        renderErrorInModal(error as Error);
      });
    });

    buttons.appendChild(input);
    buttons.appendChild(label);

    sortingOptions.forEach((option) => {
      const input = this._createRadioButton(option);
      const label = this._createLabel(option);

      buttons.appendChild(input);
      buttons.appendChild(label);

      input.addEventListener("click", () => {
        this._handleSortingClick(input, option).catch((error) => {
          renderErrorCatch(error as ErrorEvent);
        });
      });
    });

    return buttons;
  }

  private _createRadioButton(option: string): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "radio";
    input.value = option;
    input.id = `${option}-${this._instanceId}`;
    input.name = `sort-${this._instanceId}`;
    return input;
  }

  private _createLabel(option: string): HTMLLabelElement {
    const label = document.createElement("label");
    label.htmlFor = `${option}-${this._instanceId}`;
    label.textContent = option.charAt(0).toUpperCase() + option.slice(1);
    return label;
  }

  private async _handleSortingClick(input: HTMLInputElement, option: string) {
    const currentOrdering = input.getAttribute("data-ordering");
    let newOrdering: string;

    // Determine the new ordering based on the current state
    if (currentOrdering === "normal") {
      newOrdering = "reverse";
    } else if (currentOrdering === "reverse") {
      newOrdering = "disabled";
    } else {
      newOrdering = "normal";
    }

    // Apply the new ordering state
    input.setAttribute("data-ordering", newOrdering);
    input.parentElement?.childNodes.forEach((node) => {
      if (node instanceof HTMLInputElement) {
        node.setAttribute("data-ordering", "");
      }
    });

    // Clear search when applying a different sort
    this._filterTextBox.value = "";
    const updatedUrl = new URL(window.location.href);
    updatedUrl.searchParams.delete("search");
    window.history.replaceState({}, "", updatedUrl.toString());

    // Reset other buttons
    input.parentElement?.childNodes.forEach((node) => {
      if (node instanceof HTMLInputElement) {
        node.setAttribute("data-ordering", "");
      }
    });

    if (newOrdering === "disabled") {
      this._lastChecked = null;
      input.checked = false;
      await this._clearSorting();
    } else {
      input.checked = input !== this._lastChecked;
      this._lastChecked = input.checked ? input : null;
      input.setAttribute("data-ordering", newOrdering);

      // Apply the sorting based on the new state (normal or reverse)
      await displayNotifications({ sorting: option as Sorting, options: { ordering: newOrdering } });
    }
  }

  private async _clearSorting() {
    await displayNotifications();
  }
}

function renderErrorCatch(event: ErrorEvent) {
  return renderErrorInModal(event.error);
}
