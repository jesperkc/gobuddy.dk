import { CheckCircle } from "lucide-react";
import { SplitScreen } from "../components/SplitScreen";

export function Completed() {
  return (
    <SplitScreen>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Welcome aboard!</h1>
        <p className="text-lg text-gray-600 mb-6">
          Thanks for sharing your details with us. We're excited to have you
          here!
        </p>
      </div>
    </SplitScreen>
  );
}
