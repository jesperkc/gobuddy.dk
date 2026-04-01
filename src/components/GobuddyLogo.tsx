import GobuddyLogoSvg from "../assets/gobuddy-logo.svg?react";
import GobuddyLogoWithTextSvg from "../assets/gobuddy-logo-with-text.svg?react";

export const GobuddyLogo = ({
  className,
  colorLeft,
  colorRight,
  withText = false,
}: {
  className: string;
  colorLeft?: string;
  colorRight?: string;
  withText?: boolean;
}) => {
  const style = { "--color-left": colorLeft, "--color-right": colorRight } as React.CSSProperties;
  return (
    <>
      {withText ? <GobuddyLogoWithTextSvg className={className} style={style} /> : <GobuddyLogoSvg className={className} style={style} />}
    </>
  );
};
