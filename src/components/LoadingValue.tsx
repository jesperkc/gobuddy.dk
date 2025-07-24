import { Skeleton } from "./ui/skeleton";

const LoadingValue = ({
  value,
  loading,
  width = "auto",
}: {
  value: string | number | undefined | null;
  loading: boolean;
  width?: string | number;
}) => {
  return loading ? <Skeleton className={`w-${width}`}>&nbsp;</Skeleton> : value;
};

export default LoadingValue;
