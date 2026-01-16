import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '1.5rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'Montserrat',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			heading: [
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			cinzel: [
  				'Cinzel',
  				'serif'
  			],
  			serif: [
  				'Cormorant Garamond',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'IBM Plex Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			'border-subtle': 'hsl(var(--border-subtle))',
  			'border-strong': 'hsl(var(--border-strong))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			surface: {
  				DEFAULT: 'hsl(var(--surface))',
  				elevated: 'hsl(var(--surface-elevated))',
  				sunken: 'hsl(var(--surface-sunken))'
  			},
  			foreground: {
  				DEFAULT: 'hsl(var(--foreground))',
  				muted: 'hsl(var(--foreground-muted))',
  				subtle: 'hsl(var(--foreground-subtle))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				hover: 'hsl(var(--primary-hover))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				hover: 'hsl(var(--secondary-hover))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				light: 'hsl(var(--destructive-light))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				hover: 'hsl(var(--accent-hover))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				light: 'hsl(var(--success-light))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				light: 'hsl(var(--warning-light))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				light: 'hsl(var(--info-light))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
			quest: {
				gold: 'hsl(var(--quest-gold))',
				'gold-light': 'hsl(var(--quest-gold-light))',
				copper: 'hsl(var(--quest-copper))',
				forest: 'hsl(var(--quest-forest))',
				emerald: 'hsl(var(--quest-emerald))',
				purple: 'hsl(var(--quest-purple))',
				blue: 'hsl(var(--quest-blue))'
			},
			status: {
				focus: 'hsl(var(--status-focus))',
				scheduled: 'hsl(var(--status-scheduled))',
				backlog: 'hsl(var(--status-backlog))',
				waiting: 'hsl(var(--status-waiting))',
				someday: 'hsl(var(--status-someday))',
			},
			priority: {
				high: 'hsl(var(--priority-high))',
				medium: 'hsl(var(--priority-medium))',
				low: 'hsl(var(--priority-low))',
			},
			category: {
				content: 'hsl(var(--category-content))',
				nurture: 'hsl(var(--category-nurture))',
				offer: 'hsl(var(--category-offer))',
			}
  		},
  		borderRadius: {
  			lg: 'var(--radius-lg)',
  			md: 'var(--radius)',
  			sm: 'var(--radius-sm)',
  			xl: 'var(--radius-xl)'
  		},
  		boxShadow: {
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			inner: 'var(--shadow-inner)',
  			'2xs': 'var(--shadow-2xs)',
  			'2xl': 'var(--shadow-2xl)'
  		},
  		spacing: {
  			'18': '4.5rem',
  			'88': '22rem',
  			'128': '32rem'
  		},
  		fontSize: {
  			'2xs': [
  				'0.625rem',
  				{
  					lineHeight: '0.75rem'
  				}
  			]
  		},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0',
					opacity: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)',
					opacity: '1'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)',
					opacity: '1'
				},
				to: {
					height: '0',
					opacity: '0'
				}
			},
			'fade-in': {
				from: {
					opacity: '0',
					transform: 'translateY(4px)'
				},
				to: {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'scale-in': {
				from: {
					opacity: '0',
					transform: 'scale(0.95)'
				},
				to: {
					opacity: '1',
					transform: 'scale(1)'
				}
			},
			'slide-in-right': {
				from: {
					transform: 'translateX(100%)'
				},
				to: {
					transform: 'translateX(0)'
				}
			},
			'shimmer': {
				'0%': {
					backgroundPosition: '-200% 0'
				},
				'100%': {
					backgroundPosition: '200% 0'
				}
			},
			'quest-pulse-glow': {
				'0%, 100%': {
					boxShadow: '0 0 0 0 hsl(45 93% 50% / 0.6), 0 0 12px hsl(45 93% 50% / 0.3)'
				},
				'50%': {
					boxShadow: '0 0 0 8px hsl(45 93% 50% / 0), 0 0 20px hsl(45 93% 50% / 0.5)'
				}
			},
			'flame-flicker': {
				'0%, 100%': {
					transform: 'scaleY(1) rotate(0deg)'
				},
				'25%': {
					transform: 'scaleY(1.05) rotate(-2deg)'
				},
				'50%': {
					transform: 'scaleY(1.1) rotate(1deg)'
				},
				'75%': {
					transform: 'scaleY(1.02) rotate(-1deg)'
				}
			},
			'sparkle': {
				'0%, 100%': {
					opacity: '0',
					transform: 'scale(0.5)'
				},
				'50%': {
					opacity: '1',
					transform: 'scale(1)'
				}
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'fade-in': 'fade-in 0.2s ease-out',
			'scale-in': 'scale-in 0.15s ease-out',
			'slide-in-right': 'slide-in-right 0.3s ease-out',
			'shimmer': 'shimmer 2s linear infinite',
			'quest-pulse-glow': 'quest-pulse-glow 2s ease-in-out infinite',
			'flame-flicker': 'flame-flicker 0.8s ease-in-out infinite',
			'sparkle': 'sparkle 1.5s ease-in-out infinite'
		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;