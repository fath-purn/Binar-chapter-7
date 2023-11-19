const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("../utils/nodemailer");
const { JWT_SECRET_KEY } = process.env;
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

io.on("connection", (socket) => {
  console.log("a user connected");
});

module.exports = {
  register: async (req, res, next) => {
    try {
      let { name, email, password, password_confirmation } = req.body;
      if (password != password_confirmation) {
        return res.status(400).json({
          status: false,
          message: "Bad Request",
          err: "please ensure that the password and password confirmation match!",
          data: null,
        });
      }

      let userExist = await prisma.user.findUnique({ where: { email } });
      if (userExist) {
        return res.status(400).json({
          status: false,
          message: "Bad Request",
          err: "user has already been used!",
          data: null,
        });
      }

      let encryptedPassword = await bcrypt.hash(password, 10);
      let user = await prisma.user.create({
        data: {
          name,
          email,
          password: encryptedPassword,
        },
      });

      await prisma.notifikasi.create({
        data: {
          user_id: user.id,
          title: "Create Account",
          message: `Selamat anda berhasil login!`,
        },
      });

      // kirim email
      let token = jwt.sign({ email: user.email }, JWT_SECRET_KEY);
      let url = `http://localhost:3000/api/v1/auth/email-activation?token=${token}`;

      const html = await nodemailer.getHtml("activation-email.ejs", {
        name,
        url,
      });
      nodemailer.sendEmail(email, "Email Activation", html);

      return res.status(201).json({
        status: true,
        message: "Created",
        err: null,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      let { email, password } = req.body;

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(400).json({
          status: false,
          message: "Bad Request",
          err: "invalid email or password!",
          data: null,
        });
      }

      let isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({
          status: false,
          message: "Bad Request",
          err: "invalid email or password!",
          data: null,
        });
      }

      let token = jwt.sign({ id: user.id }, JWT_SECRET_KEY);

      return res.status(200).json({
        status: true,
        message: "OK",
        err: null,
        data: { user, token },
      });
    } catch (err) {
      next(err);
    }
  },

  whoami: (req, res, next) => {
    return res.status(200).json({
      status: true,
      message: "OK",
      err: null,
      data: { user: req.user },
    });
  },

  activate: (req, res) => {
    let { token } = req.query;

    jwt.verify(token, JWT_SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(400).json({
          status: false,
          message: "Bad request",
          err: err.message,
          data: null,
        });
      }

      let updated = await prisma.user.update({
        where: { email: decoded.email },
        data: { is_verified: true },
      });

      return res.status(200).json({
        status: true,
        message: "OK",
        err: null,
        data: { user: updated },
      });
    });
  },

  forgotPassword: async (req, res, next) => {
    try {
      let { email } = req.body;

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(400).json({
          status: false,
          message: "Bad Request",
          err: "user not found!",
          data: null,
        });
      }

      let token = jwt.sign({ id: user.id }, JWT_SECRET_KEY);
      let url = `http://localhost:3000/api/v1/auth/reset-password?token=${token}`;

      const html = await nodemailer.getHtml("reset-password.ejs", {
        name: user.name,
        url,
      });

      nodemailer.sendEmail(email, "Reset Password", html);

      return res.status(200).json({
        status: true,
        message: "OK",
        err: null,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  },

  setNewPassword: async (req, res, next) => {
    try {
      let { token } = req.query;
      let { password, password_confirmation } = req.body;

      if (password != password_confirmation) {
        return res.status(400).json({
          status: false,
          message: "Bad Request",
          err: "please ensure that the password and password confirmation match!",
          data: null,
        });
      }

      jwt.verify(token, JWT_SECRET_KEY, async (err, decoded) => {
        if (err) {
          return res.status(400).json({
            status: false,
            message: "Bad request",
            err: err.message,
            data: null,
          });
        }

        let encryptedPassword = await bcrypt.hash(password, 10);
        let updated = await prisma.user.update({
          where: { id: decoded.id },
          data: { password: encryptedPassword },
        });

        io.emit(`userId-${updated.id}-notification`, {
          message: `Ganti password berhasil!`,
          category: "info",
        });

        await prisma.notifikasi.create({
          data: {
            user_id: updated.id,
            title: "Reset Password",
            message: `Ganti password berhasil!`,
          },
        });

        return res.status(200).json({
          status: true,
          message: "OK",
          err: null,
          data: { user: updated },
        });
      });
    } catch (err) {
      next(err);
    }
  },

  getNotif: async (req, res, next) => {
    try {
      let { user_id } = req.body;
      let notif = await prisma.notifikasi.findMany({
        where: { user_id: user_id },
        orderBy: { id: "desc" },
      });
      return res.status(200).json({
        status: true,
        message: "OK",
        err: null,
        data: { notif },
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
        err: error.message,
        data: null,
      });
    }
  },
};
