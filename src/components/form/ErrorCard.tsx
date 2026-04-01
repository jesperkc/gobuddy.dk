import { ErrorIcon } from "../icons";

export const ErrorCard = ({ title = "Der skete en fejl", text = "" }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center">
        <ErrorIcon className="mb-3 h-8 w-8 text-red-400" />
        <h3 className="text-lg font-medium text-red-800 mb-2">{title}</h3>
        <p className="text-red-700">{text}</p>
      </div>
    </div>
  );
};
