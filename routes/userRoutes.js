import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/userController.js";

const router = express.Router();

// every user route is admin-only
router.use(protect, adminOnly);

router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;