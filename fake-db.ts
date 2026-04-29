// @ts-nocheck
const users = {
  1: {
    id: 1,
    uname: "alice",
    password: "alpha",
  },
  2: {
    id: 2,
    uname: "theo",
    password: "123",
  },
  3: {
    id: 3,
    uname: "prime",
    password: "123",
  },
  4: {
    id: 4,
    uname: "leerob",
    password: "123",
  },
};

const posts = {
  101: {
    id: 101,
    title: "Mochido opens its new location in Coquitlam this week",
    link: "https://dailyhive.com/vancouver/mochido-coquitlam-open",
    description:
      "New mochi donut shop, Mochido, is set to open later this week.",
    creator: 1,
    subgroup: "food",
    timestamp: 1643648446955,
  },
  102: {
    id: 102,
    title: "2023 State of Databases for Serverless & Edge",
    link: "https://leerob.io/blog/backend",
    description:
      "An overview of databases that pair well with modern application and compute providers.",
    creator: 4,
    subgroup: "coding",
    timestamp: 1642611742010,
  },
};

const comments = {
  9001: {
    id: 9001,
    post_id: 102,
    creator: 1,
    description: "Actually I learned a lot :pepega:",
    timestamp: 1642691742010,
  },
};

const votes = [
  { user_id: 2, post_id: 101, value: +1 },
  { user_id: 3, post_id: 101, value: +1 },
  { user_id: 4, post_id: 101, value: +1 },
  { user_id: 3, post_id: 102, value: -1 },
];

function debug() {
  console.log("==== DB DEBUGING ====");
  console.log("users", users);
  console.log("posts", posts);
  console.log("comments", comments);
  console.log("votes", votes);
  console.log("==== DB DEBUGING ====");
}

function getUser(id) {
  const key = Number(id);
  return users[key];
}

function getUserByUsername(uname: any) {
  return getUser(
    Object.values(users).filter((user) => user.uname === uname)[0].id
  );
}

function getVotesForPost(post_id) {
  return votes.filter((vote) => vote.post_id === post_id);
}

function getVoteForPostByUser(post_id, user_id) {
  return votes.find(
    (vote) => vote.post_id === Number(post_id) && vote.user_id === Number(user_id)
  );
}

function decoratePost(post) {
  if (!post) {
    return null;
  }
  const unknownUser = { id: 0, uname: "Unknown", password: "" };
  post = {
    ...post,
    creator: users[Number(post.creator)] || unknownUser,
    votes: getVotesForPost(post.id),
    comments: Object.values(comments)
      .filter((comment) => comment.post_id === post.id)
      .map((comment) => ({
        ...comment,
        creator: users[Number(comment.creator)] || unknownUser,
      })),
  };
  return post;
}

/**
 * @param {*} n how many posts to get, defaults to 5
 * @param {*} sub which sub to fetch, defaults to all subs
 */
function getPosts(n = 5, sub?: string) {
  let allPosts = Object.values(posts);
  if (sub) {
    allPosts = allPosts.filter((post) => post.subgroup === sub);
  }
  allPosts.sort((a, b) => b.timestamp - a.timestamp);
  return allPosts.slice(0, n);
}

function getPost(id) {
  return decoratePost(posts[id]);
}

function addPost(title, link, creator, description, subgroup) {
  let id = Math.max(...Object.keys(posts).map(Number)) + 1;
  let post = {
    id,
    title,
    link,
    description,
    creator: Number(creator),
    subgroup,
    timestamp: Date.now(),
  };
  posts[id] = post;
  return post;
}

function editPost(post_id, changes = {}) {
  let post = posts[post_id];
  if (changes.title) {
    post.title = changes.title;
  }
  if (changes.link) {
    post.link = changes.link;
  }
  if (changes.description) {
    post.description = changes.description;
  }
  if (changes.subgroup) {
    post.subgroup = changes.subgroup;
  }
}

function deletePost(post_id) {
  for (let i = votes.length - 1; i >= 0; i -= 1) {
    if (votes[i].post_id === Number(post_id)) {
      votes.splice(i, 1);
    }
  }

  Object.keys(comments).forEach((commentId) => {
    if (comments[commentId].post_id === Number(post_id)) {
      delete comments[commentId];
    }
  });

  delete posts[post_id];
}

function getSubs() {
  return Array.from(new Set(Object.values(posts).map((post) => post.subgroup)));
}

function addComment(post_id, creator, description) {
  const allCommentIds = Object.keys(comments).map(Number);
  let id = (allCommentIds.length > 0 ? Math.max(...allCommentIds) : 9000) + 1;
  let comment = {
    id,
    post_id: Number(post_id),
    creator: Number(creator),
    description,
    timestamp: Date.now(),
  };
  comments[id] = comment;
  return comment;
}

function setVote(post_id, user_id, value) {
  const normalizedVote = Number(value);
  const voteIndex = votes.findIndex(
    (vote) => vote.post_id === Number(post_id) && vote.user_id === Number(user_id)
  );

  if (![1, -1, 0].includes(normalizedVote)) {
    return null;
  }

  if (normalizedVote === 0) {
    if (voteIndex >= 0) {
      votes.splice(voteIndex, 1);
    }
    return { user_id: Number(user_id), post_id: Number(post_id), value: 0 };
  }

  if (voteIndex >= 0) {
    votes[voteIndex].value = normalizedVote;
    return votes[voteIndex];
  }

  const newVote = {
    user_id: Number(user_id),
    post_id: Number(post_id),
    value: normalizedVote,
  };
  votes.push(newVote);
  return newVote;
}

export {
  debug,
  getUser,
  getUserByUsername,
  getPosts,
  getPost,
  getVoteForPostByUser,
  addPost,
  editPost,
  deletePost,
  getSubs,
  addComment,
  setVote,
  decoratePost,
};
