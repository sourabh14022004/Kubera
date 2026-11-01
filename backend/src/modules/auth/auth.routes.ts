import { Router } from "express"
import { verifyNeonAuth } from "../../middlewares/verifyNeonAuth.js";


const router = Router();

// GET /api/auth/me

router.get("/me", verifyNeonAuth, (req, res) => {
    const authUser = res.locals.authUser;

    return res.status(200).json({
        success: true,
        message: "User authenticate ho gaya hai",
        user: authUser,
    })
})


export default router;