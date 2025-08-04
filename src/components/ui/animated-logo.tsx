import { cn } from "@/lib/utils";
export interface LogoProps {
  size?: "small" | "medium" | "large";
  className?: string;
  onClick?: () => void;
}
export const Logo = ({
  size = "medium",
  className,
  onClick
}: LogoProps) => {
  const sizeClasses = {
    small: "h-16 w-auto",
    medium: "h-24 w-auto",
    large: "h-40 w-auto"
  };
  return <div className={cn("flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-105", sizeClasses[size], className)} onClick={onClick}>
      
    </div>;
};