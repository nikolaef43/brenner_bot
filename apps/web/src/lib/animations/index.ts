/**
 * Animation Module Index
 *
 * Unified animation system with Framer Motion variants, hooks, and components.
 *
 * @see brenner_bot-f8vs.9 (Animation & Scroll Effects System)
 *
 * @example
 * ```tsx
 * import {
 *   AnimateOnScroll,
 *   fadeUp,
 *   useReducedMotion,
 *   useParallax,
 * } from "@/lib/animations";
 *
 * function Section() {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <AnimateOnScroll variant="fadeUp">
 *       <Content />
 *     </AnimateOnScroll>
 *   );
 * }
 * ```
 */

// ============================================================================
// MOTION VARIANTS
// ============================================================================

export {
  // Timing constants
  TIMING,
  EASING,
  transitions,

  // Entry animations
  fadeUp,
  fadeIn,
  scaleIn,
  popIn,
  slideInRight,
  slideInLeft,
  blurIn,

  // Stagger containers
  staggerContainer,
  staggerFast,
  staggerNormal,
  staggerSlow,

  // Hover/tap states
  cardHover,
  buttonHover,
  buttonTap,
  iconHover,

  // Exit animations
  fadeOut,
  scaleOut,
  slideOutDown,

  // Page transitions
  pageFade,
  pageSlideUp,

  // Modal/overlay animations
  backdrop,
  modalContent,
  bottomSheet,

  // Accordion
  accordionContent,

  // Loading states
  skeletonShimmer,
  spinner,

  // Utilities
  withDelay,
  viewport,
} from "./motion-variants";

// ============================================================================
// HOOKS
// ============================================================================

export {
  // Reduced motion
  useReducedMotion,
  useAnimationPreference,

  // Parallax & scroll
  useParallax,
  useScrollProgress,
  useScrollVisibility,
  useScrollVelocity,

  // Stagger
  useStaggerDelays,

  // Intersection
  useIntersectionAnimation,

  // Hover
  useHoverState,
} from "./hooks";

// ============================================================================
// COMPONENTS
// ============================================================================

export {
  // Scroll-reveal
  AnimateOnScroll,
  StaggerChildren,

  // Parallax
  Parallax,

  // Interactive elements
  InteractiveCard,
  InteractiveButton,
  InteractiveIcon,

  // Presence
  PresenceAnimation,

  // Types
  type AnimateOnScrollProps,
  type StaggerChildrenProps,
  type ParallaxProps,
  type AnimationVariant,
} from "./components";
