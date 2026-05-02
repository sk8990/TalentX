module.exports = function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ message: "Only Super Admin can perform this action." });
  }

  return next();
};
