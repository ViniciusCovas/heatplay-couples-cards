import { cn } from "@/lib/utils"
import logoImage from "@/assets/logo.png"

export interface LogoProps {
  size?: "small" | "medium" | "large"
  className?: string
  onClick?: () => void
}

export const Logo = ({
  size = "medium",
  className,
  onClick
}: LogoProps) => {
  const sizeClasses = {
    small: "h-8 w-auto",
    medium: "h-12 w-auto",
    large: "h-16 w-auto"
  }

  return (
    <div 
      className={cn(
        "flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-105",
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      <img 
        src={logoImage} 
        alt="Let's Get Close - Dating App Logo"
        className="w-auto h-full object-contain"
      />
    </div>
  )
}