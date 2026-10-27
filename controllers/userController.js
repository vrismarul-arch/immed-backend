import User from "../models/User.js";

// GET /api/users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ success: false, message: "A user with this email already exists" });
    }

    const user = await User.create({
      name: name || "Admin",
      email,
      password,
      role: role === "user" ? "user" : "admin",
    });

    res.status(201).json({
      success: true,
      message: "User created",
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/users/:id   (password optional)
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { name, email, password, role } = req.body;

    if (email && email.toLowerCase().trim() !== user.email) {
      const taken = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } });
      if (taken) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
      user.email = email;
    }

    if (name) user.name = name;

    if (role && role !== user.role) {
      // don't let the logged-in admin remove their own admin access
      if (String(user._id) === String(req.user._id) && role !== "admin") {
        return res.status(400).json({ success: false, message: "You cannot remove your own admin role" });
      }
      user.role = role;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }
      user.password = password; // hashed by the pre-save hook
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated",
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};