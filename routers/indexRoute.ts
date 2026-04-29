import express, { Request, Response } from "express";
import * as database from "../controller/postController";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const user = req.user as any;
  const posts = await database.getPosts(20);
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

  res.render("posts", { posts: decoratedPosts, user });
});

export default router;
