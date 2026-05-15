import request from "supertest";
import app from "../app";

describe("GET /posts", () => {
  it("should return 200 and render the posts page", async () => {
    const res = await request(app).get("/posts");
    expect(res.status).toBe(200);
    expect(res.text).toContain("All Posts");
  });

});
