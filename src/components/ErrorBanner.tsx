interface ErrorBannerProps {
  message: string | null;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div role="alert" className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
      {message}
    </div>
  );
}
