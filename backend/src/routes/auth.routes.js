import express from 'express'
import { getCurrentUser } from '../modules/auth/auth.controller.js'
import firebaseAuth from "../middlewares/firebaseAuth.middleware.js";

const router = express.Router()

router.get('/me', firebaseAuth, getCurrentUser)
export default router
