"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const database = __importStar(require("../controller/postController"));
const router = express_1.default.Router();
const checkAuth_1 = require("../middleware/checkAuth");
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const posts = yield database.getPosts(20);
    const decoratedPosts = yield Promise.all(posts.map((post) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const fullPost = yield database.getPost(post.id);
        const voteTotal = fullPost.votes.reduce((total, vote) => total + vote.value, 0);
        const myVote = user
            ? ((_a = (yield database.getUserVoteForPost(post.id, user.id))) === null || _a === void 0 ? void 0 : _a.value) || 0
            : 0;
        return Object.assign(Object.assign({}, fullPost), { voteTotal,
            myVote });
    })));
    res.render("posts", { posts: decoratedPosts, user });
}));
router.get("/create", checkAuth_1.ensureAuthenticated, (req, res) => {
    res.render("createPosts", { error: null, formData: {} });
});
router.post("/create", checkAuth_1.ensureAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
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
    const createdPost = yield database.addPost(cleanedTitle, cleanedLink, user.id, cleanedDescription, cleanedSubgroup);
    res.redirect(`/posts/show/${createdPost.id}`);
}));
router.get("/show/:postid", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const user = req.user;
    const postId = Number(req.params.postid);
    const post = yield database.getPost(postId);
    if (!post) {
        return res.status(404).send("Post not found");
    }
    const voteTotal = post.votes.reduce((total, vote) => total + vote.value, 0);
    const myVote = user
        ? ((_b = (yield database.getUserVoteForPost(post.id, user.id))) === null || _b === void 0 ? void 0 : _b.value) || 0
        : 0;
    post.comments.sort((a, b) => b.timestamp - a.timestamp);
    res.render("individualPost", {
        post,
        user,
        voteTotal,
        myVote,
        isOwner: user && post.creator.id === user.id,
    });
}));
router.get("/edit/:postid", checkAuth_1.ensureAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const postId = Number(req.params.postid);
    const post = yield database.getPost(postId);
    if (!post) {
        return res.status(404).send("Post not found");
    }
    if (post.creator.id !== user.id) {
        return res.status(403).send("You can only edit your own posts.");
    }
    res.render("editPost", { post, error: null });
}));
router.post("/edit/:postid", checkAuth_1.ensureAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const postId = Number(req.params.postid);
    const post = yield database.getPost(postId);
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
            post: Object.assign(Object.assign({}, post), { title: cleanedTitle, link: cleanedLink, description: cleanedDescription, subgroup: cleanedSubgroup }),
            error: "Title and subgroup are required, plus either a link or description.",
        });
    }
    yield database.editPost(postId, {
        title: cleanedTitle,
        link: cleanedLink,
        description: cleanedDescription,
        subgroup: cleanedSubgroup,
    });
    res.redirect(`/posts/show/${postId}`);
}));
router.get("/deleteconfirm/:postid", checkAuth_1.ensureAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const postId = Number(req.params.postid);
    const post = yield database.getPost(postId);
    if (!post) {
        return res.status(404).send("Post not found");
    }
    if (post.creator.id !== user.id) {
        return res.status(403).send("You can only delete your own posts.");
    }
    res.render("deletePostConfirm", { post });
}));
router.post("/delete/:postid", checkAuth_1.ensureAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const postId = Number(req.params.postid);
    const post = yield database.getPost(postId);
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
    yield database.deletePost(postId);
    res.redirect(`/subs/show/${encodeURIComponent(subgroupName)}`);
}));
router.post("/vote/:postid", checkAuth_1.ensureAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const postId = Number(req.params.postid);
    const post = yield database.getPost(postId);
    if (!post) {
        return res.status(404).send("Post not found");
    }
    const targetVote = Number(req.body.setvoteto);
    if (![1, -1, 0].includes(targetVote)) {
        return res.status(400).send("Invalid vote value");
    }
    yield database.setVote(postId, user.id, targetVote);
    res.redirect(`/posts/show/${postId}`);
}));
router.post("/comment-create/:postid", checkAuth_1.ensureAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const postId = Number(req.params.postid);
    const post = yield database.getPost(postId);
    const description = (req.body.description || "").trim();
    if (!post) {
        return res.status(404).send("Post not found");
    }
    if (!description) {
        return res.redirect(`/posts/show/${postId}`);
    }
    yield database.addComment(postId, user.id, description);
    res.redirect(`/posts/show/${postId}`);
}));
exports.default = router;
//# sourceMappingURL=postRouters.js.map