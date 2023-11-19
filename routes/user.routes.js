const express = require("express");
const { whoami } = require("../controllers/auth.controllers");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// render form lupa password
router.get("/login", (req, res) => {
  res.render("login.ejs");
});

router.get("/register", (req, res) => {
  res.render("register.ejs");
});

// dashboard
router.get("/dashboard", (req, res) => {
  res.render("dashboard.ejs");
});

// render form email user
router.get("/forgot-password", (req, res) => {
  res.render("email-ubah-password.ejs");
});

// render form reset password
router.get('/reset-password', (req, res) => {
    res.render('reset-password.ejs');
});

// router.get('/dashboard', whoami, async (req, res) => {
//   try {
//     const notifikasi = await prisma.notifikasi.findMany({
//       where: {
//         userId: req.user.id,
//       },
//       orderBy: {
//         createdAt: 'desc',
//       },
//     });
//     res.render('dashboard', { ...req.user, notifikasi });
//   } catch (error) {
//     next(error);
//   }
// });

module.exports = router;
