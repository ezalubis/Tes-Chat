// routes/postRoutes.js
import express from 'express';
const router = express.Router();
import {getData} from "../controllers/FriendController.js"

router.get('/getuser', getData);

export default router;
