export type GitHubNotifications = GitHubNotification[];

export interface GitHubNotification {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: string | null;
  subject: {
    title: string;
    url: string;
    latest_comment_url: string | null;
    type: string;
  };
  repository: {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
      id: number;
      node_id: string;
      avatar_url: string;
      url: string;
    };
    html_url: string;
    description: string | null;
    url: string;
  };
  url: string;
  subscription_url: string;
}

export interface GitHubIssue {
  url: string;
  number: number;
  state: string;
  title: string;
  body: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<
    | string
    | {
        name: string;
        color: string;
      }
  >;
  repository_url: string;
  html_url: string;
}

export interface GitHubPullRequest {
  url: string;
  state: string;
  title: string;
  body: string | null;
  draft: boolean;
  base: {
    repo: {
      url: string;
    };
  };
  user: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
}

export interface GitHubAggregated extends GitHubNotification {
  comments?: {
    body: string;
    html_url: string;
    user: {
      login: string;
      avatar_url: string;
    };
  }[];
  backLinks?: number;
  priority?: number;
  activity?: number;
  issue?: GitHubIssue;
  pullRequest?: GitHubPullRequest | null;
  backLinkCount: number;
}
