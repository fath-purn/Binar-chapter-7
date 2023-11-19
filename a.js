const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("../utils/nodemailer");
const { JWT_SECRET_KEY } = process.env;
const express = require("express");
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  console.log('a user connected');
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

      

      // kirim email
      let token = jwt.sign({ email: user.email }, JWT_SECRET_KEY);
      let url = `http://localhost:3000/api/v1/auth/email-activation?token=${token}`;


      const html = await nodemailer.getHtml("email-activation.ejs", {
        name: user.name,
        url,
      });

      nodemailer.sendEmail(email, "Email Activation", html);


      try {
        await prisma.notifikasi.create({
          data: {
            user_id: user.id,
            title: 'Create Account',
            message: `Selamat anda berhasil login!`,
          },
        });
        
      } catch (error) {
        console.log(error);
      }

      return res.status(201).json({
        status: true,
        message: "Created",
        err: null,
        data: { user },
      });
    } catch (err) {
      next(err);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        err: err.message,
        data: null,
      });
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
          where: { id: decoded.id }, // Use decoded.id instead of updated.id
          data: { password: encryptedPassword },
        });

        io.emit(`userId-${updated.id}-notification`, {
          message: `Ganti password berhasil!`,
          category: 'info',
        });
    
        await prisma.notifikasi.create({
          data: {
            user_id: updated.id,
            title: 'Reset Password',
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
};


{/* <h1 id="name"></h1>

<!-- link ke gmail -->
<a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" id="gmail" style="display: none;">Gmail</a>

<form>
    <button id="logout" type="submit">Logout</button>
</form>

<!-- <div>
  <h2>Notifikasi</h2>
  <ul id="notificationList" class="mb-4">
    <% notifications.map(element => { %>
    <div>
      <p><span>Info:</span> <%= element.body %></p>
    </div>
    <% }) %>
  </ul>
</div>

<script src="/socket.io/socket.io.js"></script> -->

<script>
    // (async function() {
  //     const socket = io('http://localhost:3000');
  // const notificationList = document.getElementById("notificationList");
  // socket.on(`userId-<%= id %>-notification`, function (args) {
  //   const item = document.createElement("li");
  //   console.log(args);
  //   item.innerHTML = `<div>
  //         <p><span>Info:</span> ${args.message}</p>
  //       </div>`;
  //   notificationList.appendChild(item);
  // });


    //     const token = localStorage.getItem("token");
    //     console.log(token);

    //     if (!token) {
    //         window.location.href = "/login";
    //     }

    //     const result = await fetch("http://localhost:3000/api/v1/auth/whoami", {
    //         method: "GET",
    //         headers: {
    //             Authorization: `${token}`,
    //         },
    //     });

    //     const data = await result.json();

    //     if (data.status === false && data.err === "You need to verify your email to continue" && data.message === "Unauthorized") {
    //         document.querySelector("#gmail").style.display = "block";
    //         document.querySelector("#name").innerHTML = `You need to verify your email to continue. Please check your email.`;
    //     }

    //     console.log(data);
    //     document.querySelector("#name").innerHTML = `Hallo ${data.data.user.name}`;

    //     const logout = document.querySelector("#logout");
    //     logout.addEventListener("click", () => {
    //         localStorage.removeItem("token");

    //         window.location.href = "/login";
    //     });
    // })();
</script> */}
