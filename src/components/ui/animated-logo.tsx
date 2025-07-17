import { cn } from "@/lib/utils"

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
        src="/lovable-uploads/84a7b7ec-c295-4c98-94f5-6f44f6684eee.png" 
        alt="Let's Get Close - Dating App Logo"
        className="w-auto h-full object-contain"
      />
    </div>
  )
}