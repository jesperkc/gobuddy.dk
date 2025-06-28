import { CheckCircle, User } from "lucide-react";
import { SplitScreen } from "../components/SplitScreen";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function Completed() {
  return (
    <SplitScreen>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Welcome aboard!</h1>
        <p className="text-lg text-gray-600 mb-6">Thanks for sharing your details with us. We're excited to have you here!</p>
        <div className="flex justify-center">
          <Link to="/profile">
            <Button type="button" variant="default" className="flex items-center gap-2">
              <User size={18} />
              Se din profil
            </Button>
          </Link>
        </div>
      </div>
    </SplitScreen>
  );
}
