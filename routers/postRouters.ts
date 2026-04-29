// @ts-nocheck
import express from "express";
import * as database from "../controller/postController";
const router = express.Router();
import { ensureAuthenticated } from "../middleware/checkAuth";

router.get("/", async (req, res) => {
  const user = req.user as any;
  const posts = await database.getPosts(20);
  const decoratedPosts = await Promise.all(
    posts.map(async (post) => {
      const fullPost = await database.getPost(post.id);
      const voteTotal = fullPost.votes.reduce((total, vote) => total + vote.value, 0);
      const myVote = user
        ? (await database.getUserVoteForPost(post.id, user.id))?.value || 0
        : 0;

      return {
        ...fullPost,
        voteTotal,
        myVote,
      };
    })
  );

  res.render("posts", { posts: decoratedPosts, user });
});

router.get("/create", ensureAuthenticated, (req, res) => {
  res.render("createPosts", { error: null, formData: {} });
});

router.post("/create", ensureAuthenticated, async (req, res) => {
  const user = req.user as any;
  const { title, link, description, subgroup } = req.body;
  const cleanedTitle = (title || "").trim();
  const cleanedLink = (link || "").trim();
  const cleanedDescription = (description || "").trim();
  const cleanedSubgroup = (subgroup || "").trim();

  if (!cleanedTitle || !cleanedSubgroup || (!cleanedLink && !cleanedDescription)) {
    return res.status(400).render("createPosts", {
      error: "Title and subgroup are required, plus either a link or description.",
      formData: {
        title: cleanedTitle,
        link: cleanedLink,
        description: cleanedDescription,
        subgroup: cleanedSubgroup,
      },
    });
  }

  const createdPost = await database.addPost(
    cleanedTitle,
    cleanedLink,
    user.id,
    cleanedDescription,
    cleanedSubgroup
  );

  res.redirect(`/posts/show/${createdPost.id}`);
});

router.get("/show/:postid", async (req, res) => {
  const user = req.user as any;
  const postId = Number(req.params.postid);
  const post = await database.getPost(postId);

  if (!post) {
    return res.status(404).send("Post not found");
  }

  const voteTotal = post.votes.reduce((total, vote) => total + vote.value, 0);
  const myVote = user
    ? (await database.getUserVoteForPost(post.id, user.id))?.value || 0
    : 0;

  post.comments.sort((a, b) => b.timestamp - a.timestamp);

  res.render("individualPost", {
    post,
    user,
    voteTotal,
    myVote,
    isOwner: user && post.creator.id === user.id,
  });
});

router.get("/edit/:postid", ensureAuthenticated, async (req, res) => {
  const user = req.user as any;
  const postId = Number(req.params.postid);
  const post = await database.getPost(postId);

  if (!post) {
    return res.status(404).send("Post not found");
  }

  if (post.creator.id !== user.id) {
    return res.status(403).send("You can only edit your own posts.");
  }

  res.render("editPost", { post, error: null });
});

router.post("/edit/:postid", ensureAuthenticated, async (req, res) => {
  const user = req.user as any;
  const postId = Number(req.params.postid);
  const post = await database.getPost(postId);

  if (!post) {
    return res.status(404).send("Post not found");
  }

  if (post.creator.id !== user.id) {
    return res.status(403).send("You can only edit your own posts.");
  }

  const { title, link, description, subgroup } = req.body;
  const cleanedTitle = (title || "").trim();
  const cleanedLink = (link || "").trim();
  const cleanedDescription = (description || "").trim();
  const cleanedSubgroup = (subgroup || "").trim();

  if (!cleanedTitle || !cleanedSubgroup || (!cleanedLink && !cleanedDescription)) {
    return res.status(400).render("editPost", {
      post: {
        ...post,
        title: cleanedTitle,
        link: cleanedLink,
        description: cleanedDescription,
        subgroup: cleanedSubgroup,
      },
      error: "Title and subgroup are required, plus either a link or description.",
    });
  }

  await database.editPost(postId, {
    title: cleanedTitle,
    link: cleanedLink,
    description: cleanedDescription,
    subgroup: cleanedSubgroup,
  });

  res.redirect(`/posts/show/${postId}`);
});

router.get("/deleteconfirm/:postid", ensureAuthenticated, async (req, res) => {
  const user = req.user as any;
  const postId = Number(req.params.postid);
  const post = await database.getPost(postId);

  if (!post) {
    return res.status(404).send("Post not found");
  }

  if (post.creator.id !== user.id) {
    return res.status(403).send("You can only delete your own posts.");
  }

  res.render("deletePostConfirm", { post });
});

router.post("/delete/:postid", ensureAuthenticated, async (req, res) => {
  const user = req.user as any;
  const postId = Number(req.params.postid);
  const post = await database.getPost(postId);

  if (!post) {
    return res.status(404).send("Post not found");
  }

  if (post.creator.id !== user.id) {
    return res.status(403).send("You can only delete your own posts.");
  }

  const shouldDelete = req.body.confirmDelete === "yes";
  if (!shouldDelete) {
    return res.redirect(`/posts/show/${postId}`);
  }

  const subgroupName = post.subgroup;
  await database.deletePost(postId);
  res.redirect(`/subs/show/${encodeURIComponent(subgroupName)}`);
});

router.post("/vote/:postid", ensureAuthenticated, async (req, res) => {
  const user = req.user as any;
  const postId = Number(req.params.postid);
  const post = await database.getPost(postId);

  if (!post) {
    return res.status(404).send("Post not found");
  }

  const targetVote = Number(req.body.setvoteto);
  if (![1, -1, 0].includes(targetVote)) {
    return res.status(400).send("Invalid vote value");
  }

  await database.setVote(postId, user.id, targetVote);
  res.redirect(`/posts/show/${postId}`);
});

router.post(
  "/comment-create/:postid",
  ensureAuthenticated,
  async (req, res) => {
    const user = req.user as any;
    const postId = Number(req.params.postid);
    const post = await database.getPost(postId);
    const description = (req.body.description || "").trim();

    if (!post) {
      return res.status(404).send("Post not found");
    }

    if (!description) {
      return res.redirect(`/posts/show/${postId}`);
    }

    await database.addComment(postId, user.id, description);
    res.redirect(`/posts/show/${postId}`);
  }
);

export default router;
