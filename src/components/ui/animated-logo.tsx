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
    small: "h-8 text-lg",
    medium: "h-12 text-xl",
    large: "h-16 text-2xl"
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
      <span className="font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        let's get cl<span className="inline-block w-6 h-6 bg-gradient-to-r from-primary to-secondary rounded-full align-middle mx-1"></span>se
      </span>
    </div>
  )
}