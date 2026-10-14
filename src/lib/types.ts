export type Author = {
  id: string;
  name: string;
  url: string;
};

export type MemberPost = {
  title: string;
  url: string;
  date: string;
  summary?: string;
};

export type MemberFeed = {
  author: Author;
  posts: MemberPost[];
};

export type Post = MemberPost & {
  id: string;
  author: Author;
};
