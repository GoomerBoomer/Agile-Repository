import * as db from "../fake-db";

// Make calls to your db from this file!
async function getPosts(n = 5, sub?: string) {
  return db.getPosts(n, sub);
}

async function getPost(postId) {
  return db.getPost(postId);
}

async function addPost(title, link, creator, description, subgroup) {
  return db.addPost(title, link, creator, description, subgroup);
}

async function editPost(postId, changes = {}) {
  return db.editPost(postId, changes);
}

async function deletePost(postId) {
  return db.deletePost(postId);
}

async function addComment(postId, creator, description) {
  return db.addComment(postId, creator, description);
}

async function setVote(postId, userId, value) {
  return db.setVote(postId, userId, value);
}

async function getUserVoteForPost(postId, userId) {
  return db.getVoteForPostByUser(postId, userId);
}

async function getSubs() {
  return db.getSubs();
}

export {
  getPosts,
  getPost,
  addPost,
  editPost,
  deletePost,
  addComment,
  setVote,
  getUserVoteForPost,
  getSubs,
};
