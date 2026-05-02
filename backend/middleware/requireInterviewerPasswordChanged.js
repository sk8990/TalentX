module.exports = function requireInterviewerPasswordChanged(req, res, next) {
  if (req.user?.role === "interviewer" && req.user?.mustChangePassword) {
    return res.status(403).json({
      message: "Password reset required before accessing interviewer routes",
      mustChangePassword: true
    });
  }

  return next();
};
