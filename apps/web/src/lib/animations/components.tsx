/**
 * Animation Components
 *
 * Framer Motion-based components for scroll-reveal, parallax, and
 * interactive animations.
 *
 * @see brenner_bot-f8vs.9 (Animation & Scroll Effects System)
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence, type Variants, type MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  fadeUp,
  fadeIn,
  scaleIn,
  popIn,
  slideInRight,
  slideInLeft,
  blurIn,
  staggerNormal,
  cardHover,
  buttonHover,
  buttonTap,
  iconHover,
  viewport,
  transitions,
} from "./motion-variants";
import { useReducedMotion, useParallax, useIntersectionAnimation } from "./hooks";

// ============================================================================
// ANIMATE ON SCROLL COMPONENT
// ============================================================================

type AnimationVariant =
  | "fadeUp"
  | "fadeIn"
  | "scaleIn"
  | "popIn"
  | "slideInRight"
  | "slideInLeft"
  | "blurIn";

const variantMap: Record<AnimationVariant, Variants> = {
  fadeUp,
  fadeIn,
  scaleIn,
  popIn,
  slideInRight,
  slideInLeft,
  blurIn,
};

interface AnimateOnScrollProps extends Omit<MotionProps, "initial" | "animate" | "variants"> {
  children: React.ReactNode;
  /** Animation variant to use */
  variant?: AnimationVariant;
  /** Custom variants (overrides variant prop) */
  variants?: Variants;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
  /** Disable animation */
  disabled?: boolean;
  /** Only animate once */
  once?: boolean;
  /** Root margin for intersection detection */
  rootMargin?: string;
}

/**
 * Component that animates children when they scroll into view.
 * Uses Framer Motion with IntersectionObserver.
 *
 * @example
 * ```tsx
 * <AnimateOnScroll variant="fadeUp" delay={0.2}>
 *   <Card>Content here</Card>
 * </AnimateOnScroll>
 * ```
 */
export function AnimateOnScroll({
  children,
  variant = "fadeUp",
  variants: customVariants,
  delay = 0,
  className,
  as = "div",
  disabled = false,
  once = true,
  rootMargin = "-100px 0px",
  ...motionProps
}: AnimateOnScrollProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, isInView } = useIntersectionAnimation<HTMLDivElement>({
    triggerOnce: once,
    rootMargin,
    disabled: disabled || prefersReducedMotion,
  });

  const selectedVariants = customVariants || variantMap[variant];
  const MotionComponent = motion.create(as);

  // Apply delay to visible state
  const variantsWithDelay = React.useMemo(() => {
    if (delay === 0) return selectedVariants;

    return {
      ...selectedVariants,
      visible: {
        ...(typeof selectedVariants.visible === "object" ? selectedVariants.visible : {}),
        transition: {
          ...(typeof selectedVariants.visible === "object" &&
          selectedVariants.visible &&
          typeof (selectedVariants.visible as { transition?: object }).transition === "object"
            ? (selectedVariants.visible as { transition: object }).transition
            : {}),
          delay,
        },
      },
    };
  }, [selectedVariants, delay]);

  if (prefersReducedMotion || disabled) {
    const Component = as;
    return (
      <Component ref={ref} className={className}>
        {children}
      </Component>
    );
  }

  return (
    <MotionComponent
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variantsWithDelay}
      className={className}
      {...motionProps}
    >
      {children}
    </MotionComponent>
  );
}

// ============================================================================
// STAGGER CHILDREN COMPONENT
// ============================================================================

interface StaggerChildrenProps extends Omit<MotionProps, "initial" | "animate" | "variants"> {
  children: React.ReactNode;
  /** Child animation variant */
  childVariant?: AnimationVariant;
  /** Stagger delay between children (seconds) */
  staggerDelay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Disable animation */
  disabled?: boolean;
  /** Only animate once */
  once?: boolean;
}

/**
 * Container that staggers the animation of its children.
 *
 * @example
 * ```tsx
 * <StaggerChildren staggerDelay={0.1}>
 *   <Card>First</Card>
 *   <Card>Second</Card>
 *   <Card>Third</Card>
 * </StaggerChildren>
 * ```
 */
export function StaggerChildren({
  children,
  childVariant = "fadeUp",
  staggerDelay = 0.1,
  className,
  disabled = false,
  once = true,
  ...motionProps
}: StaggerChildrenProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, isInView } = useIntersectionAnimation<HTMLDivElement>({
    triggerOnce: once,
    disabled: disabled || prefersReducedMotion,
  });

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = variantMap[childVariant];

  if (prefersReducedMotion || disabled) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
      {...motionProps}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// PARALLAX CONTAINER COMPONENT
// ============================================================================

interface ParallaxProps {
  children: React.ReactNode;
  /** Parallax speed factor (0.1-1.0, default 0.5) */
  speed?: number;
  /** Direction of parallax movement */
  direction?: "up" | "down";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Container with scroll-linked parallax effect.
 *
 * @example
 * ```tsx
 * <Parallax speed={0.3}>
 *   <BackgroundImage />
 * </Parallax>
 * ```
 */
export function Parallax({
  children,
  speed = 0.5,
  direction = "up",
  className,
}: ParallaxProps) {
  const prefersReducedMotion = useReducedMotion();
  const y = useParallax({ speed, direction, respectReducedMotion: true });

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

// ============================================================================
// INTERACTIVE CARD COMPONENT
// ============================================================================

interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Disable hover/tap effects */
  disabled?: boolean;
  /** Custom hover animation */
  hoverAnimation?: typeof cardHover;
}

/**
 * Card with interactive hover and tap effects.
 *
 * @example
 * ```tsx
 * <InteractiveCard onClick={handleClick}>
 *   <h3>Title</h3>
 *   <p>Description</p>
 * </InteractiveCard>
 * ```
 */
export function InteractiveCard({
  children,
  disabled = false,
  hoverAnimation = cardHover,
  className,
  ...props
}: InteractiveCardProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || disabled) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={hoverAnimation}
      whileTap={{ scale: 0.99, transition: transitions.micro }}
      className={cn("cursor-pointer", className)}
      {...(props as MotionProps)}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// INTERACTIVE BUTTON COMPONENT
// ============================================================================

interface InteractiveButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart"> {
  children: React.ReactNode;
  /** Disable hover/tap effects */
  disableMotion?: boolean;
}

/**
 * Button with interactive hover and tap effects.
 *
 * @example
 * ```tsx
 * <InteractiveButton onClick={handleSubmit}>
 *   Submit
 * </InteractiveButton>
 * ```
 */
export function InteractiveButton({
  children,
  disableMotion = false,
  className,
  disabled,
  ...props
}: InteractiveButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || disableMotion || disabled) {
    return (
      <button className={className} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }

  return (
    <motion.button
      whileHover={buttonHover}
      whileTap={buttonTap}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ============================================================================
// INTERACTIVE ICON COMPONENT
// ============================================================================

interface InteractiveIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** Disable hover effects */
  disabled?: boolean;
}

/**
 * Icon wrapper with interactive hover effects.
 *
 * @example
 * ```tsx
 * <InteractiveIcon>
 *   <ChevronRight />
 * </InteractiveIcon>
 * ```
 */
export function InteractiveIcon({
  children,
  disabled = false,
  className,
  ...props
}: InteractiveIconProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || disabled) {
    return (
      <span className={className} {...props}>
        {children}
      </span>
    );
  }

  return (
    <motion.span whileHover={iconHover} className={cn("inline-flex", className)} {...props}>
      {children}
    </motion.span>
  );
}

// ============================================================================
// PRESENCE ANIMATION COMPONENT
// ============================================================================

interface PresenceAnimationProps {
  children: React.ReactNode;
  /** Whether component is visible */
  isVisible: boolean;
  /** Animation variant */
  variant?: AnimationVariant;
  /** Custom variants */
  variants?: Variants;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Wrapper for AnimatePresence with predefined animations.
 *
 * @example
 * ```tsx
 * <PresenceAnimation isVisible={showModal} variant="scaleIn">
 *   <Modal />
 * </PresenceAnimation>
 * ```
 */
export function PresenceAnimation({
  children,
  isVisible,
  variant = "fadeIn",
  variants: customVariants,
  className,
}: PresenceAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  const selectedVariants = customVariants || variantMap[variant];

  if (prefersReducedMotion) {
    return isVisible ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={selectedVariants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { AnimateOnScrollProps, StaggerChildrenProps, ParallaxProps, AnimationVariant };
