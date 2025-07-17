import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

export interface AnimatedLogoProps {
  variant?: "continuous" | "hover" | "progress"
  size?: "small" | "medium" | "large"
  progress?: number
  className?: string
  onClick?: () => void
}

export const AnimatedLogo = ({
  variant = "continuous",
  size = "medium",
  progress = 0,
  className
}: AnimatedLogoProps) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (variant === "continuous") {
      const interval = setInterval(() => {
        setIsConnected(prev => !prev)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [variant])

  useEffect(() => {
    if (variant === "progress") {
      setIsConnected(progress > 0.5)
    }
  }, [progress, variant])

  const sizeClasses = {
    small: "h-8 w-auto",
    medium: "h-12 w-auto",
    large: "h-16 w-auto"
  }

  const logoText = "let's get close"
  const shouldShowConnected = variant === "hover" ? isHovered : isConnected

  return (
    <div 
      className={cn(
        "flex items-center justify-center transition-all duration-500 cursor-pointer",
        sizeClasses[size],
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex items-center">
        {/* Logo SVG Animation */}
        <div className="relative">
          <svg 
            viewBox="0 0 200 60" 
            className="w-full h-full"
            style={{ maxWidth: size === "large" ? "300px" : size === "medium" ? "200px" : "150px" }}
          >
            {/* Background pill shape */}
            <rect
              x="20"
              y="15"
              width="160"
              height="30"
              rx="15"
              fill="url(#pillGradient)"
              className={cn(
                "transition-all duration-700 ease-in-out",
                shouldShowConnected ? "opacity-100" : "opacity-0"
              )}
            />
            
            {/* Left heart shape */}
            <g className={cn(
              "transition-all duration-700 ease-in-out transform-gpu",
              shouldShowConnected ? "translate-x-0" : "-translate-x-2"
            )}>
              <path
                d="M40 35 C40 28, 50 25, 55 35 C55 25, 65 28, 65 35 C65 45, 55 50, 40 35 Z"
                fill="url(#heartGradient)"
                className="animate-pulse-romantic"
              />
            </g>
            
            {/* Right heart shape */}
            <g className={cn(
              "transition-all duration-700 ease-in-out transform-gpu",
              shouldShowConnected ? "translate-x-0" : "translate-x-2"
            )}>
              <path
                d="M135 35 C135 28, 145 25, 150 35 C150 25, 160 28, 160 35 C160 45, 150 50, 135 35 Z"
                fill="url(#heartGradient)"
                className="animate-pulse-romantic"
              />
            </g>
            
            {/* Connection line */}
            <line
              x1="65"
              y1="35"
              x2="135"
              y2="35"
              stroke="url(#connectionGradient)"
              strokeWidth="3"
              className={cn(
                "transition-all duration-700 ease-in-out",
                shouldShowConnected ? "opacity-100" : "opacity-0"
              )}
            />
            
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="pillGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(330 81% 60%)" />
                <stop offset="100%" stopColor="hsl(280 100% 70%)" />
              </linearGradient>
              
              <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(330 81% 60%)" />
                <stop offset="100%" stopColor="hsl(14 100% 57%)" />
              </linearGradient>
              
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(330 81% 60%)" />
                <stop offset="50%" stopColor="hsl(280 100% 70%)" />
                <stop offset="100%" stopColor="hsl(14 100% 57%)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* Text logo */}
        <div className={cn(
          "ml-4 font-bold transition-all duration-500",
          size === "large" ? "text-2xl" : size === "medium" ? "text-xl" : "text-lg"
        )}>
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {logoText}
          </span>
        </div>
      </div>
    </div>
  )
}