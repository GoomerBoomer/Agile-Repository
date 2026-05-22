// @ts-nocheck
import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(__dirname, "app.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    uname    TEXT    NOT NULL UNIQUE,
    password TEXT    NOT NULL,
    email    TEXT    NOT NULL UNIQUE,
    is_admin INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    link        TEXT,
    description TEXT,
    creator     INTEGER NOT NULL REFERENCES users(id),
    subgroup    TEXT,
    timestamp   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    creator     INTEGER NOT NULL REFERENCES users(id),
    description TEXT,
    timestamp   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS votes (
    user_id INTEGER NOT NULL REFERENCES users(id),
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    value   INTEGER NOT NULL,
    PRIMARY KEY (user_id, post_id)
  );

`);

// --------------- migrations ---------------

const userColumns = db.prepare("PRAGMA table_info(users)").all() as any[];
if (!userColumns.some((col: any) => col.name === "is_admin")) {
  db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
}

db.prepare("UPDATE users SET is_admin = 1 WHERE uname = 'hiroshi'").run();

// --------------- seed data (only if tables are empty) ---------------

const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
if (userCount === 0) {
  const insertUser = db.prepare(
    "INSERT INTO users (id, uname, password, email, is_admin) VALUES (?, ?, ?, ?, ?)"
  );
  insertUser.run(1, "alice", "alpha", "alice@example.com", 0);
  insertUser.run(2, "theo", "123", "theo@example.com", 0);
  insertUser.run(3, "prime", "123", "prime@example.com", 0);
  insertUser.run(4, "leerob", "123", "leerob@example.com", 0);

}

// --------------- helper queries (prepared once) ---------------

const stmts = {
  getUser: db.prepare("SELECT * FROM users WHERE id = ?"),
  getUserByUsername: db.prepare("SELECT * FROM users WHERE uname = ?"),
  getUserByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  insertUser: db.prepare(
    "INSERT INTO users (uname, password, email) VALUES (?, ?, ?)"
  ),

  getPosts: db.prepare(
    "SELECT * FROM posts ORDER BY timestamp DESC LIMIT ?"
  ),
  getPostsBySub: db.prepare(
    "SELECT * FROM posts WHERE subgroup = ? ORDER BY timestamp DESC LIMIT ?"
  ),
  getPost: db.prepare("SELECT * FROM posts WHERE id = ?"),
  insertPost: db.prepare(
    "INSERT INTO posts (title, link, description, creator, subgroup, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
  ),
  deletePost: db.prepare("DELETE FROM posts WHERE id = ?"),

  getCommentsByPost: db.prepare(
    "SELECT * FROM comments WHERE post_id = ? ORDER BY timestamp ASC"
  ),
  insertComment: db.prepare(
    "INSERT INTO comments (post_id, creator, description, timestamp) VALUES (?, ?, ?, ?)"
  ),
  deleteCommentsByPost: db.prepare("DELETE FROM comments WHERE post_id = ?"),

  getVotesForPost: db.prepare("SELECT * FROM votes WHERE post_id = ?"),
  getVoteForPostByUser: db.prepare(
    "SELECT * FROM votes WHERE post_id = ? AND user_id = ?"
  ),
  upsertVote: db.prepare(
    "INSERT INTO votes (user_id, post_id, value) VALUES (?, ?, ?) ON CONFLICT(user_id, post_id) DO UPDATE SET value = excluded.value"
  ),
  deleteVote: db.prepare(
    "DELETE FROM votes WHERE user_id = ? AND post_id = ?"
  ),
  deleteVotesByPost: db.prepare("DELETE FROM votes WHERE post_id = ?"),

  getSubs: db.prepare("SELECT DISTINCT subgroup FROM posts WHERE subgroup IS NOT NULL"),
};

// --------------- public API (same signatures as before) ---------------

function debug() {
  console.log("==== DB DEBUGGING ====");
  console.log("users", db.prepare("SELECT * FROM users").all());
  console.log("posts", db.prepare("SELECT * FROM posts").all());
  console.log("comments", db.prepare("SELECT * FROM comments").all());
  console.log("votes", db.prepare("SELECT * FROM votes").all());
  console.log("==== DB DEBUGGING ====");
}

function getUser(id) {
  return stmts.getUser.get(Number(id)) || undefined;
}

function getUserByUsername(uname: any) {
  return stmts.getUserByUsername.get(uname) || undefined;
}

function getUserByEmail(email: string) {
  return stmts.getUserByEmail.get(email) || null;
}

function addUser(uname: string, password: string, email: string) {
  const info = stmts.insertUser.run(uname, password, email);
  return { id: info.lastInsertRowid as number, uname, password, email };
}

function getVotesForPost(post_id) {
  return stmts.getVotesForPost.all(Number(post_id));
}

function getVoteForPostByUser(post_id, user_id) {
  return stmts.getVoteForPostByUser.get(Number(post_id), Number(user_id)) || undefined;
}

function decoratePost(post) {
  if (!post) return null;
  const unknownUser = { id: 0, uname: "Unknown", password: "" };
  const creator = getUser(post.creator) || unknownUser;
  const votes = getVotesForPost(post.id);
  const comments = stmts.getCommentsByPost.all(post.id).map((comment: any) => ({
    ...comment,
    creator: getUser(comment.creator) || unknownUser,
  }));
  return { ...post, creator, votes, comments };
}

function getPosts(n = 5, sub?: string) {
  if (sub) {
    return stmts.getPostsBySub.all(sub, n);
  }
  return stmts.getPosts.all(n);
}

function getPost(id) {
  const post = stmts.getPost.get(Number(id));
  return decoratePost(post);
}

function addPost(title, link, creator, description, subgroup) {
  const timestamp = Date.now();
  const info = stmts.insertPost.run(
    title,
    link,
    description,
    Number(creator),
    subgroup,
    timestamp
  );
  return {
    id: info.lastInsertRowid as number,
    title,
    link,
    description,
    creator: Number(creator),
    subgroup,
    timestamp,
  };
}

function editPost(post_id, changes: any = {}) {
  const post = stmts.getPost.get(Number(post_id)) as any;
  if (!post) return;
  const title = changes.title ?? post.title;
  const link = changes.link ?? post.link;
  const description = changes.description ?? post.description;
  const subgroup = changes.subgroup ?? post.subgroup;
  db.prepare(
    "UPDATE posts SET title = ?, link = ?, description = ?, subgroup = ? WHERE id = ?"
  ).run(title, link, description, subgroup, Number(post_id));
}

function deletePost(post_id) {
  stmts.deleteVotesByPost.run(Number(post_id));
  stmts.deleteCommentsByPost.run(Number(post_id));
  stmts.deletePost.run(Number(post_id));
}

function getSubs() {
  return stmts.getSubs.all().map((row: any) => row.subgroup);
}

function addComment(post_id, creator, description) {
  const timestamp = Date.now();
  const info = stmts.insertComment.run(
    Number(post_id),
    Number(creator),
    description,
    timestamp
  );
  return {
    id: info.lastInsertRowid as number,
    post_id: Number(post_id),
    creator: Number(creator),
    description,
    timestamp,
  };
}

function setVote(post_id, user_id, value) {
  const normalizedVote = Number(value);
  if (![1, -1, 0].includes(normalizedVote)) return null;

  if (normalizedVote === 0) {
    stmts.deleteVote.run(Number(user_id), Number(post_id));
    return { user_id: Number(user_id), post_id: Number(post_id), value: 0 };
  }

  stmts.upsertVote.run(Number(user_id), Number(post_id), normalizedVote);
  return { user_id: Number(user_id), post_id: Number(post_id), value: normalizedVote };
}
function isUserAdmin(userId: number): boolean {
  const user = stmts.getUser.get(Number(userId)) as any;
  return user?.is_admin === 1;
}

function setUserAdmin(userId: number, isAdmin: boolean) {
  db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(
    isAdmin ? 1 : 0,
    Number(userId)
  );
}

function canEditPost(userId: number, postId: number): boolean {
  const user = stmts.getUser.get(Number(userId)) as any;
  const post = stmts.getPost.get(Number(postId)) as any;
  if (!user || !post) return false;
  return user.is_admin === 1 || post.creator === Number(userId);
}

function canDeletePost(userId: number, postId: number): boolean {
  return canEditPost(userId, postId); // same rules
}

function canDeleteComment(userId: number, commentId: number): boolean {
  const user = stmts.getUser.get(Number(userId)) as any;
  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(Number(commentId)) as any;
  if (!user || !comment) return false;
  return user.is_admin === 1 || comment.creator === Number(userId);
}
export {
  debug,
  getUser,
  getUserByUsername,
  getUserByEmail,
  addUser,
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
  isUserAdmin,       // add
  setUserAdmin,      // add
  canEditPost,       // add
  canDeletePost,     // add
  canDeleteComment,  // add
};
