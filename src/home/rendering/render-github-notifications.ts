import { Octokit } from "@octokit/rest";
import { organizationImageCache } from "../fetch-github/fetch-data";
import { getGitHubAccessToken } from "../getters/get-github-access-token";
import { GitHubAggregated } from "../github-types";
import { notificationsContainer, shouldShowBotNotifications } from "../home";
import { getTimeAgo } from "./utils";

export async function renderNotifications(notifications: GitHubAggregated[], skipAnimation: boolean = false) {
  const providerToken = await getGitHubAccessToken();

  if (notificationsContainer.classList.contains("ready")) {
    notificationsContainer.classList.remove("ready");
    notificationsContainer.innerHTML = "";
  }
  const existingNotificationIds = new Set(
    Array.from(notificationsContainer.querySelectorAll(".issue-element-inner")).map((element) => element.getAttribute("data-issue-id"))
  );

  let delay = 0;
  const baseDelay = 1000 / 15; // Base delay in milliseconds

  // Fetch all latest comments before rendering notifications
  const commentsMap = await fetchLatestComments(notifications);

  for (const notification of notifications) {
    if (!existingNotificationIds.has(notification.id.toString())) {
      const issueWrapper = await everyNewNotification({ notification, notificationsContainer, commentsMap, providerToken });

      if (issueWrapper) {
        if (skipAnimation) {
          issueWrapper.classList.add("active");
        } else {
          setTimeout(() => issueWrapper.classList.add("active"), delay);
          delay += baseDelay;
        }
      }
    }
  }
  notificationsContainer.classList.add("ready");

  // Check if notificationsContainer has no children and render empty message if true
  if (notificationsContainer.children.length === 0) {
    await renderEmpty();
  }

  // Scroll to the top of the page
  window.scrollTo({ top: 0 });
}

export async function renderEmpty() {
  if (notificationsContainer.classList.contains("ready")) {
    notificationsContainer.classList.remove("ready");
    notificationsContainer.innerHTML = "";
  }

  const issueWrapper = document.createElement("div");
  const issueElement = document.createElement("div");
  issueElement.classList.add("issue-element-inner");

  const providerToken = await getGitHubAccessToken();
  const isLoggedIn = providerToken !== null;

  const message = isLoggedIn ? "Take a break, write some code, do what you do best." : "Please log in to view your notifications.";
  const title = isLoggedIn ? "All caught up!" : "No notifications available";

  issueElement.innerHTML = `
    <div class="info">
      <div class="notification-icon">
        ${
          isLoggedIn
            ? `
          <svg aria-label="All notifications read" role="img" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-check">
              <path fill="#1a7f37" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
          </svg>
        `
            : `
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-sign-in">
              <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25Zm6.56 4.5h5.69a.75.75 0 0 1 0 1.5H8.56l1.97 1.97a.75.75 0 0 1-1.06 1.06L6.22 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 1 1 1.06 1.06L8.56 7.25Z"></path>
          </svg>
        `
        }
      </div>
      <div class="text-info">
        <div class="title">
          <h3>${title}</h3>
        </div>
        <div class="partner">
          <div class="full-repo-name">
            <span class="comment-body">${message}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  issueElement.classList.add("issue-element-inner");
  issueWrapper.appendChild(issueElement);
  notificationsContainer.appendChild(issueWrapper);

  issueWrapper.classList.add("active");
  notificationsContainer.classList.add("ready");
}

// this is used for cloning to speed up in loop
const notificationTemplate = document.createElement("div");
notificationTemplate.innerHTML = `
  <div class="issue-element-inner">
    <div class="content">
      <!-- dynamic content will be inserted here -->
    </div>
  </div>
`;

async function everyNewNotification({
  notification,
  notificationsContainer,
  commentsMap,
  providerToken,
}: {
  notification: GitHubAggregated;
  notificationsContainer: HTMLDivElement;
  commentsMap: Map<string, { userType: string; url: string; avatarUrl: string; commentBody: string }>;
  providerToken: string | null;
}) {
  const issueWrapper = notificationTemplate.cloneNode(true) as HTMLDivElement;
  const issueElement = issueWrapper.querySelector(".issue-element-inner") as HTMLDivElement;

  issueElement.setAttribute("data-issue-id", notification.id.toString());
  issueElement.classList.add("issue-element-inner");

  const labels = parseAndGenerateLabels(notification);
  const [organizationName, repositoryName] = notification.repository.url.split("/").slice(-2);

  const commentData = commentsMap.get(notification.id.toString());

  if (!commentData || (commentData.userType === "Bot" && !shouldShowBotNotifications)) {
    console.log("skipping", notification.subject.title, "because of bot notification");
    return;
  }
  if (commentData.commentBody === "") {
    console.log("skipping", notification.subject.title, "because of empty comment");
    return;
  }

  await setUpIssueElement(providerToken, issueElement, notification, organizationName, repositoryName, labels, commentData);
  issueWrapper.appendChild(issueElement);
  notificationsContainer.appendChild(issueWrapper);
  return issueWrapper;
}

async function setUpIssueElement(
  providerToken: string | null,
  issueElement: HTMLDivElement,
  notification: GitHubAggregated,
  organizationName: string,
  repositoryName: string,
  labels: string[],
  commentData: { userType: string; url: string; avatarUrl: string; commentBody: string }
) {
  if (commentData.userType === "Bot" && !shouldShowBotNotifications) {
    console.log("bot notifications are hidden");
    issueElement.style.display = "none";
  }

  console.trace({
    providerToken,
    issueElement,
    notification,
    organizationName,
    repositoryName,
    labels,
    commentData,
  });

  const octokit = new Octokit({ auth: providerToken });
  const image = `<img class="orgAvatar"/>`;

  issueElement.innerHTML = `
    <div class="info">
      <div class="notification-icon"></div>
      <div class="text-info">
        <div class="title">
          <h3>${notification.subject.title}</h3>
        </div>
        <div class="partner">
          <div class="full-repo-name">
            <p class="organization-name">${organizationName}</p>
            <p class="repository-name">${repositoryName}</p>
          </div>
          <p class="issue-number">#${notification.subject.url.split("/").slice(-1)}</p>
        </div>
      </div>
    </div>
    <div class="latest-comment-preview">
        <div class="comment-preview">
          <img src="${commentData.avatarUrl}" class="comment-avatar"/>
          <span class="comment-body">${commentData.commentBody}</span>
        </div>
    </div>
    <div class="labels">
      ${labels.join("")}
      ${image}
    </div>`;

  const notificationIcon = issueElement.querySelector(".notification-icon");

  if (notification.subject.type === "Issue" && notificationIcon) {
    notificationIcon.innerHTML = `
      <svg viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true">
        <path fill="#888" d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
        <path fill="#888" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
      </svg>
      `;
  } else if (notification.subject.type === "PullRequest" && notificationIcon) {
    notificationIcon.innerHTML = `
      <svg viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true">
        <path fill="#888" d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path>
      </svg>
      `;
  }

  issueElement.addEventListener("click", () => {
    window.open(commentData.url, "_blank");
    void (async () => {
      try {
        await octokit.request("PATCH /notifications/threads/{thread_id}", {
          thread_id: Number(notification.id),
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });
        await octokit.request("DELETE /notifications/threads/{thread_id}", {
          thread_id: Number(notification.id),
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });
      } catch (error) {
        // Re-throw the error to preserve the stack trace
        setTimeout(() => {
          throw error;
        });
      }
    })();
  });
}

async function fetchLatestComments(notifications: GitHubAggregated[]) {
  const providerToken = await getGitHubAccessToken();
  const commentsMap = new Map<string, { userType: string; url: string; avatarUrl: string; commentBody: string }>();

  const results = await Promise.allSettled(
    notifications.map(async (notification) => {
      const { subject } = notification;
      let userType = "";
      let url = "";
      let avatarUrl = "";
      let commentBody = "";

      if (subject.latest_comment_url) {
        const response = await fetch(subject.latest_comment_url, {
          headers: { Authorization: `Bearer ${providerToken}` },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        userType = data.user.type;
        url = data.html_url;
        avatarUrl = data.user.avatar_url;
        commentBody = data.body;

        // Check if commentBody contains HTML
        const parser = new DOMParser();
        const parsedDoc = parser.parseFromString(commentBody, "text/html");
        if (parsedDoc.body.children.length > 0) {
          commentBody = "This comment is in HTML format.";
        }
      }

      if (!url) {
        url = subject.url;
      }

      return { notification, data: { userType, url, avatarUrl, commentBody } };
    })
  );

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      commentsMap.set(result.value.notification.id.toString(), result.value.data);
    }
  });

  return commentsMap;
}

function parseAndGenerateLabels(notification: GitHubAggregated) {
  const labels: string[] = [];

  // Check for priority in comments
  if (notification.comments) {
    notification.comments.forEach((comment) => {
      if (comment.body.startsWith("Priority:")) {
        const priority = comment.body.split(":")[1].trim();
        labels.push(`<label class="priority">${priority}</label>`);
      }
    });
  }

  // Add priority from notification priority field if it exists
  if (notification.priority !== undefined) {
    labels.push(`<label class="priority">P${notification.priority}</label>`);
  }

  if (notification.reason) {
    const reason = notification.reason.replace(/_/g, " ");
    labels.push(`<label class="reason">${reason}</label>`);
  }

  if (notification.updated_at) {
    const timeAgo = getTimeAgo(new Date(notification.updated_at));
    labels.push(`<label class="timestamp">${timeAgo}</label>`);
  }

  return labels;
}

export function applyAvatarsToNotifications() {
  if (!notificationsContainer) {
    throw new Error("issues-container not found");
  }

  const notificationElements = Array.from(notificationsContainer.querySelectorAll(".issue-element-inner"));

  notificationElements.forEach((issueElement) => {
    const orgName = issueElement.querySelector(".organization-name")?.textContent;
    if (orgName) {
      const avatarUrl = organizationImageCache.get(orgName);
      if (avatarUrl) {
        const avatarImg = issueElement.querySelector(".orgAvatar") as HTMLImageElement;
        if (avatarImg) {
          avatarImg.src = URL.createObjectURL(avatarUrl);
        }
      }
    }
  });
}
