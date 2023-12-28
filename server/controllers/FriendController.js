import {getFriend} from "../models/FriendModel.js"

export async function getData (req,res){
    const userLogin = req.me.id
    try {
        const get = await getFriend(userLogin);
        res.json(get);
    } catch (error) {
        res.status(500).json({error:"Server Error"})
    }
}