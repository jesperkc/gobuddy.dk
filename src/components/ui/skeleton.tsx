export const Skeleton = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className || ""}`} {...props}>
      {children}
    </div>
  );
};
