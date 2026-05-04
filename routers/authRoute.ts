import express from "express";
import passport from "../middleware/passport";
import { initiateSignup, verifyAndCreateUser } from "../controller/signupController";
const router = express.Router();

router.get("/login", async (req, res) => {
  res.render("login");
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/posts",
    failureRedirect: "/auth/login",
  })
);

router.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

router.post("/signup", async (req, res) => {
  const { uname, password, email } = req.body;

  if (!uname || !password || !email) {
    return res.render("signup", { error: "All fields are required." });
  }

  const result = await initiateSignup(uname, password, email);

  if (!result.success) {
    return res.render("signup", { error: result.message });
  }

  res.render("verify", { email, error: null });
});

router.post("/verify", (req, res) => {
  const { email, code } = req.body;

  const result = verifyAndCreateUser(email, code);

  if (!result.success) {
    return res.render("verify", { email, error: result.message });
  }

  res.render("login", { success: "Account created! Please log in." });
});

router.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
  });
  res.redirect("/");
});

export default router;
