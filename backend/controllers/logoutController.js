const logout = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid"); // optional: clear session cookie
      return res.json({ message: "Logged out successfully" });
    });
  } else {
    return res.json({ message: "No active session" });
  }
};

module.exports = logout;
// this is just for testing
