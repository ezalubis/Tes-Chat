import express from "express";
import dotenv from "dotenv";
import http from "http";
import {Server } from "socket.io"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import friendRouter from "./routes/friend.js"
import cookieParser from "cookie-parser";
const prisma = new PrismaClient()
dotenv.config()
const app = express();
const server = http.createServer(app);
const io = new Server(server)
app.use(cookieParser());
app.use(express.json());

app.post("/api/register", async(req,res)=>{
    try{
        const user = await prisma.user.create({
         data: {
            name : req.body.name,
            password:await bcrypt.hash(req.body.password,10),
            nomor:req.body.nomor
            },
        });
        res.json("Berhasil Register");
    }catch(error){
        res.json(error)
        console.error(error);
    }
})
app.post('/api/login', async (req, res) => {
    const { name, password } = req.body;
    try {
        const user = await prisma.user.findFirst({
          where: {
            name,
          },
        });
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return res.status(401).json({ error: 'Autentikasi gagal' });
        }
        const token = jwt.sign(user, "anwarGanteng");
        res.cookie("token",token);
        res.json({ token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
app.use((req, res, next) => {
    if (req.path.startsWith("/api/login") || req.path.startsWith("/api/register") || req.path.startsWith("/assets")) {
      next();
    } else {
      let authorized = false;
      if (req.cookies.token) {
        try {
          req.me = jwt.verify(req.cookies.token, "anwarGanteng");
          authorized = true;
        } catch (err) {
          res.clearCookie("token");
        }
      }
      if (authorized) {
        if (req.path.startsWith("/login")) {
            res.redirect("/home");
        } else {
          next();
        }
      } else {
        if (req.path.startsWith("/login") || req.path.startsWith("/register")) {
          next();
        } else {
          if (req.path.startsWith("/api")) {
            res.status(401);
            res.send("Anda harus login terlebih dahulu.");
          } else {
            res.redirect("/login");
          }
        }
      }
    }
  });
  const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
  
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Token is missing' });
    }
  
    try {
      // Mendekode token
      const decodedToken = jwt.verify(token, "anwarGanteng");
  
      // Setelah mendekode, data pengguna dapat diakses melalui decodedToken
      req.userId = decodedToken.id; // Menggunakan ID pengguna sebagai contoh, sesuaikan sesuai dengan struktur token Anda
  
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }
  app.get('/api/getLoggedInUserData', verifyToken, (req, res) => {
    const loggedInUserData = req.userId;
    res.json(loggedInUserData);
  });
app.use(express.static("../client"));
app.use("/api",friendRouter)

app.get('/api/getMessages/:receiverId', verifyToken,async (req, res) => {
    const { receiverId } = req.params;
  
    try {
      const loggedInUserId = req.userId;
        
  
      const messages = await prisma.chat.findMany({
        where: {
          OR: [
            { id_pengirim: parseInt(loggedInUserId), id_penerima: parseInt(receiverId) },
            { id_pengirim: parseInt(receiverId), id_penerima: parseInt(loggedInUserId) },
          ],
        },
      });
  
      res.json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  //Menghandle pesan dari klien dan mengirimkannya ke semua klien
  io.on('connection', (socket) => {
    console.log('User connected');
    
    socket.on('message', async ({ senderId, receiverId,message }) => {
      console.log(`Received message from client: ${message}`);
      socket.broadcast.emit("message",{senderId,receiverId,message})
  
      try {
        const loggedInUserId = senderId;
  
        const createdChat = await prisma.chat.create({
          data: {
            pesan: message,
            id_pengirim: parseInt(loggedInUserId),
            id_penerima: parseInt(receiverId),
          },
        });
  
        console.log('Chat inserted into the database:', createdChat);
  
        // Kirim pesan ke semua klien
        io.emit('serverMessage', { message: 'Data has been inserted into the database.' });
      } catch (error) {
        console.error('Error inserting chat into the database:', error);
        // Kirim pesan ke klien jika terjadi kesalahan
        socket.emit('serverMessage', { message: 'Error inserting chat into the database.' });
      }
    });
  
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
server.listen(process.env.APP_PORT,()=>{
    console.log(`Server Running In Port ${process.env.APP_PORT}`);
})