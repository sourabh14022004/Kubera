import { Router } from "express"
import { verifyNeonAuth } from "../../middlewares/verifyNeonAuth.js";
import { resolveKuberaUser } from "../../middlewares/resolveKuberaUser.js";

const router = Router();

// GET /api/auth/me

router.get("/me", verifyNeonAuth, resolveKuberaUser, (req, res) => {

    return res.status(200).json({
        success: true,
        message: "User authenticate ho gaya hai",
        user: res.locals.KuberaUser,
    });
},)


export default router;