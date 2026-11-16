import React from "react";

interface PrivateContentProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export const PrivateContent: React.FC<PrivateContentProps> = ({
  children,
  className = "",
  style,
  ...props
}) => {
  const combinedStyle = { display: "contents" as const, ...style };

  return (
    <span className={className} style={combinedStyle} {...props}>
      {children}
    </span>
  );
};
