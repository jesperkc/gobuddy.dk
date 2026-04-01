import { SuccessIcon } from "../icons";

export const SuccessCard = ({ title = "", text = "" }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex flex-col items-center">
        <SuccessIcon className="mb-3 h-8 w-8 text-green-400" />
        {title.length && <h3 className="text-lg font-medium text-green-800 mb-2">{title}</h3>}
        <p className="text-green-700">{text}</p>
      </div>
    </div>
  );
};
