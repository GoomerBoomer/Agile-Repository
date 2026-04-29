import express from "express";
import * as database from "../controller/postController";

const router = express.Router();

router.get("/list", async (req, res) => {
  const subs = (await database.getSubs()).slice().sort();
  res.render("subs", { subs });
});

router.get("/show/:subname", async (req, res) => {
  const user = req.user as any;
  const subname = req.params.subname;
  const posts = await database.getPosts(100, subname);

  const decoratedPosts = await Promise.all(
    posts.map(async (post) => {
      const fullPost = await database.getPost(post.id);
      const voteTotal = fullPost.votes.reduce(
        (total: number, vote: { value: number }) => total + vote.value,
        0
      );
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

  res.render("sub", {
    subname,
    posts: decoratedPosts,
    user,
  });
});

export default router;
