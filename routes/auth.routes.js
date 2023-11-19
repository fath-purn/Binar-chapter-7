const router = require("express").Router();
const {
  register,
  login,
  whoami,
  activate,
  forgotPassword,
  setNewPassword,
  getNotif,
} = require("../controllers/auth.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

router.post("/register", register);
router.post("/login", login);
router.get("/whoami", restrict, whoami);

// render halaman aktivasi
router.get("/email-activation", (req, res) => {
  let { token } = req.query;
  res.render("email-activation", { token });
});

// update user.is_verified
router.post("/email-activation", activate);

// render halaman lupa password
router.post("/forgot-password", forgotPassword);

// render halaman reset password
router.get("/reset-password", (req, res) => {
  let { token } = req.query;
  res.render("reset-password", { token });
});

// update user password
router.post("/reset-password", setNewPassword);

// notifikasi
router.post("/notifikasi", getNotif);

module.exports = router;
