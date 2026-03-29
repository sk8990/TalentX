const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.get("/", auth, getMyNotifications);
router.put("/:id/read", auth, markAsRead);
router.put("/read-all", auth, markAllAsRead);

module.exports = router;
