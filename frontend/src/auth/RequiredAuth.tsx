import { authClient } from "./auth.client";
import { Navigate, Outlet } from "react-router";

function RequiredAuth() {
    const { data, isPending, error } = authClient.useSession();

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className=" text-sm font-medium text-slate-500">
                    Checking your session.....
                </p>
            </div>
        );
    }
    if (error) {
        return (
            <div className=" flex min-h-screen items-center justify-center bg-slate-50">
                <p role="alert" className=" text-sm text-slate-600">
                    Unable to verify your session. Please refresh the page.
                </p>
            </div>
        );
    }

    if (!data?.user) {
        return <Navigate to="/login" replace /> 
    }

    return <Outlet/>
}

export default RequiredAuth;